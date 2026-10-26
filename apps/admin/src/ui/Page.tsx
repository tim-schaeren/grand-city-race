import type { ReactNode } from 'react';

// Every page starts the same way: a title, a sentence on what it's for, and
// its actions on the right
export function Page({
  title,
  description,
  actions,
  wide = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 text-balance">{title}</h1>
          {description && <p className="mt-1 max-w-prose text-sm text-gray-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
