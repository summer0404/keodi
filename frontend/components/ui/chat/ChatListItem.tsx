import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCheck } from 'lucide-react-native';
import AvatarSingle from './AvatarSingle';
import AvatarGroup, { type AvatarData } from './AvatarGroup';

export type ChatItemData = {
  id: string;
  avatarType: 'single' | 'group';
  avatars: AvatarData[];
  hasSessionIcon?: boolean;
  name: string;
  locationTag?: string;
  lastMessage: string;
  isTyping?: boolean;
  hasSentTick?: boolean;
  time: string;
  unreadCount?: number;
};

type Props = {
  item: ChatItemData;
  onPress?: () => void;
};

export default function ChatListItem({ item, onPress }: Props) {
  const isUnread = !!item.unreadCount;

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 12,
        backgroundColor: isUnread ? '#FFF6F6' : 'transparent',
      }}
    >
      {item.avatarType === 'single' ? (
        <AvatarSingle
          initials={item.avatars[0]?.initial ?? ''}
          backgroundColor={item.avatars[0]?.color ?? '#EAEAEA'}
        />
      ) : (
        <AvatarGroup avatars={item.avatars} hasSessionIcon={item.hasSessionIcon} />
      )}

      <View style={{ flex: 1, gap: 1 }}>
        <Text
          style={{ fontWeight: '700', fontSize: 15, letterSpacing: -0.1, color: '#0E0E0E' }}
          numberOfLines={1}
        >
          {item.name}
        </Text>

        {item.locationTag ? (
          <Text
            style={{ fontWeight: '500', fontSize: 11, color: '#E63946' }}
            numberOfLines={1}
          >
            {item.locationTag}
          </Text>
        ) : null}

        {item.isTyping ? (
          <Text style={{ fontStyle: 'italic', fontSize: 13, color: '#22C55E' }} numberOfLines={1}>
            đang nhập...
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {item.hasSentTick && <CheckCheck size={13} color="#5C5C5C" strokeWidth={2} />}
            <Text
              style={{
                fontWeight: isUnread ? '500' : '400',
                fontSize: 13,
                color: isUnread ? '#0E0E0E' : '#5C5C5C',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
          </View>
        )}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 5 }}>
        <Text
          style={{
            fontWeight: isUnread ? '600' : '400',
            fontSize: 11,
            color: isUnread ? '#0E0E0E' : '#9A9A9A',
          }}
        >
          {item.time}
        </Text>
        {isUnread ? (
          <View
            style={{
              backgroundColor: '#0E0E0E',
              borderRadius: 10,
              height: 20,
              minWidth: 20,
              paddingHorizontal: 6,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 11, color: 'white', textAlign: 'center' }}>
              {item.unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
