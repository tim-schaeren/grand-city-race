import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ContentBlock } from '@grandcityrace/shared';
import Icon from '../theme/Icon';
import { useTheme } from '../theme/ThemeContext';
import { copy } from '@grandcityrace/shared';

// YouTube rejects embeds without a referrer (error 153), so the player page gets an origin
const EMBED_BASE_URL = 'https://gcr26.app/';

function RemoteImage({ url, caption }: { url: string; caption?: string }) {
  const [aspectRatio, setAspectRatio] = useState(4 / 3);
  const [failed, setFailed] = useState(false);
  const t = useTheme();
  if (failed) return null;
  return (
    <View style={styles.block}>
      <Image
        source={{ uri: url }}
        style={[styles.image, { aspectRatio, borderRadius: t.shape.radius, backgroundColor: t.colors.surface }]}
        resizeMode="contain"
        onLoad={e => {
          const { width, height } = e.nativeEvent.source;
          if (width && height) setAspectRatio(width / height);
        }}
        onError={() => setFailed(true)}
      />
      {caption ? <Text style={[styles.caption, { color: t.colors.muted }]}>{caption}</Text> : null}
    </View>
  );
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0"
  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
  referrerpolicy="strict-origin-when-cross-origin"></iframe>
</body></html>`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const t = useTheme();

  return (
    <View style={styles.block}>
      <View style={[styles.video, { borderRadius: t.shape.radius }]}>
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
      </View>
      <TouchableOpacity style={styles.watchLink} onPress={() => Linking.openURL(watchUrl)}>
        <Text style={[styles.caption, { color: t.colors.muted, marginTop: 0 }]}>{copy.openInYouTube}</Text>
        <Icon name="open-in-new" size={13} color={t.colors.muted} />
      </TouchableOpacity>
    </View>
  );
}

export default function ContentBlocks({ blocks, textStyle }: { blocks: ContentBlock[]; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={styles.container}>
      {blocks.map((block, i) => {
        if (block.type === 'text') return <Text key={i} style={[styles.block, textStyle]}>{block.text}</Text>;
        if (block.type === 'image') return <RemoteImage key={i} url={block.url} caption={block.caption} />;
        if (block.type === 'youtube') return <YouTubeEmbed key={i} videoId={block.videoId} />;
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  block: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  watchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  caption: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
  },
});
