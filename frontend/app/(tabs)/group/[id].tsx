import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ArrowLeft, Copy, Heart, Share2, Star, Trash2, X } from 'lucide-react-native';
import { isAxiosError } from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { io, type Socket } from 'socket.io-client';
import Typography from '@/components/ui/Typography';
import { API_BASE_URL } from '@/api/client';
import { groupSessionsService } from '@/api/groupSessions';
import { favoriteService } from '@/api/favorite';
import { Palette } from '@/constants/theme';
import { DEFAULT_PLACE_IMAGE, getPrimaryImageUrl } from '@/constants/helper';
import type {
  GroupSessionCandidateItem,
  GroupSessionItem,
  GroupSessionMember,
  GroupVoteItem,
  GroupVoteResult,
  PlaceRecommendationItem,
} from '@/types/api';
import { Card } from '@/components/ui/Card';
import GroupSessionAvatarStack from '@/components/ui/GroupSessionAvatarStack';
import AlertScreen from '@/components/ui/AlertScreen';
import GroupLocationMapbox from '@/components/ui/GroupLocationMapbox';
import GroupAddLocationSheet from '@/components/ui/GroupAddLocationSheet';
import { usePlacesStore } from '@/store/usePlacesStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupSessionStore } from '@/store/useGroupSessionStore';
import { useLocationStore } from '@/store/useLocationStore';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import {
  MemberLocation,
  RealtimeLocationOffline,
  RealtimeLocationSnapshot,
  RealtimeLocationUpdated,
} from '@/types/api';

const LOCATION_HEARTBEAT_INTERVAL_MS = (() => {
  const parsed = Number(process.env.EXPO_PUBLIC_LOCATION_HEARTBEAT_MS ?? 15_000);

  if (Number.isFinite(parsed) && parsed >= 2000) {
    return Math.floor(parsed);
  }

  return 15_000;
})();

