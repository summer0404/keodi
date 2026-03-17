import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import Redis from 'ioredis';
import * as jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/providers/redis/redis.service';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
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
      // Check if user has other active sockets before marking offline
      const rooms = await this.server.in('user:' + userId).fetchSockets();
      if (rooms.length === 0) {
        await this.redisService.del(`presence:${userId}`);
      }
    }
    this.logger.log(`Client ${client.id} disconnected.`);
  }

  async pushToUser(userId: string, event: any) {
    this.server.to('user:' + userId).emit('notification.received', event);
  }
}
