// One of a few options, side by side, with a line on what the chosen one means
export function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; help?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div>
      {/* On a phone the options share the width equally, and a long label
          wraps inside its own button rather than pushing one onto a new line */}
      <div role="radiogroup" aria-label={label} className="grid w-full auto-cols-fr grid-flow-col rounded-lg border border-gray-300 bg-gray-50 p-0.5 sm:inline-grid sm:w-auto sm:auto-cols-auto">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2 py-1.5 text-center text-sm leading-tight transition-colors sm:px-3 ${value === o.value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-400">{options.find(o => o.value === value)?.help}</p>
    </div>
  );
}
