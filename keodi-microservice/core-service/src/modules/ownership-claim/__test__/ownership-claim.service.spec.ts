import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnershipClaimService } from '../ownership-claim.service';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnershipClaimStatus } from '@prisma/client';

const mockPrismaService = {
  place: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  ownershipClaim: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockKafkaClient = { emit: jest.fn() };
const mockKafkaService = {
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

describe('OwnershipClaimService', () => {
  let service: OwnershipClaimService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnershipClaimService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<OwnershipClaimService>(OwnershipClaimService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ placeId: 'missing', userId: 'u1' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when approved claim already exists', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        ownerId: null,
        name: 'Cafe',
      });
      mockPrismaService.ownershipClaim.findFirst.mockResolvedValue({
        id: 'claim-1',
        status: OwnershipClaimStatus.APPROVED,
      });

      await expect(
        service.create({ placeId: 'p1', userId: 'u1' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('creates PENDING claim when place has no owner', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        ownerId: null,
        name: 'Cafe',
      });
      mockPrismaService.ownershipClaim.findFirst.mockResolvedValue(null);
      mockPrismaService.ownershipClaim.create.mockResolvedValue({
        id: 'claim-1',
        status: OwnershipClaimStatus.PENDING,
      });

      const result = (await service.create({
        placeId: 'p1',
        userId: 'u1',
      } as any)) as any;

      expect(result.status).toBe(OwnershipClaimStatus.PENDING);
      expect(mockKafkaClient.emit).not.toHaveBeenCalled();
    });

    it('creates DISPUTED claim and emits kafka event when place already has an owner', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue({
        id: 'p1',
        ownerId: 'u-existing',
        name: 'Cafe',
      });
      mockPrismaService.ownershipClaim.findFirst.mockResolvedValue(null);
      mockPrismaService.ownershipClaim.create.mockResolvedValue({
        id: 'claim-1',
        status: OwnershipClaimStatus.DISPUTED,
      });

      await service.create({ placeId: 'p1', userId: 'u1' } as any);

      expect(mockKafkaClient.emit).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // approve
  // ──────────────────────────────────────────────
  describe('approve', () => {
    it('throws NOT_FOUND when claim does not exist', async () => {
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue(null);

      await expect(service.approve('missing')).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when claim is already reviewed', async () => {
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue({
        id: 'c1',
        status: OwnershipClaimStatus.APPROVED,
        place: { id: 'p1', name: 'Cafe', ownerId: null },
      });

      await expect(service.approve('c1')).rejects.toThrow(RpcException);
    });

    it('approves claim and updates place owner', async () => {
      const claim = {
        id: 'c1',
        userId: 'u1',
        placeId: 'p1',
        status: OwnershipClaimStatus.PENDING,
        place: { id: 'p1', name: 'Cafe', ownerId: null },
      };
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue(claim);
      mockPrismaService.ownershipClaim.findMany.mockResolvedValue([]);
      mockPrismaService.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          ownershipClaim: { update: jest.fn(), updateMany: jest.fn() },
          place: { update: jest.fn() },
        };
        return fn(tx);
      });

      const result = (await service.approve('c1')) as any;

      expect(result.message).toContain('approved');
      expect(mockKafkaClient.emit).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // reject
  // ──────────────────────────────────────────────
  describe('reject', () => {
    it('throws NOT_FOUND when claim does not exist', async () => {
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue(null);

      await expect(
        service.reject('missing', { reason: 'Bad' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when claim is already reviewed', async () => {
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue({
        id: 'c1',
        status: OwnershipClaimStatus.REJECTED,
      });

      await expect(
        service.reject('c1', { reason: 'Already done' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('rejects claim and emits notification', async () => {
      mockPrismaService.ownershipClaim.findUnique.mockResolvedValue({
        id: 'c1',
        userId: 'u1',
        status: OwnershipClaimStatus.PENDING,
      });
      mockPrismaService.ownershipClaim.update.mockResolvedValue({});

      const result = (await service.reject('c1', {
        reason: 'Incomplete docs',
      } as any)) as any;

      expect(mockPrismaService.ownershipClaim.update).toHaveBeenCalled();
      expect(mockKafkaClient.emit).toHaveBeenCalled();
      expect(result.message).toContain('rejected');
    });
  });

  // ──────────────────────────────────────────────
  // getClaims
  // ──────────────────────────────────────────────
  describe('getClaims', () => {
    it('returns paginated claims grouped by place', async () => {
      mockPrismaService.place.findMany.mockResolvedValue([]);
      mockPrismaService.place.count.mockResolvedValue(0);

      const result = (await service.getClaims({
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // getMyClaims
  // ──────────────────────────────────────────────
  describe('getMyClaims', () => {
    it('returns paginated claims for a user', async () => {
      mockPrismaService.ownershipClaim.findMany.mockResolvedValue([]);
      mockPrismaService.ownershipClaim.count.mockResolvedValue(0);

      const result = (await service.getMyClaims({
        userId: 'u1',
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
