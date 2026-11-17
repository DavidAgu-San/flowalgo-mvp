'use client';

import { CircleHelp, History, Menu } from 'lucide-react';
import { useState } from 'react';

const TIPS = [
  'Welcome to FlowAlgo! Paste process notes and get a flowchart in seconds.',
  'Write decisions as questions, like "Approved?", and say what happens on each branch.',
  'Stuck? Open the Templates tab and start from a sample process.',
];

export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" className={className} aria-hidden="true">
      <path d="M20 1 38 7v16c0 11-8 19-18 22C10 42 2 34 2 23V7Z" fill="#0a1f44" stroke="#c9ced8" strokeWidth="2" />
      <rect x="13" y="9" width="14" height="7" rx="2" fill="#ffcc1a" />
      <path d="M20 16v5" stroke="#ffcc1a" strokeWidth="2.5" />
      <path d="m20 21 7 6-7 6-7-6Z" fill="#ffcc1a" />
      <path d="M13 27H8v7M27 27h5v7" stroke="#ffcc1a" strokeWidth="2.5" fill="none" />
    </svg>
  );
}

function HeroArt() {
  return (
    <svg
      viewBox="0 0 900 420"
      className="pointer-events-none absolute bottom-0 right-0 top-20 hidden h-[calc(100%-5rem)] w-[78%] max-w-[1100px] opacity-90 sm:block"
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden="true"
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 10 5 0 10Z" fill="rgba(255,255,255,0.45)" />
        </marker>
      </defs>
      <g stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" fill="none" markerEnd="url(#arrow)">
        <path d="M450 92v46" />
        <path d="M376 210H250v62" />
        <path d="M524 210h126v62" />
        <path d="M650 336v40" />
        <path d="M250 336v40" />
        <path d="M720 304h80V92H530" />
      </g>
      <g fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5">
        <rect x="370" y="40" width="160" height="52" rx="26" />
        <rect x="170" y="276" width="160" height="58" rx="8" />
        <rect x="570" y="276" width="160" height="58" rx="8" />
        <rect x="190" y="380" width="120" height="40" rx="8" />
        <rect x="590" y="380" width="120" height="40" rx="8" />
      </g>
      <path d="M450 142 524 210 450 278 376 210Z" fill="rgba(255,204,26,0.92)" />
      <g fill="rgba(255,255,255,0.7)" fontFamily="system-ui, sans-serif" fontSize="17" textAnchor="middle">
        <text x="450" y="72">Start</text>
        <text x="250" y="311">Yes</text>
        <text x="650" y="311">No</text>
      </g>
      <text x="450" y="216" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="700" fill="#0a1f44">
        Decision?
      </text>
    </svg>
  );
}

export default function PortalHeader({
  onMenu,
  onHistory,
  onHelp,
  initial,
}: {
  onMenu: () => void;
  onHistory: () => void;
  onHelp: () => void;
  initial: string;
}) {
  const [tip, setTip] = useState(0);

  return (
    <header className="relative h-[380px] overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 sm:h-[400px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,204,26,0.18),transparent_45%)]" />
      <HeroArt />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950/70 via-transparent to-transparent" />

      {/* Top bar */}
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 pt-5 sm:px-8">
        <button type="button" onClick={onMenu} aria-label="Open menu" className="rounded p-2 text-white hover:bg-white/10">
          <Menu className="size-7" />
        </button>
        <div className="flex items-center gap-2">
          <LogoMark className="h-12 w-11 drop-shadow" />
          <span className="text-xl font-medium tracking-tight text-gold-400">FlowAlgo</span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button type="button" onClick={onHistory} aria-label="History" className="rounded p-2 text-white hover:bg-white/10">
            <History className="size-7" />
          </button>
          <button type="button" onClick={onHelp} aria-label="Help" className="rounded p-2 text-white hover:bg-white/10">
            <CircleHelp className="size-7" />
          </button>
          <span className="flex size-12 items-center justify-center rounded-full bg-sky-300 text-xl font-medium text-navy-900">
            {initial}
          </span>
        </div>
      </div>

      {/* Welcome card */}
      <button
        type="button"
        onClick={() => setTip((t) => (t + 1) % TIPS.length)}
        className="absolute left-4 right-4 top-[150px] flex min-h-[200px] flex-col overflow-hidden rounded-md bg-white text-left shadow-lg sm:left-[max(2rem,calc((100vw-80rem)/2+2rem))] sm:right-auto sm:w-[400px]"
        aria-label="Next tip"
      >
        <span className="h-5 bg-gold-400" />
        <span className="flex flex-1 items-center justify-center px-8 py-6 text-center text-lg leading-8 tracking-wide text-gray-700">
          {TIPS[tip]}
        </span>
        <span className="px-5 pb-4 text-gray-700">
          {tip + 1} of {TIPS.length}
        </span>
      </button>
    </header>
  );
}
