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
import { RedisService } from 'src/providers/redis/redis.service';
import {
  GroupSessionTopics,
  SettingTopics,
} from 'src/shared/constants/topic.constant';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`No token provided, disconnecting...`);
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
      await client.join('user:' + userId);

      await this.redisService.set(`presence:${userId}`, 'online');

      this.logger.log(`Client ${client.id} connected auth with User ${userId}`);
    } catch (e) {
      this.logger.error(`Connection error: ${e.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      for (const room of client.rooms) {
        if (room.startsWith('session:')) {
          const sessionId = room.replace('session:', '');
          await this.redisService.del(
            `session:${sessionId}:location:${userId}`,
          );
          this.server.to(room).emit('location.offline', { userId });
        }
      }

      const rooms = await this.server.in('user:' + userId).fetchSockets();
      if (rooms.length === 0) {
        await this.redisService.del(`presence:${userId}`);
      }
    }
    this.logger.log(`Client ${client.id} disconnected.`);
  }

  pushToUser(userId: string, event: any) {
    this.server.to('user:' + userId).emit('notification.received', event);
  }

  @SubscribeMessage('session.join')
  async handleSessionJoin(client: Socket, payload: { sessionId: string }) {
    this.logger.log(
      `session.join received — userId=${client.data?.userId}, payload=${JSON.stringify(payload)}`,
    );
    const userId = client.data.userId;
    if (!userId || !payload?.sessionId) return;

    // Validate membership before joining the room
    try {
      const session = await this.kafkaService.sendWithTimeout(GroupSessionTopics.GetSession, {
        sessionId: payload.sessionId,
      });

      const isMember = session?.members?.some((m: any) => m.userId === userId);
      if (!isMember) {
        client.emit('session.error', {
          message: 'Not a member of this session',
        });
        return;
      }
    } catch {
      client.emit('session.error', { message: 'Session not found' });
      return;
    }

    await client.join(`session:${payload.sessionId}`);
    this.logger.log(`User ${userId} joined session room ${payload.sessionId}`);

    // Send existing member locations to the joining client
    const keys = await this.redisService.keys(
      `session:${payload.sessionId}:location:*`,
    );
    const locations: {
      userId: string;
      latitude: number;
      longitude: number;
      timestamp: number;
    }[] = [];
    for (const key of keys) {
      const memberId = key.split(':').pop();
      if (memberId === userId) continue;
      const raw = await this.redisService.get(key);
      if (raw) {
        locations.push({ userId: memberId, ...JSON.parse(raw) });
      }
    }

    if (locations.length > 0) {
      client.emit('location.snapshot', {
        sessionId: payload.sessionId,
        locations,
      });
    }
  }

  @SubscribeMessage('session.leave')
  async handleSessionLeave(client: Socket, payload: { sessionId: string }) {
    const userId = client.data.userId;
    if (!userId || !payload?.sessionId) return;

    await client.leave(`session:${payload.sessionId}`);
    this.logger.log(`User ${userId} left session room ${payload.sessionId}`);
  }

  @SubscribeMessage('location.update')
  async handleLocationUpdate(
    client: Socket,
    payload: { sessionId: string; latitude: number; longitude: number },
  ) {
    const userId = client.data.userId;
    if (!userId || !payload?.sessionId) return;

    try {
      const settings = await this.kafkaService.sendWithTimeout(SettingTopics.Get, { userId }, 3000);
      if (!settings?.shareLocation) return;
    } catch {
      // fail-open: if settings can't be fetched, allow location sharing
    }

    await this.redisService.setEx(
      `session:${payload.sessionId}:location:${userId}`,
      JSON.stringify({
        latitude: payload.latitude,
        longitude: payload.longitude,
        timestamp: Date.now(),
      }),
      30,
    );

    client.to(`session:${payload.sessionId}`).emit('location.updated', {
      userId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      timestamp: Date.now(),
    });
  }
}
