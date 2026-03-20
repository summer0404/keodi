import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { ArrowLeft, Filter } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Select } from '@/components/ui/Select';
import Typography from '@/components/ui/Typography';
import PlaceCard from '@/components/ui/PlaceCard';
import AlertScreen from '@/components/ui/AlertScreen';
import { Palette } from '@/constants/theme';
import { favoriteService } from '@/api/favorite';
import type { FavoriteItem, PlaceSortBy } from '@/types/api';
import { buildSortOrder, PLACES_DEFAULT_LIMIT, PLACES_DEFAULT_PAGE } from '@/constants/helper';
import { useTranslation } from 'react-i18next';

const DEFAULT_PLACE_IMAGE = require('@/assets/images/img-cover.webp');

type SegmentKey = 'favorite' | 'history';

const appendUniqueFavorites = (prev: FavoriteItem[], next: FavoriteItem[]) => {
  const existingIds = new Set(prev.map((item) => item.id));
  const filteredNext = next.filter((item) => !existingIds.has(item.id));
  if (filteredNext.length === 0) return prev;
  return [...prev, ...filteredNext];
};

export default function FavoriteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPadding = 16;
  const cardWidth = width - horizontalPadding * 2;

  const [activeSegment, setActiveSegment] = useState<SegmentKey>('favorite');
  const [sortBy, setSortBy] = useState<PlaceSortBy>('distance');
  const [distanceFilter, setDistanceFilter] = useState(5);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [favoritePlaces, setFavoritePlaces] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(PLACES_DEFAULT_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [totalFavorites, setTotalFavorites] = useState(0);

  const requestVersionRef = useRef(0);
  const inFlightPageRef = useRef<number | null>(null);

  const sortByRef = useRef(sortBy);
  const currentPageRef = useRef(currentPage);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const { t } = useTranslation();

  sortByRef.current = sortBy;
  currentPageRef.current = currentPage;
  hasMoreRef.current = hasMore;
  isLoadingRef.current = isLoading;
  isLoadingMoreRef.current = isLoadingMore;

  const sortOptions = useMemo(
    () => [
      { label: t('home.sortByDistance'), value: 'distance' },
      { label: t('home.sortByRating'), value: 'rating' },
      { label: t('home.sortByName'), value: 'name' },
    ],
    []
  );

  const distanceOptions = useMemo(
    () => [
      { label: t('home.radius2km'), value: 2 },
      { label: t('home.radius5km'), value: 5 },
      { label: t('home.radius15km'), value: 15 },
      { label: t('home.radius15kmPlus'), value: 50 },
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Cafe', value: 'cafe' },
      { label: 'Restaurant', value: 'restaurant' },
    ],
    []
  );

  const fetchFavoritesPage = useCallback(
    async (page: number, mode: 'replace' | 'append', requestVersion: number) => {
      if (inFlightPageRef.current === page) {
        return;
      }
      inFlightPageRef.current = page;

      if (mode === 'replace') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await favoriteService.getFavorites({
          page,
          limit: PLACES_DEFAULT_LIMIT,
          sortBy: sortByRef.current,
          sortOrder: buildSortOrder(sortByRef.current),
        });

        if (requestVersion !== requestVersionRef.current) {
          return;
        }

        const receivedFavorites = response.favorites ?? [];
        const totalPages = response.totalPages ?? page;
        const nextHasMore = page < totalPages && receivedFavorites.length > 0;

        setCurrentPage(page);
        setHasMore(nextHasMore);
        setTotalFavorites(response.total ?? 0);

        if (mode === 'replace') {
          setFavoritePlaces(receivedFavorites);
        } else {
          setFavoritePlaces((prev) => appendUniqueFavorites(prev, receivedFavorites));
        }
      } catch {
        if (requestVersion === requestVersionRef.current && mode === 'replace') {
          setFavoritePlaces([]);
          setHasMore(false);
          setTotalFavorites(0);
        }
      } finally {
        inFlightPageRef.current = null;

        if (requestVersion === requestVersionRef.current) {
          if (mode === 'replace') {
            setIsLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
    },
    []
  );

  const reloadFavorites = useCallback(() => {
    if (activeSegment !== 'favorite') {
      return;
    }

    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    inFlightPageRef.current = null;

    setCurrentPage(PLACES_DEFAULT_PAGE);
    setHasMore(true);

    fetchFavoritesPage(PLACES_DEFAULT_PAGE, 'replace', requestVersion);
  }, [activeSegment, fetchFavoritesPage]);

  useEffect(() => {
    reloadFavorites();
  }, [reloadFavorites, sortBy]);

  useFocusEffect(
    useCallback(() => {
      reloadFavorites();
    }, [reloadFavorites])
  );

  const handleLoadMore = useCallback(() => {
    if (
      activeSegment !== 'favorite' ||
      !hasMoreRef.current ||
      isLoadingRef.current ||
      isLoadingMoreRef.current
    ) {
      return;
    }

    fetchFavoritesPage(currentPageRef.current + 1, 'append', requestVersionRef.current);
  }, [activeSegment, fetchFavoritesPage]);

  const renderItem = useCallback(
    ({ item }: { item: FavoriteItem }) => (
      <PlaceCard
        className=""
        style={{ width: cardWidth, elevation: 0 }}
        imageSource={item.featureImageUrl ? { uri: item.featureImageUrl } : DEFAULT_PLACE_IMAGE}
        title={item.name}
        rating={item.rating <= 0 ? 'N/A' : item.rating.toFixed(1)}
        fullAddress={item.fullAddress}
        street={item.street}
        ward={item.ward}
        city={item.city}
        openingHours="Opening hours updating"
        description={item.description?.trim() ?? undefined}
        statusLabel="Open"
        defaultFavorite
        onFavoriteChange={async (nextIsFavorite) => {
          try {
            if (nextIsFavorite) {
              await favoriteService.addFavorite(item.id);
              return true;
            }

            await favoriteService.removeFavorite(item.id);
            setFavoritePlaces((prev) => prev.filter((place) => place.id !== item.id));
            setTotalFavorites((prev) => Math.max(0, prev - 1));
            return true;
          } catch {
            return false;
          }
        }}
      />
    ),
    [cardWidth]
  );

  const itemSeparator = useCallback(() => <View style={{ height: 16 }} />, []);
  const keyExtractor = useCallback((item: FavoriteItem) => item.id, []);

  const listFooter = (
    <>
      {isLoadingMore ? (
        <Typography className="mt-4 text-center text-gray-500">{t('library.loadingFavorites')}</Typography>
      ) : null}
      <View style={{ height: insets.bottom + 100 }} />
    </>
  );

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.replace('/(tabs)')}
          >
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>

          <Typography variant="h4">{t('library.title')}</Typography>
        </View>

        <View className="mt-4 flex-row rounded-xl bg-[#EBEBEE] p-1">
          <Pressable
            className={`flex-1 items-center rounded-lg py-2 ${
              activeSegment === 'favorite' ? 'bg-white' : 'bg-transparent'
            }`}
            onPress={() => setActiveSegment('favorite')}
          >
            <Typography className={activeSegment === 'favorite' ? 'text-black' : 'text-gray-500'}>
              {t('library.favorite')}
            </Typography>
          </Pressable>

          <Pressable
            className={`flex-1 items-center rounded-lg py-2 ${
              activeSegment === 'history' ? 'bg-white' : 'bg-transparent'
            }`}
            onPress={() => setActiveSegment('history')}
          >
            <Typography className={activeSegment === 'history' ? 'text-black' : 'text-gray-500'}>
              {t('library.history')}
            </Typography>
          </Pressable>
        </View>

        <View className="mt-4 flex-row items-center gap-2">
          <Filter size={18} color={Palette.black} strokeWidth={2} />
          <Select
            value={sortBy}
            onChange={(value) => {
              if (typeof value === 'string') {
                setSortBy(value as PlaceSortBy);
              }
            }}
            options={sortOptions}
            className="flex-1"
          />
          <Select
            value={distanceFilter}
            onChange={(value) => {
              if (typeof value === 'number') {
                setDistanceFilter(value);
              }
            }}
            options={distanceOptions}
            className="flex-1"
          />
          <Select
            value={categoryFilter}
            onChange={(value) => {
              if (typeof value === 'string') {
                setCategoryFilter(value);
              }
            }}
            options={categoryOptions}
            className="flex-1"
          />
        </View>

        {activeSegment === 'favorite' ? (
          <View className="mt-5 flex-row items-center justify-between">
            <Typography variant="h5">{t('library.yourFavoritePlaces')}</Typography>
            <View className="rounded-full bg-red-500 px-3 py-2">
              <Typography variant='caption-sm' className='text-white font-bold'>{totalFavorites} places</Typography>
            </View>
          </View>
        ) : null}
      </View>

      {activeSegment === 'history' ? (
        <View className="flex-1 px-4 pt-8">
          <Typography variant="h4" className="text-center text-black">
            {t('library.history')}
          </Typography>
          <Typography className="mt-2 text-center text-gray-500">
            History screen will be implemented next.
          </Typography>
        </View>
      ) : (
        <FlatList
          data={favoritePlaces}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={itemSeparator}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          updateCellsBatchingPeriod={100}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            isLoading ? (
              <Typography className="px-4 pt-3 text-gray-500">{t('library.loadingFavorites')}</Typography>
            ) : (
              <View className="px-4 pt-3">
                <AlertScreen
                  imageSrc={require('@/assets/images/404.png')}
                  heading={t('library.noFavorites')}
                  description={t('library.noFavoritesDescription')}
                  primaryButtonText={t('library.goToHome')}
                  primaryButtonAction={() => router.replace('/(tabs)')}
                />
              </View>
            )
          }
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
          }}
        />
      )}
    </View>
  );
}
