import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ChatTopics } from 'src/shared/constants/topic.constant';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const decoded = jwt.verify(token, secret) as any;
      const userId = decoded.id || decoded.sub;

      if (!userId) {
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      this.logger.log(`Chat client connected: userId=${userId}`);
    } catch (e) {
      this.logger.error(`Chat connection error: ${e.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat.join')
  async handleJoin(client: Socket, payload: { conversationId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      await this.kafkaService.sendWithTimeout(ChatTopics.Conversation.GetById, {
        conversationId: payload.conversationId,
        userId,
      });
    } catch {
      client.emit('chat.error', { message: 'Conversation not found or not a member' });
      return;
    }

    await client.join(`conversation:${payload.conversationId}`);
    this.logger.log(`User ${userId} joined conversation:${payload.conversationId}`);
  }

  @SubscribeMessage('chat.leave')
  async handleLeave(client: Socket, payload: { conversationId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;
    await client.leave(`conversation:${payload.conversationId}`);
    this.logger.log(`User ${userId} left conversation:${payload.conversationId}`);
  }

  @SubscribeMessage('chat.send')
  async handleSend(
    client: Socket,
    payload: { conversationId: string; content: string; type?: string; replyToId?: string },
  ) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;

    if (!client.rooms.has(`conversation:${payload.conversationId}`)) {
      client.emit('chat.error', { message: 'Join the conversation first' });
      return;
    }

    try {
      const message = await this.kafkaService.sendWithTimeout(ChatTopics.Message.Send, {
        conversationId: payload.conversationId,
        senderId: userId,
        content: payload.content,
        type: payload.type,
        replyToId: payload.replyToId,
      });
      client.emit('message.ack', message);
    } catch (e) {
      client.emit('chat.error', { message: e.message ?? 'Failed to send message' });
    }
  }

  @SubscribeMessage('chat.mark-read')
  async handleMarkRead(client: Socket, payload: { conversationId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;

    try {
      await this.kafkaService.sendWithTimeout(ChatTopics.Message.MarkRead, {
        conversationId: payload.conversationId,
        userId,
      });
    } catch {}
  }

  @SubscribeMessage('chat.typing.start')
  handleTypingStart(client: Socket, payload: { conversationId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;
    client
      .to(`conversation:${payload.conversationId}`)
      .emit('typing.start', { userId, conversationId: payload.conversationId });
  }

  @SubscribeMessage('chat.typing.stop')
  handleTypingStop(client: Socket, payload: { conversationId: string }) {
    const userId = client.data?.userId;
    if (!userId || !payload?.conversationId) return;
    client
      .to(`conversation:${payload.conversationId}`)
      .emit('typing.stop', { userId, conversationId: payload.conversationId });
  }

  broadcastToRoom(conversationId: string, event: string, payload: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
