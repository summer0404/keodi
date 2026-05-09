import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { GetInboxPayload, MarkAsReadPayload, PersistInboxEvent, UserIdPayload } from 'src/shared/interfaces/notification.interface';

@Injectable()
export class NotificationInboxService {
  constructor(private readonly prismaService: PrismaService) {}

  async upsertByEventId(payload: PersistInboxEvent) {
    return await this.prismaService.notification.upsert({
      where: { eventId: payload.eventId },
      create: {
        eventId: payload.eventId,
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? Prisma.JsonNull,
        deepLink: payload.deepLink,
        channel: payload.channel,
        status: payload.status,
        deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : null,
      } as Prisma.NotificationUncheckedCreateInput,
      update: {
        status: payload.status,
        channel: payload.channel,
        deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : null,
      },
    });
  }

  async getByUserId(payload: GetInboxPayload) {
    const { userId, page, limit, unreadOnly } = payload;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] =
      await this.prismaService.$transaction([
        this.prismaService.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            data: true,
            deepLink: true,
            channel: true,
            status: true,
            isRead: true,
            deliveredAt: true,
            readAt: true,
            createdAt: true,
          },
        }),
        this.prismaService.notification.count({ where }),
        this.prismaService.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(payload: MarkAsReadPayload) {
    const now = new Date();
    return await this.prismaService.notification.updateMany({
      where: { id: payload.notificationId, userId: payload.userId },
      data: { isRead: true, readAt: now },
    });
  }

  async markAllAsRead(payload: UserIdPayload) {
    const now = new Date();
    return await this.prismaService.notification.updateMany({
      where: { userId: payload.userId, isRead: false },
      data: { isRead: true, readAt: now },
    });
  }

  async getUnreadCount(payload: UserIdPayload) {
    const count = await this.prismaService.notification.count({
      where: { userId: payload.userId, isRead: false },
    });
    return { count };
  }
}
