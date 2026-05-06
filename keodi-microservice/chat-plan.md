# Chat & Group Chat — Implementation Plan

## 1. Database

**Tiếp tục PostgreSQL, không cần MySQL hay MongoDB.**

- Prisma + PostgreSQL đang chạy ổn định trên toàn bộ các service
- `pgvector` đã có → có thể dùng cho semantic search message sau này
- PostgreSQL xử lý được chat ở quy mô vừa với index đúng cách
- Redis (đã có) dùng thêm cho: recent messages, unread counts, typing indicator

> Cassandra/MongoDB chỉ cần xét khi quy mô đến hàng trăm triệu message/ngày.

---

## 2. Service mới: `chat-service`

Tạo service riêng, không nhét vào `core-service`. Chat có write throughput cao hơn hẳn các domain khác, cần scale độc lập.

```
keodi-microservice/
├── api-gateway/
├── auth-service/
├── core-service/
├── notification-service/
├── intelligence-service/
└── chat-service/                  ← NEW (NestJS + Kafka + Prisma, port 3005)
    └── src/
        ├── modules/
        │   ├── conversation/      # tạo/quản lý conversation
        │   ├── message/           # gửi/nhận/xóa message
        │   └── member/            # quản lý thành viên group
        ├── database/
        │   └── prisma/
        │       └── schema.prisma
        └── shared/
            └── constants/
                └── topic.constant.ts
```

---

## 3. Prisma Schema (`chat-service`)

```prisma
enum ConversationType { DIRECT  GROUP }
enum MemberRole       { OWNER  ADMIN  MEMBER }
enum MessageType      { TEXT  IMAGE  FILE  SYSTEM }

model Conversation {
  id            String           @id @default(uuid())
  type          ConversationType
  name          String?          // chỉ dùng cho GROUP
  avatarUrl     String?
  createdById   String
  lastMessageId String?          @unique
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  members       ConversationMember[]
  messages      Message[]
  lastMessage   Message?         @relation("LastMessage", fields: [lastMessageId], references: [id])
}

model ConversationMember {
  id             String       @id @default(uuid())
  conversationId String
  userId         String
  role           MemberRole   @default(MEMBER)
  joinedAt       DateTime     @default(now())
  lastReadAt     DateTime?    // để tính unread count

  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@unique([conversationId, userId])
  @@index([userId])            // list conversations của 1 user
}

model Message {
  id             String      @id @default(uuid())
  conversationId String
  senderId       String
  content        String
  type           MessageType @default(TEXT)
  replyToId      String?     // reply-to
  deletedAt      DateTime?   // soft delete

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  conversation   Conversation @relation(fields: [conversationId], references: [id])
  replyTo        Message?     @relation("ReplyTo", fields: [replyToId], references: [id])
  replies        Message[]    @relation("ReplyTo")

  @@index([conversationId, createdAt(sort: Desc)])  // cursor pagination
  @@index([senderId])
}
```

---

## 4. Kafka Topics

Thêm vào `topic.constant.ts` ở cả `api-gateway` và `chat-service`:

```typescript
export const ChatTopics = {
  Conversation: {
    Create:  'chat.conversation.create',
    GetById: 'chat.conversation.get-by-id',
    List:    'chat.conversation.list',
    Update:  'chat.conversation.update',
  },
  Message: {
    Send:     'chat.message.send',
    List:     'chat.message.list',
    Delete:   'chat.message.delete',
    MarkRead: 'chat.message.mark-read',
  },
  Member: {
    Add:    'chat.member.add',
    Remove: 'chat.member.remove',
    Leave:  'chat.member.leave',
  },
  RealtimePush: 'chat.realtime.push',   // internal: chat-service → ChatGateway
} as const;
```

---

## 5. WebSocket Gateway mới: `ChatGateway`

Tách riêng khỏi `NotificationGateway` (namespace `/chat`), đặt trong `api-gateway`:

```
api-gateway/src/modules/chat/
├── chat.module.ts
├── chat.controller.ts   # Kafka consumer: nhận chat.realtime.push
├── chat.service.ts      # REST endpoints qua Kafka
├── chat.gateway.ts      # Socket.io gateway, namespace /chat
└── chat.swagger.ts
```

### WebSocket Events

