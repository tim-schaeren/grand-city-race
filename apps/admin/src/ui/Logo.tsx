// The Grand City Race maze, the app's icon, drawn in the text colour so it
// follows light and dark. Made from apps/mobile/app-icons/source/maze.svg.
const MAZE = 'M0 0h21v1h-21zM0 1h1v1h-1zM11 1h1v1h-1zM18 1h1v1h-1zM20 1h1v1h-1zM0 2h1v1h-1zM2 2h1v1h-1zM4 2h13v1h-13zM18 2h1v1h-1zM20 2h1v1h-1zM0 3h1v1h-1zM2 3h1v1h-1zM16 3h1v1h-1zM18 3h1v1h-1zM20 3h1v1h-1zM0 4h1v1h-1zM2 4h9v1h-9zM12 4h3v1h-3zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h1v1h-1zM0 5h1v1h-1zM4 5h1v1h-1zM6 5h1v1h-1zM10 5h1v1h-1zM12 5h1v1h-1zM16 5h1v1h-1zM18 5h1v1h-1zM20 5h1v1h-1zM0 6h1v1h-1zM2 6h3v1h-3zM6 6h1v1h-1zM8 6h1v1h-1zM10 6h3v1h-3zM14 6h3v1h-3zM18 6h1v1h-1zM20 6h1v1h-1zM0 7h1v1h-1zM2 7h1v1h-1zM6 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM18 7h1v1h-1zM20 7h1v1h-1zM0 8h1v1h-1zM2 8h1v1h-1zM4 8h3v1h-3zM8 8h3v1h-3zM12 8h7v1h-7zM20 8h1v1h-1zM0 9h1v1h-1zM2 9h1v1h-1zM4 9h1v1h-1zM12 9h1v1h-1zM18 9h1v1h-1zM20 9h1v1h-1zM2 10h1v1h-1zM4 10h1v1h-1zM6 10h7v1h-7zM14 10h3v1h-3zM18 10h1v1h-1zM0 11h3v1h-3zM4 11h1v1h-1zM6 11h1v1h-1zM9 11h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM18 11h1v1h-1zM20 11h1v1h-1zM0 12h1v1h-1zM4 12h1v1h-1zM6 12h1v1h-1zM8 12h3v1h-3zM12 12h1v1h-1zM14 12h1v1h-1zM16 12h3v1h-3zM20 12h1v1h-1zM0 13h1v1h-1zM2 13h3v1h-3zM6 13h1v1h-1zM8 13h1v1h-1zM10 13h1v1h-1zM14 13h1v1h-1zM18 13h1v1h-1zM20 13h1v1h-1zM0 14h1v1h-1zM6 14h1v1h-1zM8 14h1v1h-1zM10 14h5v1h-5zM16 14h1v1h-1zM18 14h1v1h-1zM20 14h1v1h-1zM0 15h1v1h-1zM2 15h1v1h-1zM4 15h3v1h-3zM8 15h1v1h-1zM16 15h1v1h-1zM20 15h1v1h-1zM0 16h1v1h-1zM2 16h1v1h-1zM4 16h1v1h-1zM6 16h1v1h-1zM8 16h1v1h-1zM10 16h5v1h-5zM16 16h5v1h-5zM0 17h1v1h-1zM2 17h1v1h-1zM6 17h1v1h-1zM10 17h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM0 18h1v1h-1zM2 18h7v1h-7zM10 18h1v1h-1zM12 18h7v1h-7zM20 18h1v1h-1zM0 19h1v1h-1zM10 19h1v1h-1zM20 19h1v1h-1zM0 20h21v1h-21z';

export function Logo({ size = 28, title }: { size?: number; title?: string }) {
  return (
    <svg viewBox="0 0 21 21" width={size} height={size} shapeRendering="crispEdges" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d={MAZE} fill="currentColor" />
    </svg>
  );
}
