'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'base',
  themeVariables: {
    primaryColor: '#eef3fb',
    primaryBorderColor: '#1d4f9e',
    primaryTextColor: '#0a1f44',
    lineColor: '#1d4f9e',
    secondaryColor: '#fff8db',
    tertiaryColor: '#ffffff',
    fontFamily: 'Roboto, system-ui, sans-serif',
  },
});

export default function MermaidDiagram({
  chart,
  onRender,
}: {
  chart: string;
  onRender?: (svg: string) => void;
}) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chart) return;
    let cancelled = false;

    mermaid
      .render(`mermaid-${id}`, chart)
      .then(({ svg }) => {
        if (cancelled) return;
        setSvg(svg);
        setError('');
        onRender?.(svg);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvg('');
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id, onRender]);

  if (error) {
    return (
      <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">Mermaid could not render this diagram.</p>
        <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div
      className="overflow-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
