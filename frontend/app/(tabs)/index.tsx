import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import Typography from '@/components/ui/Typography';
import PlaceCard from '@/components/ui/PlaceCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '@/api/auth';
import { placesService } from '@/api/places';
import { Select } from '@/components/ui/Select';
import type { PlaceItem, PlaceSortBy } from '@/types/api';
import { PLACES_DEFAULT_LIMIT, PLACES_DEFAULT_PAGE } from '@/constants/helper';
import { useTranslation } from 'react-i18next';
import { Palette } from '@/constants/theme';
import AlertScreen from '@/components/ui/AlertScreen';

const DEFAULT_AVATAR_SOURCE = require('@/assets/images/default-avatar.webp');
const DEFAULT_PLACE_IMAGE = require('@/assets/images/img-cover.webp');

const toAsciiLower = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();

const normalizeDistrictLabel = (districtValue: string, cityValue: string) => {
  const district = districtValue.trim();
  if (!district) return '';

  const normalized = toAsciiLower(district);
  const inHcmc = ['ho chi minh city', 'ho chi minh', 'hcmc', 'tphcm', 'tp hcm'].includes(
    toAsciiLower(cityValue).replace(/[.]/g, '')
  );

  const districtNumberMatch = district.match(/(district|quan|quận)\s*0*([0-9]+)/i);
  if (districtNumberMatch?.[2]) {
    return `Quận ${Number(districtNumberMatch[2])}`;
  }

  if (/^(ward|phuong|phường)\s/i.test(district)) {
    return district;
  }

  if (/^(huyen|huyện)\s/i.test(normalized)) {
    return district.replace(/^(huyen|huyện)\s*/i, 'Huyện ');
  }

  if (/^(tp|thanh pho|thành phố)\s/i.test(normalized)) {
    return district;
  }

  return inHcmc ? `Quận ${district}` : district;
};

const normalizeCityLabel = (cityValue: string) => {
  const normalized = toAsciiLower(cityValue).replace(/[.]/g, '').trim();
  const hcmAliases = new Set([
    'ho chi minh city',
    'ho chi minh',
    'thanh pho ho chi minh',
    'tp ho chi minh',
    'tphcm',
    'tp hcm',
    'hcmc',
  ]);

  return hcmAliases.has(normalized) ? 'TPHCM' : cityValue;
};

const buildSortOrder = (value: PlaceSortBy) => (value === 'rating' ? 'desc' : 'asc');

