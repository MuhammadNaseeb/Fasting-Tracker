import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Palette } from './useTheme';

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const t = useTheme();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: t.card, borderColor: t.border },
          pressed && { opacity: 0.85 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const t: Palette = useTheme();
  const bg =
    variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : variant === 'outline' ? 'transparent' : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? '#fff' : t.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'ghost' && { backgroundColor: t.primarySoft },
        variant === 'outline' && { borderWidth: 1.5, borderColor: t.primary },
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: t.sub }]}>{children}</Text>
      {action}
    </View>
  );
}

export function StatTile({
  value,
  label,
  accent,
  bg,
}: {
  value: string;
  label: string;
  accent?: boolean;
  bg?: string;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: bg ?? t.card, borderColor: bg ? 'transparent' : t.border },
      ]}
    >
      <Text style={[styles.tileValue, { color: accent ? t.primary : t.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, { color: t.sub }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.sub }]}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.ribbonTrack, true: t.mint }}
        thumbColor="#fff"
      />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: t.card }]}
          >
            <Text style={[styles.segmentText, { color: active ? t.primary : t.sub }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChoiceRow({
  title,
  sub,
  selected,
  onPress,
}: {
  title: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        { backgroundColor: t.card, borderColor: selected ? t.primary : t.border },
      ]}
    >
      <View style={[styles.radio, { borderColor: selected ? t.primary : t.border }]}>
        {selected ? <View style={[styles.radioFill, { backgroundColor: t.primary }]} /> : null}
      </View>
      <View style={styles.choiceText}>
        <Text style={[styles.rowLabel, { color: t.text }]}>{title}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.sub }]}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  suffix?: string;
}) {
  const t = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: t.sub }]}>{label}</Text>
      <View style={[styles.fieldRow, { backgroundColor: t.card, borderColor: t.border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.sub}
          keyboardType={keyboardType}
          style={[styles.fieldInput, { color: t.text }]}
        />
        {suffix ? <Text style={[styles.fieldSuffix, { color: t.sub }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Loading() {
  const t = useTheme();
  return (
    <View style={[styles.fill, styles.center, { backgroundColor: t.bg }]}>
      <ActivityIndicator color={t.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 104, gap: 12 },
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  button: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  tile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  tileValue: { fontSize: 20, fontWeight: '800' },
  tileLabel: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  toggleText: { flex: 1, paddingRight: 12, gap: 2 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 13, lineHeight: 18 },
  segmented: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 13 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 12, height: 12, borderRadius: 6 },
  choiceText: { flex: 1, gap: 2 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  fieldInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  fieldSuffix: { fontSize: 14 },
});
