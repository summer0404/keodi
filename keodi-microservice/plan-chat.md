# Chat & Group Chat — Implementation Plan (Revised)

## Quyết định kiến trúc

**Tích hợp vào `notification-service` thay vì tạo service mới.**

Lý do:
- notification-service đã có PostgreSQL + Redis + Kafka + FCM + WebSocket infra
- DB hiện tại ít dữ liệu, schema mở rộng được an toàn
- Tránh overhead quản lý thêm 1 service (port, Docker container, Kafka consumer group)
- Chat cần FCM push khi offline → tái dùng được `NotificationDispatcherService` luôn
- Redis presence tracking đã có → tích hợp typing indicator + unread count không tốn code mới

**Group chat linked to Session** — conversation nhóm có thể gắn với `sessionId` (session đang có trong
`NotificationGateway`), cho phép các thành viên group tự động thành thành viên chat.

---

## 1. Prisma Schema (thêm vào `notification-service/src/database/prisma/schema.prisma`)

```prisma
enum ConversationType { DIRECT  GROUP }
enum MessageType      { TEXT  IMAGE  FILE  SYSTEM }

model Conversation {
  id            String           @id @default(cuid())
  type          ConversationType
  name          String?          // chỉ dùng cho GROUP
  avatarUrl     String?
  createdById   String
  sessionId     String?          // nếu group gắn với session hiện có
  lastMessageId String?          @unique
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  members       ConversationMember[]
  messages      Message[]
  lastMessage   Message?         @relation("ConvLastMessage", fields: [lastMessageId], references: [id])

  @@index([sessionId])           // look up conversation by sessionId
}

model ConversationMember {
  id             String       @id @default(cuid())
  conversationId String
  userId         String
  joinedAt       DateTime     @default(now())
  lastReadAt     DateTime?

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@unique([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String      @id @default(cuid())
  conversationId String
  senderId       String
  content        String
  type           MessageType @default(TEXT)
  replyToId      String?
  deletedAt      DateTime?   // soft delete

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  replyTo        Message?     @relation("MessageReplyTo", fields: [replyToId], references: [id])
  replies        Message[]    @relation("MessageReplyTo")

  @@index([conversationId, createdAt(sort: Desc)])  // cursor pagination
  @@index([senderId])
}
```

> Dùng `cuid()` cho nhất quán với models hiện có (User, Notification, UserDeviceToken đều dùng cuid).

---

## 2. Kafka Topics

### `notification-service/src/shared/constants/topic.contant.ts` — thêm vào:

```typescript
export const ChatTopics = {
  Conversation: {
    Create:  'chat.conversation.create',   // MessagePattern (RPC)
    GetById: 'chat.conversation.get-by-id',
    List:    'chat.conversation.list',
    Update:  'chat.conversation.update',
  },
  Message: {
    Send:     'chat.message.send',         // MessagePattern (RPC)
    List:     'chat.message.list',
    Delete:   'chat.message.delete',
    MarkRead: 'chat.message.mark-read',
  },
  Member: {
    Add:    'chat.member.add',
    Remove: 'chat.member.remove',
    Leave:  'chat.member.leave',
  },
  RealtimePush: 'chat.realtime.push',     // EventPattern: notification-service → ChatGateway
} as const;
```

Sao chép y chang vào `api-gateway/src/shared/constants/topic.constant.ts`.

---

## 3. Cấu trúc module mới trong `notification-service`

```
notification-service/src/
├── modules/
│   ├── notification/          (existing)
│   ├── notification-inbox/    (existing)
│   ├── device-token/          (existing)
│   ├── conversation/          ← NEW
│   │   ├── conversation.controller.ts    # Kafka MessagePattern handlers
│   │   ├── conversation.service.ts       # Prisma CRUD + Redis member cache
│   │   ├── conversation.module.ts
│   │   └── __test__/
│   │       └── conversation.service.spec.ts
│   ├── message/               ← NEW
│   │   ├── message.controller.ts         # Kafka MessagePattern handlers
│   │   ├── message.service.ts            # Persist + emit realtime push
│   │   ├── message.module.ts
│   │   └── __test__/
│   │       └── message.service.spec.ts
│   └── member/                ← NEW
│       ├── member.controller.ts
│       ├── member.service.ts
│       ├── member.module.ts
│       └── __test__/
│           └── member.service.spec.ts
├── shared/
│   ├── enums/
│   │   ├── notification.enum.ts  (existing)
│   │   └── chat.enum.ts          ← NEW (ConversationType, MemberRole, MessageType)
│   └── constants/
│       └── redis.constant.ts     # Thêm RedisKeys chat vào file hiện có
```

