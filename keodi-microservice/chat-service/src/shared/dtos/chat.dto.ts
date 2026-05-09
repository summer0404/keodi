import { ConversationType, MessageType } from 'src/shared/enums/chat.enum';

export class CreateConversationPayloadDto {
  type: ConversationType;
  createdById: string;
  memberIds: string[];
  name?: string;
  avatarUrl?: string;
  sessionId?: string;
}

export class GetConversationByIdPayloadDto {
  conversationId: string;
  userId: string;
}

export class ListConversationsPayloadDto {
  userId: string;
  cursor?: string;
  limit?: number;
}

export class UpdateConversationPayloadDto {
  conversationId: string;
  userId: string;
  name?: string;
  avatarUrl?: string;
}

export class SendMessagePayloadDto {
  conversationId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  replyToId?: string;
}

export class ListMessagesPayloadDto {
  conversationId: string;
  userId: string;
  cursor?: string;
  limit?: number;
}

export class DeleteMessagePayloadDto {
  messageId: string;
  userId: string;
}

export class MarkReadPayloadDto {
  conversationId: string;
  userId: string;
}

export class AddMembersPayloadDto {
  conversationId: string;
  requesterId: string;
  memberIds: string[];
}

export class LeaveConversationPayloadDto {
  conversationId: string;
  userId: string;
}
