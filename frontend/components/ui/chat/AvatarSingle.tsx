import React from 'react';
import { View, Text } from 'react-native';

type Props = {
  initials: string;
  backgroundColor: string;
};

export default function AvatarSingle({ initials, backgroundColor }: Props) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Text style={{ fontWeight: '600', fontSize: 18, color: '#3A2E22', textAlign: 'center' }}>
        {initials}
      </Text>
    </View>
  );
}
