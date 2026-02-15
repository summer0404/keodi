import { Button } from '@/components/ui/Button';
import Typography from '@/components/ui/Typography';
import { useSettingStore } from '@/store/useSettingStore';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '@/constants/helper';

const imageSlides = [
  {
    id: 0,
    titleKey: 'onboarding.slide1.title',
    descriptionKey: 'onboarding.slide1.description',
    image: require('../../assets/images/Onboarding-1.jpg'),
  },
  {
    id: 1,
    titleKey: 'onboarding.slide2.title',
    descriptionKey: 'onboarding.slide2.description',
    image: require('../../assets/images/Onboarding-2.jpg'),
  },
  {
    id: 2,
    titleKey: 'onboarding.slide3.title',
    descriptionKey: 'onboarding.slide3.description',
    image: require('../../assets/images/Onboarding-3.jpg'),
  },
];

const onboardingPages = [0, 1, 2, 3];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<number> | null>(null);
  const { setHasSeenOnboarding } = useSettingStore();

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    router.replace('/(tabs)');
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      return [...prev, categoryId];
    });
  };

  const canProceedToApp = selectedCategories.length >= 3;

  const goToNextPage = () => {
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
    if (item < 3) {
      const slide = imageSlides[item];

      return (
        <ImageBackground source={slide.image} style={{ width }} className="flex-1 overflow-hidden">
          <View className="flex-1 bg-black/30 px-6 pb-12 pt-10 justify-end">
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
                {t('onboarding.button.continue')}
              </Button>
            </View>
          </View>
        </ImageBackground>
      );
    }

    return (
      <ImageBackground
        source={require('../../assets/images/Onboarding-4.jpg')}
        style={{ width }}
        className="flex-1 overflow-hidden"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1 bg-black/30 px-6 pt-16 pb-6"
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

          <View className="flex-row flex-wrap justify-center gap-3 mb-8">
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <Pressable
                  key={category.id}
                  onPress={() => toggleCategory(category.id)}
                  className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${
                    isSelected ? 'bg-black' : 'bg-white/90'
                  }`}
                >
                  <Typography className={isSelected ? 'text-white' : 'text-black'}>
                    {category.icon}
                  </Typography>
                  <Typography
                    variant="caption"
                    className={isSelected ? 'text-white font-medium' : 'text-black font-medium'}
                  >
                    {t(category.titleKey)}
                  </Typography>
                </Pressable>
              );
            })}
          </View>

          <Button
            rounded="full"
            size="lg"
            className="w-full text-white pt-3"
            disabled={!canProceedToApp}
            onPress={completeOnboarding}
          >
            {t('onboarding.button.getStarted')}
          </Button>
        </ScrollView>
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
