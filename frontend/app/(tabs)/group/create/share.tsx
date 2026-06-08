import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { Palette } from '@/constants/theme';
import { buildShareLink } from '@/utils/deep-link';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Share2 } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GroupShareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { shareCode, sessionId, shareLink: shareLinkParam } = useLocalSearchParams<{ shareCode?: string; sessionId?: string; shareLink?: string }>();

  const normalizedShareCode = Array.isArray(shareCode) ? shareCode[0] : shareCode;
  const shareLink = (Array.isArray(shareLinkParam) ? shareLinkParam[0] : shareLinkParam)
    ?? (normalizedShareCode ? buildShareLink(normalizedShareCode) : null);

  const handleCopy = async (text: string | null | undefined) => {
    if (!text?.trim()) return;

    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(text.trim());
    } catch {
      // Silent fail keeps the UI smooth when clipboard native module is unavailable.
    }
  };

  const handleShareLink = async () => {
    if (!shareLink) return;
    try {
      await Share.share({
        message: t('group.shareMessage', { link: shareLink }),
        url: shareLink, // iOS uses url for rich link previews
      });
    } catch {
      // User dismissed the share sheet – no action needed.
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

        {/* Share code */}
        <View className="mt-7 w-full flex-row rounded-2xl justify-center gap-4 border border-[#E8E8EC] bg-[#F7F7FA] px-5 py-8 items-center">
          <Typography variant="h5" className="text-4xl tracking-[0.22em]">
            {normalizedShareCode}
          </Typography>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              void handleCopy(normalizedShareCode);
            }}
            className="p-1"
          >
            <Copy size={16} color={Palette.black} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Share link */}
        {shareLink ? (
          <View className="mt-4 w-full">
            <Pressable
              className="flex-row items-center justify-between rounded-xl border border-[#E8E8EC] bg-[#F7F7FA] px-4 py-3"
              onPress={() => void handleCopy(shareLink)}
            >
              <Typography className="flex-1 text-gray-500 text-sm" numberOfLines={1}>
                {shareLink}
              </Typography>
              <Copy size={14} color={Palette.black} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
      </View>

      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3 gap-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {shareLink ? (
          <Button
            variant="outline"
            className="w-full flex-row items-center gap-2"
            onPress={() => void handleShareLink()}
          >
            <Share2 size={16} color={Palette.black} strokeWidth={2} />
            {t('group.shareLink')}
          </Button>
        ) : null}
        <Button
          className="w-full"
          onPress={() =>
            sessionId
              ? router.navigate(`/(tabs)/group/${sessionId}` as any)
              : router.navigate('/(tabs)/group' as any)
          }
        >
          {t('button.done')}
        </Button>
      </View>
    </View>
  );
}
