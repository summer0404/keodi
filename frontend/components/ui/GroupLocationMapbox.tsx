import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  View,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Expand, Star, X, MapPin, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEFAULT_AVATAR_SOURCE, getPrimaryImageUrl, DEFAULT_PLACE_IMAGE } from '@/constants/helper';
import { Palette } from '@/constants/theme';
import { usePlacesStore } from '@/store/usePlacesStore';
import type { PlaceRecommendationItem } from '@/types/api';
import clsx from 'clsx';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

type MemberLocation = {
  memberId: string;
  latitude: number;
  longitude: number;
};

type MemberAvatarMap = Record<string, string | null | undefined>;

type MapboxModule = typeof import('@rnmapbox/maps');

type GroupLocationMapboxProps = {
  userCoords: Coordinates | null;
  memberLocations?: MemberLocation[];
  userAvatarUrl?: string | null;
  currentUserId?: string | null;
  currentUserAvatarVersion?: number;
  avatarCacheEpoch?: number;
  memberAvatarUrls?: MemberAvatarMap;
  places: MapPlace[];
  recommendedPlaces?: PlaceRecommendationItem[];
  onAddRecommendPlace?: (placeId: string) => void;
  isAddingPlaceId?: string | null;
  height?: number;
  onMapInteractionStart?: () => void;
  onMapInteractionEnd?: () => void;
  sessionStatus?: string;
  voteStatus?: string;
  onRefreshRecommendations?: () => void;
  isRefreshingRecommendations?: boolean;
  candidateIds?: Set<string>;
};

const getMapboxModule = (): MapboxModule | null => {
  try {
    return require('@rnmapbox/maps') as MapboxModule;
  } catch {
    return null;
  }
};

const toCoordinate = (coords: Coordinates) =>
  [coords.longitude, coords.latitude] as [number, number];

const isFiniteCoordinate = (value: number) => Number.isFinite(value);

const isValidPlace = (place: MapPlace) =>
  isFiniteCoordinate(place.latitude) && isFiniteCoordinate(place.longitude);

const isValidMemberLocation = (location: MemberLocation) =>
  isFiniteCoordinate(location.latitude) && isFiniteCoordinate(location.longitude);

const CARD_WIDTH = 260;
const CARD_GAP = 12;
const RECOMMEND_CARD_HEIGHT = 150;

const activeRecommendDot = {
  width: 18,
  height: 18,
  borderRadius: 999,
  borderWidth: 2.5,
  borderColor: '#FFFFFF',
  backgroundColor: 'rgb(255, 0, 0)',
};

const avatarMarkerStyle = {
  width: 34,
  height: 34,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  backgroundColor: '#E5E7EB',
  overflow: 'hidden' as const,
};

type CameraBounds = {
  ne: [number, number];
  sw: [number, number];
};

const calculateBoundsFromCoordinates = (
  userCoords: [number, number] | null,
  memberLocations: MemberLocation[],
  places: MapPlace[],
  hasRecommendCards?: boolean
): CameraBounds | null => {
  const allCoords: Array<[number, number]> = [];

  if (userCoords) {
    allCoords.push(userCoords);
  }

  memberLocations.forEach((location) => {
    allCoords.push([location.longitude, location.latitude]);
  });

  places.forEach((place) => {
    allCoords.push([place.longitude, place.latitude]);
  });

  if (allCoords.length === 0) {
    return null;
  }

  if (allCoords.length === 1) {
    // Single marker: no meaningful bounds, use fallback to center
    return null;
  }

  let minLng = allCoords[0][0];
  let maxLng = allCoords[0][0];
  let minLat = allCoords[0][1];
  let maxLat = allCoords[0][1];

  allCoords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return {
    ne: [maxLng, maxLat],
    sw: [minLng, minLat],
  };
};

const withVersionQuery = (url: string, versions: Array<number | undefined | null>) => {
  const validVersions = versions.filter((version): version is number => Boolean(version));

  if (validVersions.length === 0) {
    return url;
  }

  const versionParam = validVersions.join('-');
  return url.includes('?') ? `${url}&v=${versionParam}` : `${url}?v=${versionParam}`;
};

