import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import {
  ArrowLeft,
  Clock,
  TrendingUp,
  Circle,
  UtensilsCrossed,
  Hotel,
  Fuel,
  Coffee,
  ShoppingBag,
  Wine,
  Dumbbell,
  TreePine,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
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
import type { TrendingPlaceItem } from '@/types/api';
import { useTranslation } from 'react-i18next';

const RECENT_SEARCHES_KEY = '@keodi_recent_searches';
const MAX_RECENT_SEARCHES = 5;

const DEFAULT_RADIUS = 5;
const DEFAULT_SORT_BY = 'distance';
const DEFAULT_SORT_ORDER = 'asc';

interface FilterCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  keyword: string;
}

const FILTER_CATEGORIES: FilterCategory[] = [
  { id: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed, keyword: 'restaurant' },
  { id: 'hotel', label: 'Hotels', icon: Hotel, keyword: 'hotel' },
  { id: 'gas', label: 'Gas', icon: Fuel, keyword: 'gas station' },
  { id: 'coffee', label: 'Coffee', icon: Coffee, keyword: 'coffee' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, keyword: 'shopping' },
  { id: 'bar', label: 'Bars', icon: Wine, keyword: 'bar' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, keyword: 'gym' },
  { id: 'park', label: 'Parks', icon: TreePine, keyword: 'park' },
];

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

  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [minRating, setMinRating] = useState<number>(0);
  const [openFilter, setOpenFilter] = useState<'all' | 'open'>('all');

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(false);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingPlaces, setTrendingPlaces] = useState<TrendingPlaceItem[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);

  const RADIUS_OPTIONS = useMemo(
    () => [
      { label: '2 km', value: 2 },
      { label: '5 km', value: 5 },
      { label: '10 km', value: 10 },
      { label: '15 km', value: 15 },
      { label: '50 km', value: 50 },
    ],
    []
  );

  const RATING_OPTIONS = useMemo(
    () => [
      { label: t('search.ratingAll'), value: 0 },
      { label: '3.0+', value: 3 },
      { label: '3.5+', value: 3.5 },
      { label: '4.0+', value: 4 },
      { label: '4.5+', value: 4.5 },
    ],
    [t]
  );

  const OPEN_OPTIONS = useMemo(
    () => [
      { label: t('search.openAll'), value: 'all' },
      { label: t('search.openNow'), value: 'open' },
    ],
    [t]
  );

  const fetchLocation = useCallback(async () => {
    setIsLocationLoading(true);
    setLocationError(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationError(true);
        setCoords(null);
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError(true);
      setCoords(null);
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

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
        if (active) setTrendingPlaces(data);
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
          sortBy: DEFAULT_SORT_BY,
          sortOrder: DEFAULT_SORT_ORDER,
          minRating: String(minRating),
          openFilter,
        },
      } as any);
    },
    [coords, radius, minRating, openFilter, router]
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

  if (locationError && !coords) {
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
        <View className="flex-1 items-center justify-center px-4">
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="search.locationRequired"
            description="search.locationRequiredDesc"
            primaryButtonText="search.retryLocation"
            primaryButtonAction={fetchLocation}
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
            placeholder={t('search.placeholder')}
          />
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
              <Typography variant="h5" className="font-bold">
                {t('search.categories')}
              </Typography>
              <Pressable>
                <Typography className="text-blue-600">{t('search.viewAll')}</Typography>
              </Pressable>
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
                <Typography className="mb-1.5 font-semibold">
                  {t('search.distance')}
                </Typography>
                <Select
                  value={radius}
                  onChange={(v) => {
                    if (typeof v === 'number') setRadius(v);
                  }}
                  options={RADIUS_OPTIONS}
                />
              </View>
              <View className="flex-1">
                <Typography className="mb-1.5 font-semibold">
                  {t('search.rating')}
                </Typography>
                <Select
                  value={minRating}
                  onChange={(v) => {
                    if (typeof v === 'number') setMinRating(v);
                  }}
                  options={RATING_OPTIONS}
                />
              </View>
            </View>

            <View className="mt-3 flex-row gap-3">
              <View className="flex-1">
                <Typography className="mb-1.5 font-semibold">{t('search.open')}</Typography>
                <Select
                  value={openFilter}
                  onChange={(v) => {
                    if (typeof v === 'string') setOpenFilter(v as 'all' | 'open');
                  }}
                  options={OPEN_OPTIONS}
                />
              </View>
              <View className="flex-1" />
            </View>
          </View>
        ) : null}

        <View className="mt-5 px-4">
          <Typography variant="h5" className="font-bold">
            {t('search.recent')}
          </Typography>

          {recentSearches.length === 0 ? (
            <Typography className="mt-2 text-gray-400">{t('search.noRecent')}</Typography>
          ) : (
            <View className="mt-2">
              {recentSearches.map((term, index) => (
                <Pressable
                  key={`${term}-${index}`}
                  className="flex-row items-center gap-3 py-2.5"
                  onPress={() => handleRecentPress(term)}
                >
                  <Clock size={18} color={Palette.grey} strokeWidth={2} />
                  <Typography className="flex-1" numberOfLines={1}>
                    {term}
                  </Typography>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View className="mt-5 px-4">
          <Typography variant="h5" className="font-bold">
            {t('search.youMightAlsoLike')}
          </Typography>

          {isTrendingLoading ? (
            <Typography className="mt-2 text-gray-400">{t('search.loadingTrending')}</Typography>
          ) : trendingPlaces.length === 0 ? (
            <Typography className="mt-2 text-gray-400">{t('search.noTrending')}</Typography>
          ) : (
            <View className="mt-2">
              {trendingPlaces.map((place, index) => (
                <Pressable
                  key={place.id}
                  className="flex-row items-center gap-3 py-2.5"
                  onPress={() => handleTrendingPress(place)}
                >
                  {index % 2 === 0 ? (
                    <TrendingUp size={18} color="#E03131" strokeWidth={2} />
                  ) : (
                    <Circle size={18} color={Palette.black} strokeWidth={2} />
                  )}
                  <Typography className="flex-1" numberOfLines={1}>
                    {place.name}
                  </Typography>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
