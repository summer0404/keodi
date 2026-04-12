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
  senderName: string | null;
  senderAvatarUrl: string | null;
  targetPath: string | null;
  shareCode: string | null;
  actionKind: NotificationActionKind;
  primaryLabel: string | null;
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

const normalizePath = (path: string | null) => {
  if (!path) {
    return null;
  }

  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
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
      return;
    }

    const token = await messaging().getToken();
    await syncTokenSafely(token);
  } catch (error) {
    if (__DEV__) {
      console.warn('[notification] FCM setup failed', error);
    }
  }
};

const bindTokenRefresh = () => {
  return messaging().onTokenRefresh(async (token) => {
    await syncTokenSafely(token);
  });
};

export function useNotificationRuntime({ accessToken }: RuntimeArgs) {
  const { t } = useTranslation();
  const [banner, setBanner] = useState<NotificationBanner | null>(null);
  const [isPrimaryLoading, setIsPrimaryLoading] = useState(false);
  const lastHandledEventIdRef = useRef<string | null>(null);

  const dismissBanner = useCallback(() => {
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

  const parseEvent = useCallback((event: RealtimeNotificationEvent): ParsedNotification => {
    const eventData = toRecord(event.data);

    const title = toStringOrNull(event.title) ?? toStringOrNull(eventData.title);
    const body = toStringOrNull(event.body) ?? toStringOrNull(eventData.body);
    const type = toStringOrNull(event.type) ?? toStringOrNull(eventData.type);

    const senderName =
      toStringOrNull(eventData.senderName) ??
      toStringOrNull(eventData.inviterName) ??
      toStringOrNull(eventData.fromName);

    const senderAvatarUrl =
      toStringOrNull(eventData.senderAvatarUrl) ??
      toStringOrNull(eventData.inviterAvatarUrl) ??
      toStringOrNull(eventData.senderPictureUrl);

    const shareCode =
      toStringOrNull(eventData.shareCode)?.toUpperCase() ?? extractShareCodeFromText(body);

    const targetPath = resolveTargetPathFromEvent(event);
    const actionKind = resolveActionKind({
      type,
      shareCode,
      targetPath,
      actionKind: toStringOrNull(eventData.actionKind),
    });

    const primaryLabel = toStringOrNull(eventData.primaryActionLabel);

    return {
      eventId: toStringOrNull(event.eventId),
      title,
      body,
      type,
      senderName,
      senderAvatarUrl,
      targetPath,
      shareCode,
      actionKind,
      primaryLabel,
    };
  }, []);

  const parseRemoteMessage = useCallback(
    (message: FirebaseMessagingTypes.RemoteMessage): ParsedNotification => {
      const data = toRecord(message.data);
      const title = toStringOrNull(message.notification?.title) ?? toStringOrNull(data.title);
      const body = toStringOrNull(message.notification?.body) ?? toStringOrNull(data.body);
      const type = toStringOrNull(data.type);

      const senderName =
        toStringOrNull(data.senderName) ??
        toStringOrNull(data.inviterName) ??
        toStringOrNull(data.fromName);

      const senderAvatarUrl =
        toStringOrNull(data.senderAvatarUrl) ??
        toStringOrNull(data.inviterAvatarUrl) ??
        toStringOrNull(data.senderPictureUrl);

      const shareCode =
        toStringOrNull(data.shareCode)?.toUpperCase() ?? extractShareCodeFromText(body);

      const targetPath = resolveTargetPathFromRemoteMessage(message);
      const actionKind = resolveActionKind({
        type,
        shareCode,
        targetPath,
        actionKind: toStringOrNull(data.actionKind),
      });

      const primaryLabel = toStringOrNull(data.primaryActionLabel);

      return {
        eventId: toStringOrNull(data.eventId),
        title,
        body,
        type,
        senderName,
        senderAvatarUrl,
        targetPath,
        shareCode,
        actionKind,
        primaryLabel,
      };
    },
    []
  );

  const toBannerModel = useCallback(
    (parsed: ParsedNotification): NotificationBanner => {
      const isGroupInvite = parsed.type === 'GROUP_INVITE';

      const title = isGroupInvite
        ? t('notification.groupInviteTitle')
        : parsed.title || t('notification.defaultTitle');

      const senderName = parsed.senderName || t('notification.someone');

      const message = isGroupInvite
        ? t('notification.groupInviteBody', { name: senderName })
        : parsed.body || t('notification.defaultBody');

      const dismissLabel = t('notification.dismiss');

      const primaryLabel =
        parsed.primaryLabel ||
        (parsed.actionKind === 'join-group-by-sharecode'
          ? t('notification.joinNow')
          : parsed.actionKind === 'navigate'
            ? t('notification.openNow')
            : undefined);

      const now = new Date();
      const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      return {
        title,
        message,
        timeLabel,
        senderAvatarUrl: parsed.senderAvatarUrl,
        dismissLabel,
        primaryLabel,
        hasPrimaryAction: parsed.actionKind !== 'none',
        targetPath: parsed.targetPath,
        shareCode: parsed.shareCode,
        actionKind: parsed.actionKind,
      };
    },
    [t]
  );

  const pushForegroundBanner = useCallback(
    (parsed: ParsedNotification) => {
      setBanner(toBannerModel(parsed));
    },
    [toBannerModel]
  );

  const bindForegroundMessage = useCallback(() => {
    return messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      const parsed = parseRemoteMessage(remoteMessage);
      pushForegroundBanner(parsed);
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

      pushForegroundBanner(parsed);
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
