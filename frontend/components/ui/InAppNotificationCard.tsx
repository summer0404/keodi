import React from 'react';
import { Pressable, View } from 'react-native';
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

  return (
    <View
      className="rounded-3xl border border-[#ECECEC] bg-white px-4 py-3"
      style={{ elevation: 10 }}
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
          <Typography variant="h5" className="text-[18px] leading-6 text-black">
            {model.title}
          </Typography>
          <Typography className="mt-1 text-[16px] leading-6 text-[#1F2937]">
            {model.message}
          </Typography>
        </View>
      </View>

      <View className="mt-4 flex-row gap-2">
        <Button
          variant="secondary"
          rounded="full"
          className="h-11 flex-1 bg-[#E5E7EB]"
          onPress={onDismiss}
          disabled={primaryLoading}
        >
          {model.dismissLabel}
        </Button>

        {model.hasPrimaryAction ? (
          <Button
            rounded="full"
            className="h-11 flex-1"
            onPress={onPrimary}
            disabled={primaryLoading}
          >
            {primaryLoading ? '...' : model.primaryLabel || ''}
          </Button>
        ) : null}
      </View>
    </View>
  );
}
