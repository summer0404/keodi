import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import type { MessageItem } from '@/types/chat';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';

const resolveSocketUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

export function useChatSocket(conversationId: string) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUserId = useAuthStore((s) => s.me?.id ?? '');
  const addMessage = useChatStore((s) => s.addMessage);
  const setTypingUser = useChatStore((s) => s.setTypingUser);
  const clearTypingUser = useChatStore((s) => s.clearTypingUser);
  const setReadReceipt = useChatStore((s) => s.setReadReceipt);

  useEffect(() => {
    if (!accessToken || !conversationId) return;

    const socket = io(`${resolveSocketUrl()}/chat`, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat.join', { conversationId });
    });

    // Sender's own message confirmation
    socket.on('message.ack', (msg: MessageItem) => {
      addMessage(conversationId, msg);
    });

    // Broadcast from other members (core-service → Kafka → gateway → room)
    socket.on('message.new', (msg: MessageItem) => {
      if (msg.senderId !== currentUserId) {
        addMessage(conversationId, msg);
      }
    });

    socket.on('typing.start', ({ userId }: { userId: string }) => {
      if (userId === currentUserId) return;
      setTypingUser(conversationId, userId);
    });

    socket.on('typing.stop', ({ userId }: { userId: string }) => {
      if (userId === currentUserId) return;
      clearTypingUser(conversationId, userId);
    });

    socket.on('message.read', ({ userId, readAt }: { userId: string; readAt: string }) => {
      setReadReceipt(conversationId, userId, readAt);
    });

    return () => {
      socket.emit('chat.leave', { conversationId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    accessToken,
    conversationId,
    currentUserId,
    addMessage,
    setTypingUser,
    clearTypingUser,
    setReadReceipt,
  ]);

  const sendMessage = useCallback(
    (content: string, replyToId?: string) => {
      socketRef.current?.emit('chat.send', {
        conversationId,
        content,
        type: 'TEXT',
        ...(replyToId ? { replyToId } : {}),
      });
    },
    [conversationId]
  );

  const startTyping = useCallback(() => {
    socketRef.current?.emit('chat.typing.start', { conversationId });
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    socketRef.current?.emit('chat.typing.stop', { conversationId });
  }, [conversationId]);

  const markRead = useCallback(() => {
    socketRef.current?.emit('chat.mark-read', { conversationId });
  }, [conversationId]);

  return { sendMessage, startTyping, stopTyping, markRead };
}
