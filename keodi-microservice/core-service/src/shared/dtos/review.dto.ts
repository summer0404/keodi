import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from './pagination.dto';
import { SortBy } from '../enums/sort.enum';
import { ReviewFlagReason } from '@prisma/client';

export class CreateReviewDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  placeId: string;

  @IsNotEmpty()
  @IsNumber()
  @Max(5)
  @Min(1)
  rating: number;

  @IsOptional()
  text?: string;
}

export class GetReviewsDto extends PaginationQueryDto {
  @IsNotEmpty()
  placeId: string;

  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.CREATED_AT;
}

export class GetOwnerReviewsDto extends PaginationQueryDto {
  @IsNotEmpty()
  ownerId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  responded?: boolean;
}

export class RespondToReviewDto {
  @IsNotEmpty()
  reviewId: string;

  @IsNotEmpty()
  ownerId: string;

  @IsNotEmpty()
  @IsString()
  text: string;
}

export class UpdateResponseDto {
  @IsNotEmpty()
  reviewId: string;

  @IsNotEmpty()
  ownerId: string;

  @IsNotEmpty()
  @IsString()
  text: string;
}

export class DeleteResponseDto {
  @IsNotEmpty()
  reviewId: string;

  @IsNotEmpty()
  ownerId: string;
}

export class FlagReviewDto {
  @IsNotEmpty()
  reviewId: string;

  @IsNotEmpty()
  ownerId: string;

  @IsEnum(ReviewFlagReason)
  reason: ReviewFlagReason;
}

export class ReviewIdDto {
  @IsNotEmpty()
  reviewId: string;
}
