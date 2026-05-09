import React, { useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SquarePen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import ChatListItem, { type ChatItemData } from '@/components/ui/chat/ChatListItem';

const FILTER_TABS = ['Tất cả', 'Bạn bè', 'Nhóm · 3', 'Địa điểm'];

const MOCK_CHATS: ChatItemData[] = [
  {
    id: '1',
    avatarType: 'group',
    avatars: [
      { initial: 'Y', color: '#EAEAEA' },
      { initial: 'A', color: '#FFD7C2' },
      { initial: 'L', color: '#D7F5DC' },
      { initial: 'T', color: '#EAEAEA' },
    ],
    hasSessionIcon: true,
    name: 'The B Ung Văn Khiêm',
    locationTag: '📍 Badminton court · 52m',
    lastMessage: 'Tú: 7h tối nay nhé mọi người 🏸',
    time: '2 phút',
    unreadCount: 4,
  },
  {
    id: '2',
    avatarType: 'single',
    avatars: [{ initial: 'YP', color: '#EAEAEA' }],
    name: 'Yến Phi',
    lastMessage: '',
    isTyping: true,
    time: '5 phút',
  },
  {
    id: '3',
    avatarType: 'group',
    avatars: [
      { initial: 'M', color: '#C8EAE0' },
      { initial: 'T', color: '#D7F5DC' },
      { initial: 'Q', color: '#D7F5DC' },
    ],
    name: 'Cà phê cuối tuần',
    lastMessage: 'Mai: Chia sẻ 1 địa điểm',
    time: '14:22',
    unreadCount: 2,
  },
  {
    id: '4',
    avatarType: 'single',
    avatars: [{ initial: 'AL', color: '#FFD7C2' }],
    name: 'Anh Lê Hoàng',
    lastMessage: 'Cảm ơn nha bro!',
    time: '11:08',
  },
  {
    id: '5',
    avatarType: 'group',
    avatars: [
      { initial: 'L', color: '#C8EAE0' },
      { initial: 'K', color: '#EAEAEA' },
      { initial: 'V', color: '#EAEAEA' },
      { initial: 'N', color: '#FFD7C2' },
    ],
    hasSessionIcon: true,
    name: 'Trip Đà Lạt 14/05',
    locationTag: '📍 Session · 5 người',
    lastMessage: 'Khang: Hotel đã book xong rồi!',
    time: 'Hôm qua',
  },
  {
    id: '6',
    avatarType: 'single',
    avatars: [{ initial: 'PM', color: '#D7F5DC' }],
    name: 'Phạm Minh Quân',
    lastMessage: 'Bạn: oki tối gặp',
    hasSentTick: true,
    time: 'Hôm qua',
  },
  {
    id: '7',
    avatarType: 'group',
    avatars: [
      { initial: 'H', color: '#D7F5DC' },
      { initial: 'T', color: '#EAEAEA' },
      { initial: 'B', color: '#C8EAE0' },
      { initial: 'K', color: '#EAEAEA' },
    ],
    name: 'Lớp CNTT K20',
    lastMessage: 'Hà: Còn ai chưa đăng kí không?',
    time: 'T2',
  },
  {
    id: '8',
    avatarType: 'single',
    avatars: [{ initial: 'VN', color: '#EAEAEA' }],
    name: 'Vy Nguyễn',
    lastMessage: '📷 Hình ảnh',
    time: 'T2',
  },
];

const keyExtractor = (item: ChatItemData) => item.id;

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('Tất cả');

  const renderItem = ({ item }: { item: ChatItemData }) => (
    <ChatListItem
      item={item}
      onPress={() =>
        router.push({
          pathname: '/(tabs)/group/[id]',
          params: {
            id: item.id,
            name: item.name,
            initials: item.avatars[0]?.initial ?? '',
            color: item.avatars[0]?.color ?? '#EAEAEA',
          },
        } as any)
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 12,
          backgroundColor: 'white',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 28, letterSpacing: -0.6, color: '#0E0E0E' }}>
            Tin nhắn
          </Text>
          <SquarePen size={24} color="#0E0E0E" strokeWidth={2} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = tab === activeFilter;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: isActive ? '#0E0E0E' : '#F4F4F4',
                }}
              >
                <Text
                  style={{
                    fontWeight: '500',
                    fontSize: 13,
                    color: isActive ? 'white' : '#101010',
                  }}
                >
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={MOCK_CHATS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      />
    </View>
  );
}
