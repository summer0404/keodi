import { authService } from '@/api/auth';
import { chatService } from '@/api/chat';
import ChatListItem, { type ChatItemData } from '@/components/ui/chat/ChatListItem';
import type { ConversationItem } from '@/types/chat';
import { conversationToListItem } from '@/utils/chat';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Search, SquarePen, X } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FilterKey = 'all' | 'direct' | 'group' | 'place';

const keyExtractor = (item: ChatItemData) => item.id;

function matchesQuery(conv: ConversationItem, currentUserId: string, query: string): boolean {
    const q = query.toLowerCase().trim();
    if (!q) return true;

    if (conv.name?.toLowerCase().includes(q)) return true;

    const others =
        conv.type === 'DIRECT'
            ? conv.members.filter((m) => m.userId !== currentUserId)
            : conv.members;

    for (const m of others) {
        const { firstName, lastName, username } = m.user ?? {};
        if (firstName?.toLowerCase().includes(q)) return true;
        if (lastName?.toLowerCase().includes(q)) return true;
        if (username?.toLowerCase().includes(q)) return true;
        if (firstName && lastName && `${firstName} ${lastName}`.toLowerCase().includes(q)) return true;
    }

    if (conv.lastMessage?.content.toLowerCase().includes(q)) return true;

    return false;
}

export type ConversationListProps = {
    style?: ViewStyle;
};

export default function ConversationList({ style }: ConversationListProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

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

        return conversations
            .filter((conv: ConversationItem) => {
                const passesTab =
                    activeFilter === 'direct'
                        ? conv.type === 'DIRECT'
                        : activeFilter === 'group'
                            ? conv.type === 'GROUP' && !conv.sessionId
                            : activeFilter === 'place'
                                ? !!conv.sessionId
                                : true;

                const passesMessage = searchQuery.length > 0 || conv.lastMessage !== null;

                return passesTab && passesMessage && matchesQuery(conv, me.id, searchQuery);
            })
            .map((conv) => conversationToListItem(conv, me.id));
    }, [conversations, me, activeFilter, searchQuery]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        inputRef.current?.blur();
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: ChatItemData }) =>
            me ? (
                <ChatListItem
                    item={item}
                    onPress={() =>
                        router.push({
                            pathname: item.hasSessionIcon ? '/(tabs)/group/[id]' : '/chat/[id]',
                            params: {
                                id: item.id,
                                name: item.name,
                                initials: item.avatars[0]?.initial ?? '',
                                color: item.avatars[0]?.color ?? '#EAEAEA',
                            },
                        } as any)
                    }
                />
            ) : null,
        [me, router],
    );

    const isSearching = searchQuery.length > 0;
    const isEmpty = !isLoading && !isError && filteredItems.length === 0;

    return (
        <View style={[{ flex: 1, backgroundColor: 'white' }, style]}>
            {/* Header */}
            <View
                style={{
                    paddingTop: insets.top + 8,
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                    gap: 10,
                    backgroundColor: 'white',
                }}
            >
                {/* Title row */}
                <View
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <Text style={{ fontWeight: '700', fontSize: 28, letterSpacing: -0.6, color: '#0E0E0E' }}>
                        Tin nhắn
                    </Text>
                    <SquarePen size={24} color="#0E0E0E" strokeWidth={2} />
                </View>

                {/* Search bar */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F4F4F4',
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        gap: 8,
                    }}
                >
                    <Search size={16} color="#9A9A9A" strokeWidth={2} />
                    <TextInput
                        ref={inputRef}
                        style={{ flex: 1, fontSize: 14, color: '#0E0E0E', padding: 0 }}
                        placeholder="Tìm kiếm cuộc trò chuyện..."
                        placeholderTextColor="#9A9A9A"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="never"
                    />
                    {isSearching ? (
                        <Pressable onPress={handleClearSearch} hitSlop={8}>
                            <View
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    backgroundColor: '#C4C4C4',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <X size={11} color="white" strokeWidth={2.5} />
                            </View>
                        </Pressable>
                    ) : null}
                </View>

                {/* Filter tabs */}
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
                                    style={{
                                        fontWeight: '500',
                                        fontSize: 13,
                                        color: isActive ? 'white' : '#101010',
                                    }}
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
                    <Text style={{ fontWeight: '500', fontSize: 14, color: '#5C5C5C', textAlign: 'center' }}>
                        Không thể tải tin nhắn. Vui lòng thử lại.
                    </Text>
                </View>
            ) : isEmpty ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 32,
                    }}
                >
                    <Text style={{ fontWeight: '400', fontSize: 14, color: '#9A9A9A', textAlign: 'center' }}>
                        {isSearching
                            ? `Không tìm thấy kết quả cho "${searchQuery}"`
                            : 'Chưa có cuộc trò chuyện nào'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredItems}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
                />
            )}
        </View>
    );
}
