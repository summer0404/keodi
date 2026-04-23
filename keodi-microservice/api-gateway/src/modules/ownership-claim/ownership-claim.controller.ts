import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Role } from 'src/shared/enums/role.enum';
import {
  CreateOwnershipClaimDto,
  GetOwnershipClaimsDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';
import { OwnershipClaimService } from './ownership-claim.service';
import {
  ApiApproveOwnershipClaim,
  ApiCreateOwnershipClaim,
  ApiGetOwnershipClaims,
  ApiRejectOwnershipClaim,
} from './ownership-claim.swagger';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';

@ApiTags('Ownership Claims')
@ApiBearerAuth('access-token')
@Controller('ownership-claims')
export class OwnershipClaimController {
  constructor(private readonly ownershipClaimService: OwnershipClaimService) {}

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.OWNER)
  @Post()
  @ApiCreateOwnershipClaim()
  async create(
    @CurrentUser() user: CurrentUserDto,
    @Body() createOwnershipClaimDto: CreateOwnershipClaimDto,
  ) {
    return await this.ownershipClaimService.create(user.id, createOwnershipClaimDto);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/approve')
  @ApiApproveOwnershipClaim()
  async approve(@Param('id') claimId: string) {
    return await this.ownershipClaimService.approve(claimId);
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Post(':id/reject')
  @ApiRejectOwnershipClaim()
  async reject(
    @Param('id') claimId: string,
    @Body() rejectOwnershipClaimDto: RejectOwnershipClaimDto,
  ) {
    return await this.ownershipClaimService.reject(
      claimId,
      rejectOwnershipClaimDto,
    );
  }

  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  @Get()
  @ApiGetOwnershipClaims()
  async getAll(@Query() query: GetOwnershipClaimsDto) {
    return await this.ownershipClaimService.getAll(query);
  }
}