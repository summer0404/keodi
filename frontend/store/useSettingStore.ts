import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

interface SettingState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  hasSeenOnboarding: boolean;
  hasCompletedCategoryOnboarding: boolean;
  setLanguage: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHasSeenOnboarding: (state: boolean) => void;
  setHasCompletedCategoryOnboarding: (state: boolean) => void;
  _hasHydrated: boolean; // State check AsyncStorage loaded
  setHasHydrated: (state: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      language: 'vi',
      theme: 'system',
      hasSeenOnboarding: false,
      hasCompletedCategoryOnboarding: false,
      _hasHydrated: false,
      setLanguage: (lang: string) => {
        i18n.changeLanguage(lang);
        set({ language: lang });
      },
      setTheme: (theme) => set({ theme }),
      setHasSeenOnboarding: (state) => set({ hasSeenOnboarding: state }),
      setHasCompletedCategoryOnboarding: (state) => set({ hasCompletedCategoryOnboarding: state }),
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
