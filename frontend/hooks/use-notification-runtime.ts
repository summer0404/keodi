import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { io } from 'socket.io-client';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '@/api/client';
import { notificationService } from '@/api/notification';
import { groupSessionsService } from '@/api/groupSessions';
import { useAuthStore } from '@/store/useAuthStore';
import { useGroupSessionStore } from '@/store/useGroupSessionStore';
import type { GroupSessionMember } from '@/types/api';

type RuntimeArgs = {
  accessToken: string | null;
};

type NotificationActionKind = 'none' | 'navigate' | 'join-group-by-sharecode';

type RealtimeNotificationEvent = {
  eventId?: string;
  title?: string;
  body?: string;
  deepLink?: string;
  sessionId?: string;
  type?: string;
  data?: Record<string, unknown>;
};

type ParsedNotification = {
  eventId: string | null;
  title: string | null;
  body: string | null;
  type: string | null;
  sessionId: string | null;
  voteUserId: string | null;
  voteMemberId: string | null;
  memberId: string | null;
  senderName: string | null;
  senderAvatarUrl: string | null;
  targetPath: string | null;
  shareCode: string | null;
  actionKind: NotificationActionKind;
  primaryLabel: string | null;
  titleKey: string | null;
  bodyKey: string | null;
  primaryLabelKey: string | null;
  i18nParams: Record<string, string | number | boolean>;
  isInitiatedByCurrentUser: boolean;
};

export type NotificationBanner = {
  title: string;
  message: string;
  timeLabel: string;
  senderAvatarUrl?: string | null;
  dismissLabel: string;
  primaryLabel?: string;
  hasPrimaryAction: boolean;
  targetPath: string | null;
  shareCode: string | null;
  actionKind: NotificationActionKind;
};

const resolveSocketUrl = () => {
  const override = process.env.EXPO_PUBLIC_WS_BASE_URL?.trim();
  const raw = override || API_BASE_URL;
  return raw.replace(/\/+$/, '');
};

const toStringOrNull = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const extractShareCodeFromText = (text: string | null) => {
  if (!text) {
    return null;
  }

  const matched = text.match(/code\s*[:\-]?\s*([A-Za-z0-9]{4,16})/i);
  if (!matched?.[1]) {
    return null;
  }

  return matched[1].toUpperCase();
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }

  return {};
};

const toI18nParams = (value: unknown): Record<string, string | number | boolean> => {
  const record = toRecord(value);
  const params: Record<string, string | number | boolean> = {};

  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      params[key] = item;
    }
  }

  return params;
};

