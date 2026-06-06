import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { ArrowLeft, Clock, TrendingUp, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Typography from '@/components/ui/Typography';
import SearchBar from '@/components/ui/SearchBar';
import { Select } from '@/components/ui/Select';
import AlertScreen from '@/components/ui/AlertScreen';
import { Palette } from '@/constants/theme';
import { placesService } from '@/api/places';
import { usePlacesStore } from '@/store/usePlacesStore';
import { useLocationStore } from '@/store/useLocationStore';
import type { PlaceSortBy, TrendingPlaceItem } from '@/types/api';
import { useTranslation } from 'react-i18next';
import {
  buildSortOrder,
  getSortOptions,
  getRadiusOptions,
  DEFAULT_RADIUS,
  DEFAULT_SORT_BY,
  MAX_RECENT_SEARCHES,
  FILTER_CATEGORIES,
} from '@/constants/helper';
import { Button } from '@/components/ui/Button';
import { useSettingStore } from '@/store/useSettingStore';

const RECENT_SEARCHES_KEY = '@keodi_recent_searches';

const getRecentSearches = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentSearch = async (term: string): Promise<string[]> => {
  const current = await getRecentSearches();
  const filtered = current.filter((s) => s.toLowerCase() !== term.toLowerCase());
  const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
  await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  return updated;
};

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const upsertPlace = usePlacesStore((s) => s.upsertPlace);
  const coords = useLocationStore((s) => s.coords);
  const isLocationLoading = useLocationStore((s) => s.isLocationLoading);
  const locationPermissionDenied = useLocationStore((s) => s.locationPermissionDenied);
  const ensureLocation = useLocationStore((s) => s.ensureLocation);
  const sortOptions = useMemo(() => getSortOptions(t), [t]);
  const radiusOptions = useMemo(() => getRadiusOptions(t), [t]);

  const settingRadius = useSettingStore((s) => s.defaultRadius);

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false);
  const [radius, setRadius] = useState(settingRadius ?? DEFAULT_RADIUS);
  const [sortBy, setSortBy] = useState<PlaceSortBy>(DEFAULT_SORT_BY);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<TrendingPlaceItem[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);

  useEffect(() => {
    void ensureLocation();
  }, [ensureLocation]);

  useEffect(() => {
    setRadius(settingRadius ?? DEFAULT_RADIUS);
  }, [settingRadius]);

  useFocusEffect(
    useCallback(() => {
      getRecentSearches().then(setRecentSearches);
    }, [])
  );

  useEffect(() => {
    let active = true;
    setIsTrendingLoading(true);
    placesService
      .getTrendingPlaces()
      .then((data) => {
        if (active) setTrendingPlaces(data.slice(0, 10));
      })
      .catch(() => {
        if (active) setTrendingPlaces([]);
      })
      .finally(() => {
        if (active) setIsTrendingLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const executeSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (!trimmed || !coords) return;

      const updated = await saveRecentSearch(trimmed);
      setRecentSearches(updated);

      router.push({
        pathname: '/(tabs)/search/results',
        params: {
          search: trimmed,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          radius: String(radius),
          sortBy,
          sortOrder: buildSortOrder(sortBy),
          ai: isAIMode ? '1' : '0',
        },
      } as any);
    },
    [coords, radius, sortBy, isAIMode, router]
  );

  const handleCategoryPress = useCallback(
    (keyword: string) => {
      setQuery(keyword);
      executeSearch(keyword);
    },
    [executeSearch]
  );

  const handleRecentPress = useCallback(
    (term: string) => {
      setQuery(term);
      executeSearch(term);
    },
    [executeSearch]
  );

  const handleClearRecentPress = useCallback(
    async (term: string) => {
      const updated = recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase());
      setRecentSearches(updated);
      try {
        await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {
        // Keep UI state even if persistence fails.
      }
    },
    [recentSearches]
  );

  const handleTrendingPress = useCallback(
    async (item: TrendingPlaceItem) => {
      try {
        const fullPlace = await placesService.getPlaceById(item.id);
        upsertPlace(fullPlace);
      } catch {
        upsertPlace({
          ...item,
          fromGoogle: false,
          ownerId: null,
          ward: null,
          street: null,
          city: null,
          countryCode: null,
          createdAt: '',
          updatedAt: '',
          distance: 0,
          has_attributes: 0,
          isFavorite: false,
        });
      }
      router.push(`/place/${item.id}` as any);
    },
    [router, upsertPlace]
  );

  if (locationPermissionDenied && !coords) {
    return (
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top + 12 }}>
        <View className="px-4">
          <View className="flex-row items-center gap-3">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.replace('/(tabs)')}
            >
              <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
            </Pressable>
            <Typography variant="h4">{t('search.title')}</Typography>
          </View>
        </View>
        <View className="flex-1 justify-center px-4">
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="search.locationRequired"
            description="search.locationRequiredDesc"
            primaryButtonText="button.retry"
            primaryButtonAction={() => {
              void ensureLocation({ force: true });
            }}
          />
        </View>
      </View>
    );
  }

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
            onPress={() => router.replace('/(tabs)')}
          >
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>
          <Typography variant="h4">{t('search.title')}</Typography>
        </View>

        <View className="mt-4">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => executeSearch(query)}
            onSettingsPress={() => setShowFilters((prev) => !prev)}
            settingsActive={showFilters}
            showAI={true}
            isAIActive={isAIMode}
            onAIPress={() => setIsAIMode((prev) => !prev)}
            placeholder={t('search.title')}
          />
          <Typography className="mt-3 text-blue-500">{t('search.searchAlert')}</Typography>
        </View>

        {isLocationLoading ? (
          <Typography className="mt-3 text-gray-500">{t('search.loadingLocation')}</Typography>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showFilters ? (
          <View className="px-4">
            <View className="flex-row items-center justify-between">
              <Typography variant="h5">{t('search.categories')}</Typography>
              <Button
                onPress={() => {
                  setRadius(DEFAULT_RADIUS);
                  setSortBy(DEFAULT_SORT_BY);
                  setShowFilters(false);
                }}
                variant="ghost"
                className="flex-row items-center gap-1"
              >
                <X size={18} color={Palette.grey} strokeWidth={2} />
              </Button>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-3"
              contentContainerStyle={{ gap: 16 }}
            >
              {FILTER_CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                return (
                  <Pressable
                    key={cat.id}
                    className="items-center"
                    style={{ width: 64 }}
                    onPress={() => handleCategoryPress(cat.keyword)}
                  >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-[#3B5BDB]">
                      <IconComp size={24} color="white" strokeWidth={2} />
                    </View>
                    <Typography className="mt-1.5 text-center text-xs" numberOfLines={1}>
                      {cat.label}
                    </Typography>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <Typography variant="h5" className="mb-1.5">
                  {t('search.distance')}
                </Typography>
                <Select
                  value={radius}
                  onChange={(value) => {
                    if (typeof value === 'number') setRadius(value);
                  }}
                  options={radiusOptions}
                />
              </View>
              <View className="flex-1 mb-4">
                <Typography variant="h5" className="mb-1.5">
                  {t('search.sortBy')}
                </Typography>
                <Select
                  value={sortBy}
                  onChange={(value) => {
                    if (typeof value === 'string') setSortBy(value as PlaceSortBy);
                  }}
                  options={sortOptions}
                />
              </View>
            </View>
          </View>
        ) : null}

        <View className="px-4">
          {recentSearches.length > 0 && (
            <>
              <Typography variant="h5">{t('search.recent')}</Typography>
              <View className="mt-2 justify-between gap-2">
                {recentSearches.map((term, index) => (
                  <View
                    key={`${term}-${index}`}
                    className="flex-row items-center justify-between gap-2"
                  >
                    <Pressable
                      className="flex-1 flex-row items-center gap-3 py-2.5"
                      onPress={() => handleRecentPress(term)}
                    >
                      <Clock size={18} color={Palette.grey} strokeWidth={2} />
                      <Typography className="flex-1" numberOfLines={1}>
                        {term}
                      </Typography>
                    </Pressable>
                    <Pressable
                      className="h-8 w-8 items-center justify-center"
                      onPress={() => handleClearRecentPress(term)}
                    >
                      <X size={16} color={Palette.grey} strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {trendingPlaces.length === 0 ? null : (
          <View className="mt-5 px-4">
            <Typography variant="h5">{t('search.trending')}</Typography>
            <View className="mt-2">
              {trendingPlaces.map((place, index) => (
                <Pressable
                  key={place.id}
                  className="flex-row items-center gap-3 py-2.5"
                  onPress={() => handleTrendingPress(place)}
                >
                  <TrendingUp size={18} color={Palette.red} strokeWidth={2} />
                  <Typography className="flex-1" numberOfLines={1}>
                    {place.name}
                  </Typography>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
