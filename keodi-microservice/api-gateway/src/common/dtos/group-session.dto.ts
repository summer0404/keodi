import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../enums/group-session.enum';

// export class CreateGroupSessionRequestDto {}

// export class CreateGroupSessionDto {
//   userId: string;
// }

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
    example: 'ACTIVE',
    enum: SessionStatus,
  })
  status: SessionStatus;
}