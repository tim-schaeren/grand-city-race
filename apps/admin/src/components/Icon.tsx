import { iconPath } from './iconPaths';

export default function Icon({ name, size = 16, className = '', title }: { name: string; size?: number; className?: string; title?: string }) {
  const path = iconPath(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      <path d={path} />
    </svg>
  );
}
