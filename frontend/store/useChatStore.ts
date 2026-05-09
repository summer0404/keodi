import { create } from 'zustand';
import type { MessageItem } from '@/types/chat';

interface ChatState {
  messages: Record<string, MessageItem[]>;
  typingUsers: Record<string, string[]>;

  addMessage: (conversationId: string, message: MessageItem) => void;
  setTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUser: (conversationId: string, userId: string) => void;
  clearConversation: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: {},
  typingUsers: {},

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
        [conversationId]: (state.typingUsers[conversationId] ?? []).filter(
          (id) => id !== userId,
        ),
      },
    })),

  clearConversation: (conversationId) =>
    set((state) => {
      const { [conversationId]: _msgs, ...restMessages } = state.messages;
      const { [conversationId]: _typing, ...restTyping } = state.typingUsers;
      return { messages: restMessages, typingUsers: restTyping };
    }),
}));
