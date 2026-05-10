import { authService } from '@/api/auth';
import { chatService } from '@/api/chat';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import type { MessageItem } from '@/types/chat';
import {
    formatMessageTime,
    getDateLabel,
    getSenderDisplayName,
} from '@/utils/chat';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { CornerUpLeft, Plus, Send, Star, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Stable fallbacks ──────────────────────────────────────────────────────────

const EMPTY_MESSAGES: MessageItem[] = [];
const EMPTY_USERS: string[] = [];
const EMPTY_RECEIPTS: { userId: string; readAt: string }[] = [];
const GROUP_WINDOW_MS = 5 * 60 * 1000;

// ─── Internal render types ─────────────────────────────────────────────────────

type ReaderInfo = { userId: string; initials: string; pictureUrl?: string };
type ReceivedMsg = { kind: 'received'; id: string; text: string; senderName?: string; time?: string; repliedTo?: { sender: string; text: string } };
type SentMsg = {
    kind: 'sent';
    id: string;
    text: string;
    time?: string;
    readers?: ReaderInfo[];
    repliedTo?: { sender: string; text: string };
};
type ImageMsg = { kind: 'image'; id: string; uri: string; isSentByMe: boolean; senderName?: string; time?: string; readers?: ReaderInfo[] };
type DateDivider = { kind: 'date'; id: string; label: string };
type SystemMsg = { kind: 'system'; id: string; text: string };
type PlaceCard = { kind: 'place'; id: string };
type TypingMsg = { kind: 'typing'; id: string };
type ChatMessage = ReceivedMsg | SentMsg | ImageMsg | DateDivider | SystemMsg | PlaceCard | TypingMsg;

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
    options?: { showSenderName?: boolean; showTime?: boolean; readers?: ReaderInfo[] },
): ChatMessage {
    if (msg.type === 'SYSTEM') {
        return { kind: 'system', id: msg.id, text: msg.content };
    }

    const isSentByMe = msg.senderId === currentUserId;

    if (msg.type === 'IMAGE') {
        return {
            kind: 'image',
            id: msg.id,
            uri: msg.content,
            isSentByMe,
            senderName: !isSentByMe && options?.showSenderName ? getSenderDisplayName(msg.sender) : undefined,
            time: options?.showTime ? formatMessageTime(msg.createdAt) : undefined,
            readers: isSentByMe ? options?.readers : undefined,
        };
    }

    if (isSentByMe) {
        return {
            kind: 'sent',
            id: msg.id,
            text: msg.content,
            time: options?.showTime ? formatMessageTime(msg.createdAt) : undefined,
            readers: options?.readers,
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
        repliedTo: msg.replyTo
            ? {
                sender: getSenderDisplayName(msg.replyTo.sender),
                text: msg.replyTo.content,
            }
            : undefined,
    };
}

function buildChatItems(
    messages: MessageItem[],
    currentUserId: string,
    hasTyping: boolean,
    readersByMsgId: Record<string, ReaderInfo[]>,
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
                readers: readersByMsgId[msg.id],
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

function ReadAvatar({ reader }: { reader: ReaderInfo }) {
    if (reader.pictureUrl) {
        return (
            <Image
                source={{ uri: reader.pictureUrl }}
                style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'white' }}
            />
        );
    }
    return (
        <View
            style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#9A9A9A',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'white',
            }}
        >
            <Text style={{ fontSize: 7, fontWeight: '600', color: 'white' }}>{reader.initials}</Text>
        </View>
    );
}

const SWIPE_THRESHOLD = 60;

