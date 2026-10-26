import { useEffect, useId, type ReactNode } from 'react';

// A box in front of the page: a title, what's in it, and its buttons along
// the bottom. Escape or a click beside it closes it, unless it's busy.
export function Dialog({
  title,
  children,
  footer,
  busy = false,
  role = 'dialog',
  onClose,
}: {
  title: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  busy?: boolean;
  role?: 'dialog' | 'alertdialog';
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && onClose()}>
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-3 px-6 pb-4 pt-5">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
          {children}
        </div>
        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t border-gray-100 bg-gray-50 px-6 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
}
