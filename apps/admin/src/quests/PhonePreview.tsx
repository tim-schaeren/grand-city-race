import { useEffect, useRef, useState } from 'react';
import { consoleCopy as cc, PREVIEW_READY, PREVIEW_SCENE, type PreviewScene } from '@grandcityrace/shared';

// The app's own screens, built for the web (apps/mobile, npm run build:preview),
// in a phone-sized frame. They show whatever scene they're sent, at once.
const PREVIEW_URL = import.meta.env.VITE_PREVIEW_URL ?? '/preview/index.html';
const PHONE = { width: 390, height: 780 };
const FRAME = 20; // the bezel, top and bottom

// As large as fits the height it's given, within reason
function scaleFor(maxHeight: number | undefined): number {
  if (!maxHeight) return 0.72;
  return Math.min(0.72, Math.max(0.4, (maxHeight - FRAME) / PHONE.height));
}

export function PhonePreview({ scene, maxHeight }: { scene: PreviewScene; maxHeight?: number }) {
  const scale = scaleFor(maxHeight);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);

  // The frame asks for its scene once it has loaded
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.type === PREVIEW_READY) setReady(true);
    };
    window.addEventListener('message', receive);
    const timer = setTimeout(() => setSlow(true), 10_000);
    return () => {
      window.removeEventListener('message', receive);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage({ type: PREVIEW_SCENE, scene }, '*');
  }, [ready, scene]);

  // Laid out at a real phone's size, then shrunk to fit beside the form
  return (
    <div className="mx-auto w-fit rounded-[2.5rem] border-[10px] border-gray-900 bg-gray-900 shadow-xl">
      <div className="relative overflow-hidden rounded-[1.8rem] bg-white" style={{ width: PHONE.width * scale, height: PHONE.height * scale }}>
        {!ready && slow && (
          <p className="absolute inset-0 z-10 flex items-center bg-white p-6 text-center text-sm text-gray-500">{cc.questEditor.previewMissing}</p>
        )}
        <iframe
          ref={frame}
          src={PREVIEW_URL}
          title={cc.questEditor.preview}
          // A picture of the app, not the app: nothing in it reacts, so it takes no clicks or keys
          tabIndex={-1}
          className="pointer-events-none block origin-top-left border-0"
          style={{ width: PHONE.width, height: PHONE.height, transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
