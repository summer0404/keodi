import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { GroupSession } from '@prisma/client';
import { randomBytes } from 'crypto';
import { SessionStatus } from 'src/common/enums/group-session.enum';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class GroupSessionService {
  private static readonly SHARE_CODE_LENGTH = 6;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private generateShareCode(
    length: number = GroupSessionService.SHARE_CODE_LENGTH,
  ): string {
    const chars = this.configService.get<string>('SHARE_CODE_CHARS');
    if (!chars) {
      throw new Error(
        'SHARE_CODE_CHARS is not configured in environment variables',
      );
    }
    let result = '';
    const bytes = randomBytes(length);

    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }

    return result;
  }

  async createGroupSession(userId: string): Promise<GroupSession> {
    let session: GroupSession | null = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const shareCode = this.generateShareCode();

        session = await this.prismaService.groupSession.create({
          data: {
            createdBy: userId,
            shareCode: shareCode,
            status: SessionStatus.ACTIVE,
          },
        });

        break; // Exit loop on success
      } catch (error) {
        attempts++;
        // Retry on unique constraint violation
        if (error && typeof error === 'object' && error.code === 'P2002') {
          if (attempts >= maxAttempts) {
            break;
          }
          continue;
        }
        throw error;
      }
    }

    if (!session) {
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to generate unique share code',
      });
    }
    return session;
  }
}
