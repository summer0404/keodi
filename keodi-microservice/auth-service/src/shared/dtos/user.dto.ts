import { Role } from '@prisma/client';

export class UserDto {
    id: string;
    username: string;
    email: string;
    role: Role;
    password: string;
    refreshToken: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class CreateUserDto {
    username: string
    password: string
    email: string
}
