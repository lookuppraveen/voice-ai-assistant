import Cookies from 'js-cookie';
import { User } from '@/types';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const setAuth = (token: string, user: User) => {
  Cookies.set(TOKEN_KEY, token, { expires: 7, secure: process.env.NODE_ENV === 'production' });
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const getToken = () => Cookies.get(TOKEN_KEY);

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const clearAuth = () => {
  Cookies.remove(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_KEY);
  }
};

export const updateStoredUser = (updates: Partial<User>) => {
  if (typeof window === 'undefined') return;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return;
  const user = JSON.parse(raw);
  sessionStorage.setItem(USER_KEY, JSON.stringify({ ...user, ...updates }));
};

export const isAuthenticated = () => !!getToken();
