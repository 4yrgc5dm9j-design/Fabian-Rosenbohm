import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.titleRow}>
      <Text style={[styles.title, { color: theme.text }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.label, { color: theme.muted }]}>{children}</Text>;
}

type ChipProps = {
  label: string;
  selected?: boolean;
  color?: string;
  onPress: () => void;
  onLongPress?: () => void;
};

export function Chip({ label, selected = false, color, onPress, onLongPress }: ChipProps) {
  const theme = useTheme();
  const accent = color ?? theme.tint;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? accent : theme.border, backgroundColor: selected ? accent : theme.card },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

type SegmentedProps<T extends string> = {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.track }]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          style={[styles.segmentItem, value === o.value && { backgroundColor: theme.card }]}>
          <Text
            style={[
              styles.segmentText,
              { color: value === o.value ? (o.color ?? theme.text) : theme.muted },
            ]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Button({
  label,
  onPress,
  color,
  variant = 'solid',
}: {
  label: string;
  onPress: () => void;
  color?: string;
  variant?: 'solid' | 'outline';
}) {
  const theme = useTheme();
  const accent = color ?? theme.tint;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === 'solid'
          ? { backgroundColor: accent }
          : { borderColor: accent, borderWidth: 1.5, backgroundColor: 'transparent' },
        pressed && { opacity: 0.75 },
      ]}>
      <Text style={[styles.buttonText, { color: variant === 'solid' ? '#FFFFFF' : accent }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export const inputStyle = {
  borderWidth: StyleSheet.hairlineWidth,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
} as const;

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 14, fontWeight: '500' },
  segment: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
