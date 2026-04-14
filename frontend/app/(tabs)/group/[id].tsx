import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
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
import { Button } from '@/components/ui/Button';

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
  onFinalize,
  isFinalizing,
  finalizeLabel,
  finalizingLabel,
  hasMembers,
}: {
  item: GroupSessionItem;
  onShare: (session: GroupSessionItem) => void;
  onFinalize: (session: GroupSessionItem) => void;
  isFinalizing: boolean;
  finalizeLabel: string;
  finalizingLabel: string;
  hasMembers: boolean;
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

        <View className="mt-3 justify-between items-center flex-row gap-2">
          <GroupSessionAvatarStack members={item.members} />
          {item.voteStatus !== 'FINALIZED' && hasMembers ? (
            <Pressable
              className="h-10 min-w-[168px] items-center justify-center overflow-hidden rounded-full px-5"
              style={{
                backgroundColor: '#D4A217',
                shadowColor: '#B78600',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 5,
              }}
              onPress={() => onFinalize(item)}
              disabled={item.status !== 'ACTIVE' || isFinalizing}
            >
              <View className="absolute inset-0">
                <View className="absolute left-[-35%] top-0 h-full w-4 rotate-[18deg] bg-white/20" />
                <View className="absolute left-[-10%] top-0 h-full w-3 rotate-[18deg] bg-white/12" />
                <View className="absolute left-[20%] top-0 h-full w-3 rotate-[18deg] bg-white/15" />
                <View className="absolute left-[50%] top-0 h-full w-3 rotate-[18deg] bg-white/12" />
                <View className="absolute left-[80%] top-0 h-full w-3 rotate-[18deg] bg-white/10" />
              </View>

              <Typography className="text-white">
                {isFinalizing ? finalizingLabel : finalizeLabel}
              </Typography>
            </Pressable>
          ) : null}
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

const FIREWORK_PARTICLES = [
  { angle: -90, color: '#FACC15' },
  { angle: -72, color: '#FB7185' },
  { angle: -54, color: '#60A5FA' },
  { angle: -36, color: '#34D399' },
  { angle: -18, color: '#F97316' },
  { angle: 0, color: '#A78BFA' },
  { angle: 18, color: '#22D3EE' },
  { angle: 36, color: '#F43F5E' },
  { angle: 54, color: '#4ADE80' },
  { angle: 72, color: '#38BDF8' },
  { angle: 90, color: '#FBBF24' },
  { angle: 108, color: '#EC4899' },
  { angle: 126, color: '#3B82F6' },
  { angle: 144, color: '#10B981' },
  { angle: 162, color: '#F59E0B' },
  { angle: 180, color: '#8B5CF6' },
  { angle: 198, color: '#06B6D4' },
  { angle: 216, color: '#EF4444' },
  { angle: 234, color: '#6EE7B7' },
  { angle: 252, color: '#60A5FA' },
];

const WinnerFireworks = ({ visible }: { visible: boolean }) => {
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!visible) {
      progress.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(420),
      Animated.timing(progress, {
        toValue: 0,
        duration: 520,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
      {FIREWORK_PARTICLES.map((particle, index) => {
        const radius = 280;
        const radians = (particle.angle * Math.PI) / 180;
        const targetX = Math.cos(radians) * radius;
        const targetY = Math.sin(radians) * radius;

        return (
          <Animated.View
            key={`${particle.angle}-${index}`}
            style={{
              position: 'absolute',
              width: 28,
              height: 28,
              borderRadius: 999,
              backgroundColor: particle.color,
              opacity: progress.interpolate({
                inputRange: [0, 0.2, 0.85, 1],
                outputRange: [0, 1, 0.9, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetX],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, targetY],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.2, 1, 0.5],
                  }),
                },
              ],
            }}
          />
        );
      })}

      <Animated.View
        style={{
          opacity: progress.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] }),
          transform: [
            {
              scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] }),
            },
          ],
        }}
      >
        <Typography className="text-[64px]">🎉</Typography>
      </Animated.View>
    </View>
  );
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
  const [isFinalizingVote, setIsFinalizingVote] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);
  const [isCreatorOnlyModalVisible, setIsCreatorOnlyModalVisible] = useState(false);
  const [celebratingWinnerPlaceId, setCelebratingWinnerPlaceId] = useState<string | null>(null);
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

  const sortedResults = useMemo(() => {
    const sorted = [...(voteData?.results ?? [])].sort((a, b) => b.count - a.count);
    const winningPlaceId = session?.winningPlaceId;

    if (!winningPlaceId) {
      return sorted;
    }

    const winnerIndex = sorted.findIndex((result) => result.place.id === winningPlaceId);
    if (winnerIndex <= 0) {
      return sorted;
    }

    const [winner] = sorted.splice(winnerIndex, 1);
    return [winner, ...sorted];
  }, [session?.winningPlaceId, voteData?.results]);

  const currentUserVote = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return voteData?.votes?.find((vote) => vote.member?.userId === currentUserId) ?? null;
  }, [currentUserId, voteData?.votes]);

  const votedPlaceId = currentUserVote?.placeId ?? null;
  const isCurrentUserVoteFinalized = currentUserVote?.isFinalized ?? false;

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
      if (!session || isVotingPlaceId || session.voteStatus === 'FINALIZED') {
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

  const closeSubmitConfirmModal = useCallback(() => {
    if (isFinalizingVote) {
      return;
    }

    setIsSubmitConfirmVisible(false);
  }, [isFinalizingVote]);

  const handleConfirmSubmit = useCallback(async () => {
    if (!session || isFinalizingVote) {
      return;
    }

    setIsFinalizingVote(true);
    try {
      await groupSessionsService.finalizeMemberVote(session.sessionId, {});
      const nextVotes = await groupSessionsService.getVotes(session.sessionId);
      setVoteData(nextVotes);
      setIsSubmitConfirmVisible(false);
    } finally {
      setIsFinalizingVote(false);
    }
  }, [isFinalizingVote, session]);

  const closeCreatorOnlyModal = useCallback(() => {
    setIsCreatorOnlyModalVisible(false);
  }, []);

  const handleFinalizeSessionPress = useCallback(
    async (currentSession: GroupSessionItem) => {
      if (isFinalizingSession) {
        return;
      }

      if (currentSession.voteStatus === 'FINALIZED') {
        return;
      }

      const isCreator = Boolean(currentUserId && currentSession.creator?.id === currentUserId);
      if (!isCreator) {
        setIsCreatorOnlyModalVisible(true);
        return;
      }

      setIsFinalizingSession(true);
      try {
        const response = await groupSessionsService.finalizeSessionVote(currentSession.sessionId);

        setSession((prev) =>
          prev
            ? {
                ...prev,
                voteStatus: response.voteStatus,
                winningPlaceId: response.winningPlaceId,
              }
            : prev
        );

        setVoteData((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            voteStatus: response.voteStatus,
            totalMembers: response.totalMembers,
            totalVotes: response.totalVotes,
            results: response.results,
          };
        });

        if (response.winningPlaceId) {
          setCelebratingWinnerPlaceId(response.winningPlaceId);
          setTimeout(() => {
            setCelebratingWinnerPlaceId(null);
          }, 1800);
        }
      } finally {
        setIsFinalizingSession(false);
      }
    },
    [currentUserId, isFinalizingSession]
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
            onPress={() => router.replace('/(tabs)/group')}
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
          <View className="mt-3 gap-5">
            <GroupSessionCard
              item={session}
              onShare={handleShare}
              onFinalize={handleFinalizeSessionPress}
              isFinalizing={isFinalizingSession}
              finalizeLabel={t('group.finalizeGroupResult')}
              finalizingLabel={t('group.finalizingGroupResult')}
              hasMembers={hasMembers}
            />

            {hasMembers ? (
              <>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Typography variant="h5">{t('group.placeCandidates')}</Typography>
                    <Typography className="mt-1 text-gray-500">
                      {t('group.totalPlaces', { count: sortedResults.length })}
                    </Typography>
                  </View>

                  <View className="flex-row items-center gap-5">
                    {sortedResults.length > 0 && votedPlaceId && !isCurrentUserVoteFinalized && (
                      <Button
                        variant="outline"
                        rounded="full"
                        size="sm"
                        onPress={() => setIsSubmitConfirmVisible(true)}
                        disabled={isFinalizingVote}
                      >
                        {isFinalizingVote ? t('group.submittingVote') : t('group.submit')}
                      </Button>
                    )}

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
                      const isVotedFinalized = isVoted && isCurrentUserVoteFinalized;
                      const isWinningPlace = session.winningPlaceId === result.place.id;
                      const isWinnerCelebrating = celebratingWinnerPlaceId === result.place.id;
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
                            borderWidth: isWinningPlace ? 2 : 0,
                            borderColor: isWinningPlace ? '#FACC15' : 'transparent',
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

                                <View className="mt-1 flex-row items-center justify-between">
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

                                  <Typography>
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
                                    style={
                                      isVotedFinalized
                                        ? {
                                            borderColor: Palette.green,
                                            backgroundColor: Palette.green,
                                          }
                                        : undefined
                                    }
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      void handleVotePress(result.place.id);
                                    }}
                                    disabled={
                                      isVotingPlaceId !== null || session.voteStatus === 'FINALIZED'
                                    }
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

      <WinnerFireworks visible={celebratingWinnerPlaceId !== null} />

      <Modal
        visible={isSubmitConfirmVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSubmitConfirmModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={closeSubmitConfirmModal}>
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>

          <View
            className="w-full rounded-t-[24px] bg-white px-4 pb-8 shadow-xl"
            style={{ paddingBottom: insets.bottom + 32 }}
          >
            <View className="mb-2 mt-3 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <View className="mb-5 items-center">
              <Typography variant="h4" className="text-center">
                {t('group.submitConfirmTitle')}
              </Typography>
              <Typography className="mt-2 text-center text-gray-500">
                {t('group.submitConfirmMessage')}
              </Typography>
            </View>

            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                rounded="full"
                className="flex-1"
                onPress={closeSubmitConfirmModal}
                disabled={isFinalizingVote}
              >
                {t('auth.cancel')}
              </Button>

              <Button
                rounded="full"
                className="flex-1"
                onPress={handleConfirmSubmit}
                disabled={isFinalizingVote}
              >
                {isFinalizingVote ? t('group.submittingVote') : t('group.confirmSubmit')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCreatorOnlyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCreatorOnlyModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={closeCreatorOnlyModal}>
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>

          <View
            className="w-full rounded-t-[24px] bg-white px-4 pb-8 shadow-xl"
            style={{ paddingBottom: insets.bottom + 32 }}
          >
            <View className="mb-2 mt-3 items-center">
              <View className="h-1 w-10 rounded-full bg-gray-300" />
            </View>

            <View className="mb-5 items-center">
              <Typography variant="h4" className="text-center">
                {t('group.finalizeCreatorOnlyTitle')}
              </Typography>
              <Typography className="mt-2 text-center text-gray-500">
                {t('group.finalizeCreatorOnlyMessage')}
              </Typography>
            </View>

            <Button rounded="full" className="w-full" onPress={closeCreatorOnlyModal}>
              {t('group.ok')}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