---

## 4. Redis Keys (thêm vào `redis.constant.ts` hiện có)

```typescript
// Thêm vào RedisKeys object hiện có:
CHAT_MEMBERS: (convId: string) => `chat:conv:${convId}:members`,   // TTL 10 phút
CHAT_RECENT:  (convId: string) => `chat:conv:${convId}:recent`,    // TTL 1 giờ
CHAT_UNREAD:  (userId: string) => `chat:user:${userId}:unread`,    // TTL 5 phút
CHAT_TYPING:  (convId: string) => `chat:conv:${convId}:typing`,    // TTL 5 giây (auto-expire)
```

---

## 5. ChatGateway trong `api-gateway`

Tách riêng namespace `/chat`, **không** gộp vào `NotificationGateway` để giữ concern separation.

```
api-gateway/src/modules/chat/
├── chat.module.ts
├── chat.controller.ts    # EventPattern: nhận chat.realtime.push → broadcast
├── chat.service.ts       # Các REST endpoints qua Kafka (MessagePattern)
├── chat.gateway.ts       # WebSocketGateway namespace /chat
└── chat.swagger.ts
```

### `chat.gateway.ts` — tái dùng hoàn toàn pattern của `NotificationGateway`:

```typescript
@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway {
  // Tái dụng: JWT auth từ handshake (y chang NotificationGateway)
  // Tái dụng: Redis presence check
  // Rooms: conversation:{conversationId}

  // Client → Server events:
  // chat.join      → join room conversation:{id}, validate membership
  // chat.leave     → leave room
  // chat.send      → gửi tin nhắn qua Kafka (chat.message.send)
  // chat.mark-read → qua Kafka (chat.message.mark-read)
  // chat.typing.start / chat.typing.stop → Redis SADD/SREM + broadcast

  // Server → Client events:
  // message.new     → tin nhắn mới broadcast cho room
  // message.deleted → tin nhắn bị xóa
  // message.read    → đánh dấu đã đọc
  // typing.start / typing.stop
}
```

---

## 6. Message Flow chi tiết

### 6a. Gửi tin nhắn qua WebSocket

```
Client
  │── WS: chat.send { conversationId, content, type, replyToId? }
  ▼
ChatGateway (api-gateway)
  │── validate membership: Redis CHAT_MEMBERS cache → nếu miss thì Kafka RPC
  │── emit Kafka: chat.message.send { senderId, conversationId, content, ... }
  ▼
message.service.ts (notification-service)
  │── Prisma: INSERT Message
  │── Prisma: UPDATE Conversation.lastMessageId
  │── invalidate Redis CHAT_RECENT cache
  │── emit Kafka EventPattern: chat.realtime.push { conversationId, event: 'message.new', payload }
  │── fetch member list (Redis hoặc DB)
  │── foreach OFFLINE member: emit NotificationTopics.Dispatch → FCM push
  ▼
chat.controller.ts (api-gateway) nhận chat.realtime.push
  │── ChatGateway.broadcastToRoom(conversationId, 'message.new', payload)
  ▼
Client(s) nhận message.new
```

### 6b. Gửi tin nhắn qua REST (fallback/mobile background)

```
Client
  │── POST /api/v1/conversations/:id/messages
  ▼
chat.service.ts (api-gateway)
  │── Kafka RPC: chat.message.send
  ▼
(giống 6a từ message.service.ts trở xuống)
```

---

## 7. REST Endpoints (api-gateway)