| Client → Server   | Server → Client | Mô tả                              |
|-------------------|-----------------|------------------------------------|
| `chat.join`       | —               | Join room `conversation:{id}`      |
| `chat.leave`      | —               | Leave room                         |
| `chat.send`       | `message.new`   | Gửi tin nhắn, broadcast cho room   |
| `chat.mark-read`  | `message.read`  | Đánh dấu đã đọc                    |
| `chat.typing.start` | `typing.start` | Bắt đầu gõ phím                  |
| `chat.typing.stop`  | `typing.stop`  | Dừng gõ                           |

---

## 6. Luồng gửi tin nhắn (Message Flow)

```
Client
  │── WebSocket: chat.send ───────────────────────────────────────┐
  │                                                               ▼
  │                                                   ChatGateway (api-gateway)
  │                                                               │
  │                                         validate membership (Redis cache)
  │                                                               │
  │                                          Kafka: chat.message.send
  │                                                               ▼
  │                                                      chat-service
  │                                                               │
  │                                               persist Message to DB
  │                                               update lastMessageId
  │                                                               │
  │                                    ┌──────────────────────────┤
  │                                    │                          │
  │                       Kafka: chat.realtime.push    Kafka: notification.dispatch
  │                                    │                (members OFFLINE → FCM)
  │                                    ▼                          ▼
  │                           ChatGateway               notification-service
  │                                    │                          │ (FCM push)
  │◄── WebSocket: message.new ─────────┘                         ▼
  │  (members đang online)                                Mobile notification
```

---

## 7. REST Endpoints

```
POST   /api/v1/conversations                       # tạo direct hoặc group
GET    /api/v1/conversations                       # list + unread count
GET    /api/v1/conversations/:id/messages          # messages (cursor pagination)
PATCH  /api/v1/conversations/:id                   # đổi tên/avatar group
POST   /api/v1/conversations/:id/members           # thêm thành viên
DELETE /api/v1/conversations/:id/members/:userId   # kick thành viên
DELETE /api/v1/conversations/:id/members/me        # tự rời group
DELETE /api/v1/conversations/:id/messages/:msgId   # xóa message (soft delete)
```

---

## 8. Redis Caching Strategy

| Key pattern                   | TTL      | Nội dung                                          |
|-------------------------------|----------|---------------------------------------------------|
| `chat:conv:{id}:members`      | 10 phút  | Member list để validate membership nhanh          |
| `chat:conv:{id}:recent`       | 1 giờ    | 50 message gần nhất, tránh query DB               |
| `chat:user:{id}:unread`       | 5 phút   | Map `{ conversationId → unreadCount }`            |
| `chat:conv:{id}:typing`       | 5 giây   | Set userId đang typing (auto-expire)              |

---

## 9. Socket.io Multi-instance (Production)

Khi scale `api-gateway` lên nhiều pod, cần **Redis Adapter** cho Socket.io để các instance chia sẻ room với nhau:

```typescript
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis(redisConfig);
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

> Nên làm ngay từ đầu cho `ChatGateway`, và backport vào `NotificationGateway` luôn.

---

## 10. Thứ tự triển khai

| Phase | Việc cần làm                                                                 |
|-------|------------------------------------------------------------------------------|
| 1     | Tạo `chat-service`: Prisma schema, module conversation + message + member, Kafka consumers |
| 2     | Thêm `ChatTopics` vào api-gateway, REST endpoints qua Kafka                  |
| 3     | `ChatGateway` trong api-gateway: join/leave room, `chat.realtime.push` consumer |
| 4     | WebSocket events: `chat.send` → persist → broadcast `message.new`            |
| 5     | Typing indicator, mark-read, unread count qua Redis                          |
| 6     | Tích hợp `notification-service`: FCM push khi user offline                   |
| 7     | Redis Adapter cho Socket.io multi-instance                                   |
| 8     | Rate limiting (message send), spam protection                                |

---

## 11. Tóm tắt kiến trúc

```
Client
 ├── REST ──────────────────► api-gateway ──(Kafka)──► chat-service ──► PostgreSQL
 └── WebSocket (/chat) ──────► ChatGateway
                                   │  (Kafka: chat.realtime.push)
                                   ◄──────────────────── chat-service
                                   │  (Kafka: notification.dispatch)
                                   └──────────────────── notification-service ──► FCM
```

- **Database**: PostgreSQL (giữ nguyên) + Redis (cache + typing + presence)
- **1 service mới**: `chat-service` (NestJS + Kafka + Prisma, port 3005)
- **1 gateway mới**: `ChatGateway` trong `api-gateway` (namespace `/chat`)
- **Redis Adapter**: bắt buộc khi deploy nhiều instance `api-gateway`
