import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

interface InfoRowProps { icon: string; label: string; value: string; color?: string; onPress?: () => void }
function InfoRow({ icon, label, value, color, onPress }: InfoRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const c = color ?? theme.text;

  const inner = (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Ionicons name={icon as any} size={18} color={c} style={styles.infoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: onPress ? Colors.accent : theme.text, fontFamily: "Inter_500Medium" }]}>{value}</Text>
      </View>
      {onPress && <Feather name="external-link" size={14} color={Colors.accent} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 16, backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Inter_700Bold" }]}>About</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={[styles.avatarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.avatarCircle, { backgroundColor: Colors.accent + "20" }]}>
            <Ionicons name="person-outline" size={40} color={Colors.accent} />
          </View>
          <Text style={[styles.avatarName, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
            Кирюша
          </Text>
          <Text style={[styles.avatarSub, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Developer · Student
          </Text>
          <View style={styles.avatarBadges}>
            <View style={[styles.badge, { backgroundColor: Colors.accent + "18" }]}>
              <Text style={[styles.badgeText, { color: Colors.accent, fontFamily: "Inter_500Medium" }]}>React Native</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.success + "18" }]}>
              <Text style={[styles.badgeText, { color: Colors.success, fontFamily: "Inter_500Medium" }]}>Python</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: Colors.warning + "18" }]}>
              <Text style={[styles.badgeText, { color: Colors.warning, fontFamily: "Inter_500Medium" }]}>Dota 2</Text>
            </View>
          </View>
        </View>

        {/* Personal info */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            ЛИЧНОЕ
          </Text>
          <InfoRow icon="person-outline" label="Имя" value="Кирилл" />
          <InfoRow icon="calendar-outline" label="Возраст" value="16 лет" />
          <InfoRow icon="location-outline" label="Город" value="Гродно, Беларусь" color={Colors.accent} />
          <InfoRow icon="game-controller-outline" label="Хобби" value="Dota 2 Player" color={Colors.warning} />
        </View>

        {/* Stack */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            СТЕК
          </Text>
          <InfoRow icon="logo-python" label="Язык" value="Python 3.11+" color="#3776AB" />
          <InfoRow icon="phone-portrait-outline" label="Мобильный" value="React Native / Expo" color={Colors.accent} />
          <InfoRow icon="chatbubble-ellipses-outline" label="Telegram бот" value="python-telegram-bot" color={Colors.success} />
        </View>

        {/* Socials */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            КОНТАКТЫ
          </Text>
          <InfoRow
            icon="paper-plane-outline"
            label="Telegram"
            value="@kiritomr"
            color={Colors.accent}
            onPress={() => Linking.openURL("https://t.me/kiritomr")}
          />
          <InfoRow
            icon="logo-tiktok"
            label="TikTok"
            value="bezpricela"
            color="#FF4D4D"
            onPress={() => Linking.openURL("https://tiktok.com/@bezpricela")}
          />
          <InfoRow
            icon="game-controller-outline"
            label="Steam"
            value="ggmarlboro"
            color="#1B2838"
            onPress={() => Linking.openURL("https://tinyurl.com/ggmarlboro")}
          />
        </View>

        {/* App info */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: "Inter_500Medium" }]}>
            ПРИЛОЖЕНИЕ
          </Text>
          <InfoRow icon="information-circle-outline" label="Версия" value="1.0.0 (Android)" />
          <InfoRow icon="school-outline" label="Платформа" value="Expo / React Native" color={Colors.accent} />
          <InfoRow icon="globe-outline" label="По вопросам" value="@kiritomr" color={Colors.accent}
            onPress={() => Linking.openURL("https://t.me/kiritomr")} />
        </View>

        <Text style={[styles.footer, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
          ☁️ ꞮɴꜰᴏƦᴍᴀᴛꞮᴏɴ · ɢʀᴏᴅɴᴀ, ʙᴇʟᴀʀᴜꜱ
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 28 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  avatarCard: { borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, gap: 8 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarName: { fontSize: 24 },
  avatarSub: { fontSize: 14 },
  avatarBadges: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 4 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  infoIcon: { marginRight: 14, width: 24 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 15, marginTop: 1 },
  footer: { textAlign: "center", fontSize: 12, paddingVertical: 8 },
});
