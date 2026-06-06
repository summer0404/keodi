import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
  ScrollView,
  Image,
  Text,
} from 'react-native';
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
import type { ChatSearchResponse } from '@/types/api';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  DEFAULT_PLACE_IMAGE,
  formatDistance,
  formatOpeningHoursLabel,
  getPrimaryImageUrl,
  isPlaceOpenNow,
  parseMarkdownDisplay,
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

const renderMarkdownMessage = (message: string) => {
  const displayLines = parseMarkdownDisplay(message);

  return displayLines.map((line, index) => {
    if (line.type === 'break') {
      return (
        <Text key={`break-${index}`} className="text-gray-800 leading-5">
          {'\n\n'}
        </Text>
      );
    }

    const nextLine = displayLines[index + 1];
    const separator = nextLine?.type === 'break' ? '' : '\n';

    return (
      <Text key={`line-${index}`} className="text-gray-800 leading-5">
        {line.prefix}
        {line.parts.map((part, partIndex) =>
          part.type === 'bold' ? (
            <Text key={`bold-${index}-${partIndex}`} className="font-montserrat-semibold">
              {part.value}
            </Text>
          ) : (
            <Text key={`text-${index}-${partIndex}`}>{part.value}</Text>
          )
        )}
        {separator}
      </Text>
    );
  });
};

//mock data for AI search response, to be removed when backend is ready
// const getAIPlacesResponse = async (): Promise<ChatSearchResponse> => {
//   // return placesService.searchAIPlaces({
//   //   message: searchTerm,
//   //   latitude,
//   //   longitude,
//   // });

