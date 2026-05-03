import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnerApplicationService } from '../owner-application.service';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationStatus } from '@prisma/client';

const mockPrismaService = {
  ownerApplication: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
};

describe('OwnerApplicationService', () => {
  let service: OwnerApplicationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnerApplicationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KafkaService, useValue: mockKafkaService },
      ],
    }).compile();

    service = module.get<OwnerApplicationService>(OwnerApplicationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('throws CONFLICT when application already exists for user', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({ id: 'app-1' });

      await expect(service.create({ userId: 'u1' } as any)).rejects.toThrow(RpcException);
    });

    it('creates application and returns id on happy path', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);
      mockPrismaService.ownerApplication.create.mockResolvedValue({ id: 'app-1' });

      const result = await service.create({ userId: 'u1' } as any) as any;

      expect(mockPrismaService.ownerApplication.create).toHaveBeenCalled();
      expect(result.ownerApplicationId).toBe('app-1');
    });
  });

  // ──────────────────────────────────────────────
  // approve
  // ──────────────────────────────────────────────
  describe('approve', () => {
    it('throws NOT_FOUND when application does not exist', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);

      await expect(service.approve('missing')).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when application is already reviewed', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OwnerApplicationStatus.APPROVED,
      });

      await expect(service.approve('app-1')).rejects.toThrow(RpcException);
    });

    it('approves application and calls kafka on happy path', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'u1',
        status: OwnerApplicationStatus.PENDING,
      });
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockResolvedValue({ success: true });

      const result = await service.approve('app-1') as any;

      expect(mockPrismaService.ownerApplication.update).toHaveBeenCalled();
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalled();
      expect(result.message).toContain('approved');
    });

    it('rolls back status when kafka call fails', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'u1',
        status: OwnerApplicationStatus.PENDING,
      });
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('Kafka timeout'));

      await expect(service.approve('app-1')).rejects.toThrow();

      // Verify rollback call
      const rollbackCall = mockPrismaService.ownerApplication.update.mock.calls.find(
        (call) => call[0].data.status === OwnerApplicationStatus.PENDING,
      );
      expect(rollbackCall).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // reject
  // ──────────────────────────────────────────────
  describe('reject', () => {
    it('throws NOT_FOUND when application does not exist', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);

      await expect(service.reject('missing', { reason: 'No docs' } as any)).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when application is already reviewed', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OwnerApplicationStatus.REJECTED,
      });

      await expect(service.reject('app-1', { reason: 'No docs' } as any)).rejects.toThrow(RpcException);
    });

    it('rejects application and calls kafka on happy path', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'u1',
        status: OwnerApplicationStatus.PENDING,
      });
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockResolvedValue({ success: true });

      const result = await service.reject('app-1', { reason: 'Incomplete' } as any) as any;

      expect(mockPrismaService.ownerApplication.update).toHaveBeenCalled();
      expect(result.message).toContain('rejected');
    });

    it('rolls back status when kafka call fails during rejection', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'u1',
        status: OwnerApplicationStatus.PENDING,
      });
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockRejectedValue(new Error('Kafka timeout'));

      await expect(service.reject('app-1', { reason: 'Bad' } as any)).rejects.toThrow();

      const rollbackCall = mockPrismaService.ownerApplication.update.mock.calls.find(
        (call) => call[0].data.status === OwnerApplicationStatus.PENDING,
      );
      expect(rollbackCall).toBeDefined();
    });
  });
});
