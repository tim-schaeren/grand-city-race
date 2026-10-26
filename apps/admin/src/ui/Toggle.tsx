import type { ReactNode } from 'react';

// An on/off switch with what it does beside it, or on its own where the
// switch's place says it all (then named for screen readers only)
export function Toggle({ on, onChange, label, help, name }: {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: ReactNode;
  help?: ReactNode;
  name?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label ? undefined : name}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${on ? 'bg-gray-900' : 'bg-gray-200'}`}
      >
        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </button>
      {label && (
        <span>
          <span className="block text-sm text-gray-700">{label}</span>
          {help && <span className="block text-xs text-gray-400">{help}</span>}
        </span>
      )}
    </label>
  );
}
