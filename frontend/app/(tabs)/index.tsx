import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { MapPin, MoveDiagonal, ArrowUpDown } from 'lucide-react-native';
import Typography from '@/components/ui/Typography';
import PlaceCard from '@/components/ui/PlaceCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { placesService } from '@/api/places';
import { Select } from '@/components/ui/Select';
import type { PlaceItem, PlaceSortBy } from '@/types/api';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  normalizeDistrictLabel,
  normalizeCityLabel,
  extractWardCityFromFormattedAddress,
  buildSortOrder,
  formatDistance,
  formatOpeningHoursLabel,
  getPrimaryImageUrl,
  isPlaceOpenNow,
  DEFAULT_AVATAR_SOURCE,
  DEFAULT_PLACE_IMAGE,
  getSortOptions,
  getRadiusOptions,
  DEFAULT_RADIUS,
  DEFAULT_SORT_BY,
} from '@/constants/helper';
import { useTranslation } from 'react-i18next';
import { Palette } from '@/constants/theme';
import AlertScreen from '@/components/ui/AlertScreen';
import { favoriteService } from '@/api/favorite';
import { usePlacesStore } from '@/store/usePlacesStore';
import { useLocationStore } from '@/store/useLocationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingStore } from '@/store/useSettingStore';
import { isAxiosError } from 'axios';

const appendUniquePlaces = (prev: PlaceItem[], next: PlaceItem[]) => {
  const existingIds = new Set(prev.map((item) => item.id));
  const filteredNext = next.filter((item) => !existingIds.has(item.id));
  // No need to create a new array if there are no new items, avoid unnecessary FlatList re-render
  if (filteredNext.length === 0) return prev;
  return [...prev, ...filteredNext];
};

