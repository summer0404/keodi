import { ApiProperty } from "@nestjs/swagger";
import { CreateUserDto } from "./user.dto";

export class RegisterDto extends CreateUserDto{}

export class RegisterResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...', description: 'JWT - access token'})
    accessToken: string
}