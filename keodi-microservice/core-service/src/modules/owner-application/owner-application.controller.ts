import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OwnerApplicationTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnerApplicationDto,
  GetOwnerApplicationsDto,
  RejectOwnerApplicationDto,
  ResubmitOwnerApplicationDto,
} from 'src/shared/dtos/owner-application.dto';
import { OwnerApplicationService } from './owner-application.service';

@Controller()
export class OwnerApplicationController {
  constructor(
    private readonly ownerApplicationService: OwnerApplicationService,
  ) {}

  @MessagePattern(OwnerApplicationTopics.Create)
  async create(@Payload() data: CreateOwnerApplicationDto) {
    return await this.ownerApplicationService.create(data);
  }

  @MessagePattern(OwnerApplicationTopics.Approve)
  async approve(@Payload() data: { applicationId: string }) {
    return await this.ownerApplicationService.approve(data.applicationId);
  }

  @MessagePattern(OwnerApplicationTopics.Reject)
  async reject(
    @Payload() data: { applicationId: string; data: RejectOwnerApplicationDto },
  ) {
    return await this.ownerApplicationService.reject(
      data.applicationId,
      data.data,
    );
  }

  @MessagePattern(OwnerApplicationTopics.GetAll)
  async getAll(@Payload() data: GetOwnerApplicationsDto) {
    return await this.ownerApplicationService.getAll(data);
  }

  @MessagePattern(OwnerApplicationTopics.Resubmit)
  async resubmit(@Payload() data: ResubmitOwnerApplicationDto) {
    return await this.ownerApplicationService.resubmit(data);
  }

  @MessagePattern(OwnerApplicationTopics.GetMe)
  async getMe(@Payload() data: { userId: string }) {
    return await this.ownerApplicationService.getStatusByUserId(data.userId);
  }
}
