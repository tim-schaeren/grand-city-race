import { createContext, useContext } from 'react';
import { useLocation, type Location } from 'react-router-dom';

// Race control keeps the race in view: on a laptop, a team, quest, item or
// player opened from it slides in from the side instead of replacing it.
// Links carry the page they were opened over; App draws that page behind.
export const SheetHost = createContext(false);

const WIDE = '(min-width: 1024px)';

export type SheetState = { background: Location } | undefined;

// The navigation state for a link to a team, quest, item or player
export function useEntityLinkState(): SheetState {
  const inHost = useContext(SheetHost);
  const location = useLocation();
  // Already in a sheet: the next page opens in it too
  const background = (location.state as SheetState)?.background;
  if (background) return { background };
  if (inHost && window.matchMedia(WIDE).matches) return { background: location };
  return undefined;
}
