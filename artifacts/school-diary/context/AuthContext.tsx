import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const PASSWORD = "checkerzxc";
const MAX_ATTEMPTS = 3;
const BLOCK_DURATION = 1800; // 30 min in seconds
const STORAGE_KEY = "auth_state";

interface AuthState {
  isAuthenticated: boolean;
  attempts: number;
  blockedUntil: number; // unix timestamp seconds
}

interface AuthContextValue {
  isAuthenticated: boolean;
  attempts: number;
  blockedUntil: number;
  login: (password: string) => "ok" | "wrong" | "blocked";
  logout: () => void;
  blockSecondsLeft: () => number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    attempts: 0,
    blockedUntil: 0,
  });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as AuthState;
          setState(saved);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback((next: AuthState) => {
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const blockSecondsLeft = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, state.blockedUntil - now);
  }, [state.blockedUntil]);

  const login = useCallback(
    (password: string): "ok" | "wrong" | "blocked" => {
      const now = Math.floor(Date.now() / 1000);
      if (state.blockedUntil > now) return "blocked";

      if (password === PASSWORD) {
        persist({ isAuthenticated: true, attempts: 0, blockedUntil: 0 });
        return "ok";
      }

      const newAttempts = state.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        persist({
          isAuthenticated: false,
          attempts: 0,
          blockedUntil: now + BLOCK_DURATION,
        });
      } else {
        persist({
          isAuthenticated: false,
          attempts: newAttempts,
          blockedUntil: 0,
        });
      }
      return "wrong";
    },
    [state, persist]
  );

  const logout = useCallback(() => {
    persist({ isAuthenticated: false, attempts: 0, blockedUntil: 0 });
  }, [persist]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: state.isAuthenticated,
        attempts: state.attempts,
        blockedUntil: state.blockedUntil,
        login,
        logout,
        blockSecondsLeft,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
