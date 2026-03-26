import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { getJoke, getWeightedScore } from "@/data/jokes";

const COOLDOWN_SECS = 60;
const CD_STORAGE_KEY = "dice_last_roll";
const UNLIMITED_KEY = "dice_unlimited";
const HISTORY_KEY = "dice_history";

const SCORE_COLORS: Record<number, string> = {
  1: "#FF453A", 2: "#FF6B35", 3: "#FF9F0A", 4: "#FFD60A",
  5: "#30D158", 6: "#34C759", 7: "#30D158",
  8: "#4F8EF7", 9: "#5E5CE6", 10: "#BF5AF2",
};
const SCORE_LABELS: Record<number, string> = {
  1: "Ужас", 2: "Плохо", 3: "Слабо", 4: "Ниже среднего",
  5: "Нормально", 6: "Хорошо", 7: "Хорошо+",
  8: "Отлично", 9: "Почти идеально", 10: "Легенда!",
};

export default function DiceScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [score, setScore] = useState<number | null>(null);
  const [joke, setJoke] = useState("");
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [cdLeft, setCdLeft] = useState(0);
  const [unlimited, setUnlimited] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secretText, setSecretText] = useState("");
  const [hitCd, setHitCd] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cdBarAnim = useRef(new Animated.Value(0)).current;

  // Load persisted state
  useEffect(() => {
    (async () => {
      const unlim = await AsyncStorage.getItem(UNLIMITED_KEY);
      if (unlim === "true") setUnlimited(true);

      const lastRoll = await AsyncStorage.getItem(CD_STORAGE_KEY);
      if (lastRoll) {
        const elapsed = (Date.now() - Number(lastRoll)) / 1000;
        const left = Math.max(0, Math.ceil(COOLDOWN_SECS - elapsed));
        setCdLeft(left);
      }

      const hist = await AsyncStorage.getItem(HISTORY_KEY);
      if (hist) setHistory(JSON.parse(hist));
    })();
  }, []);

  // Cooldown ticker
  useEffect(() => {
    if (cdLeft <= 0) return;
    const interval = setInterval(() => {
      setCdLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cdLeft]);

  const roll = useCallback(async () => {
    if (rolling) return;
    if (!unlimited && cdLeft > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setHitCd(true);
      setShowSecret(true);
      return;
    }
    setHitCd(false);
    setShowSecret(false);
    setSecretText("");
    setRolling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    fadeAnim.setValue(0);
    spinAnim.setValue(0);
    scaleAnim.setValue(1);

    Animated.parallel([
      Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
    ]).start(async () => {
      const newScore = getWeightedScore();
      const newJoke = getJoke(newScore);
      setScore(newScore);
      setJoke(newJoke);

      const newHistory = [newScore, ...history.slice(0, 9)];
      setHistory(newHistory);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

      if (!unlimited) {
        const now = Date.now();
        await AsyncStorage.setItem(CD_STORAGE_KEY, String(now));
        setCdLeft(COOLDOWN_SECS);
      }

      setRolling(false);
      Haptics.notificationAsync(
        newScore >= 8 ? Haptics.NotificationFeedbackType.Success
          : newScore >= 5 ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Error
      );
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  }, [rolling, unlimited, cdLeft, history, spinAnim, scaleAnim, fadeAnim]);

  const handleSecret = useCallback(async (text: string) => {
    if (text.trim().toLowerCase() === "ggcd" && hitCd) {
      setUnlimited(true);
      await AsyncStorage.setItem(UNLIMITED_KEY, "true");
      setCdLeft(0);
      setShowSecret(false);
      setSecretText("");
      setHitCd(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJoke("Кулдаун снят навсегда! Жми сколько угодно!");
      setScore(null);
    }
  }, [hitCd]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] });
  const scoreColor = score ? SCORE_COLORS[score] ?? Colors.accent : Colors.accent;
  const avg = history.length > 0 ? (history.reduce((a, b) => a + b, 0) / history.length).toFixed(1) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>Рандом оценки</Text>
        <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>Узнай свою удачу</Text>
      </View>

      <View style={styles.mainArea}>
        {/* Cooldown banner */}
        {cdLeft > 0 && !unlimited && (
          <View style={[styles.cdBanner, { backgroundColor: Colors.warning + "15", borderColor: Colors.warning + "40" }]}>
            <Ionicons name="time-outline" size={16} color={Colors.warning} />
            <Text style={[styles.cdText, { color: Colors.warning, fontFamily: "Inter_500Medium" }]}>
              Кулдаун: {cdLeft} сек
            </Text>
          </View>
        )}
        {unlimited && (
          <View style={[styles.cdBanner, { backgroundColor: Colors.success + "15", borderColor: Colors.success + "40" }]}>
            <Ionicons name="infinite-outline" size={16} color={Colors.success} />
            <Text style={[styles.cdText, { color: Colors.success, fontFamily: "Inter_500Medium" }]}>
              Кулдаун снят навсегда
            </Text>
          </View>
        )}

        {/* Dice button */}
        <Pressable
          onPress={roll}
          style={({ pressed }) => [
            styles.diceContainer,
            {
              backgroundColor: (cdLeft > 0 && !unlimited) ? theme.card : scoreColor + "15",
              borderColor: (cdLeft > 0 && !unlimited) ? theme.border : scoreColor + "40",
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ rotate: spin }, { scale: scaleAnim }] }}>
            <Ionicons
              name={rolling ? "dice-outline" : score ? "dice" : "dice-outline"}
              size={80}
              color={(cdLeft > 0 && !unlimited) ? theme.textSecondary : scoreColor}
            />
          </Animated.View>

          {score !== null && !rolling ? (
            <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
              <Text style={[styles.scoreNumber, { color: scoreColor, fontFamily: "Inter_700Bold" }]}>{score}</Text>
              <Text style={[styles.scoreLabel, { color: scoreColor, fontFamily: "Inter_500Medium" }]}>{SCORE_LABELS[score]}</Text>
            </Animated.View>
          ) : !rolling ? (
            <Text style={[styles.tapHint, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {cdLeft > 0 && !unlimited ? `Подожди ${cdLeft} сек` : "Нажми, чтобы бросить"}
            </Text>
          ) : (
            <Text style={[styles.tapHint, { color: scoreColor, fontFamily: "Inter_500Medium" }]}>Бросаем...</Text>
          )}
        </Pressable>

        {/* Joke */}
        {joke !== "" && !rolling && (
          <Animated.View style={[styles.jokeCard, { backgroundColor: theme.card, borderColor: theme.border, opacity: score ? fadeAnim : new Animated.Value(1) }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.accent} />
            <Text style={[styles.jokeText, { color: theme.text, fontFamily: "Inter_400Regular" }]}>{joke}</Text>
          </Animated.View>
        )}

        {/* Secret input (appears after hitting cooldown) */}
        {showSecret && (
          <TextInput
            style={[styles.secretInput, { color: theme.textSecondary, borderColor: theme.border, fontFamily: "Inter_400Regular" }]}
            value={secretText}
            onChangeText={setSecretText}
            onSubmitEditing={() => handleSecret(secretText)}
            placeholder="..."
            placeholderTextColor={theme.border}
            autoCapitalize="none"
          />
        )}

        {/* Stats */}
        {history.length > 0 && (
          <View style={styles.statsRow}>
            {[
              { label: "Среднее", value: avg ?? "-" },
              { label: "Бросков", value: String(history.length) },
              { label: "Максимум", value: String(Math.max(...history)) },
            ].map((s, i) => (
              <View key={i} style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.statValue, { color: theme.text, fontFamily: "Inter_700Bold" }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* History bubbles */}
        {history.length > 0 && (
          <View style={styles.historyRow}>
            {history.map((s, i) => (
              <View key={i} style={[styles.historyBubble, { backgroundColor: SCORE_COLORS[s] + "25", borderColor: SCORE_COLORS[s] + "50" }]}>
                <Text style={[styles.historyScore, { color: SCORE_COLORS[s], fontFamily: "Inter_600SemiBold" }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 84 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28 },
  headerSub: { fontSize: 14, marginTop: 2 },
  mainArea: { flex: 1, alignItems: "center", paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  cdBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, alignSelf: "stretch" },
  cdText: { fontSize: 14 },
  diceContainer: { width: "100%", borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingVertical: 32, gap: 10 },
  scoreNumber: { fontSize: 60, lineHeight: 68 },
  scoreLabel: { fontSize: 18 },
  tapHint: { fontSize: 15 },
  jokeCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  jokeText: { flex: 1, fontSize: 14, lineHeight: 22 },
  secretInput: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, opacity: 0.3 },
  statsRow: { flexDirection: "row", gap: 10, width: "100%" },
  statBox: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center", gap: 2 },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11 },
  historyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  historyBubble: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  historyScore: { fontSize: 14 },
});
