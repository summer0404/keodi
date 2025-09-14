import { PickType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./user.dto";

export class RegisterDto extends CreateUserDto{}

export class LoginDto extends PickType(RegisterDto, ['username', 'password']){}