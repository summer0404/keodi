import { notificationService } from '@/api/notification';
import Typography from '@/components/ui/Typography';
import { Palette } from '@/constants/theme';
import type { NotificationItem } from '@/types/api';
import { formatRelativeTime } from '@/utils/chat';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCheck, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

type Props = {
  enabled?: boolean;
};

type NotificationRowProps = {
  item: NotificationItem;
  onMarkRead: (notificationId: string) => void;
};

const SWIPE_THRESHOLD = 72;

function NotificationRow({ item, onMarkRead }: NotificationRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);

  const resetPosition = useCallback(
    (animated = true) => {
      setIsRevealed(false);
      if (!animated) {
        translateX.stopAnimation(() => {
          translateX.setValue(0);
        });
        return;
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 72,
      }).start();
    },
    [translateX]
  );

  const revealAction = useCallback(() => {
    setIsRevealed(true);
    Animated.spring(translateX, {
      toValue: -SWIPE_THRESHOLD,
      useNativeDriver: true,
      friction: 8,
      tension: 72,
    }).start();
  }, [translateX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx >= 0) {
            translateX.setValue(0);
            return;
          }

          const nextX = Math.max(gestureState.dx, -SWIPE_THRESHOLD);
          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -SWIPE_THRESHOLD / 2 || (isRevealed && gestureState.dx < -18)) {
            revealAction();
            return;
          }

          resetPosition();
        },
      }),
    [isRevealed, revealAction, resetPosition, translateX]
  );

  const handleMarkRead = useCallback(() => {
    onMarkRead(item.id);
    resetPosition(false);
  }, [item.id, onMarkRead, resetPosition]);

  return (
    <View className="relative mb-3 overflow-hidden rounded-2xl">
      <View className="absolute inset-0 flex-row items-center justify-end rounded-2xl pr-3">
        <Pressable
          onPress={handleMarkRead}
          disabled={item.isRead}
          className="h-11 flex-row items-center justify-center gap-2 rounded-full bg-[#0E0E0E] px-4"
          style={{ opacity: item.isRead ? 0.45 : 1 }}
        >
          <CheckCheck size={14} color={Palette.white} strokeWidth={2.3} />
        </Pressable>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          transform: [{ translateX }],
        }}
      >
        <Pressable
          onPress={handleMarkRead}
          className={`rounded-2xl border px-4 py-3 ${item.isRead ? 'border-gray-100 bg-white' : 'border-black/5 bg-[#FAFAFA]'}`}
        >
          <View className="flex-row items-start gap-3">
            <View
              className={`mt-1 h-2.5 w-2.5 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-[#22C55E]'}`}
            />
            <View className="flex-1">
              <View className="flex-row items-center justify-between gap-3">
                <Typography variant="h5" className="flex-1 text-black">
                  {item.title}
                </Typography>
                <Typography className="text-gray-400">
                  {formatRelativeTime(item.createdAt)}
                </Typography>
              </View>
              <Typography className="mt-1 text-gray-600">{item.body}</Typography>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function HomeNotificationCenter({ enabled = true }: Props) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  const { data: unreadData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const {
    data: inboxData,
    isLoading: isLoadingInbox,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: ['notifications', 'inbox'],
    queryFn: () => notificationService.getInbox({ page: 1, limit: 20 }),
    enabled: enabled && isVisible,
    staleTime: 0,
  });

  const unreadCount = unreadData?.count ?? 0;
  const notifications = inboxData?.notifications ?? [];

  const handleOpen = useCallback(() => setIsVisible(true), []);
  const handleClose = useCallback(() => setIsVisible(false), []);

  const handleMarkRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId);
        await Promise.all([refetchUnreadCount(), refetchInbox()]);
      } catch {
        // Keep the inbox responsive even if the backend call fails.
      }
    },
    [refetchInbox, refetchUnreadCount]
  );

  const handleReadAll = useCallback(async () => {
    if (unreadCount === 0) {
      return;
    }

    try {
      await notificationService.markAllAsRead();
      await Promise.all([refetchUnreadCount(), refetchInbox()]);
    } catch {
      // Keep the inbox responsive even if the backend call fails.
    }
  }, [refetchInbox, refetchUnreadCount, unreadCount]);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        className="relative h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm"
        accessibilityRole="button"
        accessibilityLabel={t('notificationInbox.title')}
      >
        <Bell size={18} color={Palette.black} strokeWidth={2} />
        {unreadCount > 0 ? (
          <View className="absolute -right-1 -top-1 min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
            <Typography variant="caption-sm" className="font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Typography>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={handleClose} />
          <View
            className="max-h-[75%] rounded-t-[28px] bg-white px-4 pt-3"
            style={{ paddingBottom: 16 }}
          >
            <View className="mb-3 flex-row items-start justify-between gap-3 px-3">
              <View className="flex-1">
                <Typography variant="h4">{t('notificationInbox.title')}</Typography>
              </View>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={handleReadAll}
                  disabled={unreadCount === 0}
                  className="rounded-full bg-[#0E0E0E] px-4 py-2"
                >
                  <Typography variant="caption-sm" className="font-bold text-white">
                    {t('notificationInbox.readAll')}
                  </Typography>
                </Pressable>

                <Pressable
                  onPress={handleClose}
                  className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={18} color={Palette.black} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {isLoadingInbox ? (
              <View className="min-h-40 items-center justify-center">
                <ActivityIndicator color={Palette.black} size="large" />
              </View>
            ) : notifications.length === 0 ? (
              <View className="min-h-40 items-center justify-center px-6">
                <Typography className="text-center text-gray-400">
                  {t('notificationInbox.empty')}
                </Typography>
              </View>
            ) : (
              <ScrollView
                className="max-h-full"
                contentContainerStyle={{ paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {notifications.map((item) => (
                  <NotificationRow key={item.id} item={item} onMarkRead={handleMarkRead} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
