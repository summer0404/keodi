import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Heart, Search, Share2, Star } from 'lucide-react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Typography from '@/components/ui/Typography';
import { groupSessionsService } from '@/api/groupSessions';
import { favoriteService } from '@/api/favorite';
import { authService } from '@/api/auth';
import { Palette } from '@/constants/theme';
import { DEFAULT_PLACE_IMAGE, getPrimaryImageUrl } from '@/constants/helper';
import type {
  GroupSessionItem,
  GroupSessionMember,
  GroupVoteItem,
  GroupVoteResult,
} from '@/types/api';
import { Card } from '@/components/ui/Card';
import GroupSessionAvatarStack from '@/components/ui/GroupSessionAvatarStack';
import AlertScreen from '@/components/ui/AlertScreen';
import { usePlacesStore } from '@/store/usePlacesStore';
import clsx from 'clsx';

const handleCopy = async (text: string | null | undefined) => {
  if (!text?.trim()) return;

  try {
    const clipboard = await import('expo-clipboard');
    await clipboard.setStringAsync(text.trim());
  } catch {
    // Silent fail keeps the UI smooth when clipboard native module is unavailable.
  }
};

const GroupSessionCard = ({
  item,
  onShare,
}: {
  item: GroupSessionItem;
  onShare: (session: GroupSessionItem) => void;
}) => {
  return (
    <Card
      className={clsx('overflow-hidden self-center w-full bg-white')}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
        boxShadow: '0px 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      <View className="rounded-2xl p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Typography variant="h5" className="text-xl">
              {item.shareCode}
            </Typography>
          </View>

          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                void handleCopy(item.shareCode);
              }}
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Copy size={16} color={Palette.black} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full bg-white"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 3,
              }}
              disabled={item.status !== 'ACTIVE'}
              onPress={() => onShare(item)}
            >
              <Share2
                size={16}
                color={item.status !== 'ACTIVE' ? '#9CA3AF' : Palette.black}
                strokeWidth={2}
              />
            </Pressable>
          </View>
        </View>

        <View className="mt-1">
          <GroupSessionAvatarStack members={item.members} />
        </View>
      </View>
    </Card>
  );
};

