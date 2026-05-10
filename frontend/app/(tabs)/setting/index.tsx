import Typography from '@/components/ui/Typography';
import { Pressable, ScrollView, Switch, View, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Languages,
  Lock,
  LogOut,
  Moon,
  Settings2,
  ArrowLeft,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Palette } from '@/constants/theme';
import { userService } from '@/api/user';
import type { UserSettings } from '@/types/api';
import { Select } from '@/components/ui/Select';
import { useSettingStore } from '@/store/useSettingStore';

const RADIUS_OPTIONS = [
  { label: '2 km', value: 'KM_2' },
  { label: '5 km', value: 'KM_5' },
  { label: '15 km', value: 'KM_10' },
  { label: '>15 km', value: 'KM_20' },
];

const RATING_OPTIONS = [
  { label: '1.0 ⭐', value: 'ABOVE_1' },
  { label: '2.0 ⭐', value: 'ABOVE_2' },
  { label: '3.0 ⭐', value: 'ABOVE_3' },
  { label: '4.0 ⭐', value: 'ABOVE_4' },
  { label: '5.0 ⭐', value: 'FIVE_STAR' },
];

const PROFILE_VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Friend only', value: 'FRIENDS_ONLY' },
  { label: 'Private', value: 'PRIVATE' },
];

const LANGUAGE_FLAGS = [
  { label: '🇻🇳', value: 'VI' },
  { label: '🇬🇧', value: 'EN' },
];

