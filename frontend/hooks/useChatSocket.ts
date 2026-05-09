import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import type { MessageItem } from '@/types/chat';

const resolveSocketUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
};

export function useChatSocket(conversationId: string) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { addMessage, setTypingUser, clearTypingUser } = useChatStore();

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

    socket.on('message.ack', (msg: MessageItem) => {
      addMessage(conversationId, msg);
    });

    socket.on('typing.start', ({ userId }: { userId: string }) => {
      setTypingUser(conversationId, userId);
    });

    socket.on('typing.stop', ({ userId }: { userId: string }) => {
      clearTypingUser(conversationId, userId);
    });

    return () => {
      socket.emit('chat.leave', { conversationId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, conversationId, addMessage, setTypingUser, clearTypingUser]);

  const sendMessage = useCallback(
    (content: string, replyToId?: string) => {
      socketRef.current?.emit('chat.send', {
        conversationId,
        content,
        type: 'TEXT',
        ...(replyToId ? { replyToId } : {}),
      });
    },
    [conversationId],
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
