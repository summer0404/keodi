import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { getRadiusValueFromSettings } from '@/constants/helper';

interface SettingState {
  language: string;
  theme: 'light' | 'dark' | 'system';
  hasSeenOnboarding: boolean;
  hasCompletedCategoryOnboarding: boolean;
  // numeric radius derived from user setting (in km)
  defaultRadius: number;
  // raw API value if available
  defaultRadiusApi?: 'KM_2' | 'KM_5' | 'KM_10' | 'KM_20';
  setLanguage: (lang: string) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setHasSeenOnboarding: (state: boolean) => void;
  setHasCompletedCategoryOnboarding: (state: boolean) => void;
  setDefaultRadiusFromApi: (apiValue: 'KM_2' | 'KM_5' | 'KM_10' | 'KM_20') => void;
  _hasHydrated: boolean; // State check AsyncStorage loaded
  setHasHydrated: (state: boolean) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      language: 'vi',
      theme: 'system',
      // default to KM_5 numeric mapping
      defaultRadius: getRadiusValueFromSettings('KM_5'),
      defaultRadiusApi: 'KM_5',
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
      setDefaultRadiusFromApi: (apiValue) =>
        set(() => ({
          defaultRadiusApi: apiValue,
          defaultRadius: getRadiusValueFromSettings(apiValue),
        })),
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
