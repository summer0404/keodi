import { PickType } from '@nestjs/mapped-types';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FriendSortBy, PlaceSortBy } from '../enums/sort.enum';
import { PaginationQueryDto } from './pagination.dto';

export class CreateUserDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  username: string;

  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  picture?: string;
}

export class SyncUsernameDto extends PickType(CreateUserDto, [
  'userId',
  'username',
] as const) {}

export class CreateUserProfileDto {
  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsNotEmpty()
  @MaxLength(12)
  @MinLength(9)
  phoneNumber: string;

  @IsNotEmpty()
  @IsDate()
  dateOfBirth: Date;
}
export class UpdateUserProfileDto {
  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  @MaxLength(12)
  @MinLength(9)
  phoneNumber?: string;

  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;
}

export class UserCommonPaginationDto extends PaginationQueryDto {
  @IsNotEmpty()
  userId: string;
}

export class SearchOthersDto extends UserCommonPaginationDto {
  @IsNotEmpty()
  @IsString()
  keyword!: string;
}

export class FriendPaginationDto extends UserCommonPaginationDto {
  @IsEnum(FriendSortBy)
  sortBy: FriendSortBy = FriendSortBy.NAME;
}

export class FavoritePlacesPaginationDto extends UserCommonPaginationDto {
  @IsEnum(PlaceSortBy)
  sortBy: PlaceSortBy = PlaceSortBy.DISTANCE;
}
