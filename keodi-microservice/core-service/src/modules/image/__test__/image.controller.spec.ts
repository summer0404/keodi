import { Test, TestingModule } from '@nestjs/testing';
import { ImageController } from '../image.controller';
import { ImageService } from '../image.service';

const mockImageService = {
  generateUploadUrl: jest.fn(),
  persistImageRecord: jest.fn(),
  getImageViewUrl: jest.fn(),
};

describe('ImageController', () => {
  let controller: ImageController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageController],
      providers: [{ provide: ImageService, useValue: mockImageService }],
    }).compile();

    controller = module.get<ImageController>(ImageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUploadUrl', () => {
    it('delegates to imageService.generateUploadUrl and returns result', async () => {
      const expected = { uploadUrl: 'https://s3.presigned/upload', s3Key: 'user_images/uuid' };
      mockImageService.generateUploadUrl.mockResolvedValue(expected);

      const result = await controller.getUploadUrl({ folder: 'user_images', mimeType: 'image/png' });

      expect(mockImageService.generateUploadUrl).toHaveBeenCalledWith('user_images', 'image/png');
      expect(result).toEqual(expected);
    });
  });
});
