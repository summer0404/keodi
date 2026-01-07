import { Controller, Param, Patch, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @SkipAuth() // Skip authentication for testing purposes - remove in production
  @Patch(':userId/unverify')
  @ApiOperation({ description: 'Use this API to mark user as unverified account'})
  @ApiOkResponse({description: 'Return message inform that unverify user successfully'})
  async unverifyUser(@Param('userId') userId: number){
    return await this.userService.unverifyUser(userId)
  }
}
