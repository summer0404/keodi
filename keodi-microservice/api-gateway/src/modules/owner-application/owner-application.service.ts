import { Injectable } from '@nestjs/common';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationTopics } from 'src/shared/constants/topic.constant';
import { GetOwnerApplicationsDto, RejectOwnerApplicationDto, ResubmitOwnerApplicationDto } from 'src/shared/dtos/owner-application.dto';

@Injectable()
export class OwnerApplicationService {
  constructor(private readonly kafkaService: KafkaService) {}

  async getAll(query: GetOwnerApplicationsDto) {
    return await this.kafkaService.sendWithTimeout(
      OwnerApplicationTopics.GetAll,
      query,
    );
  }

  async approve(applicationId: string) {
    return await this.kafkaService.sendWithTimeout(
      OwnerApplicationTopics.Approve,
      { applicationId },
    );
  }

  async reject(applicationId: string, rejectOwnerApplicationDto: RejectOwnerApplicationDto) {
    return await this.kafkaService.sendWithTimeout(
      OwnerApplicationTopics.Reject,
      { applicationId, data: rejectOwnerApplicationDto },
    );
  }

  async resubmit(userId: string, dto: ResubmitOwnerApplicationDto) {
    return await this.kafkaService.sendWithTimeout(
      OwnerApplicationTopics.Resubmit,
      { userId, ...dto },
    );
  }

  async getMe(userId: string) {
    return await this.kafkaService.sendWithTimeout(
      OwnerApplicationTopics.GetMe,
      { userId },
    );
  }
}