const getAvatarSource = (
  pictureUrl?: string | null,
  versions: Array<number | undefined | null> = []
) => {
  const rawUrl = pictureUrl?.trim();

  if (!rawUrl) {
    return DEFAULT_AVATAR_SOURCE;
  }

  return { uri: withVersionQuery(rawUrl, versions) };
};

const AvatarMarker = ({
  pictureUrl,
  imageKey,
  versions = [],
}: {
  pictureUrl?: string | null;
  imageKey: string;
  versions?: (number | undefined | null)[];
}) => {
  return (
    <View style={avatarMarkerStyle}>
      <Image
        key={imageKey}
        source={getAvatarSource(pictureUrl, versions)}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
      />
    </View>
  );
};

const RecommendCard = ({
  place,
  onAdd,
  isAdding,
  onPress,
  sessionStatus,
  voteStatus,
  candidateIds,
}: {
  place: PlaceRecommendationItem;
  onAdd: (id: string) => void;
  isAdding: boolean;
  onPress: (id: string) => void;
  sessionStatus?: string;
  voteStatus?: string;
  candidateIds?: Set<string>;
}) => {
  const { t } = useTranslation();
  const placeImageUrl = getPrimaryImageUrl(place.featureImageUrl);
  const displayAddress = place.fullAddress?.trim() ?? null;

    return (
      <View style={{ width: CARD_WIDTH, marginRight: CARD_GAP, marginBottom: 5 }}>
        <Card
          className="overflow-hidden w-full bg-white justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 3,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.18)',
            height: RECOMMEND_CARD_HEIGHT,
          }}
        >
          <Pressable className="relative rounded-3xl p-3" onPress={() => onPress(place.id)}>
            <View className="flex-row gap-3 items-start">
              <Image
                source={placeImageUrl ? { uri: placeImageUrl } : DEFAULT_PLACE_IMAGE}
                style={{ width: 100, height: 80, borderRadius: 12, flexShrink: 0 }}
              />

              <View className="flex-1">
                <Typography variant="h5" numberOfLines={2} style={{ minHeight: 40 }}>
                  {place.name}
                </Typography>

                <View className="mt-1 flex-row items-center gap-1">
                  <Star size={14} color={Palette.star} fill={Palette.star} strokeWidth={1.8} />
                  <Typography className="text-[#4B5563]">
                    {place.rating > 0 ? place.rating.toFixed(1) : 'N/A'}
                  </Typography>
                </View>

                {displayAddress ? (
                  <Typography className="mt-0.5 text-[#6B7280]" numberOfLines={1}>
                    {displayAddress}
                  </Typography>
                ) : null}
              </View>
            </View>

          {voteStatus !== 'FINALIZED' && (
            <Button
              onPress={(event: any) => {
                event?.stopPropagation?.();
                onAdd(place.id);
              }}
              disabled={isAdding || candidateIds?.has(place.id)}
              className="mt-3"
            >
              {isAdding
                ? t('home.addingToGroup')
                : candidateIds?.has(place.id)
                  ? t('home.alreadyAdded')
                  : t('home.addToGroup')}
            </Button>
          )}
        </Pressable>
      </Card>
    </View>
  );
};

