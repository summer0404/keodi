import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectOwnerApplicationDto {
  @ApiProperty({
    example: 'Your submitted business license is expired. Please resubmit a valid document.',
  })
  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class OwnerApplicationActionResponseDto {
  @ApiProperty({ example: 'Owner application approved successfully' })
  message: string;
}
