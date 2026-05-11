import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import SearchBar from '@/components/ui/SearchBar';
import AlertScreen from '@/components/ui/AlertScreen';
import GroupLocationMapbox from '@/components/ui/GroupLocationMapbox';
import { Card } from '@/components/ui/Card';
import { DEFAULT_PLACE_IMAGE, getPrimaryImageUrl } from '@/constants/helper';
import type { MemberLocation, PlaceRecommendationItem } from '@/types/api';
import { Star } from 'lucide-react-native';
import { Palette } from '@/constants/theme';

const cardHorizontalPadding = 16;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type GroupAddLocationSheetProps = {
  visible: boolean;
  onClose: () => void;
  userCoords: Coordinates | null;
  memberLocations: MemberLocation[];
  memberAvatarUrls?: Record<string, string | null>;
  currentUserId: string | null;
  userAvatarUrl?: string | null;
  currentUserAvatarVersion?: number;
  avatarCacheEpoch?: number;
  recommendedPlaces: PlaceRecommendationItem[];
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;
  isAddingPlaceId: string | null;
  onAddPlace: (placeId: string) => void;
};

const isPlaceMatch = (place: PlaceRecommendationItem, query: string) => {
  if (!query) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return [place.name, place.fullAddress, place.description]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(normalized));
};

function AddLocationCard({
  place,
  onAddPlace,
  isAdding,
}: {
  place: PlaceRecommendationItem;
  onAddPlace: (placeId: string) => void;
  isAdding: boolean;
}) {
  const imageUrl = getPrimaryImageUrl(place.featureImageUrl);

  return (
    <Card
      className="overflow-hidden self-center w-full bg-white"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
        elevation: 3,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.16)',
      }}
    >
      <View className="p-3">
        <View className="flex-row gap-3 items-center">
          <Image
            source={imageUrl ? { uri: imageUrl } : DEFAULT_PLACE_IMAGE}
            style={{ width: 118, height: 84, borderRadius: 14 }}
            contentFit="cover"
          />

          <View className="flex-1">
            <Typography variant="h5" numberOfLines={2}>
              {place.name}
            </Typography>

            <View className="mt-1 flex-row items-center gap-1">
              <Star size={14} color={Palette.star} fill={Palette.star} strokeWidth={1.8} />
              <Typography className="text-[#4B5563]">
                {place.rating > 0 ? place.rating.toFixed(1) : 'N/A'}
              </Typography>
            </View>

            {place.fullAddress ? (
              <Typography className="mt-1 text-[#6B7280]" numberOfLines={2}>
                {place.fullAddress}
              </Typography>
            ) : null}
          </View>
        </View>

        <Button
          rounded="full"
          className="mt-3"
          onPress={() => onAddPlace(place.id)}
          disabled={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add to Sessions'}
        </Button>
      </View>
    </Card>
  );
}

export default function GroupAddLocationSheet({
  visible,
  onClose,
  userCoords,
  memberLocations,
  memberAvatarUrls,
  currentUserId,
  userAvatarUrl,
  currentUserAvatarVersion,
  avatarCacheEpoch,
  recommendedPlaces,
  isLoadingRecommendations,
  recommendationsError,
  isAddingPlaceId,
  onAddPlace,
}: GroupAddLocationSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const handleSearch = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || !userCoords) return;

    // Close sheet and navigate to search results
    onClose();
    router.push({
      pathname: '/(tabs)/search/results',
      params: {
        search: trimmed,
        latitude: String(userCoords.latitude),
        longitude: String(userCoords.longitude),
      },
    } as any);
  }, [query, userCoords, onClose, router]);

  const hasEnoughLocations = useMemo(
    () => memberLocations.length + (userCoords ? 1 : 0) >= 2,
    [memberLocations.length, userCoords]
  );

  const filteredPlaces = useMemo(
    () => recommendedPlaces.filter((place) => isPlaceMatch(place, query)),
    [query, recommendedPlaces]
  );

  // Filter memberLocations to ensure valid memberId for GroupLocationMapbox
  const validMemberLocations = useMemo(
    () =>
      memberLocations
        .filter((loc) => loc.memberId)
        .map((loc) => ({
          ...loc,
          memberId: loc.memberId as string,
        })),
    [memberLocations]
  );

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => Math.min(prev, Math.max(filteredPlaces.length - 1, 0)));
  }, [filteredPlaces.length, visible]);

  const activePlace = filteredPlaces[activeIndex] ?? filteredPlaces[0] ?? null;
  const cardWidth = Math.min(width - cardHorizontalPadding * 2, 420);
  const itemWidth = cardWidth + 12;

  const renderContent = () => {
    if (!hasEnoughLocations) {
      return (
        <AlertScreen
          imageSrc={require('@/assets/images/nofriend.png')}
          heading="group.needActiveMembers"
          description="group.needActiveMembersDesc"
          primaryButtonText="group.inviteFriends"
          primaryButtonAction={onClose}
        />
      );
    }

    if (isLoadingRecommendations) {
      return (
        <Typography className="mt-4 text-center text-gray-500">
          {t('group.loadingPlaces')}
        </Typography>
      );
    }

    if (recommendationsError) {
      return (
        <AlertScreen
          imageSrc={require('@/assets/images/404.png')}
          heading={recommendationsError}
          primaryButtonText="group.inviteFriends"
          primaryButtonAction={onClose}
        />
      );
    }

    if (!filteredPlaces.length) {
      return (
        <View className="mt-4 rounded-2xl border border-[#ECECF0] bg-white p-4">
          <Typography className="text-gray-500">No places found.</Typography>
        </View>
      );
    }

    return (
      <View className="mt-4 gap-3">
        <View className="overflow-hidden rounded-[28px] border border-[#ECECF0] bg-white">
          <View style={{ height: 300 }}>
            {activePlace ? (
              <GroupLocationMapbox
                userCoords={userCoords}
                userAvatarUrl={userAvatarUrl}
                currentUserId={currentUserId}
                currentUserAvatarVersion={currentUserAvatarVersion}
                avatarCacheEpoch={avatarCacheEpoch}
                memberAvatarUrls={memberAvatarUrls}
                memberLocations={validMemberLocations}
                places={[
                  {
                    id: activePlace.id,
                    name: activePlace.name,
                    latitude: activePlace.latitude,
                    longitude: activePlace.longitude,
                  },
                ]}
                height={300}
                onSearchPress={onClose}
              />
            ) : null}
          </View>
        </View>

        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={itemWidth}
          snapToAlignment="start"
          disableIntervalMomentum
          contentContainerStyle={{
            paddingHorizontal: cardHorizontalPadding,
          }}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          getItemLayout={(_, index) => ({
            length: itemWidth,
            offset: itemWidth * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
            setActiveIndex(Math.max(0, Math.min(nextIndex, filteredPlaces.length - 1)));
          }}
          renderItem={({ item }) => (
            <View style={{ width: cardWidth }}>
              <AddLocationCard
                place={item}
                onAddPlace={onAddPlace}
                isAdding={isAddingPlaceId === item.id}
              />
            </View>
          )}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/45 justify-end">
        <Pressable className="absolute inset-0" onPress={onClose} />

        <View
          className="w-full rounded-t-[28px] bg-white px-4 pb-6"
          style={{ paddingTop: 14, paddingBottom: insets.bottom + 24 }}
        >
          <View className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-300" />

          <Typography variant="h4" className="text-black">
            Add location
          </Typography>

          <View className="mt-3">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder={t('search.title')}
              showSettings={false}
              showAI={false}
            />
          </View>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}
