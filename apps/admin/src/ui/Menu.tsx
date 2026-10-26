import { useEffect, useRef, useState, type ReactNode } from 'react';

// A button that opens a small list below it; closes on a click elsewhere,
// on Escape, and when something in it is chosen
export function Menu({
  label,
  align = 'left',
  children,
}: {
  label: ReactNode;
  align?: 'left' | 'right';
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="flex max-w-[60vw] items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 sm:max-w-xs"
      >
        {label}
        <span className="text-[10px] text-gray-400">▼</span>
      </button>
      {open && (
        <div className={`absolute top-full z-[1100] mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onSelect, children, tone = 'normal' }: { onSelect: () => void; children: ReactNode; tone?: 'normal' | 'muted' }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-50 ${tone === 'muted' ? 'text-gray-500' : 'text-gray-800'}`}
    >
      {children}
    </button>
  );
}
