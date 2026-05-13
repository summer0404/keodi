import React, { useMemo, useState, useEffect } from 'react';
import { Pressable, ScrollView, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Search, X, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { Palette } from '@/constants/theme';
import { onboardingService } from '@/api/onboarding';
import { groupSessionsService } from '@/api/groupSessions';
import { categoriesService } from '@/api/categories';
import { useAuthStore } from '@/store/useAuthStore';
import SearchBar from '@/components/ui/SearchBar';

type SelectedCategory = {
  id: string;
  name: string;
};

export default function GroupCreateCategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { sessionId, shareCode, guestId } = useLocalSearchParams<{
    sessionId?: string;
    shareCode?: string;
    guestId?: string;
  }>();

  const [selectedItems, setSelectedItems] = useState<SelectedCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const normalizedSessionId = useMemo(() => {
    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }, [sessionId]);

  const normalizedShareCode = useMemo(() => {
    return Array.isArray(shareCode) ? shareCode[0] : shareCode;
  }, [shareCode]);

  const normalizedGuestId = useMemo(() => {
    return Array.isArray(guestId) ? guestId[0] : guestId;
  }, [guestId]);

  // Default categories for suggestions
  const categoriesQuery = useQuery({
    queryKey: ['onboarding-categories'],
    queryFn: onboardingService.getCategories,
    enabled: !!accessToken,
  });

  // Auto-recommend search
  const searchQuery = useQuery({
    queryKey: ['search-categories', debouncedKeyword],
    queryFn: () => categoriesService.searchCategories(debouncedKeyword, 10),
    enabled: !!accessToken && debouncedKeyword.trim().length > 0,
  });

  const selectableDefaultCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.isSelectable),
    [categoriesQuery.data]
  );

  const handleSelectFromSearch = (item: SelectedCategory) => {
    setSelectedItems((prev) => {
      if (prev.some((x) => x.id === item.id)) return prev; // Already selected
      return [...prev, item];
    });
    setKeyword(''); // Clear search after picking
  };

  const removeCategory = (id: string) => {
    setSelectedItems((prev) => prev.filter((x) => x.id !== id));
  };

  const handleContinue = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      if (normalizedSessionId) {
        await groupSessionsService.updateRecommendationCategories(normalizedSessionId, {
          guestId: normalizedGuestId,
          categoryIds: selectedItems.map((item) => item.id),
        });
      }
    } catch {
      // Keep existing flow even when recommendation categories update fails.
    } finally {
      setIsSubmitting(false);
      router.push({
        pathname: '/(tabs)/group/create/radius',
        params: {
          sessionId: normalizedSessionId,
          shareCode: normalizedShareCode,
        },
      } as any);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
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
        keyboardShouldPersistTaps="handled"
      >
        <Typography variant="h4" className="text-center">
          {t('group.personalizeTitle')}
        </Typography>
        <Typography className="mt-1 text-center text-gray-500">
          {t('group.selectCategories')}
        </Typography>

        {/* Search Bar Container */}
        <View className="mt-6 z-50">
          <SearchBar
            value={keyword}
            onChangeText={setKeyword}
            placeholder={t('search.title')}
            showSettings={false}
            showAI={false}
          />

          {/* Dropdown Results */}
          {debouncedKeyword.trim().length > 0 && (
            <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {searchQuery.isLoading ? (
                <View className="py-4 items-center">
                  <ActivityIndicator size="small" color={Palette.black} />
                </View>
              ) : searchQuery.data?.length === 0 ? (
                <View className="py-4 items-center">
                  <Typography className="text-gray-500">
                    {t('group.noCategoriesFound')}
                  </Typography>
                </View>
              ) : (
                searchQuery.data?.map((item, index) => (
                  <Pressable
                    key={item.id}
                    className={`flex-row items-center px-4 py-3 ${
                      index < searchQuery.data.length - 1 ? 'border-b border-gray-100' : ''
                    } active:bg-gray-50`}
                    onPress={() => handleSelectFromSearch({ id: item.id, name: item.name })}
                  >
                    <Search size={16} color="#9CA3AF" />
                    <Typography className="ml-3 flex-1 text-black">{item.name}</Typography>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>

        <Typography className="mt-6 mb-3">{t('group.warningCategories')}</Typography>

        {/* Gợi ý tìm kiếm */}
        {debouncedKeyword.trim().length === 0 && (
          <View className="mt-3">
            <Typography variant='h5' className="mb-3">
              {t('group.searchSuggestions')}
            </Typography>
            <View className="flex-row flex-wrap gap-2.5">
              {categoriesQuery.isLoading ? (
                <ActivityIndicator size="small" color={Palette.black} />
              ) : (
                selectableDefaultCategories.slice(0, 10).map((item) => (
                  <Pressable
                    key={item.id}
                    className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 active:bg-gray-50"
                    onPress={() => setKeyword(item.name)}
                  >
                    <Search size={14} color="#6B7280" />
                    <Typography className="ml-1.5 text-gray-700">{item.name}</Typography>
                  </Pressable>
                ))
              )}
            </View>
          </View>
        )}

        {/* Đã chọn */}
        {selectedItems.length > 0 && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Typography variant='h5'>{t('group.selectedCategories')}</Typography>
              <Pressable onPress={() => setSelectedItems([])}>
                <Typography className="text-blue-600">
                  {t('button.clearAll')}
                </Typography>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-2.5">
              {selectedItems.map((item) => (
                <View
                  key={item.id}
                  className="flex-row items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5"
                >
                  <MapPin size={14} color={Palette.black} />
                  <Typography className="mx-1.5 text-black">{item.name}</Typography>
                  <Pressable onPress={() => removeCategory(item.id)}>
                    <View className="bg-gray-300 rounded-full p-0.5">
                      <X size={10} color="white" />
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      <View
        className="border-t border-[#F0F0F3] bg-white px-4 pt-3"
        style={{
          paddingBottom: insets.bottom + 12,
          marginBottom: 72,
          backgroundColor: 'white',
        }}
      >
        <Button className="w-full bg-black" disabled={isSubmitting} onPress={handleContinue}>
          {isSubmitting ? `${t('group.continue')}...` : t('group.continue')}
        </Button>
      </View>
    </View>
  );
}