//   return {
//     message:
//       'Dưới đây là một số nhà hàng lãng mạn gần bạn với đánh giá cao: \n 1. **AN NA Restaurant** (Xếp hạng 5.0 - Cách 2.27km) \n 2. **QUÁN CƠM GÀ PHÁT ĐẠT** (Xếp hạng 4.9 - Cách 2.03km) \n 3. **Tiệm nướng Nọng** (Xếp hạng 4.8 - Cách 2.12km) \n Bạn có muốn mình cung cấp thêm thông tin chi tiết về bất kỳ nhà hàng nào không?',
//     places: [
//       {
//         id: 'mock-ai-place-1',
//         fromGoogle: false,
//         name: 'The Cozy Corner Cafe',
//         description: 'A calm place for coffee, work, and small conversations.',
//         status: undefined,
//         rating: 4.8,
//         googleMapLink: null,
//         website: null,
//         phoneNumber: null,
//         featureImageUrl: null,
//         ownerId: null,
//         latitude: 10.7769,
//         longitude: 106.7009,
//         fullAddress: '123 Nguyen Hue, District 1, Ho Chi Minh City',
//         ward: 'Ward 1',
//         street: 'Nguyen Hue',
//         city: 'Ho Chi Minh City',
//         countryCode: 'VN',
//         createdAt: '2026-06-07T00:00:00.000Z',
//         updatedAt: '2026-06-07T00:00:00.000Z',
//         distance: 0.8,
//         has_attributes: 1,
//         isFavorite: false,
//         openingHours: [],
//         categories: [
//           { id: 'cat-cafe', name: 'Cafe', isMain: true },
//           { id: 'cat-work', name: 'Work Friendly', isMain: false },
//         ],
//       },
//       {
//         id: 'mock-ai-place-2',
//         fromGoogle: false,
//         name: 'Riverside Bites',
//         description: 'Casual food spot with a riverside vibe and easy access.',
//         status: undefined,
//         rating: 4.6,
//         googleMapLink: null,
//         website: null,
//         phoneNumber: null,
//         featureImageUrl: null,
//         ownerId: null,
//         latitude: 10.7805,
//         longitude: 106.7054,
//         fullAddress: '45 Ton Duc Thang, District 1, Ho Chi Minh City',
//         ward: 'Ward Ben Nghe',
//         street: 'Ton Duc Thang',
//         city: 'Ho Chi Minh City',
//         countryCode: 'VN',
//         createdAt: '2026-06-07T00:00:00.000Z',
//         updatedAt: '2026-06-07T00:00:00.000Z',
//         distance: 1.3,
//         has_attributes: 1,
//         isFavorite: false,
//         openingHours: [],
//         categories: [
//           { id: 'cat-food', name: 'Food', isMain: true },
//           { id: 'cat-friend', name: 'Friends', isMain: false },
//         ],
//       },
//     ],
//   };
// };

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const cacheNearbyPlaces = usePlacesStore((s) => s.cacheNearbyPlaces);
  const upsertPlace = usePlacesStore((s) => s.upsertPlace);
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
    minRating: string;
    ai: string;
  }>();

  const searchTerm = params.search ?? '';
  const latitude = Number(params.latitude) || 0;
  const longitude = Number(params.longitude) || 0;
  const radius = Number(params.radius) || 5;
  const sortBy = (params.sortBy as PlaceSortBy) || 'distance';
  const sortOrder = (params.sortOrder as 'asc' | 'desc') || 'asc';
  const minRating = Number(params.minRating) || 0;
  const isAiMode = params.ai === '1';

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiQuotaExceeded, setIsAiQuotaExceeded] = useState(false);

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
        let received: PlaceItem[] = [];
        let totalPages = page;
        let message: string | null = null;

        if (isAiMode) {
          // mock data for AI search response, to be removed when backend is ready
          // const response = await getAIPlacesResponse();
          const response = await placesService.searchAIPlaces({
            message: searchTerm,
            latitude,
            longitude,
          });
          received = response.places ?? [];
          message = response.message ?? '';
          totalPages = 1;
        } else {
          const response = await placesService.searchPlaces({
            search: searchTerm,
            latitude,
            longitude,
            radius,
            sortBy,
            sortOrder,
            page,
            limit: DEFAULT_LIMIT,
          });
          received = response.places ?? [];
          totalPages = response.totalPages ?? page;
        }

        if (requestVersion !== requestVersionRef.current) return;

        cacheNearbyPlaces(received);
        const nextHasMore = !isAiMode && page < totalPages && received.length > 0;

        setCurrentPage(page);
        setHasMore(nextHasMore);
        if (isAiMode) {
          setAiMessage(message);
        }
        setIsAiQuotaExceeded(false);

        if (mode === 'replace') {
          setPlaces(received);
          if (received.length === 0) setIsNotFound(true);
        } else {
          setPlaces((prev) => appendUniquePlaces(prev, received));
        }
      } catch (error) {
        if (requestVersion !== requestVersionRef.current) return;

        const status = isAxiosError(error) ? error.response?.status : undefined;
        const responseMessage = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;

        if (isAiMode && status === 429 && responseMessage === 'AI_SEARCH_DAILY_QUOTA_EXHAUSTED') {
          setIsAiQuotaExceeded(true);
          setPlaces([]);
          setHasMore(false);
          setAiMessage(null);
        } else if (status === 404) {
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
    [searchTerm, latitude, longitude, radius, sortBy, sortOrder, isAiMode]
  );

  useEffect(() => {
    if (!searchTerm) return;
    requestVersionRef.current += 1;
    const version = requestVersionRef.current;
    inFlightPageRef.current = null;
    setCurrentPage(DEFAULT_PAGE);
    setHasMore(!isAiMode);
    setAiMessage(null);
    setIsAiQuotaExceeded(false);
    fetchPage(DEFAULT_PAGE, 'replace', version);
  }, [searchTerm, fetchPage, isAiMode]);

  const handleLoadMore = useCallback(() => {
    if (isAiMode) return;
    if (!hasMoreRef.current || isLoadingRef.current || isLoadingMoreRef.current) return;
    fetchPage(currentPageRef.current + 1, 'append', requestVersionRef.current);
  }, [fetchPage, isAiMode]);

  // I want to show all results as they are without filtering/sorting
  const displayedPlaces = places;

  const renderItem = useCallback(
    ({ item }: { item: PlaceItem }) => {
      const openingHoursLabel = formatOpeningHoursLabel(item.openingHours, t);
      const hasOpeningHours = (item.openingHours?.length ?? 0) > 0;
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
        <Pressable
          onPress={() => {
            upsertPlace(item);
            router.push(`/place/${item.id}` as any);
          }}
        >
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
            showStatusChip={hasOpeningHours}
            tags={tags}
            defaultFavorite={!!item.isFavorite}
            onFavoriteChange={handleFavoriteChange}
          />
        </Pressable>
      );
    },
    [cardWidth, router, setPlaceFavorite, t, upsertPlace]
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
      ) : isAiQuotaExceeded ? (
        <View className="flex-1 px-4">
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="search.aiQuotaExceeded"
            description="search.aiQuotaExceededDesc"
            primaryButtonText="search.clearSearch"
            primaryButtonAction={() => router.back()}
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
          ListHeaderComponent={
            isAiMode && aiMessage ? (
              <View className="py-4">
                <View className="flex-row items-center gap-3 rounded-xl bg-purple-50 p-4">
                  <View className="h-36 w-36 shrink-0 items-center justify-center overflow-hidden">
                    <Image
                      source={require('@/assets/images/AI.png')}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                  </View>
                  <View className="flex-1 pr-1">
                    <Typography className="text-gray-800">
                      {renderMarkdownMessage(aiMessage)}
                    </Typography>
                  </View>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
        />
      )}
    </View>
  );
}
