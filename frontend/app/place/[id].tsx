import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Copy,
  Globe,
  Heart,
  MapPin,
  Phone,
  Send,
  Share2,
  Star,
  UserPlus,
} from 'lucide-react-native';
import { isAxiosError } from 'axios';

import { useTranslation } from 'react-i18next';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Palette } from '@/constants/theme';
import { favoriteService } from '@/api/favorite';
import { groupSessionsService } from '@/api/groupSessions';
import { placesService } from '@/api/places';
import { usePlacesStore } from '@/store/usePlacesStore';
import {
  extractImageUrls,
  getLocalizedLocation,
  formatDistance,
  formatDateMonthYear,
  groupOpeningHoursByRange,
  formatOpeningHoursGroupLabel,
  isPlaceOpenNow,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from '@/constants/helper';
import type { PlaceItem, Review } from '@/types/api';

const DEFAULT_PLACE_IMAGE = require('@/assets/images/img-cover.webp');

type DetailTab = 'overview' | 'details' | 'reviews';

const normalizeWebsiteUrl = (website: string) => {
  const trimmed = website.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const formatAddressDisplay = (
  fullAddress: string | null | undefined,
  street: string | null | undefined,
  ward: string | null | undefined,
  city: string | null | undefined,
  language: string,
  t: (key: string) => string
) => {
  const trimmedFull = fullAddress?.trim();
  if (trimmedFull) return trimmedFull;

  // Fallback: construct from street + localized ward/city
  const localizedLocationPart = getLocalizedLocation(ward, city, language, t);
  const parts = [street?.trim(), localizedLocationPart].filter(Boolean);

  return parts.join(', ') || '--';
};

const extractLatLngFromGoogleLink = (url: string) => {
  const matched = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!matched) return null;
  return { lat: matched[1], lng: matched[2] };
};

function ActionButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Button
      variant="outline"
      rounded="xl"
      className={`flex-1 h-10 bg-white border border-[#E3E3E3] ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Typography>{label}</Typography>
      </View>
    </Button>
  );
}

function DetailTabButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-lg py-2 ${active ? 'bg-white' : 'bg-transparent'}`}
    >
      <Typography className={active ? 'text-black' : 'text-[#A1A1AA]'}>{title}</Typography>
    </Pressable>
  );
}

