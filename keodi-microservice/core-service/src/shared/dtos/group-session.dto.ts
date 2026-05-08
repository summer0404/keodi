import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GetSessionActivitiesDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  guestId?: string;
}

export class LogRecommendationsRefreshedDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  guestId?: string;
}
