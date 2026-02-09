import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

interface SettingState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  setLanguage: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  _hasHydrated: boolean; // State check AsyncStorage loaded
  setHasHydrated: (state: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      language: 'vi',
      theme: 'system',
      _hasHydrated: false,
      setLanguage: (lang: string) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
      setTheme: (theme) => set({ theme }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'setting-app', 
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
