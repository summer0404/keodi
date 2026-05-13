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
import { Card } from '@/components/ui/Card';
import { DEFAULT_PLACE_IMAGE, getPrimaryImageUrl } from '@/constants/helper';
import type { MemberLocation, PlaceRecommendationItem } from '@/types/api';
import { Star, Sparkles, RefreshCw } from 'lucide-react-native';
import { Palette } from '@/constants/theme';
import { t } from 'i18next';

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
  sessionStatus?: string;
  voteStatus?: string;
  onRefreshRecommendations?: () => void;
  isRefreshingRecommendations?: boolean;
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
  sessionStatus,
  voteStatus,
}: {
  place: PlaceRecommendationItem;
  onAddPlace: (placeId: string) => void;
  isAdding: boolean;
  sessionStatus?: string;
  voteStatus?: string;
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
      <Image
        source={imageUrl ? { uri: imageUrl } : DEFAULT_PLACE_IMAGE}
        style={{ width: '100%', height: 140 }}
        contentFit="cover"
      />
      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Typography variant="h5" numberOfLines={1} className="font-bold">
              {place.name}
            </Typography>
            <Typography variant="caption" className="text-gray-500 mt-1" numberOfLines={1}>
              {place.categories?.map((c) => c.name).join(' • ') || 'Place'}
            </Typography>
          </View>
          <View className="flex-row items-center bg-gray-100 px-2 py-1 rounded-md">
            <Star size={12} color={Palette.star} fill={Palette.star} />
            <Typography variant="caption" className="ml-1 font-bold">
              {place.rating > 0 ? place.rating.toFixed(1) : '4.8'}
            </Typography>
          </View>
        </View>

        {voteStatus !== 'FINALIZED' && (
          <Button
            variant="default"
            size="sm"
            className="mt-4 h-10 rounded-xl"
            onPress={() => onAddPlace(place.id)}
            disabled={isAdding}
          >
            <Typography className="text-white font-bold text-[13px]">
              {isAdding ? t('home.addingToGroup') : `+ ${t('home.addToGroup')}`}
            </Typography>
          </Button>
        )}
      </View>
    </Card>
  );
}

export default function GroupAddLocationSheet({
  visible,
  onClose,
  userCoords,
  memberLocations,
  recommendedPlaces,
  isLoadingRecommendations,
  recommendationsError,
  isAddingPlaceId,
  onAddPlace,
  sessionStatus,
  voteStatus,
  onRefreshRecommendations,
  isRefreshingRecommendations,
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

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => Math.min(prev, Math.max(filteredPlaces.length - 1, 0)));
  }, [filteredPlaces.length, visible]);

  const activePlace = filteredPlaces[activeIndex] ?? filteredPlaces[0] ?? null;
  const cardWidth = Math.min(width * 0.8, 420);
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
          <Typography className="text-gray-500">{t('group.noPlacesFound')}</Typography>
        </View>
      );
    }

    return (
      <View className="mt-4 gap-3">
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
            paddingBottom: 20,
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
                sessionStatus={sessionStatus}
                voteStatus={voteStatus}
              />
            </View>
          )}
          ListFooterComponent={
            onRefreshRecommendations ? (
              <View style={{ width: 80, justifyContent: 'center', alignItems: 'center' }}>
                <Pressable
                  className={`h-14 w-14 items-center justify-center rounded-full bg-white shadow-md ${isRefreshingRecommendations ? 'opacity-50' : ''}`}
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                  onPress={onRefreshRecommendations}
                  disabled={isRefreshingRecommendations}
                >
                  <RefreshCw size={24} color={Palette.black} />
                </Pressable>
              </View>
            ) : null
          }
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

          {/* <Typography variant="h4" className="text-black">
            {t('group.addLocation')}
          </Typography> */}

          <View className="mt-3">
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
              placeholder={t('search.title')}
              showSettings={false}
              showAI={false}
            />
            <View className='flex-row items-center mt-4'>
              <Sparkles size={20} color={Palette.black} />
              <Typography variant='h4' className='ml-2'>{t('group.aiSuggestions')}</Typography>
            </View>
          </View>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}
