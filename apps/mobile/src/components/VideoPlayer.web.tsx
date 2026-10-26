// On the web (the console's phone preview) the browser plays the video itself
export default function VideoPlayer({ videoId }: { videoId: string }) {
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}
