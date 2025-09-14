export class UserDto{
    id: number
    username: string
    password: string
    email: string
    refreshToken: string | null
}

export class CreateUserDto {
    username: string
    password: string
    email: string
}