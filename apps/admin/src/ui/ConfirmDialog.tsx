import { useId, useState, type ReactNode } from 'react';
import { consoleCopy as cc } from '@grandcityrace/shared';
import { Button } from './Button';
import { Dialog } from './Dialog';

// Every "are you sure" in the console: a dialog in front of the page, saying
// what will happen. For what can't be undone or touches everyone (deleting,
// starting or ending a race) the host also types the name of what it's about,
// so it never happens by a slip of the mouse.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = 'danger',
  typeToConfirm,
  onConfirm,
  onClose,
}: {
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: ReactNode;
  tone?: 'danger' | 'primary';
  typeToConfirm?: string;
  onConfirm: () => Promise<unknown> | unknown;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const ready = !typeToConfirm || typed.trim() === typeToConfirm.trim();

  async function confirm() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={title}
      role="alertdialog"
      busy={busy}
      onClose={onClose}
      footer={<>
        <Button tone="quiet" disabled={busy} onClick={onClose}>{cc.confirm.cancel}</Button>
        <Button tone={tone} disabled={!ready || busy} onClick={confirm} autoFocus={!typeToConfirm}>
          {busy ? cc.confirm.working : confirmLabel}
        </Button>
      </>}
    >
      {children && <div className="text-sm text-gray-600">{children}</div>}
      {typeToConfirm && (
        <div className="space-y-1">
          <label htmlFor={inputId} className="block text-sm text-gray-700">
            {cc.confirm.typeToConfirm({ text: typeToConfirm })}
          </label>
          <input
            id={inputId}
            autoFocus
            autoComplete="off"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirm()}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </Dialog>
  );
}
