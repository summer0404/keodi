import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, ArrowLeft, Share2, Pin, X, Copy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import AlertScreen from '@/components/ui/AlertScreen';
import Typography from '@/components/ui/Typography';
import { groupSessionsService } from '@/api/groupSessions';
import { Palette } from '@/constants/theme';
import type { GroupSessionItem } from '@/types/api';
import { Card } from '@/components/ui/Card';
import clsx from 'clsx';
import GroupSessionAvatarStack from '@/components/ui/GroupSessionAvatarStack';
import { ResizeMode, Video } from 'expo-av';
import { usePinnedGroupSessionStore } from '@/store/usePinnedGroupSessionStore';
import { Button } from '@/components/ui/Button';
import { authService } from '@/api/auth';

const DETAIL_BATCH_SIZE = 10;
const REALTIME_REFRESH_INTERVAL_MS = 5000;

type GroupSessionCardProps = {
  item: GroupSessionItem;
  isPinned: boolean;
  isClosing: boolean;
  currentUserId: string | null;
  onShare: (session: GroupSessionItem) => void;
  onTogglePin: (sessionId: string) => void;
  onClose: (session: GroupSessionItem) => void;
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

const resolveJoinErrorMessage = (
  message: string | undefined,
  translate: (key: string) => string
) => {
  if (!message) {
    return '';
  }

  const translatedMessage = translate(`errors.${message}`);
  return translatedMessage === `errors.${message}` ? message : translatedMessage;
};
resolveJoinErrorMessage.displayName = 'resolveJoinErrorMessage';

const GroupSessionCard = React.memo(
  ({
    item,
    isPinned,
    isClosing,
    currentUserId,
    onShare,
    onTogglePin,
    onClose,
  }: GroupSessionCardProps) => {
    const router = useRouter();

    return (
      <Card
        className={clsx('overflow-hidden self-center w-full')}
        style={[
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 6,
            boxShadow: '0px 2px 12px rgba(0,0,0,0.25)',
          },
          // override background for non-active sessions without changing Card component
          item.status !== 'ACTIVE' ? { backgroundColor: '#F3F4F6' } : undefined,
        ]}
      >
        <Pressable
          className="rounded-2xl p-4"
          disabled={isClosing}
          onPress={() => router.push(`/(tabs)/group/${item.sessionId}`)}
        >
          <View className="flex-row items-center gap-3">
            <Typography variant="h5" className="text-xl">
              {item.shareCode}
            </Typography>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                void handleCopy(item.shareCode);
              }}
              className="p-1"
            >
              <Copy size={16} color={Palette.black} strokeWidth={2} />
            </Pressable>
          </View>

          <View className="mt-1 flex-row items-center justify-between">
            <GroupSessionAvatarStack members={item.members} />

            <View className="flex-row items-center gap-3">
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
                onPress={() => onShare(item)}
              >
                <Share2
                  size={16}
                  color={item.status !== 'ACTIVE' ? '#9CA3AF' : Palette.black}
                  strokeWidth={2}
                />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                className={clsx('h-10 w-10 items-center justify-center rounded-full', {
                  'bg-black': isPinned,
                  'bg-white': !isPinned,
                })}
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.18,
                  shadowRadius: 6,
                  elevation: 3,
                }}
                onPress={() => onTogglePin(item.sessionId)}
              >
                <Pin size={16} color={isPinned ? Palette.white : Palette.black} strokeWidth={2} />
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
        </Pressable>
      </Card>
    );
  }
);
GroupSessionCard.displayName = 'GroupSessionCard';

