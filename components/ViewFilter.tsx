import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui';
import { useStore } from '@/lib/store';

/** Umschalter „Haushalt / Person“. Nur sichtbar, wenn es mehrere Personen gibt. */
export function ViewFilter() {
  const { members, viewer, setViewer } = useStore();
  if (members.length < 2) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Chip label="Haushalt" selected={viewer === null} onPress={() => setViewer(null)} />
      {members.map((m) => (
        <Chip
          key={m.id}
          label={m.name}
          color={m.color}
          selected={viewer === m.id}
          onPress={() => setViewer(m.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
});