const appendUniquePlaces = (prev: PlaceItem[], next: PlaceItem[]) => {
  const existingIds = new Set(prev.map((item) => item.id));
  const filteredNext = next.filter((item) => !existingIds.has(item.id));
  // No need to create a new array if there are no new items, avoid unnecessary FlatList re-render
  if (filteredNext.length === 0) return prev;
  return [...prev, ...filteredNext];
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const horizontalPadding = 20;
  const cardWidth = width - horizontalPadding * 2;

  const SORT_OPTIONS = [
    { label: t('home.sortByDistance'), value: 'distance' },
    { label: t('home.sortByRating'), value: 'rating' },
    { label: t('home.sortByName'), value: 'name' },
  ];

  const RADIUS_OPTIONS = [
    { label: t('home.radius2km'), value: 2 },
    { label: t('home.radius5km'), value: 5 },
    { label: t('home.radius15km'), value: 15 },
    { label: t('home.radius15kmPlus'), value: 50 },
  ];

  const [locationLabel, setLocationLabel] = useState('Đang lấy vị trí...');
  const [username, setUsername] = useState('bạn');
  const [avatarSource, setAvatarSource] = useState<any>(DEFAULT_AVATAR_SOURCE);
  const [sortBy, setSortBy] = useState<PlaceSortBy>('distance');
  const [radius, setRadius] = useState(5);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceItem[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(PLACES_DEFAULT_PAGE);
  const [hasMorePlaces, setHasMorePlaces] = useState(true);

  // Refs to avoid recreate fetchPlacesPage on every render due to changing dependencies
  const requestVersionRef = useRef(0);
  const inFlightPageRef = useRef<number | null>(null);

  // Sync refs with latest state — does not cause re-render
  const coordsRef = useRef(coords);
  const radiusRef = useRef(radius);
  const sortByRef = useRef(sortBy);
  const currentPageRef = useRef(currentPage);
  const hasMorePlacesRef = useRef(hasMorePlaces);
  const isPlacesLoadingRef = useRef(isPlacesLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);

  coordsRef.current = coords;
  radiusRef.current = radius;
  sortByRef.current = sortBy;
  currentPageRef.current = currentPage;
  hasMorePlacesRef.current = hasMorePlaces;
  isPlacesLoadingRef.current = isPlacesLoading;
  isLoadingMoreRef.current = isLoadingMore;

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
          limit: PLACES_DEFAULT_LIMIT,
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
    if (
      !coordsRef.current ||
      !hasMorePlacesRef.current ||
      isPlacesLoadingRef.current ||
      isLoadingMoreRef.current
    ) {
      return;
    }
    fetchPlacesPage(currentPageRef.current + 1, 'append', requestVersionRef.current);
  }, [fetchPlacesPage]);

  const fetchCurrentLocation = async () => {
    setIsLocationLoading(true);
    setLocationLabel('Đang lấy vị trí...');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setLocationLabel('Vị trí chưa bật');
        setCoords(null);
        setNearbyPlaces([]);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Log coordinates to debug issues with missing or invalid location data
      // console.log(`[GPS] latitude=${nextCoords.latitude} longitude=${nextCoords.longitude}`);

      setCoords(nextCoords);

      const places = await Location.reverseGeocodeAsync(nextCoords);
      const place = places[0];

      // Log full location object to debug missing fields
      // console.log('[GPS] reverseGeocodeAsync result:', JSON.stringify(place, null, 2));

      if (!place) {
        setLocationLabel('Không xác định');
        return;
      }

      const districtRaw = place.district ?? place.subregion ?? '';
      const cityRaw = place.city ?? place.region ?? '';
      const districtLabel = normalizeDistrictLabel(districtRaw, cityRaw);
      const cityLabel = cityRaw ? normalizeCityLabel(cityRaw) : '';
      const nextLabel = [districtLabel, cityLabel].filter(Boolean).join(', ');

      setLocationLabel(nextLabel || 'Không xác định');
    } catch {
      setLocationLabel('Không xác định');
      setCoords(null);
      setNearbyPlaces([]);
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchMe = async () => {
      try {
        const profile = await authService.getMe();
        if (!active) return;
        if (profile.username?.trim()) setUsername(profile.username.trim());
        setAvatarSource(
          profile.pictureUrl ? { uri: profile.pictureUrl.trim() } : DEFAULT_AVATAR_SOURCE
        );
      } catch {
        if (active) setAvatarSource(DEFAULT_AVATAR_SOURCE);
      }
    };

    fetchMe();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    setCurrentPage(PLACES_DEFAULT_PAGE);
    setHasMorePlaces(true);

    fetchPlacesPage(PLACES_DEFAULT_PAGE, 'replace', requestVersion);
  }, [coords, radius, sortBy, fetchPlacesPage]);

  // Render item separated out to avoid inline closure that gets recreated every render
  const renderItem = useCallback(
    ({ item }: { item: PlaceItem }) => (
      <PlaceCard
        className=""
        style={{ width: cardWidth, elevation: 0 }}
        imageSource={item.featureImageUrl ? { uri: item.featureImageUrl } : DEFAULT_PLACE_IMAGE}
        title={item.name}
        rating={item.rating <= 0 ? 'N/A' : item.rating.toFixed(1)}
        distanceLabel={`${item.distance < 1 ? item.distance.toFixed(2) : item.distance.toFixed(1)} km`}
        fullAddress={item.fullAddress}
        street={item.street}
        ward={item.ward}
        city={item.city}
        openingHours="Opening hours updating"
        description={item.description?.trim()}
        statusLabel="Open"
      />
    ),
    [cardWidth]
  );

  const itemSeparator = useCallback(() => <View style={{ height: 20 }} />, []);

  const keyExtractor = useCallback((item: PlaceItem) => item.id, []);

  const listFooter = (
    <>
      {isLoadingMore ? (
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
              onPress={fetchCurrentLocation}
              disabled={isLocationLoading}
              className="flex-row items-center gap-1.5"
            >
              <MapPin size={14} color={Palette.grey} strokeWidth={2} />
              <Typography className="text-gray-600">{locationLabel}</Typography>
            </Pressable>

            <View className="h-11 w-11 overflow-hidden rounded-full bg-white shadow-sm">
              <Image
                source={avatarSource}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
          </View>
        </View>

        <View className="mt-5 flex-row items-end justify-between">
          <View className="flex-1">
            <Typography variant="h4">{t('home.greeting', { username })}</Typography>
            <Typography variant="h3" className="mt-1">
              {t('home.subGreeting')}
            </Typography>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <Select
            value={sortBy}
            onChange={(value) => {
              if (typeof value === 'string') setSortBy(value as PlaceSortBy);
            }}
            options={SORT_OPTIONS}
            className="flex-[1.2]"
          />

          <Select
            value={radius}
            onChange={(value) => {
              if (typeof value === 'number') setRadius(value);
            }}
            options={RADIUS_OPTIONS}
            className="flex-1"
          />
        </View>

        {isPlacesLoading ? (
          <Typography className="mt-4 text-gray-500">{t('home.loadingPlaces')}</Typography>
        ) : null}

        {!isPlacesLoading && nearbyPlaces.length === 0 ? (
          <AlertScreen
            imageSrc={require('@/assets/images/404.png')}
            heading="home.noPlaces"
            description="home.subNoPlaces"
            primaryButtonText="home.retry"
            primaryButtonAction={() => {
              fetchCurrentLocation();
              fetchPlacesPage(PLACES_DEFAULT_PAGE, 'replace', requestVersionRef.current);
            }}
          />
        ) : null}
      </View>

      <FlatList
        data={nearbyPlaces}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={itemSeparator}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
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