export default function SettingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { clearTokens } = useAuthStore();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const horizontalPadding = 16;

  const { setDefaultRadiusFromApi } = useSettingStore();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await userService.getSetting();
        setSettings(data);
        if (data?.defaultSearchRadius) {
          setDefaultRadiusFromApi(data.defaultSearchRadius);
        }
      } catch (error) {
        console.log('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    if (!settings) return;

    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);

    try {
      await userService.updateSetting({ [key]: value });
      if (key === 'defaultSearchRadius') {
        setDefaultRadiusFromApi(value as any);
      }
    } catch (error) {
      console.log('Error updating setting:', error);
      setSettings(settings);
    }
  };

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log('Google SignOut error', error);
    }
    await clearTokens();
    router.replace('/(auth)/login');
  };

  if (isLoading || !settings) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={Palette.black} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        <View
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: horizontalPadding,
            paddingBottom: 12,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.back()}
            >
              <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
            </Pressable>

            <Typography variant="h4">{t('settings.title')}</Typography>
          </View>
        </View>

        <View style={{ paddingHorizontal: horizontalPadding }} className="gap-3">
          {/* Privacy Policy */}
          <Card>
            <Pressable
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => toggleSection('privacy')}
            >
              <View className="flex-row items-center gap-3">
                <Lock size={20} color={Palette.black} strokeWidth={1.9} />
                <Typography variant="h5">{t('settings.privacy')}</Typography>
              </View>
              {expandedSections.has('privacy') ? (
                <ChevronUp size={18} color={Palette.black} strokeWidth={1.9} />
              ) : (
                <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
              )}
            </Pressable>

            {expandedSections.has('privacy') && (
              <View className="border-t border-gray-200 px-4 py-3">
                {/* Share Location */}
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-1 pr-3">
                    <Typography variant="h5" className="font-medium">
                      {t('settings.shareLocation')}
                    </Typography>
                    <Typography className="text-xs text-gray-500">
                      {t('settings.shareLocationDesc')}
                    </Typography>
                  </View>
                  <Switch
                    value={settings.shareLocation}
                    onValueChange={(value) => handleSettingChange('shareLocation', value)}
                    trackColor={{ false: '#d4d4d8', true: '#111827' }}
                    thumbColor={Palette.white}
                  />
                </View>

                {/* Profile Visibility */}
                <View className="py-3">
                  <Typography variant="h5" className="mb-2 font-medium">
                    {t('settings.profileVisibility.title')}
                  </Typography>
                  <Typography className="text-xs text-gray-500 mb-2">
                    {t('settings.profileVisibility.description')}
                  </Typography>
                  <Select
                    value={settings.profileVisibility}
                    onChange={(value: string | number) =>
                      handleSettingChange('profileVisibility', value as any)
                    }
                    options={PROFILE_VISIBILITY_OPTIONS}
                  />
                </View>
              </View>
            )}
          </Card>

          {/* Notification */}
          <Card>
            <Pressable
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => toggleSection('notification')}
            >
              <View className="flex-row items-center gap-3">
                <Bell size={20} color={Palette.black} strokeWidth={1.9} />
                <Typography variant="h5">{t('settings.notifications.title')}</Typography>
              </View>
              {expandedSections.has('notification') ? (
                <ChevronUp size={18} color={Palette.black} strokeWidth={1.9} />
              ) : (
                <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
              )}
            </Pressable>

            {expandedSections.has('notification') && (
              <View className="border-t border-gray-200 px-4 py-3">
                {/* Group Invites */}
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-1 pr-3">
                    <Typography variant="h5" className="font-medium">
                      {t('settings.notifications.groupInvites')}
                    </Typography>
                    <Typography className="text-xs text-gray-500">
                      {t('settings.notifications.groupInviteDesc')}
                    </Typography>
                  </View>
                  <Switch
                    value={settings.notifyGroupInvites}
                    onValueChange={(value) => handleSettingChange('notifyGroupInvites', value)}
                    trackColor={{ false: '#d4d4d8', true: '#111827' }}
                    thumbColor={Palette.white}
                  />
                </View>

                {/* Voting Results */}
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-1 pr-3">
                    <Typography variant="h5" className="font-medium">
                      {t('settings.notifications.votingResults')}
                    </Typography>
                    <Typography className="text-xs text-gray-500">
                      {t('settings.notifications.votingResultsDesc')}
                    </Typography>
                  </View>
                  <Switch
                    value={settings.notifyVotingResults}
                    onValueChange={(value) => handleSettingChange('notifyVotingResults', value)}
                    trackColor={{ false: '#d4d4d8', true: '#111827' }}
                    thumbColor={Palette.white}
                  />
                </View>

                {/* Nearby Places */}
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-1 pr-3">
                    <Typography variant="h5" className="font-medium">
                      {t('settings.notifications.nearbyPlaces')}
                    </Typography>
                    <Typography className="text-xs text-gray-500">
                      {t('settings.notifications.nearbyPlacesDesc')}
                    </Typography>
                  </View>
                  <Switch
                    value={settings.notifyNearbyPlaces}
                    onValueChange={(value) => handleSettingChange('notifyNearbyPlaces', value)}
                    trackColor={{ false: '#d4d4d8', true: '#111827' }}
                    thumbColor={Palette.white}
                  />
                </View>

                {/* Recommendations */}
                <View className="flex-row items-center justify-between py-3">
                  <View className="flex-1 pr-3">
                    <Typography variant="h5" className="font-medium">
                      {t('settings.notifications.recommendations')}
                    </Typography>
                    <Typography className="text-xs text-gray-500">
                      {t('settings.notifications.recommendationsDesc')}
                    </Typography>
                  </View>
                  <Switch
                    value={settings.notifyRecommendations}
                    onValueChange={(value) => handleSettingChange('notifyRecommendations', value)}
                    trackColor={{ false: '#d4d4d8', true: '#111827' }}
                    thumbColor={Palette.white}
                  />
                </View>
              </View>
            )}
          </Card>

          {/* App Preferences */}
          <Card>
            <Pressable
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => toggleSection('preferences')}
            >
              <View className="flex-row items-center gap-3">
                <Settings2 size={20} color={Palette.black} strokeWidth={1.9} />
                <Typography variant="h5">{t('settings.appPreferences')}</Typography>
              </View>
              {expandedSections.has('preferences') ? (
                <ChevronUp size={18} color={Palette.black} strokeWidth={1.9} />
              ) : (
                <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
              )}
            </Pressable>

            {expandedSections.has('preferences') && (
              <View className="border-t border-gray-200 px-4 py-3">
                {/* Default Search Radius */}
                <View className="py-3">
                  <Typography variant="h5" className="mb-2 font-medium">
                    {t('settings.defaultSearchRadius')}
                  </Typography>
                  <Select
                    value={settings.defaultSearchRadius}
                    onChange={(value: string | number) =>
                      handleSettingChange('defaultSearchRadius', value as any)
                    }
                    options={RADIUS_OPTIONS}
                  />
                </View>

                {/* Default Search Rating */}
                {/* <View className="py-3">
                  <Typography variant="h5" className="mb-2 font-medium">
                    {t('settings.defaultSearchRating')}
                  </Typography>
                  <Select
                    value={settings.defaultMinRating}
                    onChange={(value: string | number) =>
                      handleSettingChange('defaultMinRating', value as any)
                    }
                    options={RATING_OPTIONS}
                  />
                </View> */}
              </View>
            )}
          </Card>

          {/* Language */}
          <Card>
            <Pressable
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => toggleSection('language')}
            >
              <View className="flex-row items-center gap-3">
                <Languages size={20} color={Palette.black} strokeWidth={1.9} />
                <Typography variant="h5">{t('settings.language')}</Typography>
              </View>
              {expandedSections.has('language') ? (
                <ChevronUp size={18} color={Palette.black} strokeWidth={1.9} />
              ) : (
                <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
              )}
            </Pressable>

            {expandedSections.has('language') && (
              <View className="border-t border-gray-200 px-4 py-3">
                <View className="flex-row gap-5">
                  {LANGUAGE_FLAGS.map((flag) => (
                    <Pressable
                      key={flag.value}
                      onPress={async () => {
                        try {
                          const newLang = flag.value === 'VI' ? 'vi' : 'en';
                          await i18n.changeLanguage(newLang);
                          await handleSettingChange('language', flag.value);
                        } catch (err) {
                          console.log('changeLanguage error', err);
                        }
                      }}
                    >
                      <Typography style={{ fontSize: 32 }}>{flag.label}</Typography>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </Card>

          {/* Dark Mode */}
          <Card>
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center gap-3">
                <Moon size={20} color={Palette.black} strokeWidth={1.9} />
                <Typography variant="h5">{t('settings.darkMode')}</Typography>
              </View>

              <Switch
                value={settings.darkMode}
                onValueChange={(value) => handleSettingChange('darkMode', value)}
                trackColor={{ false: '#d4d4d8', true: '#111827' }}
                thumbColor={Palette.white}
              />
            </View>
          </Card>

          {/* Logout */}
          <Card>
            <Pressable
              className="flex-row items-center gap-3 px-4 py-4"
              onPress={handleLogout}
              accessibilityRole="button"
            >
              <LogOut size={20} color="#ff2b2b" strokeWidth={1.9} />
              <Typography variant="h5" className="text-[#ff2b2b]">
                {t('settings.logout')}
              </Typography>
            </Pressable>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
