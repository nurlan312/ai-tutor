import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// "Заглушка"-хранилище для серверного рендеринга (Node),
// где нет ни AsyncStorage (телефон), ни localStorage (браузер)
const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

function getStorage() {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return noopStorage; // мы на сервере — ничего не делаем
    }
    return undefined; // мы в браузере — Supabase сам использует localStorage
  }
  return AsyncStorage; // мы на телефоне (iOS/Android)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
