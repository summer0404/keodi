import Typography from '@/components/ui/Typography';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Bell, ChevronDown, Languages, Lock, LogOut, Moon, Settings2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Palette } from '@/constants/theme';

export default function SettingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { clearTokens } = useAuthStore();
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(false);

  const handleLogout = async () => {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.log('Google SignOut error', error);
    }
    await clearTokens();
    router.replace('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-[#f1f1f1]">
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} className="px-4">
        <Typography variant="h4" className="mt-3 mb-4">
          Setting
        </Typography>

        <Card className="mb-4" style={{ elevation: 2 }}>
          <Pressable className="flex-row items-center justify-between px-4 py-5">
            <View className="flex-row items-center gap-3">
              <Lock size={20} color={Palette.black} strokeWidth={1.9} />
              <Typography variant="h5">Privacy Policy</Typography>
            </View>
            <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
          </Pressable>
        </Card>

        <Card className="mb-4" style={{ elevation: 2 }}>
          <Pressable className="flex-row items-center justify-between px-4 py-5">
            <View className="flex-row items-center gap-3">
              <Bell size={20} color={Palette.black} strokeWidth={1.9} />
              <Typography variant="h5">Notification</Typography>
            </View>
            <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
          </Pressable>
        </Card>

        <Card className="mb-4" style={{ elevation: 2 }}>
          <Pressable className="flex-row items-center justify-between px-4 py-5">
            <View className="flex-row items-center gap-3">
              <Settings2 size={20} color={Palette.black} strokeWidth={1.9} />
              <Typography variant="h5">App Preferences</Typography>
            </View>
            <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
          </Pressable>
        </Card>

        <Card className="mb-4" style={{ elevation: 2 }}>
          <Pressable
            className="flex-row items-center justify-between px-4 py-5"
            onPress={async () => {
              try {
                const next = i18n.language?.startsWith('vi') ? 'en' : 'vi';
                await i18n.changeLanguage(next);
              } catch (err) {
                console.log('changeLanguage error', err);
              }
            }}
          >
            <View className="flex-row items-center gap-3">
              <Languages size={20} color={Palette.black} strokeWidth={1.9} />
              <Typography variant="h5">Language</Typography>
            </View>

            <View className="flex-row items-center gap-2">
              <Typography className="text-[13px] text-gray-500">
                {i18n?.language?.startsWith('vi') ? 'Tiếng Việt' : 'English'}
              </Typography>
              <ChevronDown size={18} color={Palette.black} strokeWidth={1.9} />
            </View>
          </Pressable>
        </Card>

        <Card className="mb-6" style={{ elevation: 2 }}>
          <View className="flex-row items-center justify-between px-4 py-4.5">
            <View className="flex-row items-center gap-3">
              <Moon size={20} color={Palette.black} strokeWidth={1.9} />
              <Typography variant="h5">Dark Mode</Typography>
            </View>

            <Switch
              value={isDarkModeEnabled}
              onValueChange={setIsDarkModeEnabled}
              trackColor={{ false: '#d4d4d8', true: '#111827' }}
              thumbColor={Palette.white}
            />
          </View>
        </Card>

        <Card style={{ elevation: 2 }}>
          <Pressable
            className="flex-row items-center gap-3 px-4 py-5"
            onPress={handleLogout}
            accessibilityRole="button"
          >
            <LogOut size={20} color="#ff2b2b" strokeWidth={1.9} />
            <Typography variant="h5" className="text-[#ff2b2b]">
              {t('auth.logOut')}
            </Typography>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
