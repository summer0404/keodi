import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import {
  GetOwnerApplicationsDto,
  RejectOwnerApplicationDto,
  ResubmitOwnerApplicationDto,
} from 'src/shared/dtos/owner-application.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { Role } from 'src/shared/enums/role.enum';
import {
  ApiApproveOwnerApplication,
  ApiGetOwnerApplications,
  ApiRejectOwnerApplication,
  ApiResubmitOwnerApplication,
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
  @Get()
  @ApiGetOwnerApplications()
  async getAll(@Query() query: GetOwnerApplicationsDto) {
    return await this.ownerApplicationService.getAll(query);
  }

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

  @UseGuards(JwtAuthGuard)
  @Put('resubmit')
  @ApiResubmitOwnerApplication()
  async resubmit(
    @CurrentUser() user: CurrentUserDto,
    @Body() resubmitOwnerApplicationDto: ResubmitOwnerApplicationDto,
  ) {
    return await this.ownerApplicationService.resubmit(user.id, resubmitOwnerApplicationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserDto) {
    return await this.ownerApplicationService.getMe(user.id);
  }
}
