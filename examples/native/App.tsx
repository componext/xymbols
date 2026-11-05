import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, Compass, House, Menu, Settings, Shapes, HeartPulse, Search } from 'xymbols-react-native/animated';
import type { AnimatedIconHandle } from 'xymbols-react-native/animated';

const TABS = [
  ['home', House],
  ['explore', Compass],
  ['alerts', Bell],
  ['menu', Menu],
] as const;

/** xymbols-react-native/animated, checked on a device: tabs play once when chosen, loops, and the ref. */
export default function App() {
  const [tab, setTab] = useState('home');
  const [pressed, setPressed] = useState<string | null>(null);
  const shapes = useRef<AnimatedIconHandle>(null);
  return (
    <View style={styles.page}>
      <Text style={styles.h}>Loop</Text>
      <View style={styles.row}>
        <Settings trigger="loop" size={36} />
        <Bell trigger="loop" size={36} />
        <HeartPulse trigger="loop" size={36} />
        <Search trigger="loop" effect="bounce" size={36} />
      </View>
      <Text style={styles.h}>Ref</Text>
      <Pressable testID="play-shapes" accessibilityRole="button" style={styles.button} onPress={() => shapes.current?.play('wiggle')}>
        <Shapes ref={shapes} trigger="manual" size={28} />
        <Text>Play wiggle</Text>
      </Pressable>
      <View style={styles.tabs}>
        {TABS.map(([id, Icon]) => (
          <Pressable
            key={id}
            testID={`tab-${id}`}
            accessibilityRole="tab"
            accessibilityLabel={id}
            style={styles.tab}
            onPress={() => setTab(id)}
            onPressIn={() => setPressed(id)}
            onPressOut={() => setPressed(null)}
          >
            <Icon active={tab === id} pressed={pressed === id} color={tab === id ? '#0a84ff' : '#6b7280'} size={28} />
            <Text style={{ color: tab === id ? '#0a84ff' : '#6b7280', fontSize: 11 }}>{id}</Text>
          </Pressable>
        ))}
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff', paddingTop: 80, paddingHorizontal: 24 },
  h: { fontSize: 15, fontWeight: '600', marginTop: 24, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 28 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: '#f3f4f6', alignSelf: 'flex-start' },
  tabs: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, paddingBottom: 34, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#d1d5db' },
  tab: { alignItems: 'center', gap: 4, paddingHorizontal: 12 },
});
