import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

// The console's buttons. Primary for the one main action on a page,
// secondary for the rest, danger for what can't be undone, quiet for links
// that sit among text.
type Tone = 'primary' | 'secondary' | 'danger' | 'quiet';

const TONES: Record<Tone, string> = {
  primary: 'bg-gray-900 text-white hover:bg-gray-700 disabled:bg-gray-400',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40',
  quiet: 'text-gray-500 hover:text-gray-900 disabled:opacity-40',
};

const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1';
const PADDING = { normal: 'px-4 py-2', small: 'px-3 py-1.5' };
type Size = keyof typeof PADDING;

function buttonClass(tone: Tone = 'secondary', size: Size = 'normal') {
  return `${base} ${tone === 'quiet' ? '' : PADDING[size]} ${TONES[tone]}`;
}

export function Button({
  tone = 'secondary',
  size,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: Size }) {
  return <button type={type} className={`${buttonClass(tone, size)} ${className}`} {...props} />;
}

export function LinkButton({ to, tone = 'secondary', children }: { to: string; tone?: Tone; children: ReactNode }) {
  return <Link to={to} className={buttonClass(tone)}>{children}</Link>;
}
