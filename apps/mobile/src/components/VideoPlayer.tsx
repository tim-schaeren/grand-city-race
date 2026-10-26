import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

// YouTube rejects embeds without a referrer (error 153), so the player page gets an origin
const EMBED_BASE_URL = 'https://gcr26.app/';

// A YouTube video, played inside the app
export default function VideoPlayer({ videoId }: { videoId: string }) {
  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body></html>`;
  return (
    <WebView
      source={{ html, baseUrl: EMBED_BASE_URL }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      scrollEnabled={false}
      style={{ backgroundColor: '#000' }}
      onShouldStartLoadWithRequest={req => {
        // Keep the player inside the embed; open anything else (e.g. the YouTube logo) externally
        if (!req.isTopFrame || req.url.startsWith(EMBED_BASE_URL) || req.url === 'about:blank') return true;
        Linking.openURL(req.url);
        return false;
      }}
    />
  );
}
