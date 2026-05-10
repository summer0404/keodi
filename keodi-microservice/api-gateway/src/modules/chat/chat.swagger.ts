import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AddMembersDto, CreateConversationDto, SendMessageDto, UpdateConversationDto } from 'src/shared/dtos/chat.dto';

export function ApiCreateConversation() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a direct or group conversation' }),
    ApiBody({ type: CreateConversationDto }),
    ApiOkResponse({ description: 'Conversation created or returned if already exists' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiListConversations() {
  return applyDecorators(
    ApiOperation({ summary: 'List conversations for the current user (cursor pagination)' }),
    ApiQuery({ name: 'cursor', required: false }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ description: 'Paginated conversation list with unread counts' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiGetConversation() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a single conversation by ID' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiOkResponse({ description: 'Conversation detail' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiUpdateConversation() {
  return applyDecorators(
    ApiOperation({ summary: 'Update group conversation name or avatar' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiBody({ type: UpdateConversationDto }),
    ApiOkResponse({ description: 'Updated conversation' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiListMessages() {
  return applyDecorators(
    ApiOperation({ summary: 'List messages in a conversation (cursor pagination, newest first)' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiQuery({ name: 'cursor', required: false }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiOkResponse({ description: 'Paginated message list' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiSendMessage() {
  return applyDecorators(
    ApiOperation({ summary: 'Send a message (REST fallback)' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiBody({ type: SendMessageDto }),
    ApiOkResponse({ description: 'Created message' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiDeleteMessage() {
  return applyDecorators(
    ApiOperation({ summary: 'Soft-delete a message (sender only)' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiParam({ name: 'msgId', description: 'Message ID' }),
    ApiOkResponse({ description: 'Deleted' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiAddMembers() {
  return applyDecorators(
    ApiOperation({ summary: 'Add members to a group conversation' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiBody({ type: AddMembersDto }),
    ApiOkResponse({ description: 'Members added' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiLeaveConversation() {
  return applyDecorators(
    ApiOperation({ summary: 'Leave a group conversation' }),
    ApiParam({ name: 'id', description: 'Conversation ID' }),
    ApiOkResponse({ description: 'Left conversation' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
