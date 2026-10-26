import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import type { ContentBlock } from '@grandcityrace/shared';
import Icon from '../theme/Icon';
import VideoPlayer from './VideoPlayer';
import { useTheme } from '../theme/ThemeContext';
import { copy } from '@grandcityrace/shared';

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
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const t = useTheme();

  return (
    <View style={styles.block}>
      <View style={[styles.video, { borderRadius: t.shape.radius }]}>
        <VideoPlayer videoId={videoId} />
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
