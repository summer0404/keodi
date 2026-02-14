import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../enums/group-session.enum';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GroupSessionResponseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  sessionId: string;

  @ApiProperty({
    description: 'ID of the session creator',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Unique share code for joining the session',
    example: 'AB12CD34',
  })
  shareCode: string;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2026-02-10T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Current status of the session',
    example: SessionStatus.ACTIVE,
    enum: SessionStatus,
  })
  status: SessionStatus;
}

export class JoinGroupSessionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The share code of the session to join',
    example: 'AB12CD',
  })
  shareCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @ApiProperty({
    description: 'Nickname for anonymous guests',
    example: 'Guest123',
    required: false,
  })
  nickname?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Guest ID for returning guests (stored in localStorage)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}

export class InviteFriendToSessionDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'ID of the friend to invite',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  friendId: string;
}

export class GroupSessionMemberDto {
  @ApiProperty({
    description: 'Unique member identifier',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  id: string;

  @ApiProperty({
    description: 'Session ID',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  sessionId: string;

  @ApiProperty({
    description: 'User ID (null for guest)',
    example: 'cm5g8h9j0k1l2m3n4o5p',
    nullable: true,
  })
  userId: string | null;

  @ApiProperty({
    description: 'Guest ID (null for authenticated users)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    nullable: true,
  })
  guestId: string | null;

  @ApiProperty({
    description: 'Display nickname (for guests)',
    example: 'Guest123',
    nullable: true,
  })
  nickname: string | null;

  @ApiProperty({
    description: 'Timestamp when member joined',
    example: '2026-02-13T17:53:55.095Z',
  })
  joinedAt: Date;
}

export class JoinGroupSessionResponseDto {
  @ApiProperty({
    description: 'Unique session identifier',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Unique share code for joining the session',
    example: 'AB12CD',
  })
  shareCode: string;

  @ApiProperty({
    description: 'ID of the session creator',
    example: 'cm5g8h9j0k1l2m3n4o5p',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2026-02-10T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Current status of the session',
    example: SessionStatus.ACTIVE,
    enum: SessionStatus,
  })
  status: SessionStatus;

  @ApiProperty({
    description: 'Total number of members in the session',
    example: 5,
  })
  memberCount: number;

  @ApiProperty({
    description: 'All members in the session',
    type: [GroupSessionMemberDto],
  })
  members: GroupSessionMemberDto[];

  @ApiProperty({
    description:
      'The member who just joined (or existing member if already joined)',
    type: GroupSessionMemberDto,
  })
  member: GroupSessionMemberDto;

  @ApiProperty({
    description: 'Whether the user was already a member of this session',
    example: false,
  })
  alreadyJoined: boolean;
}

export class CloseGroupSessionResponseDto extends GroupSessionResponseDto {}