function SwipeableMessage({ onReply, children }: { onReply: () => void; children: React.ReactNode }) {
    const translateX = useSharedValue(0);

    const pan = Gesture.Pan()
        .activeOffsetX(10)
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
            if (e.translationX > 0) {
                translateX.value = Math.min(e.translationX * 0.55, SWIPE_THRESHOLD + 12);
            }
        })
        .onEnd(() => {
            if (translateX.value >= SWIPE_THRESHOLD) {
                runOnJS(onReply)();
            }
            translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        });

    const msgStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const iconStyle = useAnimatedStyle(() => {
        const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
        return {
            opacity: progress,
            transform: [{ scale: 0.6 + 0.4 * progress }],
        };
    });

    return (
        <View style={{ position: 'relative' }}>
            <Animated.View
                style={[{ position: 'absolute', left: 4, top: 0, bottom: 0, justifyContent: 'center' }, iconStyle]}
            >
                <CornerUpLeft size={18} color="#9A9A9A" strokeWidth={2} />
            </Animated.View>
            <GestureDetector gesture={pan}>
                <Animated.View style={msgStyle}>
                    {children}
                </Animated.View>
            </GestureDetector>
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
            {msg.repliedTo ? (
                <View
                    style={{
                        backgroundColor: '#D9D9D9',
                        borderLeftWidth: 3,
                        borderLeftColor: '#8A8A8A',
                        borderRadius: 14,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        maxWidth: '75%',
                        marginBottom: 2,
                    }}
                >
                    <Text style={{ fontWeight: '600', fontSize: 11, color: '#2E2E2E' }}>
                        {msg.repliedTo.sender}
                    </Text>
                    <Text style={{ fontWeight: '400', fontSize: 12, color: '#555555' }}>
                        {msg.repliedTo.text}
                    </Text>
                </View>
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
                        backgroundColor: '#D9D9D9',
                        borderLeftWidth: 3,
                        borderLeftColor: '#8A8A8A',
                        borderRadius: 14,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        maxWidth: '75%',
                    }}
                >
                    <Text style={{ fontWeight: '600', fontSize: 11, color: '#2E2E2E' }}>
                        {msg.repliedTo.sender}
                    </Text>
                    <Text style={{ fontWeight: '400', fontSize: 12, color: '#555555' }}>
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
                <View style={{ paddingRight: 6 }}>
                    <Text style={{ fontWeight: '400', fontSize: 10, color: '#9A9A9A' }}>{msg.time}</Text>
                </View>
            ) : null}
            {msg.readers && msg.readers.length > 0 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 2, paddingRight: 6, paddingTop: 1 }}>
                    {msg.readers.map((r) => (
                        <ReadAvatar key={r.userId} reader={r} />
                    ))}
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

