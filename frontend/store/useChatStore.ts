import type { MessageItem } from '@/types/chat';
import { create } from 'zustand';

interface ReadReceipt {
  userId: string;
  readAt: string;
}

interface ChatState {
  messages: Record<string, MessageItem[]>;
  typingUsers: Record<string, string[]>;
  readReceipts: Record<string, ReadReceipt[]>;

  addMessage: (conversationId: string, message: MessageItem) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  replaceMessage: (conversationId: string, tempId: string, message: MessageItem) => void;
  setTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUser: (conversationId: string, userId: string) => void;
  clearConversation: (conversationId: string) => void;
  setReadReceipt: (conversationId: string, userId: string, readAt: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: {},
  typingUsers: {},
  readReceipts: {},

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  replaceMessage: (conversationId, tempId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? [];
      // If the real message already exists (from WebSocket ack), just drop the temp
      if (existing.some((m) => m.id === message.id)) {
        return {
          messages: {
            ...state.messages,
            [conversationId]: existing.filter((m) => m.id !== tempId),
          },
        };
      }
      // Replace temp with real message in-place to avoid flash
      return {
        messages: {
          ...state.messages,
          [conversationId]: existing.map((m) => (m.id === tempId ? message : m)),
        },
      };
    }),

  setTypingUser: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] ?? [];
      if (current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    }),

  clearTypingUser: (conversationId, userId) =>
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: (state.typingUsers[conversationId] ?? []).filter((id) => id !== userId),
      },
    })),

  clearConversation: (conversationId) =>
    set((state) => {
      const { [conversationId]: _msgs, ...restMessages } = state.messages;
      const { [conversationId]: _typing, ...restTyping } = state.typingUsers;
      const { [conversationId]: _receipts, ...restReceipts } = state.readReceipts;
      return { messages: restMessages, typingUsers: restTyping, readReceipts: restReceipts };
    }),

  setReadReceipt: (conversationId, userId, readAt) =>
    set((state) => {
      const current = state.readReceipts[conversationId] ?? [];
      const filtered = current.filter((r) => r.userId !== userId);
      return {
        readReceipts: {
          ...state.readReceipts,
          [conversationId]: [...filtered, { userId, readAt }],
        },
      };
    }),
}));
