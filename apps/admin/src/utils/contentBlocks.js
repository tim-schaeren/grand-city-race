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

// A path on the host's own computer, which no phone can open
const LOCAL_FILE = /^(file:|[a-z]:[\\/]|\/(users|home|private|volumes)\/|~\/)/i;
export const isLocalFile = url => LOCAL_FILE.test(url.trim());

export function blockErrors(editorBlocks) {
  for (const b of editorBlocks) {
    const url = b.type === 'image' ? b.url.trim() : '';
    if (url && isLocalFile(url)) return cc.contentBlocks.imageOnComputer;
    if (url && !/^https?:\/\//i.test(url)) return cc.contentBlocks.imageURLsMustStartWith;
    if (b.type === 'youtube' && b.url.trim() && !parseYouTubeId(b.url)) {
      return cc.contentBlocks.oneOfTheYouTubeLinks;
    }
  }
  return null;
}
