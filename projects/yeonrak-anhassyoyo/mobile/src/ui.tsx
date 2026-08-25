import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from './theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>;
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{meta ? <Text style={styles.meta}>{meta}</Text> : null}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, pressed && !disabled && { opacity: .82 }, disabled && { opacity: .45 }]}><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

export function GhostButton({ label, onPress, danger = false }: { label: string; onPress(): void; danger?: boolean }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { opacity: .65 }]}><Text style={[styles.ghostText, danger && { color: palette.danger }]}>{label}</Text></Pressable>;
}

export function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}><Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text></Pressable>;
}

export function Bars({ values, height = 110 }: { values: number[]; height?: number }) {
  const max = Math.max(1, ...values);
  return <View style={[styles.bars, { height }]}>{values.map((value, index) => <View key={index} style={styles.barSlot}><View style={[styles.bar, { height: Math.max(4, (value / max) * (height - 18)), opacity: value === max ? 1 : .58 }]} /></View>)}</View>;
}

export function Metric({ value, label }: { value: string | number; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { padding: spacing.md, paddingBottom: 130, gap: spacing.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  sectionText: { color: palette.ink, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  meta: { color: palette.muted, fontSize: 12 },
  card: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: radius.md, padding: spacing.md },
  primary: { minHeight: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.plum, borderRadius: radius.md, paddingHorizontal: 18 },
  primaryText: { color: palette.white, fontSize: 15, fontWeight: '800' },
  ghost: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  ghostText: { color: palette.roseDark, fontSize: 14, fontWeight: '700' },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: palette.line, borderRadius: radius.pill, backgroundColor: palette.surface },
  pillSelected: { backgroundColor: palette.roseSoft, borderColor: palette.roseSoft },
  pillText: { color: palette.muted, fontSize: 13, fontWeight: '700' },
  pillTextSelected: { color: palette.roseDark },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', minHeight: 4, backgroundColor: palette.rose, borderRadius: 3 },
  metric: { flex: 1, minWidth: 90, paddingVertical: 10 },
  metricValue: { color: palette.ink, fontWeight: '900', fontSize: 21, letterSpacing: -0.5 },
  metricLabel: { color: palette.muted, fontSize: 11, marginTop: 4 }
});
