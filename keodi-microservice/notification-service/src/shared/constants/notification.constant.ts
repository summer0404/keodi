import { NotificationType } from "../enums/notification.enum";

export const NOTIFICATION_SETTING_MAP: Partial<Record<NotificationType, string>> = {
  [NotificationType.GROUP_INVITE]: 'notifyGroupInvites',
  [NotificationType.GROUP_VOTE_FINALIZED]: 'notifyVotingResults',
  [NotificationType.GROUP_VOTE_REMINDER]: 'notifyVotingResults',
  [NotificationType.NEARBY_PLACE]: 'notifyNearbyPlaces',
  [NotificationType.RECOMMENDATION]: 'notifyRecommendations',
};