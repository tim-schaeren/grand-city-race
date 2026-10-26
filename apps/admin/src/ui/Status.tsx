import type { ReactNode } from 'react';

// A small coloured label for a state: running, paused, over…
const TONES = {
  neutral: 'bg-gray-100 text-gray-600',
  good: 'bg-green-100 text-green-700',
  warn: 'bg-yellow-100 text-yellow-800',
  bad: 'bg-red-100 text-red-700',
};

export function Status({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
