import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';

export class GetNotificationInboxQueryDto extends OmitType(PaginationQueryDto, [
  'sortOrder',
] as const) {
  @ApiProperty({
    description: 'Return only unread notifications',
    example: false,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;
}

export class NotificationItemDto {
  @ApiProperty({ example: 'cm5g8h9j0k1l2m3n4o5p' })
  id: string;

  @ApiProperty({ example: 'FRIEND_REQUEST' })
  type: string;

  @ApiProperty({ example: 'New Friend Request' })
  title: string;

  @ApiProperty({ example: 'John wants to be your friend' })
  body: string;

  @ApiProperty({ required: false, nullable: true })
  data: Record<string, unknown> | null;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'keodi://friends/requests',
  })
  deepLink: string | null;

  @ApiProperty({ example: 'FCM' })
  channel: string;

  @ApiProperty({ example: 'SENT' })
  status: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ required: false, nullable: true })
  deliveredAt: Date | null;

  @ApiProperty({ required: false, nullable: true })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationInboxResponseDto {
  @ApiProperty({ type: [NotificationItemDto] })
  notifications: NotificationItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: 5 })
  unreadCount: number;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 5 })
  count: number;
}
