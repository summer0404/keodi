import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SquarePen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ChatListItem, { type ChatItemData } from '@/components/ui/chat/ChatListItem';
import { chatService } from '@/api/chat';
import { authService } from '@/api/auth';
import { conversationToListItem } from '@/utils/chat';
import type { ConversationItem } from '@/types/chat';

type FilterKey = 'all' | 'direct' | 'group' | 'place';

const keyExtractor = (item: ChatItemData) => item.id;

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: authService.getMe,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatService.listConversations({ limit: 50 }),
    enabled: !!me,
    staleTime: 30 * 1000,
  });

  const conversations = page?.items ?? [];

  const groupCount = useMemo(
    () => conversations.filter((c) => c.type === 'GROUP' && !c.sessionId).length,
    [conversations],
  );

  const FILTER_TABS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'direct', label: 'Bạn bè' },
    { key: 'group', label: `Nhóm · ${groupCount}` },
    { key: 'place', label: 'Địa điểm' },
  ];

  const filteredItems = useMemo<ChatItemData[]>(() => {
    if (!me) return [];

    const filtered = conversations.filter((conv: ConversationItem) => {
      if (activeFilter === 'direct') return conv.type === 'DIRECT';
      if (activeFilter === 'group') return conv.type === 'GROUP' && !conv.sessionId;
      if (activeFilter === 'place') return !!conv.sessionId;
      return true;
    });

    return filtered.map((conv) => conversationToListItem(conv, me.id));
  }, [conversations, me, activeFilter]);

  const renderItem = ({ item }: { item: ChatItemData }) =>
    me ? (
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
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          gap: 12,
          backgroundColor: 'white',
        }}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
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
            const isActive = tab.key === activeFilter;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: isActive ? '#0E0E0E' : '#F4F4F4',
                }}
              >
                <Text
                  style={{ fontWeight: '500', fontSize: 13, color: isActive ? 'white' : '#101010' }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0E0E0E" />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{ fontWeight: '500', fontSize: 14, color: '#5C5C5C', textAlign: 'center' }}
          >
            Không thể tải tin nhắn. Vui lòng thử lại.
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{ fontWeight: '400', fontSize: 14, color: '#9A9A9A', textAlign: 'center' }}
          >
            Chưa có cuộc trò chuyện nào
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        />
      )}
    </View>
  );
}
