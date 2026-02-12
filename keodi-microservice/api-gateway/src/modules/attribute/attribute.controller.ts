import { Body, Controller, Post } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { SkipAuth } from 'src/common/decorators/skip-auth.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAttributeDto } from 'src/common/dtos/attribute.dto';

@ApiBearerAuth('access-token')
@ApiTags('Attributes')
@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @SkipAuth()
  @Post()
  async create(@Body() createAttributeDto: CreateAttributeDto) {
    return await this.attributeService.create(createAttributeDto);
  }
}
