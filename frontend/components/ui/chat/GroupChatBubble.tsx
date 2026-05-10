import { chatService } from '@/api/chat';
import ChatView from '@/components/ui/chat/ChatView';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import type { MessageItem } from '@/types/chat';
import { getSenderDisplayName } from '@/utils/chat';
import { MessageCircle, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PANEL_HEIGHT = 450;
const BUBBLE_SIZE = 56;
/** Must match `tabBarReservedSpace` in [id].tsx */
const TAB_BAR_RESERVED = 110;
const GAP = 8;
const BUBBLE_COLOR = '#0E0E0E';
const EMPTY_MESSAGES: MessageItem[] = [];

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0]! + words[1][0]!).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || 'GR';
}

type Props = {
    sessionId: string;
    sessionName: string;
    /** Authenticated user IDs from session.members (guests filtered out) */
    memberIds: string[];
};

export default function GroupChatBubble({ sessionId, sessionName, memberIds }: Props) {
    const insets = useSafeAreaInsets();
    const [isExpanded, setIsExpanded] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [preview, setPreview] = useState<{ sender: string; text: string } | null>(null);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isExpandedRef = useRef(false);

    const currentUserId = useAuthStore((s) => s.me?.id ?? '');

    const slideAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const initials = getInitials(sessionName);

    // Keep socket alive even when collapsed so we receive messages and read events
    useChatSocket(conversationId ?? '');

    const storeMessages = useChatStore((s) => s.messages);
    const socketMessages: MessageItem[] = (conversationId ? storeMessages[conversationId] : null) ?? EMPTY_MESSAGES;

    // Track new messages from others while panel is collapsed
    const lastMsgCountRef = useRef(0);
    useEffect(() => {
        if (!conversationId) return;
        const count = socketMessages.length;
        const prev = lastMsgCountRef.current;
        lastMsgCountRef.current = count;
        if (count <= prev) return;

        const newMsgs: MessageItem[] = socketMessages.slice(prev);
        const fromOthers = newMsgs.filter((m) => m.senderId !== currentUserId);
        if (fromOthers.length === 0) return;

        if (!isExpandedRef.current) {
            setUnreadCount((n) => n + fromOthers.length);

            // Show preview for the latest incoming message
            const last = fromOthers[fromOthers.length - 1]!;
            const senderName = getSenderDisplayName(last.sender);
            setPreview({ sender: senderName, text: last.content });
            if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
            previewTimerRef.current = setTimeout(() => setPreview(null), 4000);
        }
    }, [socketMessages, conversationId, currentUserId]);

    const animateOpen = useCallback(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: PANEL_HEIGHT,
                useNativeDriver: false,
                damping: 20,
                stiffness: 200,
            }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
        ]).start();
    }, [slideAnim, opacityAnim]);

    const animateClose = useCallback(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: false,
                damping: 20,
                stiffness: 300,
            }),
            Animated.timing(opacityAnim, { toValue: 0, duration: 100, useNativeDriver: false }),
        ]).start(() => {
            setIsExpanded(false);
            isExpandedRef.current = false;
        });
    }, [slideAnim, opacityAnim]);

    const handleToggle = useCallback(async () => {
        if (isExpanded) {
            animateClose();
            return;
        }

        if (isInitializing) return;

        setIsExpanded(true);
        isExpandedRef.current = true;
        setUnreadCount(0);
        setPreview(null);
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);

        if (!conversationId) {
            setIsInitializing(true);
            try {
                const conv = await chatService.createConversation({
                    type: 'GROUP',
                    sessionId,
                    memberIds,
                    name: sessionName,
                });
                setConversationId(conv.id);
                lastMsgCountRef.current = 0;
                animateOpen();
            } catch {
                setIsExpanded(false);
                isExpandedRef.current = false;
            } finally {
                setIsInitializing(false);
            }
        } else {
            animateOpen();
        }
    }, [
        isExpanded,
        isInitializing,
        conversationId,
        animateOpen,
        animateClose,
        sessionId,
        memberIds,
        sessionName,
    ]);

    // Bubble sits just above the tab bar
    const bubbleBottom = insets.bottom + TAB_BAR_RESERVED;
    // Panel sits above the bubble with a small gap
    const panelBottom = bubbleBottom + BUBBLE_SIZE + GAP;

    return (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            {/* ── Slide-up chat panel ───────────────────────────────────────────── */}
            {isExpanded && (
                <Animated.View
                    style={{
                        position: 'absolute',
                        bottom: panelBottom,
                        left: 16,
                        right: 16,
                        height: slideAnim,
                        opacity: opacityAnim,
                        borderRadius: 20,
                        overflow: 'hidden',
                        backgroundColor: 'white',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 16,
                        elevation: 12,
                    }}
                >
                    {/* Header */}
                    <View
                        style={{
                            backgroundColor: BUBBLE_COLOR,
                            height: 52,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            gap: 10,
                        }}
                    >
                        <MessageCircle size={18} color="white" strokeWidth={2} />
                        <View style={{ flex: 1 }} />
                        <Pressable hitSlop={12} onPress={animateClose} style={{ padding: 4 }}>
                            <X size={20} color="white" strokeWidth={2.2} />
                        </Pressable>
                    </View>

                    {/* Body */}
                    {isInitializing ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <ActivityIndicator size="large" color={BUBBLE_COLOR} />
                        </View>
                    ) : conversationId ? (
                        <ChatView
                            conversationId={conversationId}
                            initials={initials}
                            color={BUBBLE_COLOR}
                            style={{ flex: 1 }}
                        />
                    ) : null}
                </Animated.View>
            )}

            {/* ── Preview toast (shown when collapsed and a new message arrives) ── */}
            {!isExpanded && preview ? (
                <Pressable
                    onPress={handleToggle}
                    style={{
                        position: 'absolute',
                        bottom: bubbleBottom + BUBBLE_SIZE + GAP,
                        right: 16,
                        maxWidth: 260,
                        backgroundColor: '#1A1A1A',
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 6,
                        elevation: 8,
                    }}
                >
                    <Text style={{ fontWeight: '600', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>
                        {preview.sender}
                    </Text>
                    <Text
                        style={{ fontWeight: '400', fontSize: 13, color: 'white' }}
                        numberOfLines={2}
                    >
                        {preview.text}
                    </Text>
                </Pressable>
            ) : null}

            {/* ── Floating action button ────────────────────────────────────────── */}
            <Pressable
                onPress={handleToggle}
                style={{
                    position: 'absolute',
                    bottom: bubbleBottom,
                    right: 16,
                    width: BUBBLE_SIZE,
                    height: BUBBLE_SIZE,
                    borderRadius: BUBBLE_SIZE / 2,
                    backgroundColor: BUBBLE_COLOR,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                {isInitializing ? (
                    <ActivityIndicator size="small" color="white" />
                ) : (
                    <MessageCircle size={24} color="white" strokeWidth={2} />
                )}

                {/* Unread badge */}
                {!isExpanded && unreadCount > 0 ? (
                    <View
                        style={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            backgroundColor: '#E63946',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingHorizontal: 4,
                        }}
                    >
                        <Text style={{ fontWeight: '700', fontSize: 10, color: 'white' }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                ) : null}
            </Pressable>
        </View>
    );
}
