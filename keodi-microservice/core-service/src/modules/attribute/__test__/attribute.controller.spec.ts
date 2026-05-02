import { Test, TestingModule } from '@nestjs/testing';
import { AttributeController } from '../attribute.controller';
import { AttributeService } from '../attribute.service';

const mockAttributeService = {
  create: jest.fn(),
};

describe('AttributeController', () => {
  let controller: AttributeController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttributeController],
      providers: [{ provide: AttributeService, useValue: mockAttributeService }],
    }).compile();

    controller = module.get<AttributeController>(AttributeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service.create with DTO', async () => {
      const dto = { name: ['wifi', 'parking'] } as any;
      mockAttributeService.create.mockResolvedValue({ message: 'Attributes created successfully' });

      const result = await controller.create(dto);

      expect(mockAttributeService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Attributes created successfully' });
    });

    it('propagates service errors', async () => {
      const dto = { name: [] } as any;
      mockAttributeService.create.mockRejectedValue(new Error('DB error'));

      await expect(controller.create(dto)).rejects.toThrow('DB error');
    });
  });
});
