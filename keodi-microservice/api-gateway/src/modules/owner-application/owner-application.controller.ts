import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';
import { RoleGuard } from 'src/common/guards/role.guard';
import { RejectOwnerApplicationDto } from 'src/shared/dtos/owner-application.dto';
import { Role } from 'src/shared/enums/role.enum';
import {
  ApiApproveOwnerApplication,
  ApiRejectOwnerApplication,
} from './owner-application.swagger';
import { OwnerApplicationService } from './owner-application.service';

@ApiTags('Owner Applications')
@ApiBearerAuth('access-token')
@Controller('owner-applications')
export class OwnerApplicationController {
  constructor(
    private readonly ownerApplicationService: OwnerApplicationService,
  ) {}

  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/approve')
  @ApiApproveOwnerApplication()
  async approve(@Param('id') ownerApplicationId: string) {
    return await this.ownerApplicationService.approve(ownerApplicationId);
  }

  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/reject')
  @ApiRejectOwnerApplication()
  async reject(
    @Param('id') ownerApplicationId: string,
    @Body() rejectOwnerApplicationDto: RejectOwnerApplicationDto,
  ) {
    return await this.ownerApplicationService.reject(
      ownerApplicationId,
      rejectOwnerApplicationDto,
    );
  }
}
