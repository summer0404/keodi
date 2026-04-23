import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OwnershipClaimTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnershipClaimDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';
import { OwnershipClaimService } from './ownership-claim.service';

@Controller()
export class OwnershipClaimController {
  constructor(private readonly ownershipClaimService: OwnershipClaimService) {}

  @MessagePattern(OwnershipClaimTopics.Create)
  async create(@Payload() data: CreateOwnershipClaimDto) {
    return await this.ownershipClaimService.create(data);
  }

  @MessagePattern(OwnershipClaimTopics.Approve)
  async approve(@Payload() data: { claimId: string }) {
    return await this.ownershipClaimService.approve(data.claimId);
  }

  @MessagePattern(OwnershipClaimTopics.Reject)
  async reject(
    @Payload() data: { claimId: string; data: RejectOwnershipClaimDto },
  ) {
    return await this.ownershipClaimService.reject(data.claimId, data.data);
  }

  @MessagePattern(OwnershipClaimTopics.GetPending)
  async getPendingClaims(@Payload() data: any) {
    return await this.ownershipClaimService.getPendingClaims(data);
  }
}