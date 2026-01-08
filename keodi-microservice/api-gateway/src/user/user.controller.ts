import { Body, Controller, Param, Patch, Query, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { CurrentUserDto, UpdateUsernameDto } from 'src/dtos/user.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { CurrentAccessToken } from 'src/decorators/current-access-token.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @SkipAuth() // Skip authentication for testing purposes - remove in production
  @Patch(':userId/unverify')
  @ApiOperation({ description: 'Use this API to mark user as unverified account' })
  @ApiOkResponse({ description: 'Return message inform that unverify user successfully' })
  async unverifyUser(@Param('userId') userId: number) {
    return await this.userService.unverifyUser(userId)
  }

  @ApiBearerAuth('access-token')
  @Patch('username')
  @ApiOperation({ description: 'Use this API to update username of a user' })
  @ApiOkResponse({ description: 'Return message inform that update username successfully' })
  async updateUsername(
    @CurrentAccessToken() accessToken: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() data: UpdateUsernameDto,
  ) {
    return await this.userService.updateUsername(user.id, data.username, accessToken)
  }
}
