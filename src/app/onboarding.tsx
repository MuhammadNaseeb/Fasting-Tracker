import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, FlatList, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/components/useTheme';
import { AppButton, Card, ChoiceRow, TextInputField } from '@/components/ui';
import { WELCOME_SLIDES } from '@/components/Illustrations';
import { Activity, Experience, Goal, OnboardingAnswers, Sex, recommendPlan } from '@/lib/recommend';
import { SafetyCheck, bmi, checkAge, checkGoalWeight, healthyMinWeightKg, PREGNANCY_TITLE, UNDERAGE_TITLE } from '@/lib/safety';
import { ensurePermissions, notificationsUnavailableReason } from '@/lib/notifications';

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const SCREEN_W = Dimensions.get('window').width;

const GREEN = '#10B981';

const CURRENT_YEAR = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 101 }, (_, i) => CURRENT_YEAR - 100 + i);
const YEAR_ITEM_H = 44;

const QUIZ_IMAGES: Record<string, ImageSourcePropType> = {
  'goal-lose': require('../../assets/images/replace/2nd page/pexels-shvets-production-6975464.jpg'),
  'goal-energy': require('../../assets/images/replace/2nd page/pexels-mart-production-7880002.jpg'),
  'goal-habit': require('../../assets/images/replace/2nd page/pexels-vlada-karpovich-8940487.jpg'),
  'goal-maintain': require('../../assets/images/replace/2nd page/pexels-annushka-ahuja-7991934.jpg'),
  'activity-sedentary': require('../../assets/images/quiz/activity-sedentary.jpg'),
  'activity-light': require('../../assets/images/quiz/activity-light.jpg'),
  'activity-moderate': require('../../assets/images/quiz/activity-moderate.jpg'),
  'activity-active': require('../../assets/images/quiz/activity-active.jpg'),
  'exp-never': require('../../assets/images/quiz/exp-never.jpg'),
  'exp-tried': require('../../assets/images/quiz/exp-tried.jpg'),
  'exp-experienced': require('../../assets/images/quiz/exp-experienced.jpg'),
};

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Lose weight', image: 'goal-lose' },
  { value: 'energy', label: 'Feel more energetic', image: 'goal-energy' },
  { value: 'habit', label: 'Build the habit', image: 'goal-habit' },
  { value: 'maintain', label: 'Maintain weight', image: 'goal-maintain' },
];

const GOAL_TIPS: Record<Goal, { emoji: string; title: string; body: string }> = {
  lose_weight: {
    emoji: '😊',
    title: "It's within reach!",
    body: "We'll tailor the optimal plan, and adjust it as needed for your best outcome.",
  },
  energy: {
    emoji: '⚡',
    title: 'Power up!',
    body: 'Steadier energy all day — fasting helps smooth out those afternoon crashes.',
  },
  habit: {
    emoji: '🎯',
    title: 'Consistency wins!',
    body: 'Small daily wins add up — we will help you build a routine that sticks.',
  },
  maintain: {
    emoji: '🤗',
    title: 'Absolutely!',
    body: "You'll keep a stable weight and develop better living habits here.",
  },
};

function GoalTipBanner({ tip }: { tip: { emoji: string; title: string; body: string } }) {
  const t = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);
  return (
    <Animated.View
      style={[
        styles.tipBanner,
        {
          backgroundColor: t.dark ? t.peachSoft : '#FEFAE5',
          borderColor: t.dark ? 'rgba(246,201,122,0.35)' : '#F3E9B7',
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-32, 0] }) }],
        },
      ]}
    >
      <Text style={styles.tipEmoji}>{tip.emoji}</Text>
      <View style={styles.tipTextWrap}>
        <Text style={[styles.tipTitle, { color: t.text }]}>{tip.title}</Text>
        <Text style={[styles.tipBody, { color: t.sub }]}>{tip.body}</Text>
      </View>
    </Animated.View>
  );
}

const STEP_META: Record<number, { title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  1: { title: 'Goal & Focus', icon: 'aperture' },
  2: { title: 'Body data', icon: 'body' },
  3: { title: 'Body data', icon: 'body' },
  4: { title: 'Body data', icon: 'body' },
  5: { title: 'Body data', icon: 'body' },
  6: { title: 'Body data', icon: 'body' },
  7: { title: 'Activity Level', icon: 'barbell' },
  8: { title: 'Experience', icon: 'book' },
  9: { title: 'Daily Rhythm', icon: 'time' },
  10: { title: 'Mealtimes', icon: 'restaurant' },
  11: { title: 'Your Plan', icon: 'calendar' },
  12: { title: 'Reminders', icon: 'notifications' },
};

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Mostly sitting', image: 'activity-sedentary' },
  { value: 'light', label: 'Lightly active', image: 'activity-light' },
  { value: 'moderate', label: 'Moderately active', image: 'activity-moderate' },
  { value: 'active', label: 'Very active', image: 'activity-active' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'never', label: 'Never tried it', image: 'exp-never' },
  { value: 'tried', label: 'Tried it before', image: 'exp-tried' },
  { value: 'experienced', label: 'Fast regularly', image: 'exp-experienced' },
];

