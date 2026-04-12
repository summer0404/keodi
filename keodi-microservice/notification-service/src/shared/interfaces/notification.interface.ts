import { NotificationPreferredChannel, NotificationType } from "../enums/notification.enum";

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