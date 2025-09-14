import { ApiProperty, PartialType, PickType } from "@nestjs/swagger";
import { CreateUserDto } from "./user.dto";
import { IsNotEmpty, IsString } from "class-validator";

export class RegisterDto extends CreateUserDto{}

export class LoginDto extends PickType(RegisterDto, ['username', 'password'] as const){}

export class AuthResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6...', description: 'JWT - access token'})
    accessToken: string
}