export default function GroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const horizontalPadding = 16;
  const pinnedSessionIds = usePinnedGroupSessionStore((state) => state.pinnedSessionIds);
  const togglePinnedSessionId = usePinnedGroupSessionStore((state) => state.togglePinnedSessionId);
  const removePinnedSessionId = usePinnedGroupSessionStore((state) => state.removePinnedSessionId);

  const [sessions, setSessions] = useState<GroupSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinShareCode, setJoinShareCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [sessionToClose, setSessionToClose] = useState<GroupSessionItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [blockedAction, setBlockedAction] = useState<'create' | 'join' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isRealtimeRefreshingRef = useRef(false);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;

    if (!isSilent) {
      setIsLoading(true);
    }

    try {
      const sessionList = await groupSessionsService.getGroupSessions();
      if (!Array.isArray(sessionList) || sessionList.length === 0) {
        setSessions([]);
        return;
      }

      const detailedSessions: GroupSessionItem[] = [];

      for (let index = 0; index < sessionList.length; index += DETAIL_BATCH_SIZE) {
        const batch = sessionList.slice(index, index + DETAIL_BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (session) => {
            try {
              return await groupSessionsService.getGroupSessionById(session.sessionId);
            } catch {
              return session;
            }
          })
        );

        detailedSessions.push(...batchResults);
      }

      setSessions(detailedSessions);
    } catch {
      setSessions([]);
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
      setHasLoadedInitialData(true);
    }
  }, []);

  const refreshSessionsRealtime = useCallback(async () => {
    if (isRealtimeRefreshingRef.current || isJoining || isCreating || isClosing) {
      return;
    }

    isRealtimeRefreshingRef.current = true;
    try {
      await loadData({ silent: true });
    } finally {
      isRealtimeRefreshingRef.current = false;
    }
  }, [isClosing, isCreating, isJoining, loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
      // Load current user ID
      void (async () => {
        try {
          const user = await authService.getMe();
          setCurrentUserId(user.id);
        } catch {
          setCurrentUserId(null);
        }
      })();

      const intervalId = setInterval(() => {
        void refreshSessionsRealtime();
      }, REALTIME_REFRESH_INTERVAL_MS);

      return () => {
        clearInterval(intervalId);
      };
    }, [loadData, refreshSessionsRealtime])
  );

  const activeSession = useMemo(
    () => sessions.find((session) => session.status === 'ACTIVE') ?? null,
    [sessions]
  );

  const displayedSessions = useMemo(() => {
    if (!sessions.length) {
      return sessions;
    }

    const remaining = [...sessions];
    const ordered: GroupSessionItem[] = [];

    const activeIndex = remaining.findIndex((session) => session.status === 'ACTIVE');
    if (activeIndex !== -1) {
      const [active] = remaining.splice(activeIndex, 1);
      ordered.push(active);
    }

    if (pinnedSessionIds && pinnedSessionIds.length > 0) {
      const pinnedToInclude: GroupSessionItem[] = [];
      // preserve order from pinnedSessionIds
      pinnedSessionIds.forEach((pid) => {
        const idx = remaining.findIndex((s) => s.sessionId === pid);
        if (idx !== -1) {
          pinnedToInclude.push(...remaining.splice(idx, 1));
        }
      });

      if (activeIndex === -1) {
        ordered.unshift(...pinnedToInclude);
      } else {
        ordered.push(...pinnedToInclude);
      }
    }

    ordered.push(...remaining);
    return ordered;
  }, [pinnedSessionIds, sessions]);

  const handleCreateSession = useCallback(async () => {
    if (isCreating) {
      return;
    }

    if (activeSession) {
      setBlockedAction('create');
      return;
    }

    setIsCreating(true);
    try {
      const created = await groupSessionsService.createGroupSession();
      router.push({
        pathname: '/(tabs)/group/create',
        params: {
          sessionId: created.sessionId,
          shareCode: created.shareCode,
        },
      } as any);
    } finally {
      setIsCreating(false);
    }
  }, [activeSession, isCreating, router]);

  const handleShare = useCallback(
    (session: GroupSessionItem) => {
      router.push({
        pathname: '/(tabs)/group/create/invite',
        params: {
          sessionId: session.sessionId,
          shareCode: session.shareCode,
        },
      } as any);
    },
    [router]
  );

  const handleTogglePin = useCallback(
    (sessionId: string) => {
      togglePinnedSessionId(sessionId);
    },
    [togglePinnedSessionId]
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

  const closeCreateBlockedModal = useCallback(() => {
    setBlockedAction(null);
  }, []);

  const handleJoinByShareCode = useCallback(async () => {
    if (isJoining) {
      return;
    }

    const normalizedShareCode = joinShareCode.trim().toUpperCase();
    setJoinError('');

    if (!normalizedShareCode) {
      setJoinError(t('group.shareCodeRequired'));
      return;
    }

    if (activeSession) {
      setBlockedAction('join');
      return;
    }

    setIsJoining(true);

    try {
      const joinedSession = await groupSessionsService.joinGroupSession({
        shareCode: normalizedShareCode,
      });
      setJoinShareCode('');
      await loadData();
      router.push(`/(tabs)/group/${joinedSession.sessionId}` as any);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = resolveJoinErrorMessage(
          (error.response?.data as { message?: string })?.message,
          t
        );
        setJoinError(message || t('group.joinFailed'));
        return;
      }

      setJoinError(t('group.joinFailed'));
    } finally {
      setIsJoining(false);
    }
  }, [activeSession, isJoining, joinShareCode, loadData, router, t]);

  const joinInput = (
    <View className="mt-6 px-1">
      <Typography variant="h5" className="mb-3 text-black">
        {t('group.joinQuickly')}
      </Typography>

      <View className="flex-row items-center rounded-2xl border-2 border-black bg-white p-1">
        <TextInput
          value={joinShareCode}
          onChangeText={(value) => {
            setJoinShareCode(value.toUpperCase());
            if (joinError) {
              setJoinError('');
            }
          }}
          editable={!isJoining}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={() => {
            void handleJoinByShareCode();
          }}
          className="flex-1 px-3 py-3 text-black"
          placeholder={t('group.shareCodePlaceholder')}
          placeholderTextColor={Palette.grey}
        />

        <Pressable
          className={`h-12 min-w-[112px] items-center justify-center rounded-xl px-4 ${
            isJoining ? 'bg-black/70' : 'bg-black'
          }`}
          disabled={isJoining}
          onPress={() => {
            void handleJoinByShareCode();
          }}
        >
          <Typography className="text-white font-semibold text-base">
            {isJoining ? t('button.joining') : t('button.join')}
          </Typography>
        </Pressable>
      </View>

      {!!joinError && (
        <Typography className="text-red-500 text-[11px] mt-1 ml-1 leading-4">
          {joinError}
        </Typography>
      )}
      {isJoining ? (
        <Typography className="text-black/60 text-[11px] mt-1 ml-1 leading-4">
          {t('group.joiningGroup')}
        </Typography>
      ) : null}
    </View>
  );

  const handleConfirmClose = useCallback(async () => {
    if (!sessionToClose || isClosing) {
      return;
    }

    setIsClosing(true);
    try {
      await groupSessionsService.closeGroupSession(sessionToClose.sessionId);
      if (pinnedSessionIds.includes(sessionToClose.sessionId)) {
        removePinnedSessionId(sessionToClose.sessionId);
      }
      setSessionToClose(null);
      await loadData();
    } finally {
      setIsClosing(false);
    }
  }, [removePinnedSessionId, isClosing, loadData, pinnedSessionIds, sessionToClose]);

  const emptyState = useMemo(() => {
    if (isLoading || !hasLoadedInitialData) {
      return (
        <Video
          source={require('@/assets/images/loading.mp4')}
          style={{ width: 800, height: 800 }}
          shouldPlay
          isLooping
          isMuted
          resizeMode={ResizeMode.CONTAIN}
        />
      );
    }

    return (
      <View className="justify-center px-4">
        <AlertScreen
          imageSrc={require('@/assets/images/nofriend.png')}
          heading="group.noGroups"
          description="group.noGroupsDesc"
          primaryButtonText={isCreating ? 'group.creatingGroup' : 'group.createFirstGroup'}
          primaryButtonAction={handleCreateSession}
        />
        {joinInput}
      </View>
    );
  }, [handleCreateSession, hasLoadedInitialData, isCreating, isLoading, joinInput, t]);

  const renderSession = useCallback(
    ({ item }: { item: GroupSessionItem }) => {
      return (
        <GroupSessionCard
          item={item}
          isPinned={pinnedSessionIds.includes(item.sessionId)}
          isClosing={isClosing && sessionToClose?.sessionId === item.sessionId}
          currentUserId={currentUserId}
          onShare={handleShare}
          onTogglePin={handleTogglePin}
          onClose={openCloseConfirm}
        />
      );
    },
    [
      currentUserId,
      handleShare,
      handleTogglePin,
      isClosing,
      openCloseConfirm,
      pinnedSessionIds,
      sessionToClose?.sessionId,
    ]
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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to home"
              className="h-10 w-10 items-center justify-center rounded-full"
              onPress={() => router.replace('/(tabs)')}
            >
              <ArrowLeft size={22} color={Palette.black} strokeWidth={2.2} />
            </Pressable>

            <Typography variant="h4">{t('group.title')}</Typography>
          </View>

          {displayedSessions.length > 0 ? (
            <Pressable
              className={`h-10 w-10 items-center justify-center rounded-full ${
                isCreating ? 'opacity-50' : 'opacity-100'
              }`}
              onPress={handleCreateSession}
              disabled={isCreating}
            >
              <Plus size={18} color={Palette.black} strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>

        {displayedSessions.length > 0 ? joinInput : null}
      </View>

      {displayedSessions.length > 0 ? (
        <FlatList
          data={displayedSessions}
          keyExtractor={(item) => item.sessionId}
          renderItem={renderSession}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{
            paddingHorizontal: horizontalPadding,
            paddingTop: 8,
            paddingBottom: insets.bottom + 110,
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        emptyState
      )}

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
        visible={blockedAction !== null}
        transparent
        animationType="slide"
        onRequestClose={closeCreateBlockedModal}
      >
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback onPress={closeCreateBlockedModal}>
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
                {blockedAction === 'join'
                  ? t('group.joinBlockedTitle')
                  : t('group.createBlockedTitle')}
              </Typography>
              <Typography className="mt-2 text-center text-gray-500">
                {blockedAction === 'join'
                  ? t('group.joinBlockedMessage')
                  : t('group.createBlockedMessage')}
              </Typography>
            </View>

            <Button rounded="full" className="w-full" onPress={closeCreateBlockedModal}>
              {t('group.ok')}
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
