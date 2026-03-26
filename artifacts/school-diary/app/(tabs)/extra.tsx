import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import {
  SCHEDULE,
  getCurrentStatus,
  getMoscowNow,
  fmt,
  lessonStartTime,
} from "@/data/schedule";
import {
  getVacationStatuses,
  getNextVacation,
  formatVacationDate,
} from "@/data/vacations";

const CAFETERIA_LESSON_IDX = 3;

// ── Menu data ───────────────────────────────────────────
const FOOD_ITEMS = [
  "Салатик-бурмалдатик",
  "Чечевичный суп",
  "Любимая гречка",
  "Вонючие котлеты",
  "Оливьешечка-чебурешечка",
  "Пересоленые макароны",
];
const FOOD_FRIDAY = "Блинчики со спущёнкой";

const DRINK_ITEMS = [
  "Чай",
  "Похлёбка",
  "Компотик бурмалдотик",
  "Слёзы классухи",
  "Пюре Бамболина",
  "Самодельный яблочный сок",
];

const DESSERT_ITEMS = [
  "Скисший сырок",
  "Жирные мармеладки",
  "Вонючие зефирки",
  "Любимая Бамболина",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface MenuSnapshot { food: string; drink: string; dessert: string }

function genMenu(isFriday: boolean): MenuSnapshot {
  return {
    food: isFriday ? FOOD_FRIDAY : pickRandom(FOOD_ITEMS),
    drink: pickRandom(DRINK_ITEMS),
    dessert: pickRandom(DESSERT_ITEMS),
  };
}

// ── Helpers ─────────────────────────────────────────────
function SectionHeader({ title, icon, color }: { title: string; icon: string; color: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{title}</Text>
    </View>
  );
}

function InfoCard({ children, accent }: { children: React.ReactNode; accent?: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.infoCard, {
      backgroundColor: theme.card,
      borderColor: accent ? accent + "40" : theme.border,
      borderWidth: accent ? 1.5 : 1,
    }]}>
      {children}
    </View>
  );
}

function pluralDays(n: number): string {
  const abs = Math.abs(n);
  if (abs % 10 === 1 && abs % 100 !== 11) return "день";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "дня";
  return "дней";
}

