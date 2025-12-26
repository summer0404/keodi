import { Controller, Get, Param } from '@nestjs/common';
import { PlaceService } from './place.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class PlaceController {
  constructor(private readonly placeService: PlaceService) { }

  @MessagePattern('place.get-by-id')
  async get(@Payload() data: { id: string }) {
    return await this.placeService.getById(data.id);
  }
}
