import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';

export class SendFriendRequestDto {
  @ApiProperty({
    description: 'ID of the user to send friend request to',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  @IsNotEmpty()
  @IsString()
  receiverId: string;
}

export class GetFriendsQueryDto extends PaginationQueryDto {}

export class FriendRequestResponseDto {
  @ApiProperty({
    description: 'Friend request ID',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user who sent the request',
    example: 'cm5a1b2c3d4e5f6g7h8i',
  })
  senderId: string;

  @ApiProperty({
    description: 'ID of the user who received the request',
    example: 'cm5j9k0l1m2n3o4p5q6r',
  })
  receiverId: string;

  @ApiProperty({
    description: 'Status of the friend request',
    example: 'PENDING',
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
  })
  status: string;

  @ApiProperty({
    description: 'Request creation timestamp',
    example: '2026-02-07T10:30:00Z',
  })
  createdAt: Date;
}

export class FriendResponseDto {
  @ApiProperty({
    description: 'Friendship record ID',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  id: string;

  @ApiProperty({
    description: 'Friend user ID',
    example: 'cm5a1b2c3d4e5f6g7h8i',
  })
  friendId: string;

  @ApiProperty({
    description: 'Friend full name',
    example: 'John Doe',
    required: false,
  })
  friendName?: string;

  @ApiProperty({
    description: 'Friend profile picture URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  friendAvatar?: string;

  @ApiProperty({
    description: 'Friendship creation timestamp',
    example: '2026-02-07T10:30:00Z',
  })
  createdAt: Date;
}

export class FriendsListResponseDto extends PaginationResponseDto {
  @ApiProperty({
    description: 'List of friends',
    type: [FriendResponseDto],
  })
  friends: FriendResponseDto[];
}
