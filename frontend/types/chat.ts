export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';

export interface UserProfile {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
}

export interface ConversationMember {
  userId: string;
  joinedAt?: string;
  lastReadAt?: string | null;
  user: UserProfile | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  replyToId: string | null;
  replyTo?: MessageItem | null;
  isDeleted: boolean;
  createdAt: string;
  sender: UserProfile | null;
}

export interface ConversationItem {
  id: string;
  type: ConversationType;
  name: string | null;
  avatarUrl: string | null;
  sessionId: string | null;
  lastMessage: MessageItem | null;
  unreadCount: number;
  members: ConversationMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CreateConversationRequest {
  type: ConversationType;
  memberIds?: string[];
  name?: string;
  avatarUrl?: string;
  sessionId?: string;
}

export interface UpdateConversationRequest {
  name?: string;
  avatarUrl?: string;
}

export interface SendMessageRequest {
  content: string;
  type?: MessageType;
  replyToId?: string;
}

export interface AddMembersRequest {
  memberIds: string[];
}
