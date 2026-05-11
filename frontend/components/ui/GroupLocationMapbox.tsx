import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Expand, Navigation, Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { DEFAULT_AVATAR_SOURCE } from '@/constants/helper';
import { Palette } from '@/constants/theme';
import type { PlaceRecommendationItem } from '@/types/api';

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

const markerDot = {
  width: 14,
  height: 14,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  backgroundColor: '#EF4444',
};

const userDot = {
  width: 16,
  height: 16,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  backgroundColor: '#2563EB',
};

const memberDot = {
  width: 14,
  height: 14,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: '#FFFFFF',
  backgroundColor: '#10B981',
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
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
};

const calculateBoundsFromCoordinates = (
  userCoords: [number, number] | null,
  memberLocations: MemberLocation[],
  places: MapPlace[]
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
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 20,
    paddingRight: 20,
  };
};

const buildAvatarSource = (pictureUrl: string | null | undefined) => {
  const rawUrl = pictureUrl?.trim();

  if (!rawUrl) {
    return DEFAULT_AVATAR_SOURCE;
  }

  return { uri: rawUrl };
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
}: {
  place: PlaceRecommendationItem;
  onAdd: (id: string) => void;
  isAdding: boolean;
}) => {
  const mainCategory = place.categories?.find((c) => c.isMain)?.name || 'Place';

  return (
    <View className="mr-3 w-64 rounded border-2 border-black bg-white p-3 shadow-sm relative">
      <View className="absolute -top-3 -right-3 rounded-full bg-black p-1.5 z-10 border-2 border-white">
        <Sparkles size={14} color="white" />
      </View>
      <Typography variant="h5" numberOfLines={1} className="uppercase tracking-wider">
        {place.name}
      </Typography>
      <Typography className="mt-1 text-sm text-gray-600 mb-3" numberOfLines={1}>
        {mainCategory} • {place.rating > 0 ? `${place.rating.toFixed(1)} ★` : 'New'}
      </Typography>
      
      <Button 
        onPress={() => onAdd(place.id)}
        disabled={isAdding}
        className="w-full bg-black py-2.5 rounded-none"
      >
        <Typography className="text-white font-bold text-center text-[10px] uppercase tracking-widest">
          {isAdding ? 'ADDING...' : 'ADD TO SESSION'}
        </Typography>
      </Button>
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
  onMapInteractionStart?: () => void;
  onMapInteractionEnd?: () => void;
}) => {
  const Mapbox = mapbox.default;
  const MarkerView = Mapbox.MarkerView;

  // Calculate bounds for all markers
  const bounds = useMemo(() => {
    const userCoords: [number, number] | null = center;
    return calculateBoundsFromCoordinates(userCoords, memberLocations, places);
  }, [center, memberLocations, places]);

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
        <Mapbox.Camera bounds={bounds} animationDuration={600} />
      ) : (
        // Use center-based camera for expanded view or single marker
        <Mapbox.Camera
          centerCoordinate={center}
          zoomLevel={fullScreen ? 14.5 : 13.2}
          animationDuration={600}
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
            imageKey={`member-${location.memberId}-${avatarCacheEpoch ?? 'session'}-${
              currentUserId && location.memberId === currentUserId
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
        <Mapbox.PointAnnotation
          key={place.id}
          id={`place-${place.id}`}
          coordinate={[place.longitude, place.latitude]}
          title={place.name}
        >
          <View style={markerDot} />
        </Mapbox.PointAnnotation>
      ))}
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
  height = 220,
  onMapInteractionStart,
  onMapInteractionEnd,
}: GroupLocationMapboxProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMapboxReady, setIsMapboxReady] = useState(false);

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
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {recommendedPlaces.map((place) => (
                  <RecommendCard
                    key={place.id}
                    place={place}
                    onAdd={onAddRecommendPlace!}
                    isAdding={isAddingPlaceId === place.id}
                  />
                ))}
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
