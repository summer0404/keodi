import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { OwnershipClaimStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';
import { KafkaService } from 'src/providers/kafka/kafka.service';
import {
  OwnershipClaimErrorMessages,
  PlaceErrorMessages,
} from 'src/shared/constants/error.constant';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import {
  CreateOwnershipClaimDto,
  GetMyOwnershipClaimsDto,
  GetOwnershipClaimsDto,
  RejectOwnershipClaimDto,
} from 'src/shared/dtos/ownership-claim.dto';
import { handleServiceErrorCatching } from 'src/shared/utils/error.util';

@Injectable()
export class OwnershipClaimService {
  private readonly logger = new Logger(OwnershipClaimService.name);

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
          message: PlaceErrorMessages.PLACE_NOT_FOUND,
        });
      }

      const existingClaim = await this.prismaService.ownershipClaim.findFirst({
        where: {
          userId: createOwnershipClaimDto.userId,
          placeId: createOwnershipClaimDto.placeId,
          status: {
            in: [
              OwnershipClaimStatus.PENDING,
              OwnershipClaimStatus.DISPUTED,
              OwnershipClaimStatus.APPROVED,
            ],
          },
        },
      });

      if (existingClaim) {
        const message =
          existingClaim.status === OwnershipClaimStatus.APPROVED
            ? OwnershipClaimErrorMessages.CLAIM_ALREADY_APPROVED
            : OwnershipClaimErrorMessages.CLAIM_ALREADY_EXISTS;
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message,
        });
      }

      const initialStatus = place.ownerId
        ? OwnershipClaimStatus.DISPUTED
        : OwnershipClaimStatus.PENDING;

      const claim = await this.prismaService.ownershipClaim.create({
        data: {
          ...createOwnershipClaimDto,
          status: initialStatus,
        },
      });

      if (initialStatus === OwnershipClaimStatus.DISPUTED && place.ownerId) {
        this.kafkaService
          .getClient()
          .emit(NotificationTopics.OwnershipClaimDisputed, {
            to: place.ownerId,
            placeName: place.name,
          });
      }

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
        include: {
          place: { select: { id: true, name: true, ownerId: true } },
        },
      });

      if (!claim) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: OwnershipClaimErrorMessages.CLAIM_NOT_FOUND,
        });
      }

      if (
        claim.status === OwnershipClaimStatus.APPROVED ||
        claim.status === OwnershipClaimStatus.REJECTED
      ) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: OwnershipClaimErrorMessages.CLAIM_ALREADY_REVIEWED,
        });
      }

      const siblingClaims = await this.prismaService.ownershipClaim.findMany({
        where: {
          placeId: claim.placeId,
          id: { not: claim.id },
          status: {
            in: [OwnershipClaimStatus.PENDING, OwnershipClaimStatus.DISPUTED],
          },
        },
        select: { id: true, userId: true },
      });

      await this.prismaService.$transaction(async (prisma) => {
        await prisma.ownershipClaim.update({
          where: { id: claim.id },
          data: {
            status: OwnershipClaimStatus.APPROVED,
            rejectionReason: null,
            reviewedAt: new Date(),
          },
        });

        await prisma.place.update({
          where: { id: claim.placeId },
          data: { ownerId: claim.userId },
        });

        if (siblingClaims.length > 0) {
          await prisma.ownershipClaim.updateMany({
            where: { id: { in: siblingClaims.map((c) => c.id) } },
            data: {
              status: OwnershipClaimStatus.REJECTED,
              rejectionReason: 'Another claim for this place was approved',
              reviewedAt: new Date(),
            },
          });
        }
      });

      this.kafkaService
        .getClient()
        .emit(NotificationTopics.OwnershipClaimApproved, {
          to: claim.userId,
        });

      const previousOwnerId = claim.place.ownerId;
      if (previousOwnerId && previousOwnerId !== claim.userId) {
        this.kafkaService
          .getClient()
          .emit(NotificationTopics.OwnershipRevoked, {
            to: previousOwnerId,
            placeName: claim.place.name,
          });
      }

      for (const sibling of siblingClaims) {
        this.kafkaService
          .getClient()
          .emit(NotificationTopics.OwnershipClaimRejected, {
            to: sibling.userId,
            reason: 'Another claim for this place was approved',
          });
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

      if (
        claim.status === OwnershipClaimStatus.REJECTED ||
        claim.status === OwnershipClaimStatus.APPROVED
      ) {
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

      this.kafkaService
        .getClient()
        .emit(NotificationTopics.OwnershipClaimRejected, {
          to: claim.userId,
          reason: data.reason,
        });

      return {
        message: 'Ownership claim rejected successfully',
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getClaims(data: GetOwnershipClaimsDto) {
    try {
      const { page, limit, sortOrder, status } = data;
      const skip = (page - 1) * limit;

      const claimWhere = status ? { status } : {};

      const placeWhere = { ownershipClaims: { some: claimWhere } };

      const [places, total] = await Promise.all([
        this.prismaService.place.findMany({
          where: placeWhere,
          select: {
            id: true,
            name: true,
            ownerId: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
              },
            },
            ownershipClaims: {
              where: claimWhere,
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                  },
                },
              },
              orderBy: { createdAt: sortOrder },
            },
          },
          skip,
          take: limit,
        }),
        this.prismaService.place.count({ where: placeWhere }),
      ]);

      return {
        data: places,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return handleServiceErrorCatching(error);
    }
  }

  async getMyClaims(data: GetMyOwnershipClaimsDto) {
    try {
      const { userId, page, limit, sortOrder, status } = data;
      const skip = (page - 1) * limit;

      const where = {
        userId,
        ...(status ? { status } : {}),
      };

      const [claims, total] = await Promise.all([
        this.prismaService.ownershipClaim.findMany({
          where,
          include: {
            place: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: sortOrder },
          skip,
          take: limit,
        }),
        this.prismaService.ownershipClaim.count({ where }),
      ]);

      return {
        data: claims,
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
