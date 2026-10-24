import { consoleCopy as cc } from '@grandcityrace/shared';
import { parseYouTubeId } from '@grandcityrace/shared';

// Form-state shape: youtube blocks keep the raw `url` the admin typed; toContentBlocks() converts for saving
export function toEditorBlocks(blocks) {
  return blocks.map(b => (b.type === 'youtube' ? { type: 'youtube', url: `https://youtu.be/${b.videoId}` } : b));
}

export function toContentBlocks(editorBlocks) {
  return editorBlocks
    .map(b => {
      if (b.type === 'text') return b.text.trim() ? { type: 'text', text: b.text.trim() } : null;
      if (b.type === 'image') {
        if (!b.url.trim()) return null;
        return b.caption?.trim()
          ? { type: 'image', url: b.url.trim(), caption: b.caption.trim() }
          : { type: 'image', url: b.url.trim() };
      }
      const videoId = parseYouTubeId(b.url);
      return videoId ? { type: 'youtube', videoId } : null;
    })
    .filter(Boolean);
}

export function blockErrors(editorBlocks) {
  for (const b of editorBlocks) {
    if (b.type === 'image' && b.url.trim() && !/^https?:\/\//i.test(b.url.trim())) {
      return cc.contentBlocks.imageURLsMustStartWith;
    }
    if (b.type === 'youtube' && b.url.trim() && !parseYouTubeId(b.url)) {
      return cc.contentBlocks.oneOfTheYouTubeLinks;
    }
  }
  return null;
}
