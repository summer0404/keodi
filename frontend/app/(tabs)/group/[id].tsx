import ChatView from '@/components/ui/chat/ChatView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{
    id: string;
    name: string;
    initials: string;
    color: string;
  }>();

  const conversationId = params.id ?? '';
  const name = params.name ?? 'Chat';
  const initials = params.initials ?? '?';
  const color = params.color ?? '#EAEAEA';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: insets.top + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#EAEAEA',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F4F4F4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color="#0E0E0E" strokeWidth={2} />
        </Pressable>

        <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontWeight: '600', fontSize: 13, color: '#3A2E22' }}>{initials}</Text>
          </View>
          <View>
            <Text style={{ fontWeight: '700', fontSize: 15, color: '#0E0E0E' }}>{name}</Text>
            <Text style={{ fontWeight: '600', fontSize: 11, color: '#5C5C5C' }}>
              Nhấn để xem hồ sơ
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MoreHorizontal size={20} color="#0E0E0E" strokeWidth={2} />
        </Pressable>
      </View>

      <ChatView conversationId={conversationId} initials={initials} color={color} />
    </KeyboardAvoidingView>
  );
}

