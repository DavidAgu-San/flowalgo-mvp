import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

// Reads ANTHROPIC_API_KEY from .env.local automatically.
const anthropic = new Anthropic();

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5';

const SYSTEM_PROMPT = `You are a senior business analyst.

Convert process notes into a valid Mermaid flowchart, plus a short plain-English overview of the process.

Rules for the "mermaid" field:
1. Mermaid syntax only, starting with "flowchart TD".
2. Use decision diamonds, e.g. B{Approved?}, for questions and decisions.
3. Label decision branches, e.g. B -->|Yes| C and B -->|No| D.
   Only draw branches and outcomes the notes actually describe. Never invent a step, actor, or outcome.
   If the notes leave a branch's outcome unstated, label it as such, e.g. B -->|No| X["Not specified in notes"].
4. Use short alphanumeric node IDs (A, B, C...) and put text in brackets.
5. Wrap labels containing parentheses, quotes, or other special characters in double quotes, e.g. A["Submit form (online)"].
6. No markdown fences, comments, or styling directives.

Rules for the "summary" field:
- 2-4 sentences describing the process, its key decision points, and its possible outcomes.`;

const FlowchartSchema = z.object({
  mermaid: z.string(),
  summary: z.string(),
});

export async function POST(req: Request) {
  const { notes } = (await req.json()) as { notes?: string };

  if (!notes?.trim()) {
    return Response.json({ error: 'Please paste some process notes first.' }, { status: 400 });
  }

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
      messages: [{ role: 'user', content: `Notes:\n${notes}` }],
    });

    if (response.stop_reason === 'refusal') {
      return Response.json({ error: 'The model declined this request.' }, { status: 422 });
    }
    if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
      return Response.json({ error: 'The response was incomplete. Try shorter notes.' }, { status: 502 });
    }

    return Response.json(response.parsed_output);
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
