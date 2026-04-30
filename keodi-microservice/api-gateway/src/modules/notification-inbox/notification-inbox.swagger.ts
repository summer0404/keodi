import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  NotificationInboxResponseDto,
  UnreadCountResponseDto,
} from 'src/shared/dtos/notification-inbox.dto';

export function ApiGetNotificationInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get notification inbox',
      description:
        'Returns paginated list of all persisted notifications for the current user, newest first. Includes GROUP_INVITE, GROUP_VOTE_FINALIZED, FRIEND_REQUEST, FRIEND_ACCEPTED, SYSTEM, and other actionable notifications. Ephemeral group-session real-time events (location, live votes) are not included.',
    }),
    ApiOkResponse({ type: NotificationInboxResponseDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiGetUnreadCount() {
  return applyDecorators(
    ApiOperation({ summary: 'Get unread notification count' }),
    ApiOkResponse({ type: UnreadCountResponseDto }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiMarkNotificationAsRead() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark a notification as read' }),
    ApiParam({ name: 'id', description: 'Notification ID' }),
    ApiOkResponse({ description: 'Notification marked as read' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}

export function ApiMarkAllNotificationsAsRead() {
  return applyDecorators(
    ApiOperation({ summary: 'Mark all notifications as read' }),
    ApiOkResponse({ description: 'All notifications marked as read' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  );
}