function StarRating({ score, size = 16 }: { score: number; size?: number }) {
  const clampedScore = Math.max(0, Math.min(score, 5));

  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const fill = Math.min(Math.max(clampedScore - index, 0), 1);

        return (
          <View key={`star-${index}`} className="relative" style={{ width: size, height: size }}>
            <Star size={size} color={Palette.star} fill="transparent" strokeWidth={1.8} />

            <View
              className="absolute left-0 top-0 overflow-hidden"
              style={{ width: fill * size, height: size }}
              pointerEvents="none"
            >
              <Star size={size} color={Palette.star} fill={Palette.star} strokeWidth={1.8} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const placeId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { i18n, t } = useTranslation();

  const place = usePlacesStore((state) => (placeId ? state.placesById[placeId] : undefined));
  const lastNearbyParams = usePlacesStore((state) => state.lastNearbyParams);
  const cacheNearbyPlaces = usePlacesStore((state) => state.cacheNearbyPlaces);
  const setPlaceFavorite = usePlacesStore((state) => state.setPlaceFavorite);

  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isRefreshingPlace, setIsRefreshingPlace] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [localFavorite, setLocalFavorite] = useState(!!place?.isFavorite);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionOverflowing, setIsDescriptionOverflowing] = useState(false);
  const [isTopImageFailed, setIsTopImageFailed] = useState(false);
  const [isVotingToGroup, setIsVotingToGroup] = useState(false);
  const [isVoteSuccess, setIsVoteSuccess] = useState(false);
  const hasTriedRefetchRef = useRef(false);
  const voteSuccessScale = useRef(new Animated.Value(1)).current;
  const voteSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Review state & refs
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [currentReviewPage, setCurrentReviewPage] = useState(DEFAULT_PAGE);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  const inFlightReviewPageRef = useRef<number | null>(null);
  const currentReviewPageRef = useRef(currentReviewPage);
  const hasMoreReviewsRef = useRef(hasMoreReviews);
  const isReviewsLoadingRef = useRef(isReviewsLoading);
  const isLoadingMoreReviewsRef = useRef(isLoadingMoreReviews);

  currentReviewPageRef.current = currentReviewPage;
  hasMoreReviewsRef.current = hasMoreReviews;
  isReviewsLoadingRef.current = isReviewsLoading;
  isLoadingMoreReviewsRef.current = isLoadingMoreReviews;

  const fetchReviewsPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      if (!placeId) return;

      // Block duplicate page fetches
      if (inFlightReviewPageRef.current === page) return;
      inFlightReviewPageRef.current = page;

      if (mode === 'replace') {
        setIsReviewsLoading(true);
      } else {
        setIsLoadingMoreReviews(true);
      }

      try {
        const response = await placesService.getPlaceReviews(placeId, {
          page,
          limit: DEFAULT_LIMIT,
          sortBy: 'createdAt',
          sortOrder: 'asc',
        });

        const receivedReviews = response.reviews ?? [];
        const hasMore =
          page < Math.ceil(response.total / DEFAULT_LIMIT) && receivedReviews.length > 0;

        setCurrentReviewPage(page);
        setTotalReviews(response.total ?? 0);
        setHasMoreReviews(hasMore);

        if (mode === 'replace') {
          setReviews(receivedReviews);
        } else {
          setReviews((prev) => [...prev, ...receivedReviews]);
        }
      } catch {
        // Silent fail
      } finally {
        setIsReviewsLoading(false);
        setIsLoadingMoreReviews(false);
        inFlightReviewPageRef.current = null;
      }
    },
    [placeId]
  );

  const handleLoadMoreReviews = useCallback(() => {
    if (
      !hasMoreReviewsRef.current ||
      isReviewsLoadingRef.current ||
      isLoadingMoreReviewsRef.current
    ) {
      return;
    }
    fetchReviewsPage(currentReviewPageRef.current + 1, 'append');
  }, [fetchReviewsPage]);

  const renderReviewItem = useCallback(({ item }: { item: Review }) => {
    const reviewDate = formatDateMonthYear(item.updatedAt || item.createdAt);
    return (
      <View key={item.id}>
        <View className="flex">
          <Typography variant="h5">{item.reviewerName}</Typography>
          <View className="flex-row justify-between gap-2">
            <StarRating score={item.rating} size={14} />
            <Typography className="text-[#52525B]">{reviewDate}</Typography>
          </View>
        </View>
        {item.text && <Typography className="mt-1">{item.text}</Typography>}
      </View>
    );
  }, []);

  const reviewItemSeparator = useCallback(() => <View style={{ height: 16 }} />, []);
  const reviewKeyExtractor = useCallback((item: Review) => item.id, []);

  useEffect(() => {
    setLocalFavorite(!!place?.isFavorite);
  }, [place?.isFavorite]);

  useEffect(() => {
    setIsDescriptionExpanded(false);
    setIsDescriptionOverflowing(false);
  }, [place?.description, placeId]);

  useEffect(() => {
    setIsTopImageFailed(false);
  }, [place?.featureImageUrl, placeId]);

  const resetVoteFeedback = useCallback(() => {
    if (voteSuccessTimeoutRef.current) {
      clearTimeout(voteSuccessTimeoutRef.current);
      voteSuccessTimeoutRef.current = null;
    }
    voteSuccessScale.stopAnimation();
    voteSuccessScale.setValue(1);
    setIsVoteSuccess(false);
  }, [voteSuccessScale]);

  useEffect(() => {
    return () => {
      resetVoteFeedback();
    };
  }, [resetVoteFeedback]);

  useEffect(() => {
    // Load reviews when place is loaded
    if (!placeId) return;
    setCurrentReviewPage(DEFAULT_PAGE);
    setHasMoreReviews(true);
    fetchReviewsPage(DEFAULT_PAGE, 'replace');
  }, [placeId, fetchReviewsPage]);

  useEffect(() => {
    const refetchPlace = async () => {
      if (!placeId || place || !lastNearbyParams || hasTriedRefetchRef.current) {
        return;
      }

      hasTriedRefetchRef.current = true;
      setIsRefreshingPlace(true);
      try {
        const response = await placesService.getNearbyPlaces({
          ...lastNearbyParams,
          page: 1,
        });
        cacheNearbyPlaces(response.places ?? []);
      } finally {
        setIsRefreshingPlace(false);
      }
    };

    refetchPlace();
  }, [cacheNearbyPlaces, lastNearbyParams, place, placeId]);

  const imageUrls = useMemo(
    () => extractImageUrls(place?.featureImageUrl),
    [place?.featureImageUrl]
  );

  const topImageSource = imageUrls.length ? { uri: imageUrls[0] } : DEFAULT_PLACE_IMAGE;
  const displayTopImageSource = isTopImageFailed ? DEFAULT_PLACE_IMAGE : topImageSource;

  const canCall = !!place?.phoneNumber?.trim();
  const canOpenWebsite = !!place?.website?.trim();
  const canOpenDirection = !!place?.googleMapLink?.trim();

  const handleToggleFavorite = async () => {
    if (!placeId || isFavoriteLoading || !place) return;

    const nextFavorite = !localFavorite;
    const prevFavorite = localFavorite;
    setLocalFavorite(nextFavorite);
    setIsFavoriteLoading(true);

    try {
      if (nextFavorite) {
        await favoriteService.addFavorite(placeId);
      } else {
        await favoriteService.removeFavorite(placeId);
      }
      setPlaceFavorite(placeId, nextFavorite);
    } catch (error) {
      if (nextFavorite && isAxiosError(error) && error.response?.status === 409) {
        setLocalFavorite(true);
        setPlaceFavorite(placeId, true);
      } else {
        setLocalFavorite(prevFavorite);
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleCall = async () => {
    const value = place?.phoneNumber?.trim();
    if (!value) return;
    const sanitized = value.replace(/\s+/g, '');
    await openUrl(`tel:${sanitized}`);
  };

  const handleWebsite = async () => {
    const value = place?.website?.trim();
    if (!value) return;
    await openUrl(normalizeWebsiteUrl(value));
  };

  const handleDirection = async () => {
    const value = place?.googleMapLink?.trim();
    if (!value) return;

    const latLng = extractLatLngFromGoogleLink(value);
    if (latLng) {
      const destinationName = encodeURIComponent(place?.name?.trim() || 'Destination');
      const nativeMapUrl =
        Platform.OS === 'ios'
          ? `comgooglemaps://?q=${latLng.lat},${latLng.lng}`
          : `geo:${latLng.lat},${latLng.lng}?q=${latLng.lat},${latLng.lng}(${destinationName})`;

      const canOpenNativeMap = await Linking.canOpenURL(nativeMapUrl);
      if (canOpenNativeMap) {
        await Linking.openURL(nativeMapUrl);
        return;
      }
    }

    await openUrl(value);
  };

  const handleCopy = async (text: string | null | undefined) => {
    if (!text?.trim()) return;

    try {
      const clipboard = await import('expo-clipboard');
      await clipboard.setStringAsync(text.trim());
    } catch {
      // Silent fail keeps the UI smooth when clipboard native module is unavailable.
    }
  };

  const handleShare = async () => {
    const value = place?.googleMapLink?.trim();
    if (!value) return;

    try {
      await Share.share({
        message: `Check out this place: ${place?.name}\n${value}`,
        title: place?.name || 'Share Place',
        url: value, // iOS specific
      });
    } catch {
      // Silent fail
    }
  };

  const handleAddToGroup = useCallback(async () => {
    if (!placeId || isVotingToGroup || isVoteSuccess) return;

    setIsVotingToGroup(true);
    try {
      const sessions = await groupSessionsService.getGroupSessions();
      const activeSession = sessions.find((session) => session.status === 'ACTIVE');

      if (!activeSession?.sessionId) {
        Alert.alert(t('home.groupSessionNotFoundTitle'), t('home.groupSessionNotFoundDesc'));
        return;
      }

      await groupSessionsService.votePlace(activeSession.sessionId, { placeId });

      setIsVoteSuccess(true);
      Animated.sequence([
        Animated.timing(voteSuccessScale, {
          toValue: 1.06,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(voteSuccessScale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();

      voteSuccessTimeoutRef.current = setTimeout(() => {
        resetVoteFeedback();
      }, 1000);
    } catch {
      Alert.alert(t('home.addToGroupFailedTitle'), t('home.addToGroupFailedDesc'));
    } finally {
      setIsVotingToGroup(false);
    }
  }, [isVoteSuccess, isVotingToGroup, placeId, resetVoteFeedback, t, voteSuccessScale]);

  const renderOverview = (target: PlaceItem) => (
    <View className="mt-5">
      {target.description?.trim() && (
        <>
          <Typography variant="h5">{t('home.about')}</Typography>
          {!isDescriptionExpanded ? (
            <Typography
              className="absolute opacity-0"
              pointerEvents="none"
              onTextLayout={(event) => {
                const isOverflowing = event.nativeEvent.lines.length > 2;
                if (isOverflowing !== isDescriptionOverflowing) {
                  setIsDescriptionOverflowing(isOverflowing);
                }
              }}
            >
              {target.description?.trim()}
            </Typography>
          ) : null}
          <Typography
            className={`mt-2 ${isDescriptionExpanded || !isDescriptionOverflowing ? 'mb-5' : ''}`}
            numberOfLines={isDescriptionExpanded ? undefined : 2}
          >
            {target.description?.trim()}
          </Typography>
          {!isDescriptionExpanded && isDescriptionOverflowing ? (
            <Pressable onPress={() => setIsDescriptionExpanded(true)} className="mb-5 self-start">
              <Typography className="text-gray-500">{t('home.more')}</Typography>
            </Pressable>
          ) : null}
        </>
      )}
      {(target.categories ?? []).length > 0 && (
        <>
          <Typography variant="h5">{t('home.hightlight')}</Typography>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {(target.categories ?? []).map((category) => (
              <View
                key={category.id}
                className={`rounded-full border px-3 py-1.5 shadow-md ${
                  category.isMain ? 'border-black bg-black' : 'border-gray-400 bg-white'
                }`}
              >
                <Typography className={category.isMain ? 'text-white' : ''}>
                  {category.name}
                </Typography>
              </View>
            ))}
          </View>
        </>
      )}

      {groupOpeningHoursByRange(target.openingHours).length > 0 && (
        <>
          <Typography variant="h5" className="mt-5">
            {t('home.openingHours')}
          </Typography>

          <View className="mt-2 gap-2 mb-5">
            {groupOpeningHoursByRange(target.openingHours).map((group) => {
              const dayLabel = formatOpeningHoursGroupLabel(group, t);

              return (
                <View
                  key={`${group.startDay}-${group.endDay}-${group.timeRangeLabel}`}
                  className="flex-row items-center gap-2"
                >
                  <Typography className="text-[#4B5563]">{dayLabel}:</Typography>
                  <Typography className="text-[#4B5563]">{group.timeRangeLabel}</Typography>
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );

  const renderDetails = (target: PlaceItem) => {
    const fullAddressValue = formatAddressDisplay(
      target.fullAddress,
      target.street,
      target.ward,
      target.city,
      i18n.language,
      t
    );

    return (
      <View className="mt-5 gap-2">
        <View className="flex-row justify-between">
          <View className="flex-1 pr-3">
            <Typography>{t('home.rating')}:</Typography>
            <View className="flex-row items-center gap-1.5">
              <Star size={16} color={Palette.star} fill={Palette.star} strokeWidth={1.8} />
              <Typography variant="h5">
                {target.rating <= 0 ? 'N/A' : target.rating.toFixed(1)}
              </Typography>
            </View>
          </View>
          <View className="flex-1 pl-3">
            <Typography>{t('home.status')}:</Typography>
            <Typography
              variant="h5"
              className={`mt-1 ${isPlaceOpenNow(target.openingHours) ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPlaceOpenNow(target.openingHours) ? t('home.open') : t('home.close')}
            </Typography>
          </View>
        </View>

        <View>
          {fullAddressValue && (
            <>
              <Typography>{t('home.address')}:</Typography>
              <View className="mt-1 flex-row items-end justify-between gap-2">
                <Typography variant="h5" className="flex-1">
                  {fullAddressValue}
                </Typography>
                <Pressable onPress={() => handleCopy(fullAddressValue)} className="p-1">
                  <Copy size={16} color={Palette.black} strokeWidth={2} />
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View>
          {target.phoneNumber?.trim() && (
            <>
              <Typography>{t('home.phone')}:</Typography>
              <View className="mt-1 flex-row items-end justify-between gap-2">
                <Typography variant="h5" className="mt-1">
                  {target.phoneNumber?.trim()}
                </Typography>
                <Pressable onPress={() => handleCopy(target.phoneNumber)} className="p-1">
                  <Copy size={16} color={Palette.black} strokeWidth={2} />
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View>
          {target.website?.trim() && (
            <>
              <Typography>{t('home.website')}:</Typography>
              <View className="mt-1 flex-row items-end justify-between gap-2">
                <Typography variant="h5" className="mt-1">
                  {target.website?.trim()}
                </Typography>
                <Pressable onPress={() => handleCopy(target.website)} className="p-1">
                  <Copy size={16} color={Palette.black} strokeWidth={2} />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderReviews = () => {
    // Hide if no reviews
    if (totalReviews === 0 && !isReviewsLoading) {
      return null;
    }

    const reviewListFooter = (
      <>
        {isLoadingMoreReviews ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color={Palette.black} />
          </View>
        ) : null}
      </>
    );

    const reviewListHeader = (
      <View className="mb-4 flex-row items-center justify-between">
        <Typography variant="h5">{t('home.userReviews')}</Typography>
        <View className="flex-row items-center gap-1.5">
          <Star size={16} color={Palette.star} fill={Palette.star} strokeWidth={1.8} />
          <Typography variant="h5" className="text-[20px]">
            {place?.rating && place.rating > 0 ? place.rating.toFixed(1) : 'N/A'} ({totalReviews})
          </Typography>
        </View>
      </View>
    );

    return (
      <View className="mt-5">
        <FlatList
          data={reviews}
          keyExtractor={reviewKeyExtractor}
          renderItem={renderReviewItem}
          ItemSeparatorComponent={reviewItemSeparator}
          ListHeaderComponent={reviewListHeader}
          ListFooterComponent={reviewListFooter}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMoreReviews}
          onEndReachedThreshold={0.5}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          updateCellsBatchingPeriod={100}
        />
      </View>
    );
  };

  if (!place && isRefreshingPlace) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={Palette.black} />
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Typography variant="h5" className="text-center">
          Place not found in cache.
        </Typography>
        <Pressable
          className="mt-4 rounded-xl bg-black px-5 py-3"
          onPress={() => router.replace('/(tabs)')}
        >
          <Typography className="text-white">Back to Home</Typography>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={{ height: 250 }}>
          <Image
            source={displayTopImageSource}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            onError={() => setIsTopImageFailed(true)}
          />

          <View
            style={{
              position: 'absolute',
              left: 14,
              right: 14,
              top: insets.top + 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/95"
            >
              <ArrowLeft size={20} color={Palette.black} strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={handleShare}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/95"
            >
              <Share2 size={18} color={Palette.black} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        <View className="-mt-8 rounded-t-[36px] bg-white px-6 pb-4 pt-4">
          {imageUrls.length > 1 ? (
            <View className="mb-3 rounded-2xl border border-[#E4E4E7] bg-white p-2 shadow-sm">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {imageUrls.slice(0, 4).map((url, idx) => (
                  <Image
                    key={`${url}-${idx}`}
                    source={{ uri: url }}
                    style={{ width: (width - 72) / 4, height: 52, borderRadius: 10 }}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Pressable
            disabled={isFavoriteLoading}
            onPress={handleToggleFavorite}
            className="absolute right-4 top-[-22] z-10 h-11 w-11 items-center justify-center rounded-full bg-white shadow"
          >
            <Heart
              size={21}
              color={localFavorite ? Palette.red : Palette.black}
              fill={localFavorite ? Palette.red : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>

          <View className="mt-2 flex-row items-center justify-between gap-3">
            <Typography variant="h4" className="flex-1">
              {place.name}
            </Typography>
          </View>

          <View
            className="mt-1 flex-row items-center justify-between"
            accessible
            accessibilityLabel={`Rating ${place.rating <= 0 ? 'N/A' : place.rating.toFixed(1)}`}
          >
            <StarRating score={place.rating > 0 ? place.rating : 0} size={18} />

            {place.distance && (
              <View className="flex-row items-center gap-1">
                <MapPin size={16} color={Palette.darkGreen} strokeWidth={2} />
                <Typography variant="h5" className="text-green-800">
                  {t('home.distanceAway', { distance: formatDistance(place.distance) })}
                </Typography>
              </View>
            )}
          </View>

          <Typography className="mt-3">
            {formatAddressDisplay(
              place.fullAddress,
              place.street,
              place.ward,
              place.city,
              i18n.language,
              t
            )}
          </Typography>

          <View className="mt-4 flex-row gap-2">
            {[
              {
                key: 'call',
                visible: canCall,
                icon: <Phone size={16} color={Palette.black} strokeWidth={2} />,
                label: t('home.call'),
                onPress: handleCall,
              },
              {
                key: 'website',
                visible: canOpenWebsite,
                icon: <Globe size={16} color={Palette.black} strokeWidth={2} />,
                label: t('home.website'),
                onPress: handleWebsite,
              },
              {
                key: 'direction',
                visible: canOpenDirection,
                icon: <Send size={16} color={Palette.black} strokeWidth={2} />,
                label: t('home.direction'),
                onPress: handleDirection,
              },
            ]
              .filter((item) => item.visible)
              .map((item) => (
                <ActionButton
                  key={item.key}
                  icon={item.icon}
                  label={item.label}
                  onPress={item.onPress}
                />
              ))}
          </View>

          <Animated.View style={{ transform: [{ scale: voteSuccessScale }] }}>
            <Button
              className={`mt-4 ${isVoteSuccess ? 'bg-green-500' : ''}`}
              onPress={handleAddToGroup}
              disabled={isVotingToGroup || isVoteSuccess}
            >
              <View className="flex-row items-center gap-5">
                <UserPlus size={24} color={Palette.white} strokeWidth={2} />
                <Typography variant="h5" className="text-white">
                  {isVoteSuccess
                    ? t('home.addToGroupSuccess')
                    : isVotingToGroup
                      ? t('home.addingToGroup')
                      : t('home.addToGroup')}
                </Typography>
              </View>
            </Button>
          </Animated.View>

          <View className="mt-4 rounded-xl bg-[#ECECF1] p-1 flex-row">
            <DetailTabButton
              title={t('home.overview')}
              active={activeTab === 'overview'}
              onPress={() => setActiveTab('overview')}
            />
            <DetailTabButton
              title={t('home.details')}
              active={activeTab === 'details'}
              onPress={() => setActiveTab('details')}
            />
            <DetailTabButton
              title={t('home.reviews')}
              active={activeTab === 'reviews'}
              onPress={() => setActiveTab('reviews')}
            />
          </View>

          {activeTab === 'overview' ? renderOverview(place) : null}
          {activeTab === 'details' ? renderDetails(place) : null}
          {activeTab === 'reviews' ? renderReviews() : null}
        </View>
      </ScrollView>
    </View>
  );
}

export default PlaceDetailScreen;
