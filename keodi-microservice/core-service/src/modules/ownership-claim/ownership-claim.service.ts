import { HttpStatus, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnershipClaimStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import { OwnershipClaimErrorMessages } from 'src/shared/constants/error.constant';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnershipClaimDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';

@Injectable()
export class OwnershipClaimService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly kafkaService: KafkaService,
  ) {}

  async create(createOwnershipClaimDto: CreateOwnershipClaimDto) {
    try {
      const place = await this.prismaService.place.findUnique({
        where: { id: createOwnershipClaimDto.placeId },
      });

      if (!place) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnershipClaimErrorMessages.PLACE_NOT_FOUND,
        });
      }

      const existingPendingClaim = await this.prismaService.ownershipClaim.findFirst({
        where: {
          userId: createOwnershipClaimDto.userId,
          placeId: createOwnershipClaimDto.placeId,
          status: OwnershipClaimStatus.PENDING,
        },
      });

      if (existingPendingClaim) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: OwnershipClaimErrorMessages.CLAIM_ALREADY_EXISTS,
        });
      }

      const initialStatus = place.ownerId 
        ? OwnershipClaimStatus.DISPUTED 
        : OwnershipClaimStatus.PENDING;

      const claim = await this.prismaService.ownershipClaim.create({
        data: {
          userId: createOwnershipClaimDto.userId,
          placeId: createOwnershipClaimDto.placeId,
          relationship: createOwnershipClaimDto.relationship,
          proofDocumentUrls: createOwnershipClaimDto.proofDocumentUrls,
          note: createOwnershipClaimDto.note,
          status: initialStatus,
        },
      });

      return {
        message: 'Ownership claim submitted successfully',
        claimId: claim.id,
        status: claim.status,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async approve(claimId: string) {
    try {
      const claim = await this.prismaService.ownershipClaim.findUnique({
        where: { id: claimId },
      });

      if (!claim) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnershipClaimErrorMessages.CLAIM_NOT_FOUND,
        });
      }

      if (claim.status === OwnershipClaimStatus.APPROVED) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: OwnershipClaimErrorMessages.CLAIM_ALREADY_REVIEWED,
        });
      }

      await this.prismaService.$transaction(async (prisma) => {
        // Update the claim
        await prisma.ownershipClaim.update({
          where: { id: claim.id },
          data: {
            status: OwnershipClaimStatus.APPROVED,
            rejectionReason: null,
            reviewedAt: new Date(),
          },
        });

        // Set the owner of the place
        await prisma.place.update({
          where: { id: claim.placeId },
          data: { ownerId: claim.userId },
        });
      });

      try {
        await this.kafkaService.sendWithTimeout(NotificationTopics.OwnershipClaimApproved, {
          userId: claim.userId,
          placeId: claim.placeId,
        });
      } catch (err) {
        console.error('Failed to send approve notification', err);
      }

      return {
        message: 'Ownership claim approved successfully',
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async reject(claimId: string, data: RejectOwnershipClaimDto) {
    try {
      const claim = await this.prismaService.ownershipClaim.findUnique({
        where: { id: claimId },
      });

      if (!claim) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnershipClaimErrorMessages.CLAIM_NOT_FOUND,
        });
      }

      if (claim.status === OwnershipClaimStatus.REJECTED || claim.status === OwnershipClaimStatus.APPROVED) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: OwnershipClaimErrorMessages.CLAIM_ALREADY_REVIEWED,
        });
      }

      await this.prismaService.ownershipClaim.update({
        where: { id: claim.id },
        data: {
          status: OwnershipClaimStatus.REJECTED,
          rejectionReason: data.reason,
          reviewedAt: new Date(),
        },
      });

      try {
        await this.kafkaService.sendWithTimeout(NotificationTopics.OwnershipClaimRejected, {
          userId: claim.userId,
          placeId: claim.placeId,
          reason: data.reason,
        });
      } catch (err) {
        console.error('Failed to send reject notification', err);
      }

      return {
        message: 'Ownership claim rejected successfully',
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getPendingClaims(data: any) {
    try {
      const status = data?.status as OwnershipClaimStatus || OwnershipClaimStatus.PENDING;
      const claims = await this.prismaService.ownershipClaim.findMany({
        where: { status },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            }
          },
          place: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: {
          createdAt: 'asc',
        }
      });

      return {
        data: claims,
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }
}