function TipBubble({ emoji, text }: { emoji: string; text: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[styles.bubblePointer, { backgroundColor: t.card, borderColor: t.border }]} />
      <View style={[styles.bubble, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={styles.bubbleEmoji}>{emoji}</Text>
        <Text style={[styles.bubbleText, { color: t.text }]}>{text}</Text>
      </View>
    </View>
  );
}

function YearWheel({
  years,
  year,
  onPick,
}: {
  years: number[];
  year: number;
  onPick: (y: number) => void;
}) {
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const ready = useRef(false);
  const listH = YEAR_ITEM_H * 5;
  const pad = (listH - YEAR_ITEM_H) / 2;
  const [activeIdx, setActiveIdx] = useState(() => Math.max(0, years.indexOf(year)));

  useEffect(() => {
    ready.current = false;
    const id = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: activeIdx * YEAR_ITEM_H, animated: false });
      ready.current = true;
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clampIdx = (i: number) => Math.min(years.length - 1, Math.max(0, i));

  const commit = (idx: number) => {
    setActiveIdx(idx);
    const y = years[idx];
    if (y !== undefined && y !== year) onPick(y);
  };

  const handleEnd = (off: number) => {
    if (!ready.current) return;
    const idx = clampIdx(Math.round((off - pad) / YEAR_ITEM_H));
    const target = idx * YEAR_ITEM_H + pad;
    if (Math.abs(off - target) > 0.5) {
      scrollRef.current?.scrollTo({ y: target, animated: false });
    }
    commit(idx);
  };

  return (
    <View style={{ height: listH }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={YEAR_ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        onScroll={(e) => {
          if (!ready.current) return;
          const idx = clampIdx(Math.round((e.nativeEvent.contentOffset.y - pad) / YEAR_ITEM_H));
          setActiveIdx(idx);
        }}
        onScrollEndDrag={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(e) => handleEnd(e.nativeEvent.contentOffset.y)}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {years.map((y, i) => {
          const d = Math.abs(i - activeIdx);
          return (
            <Pressable
              key={y}
              onPress={() => {
                const idx = years.indexOf(y);
                scrollRef.current?.scrollTo({ y: idx * YEAR_ITEM_H, animated: true });
                commit(idx);
              }}
              style={{ height: YEAR_ITEM_H, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text
                style={{
                  fontSize: d === 0 ? 26 : 20,
                  fontWeight: d === 0 ? '900' : '600',
                  color: t.text,
                  opacity: d === 0 ? 1 : d === 1 ? 0.55 : 0.28,
                }}
              >
                {y}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View
        pointerEvents="none"
        style={[
          styles.wheelCenter,
          { top: pad, height: YEAR_ITEM_H, borderColor: t.dark ? 'rgba(246,201,122,0.4)' : '#C9CDD8' },
        ]}
      />
    </View>
  );
}

function UnitToggle({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.unitToggle}>
      {options.map((o) => (
        <Pressable
          key={o.v}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(o.v);
          }}
          style={[styles.unitOpt, value === o.v && styles.unitOptOn]}
        >
          <Text style={[styles.unitTxt, value === o.v && styles.unitTxtOn]}>{o.l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RulerPicker({
  min,
  max,
  step,
  value,
  onChange,
  vertical = false,
  majorEvery = 10,
  highlight,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  vertical?: boolean;
  majorEvery?: number;
  highlight?: [number, number];
}) {
  const TICK = vertical ? 14 : 10;
  const RULER_H = 420;
  const count = Math.round((max - min) / step) + 1;
  const PAD = vertical ? (RULER_H - TICK) / 2 : Math.round((SCREEN_W - 32 - TICK) / 2);

  const listRef = useRef<FlatList<number>>(null);
  const ready = useRef(false);
  const data = useMemo(
    () => Array.from({ length: count }, (_, i) => Math.round((min + i * step) * 10) / 10),
    [count, min, step]
  );

  useEffect(() => {
    ready.current = false;
    const id = setTimeout(() => {
      const idx = Math.min(count - 1, Math.max(0, Math.round((value - min) / step)));
      const offset = idx * TICK + PAD;
      listRef.current?.scrollToOffset({ offset, animated: false });
      ready.current = true;
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [min, max, step, vertical]);

  const emitValue = (off: number) => {
    if (!ready.current) return;
    const idx = Math.min(count - 1, Math.max(0, Math.round((off - PAD) / TICK)));
    const v = data[idx];
    if (v !== undefined && v !== Math.round(value * 10) / 10) onChange(v);
  };

  const clampIdx = (i: number) => Math.min(count - 1, Math.max(0, i));

  const renderItem = useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const major = index % majorEvery === 0;
      const hi = highlight ? item > highlight[0] && item <= highlight[1] : false;
      const lineColor = hi ? GREEN : major ? '#9AA1AE' : '#C7CCD6';
      if (vertical) {
        return (
          <View style={{ height: TICK, flexDirection: 'row', alignItems: 'center', paddingLeft: 4 }}>
            <View style={{ width: major ? 34 : 16, height: 1.5, backgroundColor: lineColor }} />
            {major ? (
              <Text style={{ marginLeft: 10, fontSize: 13, color: '#9AA1AE', fontWeight: '600' }}>{item}</Text>
            ) : null}
          </View>
        );
      }
      return (
        <View style={{ width: TICK, height: 70, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={{ height: 16, justifyContent: 'flex-end', marginBottom: 4 }}>
            {major ? <Text style={{ fontSize: 12, color: '#9AA1AE', fontWeight: '600' }}>{item}</Text> : null}
          </View>
          <View style={{ width: 1.5, height: major ? 40 : 22, backgroundColor: lineColor }} />
        </View>
      );
    },
    [vertical, majorEvery, highlight]
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<number> | null | undefined, i: number) => ({ length: TICK, offset: TICK * i + PAD, index: i }),
    [TICK, PAD]
  );

  return (
    <View style={vertical ? { height: RULER_H } : { height: 78 }}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={clampIdx(Math.round((value - min) / step))}
        horizontal={!vertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        snapToInterval={TICK}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        ListHeaderComponent={<View style={vertical ? { height: PAD } : { width: PAD }} />}
        ListFooterComponent={<View style={vertical ? { height: PAD } : { width: PAD }} />}
        scrollEventThrottle={16}
        onScroll={(e) => emitValue(vertical ? e.nativeEvent.contentOffset.y : e.nativeEvent.contentOffset.x)}
        onMomentumScrollEnd={(e) => emitValue(vertical ? e.nativeEvent.contentOffset.y : e.nativeEvent.contentOffset.x)}
      />
      {vertical ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 60, top: RULER_H / 2 - 1.25, height: 2.5, backgroundColor: GREEN }}
        />
      ) : (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: (SCREEN_W - 32) / 2 - 1.25, top: 26, bottom: 0, width: 2.5, backgroundColor: GREEN }}
        />
      )}
    </View>
  );
}

function ftLabel(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)} ft ${inches % 12} in`;
}

function bmiMessage(b: number): string {
  if (b < 18.5) return 'You are below the healthy range — please be gentle with yourself.';
  if (b < 25) return 'You are in great shape! Keep it up!';
  if (b < 30) return 'Slightly above the healthy range — small steps add up fast.';
  return 'A gentle plan is the best place to start — you can do this.';
}

function goalFeedback(cur: number, tgt: number): { emoji: string; title: string; headline: string; detail: string } | null {
  if (!Number.isFinite(cur) || !Number.isFinite(tgt) || cur <= 0) return null;
  const pct = Math.round((Math.abs(cur - tgt) / cur) * 1000) / 10;
  if (pct === 0) {
    return {
      emoji: '🤝',
      title: 'Staying stable!',
      headline: 'Your target matches your current weight.',
      detail: 'Keeping your weight steady is a perfectly good goal — the habit itself is the win.',
    };
  }
  if (tgt < cur) {
    return pct <= 10
      ? {
          emoji: '👍',
          title: 'Good Choice!',
          headline: `You will lose ${pct.toFixed(1)}% of your body weight`,
          detail: 'Moderate weight loss can also make a big difference:\n- Lower blood pressure\n- Reduce the risk of type 2 diabetes',
        }
      : {
          emoji: '🚀',
          title: 'Ambitious!',
          headline: `You will lose ${pct.toFixed(1)}% of your body weight`,
          detail: 'That is a big change. Slow and steady is safest — aim for 0.5-1 kg per week.',
        };
  }
  return {
    emoji: '📈',
    title: 'Steady progress!',
    headline: `You will gain ${pct.toFixed(1)}% of your body weight`,
    detail: 'If this is a strength goal, pairing it with resistance training works best.',
  };
}

function ChoiceCard({
  label,
  imageKey,
  selected,
  onPress,
}: {
  label: string;
  imageKey: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quizCard,
        { backgroundColor: t.cardAlt, borderColor: selected ? GREEN : 'transparent' },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text style={[styles.quizCardText, { color: t.text }]}>{label}</Text>
      <Image source={QUIZ_IMAGES[imageKey]} style={styles.quizCardImg} resizeMode="cover" />
      {selected ? (
        <View style={styles.quizCheck}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

const DEFAULT_ANSWERS: OnboardingAnswers = {
  goal: 'lose_weight',
  sex: 'female',
  age: 0,
  heightCm: 170,
  currentWeightKg: 70,
  targetWeightKg: 0,
  activity: 'light',
  experience: 'never',
  wakeTime: '07:00',
  sleepTime: '23:00',
  firstMealTime: '08:00',
  lastMealTime: '20:00',
  pregnantOrNursing: false,
};

export default function Onboarding() {
  const t = useTheme();
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);
  const [slide, setSlide] = useState(0);
  const listRef = useRef<FlatList<(typeof WELCOME_SLIDES)[number]>>(null);
  const [a, setA] = useState<OnboardingAnswers>(DEFAULT_ANSWERS);
  const [birthYear, setBirthYear] = useState(CURRENT_YEAR - 30);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [goalText, setGoalText] = useState('70.0');
  const [wake, setWake] = useState('07:00');
  const [sleep, setSleep] = useState('23:00');
  const [firstMeal, setFirstMeal] = useState('08:00');
  const [lastMeal, setLastMeal] = useState('20:00');
  const [chosenPlanId, setChosenPlanId] = useState<string | null>(null);
  const [tipGoal, setTipGoal] = useState<Goal | null>(null);

  const set = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));

  const age = CURRENT_YEAR - birthYear;
  const ageCheck: SafetyCheck = checkAge(age);
  const userBmi = useMemo(
    () => (a.heightCm > 0 && a.currentWeightKg > 0 ? bmi(a.currentWeightKg, a.heightCm) : null),
    [a.heightCm, a.currentWeightKg]
  );
  const lowBmi = userBmi !== null && userBmi < 18.5;
  const recommendation = useMemo(() => recommendPlan(a), [a]);
  const goalFloor = a.heightCm > 0 ? healthyMinWeightKg(a.heightCm) : null;
  const goalKgRaw = Number(goalText.replace(',', '.'));
  const goalCheck: SafetyCheck & { floorKg: number | null } =
    goalText.trim() === '' || !Number.isFinite(goalKgRaw) || a.heightCm === 0
      ? { ok: true, floorKg: goalFloor, supportive: false, message: '' }
      : checkGoalWeight(goalKgRaw, a.heightCm, a.currentWeightKg);

  const canNext = useMemo(() => {
    switch (step) {
      case 3:
        return ageCheck.ok;
      case 4:
        return a.heightCm > 0;
      case 5:
        return a.currentWeightKg > 0;
      case 6:
        return goalCheck.ok;
      case 9:
        return TIME_RE.test(wake) && TIME_RE.test(sleep);
      case 10:
        return TIME_RE.test(firstMeal) && TIME_RE.test(lastMeal);
      default:
        return true;
    }
  }, [step, ageCheck.ok, a.heightCm, a.currentWeightKg, goalCheck.ok, wake, sleep, firstMeal, lastMeal]);

  const planId = chosenPlanId ?? recommendation.planId;
  const phase = step === 0 ? -1 : step <= 1 ? 0 : step <= 6 ? 1 : step <= 10 ? 2 : 3;

  const finish = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const reason = notificationsUnavailableReason();
    if (reason) {
      Alert.alert('Reminders are not available here', reason);
    } else {
      const granted = await ensurePermissions();
      if (!granted) {
        Alert.alert(
          'One more thing',
          'Without notifications the app cannot remind you when your eating window opens or closes. You can enable them later in system settings — the timer itself works regardless.'
        );
      }
    }
    const goalWeight: number | null =
      goalText.trim() !== '' && Number.isFinite(Number(goalText.replace(',', '.')))
        ? Math.round(Number(goalText.replace(',', '.')) * 10) / 10
        : null;
    await completeOnboarding(a, planId, goalWeight, a.heightCm);
  };

  const next = () => {
    if (step === 3 && age < 18) return;
    if (step === 6 && !goalCheck.ok) return;
    setA((prev) => ({
      ...prev,
      age,
      wakeTime: wake,
      sleepTime: sleep,
      firstMealTime: firstMeal,
      lastMealTime: lastMeal,
    }));
    setStep((s) => Math.min(12, s + 1));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bg }]} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        {step > 0 ? (
          <Pressable onPress={() => setStep((s) => Math.max(0, s - 1))} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        {step > 0 ? (
          <View style={styles.headerCenter}>
            <Ionicons name={STEP_META[step].icon} size={17} color={t.text} />
            <Text style={[styles.headerTitle, { color: t.text }]}>{STEP_META[step].title}</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {step > 0 && step < 11 ? (
          <Pressable onPress={() => setStep(11)} hitSlop={10}>
            <Text style={{ color: t.sub, fontSize: 14, fontWeight: '600' }}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>
      <View style={styles.phaseRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={[styles.phaseItem, { backgroundColor: i <= phase ? GREEN : t.ribbonTrack }]} />
        ))}
      </View>

      <View style={styles.body}>
        {step === 0 ? (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={listRef}
              data={WELCOME_SLIDES}
              keyExtractor={(s) => s.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                if (idx !== slide) {
                  setSlide(idx);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              renderItem={({ item }) => (
                <View
                  style={{
                    width: SCREEN_W,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 28,
                    gap: 22,
                  }}
                >
                  <Image
                    source={item.image}
                    style={{
                      width: Math.min(310, SCREEN_W - 48),
                      height: Math.round(Math.min(310, SCREEN_W - 48) * (5 / 7)),
                      borderRadius: 24,
                    }}
                    resizeMode="cover"
                  />
                  <View style={{ gap: 12, alignItems: 'center' }}>
                    <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>{item.title}</Text>
                    <Text style={{ color: t.sub, fontSize: 15, lineHeight: 23, textAlign: 'center' }}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              )}
            />
            <View style={{ alignItems: 'center', gap: 14, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {WELCOME_SLIDES.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
                    hitSlop={6}
                    style={{
                      width: i === slide ? 22 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: i === slide ? t.text : t.ribbonTrack,
                    }}
                  />
                ))}
              </View>
              <AppButton title="Start now" onPress={() => setStep(1)} style={{ alignSelf: 'stretch' }} />
              <Pressable onPress={() => setStep(1)} hitSlop={8}>
                <Text style={{ color: t.sub, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }}>
                  Skip intro
                </Text>
              </Pressable>
              <Text style={{ color: t.sub, fontSize: 11, textAlign: 'center' }}>
                A wellness tool, not a medical device. No account needed — your data stays on this phone.
              </Text>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.quizWrap}>
            <Text style={[styles.quizTitle, { color: t.text }]}>What do you hope to accomplish?</Text>
            <View style={styles.quizList}>
              {GOAL_OPTIONS.map((o) => (
                <View key={o.value} style={{ gap: 10 }}>
                  <ChoiceCard
                    label={o.label}
                    imageKey={o.image}
                    selected={a.goal === o.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      set('goal', o.value as Goal);
                      setTipGoal(o.value as Goal);
                    }}
                  />
                  {tipGoal === o.value ? <GoalTipBanner tip={GOAL_TIPS[o.value as Goal]} /> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>What's your gender?</Text>
            <TipBubble emoji={'\u{1F6BB}'} text="Choose your biological sex to get tips related to your physiology." />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <View style={styles.sexRow}>
                {(['female', 'male'] as Sex[]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      Haptics.selectionAsync();
                      set('sex', s);
                    }}
                    style={[
                      styles.sexCard,
                      {
                        backgroundColor: a.sex === s ? t.mintSoft : t.cardAlt,
                        borderColor: a.sex === s ? GREEN : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 44, color: s === 'female' ? '#E254C7' : '#3E7BFA' }}>
                      {s === 'female' ? '♀' : '♂'}
                    </Text>
                    <Text style={[styles.sexLabel, { color: t.text }]}>{s === 'female' ? 'Female' : 'Male'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                set('sex', 'other');
              }}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.preferNot,
                  { color: GREEN, fontWeight: a.sex === 'other' ? '900' : '700' },
                ]}
              >
                Prefer not to say
              </Text>
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>When is your birthday?</Text>
            <TipBubble emoji={'\u{1F382}'} text="Sharing your age will help us customize your unique fasting plan." />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <YearWheel
                years={BIRTH_YEARS}
                year={birthYear}
                onPick={(y) => {
                  Haptics.selectionAsync();
                  setBirthYear(y);
                }}
              />
            </View>
            {!ageCheck.ok ? (
              <Card style={{ borderColor: t.accent, marginBottom: 12 }}>
                <Text style={{ color: t.text, fontWeight: '800', marginBottom: 6 }}>{UNDERAGE_TITLE}</Text>
                <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>{ageCheck.message}</Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>What's your height?</Text>
            <UnitToggle
              value={heightUnit}
              onChange={(v) => setHeightUnit(v as 'cm' | 'ft')}
              options={[
                { v: 'cm', l: 'cm' },
                { v: 'ft', l: 'ft' },
              ]}
            />
            <View style={styles.bigRow}>
              <Text style={[styles.bigNum, { color: t.text }]}>
                {heightUnit === 'cm' ? `${a.heightCm}` : ftLabel(a.heightCm)}
              </Text>
              {heightUnit === 'cm' ? <Text style={[styles.bigUnit, { color: t.sub }]}>cm</Text> : null}
            </View>
            <RulerPicker
              vertical
              min={heightUnit === 'cm' ? 100 : 40}
              max={heightUnit === 'cm' ? 220 : 90}
              step={1}
              majorEvery={heightUnit === 'cm' ? 10 : 6}
              value={heightUnit === 'cm' ? a.heightCm : Math.round(a.heightCm / 2.54)}
              onChange={(v) => set('heightCm', heightUnit === 'cm' ? Math.round(v) : Math.round(v * 2.54))}
            />
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>What's your current weight?</Text>
            <UnitToggle
              value={weightUnit}
              onChange={(v) => setWeightUnit(v as 'kg' | 'lb')}
              options={[
                { v: 'kg', l: 'kg' },
                { v: 'lb', l: 'lb' },
              ]}
            />
            <View style={styles.bigRow}>
              <Text style={[styles.bigNum, { color: t.text }]}>
                {weightUnit === 'kg' ? a.currentWeightKg.toFixed(1) : (a.currentWeightKg / 0.4536).toFixed(1)}
              </Text>
              <Text style={[styles.bigUnit, { color: t.sub }]}>{weightUnit}</Text>
            </View>
            <RulerPicker
              min={weightUnit === 'kg' ? 30 : 66}
              max={weightUnit === 'kg' ? 200 : 400}
              step={weightUnit === 'kg' ? 0.1 : 0.2}
              majorEvery={weightUnit === 'kg' ? 10 : 25}
              value={weightUnit === 'kg' ? a.currentWeightKg : Math.round((a.currentWeightKg / 0.4536) * 5) / 5}
              onChange={(v) =>
                set('currentWeightKg', weightUnit === 'kg' ? Math.round(v * 10) / 10 : Math.round(v * 0.4536 * 10) / 10)
              }
            />
            {userBmi !== null ? (
              <Card style={{ backgroundColor: t.cardAlt, gap: 6 }}>
                <Text style={{ color: t.sub, fontSize: 13, fontWeight: '700' }}>Current BMI</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <Text style={{ color: GREEN, fontSize: 26, fontWeight: '900' }}>{userBmi.toFixed(1)}</Text>
                  <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{bmiMessage(userBmi)}</Text>
                </View>
              </Card>
            ) : null}
            {a.sex === 'female' ? (
              <ChoiceRow
                title="Pregnant or breastfeeding"
                sub="Checking this keeps you on the gentlest plan"
                selected={a.pregnantOrNursing}
                onPress={() => {
                  const nextVal = !a.pregnantOrNursing;
                  set('pregnantOrNursing', nextVal);
                  if (nextVal) {
                    Alert.alert(PREGNANCY_TITLE, 'Fasting while pregnant or breastfeeding is generally not recommended. Please talk to your doctor or midwife first. If you continue, the app will keep you on a gentle 12:12 schedule.');
                  }
                }}
              />
            ) : null}
            {lowBmi ? (
              <Card style={{ borderColor: t.accent }}>
                <Text style={{ color: t.text, fontWeight: '800', marginBottom: 6 }}>Please read this first</Text>
                <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
                  Your current weight is below the range usually considered healthy for your height. Fasting for weight
                  loss is not recommended right now — please speak with a healthcare professional. You can still use the
                  app on the gentle 12:12 plan for routine, not restriction.
                </Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {step === 6 ? (
          <View style={styles.stepWrap}>
            <Text style={[styles.h1, { color: t.text, textAlign: 'center' }]}>What's your target weight?</Text>
            <UnitToggle
              value={weightUnit}
              onChange={(v) => setWeightUnit(v as 'kg' | 'lb')}
              options={[
                { v: 'kg', l: 'kg' },
                { v: 'lb', l: 'lb' },
              ]}
            />
            <View style={styles.bigRow}>
              <Text style={[styles.bigNum, { color: t.text }]}>
                {weightUnit === 'kg' ? goalKgRaw.toFixed(1) : (goalKgRaw / 0.4536).toFixed(1)}
              </Text>
              <Text style={[styles.bigUnit, { color: t.sub }]}>{weightUnit}</Text>
            </View>
            <RulerPicker
              min={weightUnit === 'kg' ? 30 : 66}
              max={weightUnit === 'kg' ? 200 : 400}
              step={weightUnit === 'kg' ? 0.1 : 0.2}
              majorEvery={weightUnit === 'kg' ? 10 : 25}
              value={weightUnit === 'kg' ? goalKgRaw : Math.round((goalKgRaw / 0.4536) * 5) / 5}
              onChange={(v) => setGoalText((weightUnit === 'kg' ? v : Math.round(v * 0.4536 * 10) / 10).toFixed(1))}
              highlight={[Math.min(a.currentWeightKg, goalKgRaw), Math.max(a.currentWeightKg, goalKgRaw)]}
            />
            {goalFloor !== null ? (
              <Text style={{ color: t.sub, fontSize: 12 }}>
                For your height, {goalFloor} kg is generally considered the lowest healthy weight.
              </Text>
            ) : null}
            {!goalCheck.ok ? (
              <Card style={{ borderColor: t.accent }}>
                <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>{goalCheck.message}</Text>
              </Card>
            ) : null}
            {goalCheck.ok ? (
              (() => {
                const fb = goalFeedback(a.currentWeightKg, goalKgRaw);
                return fb ? (
                  <Card style={{ backgroundColor: t.cardAlt, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{fb.emoji}</Text>
                      <Text style={{ color: GREEN, fontSize: 15, fontWeight: '800' }}>{fb.title}</Text>
                    </View>
                    <Text style={{ color: t.text, fontWeight: '800', fontSize: 15 }}>{fb.headline}</Text>
                    <Text style={{ color: t.sub, fontSize: 13.5, lineHeight: 19 }}>{fb.detail}</Text>
                  </Card>
                ) : null;
              })()
            ) : null}
          </View>
        ) : null}

        {step === 7 ? (
          <View style={styles.quizWrap}>
            <Text style={[styles.quizTitle, { color: t.text }]}>How active is your week?</Text>
            <View style={styles.quizList}>
              {ACTIVITY_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  label={o.label}
                  imageKey={o.image}
                  selected={a.activity === o.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    set('activity', o.value as Activity);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 8 ? (
          <View style={styles.quizWrap}>
            <Text style={[styles.quizTitle, { color: t.text }]}>How much fasting experience do you have?</Text>
            <View style={styles.quizList}>
              {EXPERIENCE_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  label={o.label}
                  imageKey={o.image}
                  selected={a.experience === o.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    set('experience', o.value as Experience);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 9 ? (
          <View style={styles.stepWrap}>
            <Text style={[styles.h1, { color: t.text }]}>Your daily rhythm</Text>
            <TextInputField label="Usual wake time" value={wake} onChangeText={setWake} keyboardType="numeric" suffix="HH:MM (24h)" />
            <TextInputField label="Usual bedtime" value={sleep} onChangeText={setSleep} keyboardType="numeric" suffix="HH:MM (24h)" />
            <Text style={{ color: t.sub, fontSize: 12 }}>
              This keeps water and weigh-in reminders inside your waking hours.
            </Text>
          </View>
        ) : null}

        {step === 10 ? (
          <View style={styles.stepWrap}>
            <Text style={[styles.h1, { color: t.text }]}>Mealtimes</Text>
            <TextInputField label="Typical first meal" value={firstMeal} onChangeText={setFirstMeal} keyboardType="numeric" suffix="HH:MM (24h)" />
            <TextInputField label="Typical last meal" value={lastMeal} onChangeText={setLastMeal} keyboardType="numeric" suffix="HH:MM (24h)" />
            <Text style={{ color: t.sub, fontSize: 12 }}>
              Your fast would begin around your last meal — the plan below accounts for this.
            </Text>
          </View>
        ) : null}

        {step === 11 ? (
          <View style={styles.stepWrap}>
            <Text style={[styles.h1, { color: t.text }]}>Your plan is ready</Text>
            <Card style={{ gap: 8, borderColor: t.primary }}>
              <Text style={{ color: t.sub, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Recommended for you
              </Text>
              <Text style={{ color: t.text, fontSize: 34, fontWeight: '900' }}>{recommendation.planName}</Text>
              <Text style={{ color: t.sub, fontSize: 13 }}>
                {recommendation.fastHours}-hour fast · {recommendation.eatHours}-hour eating window · starts around{' '}
                {lastMeal}
              </Text>
              <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
                We picked this because you mentioned {a.goal === 'lose_weight' ? 'weight loss' : a.goal === 'energy' ? 'steadier energy' : a.goal === 'habit' ? 'building a routine' : 'maintaining your weight'}
                {a.experience === 'never' ? ', and you are new to fasting — gentle and sustainable wins.'
                  : a.experience === 'tried' ? ', with some fasting experience.'
                  : ', and you fast regularly.'}
                {recommendation.restricted ? ' We have kept this deliberately gentle for your situation.' : ''}
              </Text>
              <Text style={{ color: t.sub, fontSize: 12 }}>
                You can switch plans or build a custom one at any time — for free.
              </Text>
            </Card>
            <AppButton title="Start this plan" onPress={() => setChosenPlanId(recommendation.planId)} variant={chosenPlanId === recommendation.planId ? 'primary' : 'outline'} />
            {chosenPlanId !== null && chosenPlanId !== recommendation.planId ? (
              <Text style={{ color: t.primary, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                Custom choice selected — continue below
              </Text>
            ) : null}
          </View>
        ) : null}

        {step === 12 ? (
          <View style={styles.stepWrap}>
            <Text style={[styles.h1, { color: t.text }]}>One last thing</Text>
            {notificationsUnavailableReason() ? (
              <>
                <Text style={[styles.p, { color: t.sub }]}>
                  Reminders are not available in this environment — the rest of the app works fully. You can finish
                  setup now and everything will be waiting for you.
                </Text>
                <AppButton title="Finish" onPress={finish} />
              </>
            ) : (
              <>
                <Text style={[styles.p, { color: t.sub }]}>
                  The whole point of this app is that you do not have to remember anything. To remind you when your
                  eating window closes and opens, we need notification permission.
                </Text>
                <Card style={{ gap: 6 }}>
                  <Text style={{ color: t.text, fontWeight: '800' }}>What we will send</Text>
                  <Text style={{ color: t.sub, fontSize: 13, lineHeight: 19 }}>
                    • A nudge when your eating window closes{'\n'}• A heads-up before your fast ends{'\n'}• Optional
                    water and weigh-in reminders{'\n'}{'\n'}No marketing. Every category can be turned off in Settings.
                  </Text>
                </Card>
                <AppButton title="Enable reminders & finish" onPress={finish} />
                <AppButton title="Skip for now" variant="ghost" onPress={finish} />
              </>
            )}
          </View>
        ) : null}
      </View>

      {step > 0 && step < 12 ? (
        <Pressable
          onPress={next}
          disabled={!canNext}
          style={({ pressed }) => [
            styles.nextBtn,
            !canNext && { backgroundColor: '#AAB4C0' },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.nextBtnText}>{step === 11 ? 'Continue' : 'Next'}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  phaseRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  phaseItem: { flex: 1, height: 7, borderRadius: 4 },
  quizWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, gap: 10 },
  quizTitle: { fontSize: 27, fontWeight: '900', lineHeight: 34 },
  quizList: { flex: 1, justifyContent: 'space-evenly' },
  quizCard: {
    height: 92,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    paddingLeft: 20,
  },
  quizCardImg: { width: 118, height: '100%' },
  quizCardText: { flex: 1, fontSize: 18, fontWeight: '700', paddingRight: 10 },
  quizCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtn: {
    backgroundColor: GREEN,
    borderRadius: 28,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
  },
  nextBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tipEmoji: { fontSize: 34 },
  tipTextWrap: { flex: 1, gap: 3 },
  tipTitle: { fontSize: 16, fontWeight: '800' },
  tipBody: { fontSize: 13.5, lineHeight: 19 },
  body: { flex: 1 },
  stepWrap: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 28, fontWeight: '900', lineHeight: 34 },
  p: { fontSize: 15, lineHeight: 22 },
  stepScroll: { flex: 1 },
  stepScrollContent: { padding: 16, gap: 14, paddingBottom: 24 },
  centerWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, gap: 14 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignSelf: 'stretch',
    zIndex: 1,
  },
  bubblePointer: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    marginBottom: -9,
  },
  bubbleEmoji: { fontSize: 26 },
  bubbleText: { flex: 1, fontSize: 14.5, lineHeight: 20 },
  sexRow: { flexDirection: 'row', gap: 14 },
  sexCard: {
    flex: 1,
    height: 150,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  sexLabel: { fontSize: 18, fontWeight: '800' },
  preferNot: { alignSelf: 'center', fontSize: 15, marginTop: 2 },
  wheelCenter: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
  },
  unitToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: GREEN,
    overflow: 'hidden',
  },
  unitOpt: { paddingVertical: 9, paddingHorizontal: 26 },
  unitOptOn: { backgroundColor: GREEN },
  unitTxt: { color: GREEN, fontWeight: '800', fontSize: 15 },
  unitTxtOn: { color: '#FFFFFF' },
  bigRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  bigNum: { fontSize: 54, fontWeight: '900', lineHeight: 60 },
  bigUnit: { fontSize: 20, fontWeight: '700', paddingBottom: 10 },
});
