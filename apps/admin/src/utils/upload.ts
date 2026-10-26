import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { consoleCopy as cc, paths } from '@grandcityrace/shared';
import { storage } from '../firebase';

// Big enough for any phone screen, small enough to load quickly on the street
const LONGEST_SIDE = 1600;
// What the storage rules take
const MAX_BYTES = 2 * 1024 * 1024;

// A picture from the host's computer, made smaller and put online with the
// game; gives back the address players' phones load it from
export async function uploadPicture(gameId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error(cc.contentBlocksEditor.notAPicture);
  const blob = await shrink(file);
  if (blob.size >= MAX_BYTES) throw new Error(cc.contentBlocksEditor.tooBig);
  const target = ref(storage, `${paths.game(gameId)}/pictures/${crypto.randomUUID()}.jpg`);
  await uploadBytes(target, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' });
  return getDownloadURL(target);
}

// The picture as a JPEG no longer than LONGEST_SIDE on either side, on white
// where it was see-through
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LONGEST_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (blob && blob.size < MAX_BYTES) return blob;
  }
  throw new Error(cc.contentBlocksEditor.tooBig);
}
