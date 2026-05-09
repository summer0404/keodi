import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal, Send, Smile, Plus, Star, MapPin } from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReceivedMsg = {
  kind: 'received';
  id: string;
  text: string;
  senderName?: string;
};

type SentMsg = {
  kind: 'sent';
  id: string;
  text: string;
  time?: string;
  isRead?: boolean;
  repliedTo?: { sender: string; text: string };
};

type DateDivider = { kind: 'date'; id: string; label: string };
type SystemMsg   = { kind: 'system'; id: string; text: string };
type PlaceCard   = { kind: 'place'; id: string };
type TypingMsg   = { kind: 'typing'; id: string };

type ChatMessage = ReceivedMsg | SentMsg | DateDivider | SystemMsg | PlaceCard | TypingMsg;

// ─── Mock conversation data ───────────────────────────────────────────────────

const MESSAGES: ChatMessage[] = [
  { kind: 'date',     id: 'd1', label: 'Hôm nay' },
  { kind: 'received', id: 'm1', text: 'Ê tối nay đi đánh cầu lông không?', senderName: 'Yến Phi' },
  { kind: 'received', id: 'm2', text: 'Tao thấy có sân mới mở gần đây nè' },
  { kind: 'sent',     id: 'm3', text: 'Sân nào vậy? Gần Thạnh Mỹ Tây hả?', time: '14:02', isRead: true },
  { kind: 'system',   id: 's1', text: 'Yến Phi đã chia sẻ một địa điểm' },
  { kind: 'place',    id: 'p1' },
  { kind: 'received', id: 'm4', text: 'Sân này nè! Mới mở 4.8 sao', senderName: 'Yến Phi' },
  {
    kind: 'sent',
    id: 'm5',
    text: 'Oke vậy 7h tối gặp ở đó nha 🏸',
    repliedTo: { sender: 'Yến Phi', text: 'Sân này nè! Mới mở 4.8 sao' },
  },
  { kind: 'sent',     id: 'm6', text: 'Tao rủ thêm Anh Lê nữa', time: '14:07', isRead: true },
  { kind: 'received', id: 'm7', text: 'Oki ngon 👍 nhớ mang vợt', senderName: 'Yến Phi' },
  { kind: 'typing',   id: 't1' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 0 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: '#EAEAEA' }} />
      <Text style={{ fontWeight: '500', fontSize: 11, color: '#5C5C5C' }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: '#EAEAEA' }} />
    </View>
  );
}

