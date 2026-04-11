import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { CATEGORIES } from '@/constants/helper';
import { Palette } from '@/constants/theme';

export default function GroupCreateCategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { sessionId, shareCode } = useLocalSearchParams<{
    sessionId?: string;
    shareCode?: string;
  }>();

  const [selected, setSelected] = useState<string[]>([]);

  const selectedMap = useMemo(() => new Set(selected), [selected]);

  const toggleCategory = (categoryId: string) => {
    setSelected((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((item) => item !== categoryId);
      }
      return [...prev, categoryId];
    });
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
          <Typography variant="h4">{t('group.addSessionTitle')}</Typography>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Typography variant="h4" className="text-center">
          {t('group.personalizeTitle')}
        </Typography>
        <Typography className="mt-1 text-center text-gray-500">
          {t('group.selectCategories')}
        </Typography>

        <View className="mt-5 flex-row flex-wrap gap-2.5">
          {CATEGORIES.map((item) => {
            const checked = selectedMap.has(item.id);

            return (
              <Pressable
                key={item.id}
                className={`w-[48%] rounded-xl border px-3 py-2.5 ${
                  checked ? 'border-black bg-[#F3F4F6]' : 'border-[#E8E8EC] bg-white'
                }`}
                onPress={() => toggleCategory(item.id)}
              >
                <View className="flex-row items-center justify-between">
                  <Typography className="flex-1">{t(item.titleKey)}</Typography>
                  <Typography>{checked ? '☑' : '☐'}</Typography>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3"
        style={{
          paddingBottom: insets.bottom + 12,
          marginBottom: 72,
          backgroundColor: 'white',
        }}
      >
        <Button
          className="w-full"
          onPress={() =>
            router.push({
              pathname: '/(tabs)/group/create/invite',
              params: {
                sessionId,
                shareCode,
              },
            } as any)
          }
        >
          {t('group.continue')}
        </Button>
      </View>
    </View>
  );
}
