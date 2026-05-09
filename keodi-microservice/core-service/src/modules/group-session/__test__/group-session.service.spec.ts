import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GroupSessionStatus, VoteStatus } from '@prisma/client';
import { GroupSessionService } from '../group-session.service';
import { PrismaService } from 'src/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GroupSessionHelper } from '../group-session.helper';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { ImageService } from 'src/modules/image/image.service';

const mockPrismaService = {
  groupSession: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  groupSessionActivity: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  groupSessionMember: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  groupSessionCandidate: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  groupSessionCategory: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  sessionVote: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  friendship: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  category: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockKafkaClient = { emit: jest.fn() };
const mockKafkaService = {
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
  sendWithTimeout: jest.fn(),
};

const mockImageService = {
  getImageViewUrl: jest.fn().mockResolvedValue('https://cdn.example.com/image.jpg'),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockGroupSessionHelper = {
  buildVoteResults: jest.fn(),
};

describe('GroupSessionService', () => {
  let service: GroupSessionService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupSessionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GroupSessionHelper, useValue: mockGroupSessionHelper },
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: ImageService, useValue: mockImageService },
      ],
    }).compile();

    service = module.get<GroupSessionService>(GroupSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('throws CONFLICT when user already has an active session', async () => {
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue({ id: 'existing-member' });

      await expect(service.create('user-1')).rejects.toThrow(RpcException);
    });

    it('creates session and member in a transaction on happy path', async () => {
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('ABCDEFGHIJ0123456789');

      const newSession = { sessionId: 'sess-1', shareCode: 'CODE01', createdBy: 'user-1', status: GroupSessionStatus.ACTIVE };
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => fn(mockPrismaService));
      mockPrismaService.groupSession.create.mockResolvedValue(newSession);
      mockPrismaService.groupSessionMember.create.mockResolvedValue({ id: 'm1' });

      const result = await service.create('user-1');

      expect(result).toBeDefined();
    });

    it('throws INTERNAL_SERVER_ERROR when share-code generation exhausts retries', async () => {
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue(null);
      mockConfigService.get.mockReturnValue('ABCDE');

      // Make every transaction attempt fail with P2002
      mockPrismaService.$transaction.mockRejectedValue({ code: 'P2002' });

      await expect(service.create('user-1')).rejects.toThrow(RpcException);
    });
  });

  // ──────────────────────────────────────────────
  // join
  // ──────────────────────────────────────────────
  describe('join', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.join({ shareCode: 'INVALID' })).rejects.toThrow(RpcException);
    });

    it('throws BAD_REQUEST when session is not active', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        status: GroupSessionStatus.CLOSED,
        members: [],
        creator: null,
      });

      await expect(service.join({ shareCode: 'CODE' })).rejects.toThrow(RpcException);
    });

    it('returns alreadyJoined=true when authenticated user is already a member', async () => {
      const session = {
        sessionId: 'sess-1',
        shareCode: 'CODE',
        status: GroupSessionStatus.ACTIVE,
        createdBy: 'user-1',
        createdAt: new Date(),
        members: [{ id: 'm1', userId: 'user-1', user: { id: 'user-1', pictureUrl: null } }],
        creator: { id: 'user-1', pictureUrl: null },
      };
      mockPrismaService.groupSession.findUnique.mockResolvedValue(session);
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue(null); // no other active session

      const result = await service.join({ shareCode: 'CODE', userId: 'user-1' });

      expect((result as any).alreadyJoined).toBe(true);
    });

    it('throws BAD_REQUEST when guest has no nickname and no existing guestId', async () => {
      const session = {
        sessionId: 'sess-1',
        status: GroupSessionStatus.ACTIVE,
        members: [],
        creator: null,
      };
      mockPrismaService.groupSession.findUnique.mockResolvedValue(session);

      await expect(service.join({ shareCode: 'CODE' })).rejects.toThrow(RpcException);
    });

    it('creates a new member and returns session data on successful join', async () => {
      const session = {
        sessionId: 'sess-1',
        shareCode: 'CODE',
        status: GroupSessionStatus.ACTIVE,
        createdBy: 'owner',
        createdAt: new Date(),
        members: [],
        creator: null,
      };
      mockPrismaService.groupSession.findUnique.mockResolvedValue(session);
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue(null);
      const newMember = { id: 'm2', userId: 'user-2', guestId: null, nickname: null, user: { id: 'user-2', pictureUrl: null } };
      mockPrismaService.groupSessionMember.create.mockResolvedValue(newMember);
      // stub notifySessionMembers
      mockPrismaService.groupSessionMember.findMany.mockResolvedValue([]);

      const result = await service.join({ shareCode: 'CODE', userId: 'user-2' });

      expect((result as any).alreadyJoined).toBe(false);
      expect((result as any).member).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // close
  // ──────────────────────────────────────────────
  describe('close', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.close({ sessionId: 'sess-x', userId: 'user-1' })).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when caller is not the session creator', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner',
        status: GroupSessionStatus.ACTIVE,
      });

      await expect(service.close({ sessionId: 'sess-1', userId: 'not-owner' })).rejects.toThrow(RpcException);
    });

    it('throws BAD_REQUEST when session is already closed', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner',
        status: GroupSessionStatus.CLOSED,
      });

      await expect(service.close({ sessionId: 'sess-1', userId: 'owner' })).rejects.toThrow(RpcException);
    });

    it('closes session and notifies members on happy path', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner',
        status: GroupSessionStatus.ACTIVE,
      });
      const updated = { sessionId: 'sess-1', status: GroupSessionStatus.CLOSED };
      mockPrismaService.groupSession.update.mockResolvedValue(updated);
      mockPrismaService.groupSessionMember.findMany.mockResolvedValue([]);

      const result = await service.close({ sessionId: 'sess-1', userId: 'owner' });

      expect(mockPrismaService.groupSession.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });
  });

  // ──────────────────────────────────────────────
  // getSession
  // ──────────────────────────────────────────────
  describe('getSession', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('missing')).rejects.toThrow(RpcException);
    });

    it('returns session with mapped picture URLs', async () => {
      const session = {
        sessionId: 'sess-1',
        creator: { id: 'u1', pictureUrl: 's3://bucket/pic.jpg' },
        members: [],
        winningPlace: null,
      };
      mockPrismaService.groupSession.findUnique.mockResolvedValue(session);

      const result = await service.getSession('sess-1');

      expect(mockImageService.getImageViewUrl).toHaveBeenCalledWith('s3://bucket/pic.jpg');
      expect(result).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // getAll
  // ──────────────────────────────────────────────
  describe('getAll', () => {
    it('returns paginated sessions for a user', async () => {
      mockPrismaService.groupSession.findMany.mockResolvedValue([]);
      mockPrismaService.groupSession.count.mockResolvedValue(0);

      const result = await service.getAll('user-1', 1, 10);

      expect(result).toMatchObject({ sessions: [], total: 0, page: 1, limit: 10 });
    });
  });

  // ──────────────────────────────────────────────
  // updateRecommendationSearchRadius
  // ──────────────────────────────────────────────
  describe('updateRecommendationSearchRadius', () => {
    it('throws BAD_REQUEST for invalid radius', async () => {
      await expect(
        service.updateRecommendationSearchRadius({ sessionId: 'sess-1', searchRadius: -1, userId: 'u1' }),
      ).rejects.toThrow(RpcException);
    });

    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRecommendationSearchRadius({ sessionId: 'sess-1', searchRadius: 5, userId: 'u1' }),
      ).rejects.toThrow(RpcException);
    });

    it('updates and returns search radius on happy path', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({ sessionId: 'sess-1', status: GroupSessionStatus.ACTIVE });
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue({ id: 'm1' });
      mockPrismaService.groupSession.update.mockResolvedValue({ sessionId: 'sess-1', searchRadius: 5 });

      const result = await service.updateRecommendationSearchRadius({ sessionId: 'sess-1', searchRadius: 5, userId: 'u1' });

      expect(result).toMatchObject({ sessionId: 'sess-1', searchRadius: 5 });
    });
  });

  // ──────────────────────────────────────────────
  // leaveSession
  // ──────────────────────────────────────────────
  describe('leaveSession', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.leaveSession({ sessionId: 'x', userId: 'u1' })).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when creator tries to leave', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        status: GroupSessionStatus.ACTIVE,
        createdBy: 'owner',
      });

      await expect(service.leaveSession({ sessionId: 'sess-1', userId: 'owner' })).rejects.toThrow(RpcException);
    });

    it('removes member and returns on happy path', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        status: GroupSessionStatus.ACTIVE,
        createdBy: 'owner',
      });
      mockPrismaService.groupSessionMember.findFirst.mockResolvedValue({ id: 'm2', userId: 'user-2' });
      mockPrismaService.groupSessionMember.delete.mockResolvedValue({});
      mockPrismaService.groupSessionMember.findMany.mockResolvedValue([]);

      const result = await service.leaveSession({ sessionId: 'sess-1', userId: 'user-2' });

      expect(mockPrismaService.groupSessionMember.delete).toHaveBeenCalled();
      expect((result as any).memberId).toBe('m2');
    });
  });

  // ──────────────────────────────────────────────
  // getCandidates
  // ──────────────────────────────────────────────
  describe('getCandidates', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.getCandidates('missing')).rejects.toThrow(RpcException);
    });

    it('returns candidates for an existing session', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({ sessionId: 'sess-1' });
      mockPrismaService.groupSessionCandidate.findMany.mockResolvedValue([]);

      const result = await service.getCandidates('sess-1');

      expect((result as any).candidates).toEqual([]);
      expect((result as any).total).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // getActivities
  // ──────────────────────────────────────────────
  describe('getActivities', () => {
    it('throws NOT_FOUND when session does not exist', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue(null);

      await expect(service.getActivities({ sessionId: 'missing' })).rejects.toThrow(RpcException);
    });

    it('throws FORBIDDEN when caller is not a member', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner-1',
        members: [{ userId: 'other-user', guestId: null }],
      });

      await expect(service.getActivities({ sessionId: 'sess-1', userId: 'stranger' })).rejects.toThrow(RpcException);
    });

    it('returns activities ordered newest-first for a valid member', async () => {
      const activities = [
        { id: 'act-2', type: 'MEMBER_JOINED', createdAt: new Date('2026-01-02') },
        { id: 'act-1', type: 'MEMBER_JOINED', createdAt: new Date('2026-01-01') },
      ];
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner-1',
        members: [{ userId: 'owner-1', guestId: null }],
      });
      mockPrismaService.groupSessionActivity.findMany.mockResolvedValue(activities);

      const result = await service.getActivities({ sessionId: 'sess-1', userId: 'owner-1' }) as any;

      expect(result.activities).toEqual(activities);
      expect(mockPrismaService.groupSessionActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 'sess-1' }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('allows creator access even if not in members array', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'creator-1',
        members: [],
      });
      mockPrismaService.groupSessionActivity.findMany.mockResolvedValue([]);

      const result = await service.getActivities({ sessionId: 'sess-1', userId: 'creator-1' }) as any;

      expect(result.activities).toEqual([]);
    });

    it('allows guest access by guestId', async () => {
      mockPrismaService.groupSession.findUnique.mockResolvedValue({
        sessionId: 'sess-1',
        createdBy: 'owner-1',
        members: [{ userId: null, guestId: 'guest-abc' }],
      });
      mockPrismaService.groupSessionActivity.findMany.mockResolvedValue([]);

      const result = await service.getActivities({ sessionId: 'sess-1', guestId: 'guest-abc' }) as any;

      expect(result.activities).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // logRecommendationsRefreshed
  // ──────────────────────────────────────────────
  describe('logRecommendationsRefreshed', () => {
    it('calls logActivity with RECOMMENDATIONS_REFRESHED type', async () => {
      mockPrismaService.groupSessionActivity.create.mockResolvedValue({});

      await service.logRecommendationsRefreshed({ sessionId: 'sess-1', userId: 'user-1' });

      expect(mockPrismaService.groupSessionActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sessionId: 'sess-1',
            type: 'RECOMMENDATIONS_REFRESHED',
            actorId: 'user-1',
          }),
        }),
      );
    });
  });
});
