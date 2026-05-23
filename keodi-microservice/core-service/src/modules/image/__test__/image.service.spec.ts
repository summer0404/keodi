import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { ImageService } from '../image.service';
import { PrismaService } from 'src/database/prisma.service';
import { S3Service } from 'src/providers/s3/s3.service';

const mockPrismaService = {
  image: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockS3Service = {
  generateImageViewPresignedUrl: jest.fn(),
  generateImageUploadPresignedUrl: jest.fn(),
};

describe('ImageService', () => {
  let service: ImageService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<ImageService>(ImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getImageViewUrl', () => {
    it('returns key as-is when it starts with http://', async () => {
      const result = await service.getImageViewUrl('http://example.com/img.jpg');
      expect(mockS3Service.generateImageViewPresignedUrl).not.toHaveBeenCalled();
      expect(result).toBe('http://example.com/img.jpg');
    });

    it('returns key as-is when it starts with https://', async () => {
      const result = await service.getImageViewUrl('https://example.com/img.jpg');
      expect(mockS3Service.generateImageViewPresignedUrl).not.toHaveBeenCalled();
      expect(result).toBe('https://example.com/img.jpg');
    });

    it('generates presigned URL for S3 keys', async () => {
      mockS3Service.generateImageViewPresignedUrl.mockResolvedValue('https://s3.presigned/url');
      const result = await service.getImageViewUrl('images/pic.jpg');
      expect(mockS3Service.generateImageViewPresignedUrl).toHaveBeenCalledWith('images/pic.jpg');
      expect(result).toBe('https://s3.presigned/url');
    });
  });

  describe('generateUploadUrl', () => {
    it('uses Date.now() key for non-user uploads and returns uploadUrl and s3Key', async () => {
      mockS3Service.generateImageUploadPresignedUrl.mockResolvedValue('https://s3.presigned/upload');
      const result = await service.generateUploadUrl('chat_images', 'image/jpeg');
      expect(result.uploadUrl).toBe('https://s3.presigned/upload');
      expect(result.s3Key).toMatch(/^chat_images\/\d+$/);
    });

    it('uses fixed user key when userId is provided', async () => {
      mockS3Service.generateImageUploadPresignedUrl.mockResolvedValue('https://s3.presigned/upload');
      const result = await service.generateUploadUrl('user_images', 'image/jpeg', 'u1');
      expect(result.s3Key).toBe('user_images/user_u1_picture.jpg');
    });

    it('throws RpcException for disallowed mime type', async () => {
      await expect(service.generateUploadUrl('chat_images', 'image/bmp')).rejects.toThrow(RpcException);
    });

    it('skips mime validation when mimeType is not provided', async () => {
      mockS3Service.generateImageUploadPresignedUrl.mockResolvedValue('https://s3.presigned/upload');
      await expect(service.generateUploadUrl('chat_images')).resolves.toBeDefined();
    });

    it('throws RpcException when S3 presigned URL generation fails', async () => {
      mockS3Service.generateImageUploadPresignedUrl.mockRejectedValue(new Error('S3 error'));
      await expect(service.generateUploadUrl('chat_images', 'image/jpeg')).rejects.toThrow(RpcException);
    });
  });

  describe('persistImageRecord', () => {
    it('creates new image record when no imageId provided', async () => {
      mockPrismaService.image.create.mockResolvedValue({ id: 'img-1', url: 'chat_images/uuid' });
      const result = await service.persistImageRecord('chat_images/uuid');
      expect(mockPrismaService.image.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'img-1', key: 'chat_images/uuid' });
    });

    it('updates existing image record when imageId is provided', async () => {
      mockPrismaService.image.update.mockResolvedValue({ id: 'img-1', url: 'user_images/new.jpg' });
      const result = await service.persistImageRecord('user_images/new.jpg', 'img-1');
      expect(mockPrismaService.image.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'img-1' } }),
      );
      expect(result.id).toBe('img-1');
    });
  });
});
