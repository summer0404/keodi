import React from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { Palette } from '@/constants/theme';

export default function GroupShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shareCode } = useLocalSearchParams<{ shareCode?: string }>();
  const handleCopy = async (text: string | null | undefined) => {
    if (!text?.trim()) return;

    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(text.trim());
    } catch {
      // Silent fail keeps the UI smooth when clipboard native module is unavailable.
    }
  };

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>
          <Typography variant="h4">{t('group.shareTitle')}</Typography>
        </View>
      </View>

      <View className="flex-1 items-center px-6 pt-8">
        <Typography variant="h4" className="text-center">
          {t('group.shareWithFriends')}
        </Typography>
        <Typography className="mt-2 text-center text-gray-500">
          {t('group.shareCodeDesc')}
        </Typography>

        <View className="mt-7 w-full flex-row rounded-2xl justify-center gap-4 border border-[#E8E8EC] bg-[#F7F7FA] px-5 py-8 items-center">
          <Typography variant="h5" className="text-4xl tracking-[0.22em]">
            {shareCode}
          </Typography>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              void handleCopy(shareCode);
            }}
            className="p-1"
          >
            <Copy size={16} color={Palette.black} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button className="w-full" onPress={() => router.replace('/(tabs)/group' as any)}>
          {t('button.done')}
        </Button>
      </View>
    </View>
  );
}
