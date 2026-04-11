import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Typography from './Typography';
import { DEFAULT_AVATAR_SOURCE } from '@/constants/helper';
import type { GroupSessionMember } from '@/types/api';

type GroupSessionAvatarStackProps = {
  members?: GroupSessionMember[];
  size?: number;
};

const getAvatarSource = (pictureUrl?: string | null) => {
  const rawUrl = pictureUrl?.trim();

  if (!rawUrl) {
    return DEFAULT_AVATAR_SOURCE;
  }

  return { uri: rawUrl };
};

export const GroupSessionAvatarStack = ({
  members = [],
  size = 28,
}: GroupSessionAvatarStackProps) => {
  const visibleMembers = useMemo(() => members.slice(0, 4), [members]);
  const extraCount = Math.max(members.length - visibleMembers.length, 0);

  return (
    <View className="flex-row items-center">
      <View className="flex-row items-center">
        {visibleMembers.map((member, index) => {
          const avatarSource = getAvatarSource(member.user?.pictureUrl);

          return (
            <View
              key={member.id}
              className="overflow-hidden rounded-full border-2 border-white bg-[#F3F4F6]"
              style={{
                width: size,
                height: size,
                marginLeft: index === 0 ? 0 : -8,
              }}
            >
              <Image
                source={avatarSource}
                style={{ width: size, height: size }}
                contentFit="cover"
              />
            </View>
          );
        })}
      </View>

      {extraCount > 0 ? (
        <View
          className="ml-[-8px] items-center justify-center rounded-full border-2 border-white bg-[#EEF2FF]"
          style={{ width: size, height: size }}
        >
          <Typography variant="caption-sm" className="font-semibold text-[#1F2937]">
            +{extraCount}
          </Typography>
        </View>
      ) : null}
    </View>
  );
};

export default GroupSessionAvatarStack;
