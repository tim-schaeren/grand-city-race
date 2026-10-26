import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

export interface Tab {
  to: string;
  label: ReactNode;
  badge?: number;
}

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{n}</span>;
}

// The three phases: big, at the top
export function PhaseTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="flex rounded-lg bg-gray-100 p-1" aria-label="Phase">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
            isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {tab.label}
          <Badge n={tab.badge} />
        </NavLink>
      ))}
    </nav>
  );
}

// The pages of a phase: a row under it that scrolls sideways on a phone
export function SubTabs({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Section">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `flex shrink-0 items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          {tab.label}
          <Badge n={tab.badge} />
        </NavLink>
      ))}
    </nav>
  );
}

// Views within one page, such as a quest's editor and its race day
export function ViewTabs<T extends string>({ tabs, value, onChange }: {
  tabs: { value: T; label: ReactNode; badge?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-6 flex gap-1 border-b border-gray-200" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`-mb-px flex items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
            value === tab.value ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          {tab.label}
          <Badge n={tab.badge} />
        </button>
      ))}
    </div>
  );
}
