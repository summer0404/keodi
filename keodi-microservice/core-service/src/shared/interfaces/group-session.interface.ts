export interface ActivityActor {
  userId?: string | null;
  nickname?: string | null;
  user?: { firstName?: string | null; lastName?: string | null } | null;
}
