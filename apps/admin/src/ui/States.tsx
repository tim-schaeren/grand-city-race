import type { ReactNode } from 'react';
import { consoleCopy as cc } from '@grandcityrace/shared';
import type { Live } from '../data/live';

export function Loading({ label = cc.ui.loading }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-400" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      {label}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: ReactNode; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
      <p className="font-medium text-gray-700">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error: Error }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {cc.ui.couldNotLoad} <span className="text-red-500">({error.message})</span>
    </p>
  );
}

// Shows live data once it's here: loading until then, an error if it failed,
// and the empty view only when there's truly nothing
export function Show<T>({
  live,
  isEmpty,
  empty,
  children,
}: {
  live: Live<T>;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (live.status === 'loading') return <Loading />;
  if (live.status === 'error') return <ErrorNote error={live.error} />;
  if (empty && isEmpty?.(live.data)) return <>{empty}</>;
  return <>{children(live.data)}</>;
}
