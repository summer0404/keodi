import { Test, TestingModule } from '@nestjs/testing';
import { PlaceService } from '../place.service';
import { PrismaService } from 'src/database/prisma.service';
import { ImageService } from 'src/modules/image/image.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { PlaceHelper } from '../place.helper';
import { PlaceErrorMessages } from 'src/shared/constants/error.constant';
import { UpdatePlaceDto } from 'src/shared/dtos/place.dto';

const mockTx = {
  openingHour: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  placeCategory: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  placeAttribute: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  place: {
    update: jest.fn(),
  },
};

const mockPrismaService = {
  place: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  attribute: {
    findMany: jest.fn(),
  },
  openingHour: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  placeCategory: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  placeAttribute: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation(async (fn) => fn(mockTx)),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockImageService = {
  persistImageRecord: jest.fn(),
  getImageViewUrl: jest.fn(),
};

const mockKafkaClient = {
  emit: jest.fn(),
};

const mockKafkaService = {
  sendWithTimeout: jest.fn(),
  getClient: jest.fn().mockReturnValue(mockKafkaClient),
};

const mockPlaceHelper = {
  buildPlaceImageKey: jest.fn().mockReturnValue('places/12345.jpg'),
  normalizeOpeningHours: jest.fn().mockReturnValue([]),
  buildFullAddress: jest.fn().mockReturnValue('123 Street, Ward, City, VN'),
  toGoogleMapLink: jest
    .fn()
    .mockReturnValue('https://maps.google.com/?q=10,106'),
  calculateGeoDeltas: jest
    .fn()
    .mockReturnValue({ latDelta: 0.045, longDelta: 0.048 }),
  buildPaginationParams: jest
    .fn()
    .mockReturnValue({ offset: 0, orderByClause: 'ORDER BY distance ASC' }),
  buildSearchQueryConfig: jest.fn().mockReturnValue({
    searchCondition: {},
    similarityColumn: {},
    searchOrderBy: 'ORDER BY distance ASC',
  }),
  buildSearchCondition: jest.fn().mockReturnValue({}),
};

describe('PlaceService - update', () => {
  let service: PlaceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation(async (fn) => fn(mockTx));
    mockKafkaService.getClient.mockReturnValue(mockKafkaClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ImageService, useValue: mockImageService },
        { provide: KafkaService, useValue: mockKafkaService },
        { provide: PlaceHelper, useValue: mockPlaceHelper },
      ],
    }).compile();

    service = module.get<PlaceService>(PlaceService);
  });

  const basePlace = {
    id: 'place-1',
    ownerId: 'owner-1',
    street: '123 Street',
    ward: 'Ward A',
    city: 'City B',
    countryCode: 'VN',
    latitude: 10.0,
    longitude: 106.0,
  };

  describe('NOT_FOUND', () => {
    it('throws NOT_FOUND when place does not exist', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(null);

      const dto: UpdatePlaceDto = {
        placeId: 'nonexistent',
        requesterId: 'owner-1',
      };

      await expect(service.update(dto)).rejects.toThrow(
        PlaceErrorMessages.PLACE_NOT_FOUND,
      );
    });
  });

  describe('FORBIDDEN', () => {
    it('throws FORBIDDEN when requester is not the owner', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'other-user',
      };

      await expect(service.update(dto)).rejects.toThrow(
        PlaceErrorMessages.PLACE_NOT_OWNER,
      );
    });
  });

  describe('success cases', () => {
    it('returns success when owner updates name only', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        name: 'New Name',
      };
      const result = await service.update(dto);

      expect(result).toEqual({ message: 'Place updated successfully' });
      expect(mockTx.place.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'place-1' },
          data: expect.objectContaining({ name: 'New Name' }),
        }),
      );
    });

    it('updates featureImageUrl when featureImageKey is provided', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        featureImageKey: 'place_images/new-uuid',
      };
      const result = await service.update(dto);

      expect(mockImageService.persistImageRecord).not.toHaveBeenCalled();
      expect(result).toEqual({ message: 'Place updated successfully' });
      expect(mockTx.place.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featureImageUrl: 'place_images/new-uuid',
          }),
        }),
      );
    });

    it('rebuilds fullAddress when any address field is updated', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockPlaceHelper.buildFullAddress.mockReturnValue(
        'New Street, Ward A, City B, VN',
      );
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        street: 'New Street',
      };
      const result = await service.update(dto);

      expect(mockPlaceHelper.buildFullAddress).toHaveBeenCalledWith(
        'New Street',
        'Ward A',
        'City B',
        'VN',
      );
      expect(mockTx.place.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullAddress: 'New Street, Ward A, City B, VN',
          }),
        }),
      );
      expect(result).toEqual({ message: 'Place updated successfully' });
    });

    it('rebuilds googleMapLink when coordinates change and no googleMapLink provided', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockPlaceHelper.toGoogleMapLink.mockReturnValue(
        'https://maps.google.com/?q=11,107',
      );
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        latitude: 11.0,
        longitude: 107.0,
      };
      const result = await service.update(dto);

      expect(mockPlaceHelper.toGoogleMapLink).toHaveBeenCalledWith(11.0, 107.0);
      expect(mockTx.place.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            googleMapLink: 'https://maps.google.com/?q=11,107',
          }),
        }),
      );
      expect(result).toEqual({ message: 'Place updated successfully' });
    });

    it('validates categories and throws BAD_REQUEST when category IDs not found', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockPrismaService.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        mainCategoryId: 'cat-1',
        secondaryCategoryIds: ['cat-missing'],
      };

      await expect(service.update(dto)).rejects.toThrow(
        PlaceErrorMessages.PLACE_CATEGORY_NOT_FOUND,
      );
    });

    it('validates attributes and throws BAD_REQUEST when attribute IDs not found', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockPrismaService.attribute.findMany.mockResolvedValue([]);

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        attributeIds: ['attr-missing'],
      };

      await expect(service.update(dto)).rejects.toThrow(
        PlaceErrorMessages.PLACE_ATTRIBUTE_NOT_FOUND,
      );
    });

    it('replaces opening hours when openingHours array is provided', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      const normalizedHours = [
        { dayOfWeek: 1, openTime: new Date(), closeTime: new Date() },
      ];
      mockPlaceHelper.normalizeOpeningHours.mockReturnValue(normalizedHours);
      mockTx.openingHour.deleteMany.mockResolvedValue({});
      mockTx.openingHour.createMany.mockResolvedValue({});
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        openingHours: [{ dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' }],
      };
      const result = await service.update(dto);

      expect(mockTx.openingHour.deleteMany).toHaveBeenCalledWith({
        where: { placeId: 'place-1' },
      });
      expect(mockTx.openingHour.createMany).toHaveBeenCalledWith({
        data: normalizedHours.map((oh) => ({ ...oh, placeId: 'place-1' })),
      });
      expect(result).toEqual({ message: 'Place updated successfully' });
    });

    it('does not touch opening hours when openingHours is undefined', async () => {
      mockPrismaService.place.findUnique.mockResolvedValue(basePlace);
      mockTx.place.update.mockResolvedValue({});

      const dto: UpdatePlaceDto = {
        placeId: 'place-1',
        requesterId: 'owner-1',
        name: 'Only Name Update',
      };
      await service.update(dto);

      expect(mockTx.openingHour.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.openingHour.createMany).not.toHaveBeenCalled();
    });
  });
});
