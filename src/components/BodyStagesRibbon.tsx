import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BODY_STAGES, BODY_STAGES_DISCLAIMER, stageForElapsed } from '@/lib/bodyStages';
import { useTheme } from './useTheme';

const RIBBON_MAX_HOURS = 36;

export function BodyStagesRibbon({ elapsedHours }: { elapsedHours: number }) {
  const t = useTheme();
  const { stage } = { stage: stageForElapsed(elapsedHours) };
  const scale = RIBBON_MAX_HOURS / 36;

  return (
    <View style={[styles.wrap, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.stageTitle, { color: t.text }]}>{stage.title}</Text>
        <Text style={[styles.stageSub, { color: t.sub }]}>{stage.short}</Text>
      </View>
      <View style={styles.ribbon}>
        {BODY_STAGES.map((s) => {
          const width = ((s.endHour === 999 ? 36 - s.startHour : s.endHour - s.startHour) / RIBBON_MAX_HOURS) * scale * 100;
          const reached = elapsedHours >= s.startHour;
          const current = s.id === stage.id;
          return (
            <View key={s.id} style={[styles.segment, { width: `${width}%` }]}>
              <View
                style={[
                  styles.segFill,
                  {
                    backgroundColor: reached ? (current ? t.purple : t.mint) : t.ribbonTrack,
                    opacity: current ? 1 : reached ? 0.5 : 1,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Text style={[styles.body, { color: t.sub }]}>{stage.body}</Text>
      <Text style={[styles.disclaimer, { color: t.sub }]}>{BODY_STAGES_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  stageTitle: { fontSize: 17, fontWeight: '800' },
  stageSub: { fontSize: 13 },
  ribbon: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  segment: { height: '100%' },
  segFill: { height: '100%', borderRadius: 3, flex: 1 },
  body: { fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 11, lineHeight: 15, opacity: 0.7 },
});
