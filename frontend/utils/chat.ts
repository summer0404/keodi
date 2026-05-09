import type { AvatarData } from '@/components/ui/chat/AvatarGroup';
import type { ChatItemData } from '@/components/ui/chat/ChatListItem';
import type { ConversationItem, MessageItem } from '@/types/chat';

const AVATAR_COLORS = [
  '#EAEAEA',
  '#FFD7C2',
  '#D7F5DC',
  '#C8EAE0',
  '#E8D5F5',
  '#D5E8F5',
  '#F5D5E8',
  '#F5ECD5',
];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return '?';
}

export function getSenderDisplayName(sender?: MessageItem['sender']): string {
  if (!sender) return 'Unknown';
  if (sender.firstName && sender.lastName) return `${sender.firstName} ${sender.lastName}`;
  if (sender.firstName) return sender.firstName;
  return sender.username ?? 'Unknown';
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút`;
  if (diffHours < 24) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  if (diffDays === 1) return 'Hôm qua';

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  if (diffDays < 7) return dayNames[date.getDay()];

  return `${date.getDate()}/${date.getMonth() + 1}`;
}

export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function getDateLabel(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86400000,
  );

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function conversationToListItem(
  conv: ConversationItem,
  currentUserId: string,
): ChatItemData {
  const isGroup = conv.type === 'GROUP';
  const otherMembers = conv.members.filter((m) => m.userId !== currentUserId);
  const displayMembers = isGroup ? conv.members.slice(0, 4) : otherMembers.slice(0, 1);

  const avatars: AvatarData[] = displayMembers.map((m) => ({
    initial: getInitials(m.user?.firstName, m.user?.lastName, m.user?.username),
    color: getAvatarColor(m.userId),
  }));

  if (avatars.length === 0) {
    avatars.push({ initial: '?', color: '#EAEAEA' });
  }

  let displayName = conv.name ?? '';
  if (!displayName) {
    const nameSource = isGroup ? conv.members : otherMembers;
    displayName = nameSource
      .map((m) => m.user?.firstName ?? m.user?.username ?? 'User')
      .join(', ');
  }

  let lastMsgText = '';
  if (conv.lastMessage) {
    const isMyMsg = conv.lastMessage.senderId === currentUserId;
    const senderPrefix =
      isGroup && !isMyMsg && conv.lastMessage.sender
        ? `${conv.lastMessage.sender.firstName ?? conv.lastMessage.sender.username}: `
        : isMyMsg
          ? 'Bạn: '
          : '';
    lastMsgText = `${senderPrefix}${conv.lastMessage.content}`;
  }

  return {
    id: conv.id,
    avatarType: isGroup ? 'group' : 'single',
    avatars,
    hasSessionIcon: !!conv.sessionId,
    name: displayName || 'Cuộc trò chuyện',
    lastMessage: lastMsgText,
    time: conv.updatedAt ? formatRelativeTime(conv.updatedAt) : '',
    unreadCount: conv.unreadCount > 0 ? conv.unreadCount : undefined,
  };
}
