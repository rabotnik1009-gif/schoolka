import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import {
  DAY_NAMES,
  Lesson,
  SCHEDULE,
  fmt,
  formatCountdown,
  getCurrentStatus,
  getMoscowNow,
  getMoscowDayIndex,
  lessonEndTime,
  lessonStartTime,
  lessonStartSecs,
} from "@/data/schedule";

/** Returns the day to auto-select: today if school in session, else next school day */
function getAutoSelectDay(): number {
  const now = getMoscowNow();
  const today = getMoscowDayIndex(); // Mon=0...Sun=6
  const status = getCurrentStatus(now);

  // If it's a school day and school hasn't ended yet → stay on today
  if (today <= 4 && status.type !== "after_school" && status.type !== "weekend") {
    return today;
  }

  // Otherwise jump to next Mon-Fri
  let next = (today + 1) % 7;
  while (next > 4) next = (next + 1) % 7;
  return next;
}

function LessonCard({
  lesson,
  index,
  isActive,
  isDone,
  isDark,
}: {
  lesson: Lesson;
  index: number;
  isActive: boolean;
  isDone: boolean;
  isDark: boolean;
}) {
  const theme = isDark ? Colors.dark : Colors.light;
  const start = lessonStartTime(index);
  const end = lessonEndTime(index);

  return (
    <View
      style={[
        styles.lessonCard,
        {
          backgroundColor: isActive
            ? lesson.color + "1A"
            : isDone
            ? theme.card + "80"
            : theme.card,
          borderColor: isActive ? lesson.color : theme.border,
          borderWidth: isActive ? 1.5 : 1,
          opacity: isDone ? 0.55 : 1,
        },
      ]}
    >
      <View style={[styles.lessonAccent, { backgroundColor: isDone ? theme.border : lesson.color }]} />
      <View style={[styles.lessonIconBox, { backgroundColor: lesson.color + (isDone ? "10" : "20") }]}>
        {isDone ? (
          <Ionicons name="checkmark-outline" size={20} color={theme.textSecondary} />
        ) : (
          <Ionicons name={lesson.icon as any} size={20} color={lesson.color} />
        )}
      </View>
      <View style={styles.lessonInfo}>
        <Text
          style={[
            styles.lessonSubject,
            {
              color: isDone ? theme.textSecondary : theme.text,
              fontFamily: "Inter_600SemiBold",
              textDecorationLine: isDone ? "line-through" : "none",
            },
          ]}
          numberOfLines={1}
        >
          {lesson.subject}
        </Text>
        <View style={styles.lessonMeta}>
          <Feather name="map-pin" size={11} color={theme.textSecondary} />
          <Text style={[styles.lessonMetaText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Каб. {lesson.room}
          </Text>
          <Feather name="clock" size={11} color={theme.textSecondary} style={{ marginLeft: 8 }} />
          <Text style={[styles.lessonMetaText, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {fmt(start)}–{fmt(end)}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.lessonNum,
          {
            color: isActive ? lesson.color : theme.textSecondary,
            fontFamily: "Inter_700Bold",
          },
        ]}
      >
        {index + 1}
      </Text>
    </View>
  );
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { logout } = useAuth();

  const [now, setNow] = useState(getMoscowNow());
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(getAutoSelectDay);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1-second live timer
  useEffect(() => {
    const timer = setInterval(() => setNow(getMoscowNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulse animation for status card
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.015, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const todayDay = getMoscowDayIndex();
  const status = getCurrentStatus(now);
  const lessons = SCHEDULE[selectedDay] ?? [];

  // Auto-jump to next school day once school ends
  useEffect(() => {
    if (selectedDay === todayDay && (status.type === "after_school" || status.type === "weekend")) {
      const next = getAutoSelectDay();
      if (next !== todayDay) {
        setSelectedDay(next);
      }
    }
  }, [status.type]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNow(getMoscowNow());
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  // Compute how many lessons are done today
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  function isLessonDone(idx: number): boolean {
    if (selectedDay !== todayDay) return false;
    const endSecs = lessonStartSecs(idx) + 45 * 60;
    return nowSecs > endSecs;
  }

  // Timer badge (1-sec countdown)
  const renderTimerBadge = () => {
    if (selectedDay !== todayDay) return null;

    if (status.type === "before_school") {
      const startSecs = lessonStartSecs(0);
      const secsLeft = Math.max(0, startSecs - nowSecs);
      return (
        <View style={[styles.timerBadge, { backgroundColor: Colors.accent + "18", borderColor: Colors.accent + "50" }]}>
          <Ionicons name="alarm-outline" size={15} color={Colors.accent} />
          <Text style={[styles.timerText, { color: Colors.accent, fontFamily: "Inter_600SemiBold" }]}>
            До начала уроков: {formatCountdown(secsLeft)}
          </Text>
        </View>
      );
    }

    if (status.type === "lesson") {
      return (
        <View style={[styles.timerBadge, { backgroundColor: Colors.danger + "18", borderColor: Colors.danger + "50" }]}>
          <Ionicons name="alarm-outline" size={15} color={Colors.danger} />
          <Text style={[styles.timerText, { color: Colors.danger, fontFamily: "Inter_600SemiBold" }]}>
            До конца урока: {formatCountdown(status.secondsLeft)}
          </Text>
        </View>
      );
    }

    if (status.type === "break") {
      return (
        <View style={[styles.timerBadge, { backgroundColor: Colors.success + "18", borderColor: Colors.success + "50" }]}>
          <Ionicons name="cafe-outline" size={15} color={Colors.success} />
          <Text style={[styles.timerText, { color: Colors.success, fontFamily: "Inter_600SemiBold" }]}>
            До начала урока: {formatCountdown(status.secondsLeft)}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Status card
  const renderStatusCard = () => {
    const isToday = selectedDay === todayDay;
    if (!isToday) return null;

    let icon: string;
    let color: string;
    let title: string;
    let subtitle: string;

    if (status.type === "weekend") {
      icon = "sunny-outline"; color = Colors.warning;
      title = "Выходной"; subtitle = "Отдыхай и наслаждайся";
    } else if (status.type === "before_school") {
      icon = "alarm-outline"; color = Colors.accent;
      title = "До начала уроков";
      subtitle = "Первый урок в 08:00";
    } else if (status.type === "after_school") {
      icon = "home-outline"; color = Colors.success;
      title = "Уроки закончились";
      subtitle = "Завтра покажу следующий день";
    } else if (status.type === "lesson") {
      icon = status.lesson.icon; color = status.lesson.color;
      title = `Урок ${status.index + 1}: ${status.lesson.subject}`;
      subtitle = `Каб. ${status.lesson.room} · до ${status.endsAt}`;
    } else {
      icon = "cafe-outline"; color = Colors.success;
      title = "Перемена";
      subtitle = `Следующий: ${status.nextLesson.subject} в ${status.startsAt}`;
    }

    return (
      <Animated.View
        style={[
          styles.statusCard,
          {
            backgroundColor: color + "15",
            borderColor: color + "40",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={[styles.statusIconBox, { backgroundColor: color + "22" }]}>
          <Ionicons name={icon as any} size={26} color={color} />
        </View>
        <View style={styles.statusText}>
          <Text style={[styles.statusTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
            {title}
          </Text>
          <Text style={[styles.statusSubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {subtitle}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const moscowTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isNextDay = selectedDay !== todayDay;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Расписание
          </Text>
          <Text style={[styles.headerDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {DAY_NAMES[todayDay]} · Мск {moscowTimeStr}
          </Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); logout(); }}
          style={[styles.logoutBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Feather name="log-out" size={18} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Live timer banner (only for today) */}
      {renderTimerBadge()}

      {/* "Завтра" badge */}
      {isNextDay && (
        <View style={[styles.tomorrowBadge, { backgroundColor: Colors.warning + "18", borderColor: Colors.warning + "40" }]}>
          <Ionicons name="arrow-forward-circle-outline" size={15} color={Colors.warning} />
          <Text style={[styles.timerText, { color: Colors.warning, fontFamily: "Inter_600SemiBold" }]}>
            {selectedDay === (todayDay + 1) % 7 ? "Завтра" : DAY_NAMES[selectedDay]}
          </Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayPicker}
        contentContainerStyle={styles.dayPickerContent}
      >
        {[0, 1, 2, 3, 4].map((d) => {
          const isSelected = selectedDay === d;
          const isToday = todayDay === d;
          return (
            <Pressable
              key={d}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(d); }}
              style={[
                styles.dayChip,
                {
                  backgroundColor: isSelected ? Colors.accent : theme.card,
                  borderColor: isSelected ? Colors.accent : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayChipText,
                  {
                    color: isSelected ? "#fff" : theme.text,
                    fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {DAY_NAMES[d].slice(0, 2)}
              </Text>
              {isToday && (
                <View style={[styles.todayDot, { backgroundColor: isSelected ? "#fff" : Colors.accent }]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
      >
        {renderStatusCard()}

        {lessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sunny-outline" size={48} color={Colors.warning} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
              Выходной день
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Уроков нет, время отдохнуть
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {lessons.length} уроков
            </Text>
            {lessons.map((lesson, i) => {
              const isActive =
                selectedDay === todayDay && status.type === "lesson" && status.index === i;
              const isDone = isLessonDone(i);
              return (
                <LessonCard
                  key={`${i}-${lesson.subject}`}
                  lesson={lesson}
                  index={i}
                  isActive={isActive}
                  isDone={isDone}
                  isDark={isDark}
                />
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 28 },
  headerDate: { fontSize: 13, marginTop: 2 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  tomorrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  timerText: { fontSize: 14 },
  dayPicker: { maxHeight: 58 },
  dayPickerContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
    paddingVertical: 6,
  },
  dayChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 56,
  },
  dayChipText: { fontSize: 14 },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 4,
  },
  statusIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 16 },
  statusSubtitle: { fontSize: 13, marginTop: 2 },
  sectionLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  lessonCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    overflow: "hidden",
  },
  lessonAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 2,
  },
  lessonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  lessonInfo: { flex: 1 },
  lessonSubject: { fontSize: 15 },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  lessonMetaText: { fontSize: 12 },
  lessonNum: { fontSize: 20, minWidth: 28, textAlign: "right" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 20, marginTop: 8 },
  emptySubtitle: { fontSize: 14 },
});