function ImageBubble({ uri, isSentByMe, senderName, time, readers }: { uri: string; isSentByMe: boolean; senderName?: string; time?: string; readers?: ReaderInfo[] }) {
    return (
        <View style={{ flexDirection: isSentByMe ? 'row-reverse' : 'row', alignItems: 'flex-end', marginVertical: 2, paddingHorizontal: 12, gap: 6 }}>
            <View style={{ maxWidth: '70%', gap: 2, alignItems: isSentByMe ? 'flex-end' : 'flex-start' }}>
                {senderName ? (
                    <Text style={{ fontSize: 11, color: '#9ca3af', paddingHorizontal: 4 }}>{senderName}</Text>
                ) : null}
                <Image
                    source={{ uri }}
                    style={{ width: 200, height: 200, borderRadius: 12 }}
                    resizeMode="cover"
                />
                {time ? (
                    <Text style={{ fontSize: 10, color: '#9ca3af', paddingHorizontal: 4 }}>{time}</Text>
                ) : null}
                {isSentByMe && readers && readers.length > 0 ? (
                    <View style={{ flexDirection: 'row', gap: 2, paddingHorizontal: 4 }}>
                        {readers.map((r) => (
                            <ReadAvatar key={r.userId} reader={r} />
                        ))}
                    </View>
                ) : null}
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
    const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);

    // Always reflects the currently logged-in user — avoids stale react-query cache
    // causing sent messages to appear on the wrong side after account switching.
    const currentUserId = useAuthStore((s) => s.me?.id ?? '');

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

    const { data: conversation } = useQuery({
        queryKey: ['conversation', conversationId],
        queryFn: () => chatService.getConversation(conversationId),
        staleTime: 60 * 1000,
        enabled: !!conversationId,
    });

    // API returns newest-first; reverse for oldest-at-top display
    const historyMessages = useMemo(
        () => [...(historyPage?.items ?? [])].reverse(),
        [historyPage],
    );

    const socketMessages = useChatStore((s) => s.messages[conversationId]) ?? EMPTY_MESSAGES;
    const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) ?? EMPTY_USERS;
    const readReceipts = useChatStore((s) => s.readReceipts[conversationId]) ?? EMPTY_RECEIPTS;
    const addMessage = useChatStore((s) => s.addMessage);
    const removeMessage = useChatStore((s) => s.removeMessage);
    const replaceMessage = useChatStore((s) => s.replaceMessage);
    const setReadReceipt = useChatStore((s) => s.setReadReceipt);

    // Merge history + real-time, deduplicating by id
    const allMessages = useMemo(() => {
        const seen = new Set(historyMessages.map((m) => m.id));
        const newFromSocket = socketMessages.filter((m) => !seen.has(m.id));
        return [...historyMessages, ...newFromSocket];
    }, [historyMessages, socketMessages]);

    // Member profile map (userId → UserProfile) — covers readers who may never have sent a message
    const memberMap = useMemo(() => {
        const map: Record<string, NonNullable<MessageItem['sender']>> = {};
        for (const m of conversation?.members ?? []) {
            if (m.user) map[m.userId] = m.user;
        }
        // Supplement with sender info from messages
        for (const msg of allMessages) {
            if (msg.sender && !map[msg.senderId]) map[msg.senderId] = msg.sender;
        }
        return map;
    }, [conversation?.members, allMessages]);

    // Map from sent-message-id → readers who last read at that message
    const readersByMsgId = useMemo(() => {
        console.log('[ReadReceipt] readReceipts:', JSON.stringify(readReceipts));
        console.log('[ReadReceipt] currentUserId:', currentUserId);
        if (readReceipts.length === 0) {
            console.log('[ReadReceipt] early-exit: no receipts');
            return {} as Record<string, ReaderInfo[]>;
        }
        const sentByMe = allMessages.filter((m) => m.senderId === currentUserId);
        console.log('[ReadReceipt] sentByMe count:', sentByMe.length, sentByMe.map((m) => ({ id: m.id, createdAt: m.createdAt })));
        if (sentByMe.length === 0) {
            console.log('[ReadReceipt] early-exit: no messages sent by me');
            return {} as Record<string, ReaderInfo[]>;
        }

        const map: Record<string, ReaderInfo[]> = {};
        for (const receipt of readReceipts) {
            if (receipt.userId === currentUserId) continue;
            console.log('[ReadReceipt] processing receipt:', receipt.userId, 'readAt:', receipt.readAt);
            let latestReadMsg: MessageItem | undefined;
            for (let i = sentByMe.length - 1; i >= 0; i--) {
                console.log('[ReadReceipt]  comparing msg createdAt:', sentByMe[i]!.createdAt, '<= readAt:', receipt.readAt, '->', sentByMe[i]!.createdAt <= receipt.readAt);
                if (sentByMe[i]!.createdAt <= receipt.readAt) {
                    latestReadMsg = sentByMe[i];
                    break;
                }
            }
            if (!latestReadMsg) {
                console.log('[ReadReceipt]  no matching message found for receipt', receipt.userId);
                continue;
            }
            console.log('[ReadReceipt]  matched msg id:', latestReadMsg.id);
            const profile = memberMap[receipt.userId];
            const displayName = profile ? getSenderDisplayName(profile) : '';
            const initials =
                displayName.split(' ').filter(Boolean).map((w) => w[0]!).join('').slice(0, 2).toUpperCase() ||
                receipt.userId.slice(0, 2).toUpperCase();
            if (!map[latestReadMsg.id]) map[latestReadMsg.id] = [];
            map[latestReadMsg.id]!.push({ userId: receipt.userId, initials, pictureUrl: profile?.pictureUrl ?? undefined });
        }
        console.log('[ReadReceipt] final map:', JSON.stringify(map));
        return map;
    }, [allMessages, currentUserId, readReceipts, memberMap]);

    const chatItems = useMemo(
        () => buildChatItems(allMessages, currentUserId, typingUsers.length > 0, readersByMsgId),
        [allMessages, currentUserId, typingUsers.length, readersByMsgId],
    );

    const { sendMessage, startTyping, stopTyping, markRead } = useChatSocket(conversationId);

    useEffect(() => {
        const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
        return () => clearTimeout(timer);
    }, []);

    // Seed readReceipts store from conversation members' lastReadAt on initial load
    useEffect(() => {
        console.log('[ReadReceipt] seed effect — conversation?.members:', JSON.stringify(conversation?.members?.map((m) => ({ userId: m.userId, lastReadAt: m.lastReadAt }))));
        if (!conversation?.members) return;
        for (const member of conversation.members) {
            if (member.userId === currentUserId) continue;
            if (!member.lastReadAt) {
                console.log('[ReadReceipt] member', member.userId, 'has no lastReadAt, skipping');
                continue;
            }
            console.log('[ReadReceipt] seeding receipt for', member.userId, 'readAt:', member.lastReadAt);
            setReadReceipt(conversationId, member.userId, member.lastReadAt);
        }
    }, [conversation?.members, conversationId, currentUserId, setReadReceipt]);

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
        sendMessage(text, replyingTo?.id);
        setInputText('');
        setReplyingTo(null);
        stopTyping();
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }, [inputText, sendMessage, stopTyping, replyingTo]);

    const handlePickImage = useCallback(async () => {
        if (!conversationId) return;
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
            base64: true,
        });

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];

        // Show the image immediately using the local file URI (no network needed)
        const tempId = `temp-img-${Date.now()}`;
        const tempMessage: MessageItem = {
            id: tempId,
            conversationId,
            senderId: currentUserId,
            content: asset.uri,
            type: 'IMAGE',
            replyToId: null,
            replyTo: null,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            sender: null,
        };
        addMessage(conversationId, tempMessage);

        if (!asset.base64) return;
        const mimeType = asset.mimeType ?? 'image/jpeg';
        const content = `data:${mimeType};base64,${asset.base64}`;

        try {
            const sent = await chatService.sendMessage(conversationId, { content, type: 'IMAGE' });
            // Atomically swap the temp entry for the real server message (no flash gap).
            // If the WebSocket message.ack already arrived, replaceMessage handles dedup.
            replaceMessage(conversationId, tempId, sent);
        } catch {
            removeMessage(conversationId, tempId);
            Alert.alert('Lỗi', 'Không thể gửi ảnh. Vui lòng thử lại.');
        }
    }, [conversationId, addMessage, removeMessage, replaceMessage, currentUserId]);

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
            case 'received': {
                const raw = allMessages.find((m) => m.id === msg.id);
                return (
                    <SwipeableMessage key={msg.id} onReply={() => { if (raw) setReplyingTo(raw); }}>
                        <ReceivedBubble msg={msg} />
                    </SwipeableMessage>
                );
            }
            case 'sent': {
                const raw = allMessages.find((m) => m.id === msg.id);
                return (
                    <SwipeableMessage key={msg.id} onReply={() => { if (raw) setReplyingTo(raw); }}>
                        <SentBubble msg={msg} />
                    </SwipeableMessage>
                );
            }
            case 'image': {
                const raw = allMessages.find((m) => m.id === msg.id);
                return (
                    <SwipeableMessage key={msg.id} onReply={() => { if (raw) setReplyingTo(raw); }}>
                        <ImageBubble uri={msg.uri} isSentByMe={msg.isSentByMe} senderName={msg.senderName} time={msg.time} readers={msg.readers} />
                    </SwipeableMessage>
                );
            }
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

            {/* Reply preview banner */}
            {replyingTo ? (
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#D9D9D9',
                        borderTopWidth: 1,
                        borderTopColor: '#C8C8C8',
                        borderLeftWidth: 3,
                        borderLeftColor: '#8A8A8A',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        gap: 8,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', fontSize: 11, color: '#0E0E0E' }}>
                            {getSenderDisplayName(replyingTo.sender)}
                        </Text>
                        <Text style={{ fontWeight: '400', fontSize: 12, color: '#5C5C5C' }} numberOfLines={1}>
                            {replyingTo.type === 'IMAGE' ? '📷 Ảnh' : replyingTo.content}
                        </Text>
                    </View>
                    <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
                        <X size={16} color="#9A9A9A" strokeWidth={2} />
                    </Pressable>
                </View>
            ) : null}

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
                    onPress={handlePickImage}
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
                </View>

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
