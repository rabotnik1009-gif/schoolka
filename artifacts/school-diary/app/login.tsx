import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const { login, attempts, blockedUntil, blockSecondsLeft } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const secs = blockSecondsLeft();
    if (secs > 0) {
      setBlocked(true);
      setCountdown(secs);
    }
  }, [blockedUntil]);

  useEffect(() => {
    if (!blocked) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setBlocked(false);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [blocked]);

  const shake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleLogin = useCallback(() => {
    Keyboard.dismiss();
    if (blocked) return;
    const result = login(password.trim());
    if (result === "ok") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (result === "wrong") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
      const remaining = 3 - (attempts + 1);
      if (remaining > 0) {
        setError(`Неверный пароль. Осталось попыток: ${remaining}`);
      } else {
        setError(`Превышено число попыток. Блокировка на 30 минут.`);
        setBlocked(true);
        setCountdown(1800);
      }
      setPassword("");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError("");
    }
  }, [blocked, login, password, attempts, shake]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              alignItems: "center",
            }}
          >
            <View style={[styles.iconContainer, { backgroundColor: Colors.accent + "20" }]}>
              <Ionicons name="school" size={48} color={Colors.accent} />
            </View>
            <Text style={[styles.title, { color: theme.text, fontFamily: "Inter_700Bold" }]}>
              Школьный дневник
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Введите пароль для входа
            </Text>
          </Animated.View>

          <Animated.View style={[styles.formContainer, { transform: [{ translateX: shakeAnim }] }]}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: error ? Colors.danger : theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: theme.text, fontFamily: "Inter_400Regular" }]}
                placeholder="Пароль"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                returnKeyType="done"
                autoCapitalize="none"
                editable={!blocked}
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>

            {error !== "" && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={[styles.errorText, { fontFamily: "Inter_400Regular" }]}>{error}</Text>
              </View>
            )}

            {blocked && (
              <View style={[styles.blockedBox, { backgroundColor: Colors.danger + "15" }]}>
                <Ionicons name="time-outline" size={18} color={Colors.danger} />
                <Text style={[styles.blockedText, { color: Colors.danger, fontFamily: "Inter_500Medium" }]}>
                  Разблокировка через {formatCountdown(countdown)}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={blocked}
              style={({ pressed }) => [
                styles.loginBtn,
                {
                  backgroundColor: blocked ? Colors.accent + "60" : Colors.accent,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Text style={[styles.loginBtnText, { fontFamily: "Inter_600SemiBold" }]}>Войти</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, textAlign: "center", marginBottom: 6 },
  subtitle: { fontSize: 15, textAlign: "center" },
  formContainer: { width: "100%", gap: 14 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 56,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  eyeBtn: { padding: 6 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
  blockedBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 14 },
  blockedText: { fontSize: 14 },
  loginBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 4 },
  loginBtnText: { color: "#fff", fontSize: 17 },
});
