import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class UserDto{
    id: number
    username: string
    password: string
    email: string
}

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    username: string
    
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string
    
    @IsEmail()
    email: string
}