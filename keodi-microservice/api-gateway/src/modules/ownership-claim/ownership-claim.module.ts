import { Module } from '@nestjs/common';
import { OwnershipClaimController } from './ownership-claim.controller';
import { OwnershipClaimService } from './ownership-claim.service';

@Module({
  controllers: [OwnershipClaimController],
  providers: [OwnershipClaimService],
})
export class OwnershipClaimModule {}