```
POST   /api/v1/conversations                          # Tạo direct hoặc group
GET    /api/v1/conversations                          # List + unread count
GET    /api/v1/conversations/:id                      # Chi tiết conversation
PATCH  /api/v1/conversations/:id                      # Đổi tên/avatar (GROUP only)

GET    /api/v1/conversations/:id/messages             # Lấy messages (cursor pagination)
POST   /api/v1/conversations/:id/messages             # Gửi message (REST fallback)
DELETE /api/v1/conversations/:id/messages/:msgId      # Soft delete message

POST   /api/v1/conversations/:id/members              # Thêm thành viên (OWNER/ADMIN)
DELETE /api/v1/conversations/:id/members/:userId      # Kick thành viên (OWNER/ADMIN)
DELETE /api/v1/conversations/:id/members/me           # Tự rời group
```

---

## 8. Group Chat gắn với Session

Khi một group/session đã có (sessionId tồn tại trong hệ thống):

```typescript
// Tạo group conversation gắn với session:
POST /api/v1/conversations
{
  "type": "GROUP",
  "sessionId": "session-uuid",  // optional
  "name": "Trip to Đà Lạt",
  "memberIds": ["userId1", "userId2"]
}
```

- `conversation-service` kiểm tra nếu đã có Conversation với sessionId → trả về existing (idempotent)
- Client socket tham gia cả `session:{sessionId}` (location) lẫn `conversation:{convId}` (chat)
- `NotificationGateway` vẫn quản lý `session:{sessionId}` room, `ChatGateway` quản lý `conversation:{convId}` room

---

## 9. Thứ tự triển khai

| Phase | Việc cần làm                                                                                     | Ưu tiên |
|-------|--------------------------------------------------------------------------------------------------|---------|
| 1     | Thêm Prisma models (Conversation, ConversationMember, Message) + migration                       | P0      |
| 2     | Thêm ChatTopics vào cả notification-service và api-gateway                                       | P0      |
| 3     | `conversation` module trong notification-service: tạo, list, get, update + Redis member cache    | P0      |
| 4     | `message` module: send, list (cursor), delete + emit chat.realtime.push                          | P0      |
| 5     | `member` module: add, remove, leave                                                              | P0      |
| 6     | `ChatGateway` + `chat.controller.ts` trong api-gateway: join/leave/realtime push                 | P0      |
| 7     | REST endpoints trong api-gateway + Swagger                                                       | P1      |
| 8     | WebSocket events: chat.send, chat.mark-read, typing indicator qua Redis                          | P1      |
| 9     | FCM push cho offline members (tái dùng NotificationDispatcherService)                            | P1      |
| 10    | Unread count (Redis CHAT_UNREAD, update on send + mark-read)                                     | P2      |
| 11    | Redis Adapter cho Socket.io (cần khi scale api-gateway nhiều pod)                                | P2      |
| 12    | Rate limiting (message send): NestJS ThrottlerModule                                             | P2      |

---

## 10. Unit Test coverage

Mỗi service mới cần spec file trong `__test__/`:

| File                                   | Cần test                                                    |
|----------------------------------------|-------------------------------------------------------------|
| `conversation.service.spec.ts`         | createDirect (idempotent), createGroup, list, update        |
| `message.service.spec.ts`              | send (persist + emit realtime), list cursor, softDelete     |
| `member.service.spec.ts`               | add, remove (role check), leave                             |
| `chat.service.spec.ts` (api-gateway)   | Kafka RPC delegation, error propagation                     |

---

## 11. Tóm tắt kiến trúc cuối

```
Client
 ├── REST ──────────────► api-gateway ──(Kafka RPC)──────────► notification-service ──► PostgreSQL
 │                            │                                        │
 └── WS /chat ──────────► ChatGateway                         MessageService
                               │  EventPattern                         │
                               │  chat.realtime.push ◄────────────────┘
                               │
                               └── broadcastToRoom(conversationId)
                                        │
                               (offline members)
                                        │
                               NotificationTopics.Dispatch
                                        │
                               NotificationDispatcherService ──► FCM
```

**Thay đổi so với plan cũ:**
- Không có `chat-service` mới — toàn bộ logic trong `notification-service`
- Reuse: `PrismaService`, `RedisService`, `KafkaService`, `NotificationDispatcherService` (FCM)
- 3 module mới: `conversation`, `message`, `member` trong notification-service
- 1 module mới: `chat` (gateway + controller + service) trong api-gateway
- Schema mở rộng thêm 3 model, không break existing models
