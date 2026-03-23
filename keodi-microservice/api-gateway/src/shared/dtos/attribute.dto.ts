import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class CreateAttributeDto {
  @ApiProperty({
    description: 'The name of the attribute',
    example: ['ALCOHOL_VARIETY', 'HAPPY_HOUR_VALUE'],
    type: [String],
    required: true,
  })
  @IsArray()
  name: string[];
}
