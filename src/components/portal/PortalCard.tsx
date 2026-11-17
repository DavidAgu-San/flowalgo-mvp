import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';

export default function PortalCard({
  title,
  children,
  className = '',
  bodyClassName = '',
  pinned = true,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  pinned?: boolean;
}) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-md bg-white shadow-[0_1px_4px_rgba(0,0,0,0.14)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
        <h2 className="truncate text-lg font-bold tracking-wide text-gray-900">{title}</h2>
        {pinned && <Lock className="size-5 shrink-0 text-gray-500" aria-label="Pinned card" />}
      </header>
      <div className={`min-h-0 flex-1 px-5 pb-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function ActionTile({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-16 items-stretch overflow-hidden rounded border border-gray-200 bg-white text-left transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:shadow-none"
    >
      <span className="flex w-10 shrink-0 items-center justify-center bg-gold-50 text-gold-500">
        {icon}
      </span>
      <span className="flex items-center px-3 py-2 text-[15px] leading-snug text-brand underline underline-offset-2">
        {label}
      </span>
    </button>
  );
}