const normalizeForComparison = (value: string | null) => {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const resolveGroupVoteFinalizedBodyKey = (body: string | null) => {
  const normalized = normalizeForComparison(body);

  if (normalized.includes('all members have voted')) {
    return 'notification.groupVoteFinalizedByAllMembersBody';
  }

  if (normalized.includes('session host has finalized')) {
    return 'notification.groupVoteFinalizedByHostBody';
  }

  return 'notification.groupVoteFinalizedBody';
};

const resolveTemplateKeysByType = (type: string | null) => {
  switch (type) {
    case 'GROUP_INVITE':
      return {
        titleKey: 'notification.groupInviteTitle',
        bodyKey: 'notification.groupInviteBody',
        primaryLabelKey: 'notification.joinNow',
      };
    case 'vote.cast':
      return {
        titleKey: 'notification.groupVoteReminderTitle',
        bodyKey: 'notification.groupVoteReminderBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'vote.member_finalized':
      return {
        titleKey: 'notification.memberVoteFinalizedTitle',
        bodyKey: 'notification.memberVoteFinalizedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'vote.session_finalized':
      return {
        titleKey: 'notification.sessionVoteFinalizedTitle',
        bodyKey: 'notification.sessionVoteFinalizedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'GROUP_VOTE_FINALIZED':
      return {
        titleKey: 'notification.groupVoteFinalizedTitle',
        bodyKey: 'notification.groupVoteFinalizedBody',
        primaryLabelKey: 'notification.openNow',
      };
    case 'session.member_joined':
      return {
        titleKey: 'notification.sessionMemberJoinedTitle',
        bodyKey: 'notification.sessionMemberJoinedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'session.closed':
      return {
        titleKey: 'notification.sessionClosedTitle',
        bodyKey: 'notification.sessionClosedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'session.member_left':
      return {
        titleKey: 'notification.sessionMemberLeftTitle',
        bodyKey: 'notification.sessionMemberLeftBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'candidate.added':
      return {
        titleKey: 'notification.candidateAddedTitle',
        bodyKey: 'notification.candidateAddedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'candidate.removed':
      return {
        titleKey: 'notification.candidateRemovedTitle',
        bodyKey: 'notification.candidateRemovedBody',
        primaryLabelKey: 'notification.viewNow',
      };
    case 'NEARBY_PLACE':
      return {
        titleKey: 'notification.nearbyPlaceTitle',
        bodyKey: 'notification.nearbyPlaceBody',
        primaryLabelKey: 'notification.explorNow',
      };
    case 'RECOMMENDATION':
      return {
        titleKey: 'notification.recommendationTitle',
        bodyKey: 'notification.recommendationBody',
        primaryLabelKey: 'notification.explorNow',
      };
    default:
      return {
        titleKey: 'notification.defaultTitle',
        bodyKey: 'notification.defaultBody',
        primaryLabelKey: 'notification.openNow',
      };
  }
};

const normalizePath = (path: string | null) => {
  if (!path) {
    return null;
  }

  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
};

const hasVersionParam = (url: string | null): boolean => {
  if (!url) return false;
  return url.includes('?v=') || url.includes('&v=');
};

const resolveTargetPathFromEvent = (event: RealtimeNotificationEvent) => {
  const eventData = event.data ?? {};

  const deepLink =
    toStringOrNull(event.deepLink) ??
    toStringOrNull(eventData.deepLink) ??
    toStringOrNull(eventData.path);

  if (deepLink) {
    return normalizePath(deepLink);
  }

  const sessionId =
    toStringOrNull(event.sessionId) ??
    toStringOrNull(eventData.sessionId) ??
    toStringOrNull(eventData.groupSessionId);

  if (sessionId) {
    return `/(tabs)/group/${sessionId}`;
  }

  return null;
};

const resolveTargetPathFromRemoteMessage = (message: FirebaseMessagingTypes.RemoteMessage) => {
  const data = message.data ?? {};

  const deepLink = toStringOrNull(data.deepLink) ?? toStringOrNull(data.path);
  if (deepLink) {
    return normalizePath(deepLink);
  }

  const sessionId = toStringOrNull(data.sessionId) ?? toStringOrNull(data.groupSessionId);
  if (sessionId) {
    return `/(tabs)/group/${sessionId}`;
  }

  return null;
};

const resolveActionKind = ({
  type,
  shareCode,
  targetPath,
  actionKind,
}: {
  type: string | null;
  shareCode: string | null;
  targetPath: string | null;
  actionKind: string | null;
}): NotificationActionKind => {
  const normalizedActionKind = actionKind?.toLowerCase();

  if (
    normalizedActionKind === 'join-group-by-sharecode' ||
    normalizedActionKind === 'join_group_by_sharecode'
  ) {
    return shareCode ? 'join-group-by-sharecode' : 'none';
  }

  if (normalizedActionKind === 'navigate') {
    return targetPath ? 'navigate' : 'none';
  }

  if (type === 'GROUP_INVITE') {
    return shareCode ? 'join-group-by-sharecode' : targetPath ? 'navigate' : 'none';
  }

  return targetPath ? 'navigate' : 'none';
};

const resolveMemberDisplayName = (member: GroupSessionMember | undefined | null) => {
  if (!member) {
    return null;
  }

  const firstName = member.user?.firstName?.trim() ?? '';
  const lastName = member.user?.lastName?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (fullName) {
    return fullName;
  }

  const nickname = member.nickname?.trim();
  return nickname || null;
};

const withVersionQuery = (url: string, versions: Array<number | undefined | null>) => {
  const validVersions = versions.filter((version): version is number => Boolean(version));

  if (validVersions.length === 0) {
    return url;
  }

  const versionParam = validVersions.join('-');
  return url.includes('?') ? `${url}&v=${versionParam}` : `${url}?v=${versionParam}`;
};

const resolveVersionedAvatarUrl = ({
  rawUrl,
  avatarCacheEpoch,
  currentUserAvatarVersion,
  isCurrentUser,
}: {
  rawUrl: string | null;
  avatarCacheEpoch: number;
  currentUserAvatarVersion: number;
  isCurrentUser: boolean;
}) => {
  const normalizedUrl = rawUrl?.trim();
  if (!normalizedUrl) {
    return null;
  }

  return withVersionQuery(normalizedUrl, [
    avatarCacheEpoch,
    isCurrentUser ? currentUserAvatarVersion : undefined,
  ]);
};

const syncTokenSafely = async (token: string) => {
  try {
    await notificationService.syncDeviceToken(token);
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification] Failed to sync device token', error);
    }
  }
};

const trySetupFcm = async () => {
  try {
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }

    const authStatus = await messaging().requestPermission();
    const granted =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!granted) {
      if (__DEV__) {
        console.log('[notification] FCM permission denied by user');
      }
      return;
    }

    const token = await messaging().getToken();
    if (__DEV__) {
      console.log('[notification] FCM token obtained:', token);
    }
    await syncTokenSafely(token);

    // Auto-subscribe device to a global FCM topic so you can target all users
    // from Firebase Console or backend without copying individual tokens.
    const topicEnv = process.env.EXPO_PUBLIC_FCM_GLOBAL_TOPIC?.trim();
    const topic = topicEnv || (__DEV__ ? 'dev-all' : 'all');
    try {
      await messaging().subscribeToTopic(topic);
      if (__DEV__) {
        console.log(`[notification] Subscribed to topic: ${topic}`);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[notification] Topic subscribe failed', err);
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification] FCM setup failed', error);
    }
  }
};

const bindTokenRefresh = () => {
  return messaging().onTokenRefresh(async (token) => {
    await syncTokenSafely(token);

    // Re-subscribe to topic when token is refreshed to keep device in topic groups
    const topicEnv = process.env.EXPO_PUBLIC_FCM_GLOBAL_TOPIC?.trim();
    const topic = topicEnv || (__DEV__ ? 'dev-all' : 'all');
    try {
      await messaging().subscribeToTopic(topic);
      if (__DEV__) {
        console.log(`[notification] Re-subscribed to topic: ${topic}`);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[notification] Topic re-subscribe failed', err);
      }
    }
  });
};

export function useNotificationRuntime({ accessToken }: RuntimeArgs) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((state) => state.me?.id ?? null);
  const currentUserAvatarVersion = useAuthStore((state) => state.meFetchedAt);
  const avatarCacheEpoch = useAuthStore((state) => state.avatarCacheEpoch);
  const [banner, setBanner] = useState<NotificationBanner | null>(null);
  const [isPrimaryLoading, setIsPrimaryLoading] = useState(false);
  const lastHandledEventIdRef = useRef<string | null>(null);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissBanner = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setIsPrimaryLoading(false);
    setBanner(null);
  }, []);

  const executeAction = useCallback(async (targetBanner: NotificationBanner) => {
    if (targetBanner.actionKind === 'join-group-by-sharecode') {
      const shareCode = targetBanner.shareCode?.trim().toUpperCase();
      if (!shareCode) {
        return;
      }

      const joinedSession = await groupSessionsService.joinGroupSession({ shareCode });
      if (joinedSession?.sessionId) {
        router.push(`/(tabs)/group/${joinedSession.sessionId}` as any);
      }
      return;
    }

    if (targetBanner.actionKind === 'navigate' && targetBanner.targetPath) {
      router.push(targetBanner.targetPath as any);
    }
  }, []);

  const openBanner = useCallback(() => {
    if (!banner?.hasPrimaryAction) {
      dismissBanner();
      return;
    }

    setIsPrimaryLoading(true);
    void executeAction(banner)
      .catch(() => {
        // Silent fail to keep notification UX lightweight.
      })
      .finally(() => {
        dismissBanner();
      });
  }, [banner, dismissBanner, executeAction]);

  const enrichVoteCastSenderName = useCallback(
    async (parsed: ParsedNotification) => {
      if (parsed.type !== 'vote.cast' || !parsed.sessionId) {
        return parsed;
      }

      // If senderName was already resolved from the enriched BE payload, skip store lookup
      if (parsed.senderName && parsed.senderAvatarUrl) {
        return parsed;
      }

      const store = useGroupSessionStore.getState();
      const session = await store.fetchSessionById(parsed.sessionId, { force: false });
      if (!session?.members?.length) {
        return parsed;
      }

      const matchedMember =
        session.members.find((member) => member.userId && member.userId === parsed.voteUserId) ??
        session.members.find((member) => member.id === parsed.voteMemberId);
      if (!matchedMember) {
        return parsed;
      }

      const resolvedSenderName = resolveMemberDisplayName(matchedMember);
      const resolvedAvatarUrl = resolveVersionedAvatarUrl({
        rawUrl: matchedMember.user?.pictureUrl ?? parsed.senderAvatarUrl,
        avatarCacheEpoch,
        currentUserAvatarVersion,
        isCurrentUser: Boolean(currentUserId && matchedMember.userId === currentUserId),
      });

      return {
        ...parsed,
        senderName: parsed.senderName ?? resolvedSenderName,
        senderAvatarUrl: resolvedAvatarUrl ?? parsed.senderAvatarUrl,
        i18nParams: {
          ...parsed.i18nParams,
          ...(resolvedSenderName ? { voterName: resolvedSenderName } : {}),
        },
      };
    },
    [avatarCacheEpoch, currentUserAvatarVersion, currentUserId]
  );

  const enrichVoteMemberFinalizedSenderName = useCallback(
    async (parsed: ParsedNotification) => {
      if (parsed.type !== 'vote.member_finalized' || !parsed.sessionId || !parsed.memberId) {
        return parsed;
      }

      // If senderName was already resolved from the enriched BE payload, skip store lookup
      if (parsed.senderName && parsed.senderAvatarUrl) {
        return parsed;
      }

      const store = useGroupSessionStore.getState();
      const session = await store.fetchSessionById(parsed.sessionId, { force: false });
      if (!session?.members?.length) {
        return parsed;
      }

      const matchedMember = session.members.find((member) => member.id === parsed.memberId);
      if (!matchedMember) {
        return parsed;
      }

      const resolvedSenderName = resolveMemberDisplayName(matchedMember);
      const resolvedAvatarUrl = resolveVersionedAvatarUrl({
        rawUrl: matchedMember.user?.pictureUrl ?? parsed.senderAvatarUrl,
        avatarCacheEpoch,
        currentUserAvatarVersion,
        isCurrentUser: Boolean(currentUserId && matchedMember.userId === currentUserId),
      });

      return {
        ...parsed,
        senderName: parsed.senderName ?? resolvedSenderName,
        senderAvatarUrl: resolvedAvatarUrl ?? parsed.senderAvatarUrl,
        i18nParams: {
          ...parsed.i18nParams,
          ...(resolvedSenderName ? { memberName: resolvedSenderName } : {}),
        },
      };
    },
    [avatarCacheEpoch, currentUserAvatarVersion, currentUserId]
  );

  const enrichSessionMemberJoinedName = useCallback(
    async (parsed: ParsedNotification) => {
      if (parsed.type !== 'session.member_joined' || !parsed.sessionId || !parsed.memberId) {
        return parsed;
      }

      // If senderName was already resolved from the enriched BE payload, skip store lookup
      if (parsed.senderName && parsed.senderAvatarUrl) {
        return parsed;
      }

      const store = useGroupSessionStore.getState();
      const session = await store.fetchSessionById(parsed.sessionId, { force: false });
      if (!session?.members?.length) {
        return parsed;
      }

      const matchedMember = session.members.find((member) => member.id === parsed.memberId);
      if (!matchedMember) {
        return parsed;
      }

      const resolvedSenderName = resolveMemberDisplayName(matchedMember);
      const resolvedAvatarUrl = resolveVersionedAvatarUrl({
        rawUrl: matchedMember.user?.pictureUrl ?? parsed.senderAvatarUrl,
        avatarCacheEpoch,
        currentUserAvatarVersion,
        isCurrentUser: Boolean(currentUserId && matchedMember.userId === currentUserId),
      });

      return {
        ...parsed,
        senderName: parsed.senderName ?? resolvedSenderName,
        senderAvatarUrl: resolvedAvatarUrl ?? parsed.senderAvatarUrl,
        i18nParams: {
          ...parsed.i18nParams,
          ...(resolvedSenderName ? { memberName: resolvedSenderName } : {}),
        },
      };
    },
    [avatarCacheEpoch, currentUserAvatarVersion, currentUserId]
  );

  const enrichSessionMemberLeftName = useCallback(
    async (parsed: ParsedNotification) => {
      if (parsed.type !== 'session.member_left' || !parsed.sessionId || !parsed.memberId) {
        return parsed;
      }

      // If senderName was already resolved from the enriched BE payload, skip store lookup
      if (parsed.senderName && parsed.senderAvatarUrl) {
        return parsed;
      }

      const store = useGroupSessionStore.getState();
      const session = await store.fetchSessionById(parsed.sessionId, { force: false });
      if (!session?.members?.length) {
        return parsed;
      }

      const matchedMember = session.members.find((member) => member.id === parsed.memberId);
      if (!matchedMember) {
        return parsed;
      }

      const resolvedSenderName = resolveMemberDisplayName(matchedMember);
      const resolvedAvatarUrl = resolveVersionedAvatarUrl({
        rawUrl: matchedMember.user?.pictureUrl ?? parsed.senderAvatarUrl,
        avatarCacheEpoch,
        currentUserAvatarVersion,
        isCurrentUser: Boolean(currentUserId && matchedMember.userId === currentUserId),
      });

      return {
        ...parsed,
        senderName: parsed.senderName ?? resolvedSenderName,
        senderAvatarUrl: resolvedAvatarUrl ?? parsed.senderAvatarUrl,
        i18nParams: {
          ...parsed.i18nParams,
          ...(resolvedSenderName ? { memberName: resolvedSenderName } : {}),
        },
      };
    },
    [avatarCacheEpoch, currentUserAvatarVersion, currentUserId]
  );

  const parseEvent = useCallback(
    (event: RealtimeNotificationEvent): ParsedNotification => {
      const eventData = toRecord(event.data);
      const payload = {
        ...toRecord(event),
        ...eventData,
      };
      const voteData = toRecord(payload.vote);
      const votePlace = toRecord(voteData.place);
      const voteUser = toRecord(voteData.user);

      // Enriched user objects sent by BE for different event types
      const closedByUser = toRecord(payload.closedBy);
      const topLevelUser = toRecord(payload.user);
      const memberData = toRecord(payload.member);
      const memberUser = toRecord(memberData.user);
      const candidateData = toRecord(payload.candidate);
      const addedByData = toRecord(candidateData.addedBy);
      const addedByUser = toRecord(addedByData.user);
      const removedByData = toRecord(candidateData.removedBy);
      const removedByUser = toRecord(removedByData.user);

      const title = toStringOrNull(event.title) ?? toStringOrNull(payload.title);
      const body = toStringOrNull(event.body) ?? toStringOrNull(payload.body);
      const type = toStringOrNull(event.type) ?? toStringOrNull(payload.type);

      // Resolve display name from enriched user objects, then fall back to legacy fields
      const resolveUserDisplayName = (user: Record<string, unknown>) => {
        const firstName = toStringOrNull(user.firstName);
        const lastName = toStringOrNull(user.lastName);
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        return fullName || null;
      };

      const enrichedSenderName =
        resolveUserDisplayName(voteUser) ??
        resolveUserDisplayName(closedByUser) ??
        resolveUserDisplayName(topLevelUser) ??
        resolveUserDisplayName(memberUser) ??
        resolveUserDisplayName(addedByUser) ??
        resolveUserDisplayName(removedByUser);

      const senderName =
        enrichedSenderName ??
        toStringOrNull(payload.nickname) ??
        toStringOrNull(payload.senderName) ??
        toStringOrNull(payload.inviterName) ??
        toStringOrNull(payload.fromName) ??
        toStringOrNull(voteData.nickname) ??
        toStringOrNull(voteData.memberName);

      // Resolve avatar from enriched user objects, then fall back to legacy fields
      const enrichedAvatarUrl =
        toStringOrNull(voteUser.pictureUrl) ??
        toStringOrNull(closedByUser.pictureUrl) ??
        toStringOrNull(topLevelUser.pictureUrl) ??
        toStringOrNull(memberUser.pictureUrl) ??
        toStringOrNull(addedByUser.pictureUrl) ??
        toStringOrNull(removedByUser.pictureUrl);

      const senderAvatarUrl =
        enrichedAvatarUrl ??
        toStringOrNull(payload.senderAvatarUrl) ??
        toStringOrNull(payload.inviterAvatarUrl) ??
        toStringOrNull(payload.inviterPictureUrl) ??
        toStringOrNull(payload.senderPictureUrl);

      const shareCode =
        toStringOrNull(payload.shareCode)?.toUpperCase() ?? extractShareCodeFromText(body);
      const sessionId =
        toStringOrNull(payload.sessionId) ??
        toStringOrNull(payload.groupSessionId) ??
        toStringOrNull(event.sessionId);
      const voteUserId = toStringOrNull(voteData.userId) ?? toStringOrNull(payload.userId);
      const voteMemberId = toStringOrNull(voteData.memberId);

      const targetPath = resolveTargetPathFromEvent(event);
      const actionKind = resolveActionKind({
        type,
        shareCode,
        targetPath,
        actionKind: toStringOrNull(payload.actionKind),
      });

      const primaryLabel = toStringOrNull(payload.primaryActionLabel);
      const resolvedVoterName =
        resolveUserDisplayName(voteUser) ?? toStringOrNull(voteData.nickname);
      const i18nParams = {
        ...toI18nParams(payload.i18nParams ?? payload.params ?? payload.variables),
        ...(resolvedVoterName ? { voterName: resolvedVoterName } : {}),
        ...(senderName ? { memberName: senderName } : {}),
        ...(toStringOrNull(votePlace.name)
          ? { placeName: toStringOrNull(votePlace.name) as string }
          : {}),
      };

      const addedByUserId =
        toStringOrNull(payload.addedByUserId) ??
        toStringOrNull(addedByData.userId) ??
        toStringOrNull(addedByUser.id);

      const removedByUserId =
        toStringOrNull(payload.removedByUserId) ??
        toStringOrNull(removedByData.userId) ??
        toStringOrNull(removedByUser.id);

      const closedByUserId = toStringOrNull(closedByUser.id);

      const memberJoinedUserId =
        toStringOrNull(payload.userId) ??
        toStringOrNull(memberData.userId) ??
        toStringOrNull(memberUser.id);

      const memberLeftUserId =
        toStringOrNull(payload.userId) ??
        toStringOrNull(memberData.userId) ??
        toStringOrNull(memberUser.id);

      const voteMemberFinalizedUserId =
        toStringOrNull(payload.userId) ??
        toStringOrNull(memberData.userId) ??
        toStringOrNull(memberUser.id);

      const voteSessionFinalizedUserId = toStringOrNull(payload.finalizedBy);

      const isInitiatedByCurrentUser =
        (type === 'vote.cast' && voteUserId === currentUserId) ||
        (type === 'vote.member_finalized' && voteMemberFinalizedUserId === currentUserId) ||
        (type === 'vote.session_finalized' && voteSessionFinalizedUserId === currentUserId) ||
        (type === 'session.member_joined' && memberJoinedUserId === currentUserId) ||
        (type === 'session.member_left' && memberLeftUserId === currentUserId) ||
        (type === 'session.closed' && closedByUserId === currentUserId) ||
        (type === 'candidate.added' && addedByUserId === currentUserId) ||
        (type === 'candidate.removed' && removedByUserId === currentUserId);

      return {
        eventId: toStringOrNull(event.eventId),
        title,
        body,
        type,
        sessionId,
        voteUserId,
        voteMemberId,
        memberId: toStringOrNull(payload.memberId),
        senderName,
        senderAvatarUrl,
        targetPath,
        shareCode,
        actionKind,
        primaryLabel,
        titleKey: toStringOrNull(payload.titleKey),
        bodyKey: toStringOrNull(payload.bodyKey),
        primaryLabelKey: toStringOrNull(payload.primaryActionLabelKey),
        i18nParams,
        isInitiatedByCurrentUser,
      };
    },
    [currentUserId]
  );

  const parseRemoteMessage = useCallback(
    (message: FirebaseMessagingTypes.RemoteMessage): ParsedNotification => {
      const data = toRecord(message.data);
      const voteData = toRecord(data.vote);
      const votePlace = toRecord(voteData.place);
      const title = toStringOrNull(message.notification?.title) ?? toStringOrNull(data.title);
      const body = toStringOrNull(message.notification?.body) ?? toStringOrNull(data.body);
      const type = toStringOrNull(data.type);

      const senderName =
        toStringOrNull(data.senderName) ??
        toStringOrNull(data.accepterName) ??
        toStringOrNull(data.inviterName) ??
        toStringOrNull(data.fromName) ??
        toStringOrNull(data.nickname) ??
        toStringOrNull(voteData.nickname) ??
        toStringOrNull(data.memberName);

      const senderAvatarUrl =
        toStringOrNull(data.senderAvatarUrl) ??
        toStringOrNull(data.senderPictureUrl) ??
        toStringOrNull(data.accepterPictureUrl) ??
        toStringOrNull(data.inviterAvatarUrl) ??
        toStringOrNull(data.inviterPictureUrl);

      const shareCode =
        toStringOrNull(data.shareCode)?.toUpperCase() ?? extractShareCodeFromText(body);
      const sessionId = toStringOrNull(data.sessionId) ?? toStringOrNull(data.groupSessionId);
      const voteUserId = toStringOrNull(voteData.userId) ?? toStringOrNull(data.userId);
      const voteMemberId = toStringOrNull(voteData.memberId);

      const targetPath = resolveTargetPathFromRemoteMessage(message);
      const actionKind = resolveActionKind({
        type,
        shareCode,
        targetPath,
        actionKind: toStringOrNull(data.actionKind),
      });

      const primaryLabel = toStringOrNull(data.primaryActionLabel);
      const i18nParams = {
        ...toI18nParams(data.i18nParams ?? data.params ?? data.variables),
        ...(toStringOrNull(data.nickname)
          ? { voterName: toStringOrNull(data.nickname) as string }
          : {}),
        ...(toStringOrNull(data.placeName)
          ? { placeName: toStringOrNull(data.placeName) as string }
          : {}),
        ...(toStringOrNull(votePlace.name)
          ? { placeName: toStringOrNull(votePlace.name) as string }
          : {}),
        ...(toStringOrNull(data.winningPlaceName)
          ? { winningPlaceName: toStringOrNull(data.winningPlaceName) as string }
          : {}),
        ...(senderName ? { memberName: senderName } : {}),
      };

      const addedByUserId =
        toStringOrNull(data.addedByUserId) ??
        toStringOrNull((data.addedBy as any)?.userId) ??
        toStringOrNull((data.addedBy as any)?.user?.id);

      const removedByUserId =
        toStringOrNull(data.removedByUserId) ??
        toStringOrNull((data.removedBy as any)?.userId) ??
        toStringOrNull((data.removedBy as any)?.user?.id);

      const closedByUserId =
        toStringOrNull((data.closedBy as any)?.id) ??
        toStringOrNull((data.closedBy as any)?.userId);

      const memberJoinedUserId =
        toStringOrNull(data.userId) ??
        toStringOrNull((data.member as any)?.userId) ??
        toStringOrNull((data.member as any)?.user?.id);

      const memberLeftUserId =
        toStringOrNull(data.userId) ??
        toStringOrNull((data.member as any)?.userId) ??
        toStringOrNull((data.member as any)?.user?.id);

      const voteMemberFinalizedUserId =
        toStringOrNull(data.userId) ??
        toStringOrNull((data.member as any)?.userId) ??
        toStringOrNull((data.member as any)?.user?.id);

      const voteSessionFinalizedUserId = toStringOrNull(data.finalizedBy);

      const isInitiatedByCurrentUser =
        (type === 'vote.cast' && voteUserId === currentUserId) ||
        (type === 'vote.member_finalized' && voteMemberFinalizedUserId === currentUserId) ||
        (type === 'vote.session_finalized' && voteSessionFinalizedUserId === currentUserId) ||
        (type === 'session.member_joined' && memberJoinedUserId === currentUserId) ||
        (type === 'session.member_left' && memberLeftUserId === currentUserId) ||
        (type === 'session.closed' && closedByUserId === currentUserId) ||
        (type === 'candidate.added' && addedByUserId === currentUserId) ||
        (type === 'candidate.removed' && removedByUserId === currentUserId);

      return {
        eventId: toStringOrNull(data.eventId),
        title,
        body,
        type,
        sessionId,
        voteUserId,
        voteMemberId,
        memberId: toStringOrNull(data.memberId),
        senderName,
        senderAvatarUrl,
        targetPath,
        shareCode,
        actionKind,
        primaryLabel,
        titleKey: toStringOrNull(data.titleKey),
        bodyKey: toStringOrNull(data.bodyKey),
        primaryLabelKey: toStringOrNull(data.primaryActionLabelKey),
        i18nParams,
        isInitiatedByCurrentUser,
      };
    },
    [currentUserId]
  );

  const toBannerModel = useCallback(
    (parsed: ParsedNotification): NotificationBanner => {
      const isGroupInvite = parsed.type === 'GROUP_INVITE';
      const isGroupVoteFinalized = parsed.type === 'GROUP_VOTE_FINALIZED';
      const isVoteCast = parsed.type === 'vote.cast';
      const isSessionEvent =
        parsed.type === 'session.member_joined' ||
        parsed.type === 'session.member_left' ||
        parsed.type === 'session.closed';
      const isCandidateEvent =
        parsed.type === 'candidate.added' || parsed.type === 'candidate.removed';
      const senderName = parsed.senderName || t('notification.someone');
      const template = resolveTemplateKeysByType(parsed.type);
      const forcedBodyKey = isGroupVoteFinalized
        ? resolveGroupVoteFinalizedBodyKey(parsed.body)
        : template.bodyKey;
      const forceLocalizedTemplate =
        isGroupInvite || isGroupVoteFinalized || isVoteCast || isSessionEvent || isCandidateEvent;
      const i18nValues = {
        name: senderName,
        voterName: parsed.i18nParams.voterName ?? senderName,
        memberName: parsed.i18nParams.memberName ?? senderName,
        placeName: parsed.i18nParams.placeName ?? t('notification.somePlace'),
        shareCode: parsed.shareCode ?? '',
        ...parsed.i18nParams,
      };

      const title =
        (parsed.titleKey ? t(parsed.titleKey, i18nValues) : null) ??
        (forceLocalizedTemplate
          ? t(template.titleKey, i18nValues)
          : (parsed.title ?? t(template.titleKey, i18nValues)));

      const message =
        (parsed.bodyKey ? t(parsed.bodyKey, i18nValues) : null) ??
        (forceLocalizedTemplate
          ? t(forcedBodyKey, i18nValues)
          : (parsed.body ?? t(template.bodyKey, i18nValues)));

      const primaryLabel =
        parsed.primaryLabel ??
        (parsed.primaryLabelKey ? t(parsed.primaryLabelKey, i18nValues) : undefined) ??
        (parsed.actionKind === 'none' ? undefined : t(template.primaryLabelKey));

      const dismissLabel = t('notification.dismiss');

      const now = new Date();
      const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Apply cache buster to avatar URL if not already versioned
      const versionedAvatarUrl =
        parsed.senderAvatarUrl && !hasVersionParam(parsed.senderAvatarUrl)
          ? resolveVersionedAvatarUrl({
              rawUrl: parsed.senderAvatarUrl,
              avatarCacheEpoch,
              currentUserAvatarVersion,
              isCurrentUser: false,
            })
          : parsed.senderAvatarUrl;

      return {
        title,
        message,
        timeLabel,
        senderAvatarUrl: versionedAvatarUrl,
        dismissLabel,
        primaryLabel,
        hasPrimaryAction: parsed.actionKind !== 'none',
        targetPath: parsed.targetPath,
        shareCode: parsed.shareCode,
        actionKind: parsed.actionKind,
      };
    },
    [t, avatarCacheEpoch, currentUserAvatarVersion]
  );

  const pushForegroundBanner = useCallback(
    async (parsed: ParsedNotification) => {
      // Skip notification if initiated by current user
      if (parsed.isInitiatedByCurrentUser) {
        return;
      }

      let enrichedParsed = parsed;
      if (parsed.type === 'vote.cast') {
        enrichedParsed = await enrichVoteCastSenderName(parsed);
      } else if (parsed.type === 'vote.member_finalized') {
        enrichedParsed = await enrichVoteMemberFinalizedSenderName(parsed);
      } else if (parsed.type === 'session.member_joined') {
        enrichedParsed = await enrichSessionMemberJoinedName(parsed);
      } else if (parsed.type === 'session.member_left') {
        enrichedParsed = await enrichSessionMemberLeftName(parsed);
      }
      setBanner(toBannerModel(enrichedParsed));
    },
    [
      enrichVoteCastSenderName,
      enrichVoteMemberFinalizedSenderName,
      enrichSessionMemberJoinedName,
      enrichSessionMemberLeftName,
      toBannerModel,
    ]
  );

  const bindForegroundMessage = useCallback(() => {
    return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      const parsed = parseRemoteMessage(remoteMessage);
      // Show in-app banner when app is active
      void pushForegroundBanner(parsed);
    });
  }, [parseRemoteMessage, pushForegroundBanner]);

  const handleOpenedRemoteMessage = useCallback(
    async (message: FirebaseMessagingTypes.RemoteMessage) => {
      const parsed = parseRemoteMessage(message);
      const model = toBannerModel(parsed);

      if (!model.hasPrimaryAction) {
        return;
      }

      await executeAction(model);
    },
    [executeAction, parseRemoteMessage, toBannerModel]
  );

  const runtime = useMemo(
    () => ({ banner, dismissBanner, openBanner, isPrimaryLoading }),
    [banner, dismissBanner, openBanner, isPrimaryLoading]
  );

  useEffect(() => {
    if (!banner) {
      return;
    }

    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
    }

    autoDismissTimerRef.current = setTimeout(() => {
      dismissBanner();
    }, 5000);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [banner, dismissBanner]);

  useEffect(() => {
    if (!accessToken) {
      setBanner(null);
      lastHandledEventIdRef.current = null;
      return;
    }

    void trySetupFcm();

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

    const onNotificationReceived = (event: RealtimeNotificationEvent) => {
      if (AppState.currentState !== 'active') {
        return;
      }

      const parsed = parseEvent(event);
      const eventId = parsed.eventId;

      if (eventId && lastHandledEventIdRef.current === eventId) {
        return;
      }

      if (eventId) {
        lastHandledEventIdRef.current = eventId;
      }

      void pushForegroundBanner(parsed);
    };

    socket.on('notification.received', onNotificationReceived);

    const unsubscribeForegroundMessage = bindForegroundMessage();
    const unsubscribeTokenRefresh = bindTokenRefresh();
    const unsubscribeOpened = messaging().onNotificationOpenedApp(handleOpenedRemoteMessage);

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          handleOpenedRemoteMessage(remoteMessage);
        }
      });

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
      socket.off('notification.received', onNotificationReceived);
      socket.disconnect();
      unsubscribeForegroundMessage();
      unsubscribeTokenRefresh();
      unsubscribeOpened();
    };
  }, [
    accessToken,
    bindForegroundMessage,
    executeAction,
    handleOpenedRemoteMessage,
    parseEvent,
    pushForegroundBanner,
  ]);

  return runtime;
}