const updateFavoriteInPlaces = (places: PlaceItem[], placeId: string, isFavorite: boolean) =>
  places.map((place) => (place.id === placeId ? { ...place, isFavorite } : place));

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const cacheNearbyPlaces = usePlacesStore((s) => s.cacheNearbyPlaces);
  const setLastNearbyParams = usePlacesStore((s) => s.setLastNearbyParams);
  const setPlaceFavorite = usePlacesStore((s) => s.setPlaceFavorite);
  const upsertPlace = usePlacesStore((s) => s.upsertPlace);
  const coords = useLocationStore((s) => s.coords);
  const isLocationLoading = useLocationStore((s) => s.isLocationLoading);
  const locationPermissionDenied = useLocationStore((s) => s.locationPermissionDenied);
  const ensureLocation = useLocationStore((s) => s.ensureLocation);
  const me = useAuthStore((s) => s.me);
  const meFetchedAt = useAuthStore((s) => s.meFetchedAt);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const sortOptions = useMemo(() => getSortOptions(t), [t]);
  const radiusOptions = useMemo(() => getRadiusOptions(t), [t]);
  const horizontalPadding = 20;
  const cardWidth = width - horizontalPadding * 2;
  const username = me?.username?.trim() || 'bạn';
  const avatarUri = me?.pictureUrl?.trim();

  const [locationLabel, setLocationLabel] = useState(t('home.loadingLocation'));
  const [sortBy, setSortBy] = useState<PlaceSortBy>(DEFAULT_SORT_BY);
  const [activeTab, setActiveTab] = useState<'nearby' | 'forYou'>('nearby');
  const settingRadius = useSettingStore((s) => s.defaultRadius);
  const [radius, setRadius] = useState(settingRadius ?? DEFAULT_RADIUS);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceItem[]>([]);
  const [forYouPlaces, setForYouPlaces] = useState<PlaceItem[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [isForYouLoading, setIsForYouLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(DEFAULT_PAGE);
  const [hasMorePlaces, setHasMorePlaces] = useState(true);

  // Refs to avoid recreate fetchPlacesPage on every render due to changing dependencies
  const requestVersionRef = useRef(0);
  const inFlightPageRef = useRef<number | null>(null);
  const flatListRef = useRef<FlatList<PlaceItem>>(null);

  // Sync refs with latest state — does not cause re-render
  const coordsRef = useRef(coords);
  const radiusRef = useRef(radius);
  const sortByRef = useRef(sortBy);
  const currentPageRef = useRef(currentPage);
  const hasMorePlacesRef = useRef(hasMorePlaces);
  const isPlacesLoadingRef = useRef(isPlacesLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const cacheNearbyPlacesRef = useRef(cacheNearbyPlaces);
  const setLastNearbyParamsRef = useRef(setLastNearbyParams);
  const forYouRequestVersionRef = useRef(0);

  coordsRef.current = coords;
  radiusRef.current = radius;
  sortByRef.current = sortBy;
  currentPageRef.current = currentPage;
  hasMorePlacesRef.current = hasMorePlaces;
  isPlacesLoadingRef.current = isPlacesLoading;
  isLoadingMoreRef.current = isLoadingMore;
  cacheNearbyPlacesRef.current = cacheNearbyPlaces;
  setLastNearbyParamsRef.current = setLastNearbyParams;

  // fetchPlacesPage STABLE (deps empty) - read params via refs, avoid recreating function every render
  const fetchPlacesPage = useCallback(
    async (page: number, mode: 'replace' | 'append', requestVersion: number) => {
      const currentCoords = coordsRef.current;
      if (!currentCoords) return;

      // Block duplicate page fetches
      if (inFlightPageRef.current === page) return;
      inFlightPageRef.current = page;

      if (mode === 'replace') {
        setIsPlacesLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await placesService.getNearbyPlaces({
          page,
          limit: DEFAULT_LIMIT,
          sortBy: sortByRef.current,
          sortOrder: buildSortOrder(sortByRef.current),
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          radius: radiusRef.current,
        });

        // Remove stale results
        if (requestVersion !== requestVersionRef.current) return;

        const receivedPlaces = response.places ?? [];
        const totalPages = response.totalPages ?? page;
        const hasMore = page < totalPages && receivedPlaces.length > 0;

        setLastNearbyParamsRef.current({
          limit: DEFAULT_LIMIT,
          sortBy: sortByRef.current,
          sortOrder: buildSortOrder(sortByRef.current),
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          radius: radiusRef.current,
        });
        cacheNearbyPlacesRef.current(receivedPlaces);

        // Batch all state updates in one go to avoid multiple re-renders and ensure consistency
        setCurrentPage(page);
        setHasMorePlaces(hasMore);

        if (mode === 'replace') {
          setNearbyPlaces(receivedPlaces);
        } else {
          setNearbyPlaces((prev) => appendUniquePlaces(prev, receivedPlaces));
        }
      } catch {
        if (requestVersion === requestVersionRef.current && mode === 'replace') {
          setNearbyPlaces([]);
          setHasMorePlaces(false);
        }
      } finally {
        inFlightPageRef.current = null;

        if (requestVersion === requestVersionRef.current) {
          if (mode === 'replace') {
            setIsPlacesLoading(false);
          } else {
            setIsLoadingMore(false);
          }
        }
      }
    },
    [] // Stable — no dependencies, read everything from refs
  );

  // Load more: read state via refs instead of closure
  const handleLoadMore = useCallback(() => {
    if (activeTab !== 'nearby') {
      return;
    }

    if (
      !coordsRef.current ||
      !hasMorePlacesRef.current ||
      isPlacesLoadingRef.current ||
      isLoadingMoreRef.current
    ) {
      return;
    }
    fetchPlacesPage(currentPageRef.current + 1, 'append', requestVersionRef.current);
  }, [activeTab, fetchPlacesPage]);

  const fetchCurrentLocation = useCallback(
    async (options?: { force?: boolean }) => {
      setLocationLabel(t('home.loadingLocation'));
      const nextCoords = await ensureLocation({ force: options?.force ?? false });

      if (!nextCoords) {
        setLocationLabel(
          locationPermissionDenied ? t('home.locationDisabled') : t('home.locationUndefined')
        );
        setNearbyPlaces([]);
        return;
      }

      // console.log('[GPS] coords:', {
      //   latitude: nextCoords.latitude,
      //   longitude: nextCoords.longitude,
      // });

      try {
        const places = await Location.reverseGeocodeAsync(nextCoords);
        const place = places[0];

        // Debug raw reverse-geocode payload from device.
        // console.log('[GPS] reverseGeocodeAsync raw:', JSON.stringify(places, null, 2));

        if (!place) {
          setLocationLabel(t('home.locationUndefined'));
          return;
        }

        const placeAny = place as unknown as {
          formattedAddress?: string;
          name?: string;
        };

        const districtRaw = place.district ?? place.subregion ?? '';
        const fromFormatted = extractWardCityFromFormattedAddress(
          placeAny.formattedAddress ?? placeAny.name
        );
        const cityRaw = place.city ?? place.region ?? fromFormatted.city ?? '';

        const nextLabel = districtRaw
          ? [
              normalizeDistrictLabel(districtRaw, cityRaw),
              cityRaw ? normalizeCityLabel(cityRaw) : '',
            ]
              .filter(Boolean)
              .join(', ')
          : [fromFormatted.ward, cityRaw ? normalizeCityLabel(cityRaw) : '']
              .filter(Boolean)
              .join(', ');

        setLocationLabel(nextLabel || t('home.locationUndefined'));
      } catch {
        setLocationLabel(t('home.locationUndefined'));
      }
    },
    [ensureLocation, locationPermissionDenied, t]
  );

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    void fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  // Effect only depends on coords/radius/sortBy — fetchPlacesPage is now stable so no need to include it in deps
  useEffect(() => {
    if (!coords) {
      setNearbyPlaces([]);
      setHasMorePlaces(false);
      return;
    }

    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    inFlightPageRef.current = null; // reset in-flight when params change

    setCurrentPage(DEFAULT_PAGE);
    setHasMorePlaces(true);

    fetchPlacesPage(DEFAULT_PAGE, 'replace', requestVersion);
  }, [coords, radius, sortBy, fetchPlacesPage]);

  useEffect(() => {
    setRadius(settingRadius ?? DEFAULT_RADIUS);
  }, [settingRadius]);

  useEffect(() => {
    if (activeTab !== 'forYou') return;

    const currentCoords = coordsRef.current;
    if (!currentCoords) {
      setForYouPlaces([]);
      setIsForYouLoading(false);
      return;
    }

    forYouRequestVersionRef.current += 1;
    const requestVersion = forYouRequestVersionRef.current;
    let active = true;

    setIsForYouLoading(true);

    placesService
      .getPlaceForYou({
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
      })
      .then((data) => {
        if (!active || requestVersion !== forYouRequestVersionRef.current) return;
        setForYouPlaces(data ?? []);
      })
      .catch(() => {
        if (!active || requestVersion !== forYouRequestVersionRef.current) return;
        setForYouPlaces([]);
      })
      .finally(() => {
        if (!active || requestVersion !== forYouRequestVersionRef.current) return;
        setIsForYouLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, coords]);

  // Scroll to top when radius or sortBy changes for better UX
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [activeTab, radius, sortBy]);

  // Render item separated out to avoid inline closure that gets recreated every render
  const renderItem = useCallback(
    ({ item }: { item: PlaceItem }) => {
      const openingHoursLabel = formatOpeningHoursLabel(item.openingHours, t);
      const hasOpeningHours = (item.openingHours?.length ?? 0) > 0;
      const isOpen = isPlaceOpenNow(item.openingHours);
      const primaryImageUrl = getPrimaryImageUrl(item.featureImageUrl);
      const tags = (item.categories ?? []).slice(0, 4).map((category) => ({
        label: category.name,
        active: category.isMain,
      }));

      const handleFavoriteChange = async (nextIsFavorite: boolean) => {
        try {
          if (nextIsFavorite) {
            await favoriteService.addFavorite(item.id);
          } else {
            await favoriteService.removeFavorite(item.id);
          }

          setNearbyPlaces((prev) => updateFavoriteInPlaces(prev, item.id, nextIsFavorite));
          setForYouPlaces((prev) => updateFavoriteInPlaces(prev, item.id, nextIsFavorite));
          setPlaceFavorite(item.id, nextIsFavorite);
          return true;
        } catch (error) {
          // If place is already in favorites, keep the heart in favorited state.
          if (nextIsFavorite && isAxiosError(error) && error.response?.status === 409) {
            setNearbyPlaces((prev) => updateFavoriteInPlaces(prev, item.id, true));
            setForYouPlaces((prev) => updateFavoriteInPlaces(prev, item.id, true));
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
            className=""
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

  const itemSeparator = useCallback(() => <View style={{ height: 20 }} />, []);

  const keyExtractor = useCallback((item: PlaceItem) => item.id, []);

  const listFooter = (
    <>
      {activeTab === 'nearby' && isLoadingMore ? (
        <Typography className="mt-4 text-center text-gray-500">
          {t('home.loadingPlaces')}
        </Typography>
      ) : null}
      <View style={{ height: insets.bottom + 110 }} />
    </>
  );

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: horizontalPadding,
          paddingBottom: 16,
          backgroundColor: 'white',
        }}
      >
        <View className="flex-row items-center justify-between">
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 100, height: 42 }}
            contentFit="contain"
          />

          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => {
                void fetchCurrentLocation({ force: true });
              }}
              disabled={isLocationLoading}
              className="flex-row items-center gap-1.5"
            >
              <MapPin size={14} color={Palette.grey} strokeWidth={2} />
              <Typography className="text-gray-600">{locationLabel}</Typography>
            </Pressable>

            <Pressable onPress={() => router.push('/setting/edit-profile' as any)}>
              <View className="h-11 w-11 overflow-hidden rounded-full bg-white shadow-sm">
                <Image
                  source={
                    avatarUri
                      ? { uri: `${avatarUri}?t=${meFetchedAt || 0}` }
                      : DEFAULT_AVATAR_SOURCE
                  }
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
            </Pressable>
          </View>
        </View>

        <View className="mt-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Typography variant="h4">{t('home.greeting', { username })}</Typography>
            <Typography variant="h3" className="mt-1 text-[28px]">
              {t('home.subGreeting')}
            </Typography>
          </View>
        </View>

        <View className="flex-row border-b border-gray-100">
          <Pressable
            onPress={() => setActiveTab('nearby')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'nearby' ? 'border-[#3B5BDB]' : 'border-transparent'
            }`}
          >
            <Typography variant="h5" className={activeTab === 'nearby' ? '' : 'text-gray-400'}>
              {t('home.nearby')}
            </Typography>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('forYou')}
            className={`flex-1 py-3 items-center border-b-2 ${
              activeTab === 'forYou' ? 'border-[#3B5BDB]' : 'border-transparent'
            }`}
          >
            <Typography variant="h5" className={activeTab === 'forYou' ? '' : 'text-gray-400'}>
              {t('home.forYou')}
            </Typography>
          </Pressable>
        </View>

        {(activeTab === 'nearby' || activeTab === 'forYou') && (
          <View className="mt-3 flex-row gap-3 items-center">
            {activeTab === 'nearby' && (
              <>
                <ArrowUpDown size={18} color={Palette.black} strokeWidth={2} />
                <Select
                  value={sortBy}
                  onChange={(value) => {
                    if (typeof value === 'string') setSortBy(value as PlaceSortBy);
                  }}
                  options={sortOptions}
                  className="flex-[1.2]"
                />
              </>
            )}

            <MoveDiagonal size={18} color={Palette.black} strokeWidth={2} />
            <Select
              value={radius}
              onChange={(value) => {
                if (typeof value === 'number') setRadius(value);
              }}
              options={radiusOptions}
              className="flex-1"
            />
          </View>
        )}

        {(activeTab === 'nearby' ? isPlacesLoading : isForYouLoading) ? (
          <Typography className="mt-4 text-gray-500">{t('home.loadingPlaces')}</Typography>
        ) : null}

        {(
          activeTab === 'nearby'
            ? !isPlacesLoading && nearbyPlaces.length === 0
            : !isForYouLoading && forYouPlaces.length === 0
        ) ? (
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="home.noPlaces"
            description="home.subNoPlaces"
            primaryButtonText="button.retry"
            primaryButtonAction={() => {
              void fetchCurrentLocation({ force: true });
            }}
          />
        ) : null}
      </View>

      <FlatList
        ref={flatListRef}
        data={activeTab === 'nearby' ? nearbyPlaces : forYouPlaces}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={itemSeparator}
        showsVerticalScrollIndicator={false}
        onEndReached={activeTab === 'nearby' ? handleLoadMore : undefined}
        onEndReachedThreshold={activeTab === 'nearby' ? 0.5 : undefined}
        // Performance tuning
        removeClippedSubviews={false} // true cause jank on Android when scrolling fast
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        updateCellsBatchingPeriod={100}
        ListFooterComponent={listFooter}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
        }}
      />
    </View>
  );
}
