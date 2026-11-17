import { Plus } from 'lucide-react';

export const TABS = ['Home', 'Templates', 'History', 'Help'] as const;
export type Tab = (typeof TABS)[number];

export default function TabNav({
  active,
  onChange,
  onNew,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
  onNew: () => void;
}) {
  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center px-4 sm:px-8">
        <div className="flex gap-1 overflow-x-auto sm:gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              className={`whitespace-nowrap border-b-[3px] px-2 py-4 text-[17px] tracking-wide transition sm:px-1.5 ${
                active === tab
                  ? 'border-brand font-bold text-brand'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onNew}
          className="ml-auto hidden items-center gap-2 whitespace-nowrap py-4 pl-4 font-bold uppercase tracking-[0.12em] text-brand hover:text-navy-700 sm:flex"
        >
          <Plus className="size-5" />
          New flowchart
        </button>
      </div>
    </nav>
  );
}
