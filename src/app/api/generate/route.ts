import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Reads ANTHROPIC_API_KEY from .env.local automatically.
const anthropic = new Anthropic();

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5';

// Keep in sync with the client-side check in page.tsx.
// 3 MB of PDF is ~4 MB once base64-encoded, under Vercel's 4.5 MB request-body limit.
const MAX_PDF_BYTES = 3 * 1024 * 1024;
const MAX_PDF_PAGES = 20;

// This prompt must stay byte-for-byte identical between requests so the
// cached syllabus prefix (system prompt + PDF) is reused.
const SYSTEM_PROMPT = `You are a senior business analyst.

Convert process notes into a valid Mermaid flowchart, plus a short plain-English overview of the process.
The user may also attach a reference document, such as a course syllabus.

Rules for the "mermaid" field:
1. Mermaid syntax only, starting with "flowchart TD".
2. Use decision diamonds, e.g. B{Approved?}, for questions and decisions.
3. Label decision branches, e.g. B -->|Yes| C and B -->|No| D.
   The notes are the primary source. Never invent a step, actor, or outcome.
   If the notes leave a branch's outcome unstated:
   a. If the attached document clearly states that outcome, draw it as a node and record it in "inferred".
   b. Otherwise, label it as unstated, e.g. B -->|No| X["Not specified in notes"].
   Use the document's terminology where it matches steps in the notes.
4. Use short alphanumeric node IDs (A, B, C...) and put text in brackets.
5. Wrap labels containing parentheses, quotes, or other special characters in double quotes, e.g. A["Submit form (online)"].
6. No markdown fences, comments, or styling directives.

Rules for the "summary" field:
- 2-4 sentences describing the process, its key decision points, and its possible outcomes.

Rules for the "inferred" field:
- One entry for every node whose content came from the attached document rather than the notes. Empty if there is no document or nothing was taken from it.
- "nodeId": the node's ID exactly as it appears in the chart.
- "page": the document page number the information is on.
- "quote": the supporting passage copied word for word from the document. Never paraphrase.
- "reason": one sentence naming the gap in the notes this node fills.`;

const FlowchartSchema = z.object({
  mermaid: z.string(),
  summary: z.string(),
  inferred: z.array(
    z.object({
      nodeId: z.string(),
      page: z.number(),
      quote: z.string(),
      reason: z.string(),
    }),
  ),
});

// Dashed amber nodes mark steps filled in from the syllabus. Added in code
// (not by the model) so the chart and the sources panel always agree.
const INFERRED_STYLE = 'classDef inferred fill:#fff8db,stroke:#b8860b,stroke-width:2px,stroke-dasharray:5 3';

/** Rough page count from the raw PDF. Returns 0 if the page objects are compressed and can't be counted. */
function countPdfPages(bytes: Buffer): number {
  return bytes.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

export async function POST(req: Request) {
  const { notes, pdf } = (await req.json()) as { notes?: string; pdf?: string };

  if (!notes?.trim()) {
    return Response.json({ error: 'Please paste some process notes first.' }, { status: 400 });
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];

  if (pdf) {
    const bytes = Buffer.from(pdf, 'base64');
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      return Response.json({ error: 'The attached file is not a valid PDF.' }, { status: 400 });
    }
    if (bytes.length > MAX_PDF_BYTES) {
      return Response.json({ error: 'The PDF is larger than 3 MB.' }, { status: 413 });
    }
    if (countPdfPages(bytes) > MAX_PDF_PAGES) {
      return Response.json({ error: `The PDF has more than ${MAX_PDF_PAGES} pages.` }, { status: 413 });
    }
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: pdf },
      title: 'Reference document',
      // Caches system prompt + PDF, so later charts using the same syllabus
      // (within ~5 minutes) read it at a tenth of the input price.
      cache_control: { type: 'ephemeral' },
    });
  }
  content.push({ type: 'text', text: `Notes:\n${notes}` });

  try {
    const response = await anthropic.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a request is declined by safety classifiers, the API retries it on a fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: betaZodOutputFormat(FlowchartSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const { usage } = response;
    // Logged as a string: Next's dev log file drops object arguments.
    console.log(
      `[generate] usage pdf=${Boolean(pdf)} input=${usage.input_tokens} cacheWrite=${usage.cache_creation_input_tokens ?? 0} cacheRead=${usage.cache_read_input_tokens ?? 0} output=${usage.output_tokens}`,
    );

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'The model declined this request.' }, { status: 422 });
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      return Response.json({ error: 'The response was incomplete. Try shorter notes.' }, { status: 502 });
    }

    const { mermaid, summary, inferred } = response.parsed_output;

    // Keep only entries whose node ID really exists in the chart.
    const valid = inferred.filter(
      (item) => /^\w+$/.test(item.nodeId) && new RegExp(`(^|[^\\w])${item.nodeId}\\s*[\\[\\{\\(]`, 'm').test(mermaid),
    );
    const styled = valid.length
      ? `${mermaid.trimEnd()}\n  ${INFERRED_STYLE}\n  class ${valid.map((item) => item.nodeId).join(',')} inferred`
      : mermaid;

    return Response.json({ mermaid: styled, summary, inferred: valid });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'Invalid ANTHROPIC_API_KEY. Check .env.local.' }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Rate limited. Wait a moment and try again.' }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    throw error;
  }
}
