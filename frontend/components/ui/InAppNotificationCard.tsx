import React, { useRef } from 'react';
import { Pressable, View, Animated, PanResponder } from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import Typography from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

const DEFAULT_LOGO = require('@/assets/images/logo.png');
const DEFAULT_AVATAR = require('@/assets/images/default-avatar.webp');

export type InAppNotificationCardModel = {
  title: string;
  message: string;
  timeLabel: string;
  senderAvatarUrl?: string | null;
  dismissLabel: string;
  primaryLabel?: string;
  hasPrimaryAction: boolean;
};

type InAppNotificationCardProps = {
  model: InAppNotificationCardModel;
  onDismiss: () => void;
  onPrimary: () => void;
  primaryLoading?: boolean;
};

export default function InAppNotificationCard({
  model,
  onDismiss,
  onPrimary,
  primaryLoading = false,
}: InAppNotificationCardProps) {
  const avatarSource = model.senderAvatarUrl?.trim()
    ? { uri: model.senderAvatarUrl.trim() }
    : DEFAULT_AVATAR;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const swipeThreshold = 80; // pixels to trigger dismiss

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (evt, gestureState) => {
        // Component follows finger horizontally
        translateX.setValue(gestureState.dx);

        // Fade opacity based on swipe distance
        const fadeThreshold = swipeThreshold;
        const fadeOpacity = 1 - Math.abs(gestureState.dx) / (fadeThreshold * 2);
        opacity.setValue(Math.max(0, fadeOpacity));
      },
      onPanResponderRelease: (evt, gestureState) => {
        // If swiped enough distance, dismiss with animation
        if (Math.abs(gestureState.dx) > swipeThreshold) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gestureState.dx > 0 ? 500 : -500,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onDismiss();
          });
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={{
        transform: [{ translateX }],
        opacity,
        elevation: 10,
      }}
      className="rounded-3xl border border-[#ECECEC] bg-white px-4 py-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Image source={DEFAULT_LOGO} style={{ width: 18, height: 18, borderRadius: 999 }} />
          <Typography className="text-[#52525B]">{model.timeLabel}</Typography>
        </View>

        <Pressable
          className="h-6 w-6 items-center justify-center rounded-full bg-[#EFEFEF]"
          onPress={onDismiss}
        >
          <X size={14} color="#8B8B8B" strokeWidth={2.2} />
        </Pressable>
      </View>

      <View className="mt-3 flex-row gap-3">
        <Image source={avatarSource} style={{ width: 44, height: 44, borderRadius: 9999 }} />

        <View className="flex-1">
          <Typography variant="h5" className="text-black">
            {model.title}
          </Typography>
          <Typography className="mt-1">{model.message}</Typography>
        </View>
      </View>

      {model.hasPrimaryAction ? (
        <View className="mt-4 flex-row gap-2">
          <Button
            variant="secondary"
            rounded="full"
            className="h-10 flex-1 bg-[#E5E7EB]"
            onPress={onDismiss}
            disabled={primaryLoading}
          >
            {model.dismissLabel}
          </Button>

          <Button
            rounded="full"
            className="h-10 flex-1"
            onPress={onPrimary}
            disabled={primaryLoading}
          >
            {primaryLoading ? '...' : model.primaryLabel || ''}
          </Button>
        </View>
      ) : null}
    </Animated.View>
  );
}
