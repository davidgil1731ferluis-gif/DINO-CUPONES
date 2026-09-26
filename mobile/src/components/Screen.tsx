import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/src/theme';

export function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>DINOCUPONES</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const common = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  strong: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 4 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 42 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 110 },
  heading: { marginBottom: 18 },
  eyebrow: { color: colors.purple, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 31, lineHeight: 36, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 520 },
});