const resolveSocketUrl = () => {
  const override = process.env.EXPO_PUBLIC_WS_BASE_URL?.trim();
  const raw = override || API_BASE_URL;
  return raw.replace(/\/+$/, '');
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

const GroupSessionCard = ({
  item,
  onShare,
  onFinalize,
  isFinalizing,
  finalizeLabel,
  finalizingLabel,
  hasMembers,
  currentUserId,
  currentUserPictureUrl,
  currentUserAvatarVersion,
  avatarCacheEpoch,
  onClose,
  isClosing,
}: {
  item: GroupSessionItem;
  onShare: (session: GroupSessionItem) => void;
  onFinalize: (session: GroupSessionItem) => void;
  isFinalizing: boolean;
  finalizeLabel: string;
  finalizingLabel: string;
  hasMembers: boolean;
  currentUserId: string | null;
  currentUserPictureUrl: string | null;
  currentUserAvatarVersion: number;
  avatarCacheEpoch: number;
  onClose: (session: GroupSessionItem) => void;
  isClosing: boolean;
}) => {
  const membersForDisplay = useMemo(() => {
    const members = item.members ?? [];

    if (!currentUserId || !currentUserPictureUrl) {
      return members;
    }

    let hasAvatarOverride = false;
    const nextMembers = members.map((member) => {
      if (member.userId !== currentUserId || !member.user) {
        return member;
      }

      const existingPictureUrl = member.user.pictureUrl?.trim() ?? null;
      if (existingPictureUrl === currentUserPictureUrl) {
        return member;
      }

      hasAvatarOverride = true;
      return {
        ...member,
        user: {
          ...member.user,
          pictureUrl: currentUserPictureUrl,
        },
      };
    });

    return hasAvatarOverride ? nextMembers : members;
  }, [currentUserId, currentUserPictureUrl, item.members]);

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

            {currentUserId === item.creator?.id && (
              <Pressable
                accessibilityRole="button"
                className={clsx('h-10 w-10 items-center justify-center rounded-full', {
                  'bg-gray-200': item.status !== 'ACTIVE',
                  'bg-white': item.status === 'ACTIVE',
                })}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                disabled={item.status !== 'ACTIVE' || isClosing}
                onPress={() => onClose(item)}
              >
                <X
                  size={16}
                  color={item.status !== 'ACTIVE' ? '#9CA3AF' : Palette.black}
                  strokeWidth={2}
                />
              </Pressable>
            )}
          </View>
        </View>

        <View className="mt-3 justify-between items-center flex-row gap-2">
          <GroupSessionAvatarStack
            members={membersForDisplay}
            currentUserId={currentUserId}
            currentUserAvatarVersion={currentUserAvatarVersion}
            avatarCacheEpoch={avatarCacheEpoch}
          />
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const horizontalPadding = 16;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const currentUserId = useAuthStore((state) => state.me?.id ?? null);
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUserPictureUrl = useAuthStore((state) => state.me?.pictureUrl?.trim() ?? null);
  const currentUserAvatarVersion = useAuthStore((state) => state.meFetchedAt);
  const avatarCacheEpoch = useAuthStore((state) => state.avatarCacheEpoch);
  const fetchMe = useAuthStore((state) => state.fetchMe);
  const fetchSessionById = useGroupSessionStore((state) => state.fetchSessionById);
  const upsertSession = useGroupSessionStore((state) => state.upsertSession);
  const session = useGroupSessionStore((state) => (id ? (state.sessionsById[id] ?? null) : null));

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVotes, setIsLoadingVotes] = useState(true);
  const [candidateData, setCandidateData] = useState<{
    sessionId: string;
    candidates: GroupSessionCandidateItem[];
    total: number;
  } | null>(null);
  const [voteData, setVoteData] = useState<GroupVoteItem | null>(null);
  const [isVotingPlaceId, setIsVotingPlaceId] = useState<string | null>(null);
  const [isFinalizingVote, setIsFinalizingVote] = useState(false);
  const [isFinalizingSession, setIsFinalizingSession] = useState(false);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);
  const [isCreatorOnlyModalVisible, setIsCreatorOnlyModalVisible] = useState(false);
  const [isFinalizeWarningVisible, setIsFinalizeWarningVisible] = useState(false);
  const [finalizeWarningMessageKey, setFinalizeWarningMessageKey] = useState<
    'group.finalizeWarningMissingVotesMessage' | 'group.finalizeWarningUnfinalizedMembersMessage'
  >('group.finalizeWarningMissingVotesMessage');
  const [sessionToFinalize, setSessionToFinalize] = useState<GroupSessionItem | null>(null);
  const [celebratingWinnerPlaceId, setCelebratingWinnerPlaceId] = useState<string | null>(null);
  const [favoriteMap, setFavoriteMap] = useState<Record<string, boolean>>({});
  const [favoriteLoadingMap, setFavoriteLoadingMap] = useState<Record<string, boolean>>({});
  const [sessionToClose, setSessionToClose] = useState<GroupSessionItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isMapInteracting, setIsMapInteracting] = useState(false);
  const [memberLocationsById, setMemberLocationsById] = useState<Record<string, MemberLocation>>(
    {}
  );
  const [isDeletingCandidateId, setIsDeletingCandidateId] = useState<string | null>(null);
  const [swipedCandidateId, setSwipedCandidateId] = useState<string | null>(null);
  const [isAddLocationSheetVisible, setIsAddLocationSheetVisible] = useState(false);
  const [isAddingPlaceId, setIsAddingPlaceId] = useState<string | null>(null);
  const swipeAnimations = useRef<Record<string, Animated.Value>>({});

  const tabBarStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      bottom: insets.bottom + 4,
      left: 16,
      right: 16,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'white',
      paddingBottom: 0,
      paddingTop: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    }),
    [insets.bottom]
  );

  useFocusEffect(
    useCallback(() => {
      const parentNavigation = navigation.getParent();

      parentNavigation?.setOptions({
        tabBarStyle: { ...tabBarStyle, display: 'none' },
      });

      return () => {
        parentNavigation?.setOptions({
          tabBarStyle,
        });
      };
    }, [navigation, tabBarStyle])
  );

  // Recommendations API
  const [recommendedPlaces, setRecommendedPlaces] = useState<PlaceRecommendationItem[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);

  const placesById = usePlacesStore((state) => state.placesById);
  const setPlaceFavorite = usePlacesStore((state) => state.setPlaceFavorite);
  const coords = useLocationStore((state) => state.coords);
  const ensureLocation = useLocationStore((state) => state.ensureLocation);
  const locationSocketRef = useRef<Socket | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coordsRef = useRef(coords);
  const lastSentCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const memberLocations = useMemo(
    () =>
      Object.entries(memberLocationsById).map(([memberId, location]) => ({
        memberId,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    [memberLocationsById]
  );

  const memberAvatarUrls = useMemo(() => {
    const nextAvatarUrls: Record<string, string | null> = {};

    session?.members?.forEach((member) => {
      const memberId = member.userId?.trim();
      if (!memberId) {
        return;
      }

      nextAvatarUrls[memberId] = member.user?.pictureUrl?.trim() ?? null;
    });

    if (currentUserId) {
      nextAvatarUrls[currentUserId] = currentUserPictureUrl;
    }

    return nextAvatarUrls;
  }, [currentUserId, currentUserPictureUrl, session?.members]);

  useEffect(() => {
    coordsRef.current = coords;
  }, [coords]);

  const emitLocationUpdate = useCallback(
    (options?: { force?: boolean }) => {
      if (!id) {
        return;
      }

      const socket = locationSocketRef.current;
      const latestCoords = coordsRef.current;

      if (!socket || !socket.connected || !latestCoords) {
        return;
      }

      const force = options?.force ?? false;
      const previousCoords = lastSentCoordsRef.current;

      if (
        !force &&
        previousCoords &&
        previousCoords.latitude === latestCoords.latitude &&
        previousCoords.longitude === latestCoords.longitude
      ) {
        return;
      }

      socket.emit('location.update', {
        sessionId: id,
        latitude: latestCoords.latitude,
        longitude: latestCoords.longitude,
      });

      lastSentCoordsRef.current = {
        latitude: latestCoords.latitude,
        longitude: latestCoords.longitude,
      };
    },
    [id]
  );

  const hasMembers = useMemo(() => (session?.members?.length ?? 0) > 1, [session?.members?.length]);
  const isActiveSession = session?.status === 'ACTIVE';

  const mergeCurrentUserAvatar = useCallback(
    (members: GroupSessionMember[] | undefined) => {
      const safeMembers = members ?? [];

      if (!currentUserId || !currentUserPictureUrl) {
        return safeMembers;
      }

      let hasAvatarOverride = false;
      const nextMembers = safeMembers.map((member) => {
        if (member.userId !== currentUserId || !member.user) {
          return member;
        }

        const existingPictureUrl = member.user.pictureUrl?.trim() ?? null;
        if (existingPictureUrl === currentUserPictureUrl) {
          return member;
        }

        hasAvatarOverride = true;
        return {
          ...member,
          user: {
            ...member.user,
            pictureUrl: currentUserPictureUrl,
          },
        };
      });

      return hasAvatarOverride ? nextMembers : safeMembers;
    },
    [currentUserId, currentUserPictureUrl]
  );

  const loadData = useCallback(
    async (isActiveRef: { current: boolean }) => {
      setIsLoading(true);
      setIsLoadingVotes(true);

      try {
        if (id) {
          const [, votes, candidates] = await Promise.all([
            fetchSessionById(id, { force: true }),
            groupSessionsService.getVotes(id),
            groupSessionsService.getCandidates(id),
          ]);

          if (isActiveRef.current) {
            setCandidateData(candidates);
            setVoteData(votes);
          }
        } else if (isActiveRef.current) {
          setCandidateData(null);
          setVoteData(null);
        }
      } catch {
        if (isActiveRef.current) {
          setCandidateData(null);
          setVoteData(null);
        }
      } finally {
        if (isActiveRef.current) {
          setIsLoading(false);
          setIsLoadingVotes(false);
        }
      }
    },
    [fetchSessionById, id]
  );

  const loadRecommendations = useCallback(
    async (isActiveRef: { current: boolean }) => {
      const currentSession = id ? useGroupSessionStore.getState().sessionsById[id] : null;
      if (!id || !currentSession) {
        return;
      }

      // Only load recommendations if session is ACTIVE
      if (currentSession.status !== 'ACTIVE') {
        setRecommendationsError(null);
        setRecommendedPlaces([]);
        return;
      }

      setIsLoadingRecommendations(true);
      setRecommendationsError(null);

      try {
        // Only send guestId if no currentUserId
        const guestId = !currentUserId ? (currentSession.members?.[0]?.guestId ?? undefined) : undefined;
        const recommendations = await groupSessionsService.getRecommendations(id, guestId);

        if (isActiveRef.current) {
          setRecommendedPlaces(recommendations);
        }
      } catch (error) {
        if (isActiveRef.current) {
          if (isAxiosError(error) && error.response?.status === 422) {
            // NOT_ENOUGH_MEMBERS_FOR_RECOMMENDATION
            setRecommendationsError('group.needActiveMembersDesc');
          } else {
            setRecommendationsError('group.failedToLoadRecommendations');
          }
          setRecommendedPlaces([]);
        }
      } finally {
        if (isActiveRef.current) {
          setIsLoadingRecommendations(false);
        }
      }
    },
    [currentUserId, id]
  );

  useFocusEffect(
    useCallback(() => {
      const activeRef = { current: true };
      void loadData(activeRef);

      // Load recommendations after session is loaded
      setTimeout(() => {
        void loadRecommendations(activeRef);
      }, 300);

      return () => {
        activeRef.current = false;
      };
    }, [loadData, loadRecommendations])
  );

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    void ensureLocation();
  }, [ensureLocation]);

  const refreshGroupSessionData = useCallback(
    async (sessionId: string) => {
      if (!sessionId) {
        return;
      }

      try {
        const [refreshedSession, votes, candidates] = await Promise.all([
          fetchSessionById(sessionId, { force: true }),
          groupSessionsService.getVotes(sessionId),
          groupSessionsService.getCandidates(sessionId),
        ]);

        if (!refreshedSession) {
          return;
        }

        upsertSession(refreshedSession);
        setVoteData(votes);
        setCandidateData(candidates);
      } catch {
        // Keep current data when realtime refresh fails.
      }
    },
    [fetchSessionById, upsertSession]
  );

  useEffect(() => {
    if (!id || !accessToken) {
      return;
    }

    const socket = io(`${resolveSocketUrl()}/notifications`, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    locationSocketRef.current = socket;

    const handleConnect = () => {
      socket.emit('session.join', { sessionId: id });
      emitLocationUpdate({ force: true });
    };

    const handleLocationSnapshot = (payload: RealtimeLocationSnapshot) => {
      if (!payload || payload.sessionId !== id || !Array.isArray(payload.locations)) {
        return;
      }

      const nextMemberLocations: Record<string, MemberLocation> = {};

      payload.locations.forEach((item) => {
        const userId = item.userId?.trim();
        if (!userId || userId === currentUserId) {
          return;
        }

        if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') {
          return;
        }

        if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) {
          return;
        }

        nextMemberLocations[userId] = {
          latitude: item.latitude,
          longitude: item.longitude,
        };
      });

      setMemberLocationsById(nextMemberLocations);
    };

    const handleLocationUpdated = (payload: RealtimeLocationUpdated) => {
      const userId = payload.userId?.trim();
      if (!userId || userId === currentUserId) {
        return;
      }

      const latitude = payload.latitude;
      const longitude = payload.longitude;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return;
      }

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      // Check if this is a new member location (first time seeing this userId)
      const isNewMember = !memberLocationsById[userId];

      // Update member location immediately
      setMemberLocationsById((prev) => ({
        ...prev,
        [userId]: {
          latitude,
          longitude,
        },
      }));

      // Refresh session data when a new member joins to sync member info
      // This ensures new members are properly added to the session members list
      if (isNewMember) {
        setTimeout(() => {
          void refreshGroupSessionData(id);
        }, 300);
      }
    };

    const handleLocationOffline = (payload: RealtimeLocationOffline) => {
      const userId = payload.userId?.trim();
      if (!userId) {
        return;
      }

      setMemberLocationsById((prev) => {
        if (!prev[userId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    const handleNotificationReceived = (event: { type?: string; sessionId?: string }) => {
      const eventType = event.type?.trim();
      const sessionId = event.sessionId?.trim();

      if (!eventType || sessionId !== id) {
        return;
      }

      if (
        eventType !== 'candidate.added' &&
        eventType !== 'candidate.removed' &&
        eventType !== 'vote.cast' &&
        eventType !== 'vote.member_finalized' &&
        eventType !== 'vote.session_finalized' &&
        eventType !== 'session.closed' &&
        eventType !== 'session.member_left'
      ) {
        return;
      }

      void refreshGroupSessionData(sessionId);
    };

    socket.on('connect', handleConnect);
    socket.on('location.snapshot', handleLocationSnapshot);
    socket.on('location.updated', handleLocationUpdated);
    socket.on('location.offline', handleLocationOffline);
    socket.on('notification.received', handleNotificationReceived);

    heartbeatTimerRef.current = setInterval(() => {
      emitLocationUpdate({ force: true });
    }, LOCATION_HEARTBEAT_INTERVAL_MS);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('location.snapshot', handleLocationSnapshot);
      socket.off('location.updated', handleLocationUpdated);
      socket.off('location.offline', handleLocationOffline);
      socket.off('notification.received', handleNotificationReceived);

      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }

      if (socket.connected) {
        socket.emit('session.leave', { sessionId: id });
      }

      socket.disconnect();

      if (locationSocketRef.current === socket) {
        locationSocketRef.current = null;
      }

      lastSentCoordsRef.current = null;
      setMemberLocationsById({});
    };
  }, [accessToken, currentUserId, emitLocationUpdate, id, refreshGroupSessionData]);

  useEffect(() => {
    if (!coords) {
      return;
    }

    emitLocationUpdate();
  }, [coords, emitLocationUpdate]);

  const sortedResults = useMemo(() => {
    const candidateList = candidateData?.candidates ?? [];
    const resultsArray = voteData && Array.isArray(voteData.results) ? voteData.results : [];
    const resultsByPlaceId = new Map(resultsArray.map((result) => [result.place.id, result]));

    const sorted = candidateList
      .map((candidate) => {
        const voteResult = resultsByPlaceId.get(candidate.placeId);

        return {
          place: candidate.place,
          count: voteResult?.count ?? 0,
          voters: voteResult?.voters ?? [],
        };
      })
      .sort((a, b) => b.count - a.count);
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
  }, [candidateData?.candidates, session?.winningPlaceId, voteData?.results]);

  const currentUserVote = useMemo(() => {
    if (!currentUserId) {
      return null;
    }

    return voteData?.votes?.find((vote) => vote.member?.userId === currentUserId) ?? null;
  }, [currentUserId, voteData?.votes]);

  const votedPlaceId = currentUserVote?.placeId ?? null;
  const isCurrentUserVoteFinalized = currentUserVote?.isFinalized ?? false;

  const mapPlaces = useMemo(
    () =>
      sortedResults
        .map((result) => {
          const cachedPlace = placesById[result.place.id];
          if (!cachedPlace) {
            return null;
          }

          return {
            id: result.place.id,
            name: result.place.name,
            latitude: cachedPlace.latitude,
            longitude: cachedPlace.longitude,
          };
        })
        .filter(
          (place): place is { id: string; name: string; latitude: number; longitude: number } =>
            Boolean(place)
        ),
    [placesById, sortedResults]
  );

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

  const openAddLocationSheet = useCallback(() => {
    setIsAddLocationSheetVisible(true);
  }, [router]);

  const closeAddLocationSheet = useCallback(() => {
    setIsAddLocationSheetVisible(false);
  }, []);

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

  const handleAddPlaceToSession = useCallback(
    async (placeId: string) => {
      if (!session || isAddingPlaceId || session.status !== 'ACTIVE') {
        return;
      }

      setIsAddingPlaceId(placeId);
      try {
        const guestId = !currentUserId ? (session.members?.[0]?.guestId ?? undefined) : undefined;
        await groupSessionsService.addCandidate(session.sessionId, {
          placeId,
          guestId,
        });
        await refreshGroupSessionData(session.sessionId);
      } finally {
        setIsAddingPlaceId(null);
      }
    },
    [currentUserId, isAddingPlaceId, refreshGroupSessionData, session]
  );

  const handleNavigateToPlace = useCallback(
    (placeId: string) => {
      router.push(`/place/${placeId}` as any);
    },
    [router]
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
      const finalizeResponse = await groupSessionsService.finalizeMemberVote(session.sessionId, {});
      const [nextVotes, refreshedSession] = await Promise.all([
        groupSessionsService.getVotes(session.sessionId),
        finalizeResponse.voteAutoFinalized
          ? fetchSessionById(session.sessionId, { force: true })
          : Promise.resolve(null),
      ]);

      setVoteData(nextVotes);

      if (finalizeResponse.voteAutoFinalized && refreshedSession?.winningPlaceId) {
        setCelebratingWinnerPlaceId(refreshedSession.winningPlaceId);
        setTimeout(() => {
          setCelebratingWinnerPlaceId(null);
        }, 1800);
      }

      setIsSubmitConfirmVisible(false);
    } finally {
      setIsFinalizingVote(false);
    }
  }, [fetchSessionById, isFinalizingVote, session]);

  const closeCreatorOnlyModal = useCallback(() => {
    setIsCreatorOnlyModalVisible(false);
  }, []);

  const executeFinalizeSession = useCallback(
    async (currentSession: GroupSessionItem) => {
      if (isFinalizingSession) {
        return;
      }

      setIsFinalizingSession(true);
      try {
        const response = await groupSessionsService.finalizeSessionVote(currentSession.sessionId);

        upsertSession({
          ...currentSession,
          voteStatus: response.voteStatus,
          winningPlaceId: response.winningPlaceId,
        });

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
    [isFinalizingSession, upsertSession]
  );

  const closeFinalizeWarningModal = useCallback(() => {
    if (isFinalizingSession) {
      return;
    }

    setIsFinalizeWarningVisible(false);
    setSessionToFinalize(null);
  }, [isFinalizingSession]);

  const confirmFinalizeWithWarning = useCallback(async () => {
    if (!sessionToFinalize || isFinalizingSession) {
      return;
    }

    await executeFinalizeSession(sessionToFinalize);
    setIsFinalizeWarningVisible(false);
    setSessionToFinalize(null);
  }, [executeFinalizeSession, isFinalizingSession, sessionToFinalize]);

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

      const totalMembers =
        voteData?.totalMembers ?? currentSession.members?.length ?? session?.members?.length ?? 0;
      const totalVotes = voteData?.totalVotes ?? 0;
      const finalizedCount = voteData?.finalizedCount ?? 0;

      if (totalMembers > 0 && totalVotes !== totalMembers) {
        setFinalizeWarningMessageKey('group.finalizeWarningMissingVotesMessage');
        setSessionToFinalize(currentSession);
        setIsFinalizeWarningVisible(true);
        return;
      }

      if (totalMembers > 0 && finalizedCount !== totalMembers) {
        setFinalizeWarningMessageKey('group.finalizeWarningUnfinalizedMembersMessage');
        setSessionToFinalize(currentSession);
        setIsFinalizeWarningVisible(true);
        return;
      }

      await executeFinalizeSession(currentSession);
    },
    [currentUserId, executeFinalizeSession, isFinalizingSession, session?.members?.length, voteData]
  );

  const openCloseConfirm = useCallback((session: GroupSessionItem) => {
    setSessionToClose(session);
  }, []);

  const closeConfirmModal = useCallback(() => {
    if (isClosing) {
      return;
    }
    setSessionToClose(null);
  }, [isClosing]);

  const handleConfirmClose = useCallback(async () => {
    if (!sessionToClose || isClosing) {
      return;
    }

    setIsClosing(true);
    try {
      await groupSessionsService.closeGroupSession(sessionToClose.sessionId);
      setSessionToClose(null);
      router.replace('/(tabs)/group' as any);
    } finally {
      setIsClosing(false);
    }
  }, [isClosing, sessionToClose, router]);

  const handleDeleteCandidate = useCallback(
    async (placeId: string) => {
      if (!session || isDeletingCandidateId) {
        return;
      }

      setIsDeletingCandidateId(placeId);
      try {
        await groupSessionsService.deleteCandidate(session.sessionId, placeId);
        setCandidateData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            candidates: prev.candidates.filter((c) => c.placeId !== placeId),
          };
        });
        setSwipedCandidateId(null);
      } catch (error) {
        console.log('Error deleting candidate:', error);
      } finally {
        setIsDeletingCandidateId(null);
      }
    },
    [session, isDeletingCandidateId]
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
          paddingHorizontal: horizontalPadding,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.replace('/(tabs)/group')}
            >
              <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
            </Pressable>
            <Typography variant="h4">{t('group.detailTitle')}</Typography>
          </View>
        </View>
      </View>

      <ScrollView
        scrollEnabled={!isMapInteracting}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingBottom: insets.bottom,
        }}
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
              currentUserId={currentUserId}
              currentUserPictureUrl={currentUserPictureUrl}
              currentUserAvatarVersion={currentUserAvatarVersion}
              avatarCacheEpoch={avatarCacheEpoch}
              onClose={openCloseConfirm}
              isClosing={isClosing}
            />

            {hasMembers ? (
              <>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Typography variant="h5">{t('group.placeCandidates')}</Typography>
                    <Typography className="mt-1 text-gray-500">
                      {t('group.totalPlaces', {
                        count: sortedResults.length,
                      })}
                    </Typography>
                  </View>
                </View>

                {isLoadingVotes ? (
                  <View className="rounded-2xl border border-[#ECECF0] bg-white p-4">
                    <Typography className="text-gray-500">{t('group.loadingGroups')}</Typography>
                  </View>
                ) : (
                  <>
                    {isActiveSession ? (
                      <GroupLocationMapbox
                        userCoords={coords}
                        userAvatarUrl={currentUserPictureUrl}
                        currentUserId={currentUserId}
                        currentUserAvatarVersion={currentUserAvatarVersion}
                        avatarCacheEpoch={avatarCacheEpoch}
                        memberAvatarUrls={memberAvatarUrls}
                        memberLocations={memberLocations}
                        places={mapPlaces}
                        recommendedPlaces={recommendedPlaces}
                        onAddRecommendPlace={handleAddPlaceToSession}
                        isAddingPlaceId={isAddingPlaceId}
                        height={280}
                        onMapInteractionStart={() => setIsMapInteracting(true)}
                        onMapInteractionEnd={() => setIsMapInteracting(false)}
                      />
                    ) : null}

                    {/* Vote Results */}
                    {sortedResults.length > 0 && (
                      <View className="mt-3 gap-3">
                        {sortedResults.map((result, index) => {
                          const candidateKey = result.place.id;
                          if (!swipeAnimations.current[candidateKey]) {
                            swipeAnimations.current[candidateKey] = new Animated.Value(0);
                          }
                          const swipeX = swipeAnimations.current[candidateKey];
                          const isSwiped = swipedCandidateId === candidateKey;

                          const panResponder = PanResponder.create({
                            onStartShouldSetPanResponder: () => true,
                            onMoveShouldSetPanResponder: (evt, gestureState) => {
                              return (
                                Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 20
                              );
                            },
                            onPanResponderMove: (evt, gestureState) => {
                              const dx = Math.min(gestureState.dx, 0);
                              if (dx < 0) {
                                swipeX.setValue(dx);
                              }
                            },
                            onPanResponderRelease: (evt, gestureState) => {
                              if (gestureState.dx < -80) {
                                setSwipedCandidateId(candidateKey);
                                Animated.spring(swipeX, {
                                  toValue: -80,
                                  useNativeDriver: false,
                                }).start();
                              } else {
                                setSwipedCandidateId(null);
                                Animated.spring(swipeX, {
                                  toValue: 0,
                                  useNativeDriver: false,
                                }).start();
                              }
                            },
                          });
                          const placeImageUrl = getPrimaryImageUrl(result.place.featureImageUrl);
                          const isVoted = votedPlaceId === result.place.id;
                          const isVotedFinalized = isVoted && isCurrentUserVoteFinalized;
                          const isWinningPlace = session.winningPlaceId === result.place.id;
                          const isFeaturedWinner = !isActiveSession && index === 0;
                          const voters = mergeCurrentUserAvatar(
                            toAvatarMembers(session.sessionId, result.voters)
                          );
                          const isFavorite = favoriteMap[result.place.id] ?? false;

                          return (
                            <View key={result.place.id} className="relative rounded-3xl">
                              {/* Delete Action Background */}
                              <View className="absolute inset-0 bg-red-500 rounded-3xl flex-row items-center justify-end pr-4 z-0 overflow-hidden">
                                <Pressable
                                  onPress={() => handleDeleteCandidate(result.place.id)}
                                  disabled={isDeletingCandidateId === result.place.id}
                                  className="h-8 w-8 items-center justify-center"
                                >
                                  <Trash2 size={20} color="white" strokeWidth={2.2} />
                                </Pressable>
                              </View>

                              {/* Swipeable Card */}
                              <Animated.View
                                style={{ transform: [{ translateX: swipeX }] }}
                                {...panResponder.panHandlers}
                              >
                                <Card
                                  className="overflow-hidden self-center w-full bg-white"
                                  style={{
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.18,
                                    shadowRadius: 8,
                                    elevation: 3,
                                    boxShadow: '0px 2px 8px rgba(0,0,0,0.18)',
                                    borderWidth: isFeaturedWinner ? 3 : isWinningPlace ? 2 : 0,
                                    borderColor: isFeaturedWinner
                                      ? '#FACC15'
                                      : isWinningPlace
                                        ? '#FACC15'
                                        : 'transparent',
                                  }}
                                >
                                  <Pressable
                                    className={clsx('relative rounded-3xl', {
                                      'p-4': isFeaturedWinner,
                                      'p-3': !isFeaturedWinner,
                                    })}
                                    onPress={() => router.push(`/place/${result.place.id}` as any)}
                                  >
                                    {index === 0 ? (
                                      <View
                                        className={clsx(
                                          'absolute left-[-30px] top-[10px] w-[104px] -rotate-45 py-1 items-center z-10',
                                          isFeaturedWinner ? 'bg-[#FACC15]' : 'bg-[#FACC15]'
                                        )}
                                      >
                                        <Typography variant="h5">{t('group.rank1')}</Typography>
                                      </View>
                                    ) : null}

                                    <View className="flex-row gap-3 items-center">
                                      <Image
                                        source={
                                          placeImageUrl
                                            ? { uri: placeImageUrl }
                                            : DEFAULT_PLACE_IMAGE
                                        }
                                        style={{
                                          width: isFeaturedWinner ? 160 : 135,
                                          height: isFeaturedWinner ? 112 : 95,
                                          borderRadius: 12,
                                        }}
                                        contentFit="cover"
                                      />

                                      <View className="flex-1">
                                        <View className="flex-row items-center justify-between gap-2">
                                          <Typography
                                            variant={isFeaturedWinner ? 'h4' : 'h5'}
                                            className="flex-1"
                                            numberOfLines={2}
                                          >
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

                                        {(() => {
                                          const addressFromCandidate =
                                            result.place.fullAddress?.trim() ?? null;
                                          const addressFromCache =
                                            placesById[result.place.id]?.fullAddress?.trim() ??
                                            null;
                                          const displayAddress =
                                            addressFromCandidate || addressFromCache;

                                          return displayAddress ? (
                                            <Typography
                                              className="mt-1 text-[#6B7280]"
                                              numberOfLines={1}
                                            >
                                              {displayAddress}
                                            </Typography>
                                          ) : null;
                                        })()}

                                        <View className="mt-2 flex-row items-center justify-between gap-2">
                                          <GroupSessionAvatarStack
                                            members={voters}
                                            size={isFeaturedWinner ? 28 : 24}
                                            currentUserId={currentUserId}
                                            currentUserAvatarVersion={currentUserAvatarVersion}
                                            avatarCacheEpoch={avatarCacheEpoch}
                                          />

                                          {isActiveSession ? (
                                            <Pressable
                                              className={clsx(
                                                'min-w-[86px] items-center justify-center rounded-full border px-4 py-1.5',
                                                isVoted
                                                  ? 'border-black bg-black'
                                                  : 'border-black bg-white'
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
                                                isVotingPlaceId !== null ||
                                                session.voteStatus === 'FINALIZED' ||
                                                (isCurrentUserVoteFinalized && !isVoted)
                                              }
                                            >
                                              <Typography
                                                className={isVoted ? 'text-white' : 'text-black'}
                                              >
                                                {isVotingPlaceId === result.place.id
                                                  ? '...'
                                                  : isVoted
                                                    ? t('group.voted')
                                                    : t('group.vote')}
                                              </Typography>
                                            </Pressable>
                                          ) : null}
                                        </View>

                                        {isFeaturedWinner ? (
                                          <View className="mt-3 flex-row gap-3">
                                            <Button
                                              variant="outline"
                                              rounded="full"
                                              className="flex-1"
                                              onPress={() => handleNavigateToPlace(result.place.id)}
                                            >
                                              Navigate
                                            </Button>

                                            <Button
                                              rounded="full"
                                              className="flex-1"
                                              onPress={() => {
                                                void handleShare(session);
                                              }}
                                            >
                                              Share
                                            </Button>
                                          </View>
                                        ) : null}
                                      </View>
                                    </View>
                                  </Pressable>
                                </Card>
                              </Animated.View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {isActiveSession ? (
                      <View className="mt-3 p-3 flex-row gap-3">
                        <Button
                          variant="outline"
                          rounded="full"
                          className="flex-1"
                          onPress={openAddLocationSheet}
                        >
                          {t('group.addLocation')}
                        </Button>

                        {sortedResults.length > 0 && votedPlaceId && !isCurrentUserVoteFinalized ? (
                          <Button
                            rounded="full"
                            className="flex-1"
                            onPress={() => setIsSubmitConfirmVisible(true)}
                            disabled={isFinalizingVote}
                          >
                            {isFinalizingVote ? t('group.submittingVote') : t('group.submit')}
                          </Button>
                        ) : null}
                      </View>
                    ) : null}

                    {sortedResults.length === 0 ? (
                      <AlertScreen
                        imageSrc={require('@/assets/images/nofriend.png')}
                        heading="group.needActiveMembers"
                        description="group.needActiveMembersDesc"
                        primaryButtonText="group.inviteFriends"
                        primaryButtonAction={handleInvitePress}
                      />
                    ) : null}
                  </>
                )}
              </>
            ) : !hasMembers ? (
              <AlertScreen
                imageSrc={require('@/assets/images/nofriend.png')}
                heading="group.noMembersTitle"
                description="group.noMembersDesc"
                primaryButtonText="group.inviteFriends"
                primaryButtonAction={handleInvitePress}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <WinnerFireworks visible={celebratingWinnerPlaceId !== null} />

      <GroupAddLocationSheet
        visible={isAddLocationSheetVisible}
        onClose={closeAddLocationSheet}
        userCoords={coords}
        memberLocations={memberLocations}
        memberAvatarUrls={memberAvatarUrls}
        currentUserId={currentUserId}
        userAvatarUrl={currentUserPictureUrl}
        currentUserAvatarVersion={currentUserAvatarVersion}
        avatarCacheEpoch={avatarCacheEpoch}
        recommendedPlaces={recommendedPlaces}
        isLoadingRecommendations={isLoadingRecommendations}
        recommendationsError={recommendationsError}
        isAddingPlaceId={isAddingPlaceId}
        onAddPlace={handleAddPlaceToSession}
      />

      <Modal
        visible={Boolean(sessionToClose)}
        transparent
        animationType="slide"
        onRequestClose={closeConfirmModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={closeConfirmModal}>
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
                {t('group.closeConfirmTitle')}
              </Typography>
              <Typography className="mt-2 text-center text-gray-500">
                {t('group.closeConfirmMessage', {
                  shareCode: sessionToClose?.shareCode ?? '',
                })}
              </Typography>
            </View>

            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                rounded="full"
                className="flex-1"
                onPress={closeConfirmModal}
                disabled={isClosing}
              >
                {t('auth.cancel')}
              </Button>

              <Button
                variant="destructive"
                rounded="full"
                className="flex-1"
                onPress={handleConfirmClose}
                disabled={isClosing}
              >
                {isClosing ? t('group.closingGroup') : t('group.confirmClose')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal
        visible={isFinalizeWarningVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFinalizeWarningModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={closeFinalizeWarningModal}>
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
                {t('group.finalizeWarningTitle')}
              </Typography>
              <Typography className="mt-2 text-center text-gray-500">
                {t(finalizeWarningMessageKey)}
              </Typography>
            </View>

            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                rounded="full"
                className="flex-1"
                onPress={closeFinalizeWarningModal}
                disabled={isFinalizingSession}
              >
                {t('auth.cancel')}
              </Button>

              <Button
                rounded="full"
                className="flex-1"
                onPress={confirmFinalizeWithWarning}
                disabled={isFinalizingSession}
              >
                {isFinalizingSession
                  ? t('group.finalizingGroupResult')
                  : t('group.finalizeWarningConfirm')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