// ── Cafeteria section ────────────────────────────────────
function CafeteriaSection({ menu }: { menu: MenuSnapshot }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const now = getMoscowNow();

  const jsDay = now.getDay();
  const day = jsDay === 0 ? 6 : jsDay - 1;
  const lessons = SCHEDULE[day] ?? [];
  const status = getCurrentStatus(now);

  let icon = "restaurant-outline";
  let color = Colors.warning;
  let title = "";
  let subtitle = "";
  let detail = "";

  if (lessons.length === 0) {
    icon = "sunny-outline"; color = Colors.warning;
    title = "Сегодня нет уроков";
    subtitle = "Столовая не работает";
  } else if (status.type === "after_school") {
    icon = "moon-outline"; color = Colors.dark.textSecondary;
    title = "Уроки закончились";
    subtitle = "Столовая, скорее всего, закрыта";
  } else if (status.type === "before_school") {
    const cafeStart = lessonStartTime(CAFETERIA_LESSON_IDX);
    icon = "time-outline"; color = Colors.accent;
    title = "Питание в столовой в " + fmt(cafeStart);
    subtitle = `Обед после ${CAFETERIA_LESSON_IDX + 1}-го урока`;
    detail = "Первый урок в 08:00";
  } else if (status.type === "lesson" && status.index < CAFETERIA_LESSON_IDX) {
    const cafeStart = lessonStartTime(CAFETERIA_LESSON_IDX);
    const cafeStartSecs = cafeStart.h * 3600 + cafeStart.m * 60;
    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const minsLeft = Math.ceil((cafeStartSecs - nowSecs) / 60);
    icon = "timer-outline"; color = Colors.accent;
    title = `До столовой ~${minsLeft} мин`;
    subtitle = `Питание в столовой в ${fmt(cafeStart)}`;
    detail = `Сейчас ${status.index + 1}-й урок`;
  } else if (status.type === "lesson" && status.index === CAFETERIA_LESSON_IDX) {
    icon = "restaurant-outline"; color = Colors.success;
    title = "Самое время обедать!";
    subtitle = "Иди в столовую!";
  } else if (status.type === "break" && status.nextIndex === CAFETERIA_LESSON_IDX) {
    icon = "restaurant-outline"; color = Colors.success;
    title = "Перемена — иди обедать!";
    subtitle = "Столовая открыта до следующего урока";
  } else {
    icon = "checkmark-circle-outline"; color = Colors.dark.textSecondary;
    title = "Обед уже прошёл";
    subtitle = `После ${CAFETERIA_LESSON_IDX + 1}-го урока`;
  }

  return (
    <>
      <SectionHeader title="Столовая" icon="restaurant-outline" color={Colors.warning} />
      <InfoCard accent={color}>
        <View style={styles.cafRow}>
          <View style={[styles.cafIcon, { backgroundColor: color + "20" }]}>
            <Ionicons name={icon as any} size={28} color={color} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.cafTitle, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
            <Text style={[styles.cafSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
            {detail !== "" && (
              <Text style={[styles.cafDetail, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{detail}</Text>
            )}
          </View>
        </View>

        <View style={[styles.cafMenuDivider, { borderTopColor: theme.border }]} />
        <Text style={[styles.cafMenuTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
          Меню сегодня
        </Text>

        {/* Еда */}
        <View style={styles.cafMenuRow}>
          <View style={[styles.cafMenuDot, { backgroundColor: Colors.success }]} />
          <Text style={[styles.cafMenuLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Еда:</Text>
          <Text style={[styles.cafMenuValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{menu.food}</Text>
        </View>

        {/* Напитки */}
        <View style={styles.cafMenuRow}>
          <View style={[styles.cafMenuDot, { backgroundColor: Colors.accent }]} />
          <Text style={[styles.cafMenuLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Напиток:</Text>
          <View style={styles.drinkRow}>
            <Text style={[styles.cafMenuValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{menu.drink}</Text>
            {menu.drink === "Чай" && (
              <Text style={[styles.konText, { color: theme.textSecondary }]}>кон</Text>
            )}
          </View>
        </View>

        {/* Десерт */}
        <View style={styles.cafMenuRow}>
          <View style={[styles.cafMenuDot, { backgroundColor: Colors.warning }]} />
          <Text style={[styles.cafMenuLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Десерт:</Text>
          <Text style={[styles.cafMenuValue, { color: theme.text, fontFamily: "Inter_500Medium" }]}>{menu.dessert}</Text>
        </View>

        <Text style={[styles.menuHint, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Потяни вниз чтобы обновить меню
        </Text>
      </InfoCard>
    </>
  );
}

// ── Vacations section ────────────────────────────────────
function VacationsSection() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const now = getMoscowNow();
  const statuses = getVacationStatuses(now);
  const next = getNextVacation(now);

  return (
    <>
      <SectionHeader title="Каникулы 2025–2026" icon="calendar-outline" color={Colors.accent} />

      {next && (
        <InfoCard accent={Colors.accent}>
          <View style={styles.nextVacRow}>
            <View style={[styles.nextVacIcon, { backgroundColor: Colors.accent + "20" }]}>
              <Ionicons name="airplane-outline" size={26} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextVacLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                До {next.vacation.name.toLowerCase()} каникул
              </Text>
              <Text style={[styles.nextVacDays, { color: Colors.accent, fontFamily: "Inter_700Bold" }]}>
                {next.daysUntil} {pluralDays(next.daysUntil)}
              </Text>
              <Text style={[styles.nextVacDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {formatVacationDate(next.vacation.startDate)} — {formatVacationDate(next.vacation.endDate)}
              </Text>
            </View>
          </View>
        </InfoCard>
      )}

      <InfoCard>
        {statuses.map((s, i) => {
          const color = s.isCurrent ? Colors.success : s.isPast ? theme.textSecondary : Colors.accent;
          const statusIcon = s.isCurrent ? "checkmark-circle" : s.isPast ? "checkmark-done-outline" : "time-outline";
          return (
            <View
              key={i}
              style={[
                styles.vacRow,
                i < statuses.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <Ionicons name={statusIcon as any} size={18} color={color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.vacName, { color: theme.text, fontFamily: "Inter_600SemiBold" }]}>
                  {s.vacation.name}
                </Text>
                <Text style={[styles.vacDate, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {formatVacationDate(s.vacation.startDate)} — {formatVacationDate(s.vacation.endDate)} · {s.vacation.days} дн.
                </Text>
                {s.isCurrent && (
                  <Text style={[styles.vacStatus, { color: Colors.success, fontFamily: "Inter_500Medium" }]}>Сейчас каникулы!</Text>
                )}
                {!s.isCurrent && !s.isPast && (
                  <Text style={[styles.vacStatus, { color: Colors.accent, fontFamily: "Inter_400Regular" }]}>
                    Через {s.daysUntil} {pluralDays(s.daysUntil)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </InfoCard>
    </>
  );
}

// ── Main screen ──────────────────────────────────────────
export default function ExtraScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const now = getMoscowNow();
  const jsDay = now.getDay();
  const isFriday = jsDay === 5;

  const [menu, setMenu] = useState<MenuSnapshot>(() => genMenu(isFriday));
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setMenu(genMenu(isFriday));
    setTimeout(() => setRefreshing(false), 600);
  }, [isFriday]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Дополнительно</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <CafeteriaSection menu={menu} />
        <View style={styles.divider} />
        <VacationsSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  sectionIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 18 },
  infoCard: { borderRadius: 16, padding: 16, overflow: "hidden" },
  cafRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  cafIcon: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cafTitle: { fontSize: 16 },
  cafSub: { fontSize: 13 },
  cafDetail: { fontSize: 12 },
  cafMenuDivider: { borderTopWidth: 1, marginVertical: 12 },
  cafMenuTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  cafMenuRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  cafMenuDot: { width: 8, height: 8, borderRadius: 4 },
  cafMenuLabel: { fontSize: 13, width: 70 },
  cafMenuValue: { fontSize: 14, flex: 1 },
  drinkRow: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  konText: { fontSize: 9, opacity: 0.35, fontFamily: "Inter_400Regular" },
  menuHint: { fontSize: 11, textAlign: "center", marginTop: 8, opacity: 0.6 },
  divider: { height: 8 },
  nextVacRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  nextVacIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nextVacLabel: { fontSize: 13 },
  nextVacDays: { fontSize: 28, lineHeight: 34 },
  nextVacDate: { fontSize: 13 },
  vacRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12 },
  vacName: { fontSize: 15 },
  vacDate: { fontSize: 13, marginTop: 2 },
  vacStatus: { fontSize: 13, marginTop: 3 },
});
