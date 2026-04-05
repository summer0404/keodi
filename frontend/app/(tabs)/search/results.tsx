import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isAxiosError } from 'axios';
import Typography from '@/components/ui/Typography';
import PlaceCard from '@/components/ui/PlaceCard';
import AlertScreen from '@/components/ui/AlertScreen';
import { Palette } from '@/constants/theme';
import { placesService } from '@/api/places';
import { favoriteService } from '@/api/favorite';
import { usePlacesStore } from '@/store/usePlacesStore';
import type { PlaceItem, PlaceSortBy } from '@/types/api';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_PLACE_IMAGE,
  formatDistance,
  formatOpeningHoursLabel,
  getPrimaryImageUrl,
  isPlaceOpenNow,
} from '@/constants/helper';
import { useTranslation } from 'react-i18next';

const appendUniquePlaces = (prev: PlaceItem[], next: PlaceItem[]) => {
  const existingIds = new Set(prev.map((p) => p.id));
  const filtered = next.filter((p) => !existingIds.has(p.id));
  if (filtered.length === 0) return prev;
  return [...prev, ...filtered];
};

const updateFavoriteInPlaces = (places: PlaceItem[], placeId: string, isFavorite: boolean) =>
  places.map((p) => (p.id === placeId ? { ...p, isFavorite } : p));

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const setPlaceFavorite = usePlacesStore((s) => s.setPlaceFavorite);
  const horizontalPadding = 16;
  const cardWidth = width - horizontalPadding * 2;

  const params = useLocalSearchParams<{
    search: string;
    latitude: string;
    longitude: string;
    radius: string;
    sortBy: string;
    sortOrder: string;
    mode: string;
    minRating: string;
    openFilter: string;
  }>();

  const searchTerm = params.search ?? '';
  const latitude = Number(params.latitude) || 0;
  const longitude = Number(params.longitude) || 0;
  const radius = Number(params.radius) || 5;
  const sortBy = (params.sortBy as PlaceSortBy) || 'distance';
  const sortOrder = (params.sortOrder as 'asc' | 'desc') || 'asc';
  const searchMode = params.mode === 'contextual' ? 'contextual' : 'keyword';
  const minRating = Number(params.minRating) || 0;
  const openFilter = params.openFilter ?? 'all';

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const requestVersionRef = useRef(0);
  const inFlightPageRef = useRef<number | null>(null);
  const currentPageRef = useRef(currentPage);
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);

  currentPageRef.current = currentPage;
  hasMoreRef.current = hasMore;
  isLoadingRef.current = isLoading;
  isLoadingMoreRef.current = isLoadingMore;

  const applyClientFilters = useCallback(
    (items: PlaceItem[]) => {
      let filtered = items;
      if (minRating > 0) {
        filtered = filtered.filter((p) => p.rating >= minRating);
      }
      if (openFilter === 'open') {
        filtered = filtered.filter((p) => isPlaceOpenNow(p.openingHours));
      }
      return filtered;
    },
    [minRating, openFilter]
  );

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append', requestVersion: number) => {
      if (inFlightPageRef.current === page) return;
      inFlightPageRef.current = page;

      if (mode === 'replace') {
        setIsLoading(true);
        setIsNotFound(false);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await placesService.searchPlaces({
          search: searchTerm,
          latitude,
          longitude,
          radius,
          sortBy,
          sortOrder,
          page,
          limit: DEFAULT_LIMIT,
          mode: searchMode,
        });

        if (requestVersion !== requestVersionRef.current) return;

        const received = response.places ?? [];
        const totalPages = response.totalPages ?? page;
        const nextHasMore = page < totalPages && received.length > 0;

        setCurrentPage(page);
        setHasMore(nextHasMore);

        if (mode === 'replace') {
          setPlaces(received);
          if (received.length === 0) setIsNotFound(true);
        } else {
          setPlaces((prev) => appendUniquePlaces(prev, received));
        }
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) return;

        if (isAxiosError(error) && error.response?.status === 404) {
          if (mode === 'replace') {
            setPlaces([]);
            setIsNotFound(true);
          }
        } else if (mode === 'replace') {
          setPlaces([]);
          setHasMore(false);
        }
      } finally {
        inFlightPageRef.current = null;
        if (requestVersion === requestVersionRef.current) {
          if (mode === 'replace') setIsLoading(false);
          else setIsLoadingMore(false);
        }
      }
    },
    [searchTerm, latitude, longitude, radius, sortBy, sortOrder, searchMode]
  );

  useEffect(() => {
    if (!searchTerm) return;
    requestVersionRef.current += 1;
    const version = requestVersionRef.current;
    inFlightPageRef.current = null;
    setCurrentPage(DEFAULT_PAGE);
    setHasMore(true);
    fetchPage(DEFAULT_PAGE, 'replace', version);
  }, [searchTerm, fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (!hasMoreRef.current || isLoadingRef.current || isLoadingMoreRef.current) return;
    fetchPage(currentPageRef.current + 1, 'append', requestVersionRef.current);
  }, [fetchPage]);

  const displayedPlaces = applyClientFilters(places);

  const renderItem = useCallback(
    ({ item }: { item: PlaceItem }) => {
      const openingHoursLabel = formatOpeningHoursLabel(item.openingHours, t);
      const isOpen = isPlaceOpenNow(item.openingHours);
      const primaryImageUrl = getPrimaryImageUrl(item.featureImageUrl);
      const tags = (item.categories ?? []).slice(0, 4).map((c) => ({
        label: c.name,
        active: c.isMain,
      }));

      const handleFavoriteChange = async (nextIsFavorite: boolean) => {
        try {
          if (nextIsFavorite) {
            await favoriteService.addFavorite(item.id);
          } else {
            await favoriteService.removeFavorite(item.id);
          }
          setPlaces((prev) => updateFavoriteInPlaces(prev, item.id, nextIsFavorite));
          setPlaceFavorite(item.id, nextIsFavorite);
          return true;
        } catch (error) {
          if (nextIsFavorite && isAxiosError(error) && error.response?.status === 409) {
            setPlaces((prev) => updateFavoriteInPlaces(prev, item.id, true));
            setPlaceFavorite(item.id, true);
            return true;
          }
          return false;
        }
      };

      return (
        <Pressable onPress={() => router.push(`/place/${item.id}` as any)}>
          <PlaceCard
            style={{ width: cardWidth, elevation: 0 }}
            imageSource={primaryImageUrl ? { uri: primaryImageUrl } : DEFAULT_PLACE_IMAGE}
            title={item.name}
            rating={item.rating <= 0 ? 'N/A' : item.rating.toFixed(1)}
            distanceLabel={formatDistance(item.distance)}
            fullAddress={item.fullAddress}
            street={item.street}
            ward={item.ward}
            city={item.city}
            openingHours={openingHoursLabel}
            description={item.description?.trim()}
            statusLabel={isOpen ? t('home.open') : t('home.close')}
            isOpen={isOpen}
            tags={tags}
            defaultFavorite={!!item.isFavorite}
            onFavoriteChange={handleFavoriteChange}
          />
        </Pressable>
      );
    },
    [cardWidth, router, setPlaceFavorite, t]
  );

  const itemSeparator = useCallback(() => <View style={{ height: 16 }} />, []);
  const keyExtractor = useCallback((item: PlaceItem) => item.id, []);

  const listFooter = (
    <>
      {isLoadingMore ? (
        <Typography className="mt-4 text-center text-gray-500">
          {t('search.loadingMore')}
        </Typography>
      ) : null}
      <View style={{ height: insets.bottom + 110 }} />
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
            className="h-10 w-10 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
          </Pressable>
          <Typography variant="h4" className="flex-1" numberOfLines={1}>
            {searchTerm ? `"${searchTerm}"` : t('search.results')}
          </Typography>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Video
            source={require('@/assets/images/loading.mp4')}
            style={{ width: 700, height: 700 }}
            shouldPlay
            isLooping
            isMuted
            resizeMode={ResizeMode.CONTAIN}
          />
        </View>
      ) : isNotFound || displayedPlaces.length === 0 ? (
        <View className="flex-1 px-4">
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="search.noResults"
            description="search.noResultsDesc"
            primaryButtonText="search.clearSearch"
            primaryButtonAction={() => router.back()}
          />
        </View>
      ) : (
        <FlatList
          data={displayedPlaces}
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
          contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        />
      )}
    </View>
  );
}
