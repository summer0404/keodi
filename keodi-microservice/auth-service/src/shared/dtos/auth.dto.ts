import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './user.dto';

export class RegisterDto extends CreateUserDto {}

export class LoginDto extends PickType(RegisterDto, ['username', 'password']) {
  rememberMe?: boolean;
}

export class ForgotPasswordValidateDto extends PickType(RegisterDto, [
  'email',
] as const) {}

export class ResetPasswordValidateDto extends ForgotPasswordValidateDto {}

export class ResetPasswordDto {
  newPassword: string;
  userId: string;
}
