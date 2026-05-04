import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { OwnerApplicationStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationService } from '../owner-application.service';

const mockPrismaService = {
  ownerApplication: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
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
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
      });

      await expect(service.create({ userId: 'u1' } as any)).rejects.toThrow(
        RpcException,
      );
    });

    it('creates application and returns id on happy path', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);
      mockPrismaService.ownerApplication.create.mockResolvedValue({
        id: 'app-1',
      });

      const result = (await service.create({ userId: 'u1' } as any)) as any;

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

      const result = (await service.approve('app-1')) as any;

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
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('Kafka timeout'),
      );

      await expect(service.approve('app-1')).rejects.toThrow();

      // Verify rollback call
      const rollbackCall =
        mockPrismaService.ownerApplication.update.mock.calls.find(
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

      await expect(
        service.reject('missing', { reason: 'No docs' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when application is already reviewed', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: OwnerApplicationStatus.REJECTED,
      });

      await expect(
        service.reject('app-1', { reason: 'No docs' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('rejects application and calls kafka on happy path', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'u1',
        status: OwnerApplicationStatus.PENDING,
      });
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockResolvedValue({ success: true });

      const result = (await service.reject('app-1', {
        reason: 'Incomplete',
      } as any)) as any;

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
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('Kafka timeout'),
      );

      await expect(
        service.reject('app-1', { reason: 'Bad' } as any),
      ).rejects.toThrow();

      const rollbackCall =
        mockPrismaService.ownerApplication.update.mock.calls.find(
          (call) => call[0].data.status === OwnerApplicationStatus.PENDING,
        );
      expect(rollbackCall).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // getAll
  // ──────────────────────────────────────────────
  describe('getAll', () => {
    it('returns paginated applications without status filter', async () => {
      const apps = [{ id: 'app-1', status: 'PENDING' }];
      mockPrismaService.ownerApplication.findMany.mockResolvedValue(apps);
      mockPrismaService.ownerApplication.count.mockResolvedValue(1);

      const result = (await service.getAll({
        page: 1,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(mockPrismaService.ownerApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 10 }),
      );
      expect(mockPrismaService.ownerApplication.count).toHaveBeenCalledWith({
        where: {},
      });
      expect(result.data).toEqual(apps);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('filters by status when provided', async () => {
      mockPrismaService.ownerApplication.findMany.mockResolvedValue([]);
      mockPrismaService.ownerApplication.count.mockResolvedValue(0);

      await service.getAll({
        page: 1,
        limit: 10,
        status: OwnerApplicationStatus.PENDING,
        sortOrder: 'asc',
      } as any);

      expect(mockPrismaService.ownerApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OwnerApplicationStatus.PENDING },
        }),
      );
    });

    it('calculates correct skip for page 2', async () => {
      mockPrismaService.ownerApplication.findMany.mockResolvedValue([]);
      mockPrismaService.ownerApplication.count.mockResolvedValue(15);

      const result = (await service.getAll({
        page: 2,
        limit: 10,
        sortOrder: 'desc',
      } as any)) as any;

      expect(mockPrismaService.ownerApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10 }),
      );
      expect(result.totalPages).toBe(2);
    });

    it('propagates prisma error from getAll', async () => {
      mockPrismaService.ownerApplication.findMany.mockRejectedValue(
        new Error('db error'),
      );
      await expect(
        service.getAll({ page: 1, limit: 10 } as any),
      ).rejects.toThrow('db error');
    });
  });

  // ──────────────────────────────────────────────
  // resubmit
  // ──────────────────────────────────────────────
  describe('resubmit', () => {
    it('throws NOT_FOUND when application does not exist', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.resubmit({ userId: 'user-1' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('throws CONFLICT when application is not in REJECTED status', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
        status: OwnerApplicationStatus.PENDING,
      });

      await expect(
        service.resubmit({ userId: 'user-1' } as any),
      ).rejects.toThrow(RpcException);
    });

    it('updates application and calls kafka on happy path', async () => {
      const existingApp = {
        id: 'app-1',
        userId: 'user-1',
        status: OwnerApplicationStatus.REJECTED,
        rejectionReason: 'Incomplete',
        reviewedAt: new Date(),
      };
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(
        existingApp,
      );
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockResolvedValue({ success: true });

      const dto = {
        userId: 'user-1',
        businessName: 'New Corp',
        businessPhone: '0123456789',
        businessAddress: '123 Street',
        taxId: 'TAX-001',
        proofDocumentUrls: ['https://example.com/doc.pdf'],
      } as any;

      const result = (await service.resubmit(dto)) as any;

      expect(mockPrismaService.ownerApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({
            status: OwnerApplicationStatus.PENDING,
          }),
        }),
      );
      expect(mockKafkaService.sendWithTimeout).toHaveBeenCalledWith(
        expect.anything(),
        { userId: 'user-1' },
      );
      expect(result.message).toContain('resubmitted');
    });

    it('rolls back application status when kafka call fails', async () => {
      const existingApp = {
        id: 'app-1',
        userId: 'user-1',
        status: OwnerApplicationStatus.REJECTED,
        rejectionReason: 'Incomplete',
        reviewedAt: new Date(),
      };
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(
        existingApp,
      );
      mockPrismaService.ownerApplication.update.mockResolvedValue({});
      mockKafkaService.sendWithTimeout.mockRejectedValue(
        new Error('kafka timeout'),
      );

      await expect(
        service.resubmit({ userId: 'user-1' } as any),
      ).rejects.toThrow();

      const rollbackCall =
        mockPrismaService.ownerApplication.update.mock.calls.find(
          (call) => call[0].data.status === OwnerApplicationStatus.REJECTED,
        );
      expect(rollbackCall).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────
  // getStatusByUserId
  // ──────────────────────────────────────────────
  describe('getStatusByUserId', () => {
    it('returns application when found', async () => {
      const app = {
        id: 'app-1',
        userId: 'user-1',
        status: OwnerApplicationStatus.PENDING,
      };
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(app);

      const result = await service.getStatusByUserId('user-1');

      expect(
        mockPrismaService.ownerApplication.findUnique,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual(app);
    });

    it('returns null when no application found', async () => {
      mockPrismaService.ownerApplication.findUnique.mockResolvedValue(null);

      const result = await service.getStatusByUserId('user-1');

      expect(result).toBeNull();
    });

    it('propagates prisma error from getStatusByUserId', async () => {
      mockPrismaService.ownerApplication.findUnique.mockRejectedValue(
        new Error('db error'),
      );
      await expect(service.getStatusByUserId('user-1')).rejects.toThrow(
        'db error',
      );
    });
  });
});
