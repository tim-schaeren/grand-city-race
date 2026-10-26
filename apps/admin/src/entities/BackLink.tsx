import { Link, useLocation, useNavigate } from 'react-router-dom';
import { consoleCopy as cc } from '@grandcityrace/shared';

// Back where the host came from: the feed, the map, another page. Opened
// straight from an address, there's no "from", so it goes to the list instead.
export function BackLink({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromConsole = location.key !== 'default';
  const className = 'mb-3 inline-block text-sm text-gray-500 hover:text-gray-900';
  return cameFromConsole
    ? <button type="button" onClick={() => navigate(-1)} className={className}>{cc.entities.back}</button>
    : <Link to={fallback} className={className}>{cc.entities.back}</Link>;
}
