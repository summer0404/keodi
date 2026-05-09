import React from 'react';
import { View, Text } from 'react-native';
import { MapPin } from 'lucide-react-native';

export type AvatarData = {
  initial: string;
  color: string;
};

const GRID_POSITIONS = [
  { left: 0, top: 0 },
  { left: 27, top: 0 },
  { left: 0, top: 27 },
  { left: 27, top: 27 },
] as const;

type Props = {
  avatars: AvatarData[];
  hasSessionIcon?: boolean;
};

export default function AvatarGroup({ avatars, hasSessionIcon }: Props) {
  return (
    <View style={{ width: 52, height: 52, flexShrink: 0 }}>
      {avatars.slice(0, 4).map((avatar, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: GRID_POSITIONS[i].left,
            top: GRID_POSITIONS[i].top,
            width: 25,
            height: 25,
            borderRadius: 12.5,
            backgroundColor: avatar.color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', fontSize: 9, color: '#3A2E22' }}>
            {avatar.initial}
          </Text>
        </View>
      ))}

      {hasSessionIcon && (
        <View
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <MapPin size={11} color="#E63946" strokeWidth={2} />
        </View>
      )}
    </View>
  );
}