const MapCanvas = ({
    fullScreen,
    mapbox,
    center,
    userAvatarUrl,
    currentUserId,
    currentUserAvatarVersion,
    avatarCacheEpoch,
    memberAvatarUrls,
    memberLocations,
    places,
    hasRecommendCards,
    activeRecommendPlace,
    onMapInteractionStart,
    onMapInteractionEnd,
  }: {
    fullScreen: boolean;
    mapbox: MapboxModule;
    center: [number, number];
    userAvatarUrl?: string | null;
    currentUserId?: string | null;
    currentUserAvatarVersion?: number;
    avatarCacheEpoch?: number;
    memberAvatarUrls?: MemberAvatarMap;
    memberLocations: MemberLocation[];
    places: MapPlace[];
    hasRecommendCards?: boolean;
    activeRecommendPlace?: { latitude: number; longitude: number } | null;
    onMapInteractionStart?: () => void;
    onMapInteractionEnd?: () => void;
  }) => {
    const Mapbox = mapbox.default;
    const MarkerView = Mapbox.MarkerView;

    // Calculate bounds for all markers
    const bounds = useMemo(() => {
      const userCoords: [number, number] | null = center;
      return calculateBoundsFromCoordinates(userCoords, memberLocations, places, hasRecommendCards);
    }, [center, memberLocations, places, hasRecommendCards]);

    const cameraPadding = useMemo(() => {
      if (fullScreen) {
        return {
          paddingTop: 60,
          paddingBottom: 60,
          paddingLeft: 40,
          paddingRight: 40,
        };
      }
      return {
        paddingTop: 40,
        paddingBottom: hasRecommendCards ? 180 : 40,
        paddingLeft: 30,
        paddingRight: 30,
      };
    }, [fullScreen, hasRecommendCards]);

    return (
      <Mapbox.MapView
        style={{ width: '100%', height: '100%' }}
        styleURL={process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL || Mapbox.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        compassEnabled
        rotateEnabled
        pitchEnabled
        zoomEnabled
        scrollEnabled
        onTouchStart={onMapInteractionStart}
        onTouchEnd={onMapInteractionEnd}
        onTouchCancel={onMapInteractionEnd}
      >
        {bounds && !fullScreen ? (
          // Use bounds-based camera for non-expanded view with multiple markers
          <Mapbox.Camera bounds={bounds} animationDuration={600} padding={cameraPadding} />
        ) : (
          // Use center-based camera for expanded view or single marker
          <Mapbox.Camera
            centerCoordinate={center}
            zoomLevel={fullScreen ? 14.5 : 13.8}
            animationDuration={600}
            padding={cameraPadding}
          />
        )}

        <MarkerView id="user-location" coordinate={center} anchor={{ x: 0.5, y: 0.5 }}>
          <AvatarMarker
            pictureUrl={userAvatarUrl}
            imageKey={`user-${avatarCacheEpoch ?? 'session'}-${currentUserAvatarVersion ?? 'static'}`}
            versions={[avatarCacheEpoch, currentUserAvatarVersion]}
          />
        </MarkerView>

        {memberLocations.map((location) => (
          // Use versioned avatar URIs so expo-image doesn't keep stale cached avatars in Mapbox markers.
          <MarkerView
            key={location.memberId}
            id={`member-${location.memberId}`}
            coordinate={[location.longitude, location.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <AvatarMarker
              pictureUrl={memberAvatarUrls?.[location.memberId]}
              imageKey={`member-${location.memberId}-${avatarCacheEpoch ?? 'session'}-${currentUserId && location.memberId === currentUserId
                ? (currentUserAvatarVersion ?? 'static')
                : 'peer'
                }`}
              versions={[
                avatarCacheEpoch,
                currentUserId && location.memberId === currentUserId
                  ? currentUserAvatarVersion
                  : undefined,
              ]}
            />
          </MarkerView>
        ))}

        {places.map((place) => (
          <MarkerView
            key={place.id}
            id={`place-${place.id}`}
            coordinate={[place.longitude, place.latitude]}
            anchor={{ x: 0.5, y: 1 }} // Anchor at the bottom tip of the pin
          >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  backgroundColor: 'white',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#EF4444',
                  marginBottom: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2
                }}
              >
                <Typography variant="caption" className="text-[#EF4444]" numberOfLines={1}>
                  {place.name}
                </Typography>
              </View>
              <MapPin color="#EF4444" fill="#EF4444" size={32} />
            </View>
          </MarkerView>
        ))}

        {/* Active recommended place marker */}
        {activeRecommendPlace && (
          <MarkerView
            id="active-recommend-place"
            coordinate={[activeRecommendPlace.longitude, activeRecommendPlace.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={activeRecommendDot} />
          </MarkerView>
        )}

        {/* Polylines from user + members to the active recommended place */}
        {activeRecommendPlace && (() => {
          const destination: [number, number] = [
            activeRecommendPlace.longitude,
            activeRecommendPlace.latitude,
          ];

          const lines: Array<{ id: string; from: [number, number] }> = [];

          // User line
          lines.push({ id: 'user-route', from: center });
          // User line
          lines.push({ id: 'user-route', from: center });

          // Member lines
          memberLocations.forEach((loc) => {
            lines.push({
              id: `member-route-${loc.memberId}`,
              from: [loc.longitude, loc.latitude],
            });
          });
          // Member lines
          memberLocations.forEach((loc) => {
            lines.push({
              id: `member-route-${loc.memberId}`,
              from: [loc.longitude, loc.latitude],
            });
          });

          return lines.map((line) => (
            <Mapbox.ShapeSource
              key={line.id}
              id={`shape-${line.id}`}
              shape={{
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [line.from, destination],
                },
              }}
            >
              <Mapbox.LineLayer
                id={`line-${line.id}`}
                style={{
                  lineColor: '#EF4444',
                  lineWidth: 2,
                  lineDasharray: [2, 3],
                  lineOpacity: 0.7,
                }}
              />
            </Mapbox.ShapeSource>
          ));
        })()}
      </Mapbox.MapView>
    );
  };

export default function GroupLocationMapbox({
  userCoords,
  memberLocations,
  userAvatarUrl,
  currentUserId,
  currentUserAvatarVersion,
  avatarCacheEpoch,
  memberAvatarUrls,
  places,
  recommendedPlaces,
  onAddRecommendPlace,
  isAddingPlaceId,
  sessionStatus,
  voteStatus,
  height,
  onMapInteractionStart,
  onMapInteractionEnd,
  onRefreshRecommendations,
  isRefreshingRecommendations,
  candidateIds,
}: GroupLocationMapboxProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const upsertPlace = usePlacesStore((state) => state.upsertPlace);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMapboxReady, setIsMapboxReady] = useState(false);
  const [activeRecommendIndex, setActiveRecommendIndex] = useState(0);

    const mapbox = useMemo(() => getMapboxModule(), []);
    const validMemberLocations = useMemo(
      () => (memberLocations ?? []).filter(isValidMemberLocation),
      [memberLocations]
    );
    const validPlaces = useMemo(() => places.filter(isValidPlace), [places]);

    const center = useMemo<[number, number] | null>(() => {
      if (userCoords) {
        return toCoordinate(userCoords);
      }

      if (validMemberLocations.length > 0) {
        const first = validMemberLocations[0];
        return [first.longitude, first.latitude];
      }

      if (validPlaces.length > 0) {
        const first = validPlaces[0];
        return [first.longitude, first.latitude];
      }

      return null;
    }, [userCoords, validMemberLocations, validPlaces]);

    useEffect(() => {
      if (Platform.OS === 'web' || !mapbox) {
        return;
      }

      const accessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
      if (!accessToken) {
        return;
      }

      mapbox.default.setAccessToken(accessToken);
      setIsMapboxReady(true);
    }, [mapbox]);

    useEffect(() => {
      return () => {
        onMapInteractionEnd?.();
      };
    }, [onMapInteractionEnd]);

    const RECOMMEND_CARD_WIDTH = CARD_WIDTH + CARD_GAP;

    const handleRecommendScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        // Use floor with a small offset to make the snap feel more natural
        const index = Math.round(offsetX / RECOMMEND_CARD_WIDTH);
        const safeCount = recommendedPlaces?.length ?? 0;
        const clampedIndex = Math.max(0, Math.min(index, safeCount - 1));

        if (clampedIndex !== activeRecommendIndex) {
          setActiveRecommendIndex(clampedIndex);
        }
      },
      [recommendedPlaces?.length, activeRecommendIndex]
    );

    const activeRecommendPlace = useMemo(() => {
      if (!recommendedPlaces || recommendedPlaces.length === 0) {
        return null;
      }

    const activePlace = recommendedPlaces[activeRecommendIndex];
    if (
      !activePlace ||
      !Number.isFinite(activePlace.latitude) ||
      !Number.isFinite(activePlace.longitude)
    ) {
      return null;
    }

      return {
        latitude: activePlace.latitude,
        longitude: activePlace.longitude,
        name: activePlace.name,
      };
    }, [activeRecommendIndex, recommendedPlaces]);

    if (Platform.OS === 'web' || !mapbox || !isMapboxReady || !center) {
      return (
        <View className="rounded-2xl border border-[#ECECF0] bg-white p-4">
          <Typography variant="h5">Mapbox</Typography>
          <Typography className="mt-2 text-gray-500">{t('group.noPlacesDesc')}</Typography>
        </View>
      );
    }

    return (
      <>
        <View className="overflow-hidden rounded-2xl border border-[#ECECF0] bg-white">
          <View style={{ height }}>
            <MapCanvas
              fullScreen={false}
              mapbox={mapbox}
              center={center}
              userAvatarUrl={userAvatarUrl}
              currentUserId={currentUserId}
              currentUserAvatarVersion={currentUserAvatarVersion}
              avatarCacheEpoch={avatarCacheEpoch}
              memberAvatarUrls={memberAvatarUrls}
              memberLocations={validMemberLocations}
              places={validPlaces}
              hasRecommendCards={Boolean(recommendedPlaces && recommendedPlaces.length > 0)}
              activeRecommendPlace={activeRecommendPlace}
              onMapInteractionStart={onMapInteractionStart}
              onMapInteractionEnd={onMapInteractionEnd}
            />

            <Pressable
              className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-sm"
              onPress={() => setIsExpanded(true)}
              accessibilityRole="button"
            >
              <Expand size={18} color={Palette.black} />
            </Pressable>

          {recommendedPlaces && recommendedPlaces.length > 0 && (
            <View className="absolute bottom-4 left-0 right-0">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
                onScroll={handleRecommendScroll}
                scrollEventThrottle={16}
                snapToOffsets={recommendedPlaces.map((_, i) => i * RECOMMEND_CARD_WIDTH)}
                decelerationRate="fast"
                disableIntervalMomentum={true}
              >
                {recommendedPlaces.map((place) => (
                  <RecommendCard
                    key={place.id}
                    place={place}
                    onAdd={onAddRecommendPlace!}
                    isAdding={isAddingPlaceId === place.id}
                    sessionStatus={sessionStatus}
                    voteStatus={voteStatus}
                    candidateIds={candidateIds}
                    onPress={(placeId) => {
                      // Cache the recommendation as a PlaceItem so the detail page can display it
                      const rec = recommendedPlaces.find((p) => p.id === placeId);
                      if (rec) {
                        upsertPlace({
                          id: rec.id,
                          fromGoogle: false,
                          name: rec.name,
                          description: rec.description,
                          rating: rec.rating,
                          googleMapLink: rec.googleMapLink,
                          website: rec.website,
                          phoneNumber: rec.phoneNumber,
                          featureImageUrl: rec.featureImageUrl,
                          ownerId: null,
                          latitude: rec.latitude,
                          longitude: rec.longitude,
                          fullAddress: rec.fullAddress,
                          ward: null,
                          street: null,
                          city: null,
                          countryCode: null,
                          createdAt: '',
                          updatedAt: '',
                          has_attributes: 0,
                          isFavorite: false,
                          openingHours: rec.openingHours as any,
                          categories: rec.categories,
                        });
                      }
                      router.push(`/place/${placeId}` as any);
                    }}
                  />
                ))}

                  {onRefreshRecommendations ? (
                    <View style={{ width: 80, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                      <Pressable
                        className={clsx(
                          "h-14 w-14 items-center justify-center rounded-full bg-white shadow-md",
                          isRefreshingRecommendations && "opacity-50"
                        )}
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.15,
                          shadowRadius: 4,
                          elevation: 4,
                        }}
                        onPress={onRefreshRecommendations}
                      >
                        <RefreshCw size={24} color={Palette.black} />
                      </Pressable>
                    </View>
                  ) : null}
                </ScrollView>
            </View>
            )}
          </View>
        </View>

        <Modal visible={isExpanded} animationType="slide" onRequestClose={() => setIsExpanded(false)}>
          <View className="flex-1 bg-white">
            <View
              className="flex-row items-center justify-between border-b border-[#ECECF0] px-4"
              style={{ paddingTop: insets.top + 10, paddingBottom: 10 }}
            >
              <Typography variant="h5">Maps</Typography>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6]"
                onPress={() => setIsExpanded(false)}
                accessibilityRole="button"
              >
                <X size={18} color={Palette.black} />
              </Pressable>
            </View>

            <View className="flex-1">
              <MapCanvas
                fullScreen
                mapbox={mapbox}
                center={center}
                userAvatarUrl={userAvatarUrl}
                currentUserId={currentUserId}
                currentUserAvatarVersion={currentUserAvatarVersion}
                avatarCacheEpoch={avatarCacheEpoch}
                memberAvatarUrls={memberAvatarUrls}
                memberLocations={validMemberLocations}
                places={validPlaces}
                onMapInteractionStart={onMapInteractionStart}
                onMapInteractionEnd={onMapInteractionEnd}
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }
