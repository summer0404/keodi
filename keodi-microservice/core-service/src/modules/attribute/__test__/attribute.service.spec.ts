import { Test, TestingModule } from '@nestjs/testing';
import { AttributeService } from '../attribute.service';
import { PrismaService } from 'src/database/prisma.service';

const mockPrismaService = {
  attribute: {
    createMany: jest.fn(),
  },
};

describe('AttributeService', () => {
  let service: AttributeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttributeService>(AttributeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('calls createMany with uppercased names', async () => {
      mockPrismaService.attribute.createMany.mockResolvedValue({ count: 2 });

      await service.create({ name: ['wifi', 'parking'] });

      const call = mockPrismaService.attribute.createMany.mock.calls[0][0];
      expect(call.data).toEqual([{ name: 'WIFI' }, { name: 'PARKING' }]);
      expect(call.skipDuplicates).toBe(true);
    });

    it('returns success message', async () => {
      mockPrismaService.attribute.createMany.mockResolvedValue({ count: 1 });

      const result = (await service.create({ name: ['outdoor'] })) as any;

      expect(result.message).toBe('Attributes created successfully');
    });

    it('handles empty name array', async () => {
      mockPrismaService.attribute.createMany.mockResolvedValue({ count: 0 });

      const result = (await service.create({ name: [] })) as any;

      expect(mockPrismaService.attribute.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: [] }),
      );
      expect(result.message).toBe('Attributes created successfully');
    });

    it('handles database errors', async () => {
      mockPrismaService.attribute.createMany.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.create({ name: ['test'] })).rejects.toThrow();
    });

    it('uppercases mixed-case names', async () => {
      mockPrismaService.attribute.createMany.mockResolvedValue({ count: 1 });

      await service.create({ name: ['FreeWiFi'] });

      const call = mockPrismaService.attribute.createMany.mock.calls[0][0];
      expect(call.data[0].name).toBe('FREEWIFI');
    });
  });
});
