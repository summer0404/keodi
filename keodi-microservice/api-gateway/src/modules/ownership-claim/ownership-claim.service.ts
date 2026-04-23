import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnershipClaimTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnershipClaimDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';

@Injectable()
export class OwnershipClaimService {
  constructor(private readonly kafkaService: KafkaService) {}

  async create(userId: string, createOwnershipClaimDto: CreateOwnershipClaimDto) {
    return await this.kafkaService.sendWithTimeout(
      OwnershipClaimTopics.Create,
      { ...createOwnershipClaimDto, userId },
    );
  }

  async approve(claimId: string) {
    return await this.kafkaService.sendWithTimeout(
      OwnershipClaimTopics.Approve,
      { claimId },
    );
  }

  async reject(claimId: string, rejectOwnershipClaimDto: RejectOwnershipClaimDto) {
    return await this.kafkaService.sendWithTimeout(
      OwnershipClaimTopics.Reject,
      { claimId, data: rejectOwnershipClaimDto },
    );
  }

  async getPendingClaims(status?: string) {
    return await this.kafkaService.sendWithTimeout(
      OwnershipClaimTopics.GetPending,
      { status },
    );
  }
}