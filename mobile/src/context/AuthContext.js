import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import * as Api from "../services/ApiService";

const TOKEN_KEY = "jamhijau.token";
const USER_KEY = "jamhijau.user";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [restoring, setRestoring] = useState(true);

  const saveSession = async (data) => {
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
    setIsGuest(false);
  };

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setIsGuest(false);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const savedUser = await SecureStore.getItemAsync(USER_KEY);
        if (!savedToken) return;
        if (!active) return;
        setToken(savedToken);
        setUser(savedUser ? JSON.parse(savedUser) : null);
        try {
          const fresh = await Api.getMe(savedToken);
          if (active) setUser(fresh);
        } catch (e) {
          if (e instanceof Api.ApiError && e.status === 401) await logout();
        }
      } catch {
        await logout();
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [logout]);

  const login = async (email, password) => {
    const data = await Api.login(email, password);
    await saveSession(data);
  };

  const register = async (name, email, password) => {
    const data = await Api.register(name, email, password);
    await saveSession(data);
  };

  const continueAsGuest = () => setIsGuest(true);
  const exitGuest = () => setIsGuest(false);

  const handleAuthError = useCallback(
    async (err) => {
      if (token && err instanceof Api.ApiError && err.status === 401) {
        await logout();
        return true;
      }
      return false;
    },
    [token, logout],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isGuest,
      restoring,
      isLoggedIn: Boolean(token),
      login,
      register,
      logout,
      continueAsGuest,
      exitGuest,
      handleAuthError,
    }),
    [token, user, isGuest, restoring, logout, handleAuthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
