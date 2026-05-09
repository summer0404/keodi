import { apiClient } from './client';
import { API_ENDPOINTS } from '@/constants/api';
import type {
  AddMembersRequest,
  ConversationItem,
  CreateConversationRequest,
  CursorPage,
  MessageItem,
  SendMessageRequest,
  UpdateConversationRequest,
} from '@/types/chat';

const BASE = API_ENDPOINTS.CONVERSATIONS;

export const chatService = {
  listConversations: async (params?: {
    cursor?: string;
    limit?: number;
  }): Promise<CursorPage<ConversationItem>> => {
    const response = await apiClient.get<CursorPage<ConversationItem>>(BASE, { params });
    console.log('Fetched conversations:', response.data);
    return response.data;
  },

  getConversation: async (id: string): Promise<ConversationItem> => {
    const response = await apiClient.get<ConversationItem>(`${BASE}/${id}`);
    return response.data;
  },

  createConversation: async (data: CreateConversationRequest): Promise<ConversationItem> => {
    const response = await apiClient.post<ConversationItem>(BASE, data);
    return response.data;
  },

  updateConversation: async (
    id: string,
    data: UpdateConversationRequest,
  ): Promise<ConversationItem> => {
    const response = await apiClient.patch<ConversationItem>(`${BASE}/${id}`, data);
    return response.data;
  },

  listMessages: async (
    conversationId: string,
    params?: { cursor?: string; limit?: number },
  ): Promise<CursorPage<MessageItem>> => {
    const response = await apiClient.get<CursorPage<MessageItem>>(
      `${BASE}/${conversationId}/messages`,
      { params },
    );
    return response.data;
  },

  sendMessage: async (conversationId: string, data: SendMessageRequest): Promise<MessageItem> => {
    const response = await apiClient.post<MessageItem>(
      `${BASE}/${conversationId}/messages`,
      data,
    );
    return response.data;
  },

  deleteMessage: async (conversationId: string, msgId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${conversationId}/messages/${msgId}`);
  },

  addMembers: async (conversationId: string, data: AddMembersRequest): Promise<void> => {
    await apiClient.post(`${BASE}/${conversationId}/members`, data);
  },

  leaveConversation: async (conversationId: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${conversationId}/members/me`);
  },
};
