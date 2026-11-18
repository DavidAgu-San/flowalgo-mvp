'use client';

import { BookOpen, Code2, Copy, Download, FileText, List, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import MermaidDiagram from '@/components/MermaidDiagram';
import PortalCard, { ActionTile } from '@/components/portal/PortalCard';
import PortalHeader from '@/components/portal/PortalHeader';
import TabNav, { TABS, type Tab } from '@/components/portal/TabNav';
import { TEMPLATES } from '@/lib/templates';

// Keep in sync with MAX_PDF_BYTES in api/generate/route.ts.
const MAX_PDF_BYTES = 3 * 1024 * 1024;

type InferredStep = { nodeId: string; page: number; quote: string; reason: string };
type Result = { mermaid: string; summary: string; inferred: InferredStep[] };
type HistoryItem = Result & { id: number; title: string; notes: string; createdAt: Date; pdfName?: string };
type Attachment = { name: string; data: string };

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Result is "data:application/pdf;base64,<data>"; keep only <data>.
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('Home');
  const [menuOpen, setMenuOpen] = useState(false);

  const [notes, setNotes] = useState(TEMPLATES[0].notes);
  const [result, setResult] = useState<Result | null>(null);
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pdf, setPdf] = useState<Attachment | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function attachPdf(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('That PDF is larger than 3 MB. Try a shorter excerpt of the syllabus.');
      return;
    }
    try {
      setPdf({ name: file.name, data: await readAsBase64(file) });
      setError('');
    } catch {
      setError('Could not read that file.');
    }
  }

  const handleRender = useCallback((renderedSvg: string) => setSvg(renderedSvg), []);

  function goTo(next: Tab) {
    setTab(next);
    setMenuOpen(false);
  }

  function startOver() {
    setNotes('');
    setPdf(null);
    setResult(null);
    setSvg('');
    setError('');
    setShowCode(false);
    goTo('Home');
  }

  async function generateFlowchart() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, pdf: pdf?.data }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Something went wrong.');
      setSvg('');
      setResult(data);
      setHistory((h) => [
        {
          ...data,
          id: Date.now(),
          notes,
          pdfName: pdf?.name,
          title: notes.trim().split('\n')[0].replace(/^[-\d.\s]+/, '').slice(0, 60),
          createdAt: new Date(),
        },
        ...h,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function downloadSvg() {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowchart.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyCode() {
    if (!result) return;
    await navigator.clipboard.writeText(result.mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openHistory(item: HistoryItem) {
    setNotes(item.notes);
    setSvg('');
    setResult({ mermaid: item.mermaid, summary: item.summary, inferred: item.inferred });
    goTo('Home');
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PortalHeader
        initial="D"
        onMenu={() => setMenuOpen(true)}
        onHistory={() => goTo('History')}
        onHelp={() => goTo('Help')}
      />
      <TabNav active={tab} onChange={goTo} onNew={startOver} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {tab === 'Home' && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <PortalCard title="Process Notes" className="md:col-span-2" bodyClassName="flex flex-col">
              <textarea
                className="min-h-56 w-full flex-1 resize-y rounded border border-gray-300 p-4 font-mono text-sm leading-6 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste process notes..."
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={generateFlowchart}
                  disabled={loading || !notes.trim()}
                  className="inline-flex items-center gap-2 rounded bg-navy-800 px-5 py-3 font-medium text-white transition hover:bg-navy-700 disabled:opacity-50"
                >
                  <Sparkles className="size-4 text-gold-400" />
                  {loading ? 'Generating…' : 'Generate Flowchart'}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => attachPdf(e.target.files?.[0])}
                />
                {pdf ? (
                  <span className="inline-flex items-center gap-2 rounded border border-gold-400 bg-gold-50 px-3 py-2 text-sm text-gray-800">
                    <FileText className="size-4 shrink-0 text-gold-500" />
                    <span className="max-w-48 truncate" title={pdf.name}>{pdf.name}</span>
                    <button type="button" onClick={() => setPdf(null)} aria-label="Remove syllabus" className="rounded p-0.5 hover:bg-gold-400/30">
                      <X className="size-4" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-2 rounded border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Paperclip className="size-4" />
                    Attach syllabus (PDF)
                  </button>
                )}
                <button type="button" onClick={() => goTo('Templates')} className="text-sm text-brand underline underline-offset-2">
                  Browse templates
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Optional. Up to 3 MB / 20 pages. Gaps in your notes are filled from the syllabus and highlighted with a dashed outline.
              </p>
              {error && (
                <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
              )}
            </PortalCard>

            <PortalCard title="Quick Actions">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                <ActionTile label="Download SVG" icon={<Download className="size-5" />} onClick={downloadSvg} disabled={!svg} />
                <ActionTile label={copied ? 'Copied!' : 'Copy Mermaid'} icon={<Copy className="size-5" />} onClick={copyCode} disabled={!result} />
                <ActionTile label={showCode ? 'Hide Code' : 'View Code'} icon={<Code2 className="size-5" />} onClick={() => setShowCode((s) => !s)} disabled={!result} />
                <ActionTile label="Start Over" icon={<RotateCcw className="size-5" />} onClick={startOver} />
              </div>
            </PortalCard>

            <PortalCard title="Process Overview">
              {result ? (
                <p className="leading-7 text-gray-700">{result.summary}</p>
              ) : (
                <EmptyState text="A plain-English summary of your process appears here." />
              )}
            </PortalCard>

            <PortalCard title="Flowchart" className="md:col-span-2 xl:col-span-4">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-gray-500">Drawing your flowchart…</div>
              ) : result ? (
                <>
                  <MermaidDiagram chart={result.mermaid} onRender={handleRender} />
                  {result.inferred.length > 0 && <InferredPanel steps={result.inferred} />}
                  {showCode && (
                    <pre className="mt-4 overflow-auto rounded bg-gray-100 p-4 font-mono text-sm">{result.mermaid}</pre>
                  )}
                </>
              ) : (
                <EmptyState text="Paste notes above and click Generate Flowchart." tall />
              )}
            </PortalCard>
          </div>
        )}

        {tab === 'Templates' && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {TEMPLATES.map((t) => (
              <PortalCard key={t.title} title={t.title} bodyClassName="flex flex-col">
                <p className="text-gray-600">{t.description}</p>
                <pre className="mt-4 max-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 font-mono text-xs leading-5 text-gray-700">
                  {t.notes}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    setNotes(t.notes);
                    goTo('Home');
                  }}
                  className="mt-4 self-start rounded bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
                >
                  Use this template
                </button>
              </PortalCard>
            ))}
          </div>
        )}

        {tab === 'History' &&
          (history.length === 0 ? (
            <PortalCard title="History" pinned={false}>
              <EmptyState text="Flowcharts you generate in this session show up here." />
            </PortalCard>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {history.map((item) => (
                <PortalCard key={item.id} title={item.title || 'Untitled'} pinned={false} bodyClassName="flex flex-col">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    {item.createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                  <p className="mt-2 line-clamp-4 flex-1 text-sm leading-6 text-gray-700">{item.summary}</p>
                  {item.pdfName && (
                    <p className="mt-2 flex items-center gap-1 truncate text-xs text-gray-500" title={item.pdfName}>
                      <FileText className="size-3.5 shrink-0" />
                      {item.pdfName}
                      {item.inferred.length > 0 && ` · ${item.inferred.length} step${item.inferred.length === 1 ? '' : 's'} from syllabus`}
                    </p>
                  )}
                  <button type="button" onClick={() => openHistory(item)} className="mt-4 self-start text-brand underline underline-offset-2">
                    Open flowchart
                  </button>
                </PortalCard>
              ))}
            </div>
          ))}

        {tab === 'Help' && (
          <div className="grid gap-6 md:grid-cols-2">
            <PortalCard title="What to include" pinned={false}>
              <ul className="space-y-3 text-gray-700">
                <HelpItem label="Steps as actions" example="Manager reviews request" />
                <HelpItem label="Decisions as questions or ifs" example="Approved? / if the order is older than 30 days" />
                <HelpItem label="What happens on each branch" example="If yes: create account. If no: reject." />
                <HelpItem label="Loops" example="wait until returned, then…" />
                <HelpItem label="Who does it (optional)" example="finance issues the refund" />
              </ul>
            </PortalCard>
            <PortalCard title="What to avoid" pinned={false}>
              <ul className="space-y-3 text-gray-700">
                <HelpItem label="Decisions with no outcome" example={'"Check credit score?" with no next step'} />
                <HelpItem label="Several processes at once" example="Generate one process per flowchart" />
                <HelpItem label="Very long documents" example="Split into sub-processes for readable charts" />
                <HelpItem label="Non-process content" example="Agendas or fact lists make meaningless charts" />
              </ul>
            </PortalCard>
          </div>
        )}
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-20 flex" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="w-72 max-w-[85vw] bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold text-navy-900">Menu</span>
              <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded p-1 hover:bg-gray-100">
                <X className="size-6" />
              </button>
            </div>
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => goTo(t)}
                className={`block w-full rounded px-3 py-3 text-left ${t === tab ? 'bg-gold-50 font-bold text-brand' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button type="button" className="flex-1 bg-black/40" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, tall }: { text: string; tall?: boolean }) {
  return (
    <div className={`flex items-center justify-center rounded border border-dashed border-gray-300 p-6 text-center text-gray-500 ${tall ? 'h-64' : 'h-full min-h-40'}`}>
      {text}
    </div>
  );
}

function InferredPanel({ steps }: { steps: InferredStep[] }) {
  return (
    <section className="mt-6 rounded border border-gold-400 bg-gold-50/60 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-navy-900">
        <BookOpen className="size-5 text-gold-500" />
        Filled from syllabus
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        Your notes didn&apos;t cover these steps, so they were taken from the attached syllabus. They have a dashed outline
        on the chart. Check each quote against the document.
      </p>
      <ul className="mt-4 space-y-4">
        {steps.map((step) => (
          <li key={step.nodeId} className="rounded bg-white p-3 shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              Node <span className="font-mono">{step.nodeId}</span>
              <span className="ml-2 text-xs font-normal text-gray-500">Syllabus p. {step.page}</span>
            </p>
            <blockquote className="mt-2 border-l-4 border-gold-400 pl-3 text-sm italic text-gray-700">
              &ldquo;{step.quote}&rdquo;
            </blockquote>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Why:</span> {step.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HelpItem({ label, example }: { label: string; example: string }) {
  return (
    <li className="flex gap-3">
      <List className="mt-0.5 size-5 shrink-0 text-gold-500" />
      <span>
        <span className="font-medium text-gray-900">{label}</span>
        <span className="block text-sm text-gray-500">{example}</span>
      </span>
    </li>
  );
}
