import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnerApplicationStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnerApplicationErrorMessages } from 'src/shared/constants/error.constant';
import { AuthTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnerApplicationDto,
  GetOwnerApplicationsDto,
  RejectOwnerApplicationDto,
} from 'src/shared/dtos/owner-application.dto';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';

@Injectable()
export class OwnerApplicationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly kafkaService: KafkaService,
  ) { }

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
        data: createOwnerApplicationDto,
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

  async getAll(data: GetOwnerApplicationsDto) {
    try {
      const { page, limit, sortOrder, status } = data;
      const skip = (page - 1) * limit;

      const where = status ? { status } : {};

      const [applications, total] = await Promise.all([
        this.prismaService.ownerApplication.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: sortOrder },
          skip,
          take: limit,
        }),
        this.prismaService.ownerApplication.count({ where }),
      ]);

      return {
        data: applications,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}
