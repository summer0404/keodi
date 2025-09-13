import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator"

export class CreateUserDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({ example: 'abc123', description: 'Tên đăng nhập' })
    username: string

    @IsNotEmpty()
    @IsString()
    @MinLength(8, { message: 'Mật khẩu có ít nhất 8 ký tự' })
    @Matches(/.*[A-Z].*/, { message: 'Mật khẩu phải chứa ít nhất 1 chữ hoa' })
    @Matches(/.*\d.*/, { message: 'Mật khẩu phải chứa ít nhất 1 số' })
    @Matches(/.*[@$!%*?&].*/, { message: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt' })
    @ApiProperty({ example: 'Abc123!@#', description: 'Mật khẩu (tối thiểu 8 ký tự, gồm ít nhất 1 chữ hoa, 1 số, 1 ký tự đặc biệt)' })
    password: string

    @IsEmail()
    @IsNotEmpty()
    @ApiProperty({ example: 'hello@example.com', description: 'Email người dùng' })
    email: string
}