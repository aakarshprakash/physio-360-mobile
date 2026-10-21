import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { absoluteUrl, authHeader } from '@/lib/api';
import { initials } from '@/lib/format';
import { colors, radius, shadow, space, tones, type Tone } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ---------- Typography ---------- */

type TextKind = 'title' | 'heading' | 'subheading' | 'body' | 'label' | 'muted' | 'small' | 'caption';

const textStyles: Record<TextKind, TextStyle> = {
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700', color: colors.ink },
  subheading: { fontSize: 15, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  small: { fontSize: 13, color: colors.muted },
  caption: { fontSize: 11, fontWeight: '700', color: colors.subtle, letterSpacing: 0.6, textTransform: 'uppercase' },
};

export function T({ kind = 'body', style, children, numberOfLines }: { kind?: TextKind; style?: StyleProp<TextStyle>; children: ReactNode; numberOfLines?: number }) {
  return <Text style={[textStyles[kind], style]} numberOfLines={numberOfLines}>{children}</Text>;
}

/* ---------- Layout ---------- */

/** Scrollable screen body with pull-to-refresh and bottom safe-area padding. */
export function Screen({ children, refreshing, onRefresh, padded = true, style }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; padded?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[padded && { padding: space.lg, gap: space.md }, { paddingBottom: insets.bottom + 32 }, style]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]} accessibilityRole="button">
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm }}>
      <T kind="caption">{title}</T>
      {action && <Pressable onPress={onAction} hitSlop={8}><T kind="label" style={{ color: colors.primary }}>{action}</T></Pressable>}
    </Row>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

/* ---------- Controls ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }: {
  title: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const v = {
    primary: { bg: colors.primary, fg: '#fff', border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: colors.primaryDark, border: colors.primarySoft },
    outline: { bg: colors.surface, fg: colors.ink, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        small && { minHeight: 38, paddingHorizontal: 14 },
        { backgroundColor: v.bg, borderColor: v.border, opacity: off ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} size="small" /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={v.fg} /> : null}
      <Text style={{ color: v.fg, fontWeight: '700', fontSize: small ? 14 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tone = 'neutral', size = 40 }: { icon: IconName; onPress: () => void; label: string; tone?: Tone; size?: number }) {
  const t = tones[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={size * 0.48} color={t.fg} />
    </Pressable>
  );
}

export function Field({ label, error, hint, required, children }: { label: string; error?: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T kind="label">{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</T>
      {children}
      {error ? <T kind="small" style={{ color: colors.danger }}>{error}</T> : hint ? <T kind="small">{hint}</T> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, multiline, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={colors.subtle}
      {...rest}
      multiline={multiline}
      style={[styles.input, multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }, invalid && { borderColor: colors.danger }, style]}
    />
  );
}

/** Horizontal pill selector. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            style={[styles.pill, active && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{o.label}{o.count ? ` · ${o.count}` : ''}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A list of selectable chips (single choice). */
export function Chips<T extends string | number>({ value, options, onChange }: { value: T | null; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: active }}
            style={[styles.pill, active && { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Text style={{ color: active ? colors.primaryDark : colors.text, fontWeight: active ? '700' : '500', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Display ---------- */

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: IconName }) {
  const t = tones[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: t.bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      {icon && <Ionicons name={icon} size={12} color={t.fg} />}
      <Text style={{ color: t.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, color = colors.primary, size = 44, uri }: { name: string; color?: string; size?: number; uri?: string | null }) {
  if (uri) {
    return <Image source={{ uri: absoluteUrl(uri), headers: authHeader() }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface2 }} contentFit="cover" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export function Stat({ label, value, icon, tone = 'primary', hint, onPress }: { label: string; value: string | number; icon: IconName; tone?: Tone; hint?: string; onPress?: () => void }) {
  const t = tones[tone];
  return (
    <Card style={{ flex: 1, minWidth: 150, gap: 10 }} onPress={onPress}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={t.fg} />
      </View>
      <View>
        <T kind="small">{label}</T>
        <T kind="title" style={{ fontSize: 22 }}>{value}</T>
        {hint ? <T kind="small" style={{ fontSize: 12 }}>{hint}</T> : null}
      </View>
    </Card>
  );
}

export function ListItem({ title, subtitle, left, right, onPress, meta }: { title: string; subtitle?: string; left?: ReactNode; right?: ReactNode; onPress?: () => void; meta?: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 }, pressed && { opacity: 0.7 }]}>
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <T kind="subheading" numberOfLines={1}>{title}</T>
        {subtitle ? <T kind="small" numberOfLines={2}>{subtitle}</T> : null}
        {meta}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.subtle} /> : null)}
    </Pressable>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 9 }}>
      <T kind="muted">{label}</T>
      {typeof value === 'string' || typeof value === 'number' ? <T kind="body" style={{ flexShrink: 1, textAlign: 'right', fontWeight: '600' }}>{value}</T> : value}
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', title, body, action }: { icon?: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <T kind="subheading" style={{ textAlign: 'center' }}>{title}</T>
      {body ? <T kind="muted" style={{ textAlign: 'center' }}>{body}</T> : null}
      {action}
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
}

export function Banner({ tone = 'info', title, body, icon }: { tone?: Tone; title?: string; body: string; icon?: IconName }) {
  const t = tones[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: t.bg, borderRadius: radius.md, padding: space.md }}>
      <Ionicons name={icon ?? (tone === 'danger' ? 'alert-circle' : tone === 'success' ? 'checkmark-circle' : 'information-circle')} size={20} color={t.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={{ color: t.fg, fontWeight: '700' }}>{title}</Text> : null}
        <Text style={{ color: t.fg }}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, ...shadow },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  input: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, fontSize: 16, color: colors.text },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
});
