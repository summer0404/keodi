export class UserDto {
    id: number;
    username: string;
    email: string;
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