function SystemMessage({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 6 }}>
      <Text style={{ fontWeight: '400', fontSize: 11, color: '#5C5C5C', textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

function ReceivedBubble({ msg }: { msg: ReceivedMsg }) {
  return (
    <View style={{ marginBottom: 2 }}>
      {msg.senderName ? (
        <Text style={{ fontWeight: '400', fontSize: 11, color: '#5C5C5C', paddingLeft: 12, paddingBottom: 2 }}>
          {msg.senderName}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: '#F2F2F2',
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
          alignSelf: 'flex-start',
          maxWidth: '75%',
        }}
      >
        <Text style={{ fontWeight: '400', fontSize: 14, lineHeight: 19.6, color: '#0E0E0E' }}>
          {msg.text}
        </Text>
      </View>
    </View>
  );
}

function SentBubble({ msg }: { msg: SentMsg }) {
  return (
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      {msg.repliedTo ? (
        <View
          style={{
            backgroundColor: '#1F1F1F',
            borderLeftWidth: 3,
            borderLeftColor: '#E63946',
            borderRadius: 14,
            paddingHorizontal: 10,
            paddingVertical: 6,
            maxWidth: '75%',
          }}
        >
          <Text style={{ fontWeight: '600', fontSize: 11, color: 'white' }}>
            {msg.repliedTo.sender}
          </Text>
          <Text style={{ fontWeight: '400', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
            {msg.repliedTo.text}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          backgroundColor: '#0E0E0E',
          borderRadius: 18,
          borderBottomRightRadius: 4,
          paddingVertical: 8,
          paddingHorizontal: 12,
          alignSelf: 'flex-end',
          maxWidth: '75%',
        }}
      >
        <Text style={{ fontWeight: '400', fontSize: 14, lineHeight: 19.6, color: 'white' }}>
          {msg.text}
        </Text>
      </View>

      {msg.time ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 6 }}>
          <Text style={{ fontWeight: '400', fontSize: 10, color: '#9A9A9A' }}>{msg.time}</Text>
          {msg.isRead ? (
            <View style={{ flexDirection: 'row', gap: -4 }}>
              <View style={{ width: 10, height: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#2D7FF9', transform: [{ rotate: '-45deg' }] }} />
              <View style={{ width: 10, height: 6, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: '#2D7FF9', transform: [{ rotate: '-45deg' }], marginLeft: -5 }} />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function PlaceCardMsg() {
  return (
    <View style={{ width: 250 }}>
      <View
        style={{
          backgroundColor: 'white',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#EAEAEA',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        {/* Image area */}
        <View style={{ width: 248, height: 110, position: 'relative' }}>
          <Image
            source={require('@/assets/images/chat/place-card-map.png')}
            style={{ width: 248, height: 110 }}
            resizeMode="cover"
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 50,
              backgroundColor: 'transparent',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: 'rgba(34,197,94,0.95)',
              borderRadius: 100,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontWeight: '600', fontSize: 10, color: 'white' }}>● Mở</Text>
          </View>
          <View
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 100,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 10, color: '#0E0E0E' }}>📍 52m</Text>
          </View>
        </View>

        {/* Info section */}
        <View style={{ padding: 10, paddingTop: 10, gap: 4 }}>
          <Text style={{ fontWeight: '700', fontSize: 13, lineHeight: 16.25, color: '#0E0E0E' }} numberOfLines={1}>
            The B Ung Văn Khiêm - Badminton
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Star size={11} color="#F5A623" fill="#F5A623" />
            <Text style={{ fontWeight: '600', fontSize: 11, color: '#0E0E0E' }}>4.8</Text>
            <Text style={{ fontWeight: '400', fontSize: 11, color: '#5C5C5C' }}>· Badminton court</Text>
          </View>

          <Text style={{ fontWeight: '400', fontSize: 11, lineHeight: 14.3, color: '#5C5C5C' }} numberOfLines={2}>
            155-157 Đ. Ung Văn Khiêm, P25, TPHCM
          </Text>

          <View style={{ flexDirection: 'row', gap: 6, paddingTop: 6 }}>
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 8, paddingVertical: 7, alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', fontSize: 11, color: '#0E0E0E' }}>Map</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#0E0E0E', borderRadius: 8, paddingVertical: 7, alignItems: 'center' }}>
              <Text style={{ fontWeight: '600', fontSize: 11, color: 'white' }}>Xem chi tiết</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function TypingIndicator({ initials, color }: { initials: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 }}>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontWeight: '600', fontSize: 7, color: '#3A2E22' }}>{initials}</Text>
      </View>
      <View
        style={{
          backgroundColor: '#F2F2F2',
          borderRadius: 18,
          borderBottomLeftRadius: 4,
          paddingVertical: 10,
          paddingHorizontal: 14,
          width: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9A9A9A' }} />
        ))}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');

  const params = useLocalSearchParams<{
    id: string;
    name: string;
    initials: string;
    color: string;
  }>();

  const name     = params.name     ?? 'Chat';
  const initials = params.initials ?? '?';
  const color    = params.color    ?? '#EAEAEA';

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    return () => clearTimeout(timer);
  }, []);

  const renderMessage = (msg: ChatMessage) => {
    switch (msg.kind) {
      case 'date':
        return <DateSeparator key={msg.id} label={msg.label} />;
      case 'system':
        return <SystemMessage key={msg.id} text={msg.text} />;
      case 'place':
        return <View key={msg.id} style={{ marginBottom: 2 }}><PlaceCardMsg /></View>;
      case 'received':
        return <ReceivedBubble key={msg.id} msg={msg} />;
      case 'sent':
        return <SentBubble key={msg.id} msg={msg} />;
      case 'typing':
        return <TypingIndicator key={msg.id} initials={initials} color={color} />;
      default:
        return null;
    }
  };

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
            <Text style={{ fontWeight: '600', fontSize: 11, color: '#5C5C5C' }}>Nhấn để xem hồ sơ</Text>
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

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {MESSAGES.map(renderMessage)}
        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Input bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: insets.bottom + 10,
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#EAEAEA',
        }}
      >
        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F4F4F4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} color="#0E0E0E" strokeWidth={2} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F4F4F4',
            borderRadius: 22,
            paddingHorizontal: 14,
            paddingVertical: 10,
            gap: 8,
          }}
        >
          <TextInput
            style={{ flex: 1, fontSize: 14, color: '#0E0E0E', padding: 0 }}
            placeholder="Nhắn tin..."
            placeholderTextColor="#9A9A9A"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <Smile size={18} color="#9A9A9A" strokeWidth={2} />
        </View>

        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#F4F4F4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MapPin size={18} color="#0E0E0E" strokeWidth={2} />
        </Pressable>

        <Pressable
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#0E0E0E',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Send size={16} color="white" strokeWidth={2} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
