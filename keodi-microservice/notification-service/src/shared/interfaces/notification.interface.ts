import { NotificationPreferredChannel, NotificationStatus, NotificationType } from "../enums/notification.enum";

export interface DispatchNotificationEvent {
  eventId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, unknown>;
  preferredChannel: NotificationPreferredChannel;
  createdAt: string;
}

export interface PersistInboxEvent {
  eventId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  deepLink?: string | null;
  data?: Record<string, unknown> | null;
  channel: NotificationPreferredChannel;
  status: NotificationStatus;
  deliveredAt?: string | null;
  createdAt?: string;
}

export interface GetInboxPayload {
  userId: string;
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export interface MarkAsReadPayload {
  userId: string;
  notificationId: string;
}

export interface UserIdPayload {
  userId: string;
}