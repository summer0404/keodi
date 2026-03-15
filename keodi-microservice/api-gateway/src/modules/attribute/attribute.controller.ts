import { Body, Controller, Post } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { SkipAuth } from 'src/common/decorators/skip-auth.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';
import { ApiCreateAttributes } from './attribute.swagger';

@ApiBearerAuth('access-token')
@ApiTags('Attributes')
@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @SkipAuth()
  @Post()
  @ApiCreateAttributes()
  async create(@Body() createAttributeDto: CreateAttributeDto) {
    return await this.attributeService.create(createAttributeDto);
  }
}
