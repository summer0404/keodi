import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AttributeService } from './attribute.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateAttributeDto } from 'src/shared/dtos/attribute.dto';
import { ApiCreateAttributes } from './attribute.swagger';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { Role } from 'src/shared/enums/role.enum';

@ApiBearerAuth('access-token')
@ApiTags('Attributes')
@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post()
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ApiCreateAttributes()
  async create(@Body() createAttributeDto: CreateAttributeDto) {
    return await this.attributeService.create(createAttributeDto);
  }
}
