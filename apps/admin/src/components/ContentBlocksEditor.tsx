import { consoleCopy as cc } from '@grandcityrace/shared';
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { parseYouTubeId } from '@grandcityrace/shared';
import Icon from './Icon';
import type { EditorBlock } from '../quests/questForm';
import { isLocalFile } from '../utils/contentBlocks';
import { uploadPicture } from '../utils/upload';
import { Button } from '../ui/Button';

const NEW_BLOCK: Record<EditorBlock['type'], () => EditorBlock> = {
  text: () => ({ type: 'text', text: '' }),
  image: () => ({ type: 'image', url: '', caption: '' }),
  youtube: () => ({ type: 'youtube', url: '' }),
};

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

function ImagePreview({ url }: { url: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!/^https?:\/\//i.test(url.trim())) return null;
  if (failedUrl === url) return <p className="text-xs text-red-500">{cc.contentBlocksEditor.imageCouldNotBeLoaded}</p>;
  return (
    <img
      src={url.trim()}
      alt=""
      onError={() => setFailedUrl(url)}
      className="w-full max-h-48 object-contain rounded-md bg-gray-50"
    />
  );
}

// A picture from the host's computer, put online with the game
function UploadButton({ hasPicture, onUploaded }: { hasPicture: boolean; onUploaded: (url: string) => void }) {
  const { gameId } = useParams();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file || !gameId) return;
    setBusy(true);
    setError(null);
    try {
      onUploaded(await uploadPicture(gameId, file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={e => upload(e.target.files?.[0])} />
      <Button size="small" disabled={busy || !gameId} onClick={() => input.current?.click()}>
        {busy ? cc.contentBlocksEditor.uploading : hasPicture ? cc.contentBlocksEditor.replace : cc.contentBlocksEditor.upload}
      </Button>
      {error && <span className="text-xs text-red-600" role="alert">{error}</span>}
    </div>
  );
}

export default function ContentBlocksEditor({ blocks, onChange, textPlaceholder, hasError = false }: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  textPlaceholder: string;
  hasError?: boolean;
}) {
  function update(index: number, patch: Partial<EditorBlock>) {
    onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } as EditorBlock : b)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        const videoId = block.type === 'youtube' ? parseYouTubeId(block.url) : null;
        return (
          <div key={i} className={`border rounded-lg p-2 space-y-2 ${hasError ? 'border-red-300' : 'border-gray-200'}`}>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="uppercase tracking-wide font-medium">
                {block.type === 'text' ? cc.contentBlocksEditor.text : block.type === 'image' ? cc.contentBlocksEditor.image : cc.contentBlocksEditor.youTube}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="hover:text-gray-700 disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="hover:text-gray-700 disabled:opacity-30">↓</button>
                <button onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="hover:text-red-400" title={cc.contentBlocksEditor.remove}><Icon name="close" size={14} /></button>
              </div>
            </div>

            {block.type === 'text' && (
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={block.text}
                onChange={e => update(i, { text: e.target.value })}
                placeholder={textPlaceholder}
              />
            )}

            {block.type === 'image' && (
              <>
                <UploadButton hasPicture={!!block.url.trim()} onUploaded={url => update(i, { url })} />
                <input
                  className={inputClass}
                  value={block.url}
                  onChange={e => update(i, { url: e.target.value })}
                  placeholder={cc.contentBlocksEditor.httpsDirectLinkToA}
                />
                {isLocalFile(block.url)
                  ? <p className="text-xs text-red-600">{cc.contentBlocks.imageOnComputer}</p>
                  : !block.url.trim() && <p className="text-xs text-gray-400">{cc.contentBlocksEditor.imageHelp}</p>}
                <input
                  className={inputClass}
                  value={block.caption ?? ''}
                  onChange={e => update(i, { caption: e.target.value })}
                  placeholder={cc.contentBlocksEditor.captionOptional}
                />
                <ImagePreview url={block.url} />
              </>
            )}

            {block.type === 'youtube' && (
              <>
                <input
                  className={inputClass}
                  value={block.url}
                  onChange={e => update(i, { url: e.target.value })}
                  placeholder={cc.contentBlocksEditor.httpsWwwYoutubeComWatch}
                />
                {videoId && (
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full rounded-md"
                      src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                      title={cc.contentBlocksEditor.youTubePreview}
                      allow="encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex gap-3">
        {([['text', cc.contentBlocksEditor.text3], ['image', cc.contentBlocksEditor.image3], ['youtube', cc.contentBlocksEditor.youTube2]] as const).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange([...blocks, NEW_BLOCK[type]()])}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
