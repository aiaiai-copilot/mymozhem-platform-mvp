import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { platform, setAuthToken, getStoredToken } from '@/lib/platform';
import { connectWithToken, disconnect } from '@/lib/socket';
import type { User } from '@event-platform/sdk';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      platform.auth.me()
        .then(({ data }) => {
          if (data) {
            setState({ user: data, isLoading: false, isAuthenticated: true });
            connectWithToken(token);
          }
        })
        .catch(() => {
          setAuthToken(null);
          setState({ user: null, isLoading: false, isAuthenticated: false });
        });
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await platform.auth.login(email, password);
    if (data) {
      setAuthToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
      connectWithToken(data.accessToken);
      return data.user;
    }
    throw new Error('Login failed');
  }, []);

  const logout = useCallback(async () => {
    try {
      await platform.auth.logout();
    } catch {
      // Ignore errors on logout
    }
    setAuthToken(null);
    localStorage.removeItem('refreshToken');
    disconnect();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
