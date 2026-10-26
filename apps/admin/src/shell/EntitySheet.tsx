import { useEffect, type ReactNode } from 'react';
import { useNavigate, type Location } from 'react-router-dom';
import { consoleCopy as cc } from '@grandcityrace/shared';
import Icon from '../components/Icon';

// A team, quest, item or player opened over race control, sliding in from the
// side. Closing it returns to race control as it was.
export function EntitySheet({ background, children }: { background: Location; children: ReactNode }) {
  const navigate = useNavigate();
  const close = () => navigate(background.pathname + background.search);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div className="fixed inset-0 z-[1200] bg-black/20" onClick={close} />
      <div role="dialog" aria-modal="true" className="fixed inset-y-0 right-0 z-[1210] w-full max-w-3xl overflow-y-auto bg-gray-50 p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label={cc.raceControl.close}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
        >
          <Icon name="close" size={20} />
        </button>
        {children}
      </div>
    </>
  );
}
