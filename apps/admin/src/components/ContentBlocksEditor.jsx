import { consoleCopy as cc } from '@grandcityrace/shared';
import { useState } from 'react';
import { parseYouTubeId } from '@grandcityrace/shared';
import Icon from './Icon';

const NEW_BLOCK = {
  text: () => ({ type: 'text', text: '' }),
  image: () => ({ type: 'image', url: '', caption: '' }),
  youtube: () => ({ type: 'youtube', url: '' }),
};

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';

function ImagePreview({ url }) {
  const [failedUrl, setFailedUrl] = useState(null);
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

export default function ContentBlocksEditor({ blocks, onChange, textPlaceholder, hasError }) {
  function update(index, patch) {
    onChange(blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function move(index, delta) {
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
                <input
                  className={inputClass}
                  value={block.url}
                  onChange={e => update(i, { url: e.target.value })}
                  placeholder={cc.contentBlocksEditor.httpsDirectLinkToA}
                />
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
        {[[cc.contentBlocksEditor.text2, cc.contentBlocksEditor.text3], [cc.contentBlocksEditor.image2, cc.contentBlocksEditor.image3], [cc.contentBlocksEditor.youtube, cc.contentBlocksEditor.youTube2]].map(([type, label]) => (
          <button
            key={type}
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
