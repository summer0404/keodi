import { ApiProperty } from "@nestjs/swagger";

export class CreateAttributeDto {
  @ApiProperty({
    description: 'The name of the attribute',
    example: ['ALCOHOL_VARIETY', 'HAPPY_HOUR_VALUE']
  })
  name: string[] 
}