import { onboardingService } from '@/api/onboarding';
import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingStore } from '@/store/useSettingStore';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getCategoryIcon } from '@/constants/helper';

export default function CategoriesOnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { hasCompletedCategoryOnboarding, setHasCompletedCategoryOnboarding } = useSettingStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categoriesQuery = useQuery({
    queryKey: ['onboarding-categories'],
    queryFn: onboardingService.getCategories,
    enabled: !!accessToken,
  });

  const submitMutation = useMutation({
    mutationFn: onboardingService.submitCategories,
  });

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
      return;
    }

    if (hasCompletedCategoryOnboarding) {
      router.replace('/(tabs)');
    }
  }, [accessToken, hasCompletedCategoryOnboarding, router]);

  const selectableCategories = useMemo(
    () => (categoriesQuery.data ?? []).filter((category) => category.isSelectable),
    [categoriesQuery.data]
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }

      return [...prev, categoryId];
    });
  };

  const canContinue = selectedCategories.length >= 3;

  const handleContinue = async () => {
    if (!canContinue || submitMutation.isPending) {
      return;
    }

    try {
      await submitMutation.mutateAsync({ categoryIds: selectedCategories });
      setHasCompletedCategoryOnboarding(true);
      router.replace('/(tabs)');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          error.message ??
          'Unable to complete onboarding.';
        const errorDetails = `Status: ${status} - ${message}`;
        Alert.alert('Error', errorDetails);
      } else {
        Alert.alert('Error', 'Unable to complete onboarding. Please try again.');
      }
    }
  };

  return (
    <ImageBackground
      source={require('@/assets/images/Onboarding-4.jpg')}
      className="flex-1 overflow-hidden"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1 bg-black/50 px-6 pt-16 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Typography variant="h3" className="text-white text-center">
            {t('onboarding.categories.title')}
          </Typography>
          <Typography variant="caption" className="mt-2 text-white/90 text-center">
            {t('onboarding.categories.subtitle')}
          </Typography>
        </View>

        {categoriesQuery.isLoading ? (
          <View className="flex-1 items-center justify-center py-12">
            <Typography className="text-white/90">Loading categories...</Typography>
          </View>
        ) : categoriesQuery.isError ? (
          <View className="flex-1 items-center justify-center py-12 gap-4">
            <Typography className="text-white/90 text-center">
              {t('errors.loadCategories')}
            </Typography>
            <Button rounded="full" variant="outline" onPress={() => categoriesQuery.refetch()}>
              {t('button.retry')}
            </Button>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-center gap-3 mb-8">
            {selectableCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  className={`px-4 py-2 rounded-full ${isSelected ? 'bg-black' : 'bg-white/90'}`}
                >
                  <Typography
                    variant="caption"
                    className={isSelected ? 'text-white font-medium' : 'text-black font-medium'}
                  >
                    {getCategoryIcon(category.name)} {category.name}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        )}

        <Button
          rounded="full"
          size="lg"
          className="w-full text-white pt-3"
          disabled={!canContinue || submitMutation.isPending || categoriesQuery.isLoading}
          onPress={handleContinue}
        >
          {submitMutation.isPending ? t('button.continuing') : t('button.continue')}
        </Button>
      </ScrollView>
    </ImageBackground>
  );
}
