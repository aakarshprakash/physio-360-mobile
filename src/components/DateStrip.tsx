import { Pressable, ScrollView, Text } from 'react-native';
import { addDays, dayNumber, monthShort, weekdayShort } from '@/lib/format';
import { colors, radius } from '@/lib/theme';

/** Horizontally scrolling day picker centred on today. */
export function DateStrip({ value, onChange, today, back = 3, ahead = 21 }: { value: string; onChange: (d: string) => void; today: string; back?: number; ahead?: number }) {
  const days = Array.from({ length: back + ahead + 1 }, (_, i) => addDays(today, i - back));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map((d) => {
        const active = d === value;
        return (
          <Pressable key={d} onPress={() => onChange(d)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={d}
            style={{ width: 56, paddingVertical: 8, alignItems: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: active ? colors.ink : colors.border, backgroundColor: active ? colors.ink : colors.surface }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: active ? '#B9CCC6' : colors.muted, textTransform: 'uppercase' }}>{d === today ? 'Today' : weekdayShort(d)}</Text>
            <Text style={{ fontSize: 19, fontWeight: '800', color: active ? '#fff' : colors.ink }}>{dayNumber(d)}</Text>
            <Text style={{ fontSize: 11, color: active ? '#B9CCC6' : colors.muted }}>{monthShort(d)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
