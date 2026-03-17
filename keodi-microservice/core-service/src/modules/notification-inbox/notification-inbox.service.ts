import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class NotificationInboxService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByEventId(payload: any) {
    return this.prisma.notification.upsert({
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
        deliveredAt: payload.deliveredAt
          ? new Date(payload.deliveredAt)
          : null,
      } as Prisma.NotificationUncheckedCreateInput,
      update: {
        status: payload.status,
        channel: payload.channel,
        deliveredAt: payload.deliveredAt
          ? new Date(payload.deliveredAt)
          : null,
      },
    });
  }
}
