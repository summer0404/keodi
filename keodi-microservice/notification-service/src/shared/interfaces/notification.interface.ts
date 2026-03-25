import { NotificationPreferredChannel, NotificationType } from "../constants/notification.constant";

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