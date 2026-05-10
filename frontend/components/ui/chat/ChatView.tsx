import { authService } from '@/api/auth';
import { chatService } from '@/api/chat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useChatStore } from '@/store/useChatStore';
import type { MessageItem } from '@/types/chat';
import {
    formatMessageTime,
    getDateLabel,
    getSenderDisplayName,
} from '@/utils/chat';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Plus, Send, Smile, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Stable fallbacks ──────────────────────────────────────────────────────────

const EMPTY_MESSAGES: MessageItem[] = [];
const EMPTY_USERS: string[] = [];
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// ─── Internal render types ─────────────────────────────────────────────────────

type ReceivedMsg = { kind: 'received'; id: string; text: string; senderName?: string; time?: string };
type SentMsg = {
    kind: 'sent';
    id: string;
    text: string;
    time?: string;
    isRead?: boolean;
    repliedTo?: { sender: string; text: string };
};
type DateDivider = { kind: 'date'; id: string; label: string };
type SystemMsg = { kind: 'system'; id: string; text: string };
type PlaceCard = { kind: 'place'; id: string };
type TypingMsg = { kind: 'typing'; id: string };
type ChatMessage = ReceivedMsg | SentMsg | DateDivider | SystemMsg | PlaceCard | TypingMsg;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function canBeGrouped(left: MessageItem | undefined, right: MessageItem | undefined): boolean {
    if (!left || !right) return false;
    if (left.type === 'SYSTEM' || right.type === 'SYSTEM') return false;
    if (left.senderId !== right.senderId) return false;

    const diffMs = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    return diffMs >= 0 && diffMs <= GROUP_WINDOW_MS;
}

function apiMessageToChat(
    msg: MessageItem,
    currentUserId: string,
    options?: { showSenderName?: boolean; showTime?: boolean },
): ChatMessage {
    if (msg.type === 'SYSTEM') {
        return { kind: 'system', id: msg.id, text: msg.content };
    }

    if (msg.senderId === currentUserId) {
        return {
            kind: 'sent',
            id: msg.id,
            text: msg.content,
            time: options?.showTime ? formatMessageTime(msg.createdAt) : undefined,
            isRead: false,
            repliedTo: msg.replyTo
                ? {
                    sender: getSenderDisplayName(msg.replyTo.sender),
                    text: msg.replyTo.content,
                }
                : undefined,
        };
    }

    return {
        kind: 'received',
        id: msg.id,
        text: msg.content,
        senderName: options?.showSenderName ? getSenderDisplayName(msg.sender) : undefined,
        time: options?.showTime ? formatMessageTime(msg.createdAt) : undefined,
    };
}

function buildChatItems(
    messages: MessageItem[],
    currentUserId: string,
    hasTyping: boolean,
): ChatMessage[] {
    const items: ChatMessage[] = [];
    let lastDate = '';

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const prevMsg = i > 0 ? messages[i - 1] : undefined;
        const nextMsg = i < messages.length - 1 ? messages[i + 1] : undefined;
        const dateLabel = getDateLabel(msg.createdAt);
        if (dateLabel !== lastDate) {
            items.push({ kind: 'date', id: `date-${msg.id}`, label: dateLabel });
            lastDate = dateLabel;
        }

        const prevDateLabel = prevMsg ? getDateLabel(prevMsg.createdAt) : '';
        const nextDateLabel = nextMsg ? getDateLabel(nextMsg.createdAt) : '';
        const groupedWithPrev = prevDateLabel === dateLabel && canBeGrouped(prevMsg, msg);
        const groupedWithNext = nextDateLabel === dateLabel && canBeGrouped(msg, nextMsg);
        const isSentByMe = msg.senderId === currentUserId;

        items.push(
            apiMessageToChat(msg, currentUserId, {
                showSenderName: !isSentByMe && !groupedWithPrev,
                showTime: !groupedWithNext,
            }),
        );
    }

    if (hasTyping) {
        items.push({ kind: 'typing', id: 'typing-indicator' });
    }

    return items;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 14,
            }}
        >
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
        <View style={{ marginBottom: 4 }}>
            {msg.senderName ? (
                <Text
                    style={{ fontWeight: '400', fontSize: 11, color: '#5C5C5C', paddingLeft: 12, paddingBottom: 2 }}
                >
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
            {msg.time ? (
                <View style={{ paddingLeft: 12, paddingTop: 2 }}>
                    <Text style={{ fontWeight: '400', fontSize: 10, color: '#9A9A9A' }}>{msg.time}</Text>
                </View>
            ) : null}
        </View>
    );
}

