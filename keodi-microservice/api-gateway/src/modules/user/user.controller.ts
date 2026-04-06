import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CurrentAccessToken } from 'src/common/decorators/current-access-token.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SkipAuth } from 'src/common/decorators/skip-auth.decorator';
import { CategoryOnboardingDto } from 'src/shared/dtos/category.dto';
import {
  CurrentUserDto,
  UpdateLocationDto,
  UpdateUsernameDto,
  UpdateUserProfileDto,
} from 'src/shared/dtos/user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @SkipAuth() //Used for testing purposes - need to authorization this endpoint to admin later
  @Get('all')
  @ApiOperation({ description: 'Get all users (for testing purposes)' })
  @ApiOkResponse({ description: 'Return list of all users with their IDs' })
  async getAll() {
    return await this.userService.getAll();
  }

  @ApiBearerAuth('access-token')
  @Get(':userId/profile')
  @ApiOperation({
    description:
      'Get another user profile with privacy filtering and friendship status',
  })
  @ApiOkResponse({
    description:
      'Return profile data based on profile visibility settings and relationship',
  })
  async getOtherProfile(
    @CurrentUser() user: CurrentUserDto,
    @Param('userId') userId: string,
  ) {
    return await this.userService.getOtherProfile(user.id, userId);
  }

  @SkipAuth() // Skip authentication for testing purposes - remove in production
  @Patch(':userId/unverify')
  @ApiOperation({
    description: 'Use this API to mark user as unverified account',
  })
  @ApiOkResponse({
    description: 'Return message inform that unverify user successfully',
  })
  async unverifyUser(@Param('userId') userId: string) {
    return await this.userService.unverifyUser(userId);
  }

  @ApiBearerAuth('access-token')
  @Patch('username')
  @ApiOperation({ description: 'Use this API to update username of a user' })
  @ApiOkResponse({
    description: 'Return message inform that update username successfully',
  })
  async updateUsername(
    @CurrentAccessToken() accessToken: string,
    @CurrentUser() user: CurrentUserDto,
    @Body() data: UpdateUsernameDto,
  ) {
    return await this.userService.updateUsername(
      user.id,
      data.username,
      accessToken,
    );
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
  @ApiOperation({
    description: 'Use this API to update profile picture of a user',
  })
  @ApiOkResponse({
    description:
      'Return message inform that update profile picture successfully',
  })
  async updatePicture(
    @CurrentUser() user: CurrentUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.userService.updatePicture(
      user.id,
      file.buffer,
      file.mimetype,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Use this API to update profile of a user' })
  @ApiOkResponse({
    description: 'Return message inform that update profile successfully',
  })
  @Patch()
  async updateProfile(
    @Body() body: UpdateUserProfileDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.userService.updateProfile(user.id, body);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    description: 'Use this API to onboarding user with selected categories',
  })
  @ApiOkResponse({
    description: 'Return message inform that onboarding user successfully',
  })
  @Patch('onboarding')
  async onBoarding(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CategoryOnboardingDto,
  ) {
    return await this.userService.onBoarding(user.id, data.categoryIds);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ description: 'Update user current location for background notifications' })
  @ApiOkResponse({ description: 'Location updated' })
  @Patch('location')
  async updateLocation(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: UpdateLocationDto,
  ) {
    await this.userService.updateLocation(user.id, body.latitude, body.longitude);
    return { message: 'LOCATION_UPDATED' };
  }
}
