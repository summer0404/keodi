import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './user.dto';

export class RegisterDto extends CreateUserDto {}

export class RegisterOwnerDto extends RegisterDto {
  businessName: string;
  businessPhone: string;
  businessAddress: string;
  taxId: string;
  businessWebsite?: string;
  proofDocumentUrl: string[];
}

export class LoginDto extends PickType(RegisterDto, ['password'] as const) {
  identifier: string;
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
