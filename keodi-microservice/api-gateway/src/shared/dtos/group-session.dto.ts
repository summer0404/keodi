
import { ApiProperty, OmitType } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  MaxLength 
} from 'class-validator';
import { SessionStatus } from '../enums/group-session.enum';
import { PaginationQueryDto, PaginationResponseDto } from './pagination.dto';

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

  @ApiProperty({
    description: 'Current vote status of the session',
    example: 'OPEN',
    enum: ['OPEN', 'FINALIZED'],
  })
  voteStatus: 'OPEN' | 'FINALIZED';

  @ApiProperty({
    description: 'Timestamp when voting was finalized',
    example: null,
    nullable: true,
  })
  finalizedAt: Date | null;

  @ApiProperty({
    description: 'Winning place ID after vote finalization',
    example: null,
    nullable: true,
  })
  winningPlaceId: string | null;
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

export class UserPreviewDto {
  @ApiProperty({ example: 'cm5g8h9j0k1l2m3n4o5p' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John', nullable: true })
  firstName: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName: string | null;

  @ApiProperty({
    example: 'https://cdn.example.com/avatar.jpg',
    nullable: true,
  })
  pictureUrl: string | null;
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

  @ApiProperty({
    description: 'User profile (null for guests)',
    type: () => UserPreviewDto,
    nullable: true,
  })
  user: UserPreviewDto | null;
}

export class GetAllSessionsResponseDto extends GroupSessionResponseDto {
  @ApiProperty({
    description: 'Total number of members in the session',
    example: 6,
  })
  memberCount: number;

  @ApiProperty({
    description:
      'Up to 4 member previews for avatar display. For the full member list call GET /group-sessions/:sessionId.',
    type: [GroupSessionMemberDto],
  })
  members: GroupSessionMemberDto[];
}

export class GetAllSessionsQueryDto extends OmitType(PaginationQueryDto, [
  'sortOrder',
] as const) {}

export class PaginatedGetAllSessionsResponseDto extends PaginationResponseDto {
  @ApiProperty({
    description: 'Paginated list of group sessions for the current user',
    type: [GetAllSessionsResponseDto],
  })
  sessions: GetAllSessionsResponseDto[];
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

export class CastVoteDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the voter (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'ID of the place being voted for',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  placeId: string;
}

export class FinalizeMemberVoteDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the voter (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}

export class AddCandidateDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'ID of the place to add as a candidate',
    example: 'cm5x1y2z3a4b5c6d7e8f',
  })
  placeId: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the member (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}

export class GroupSessionRecommendationRefreshResponseDto {
  @ApiProperty({
    description: 'Indicates the refresh request was accepted',
    example: true,
  })
  accepted: boolean;
}

export class GroupSessionRecommendationAccessDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the member (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}

export class DeleteCandidateDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the member (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}

export class LeaveSessionDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'Guest ID for identifying the member (required for guests only, received on join)',
    example: 'mws0v9cjcm3nuj5y8gochuu1',
    required: false,
  })
  guestId?: string;
}
