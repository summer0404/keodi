import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { useSettingStore } from '@/store/useSettingStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const imageSlides = [
  {
    id: 0,
    titleKey: 'onboarding.slide1.title',
    descriptionKey: 'onboarding.slide1.description',
    image: require('@/assets/images/Onboarding-1.jpg'),
  },
  {
    id: 1,
    titleKey: 'onboarding.slide2.title',
    descriptionKey: 'onboarding.slide2.description',
    image: require('@/assets/images/Onboarding-2.jpg'),
  },
  {
    id: 2,
    titleKey: 'onboarding.slide3.title',
    descriptionKey: 'onboarding.slide3.description',
    image: require('@/assets/images/Onboarding-3.jpg'),
  },
];

const onboardingPages = [0, 1, 2];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<number> | null>(null);
  const { hasSeenOnboarding, setHasSeenOnboarding, _hasHydrated } = useSettingStore();

  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    if (hasSeenOnboarding) {
      router.replace('/login');
    }
  }, [_hasHydrated, hasSeenOnboarding, router]);

  if (!_hasHydrated || hasSeenOnboarding) {
    return <View className="flex-1 bg-black" />;
  }

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    router.replace('/login');
  };

  const goToNextPage = () => {
    if (activeIndex >= imageSlides.length - 1) {
      completeOnboarding();
      return;
    }

    const nextIndex = activeIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const renderDots = () => (
    <View className="flex-row items-center justify-center gap-2">
      {imageSlides.map((slide, index) => (
        <View
          key={slide.id}
          className={`h-2 rounded-full ${index === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
        />
      ))}
    </View>
  );

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const slide = imageSlides[item];
    return (
      <ImageBackground source={slide.image} style={{ width }} className="flex-1 overflow-hidden">
        <View className="flex-1 bg-black/30 px-6 pb-20 pt-10 justify-end">
          <Typography variant="h4" className="text-white justify-center items-center">
            {t(slide.titleKey)}
          </Typography>

          <Typography variant="caption" className="mt-3 text-white/90">
            {t(slide.descriptionKey)}
          </Typography>

          <View className="mt-6">{renderDots()}</View>

          <View className="mt-6 justify-center items-center">
            <Button
              variant="outline"
              rounded="full"
              size="lg"
              className="w-1/2"
              onPress={goToNextPage}
            >
              {activeIndex === imageSlides.length - 1
                ? t('onboarding.button.getStarted')
                : t('onboarding.button.continue')}
            </Button>
          </View>
        </View>
      </ImageBackground>
    );
  };

  return (
    <View className="flex-1 bg-black">
      <FlatList
        ref={flatListRef}
        data={onboardingPages}
        keyExtractor={(item) => item.toString()}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />
    </View>
  );
}
