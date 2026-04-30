import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PaginationConstants } from '../constants/pagination.constants';

export class GetNotificationInboxQueryDto {
  @ApiProperty({ description: 'Page number', example: 1, default: PaginationConstants.DEFAULT_PAGE, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  page: number = PaginationConstants.DEFAULT_PAGE;

  @ApiProperty({ description: 'Items per page', example: 20, default: 20, required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiProperty({ description: 'Return only unread notifications', example: false, required: false })
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

  @ApiProperty({ required: false, nullable: true, example: 'keodi://friends/requests' })
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
