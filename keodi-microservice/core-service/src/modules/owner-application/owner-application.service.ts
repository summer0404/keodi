import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnerApplicationStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationErrorMessages } from 'src/shared/constants/error.constant';
import { AuthTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnerApplicationDto,
  RejectOwnerApplicationDto,
} from 'src/shared/dtos/owner-application.dto';
import { handleServiceErrorCatching } from 'src/shared/helpers/error.helper';

@Injectable()
export class OwnerApplicationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(createOwnerApplicationDto: CreateOwnerApplicationDto) {
    try {
      const existingOwnerApplication =
        await this.prismaService.ownerApplication.findUnique({
          where: {
            userId: createOwnerApplicationDto.userId,
          },
        });

      if (existingOwnerApplication)
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: OwnerApplicationErrorMessages.OWNER_APPLICATION_ALREADY_EXISTS,
        });

      const ownerApplication = await this.prismaService.ownerApplication.create({
        data: {
          userId: createOwnerApplicationDto.userId,
          businessName: createOwnerApplicationDto.businessName,
          businessPhone: createOwnerApplicationDto.businessPhone,
          businessAddress: createOwnerApplicationDto.businessAddress,
          taxId: createOwnerApplicationDto.taxId,
          businessWebsite: createOwnerApplicationDto.businessWebsite,
          proofDocumentUrls: createOwnerApplicationDto.proofDocumentUrl,
        },
      });

      return {
        message: 'Owner application created successfully',
        ownerApplicationId: ownerApplication.id,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async approve(applicationId: string) {
    try {
      const ownerApplication = await this.prismaService.ownerApplication.findUnique({
        where: {
          id: applicationId,
        },
      });

      if (!ownerApplication)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnerApplicationErrorMessages.OWNER_APPLICATION_NOT_FOUND,
        });

      if (ownerApplication.status !== OwnerApplicationStatus.PENDING)
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message:
            OwnerApplicationErrorMessages.OWNER_APPLICATION_ALREADY_REVIEWED,
        });

      await this.prismaService.ownerApplication.update({
        where: {
          id: ownerApplication.id,
        },
        data: {
          status: OwnerApplicationStatus.APPROVED,
          rejectionReason: null,
          reviewedAt: new Date(),
        },
      });

      try {
        await this.kafkaService.sendWithTimeout(AuthTopics.ApproveOwner, {
          userId: ownerApplication.userId,
        });
      } catch (error) {
        await this.prismaService.ownerApplication.update({
          where: {
            id: ownerApplication.id,
          },
          data: {
            status: OwnerApplicationStatus.PENDING,
            rejectionReason: null,
            reviewedAt: null,
          },
        });
        throw error;
      }

      return {
        message: 'Owner application approved successfully',
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async reject(applicationId: string, rejectOwnerApplicationDto: RejectOwnerApplicationDto) {
    try {
      const ownerApplication = await this.prismaService.ownerApplication.findUnique({
        where: {
          id: applicationId,
        },
      });

      if (!ownerApplication)
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnerApplicationErrorMessages.OWNER_APPLICATION_NOT_FOUND,
        });

      if (ownerApplication.status !== OwnerApplicationStatus.PENDING)
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message:
            OwnerApplicationErrorMessages.OWNER_APPLICATION_ALREADY_REVIEWED,
        });

      await this.prismaService.ownerApplication.update({
        where: {
          id: ownerApplication.id,
        },
        data: {
          status: OwnerApplicationStatus.REJECTED,
          rejectionReason: rejectOwnerApplicationDto.reason,
          reviewedAt: new Date(),
        },
      });

      try {
        await this.kafkaService.sendWithTimeout(AuthTopics.RejectOwner, {
          userId: ownerApplication.userId,
          reason: rejectOwnerApplicationDto.reason,
        });
      } catch (error) {
        await this.prismaService.ownerApplication.update({
          where: {
            id: ownerApplication.id,
          },
          data: {
            status: OwnerApplicationStatus.PENDING,
            rejectionReason: null,
            reviewedAt: null,
          },
        });
        throw error;
      }

      return {
        message: 'Owner application rejected successfully',
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