function SentBubble({ msg }: { msg: SentMsg }) {
    return (
        <View style={{ alignItems: 'flex-end', gap: 2, marginBottom: 4 }}>
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
                            <View
                                style={{
                                    width: 10,
                                    height: 6,
                                    borderBottomWidth: 1.5,
                                    borderLeftWidth: 1.5,
                                    borderColor: '#2D7FF9',
                                    transform: [{ rotate: '-45deg' }],
                                }}
                            />
                            <View
                                style={{
                                    width: 10,
                                    height: 6,
                                    borderBottomWidth: 1.5,
                                    borderLeftWidth: 1.5,
                                    borderColor: '#2D7FF9',
                                    transform: [{ rotate: '-45deg' }],
                                    marginLeft: -5,
                                }}
                            />
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
                <View style={{ width: 248, height: 110, position: 'relative' }}>
                    <Image
                        source={require('@/assets/images/chat/place-card-map.png')}
                        style={{ width: 248, height: 110 }}
                        resizeMode="cover"
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

                <View style={{ padding: 10, gap: 4 }}>
                    <Text
                        style={{ fontWeight: '700', fontSize: 13, lineHeight: 16.25, color: '#0E0E0E' }}
                        numberOfLines={1}
                    >
                        The B Ung Văn Khiêm - Badminton
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Star size={11} color="#F5A623" fill="#F5A623" />
                        <Text style={{ fontWeight: '600', fontSize: 11, color: '#0E0E0E' }}>4.8</Text>
                        <Text style={{ fontWeight: '400', fontSize: 11, color: '#5C5C5C' }}>
                            · Badminton court
                        </Text>
                    </View>
                    <Text
                        style={{ fontWeight: '400', fontSize: 11, lineHeight: 14.3, color: '#5C5C5C' }}
                        numberOfLines={2}
                    >
                        155-157 Đ. Ung Văn Khiêm, P25, TPHCM
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, paddingTop: 6 }}>
                        <View
                            style={{
                                flex: 1,
                                borderWidth: 1,
                                borderColor: '#EAEAEA',
                                borderRadius: 8,
                                paddingVertical: 7,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontWeight: '600', fontSize: 11, color: '#0E0E0E' }}>Map</Text>
                        </View>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: '#0E0E0E',
                                borderRadius: 8,
                                paddingVertical: 7,
                                alignItems: 'center',
                            }}
                        >
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
                    <View
                        key={i}
                        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9A9A9A' }}
                    />
                ))}
            </View>
        </View>
    );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────

export type ChatViewProps = {
    conversationId: string;
    initials: string;
    color: string;
    style?: ViewStyle;
};

export default function ChatView({ conversationId, initials, color, style }: ChatViewProps) {
    const insets = useSafeAreaInsets();
    const scrollRef = useRef<ScrollView>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [inputText, setInputText] = useState('');

    const { data: me } = useQuery({
        queryKey: ['me'],
        queryFn: authService.getMe,
        staleTime: 5 * 60 * 1000,
    });

    const { data: historyPage, isLoading } = useQuery({
        queryKey: ['messages', conversationId],
        queryFn: () => chatService.listMessages(conversationId, { limit: 30 }),
        enabled: !!conversationId && !!me,
        staleTime: 30 * 1000,
    });

    // API returns newest-first; reverse for oldest-at-top display
    const historyMessages = useMemo(
        () => [...(historyPage?.items ?? [])].reverse(),
        [historyPage],
    );

    const socketMessages = useChatStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES;
    const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) ?? EMPTY_USERS;

    // Merge history + real-time, deduplicating by id
    const allMessages = useMemo(() => {
        const seen = new Set(historyMessages.map((m) => m.id));
        const newFromSocket = socketMessages.filter((m) => !seen.has(m.id));
        return [...historyMessages, ...newFromSocket];
    }, [historyMessages, socketMessages]);

    const chatItems = useMemo(
        () => buildChatItems(allMessages, me?.id ?? '', typingUsers.length > 0),
        [allMessages, me?.id, typingUsers.length],
    );

    const { sendMessage, startTyping, stopTyping, markRead } = useChatSocket(conversationId);

    useEffect(() => {
        const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (chatItems.length > 0) {
            scrollRef.current?.scrollToEnd({ animated: true });
        }
    }, [chatItems.length]);

    useEffect(() => {
        if (conversationId) markRead();
    }, [conversationId, markRead]);

    const handleChangeText = useCallback(
        (text: string) => {
            setInputText(text);

            if (text.length > 0) {
                startTyping();
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                typingTimerRef.current = setTimeout(() => stopTyping(), 3000);
            } else {
                stopTyping();
                if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            }
        },
        [startTyping, stopTyping],
    );

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;
        sendMessage(text);
        setInputText('');
        stopTyping();
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }, [inputText, sendMessage, stopTyping]);

    const renderMessage = (msg: ChatMessage) => {
        switch (msg.kind) {
            case 'date':
                return <DateSeparator key={msg.id} label={msg.label} />;
            case 'system':
                return <SystemMessage key={msg.id} text={msg.text} />;
            case 'place':
                return (
                    <View key={msg.id} style={{ marginBottom: 2 }}>
                        <PlaceCardMsg />
                    </View>
                );
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
        <View style={[{ flex: 1 }, style]}>
            {/* Messages */}
            {isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="large" color="#0E0E0E" />
                </View>
            ) : (
                <ScrollView
                    ref={scrollRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}
                    showsVerticalScrollIndicator={false}
                >
                    {chatItems.map(renderMessage)}
                    <View style={{ height: 12 }} />
                </ScrollView>
            )}

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
                        onChangeText={handleChangeText}
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
                    onPress={handleSend}
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: inputText.trim() ? '#0E0E0E' : '#F4F4F4',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Send size={16} color={inputText.trim() ? 'white' : '#9A9A9A'} strokeWidth={2} />
                </Pressable>
            </View>
        </View>
    );
}
