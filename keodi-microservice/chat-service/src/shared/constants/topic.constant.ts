export const ChatTopics = {
  Conversation: {
    Create: 'chat.conversation.create',
    GetById: 'chat.conversation.get-by-id',
    List: 'chat.conversation.list',
    Update: 'chat.conversation.update',
  },
  Message: {
    Send: 'chat.message.send',
    List: 'chat.message.list',
    Delete: 'chat.message.delete',
    MarkRead: 'chat.message.mark-read',
  },
  Member: {
    Add: 'chat.member.add',
    Leave: 'chat.member.leave',
  },
  RealtimePush: 'chat.realtime.push',
} as const;

export const NotificationTopics = {
  Dispatch: 'notification.dispatch',
} as const;
