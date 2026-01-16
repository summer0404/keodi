import {
  Body,
  Controller,
  FileTypeValidator,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse
} from '@nestjs/swagger';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import {
  CurrentUserDto,
  UpdateUsernameDto,
  UpdateUserProfileDto
} from 'src/dtos/user.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { CurrentAccessToken } from 'src/decorators/current-access-token.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

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

  @ApiBearerAuth('access-token')
  @Patch('picture')
  @UseInterceptors(FileInterceptor('picture'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        picture: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ description: 'Use this API to update profile picture of a user' })
  @ApiOkResponse({ description: 'Return message inform that update profile picture successfully' })
  async updatePicture(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ })],
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
      })
    ) file: Express.Multer.File,
  ) {
    return await this.userService.updatePicture(
      user.id,
      file.buffer,
      file.mimetype,
    )
  }


  @ApiBearerAuth('access-token')
  @ApiOperation({ description: "Use this API to update profile of a user"})
  @ApiResponse({ description: 'Return message inform that update profile successfully' })
  @Patch()
  async updateProfile (@Body() body: UpdateUserProfileDto, @CurrentUser() user: CurrentUserDto) {
    return await this.userService.updateProfile(user.id, body)
  }
}
