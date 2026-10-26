import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

// A labelled form field: the label, the control, a line of help, and the
// error when there is one
export function Field({
  label,
  help,
  error,
  children,
}: {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      {children(id)}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : help ? (
        <p className="text-xs text-gray-400">{help}</p>
      ) : null}
    </div>
  );
}

const control = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50';

// Every text input has a length limit, matching the rules and the server;
// close to it, a counter shows how much is left
function Counter({ value, max }: { value: string; max: number }) {
  if (value.length < max * 0.8) return null;
  return <span className="mt-1 block text-right text-xs text-gray-400">{value.length} / {max}</span>;
}

export function TextInput({ value, maxLength, ...props }: InputHTMLAttributes<HTMLInputElement> & { value: string; maxLength: number }) {
  return (
    <>
      <input value={value} maxLength={maxLength} className={control} {...props} />
      <Counter value={value} max={maxLength} />
    </>
  );
}

export function TextArea({ value, maxLength, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; maxLength: number }) {
  return (
    <>
      <textarea value={value} maxLength={maxLength} className={`${control} min-h-24`} {...props} />
      <Counter value={value} max={maxLength} />
    </>
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={control} {...props} />;
}