const toAvatarMembers = (
  sessionId: string,
  voters: GroupVoteResult['voters']
): GroupSessionMember[] => {
  return voters.map((voter, index) => ({
    id: voter.id ?? `${sessionId}-${index}`,
    sessionId,
    userId: voter.userId,
    guestId: voter.guestId,
    nickname: voter.nickname,
    joinedAt: '',
    user: voter.user ?? null,
  }));
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [session, setSession] = useState<GroupSessionItem | null>(null);
  const [voteData, setVoteData] = useState<GroupVoteItem | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVotingPlaceId, setIsVotingPlaceId] = useState<string | null>(null);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [favoriteLoadingMap, setFavoriteLoadingMap] = useState<Record<string, boolean>>({});

  const placesById = usePlacesStore((state) => state.placesById);
  const setPlaceFavorite = usePlacesStore((state) => state.setPlaceFavorite);

  const hasMembers = useMemo(() => (session?.members?.length ?? 0) > 1, [session?.members?.length]);

  const loadData = useCallback(
    async (isActiveRef: { current: boolean }) => {
      setIsLoading(true);
      setIsLoadingVotes(true);

      try {
        if (id) {
          const [detail, votes] = await Promise.all([
            groupSessionsService.getGroupSessionById(id),
            groupSessionsService.getVotes(id),
          ]);

          if (isActiveRef.current) {
            setSession(detail);
            setVoteData(votes);
          }
        } else if (isActiveRef.current) {
          setSession(null);
          setVoteData(null);
        }
      } catch {
        if (isActiveRef.current) {
          setSession(null);
          setVoteData(null);
        }
      } finally {
        if (isActiveRef.current) {
          setIsLoading(false);
          setIsLoadingVotes(false);
        }
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      const activeRef = { current: true };
      void loadData(activeRef);

      return () => {
        activeRef.current = false;
      };
    }, [loadData])
  );

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      try {
        const me = await authService.getMe();
        if (active) {
          setCurrentUserId(me.id);
        }
      } catch {
        if (active) {
          setCurrentUserId(null);
        }
      }
    };

    loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  const sortedResults = useMemo(
    () => [...(voteData?.results ?? [])].sort((a, b) => b.count - a.count),
    [voteData?.results]
  );

  const votedPlaceId = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return voteData?.votes?.find((vote) => vote.member?.userId === currentUserId)?.placeId ?? null;
  }, [currentUserId, voteData?.votes]);

  useEffect(() => {
    if (!sortedResults.length) {
      return;
    }

    setFavoriteMap((prev) => {
      const next = { ...prev };

      sortedResults.forEach((result) => {
        if (typeof next[result.place.id] === 'boolean') {
          return;
        }

        next[result.place.id] = placesById[result.place.id]?.isFavorite ?? false;
      });

      return next;
    });
  }, [placesById, sortedResults]);

  const handleShare = useCallback(
    (currentSession: GroupSessionItem) => {
      router.push({
        pathname: '/(tabs)/group/create/invite',
        params: {
          sessionId: currentSession.sessionId,
          shareCode: currentSession.shareCode,
        },
      } as any);
    },
    [router]
  );

  const handleSearchPress = useCallback(() => {
    router.push('/(tabs)/search' as any);
  }, [router]);

  const handleInvitePress = useCallback(() => {
    if (!session) return;

    router.push({
      pathname: '/(tabs)/group/create/invite',
      params: {
        sessionId: session.sessionId,
        shareCode: session.shareCode,
      },
    });
  }, [router, session]);

  const handleVotePress = useCallback(
    async (placeId: string) => {
      if (!session || isVotingPlaceId) {
        return;
      }

      setIsVotingPlaceId(placeId);

      try {
        await groupSessionsService.votePlace(session.sessionId, { placeId });
        const nextVotes = await groupSessionsService.getVotes(session.sessionId);
        setVoteData(nextVotes);
      } finally {
        setIsVotingPlaceId(null);
      }
    },
    [isVotingPlaceId, session]
  );

  const handleFavoriteToggle = useCallback(
    async (placeId: string) => {
      if (favoriteLoadingMap[placeId]) {
        return;
      }

      const currentFavorite = favoriteMap[placeId] ?? false;
      const nextFavorite = !currentFavorite;

      setFavoriteMap((prev) => ({ ...prev, [placeId]: nextFavorite }));
      setFavoriteLoadingMap((prev) => ({ ...prev, [placeId]: true }));

      try {
        if (nextFavorite) {
          await favoriteService.addFavorite(placeId);
        } else {
          await favoriteService.removeFavorite(placeId);
        }

        setPlaceFavorite(placeId, nextFavorite);
      } catch (error) {
        if (nextFavorite && isAxiosError(error) && error.response?.status === 409) {
          setFavoriteMap((prev) => ({ ...prev, [placeId]: true }));
          setPlaceFavorite(placeId, true);
        } else {
          setFavoriteMap((prev) => ({ ...prev, [placeId]: currentFavorite }));
        }
      } finally {
        setFavoriteLoadingMap((prev) => ({ ...prev, [placeId]: false }));
      }
    },
    [favoriteLoadingMap, favoriteMap, setPlaceFavorite]
  );

  return (
    <View className="flex-1 bg-white">
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
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
          <Typography variant="h4">{t('group.detailTitle')}</Typography>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
      >
        {isLoading ? (
          <Typography className="text-gray-500">{t('group.loadingGroups')}</Typography>
        ) : null}

        {!isLoading && !session ? (
          <Typography className="text-gray-500">{t('group.groupNotFound')}</Typography>
        ) : null}

        {!isLoading && session ? (
          <View className="mt-2 gap-5">
            <GroupSessionCard item={session} onShare={handleShare} />

            {hasMembers ? (
              <>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Typography variant="h5">{t('group.placeCandidates')}</Typography>
                    <Typography className="mt-1 text-gray-500">
                      {t('group.totalPlaces', { count: sortedResults.length })}
                    </Typography>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    className="h-10 w-10 items-center justify-center rounded-full bg-white"
                    onPress={handleSearchPress}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.12,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <Search size={18} color={Palette.black} strokeWidth={2} />
                  </Pressable>
                </View>

                {isLoadingVotes ? (
                  <View className="rounded-2xl border border-[#ECECF0] bg-white p-4">
                    <Typography className="text-gray-500">{t('group.loadingGroups')}</Typography>
                  </View>
                ) : sortedResults.length > 0 ? (
                  <View className="gap-3">
                    {sortedResults.map((result, index) => {
                      const placeImageUrl = getPrimaryImageUrl(result.place.featureImageUrl);
                      const isVoted = votedPlaceId === result.place.id;
                      const voters = toAvatarMembers(session.sessionId, result.voters);
                      const isFavorite = favoriteMap[result.place.id] ?? false;

                      return (
                        <Card
                          key={result.place.id}
                          className="overflow-hidden self-center w-full bg-white"
                          style={{
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.18,
                            shadowRadius: 8,
                            elevation: 3,
                            boxShadow: '0px 2px 8px rgba(0,0,0,0.18)',
                          }}
                        >
                          <Pressable
                            className="relative rounded-2xl p-3"
                            onPress={() => router.push(`/place/${result.place.id}` as any)}
                          >
                            {index === 0 ? (
                              <View className="absolute left-[-30px] top-[10px] w-[104px] -rotate-45 bg-[#FACC15] py-1 items-center z-10">
                                <Typography variant="h5">{t('group.rank1')}</Typography>
                              </View>
                            ) : null}

                            <View className="flex-row gap-3 items-center">
                              <Image
                                source={
                                  placeImageUrl ? { uri: placeImageUrl } : DEFAULT_PLACE_IMAGE
                                }
                                style={{ width: 135, height: 95, borderRadius: 12 }}
                                contentFit="cover"
                              />

                              <View className="flex-1">
                                <View className="flex-row items-center justify-between gap-2">
                                  <Typography variant="h5" className="flex-1" numberOfLines={2}>
                                    {result.place.name}
                                  </Typography>

                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      void handleFavoriteToggle(result.place.id);
                                    }}
                                    disabled={favoriteLoadingMap[result.place.id]}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-white"
                                  >
                                    <Heart
                                      size={18}
                                      color={isFavorite ? Palette.red : Palette.black}
                                      fill={isFavorite ? Palette.red : 'transparent'}
                                      strokeWidth={2}
                                    />
                                  </Pressable>
                                </View>

                                <View className="mt-1 flex-row items-center gap-4">
                                  <View className="flex-row items-center gap-1">
                                    <Star
                                      size={14}
                                      color={Palette.star}
                                      fill={Palette.star}
                                      strokeWidth={1.8}
                                    />
                                    <Typography className="text-[#4B5563]">
                                      {result.place.rating > 0
                                        ? result.place.rating.toFixed(1)
                                        : 'N/A'}
                                    </Typography>
                                  </View>

                                  <Typography className="text-[#4B5563]">
                                    {t('group.totalVotes', { count: result.count })}
                                  </Typography>
                                </View>

                                {result.place.fullAddress ? (
                                  <Typography className="mt-1 text-[#6B7280]" numberOfLines={1}>
                                    {result.place.fullAddress}
                                  </Typography>
                                ) : null}

                                <View className="mt-2 flex-row items-center justify-between gap-2">
                                  <GroupSessionAvatarStack members={voters} size={24} />

                                  <Pressable
                                    className={clsx(
                                      'min-w-[86px] items-center justify-center rounded-full border px-4 py-1.5',
                                      isVoted ? 'border-black bg-black' : 'border-black bg-white'
                                    )}
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      void handleVotePress(result.place.id);
                                    }}
                                    disabled={isVotingPlaceId !== null}
                                  >
                                    <Typography className={isVoted ? 'text-white' : 'text-black'}>
                                      {isVotingPlaceId === result.place.id
                                        ? '...'
                                        : isVoted
                                          ? t('group.voted')
                                          : t('group.vote')}
                                    </Typography>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        </Card>
                      );
                    })}
                  </View>
                ) : (
                  <AlertScreen
                    imageSrc={require('@/assets/images/404.png')}
                    heading="group.noPlacesTitle"
                    description="group.noPlacesDesc"
                    primaryButtonText="group.goToSearch"
                    primaryButtonAction={handleSearchPress}
                  />
                )}
              </>
            ) : (
              <AlertScreen
                imageSrc={require('@/assets/images/nofriend.png')}
                heading="group.noMembersTitle"
                description="group.noMembersDesc"
                primaryButtonText="group.inviteFriends"
                primaryButtonAction={handleInvitePress}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
