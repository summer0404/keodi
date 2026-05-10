import { Test, TestingModule } from '@nestjs/testing';
import { ImageController } from '../image.controller';
import { ImageService } from '../image.service';

const mockImageService = {
  getImageViewUrl: jest.fn(),
  uploadImage: jest.fn(),
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

  it('constructor injects ImageService', () => {
    // ImageController has no message handlers; verify it was instantiated with the service
    expect((controller as any).imageService).toBeDefined();
  });
});
