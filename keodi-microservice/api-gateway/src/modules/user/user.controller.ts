import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentAccessToken } from 'src/common/decorators/current-access-token.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SkipAuth } from 'src/common/decorators/skip-auth.decorator';
import { CategoryOnboardingDto } from 'src/shared/dtos/category.dto';
import {
  CurrentUserDto,
  SearchUsersQueryDto,
  UpdateLocationDto,
  UpdateUsernameDto,
  UpdateUserProfileDto,
} from 'src/shared/dtos/user.dto';
import { UserService } from './user.service';
import {
  ApiGetAllUsers,
  ApiGetOtherProfile,
  ApiOnBoarding,
  ApiSearchUsers,
  ApiUnverifyUser,
  ApiUpdateLocation,
  ApiUpdatePicture,
  ApiUpdateProfile,
  ApiUpdateUsername,
} from './user.swagger';
import { RoleGuard } from 'src/common/guards/role.guard';
import { Role } from 'src/shared/enums/role.enum';
import { Roles } from 'src/common/decorators/role.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @ApiGetAllUsers()
  async getAll() {
    return await this.userService.getAll();
  }

  @ApiBearerAuth('access-token')
  @Get('search')
  @ApiSearchUsers()
  async searchUsers(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: SearchUsersQueryDto,
  ) {
    return await this.userService.searchUsers(
      user.id,
      query.keyword,
      query.page,
      query.limit,
    );
  }

  @ApiBearerAuth('access-token')
  @Get(':userId/profile')
  @ApiGetOtherProfile()
  async getOtherProfile(
    @CurrentUser() user: CurrentUserDto,
    @Param('userId') userId: string,
  ) {
    return await this.userService.getOtherProfile(user.id, userId);
  }

  @UseGuards(RoleGuard)
  @Roles(Role.ADMIN)
  @Patch(':userId/unverify')
  @ApiUnverifyUser()
  async unverifyUser(@Param('userId') userId: string) {
    return await this.userService.unverifyUser(userId);
  }

  @ApiBearerAuth('access-token')
  @Patch('username')
  @ApiUpdateUsername()
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
  @ApiUpdatePicture()
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
  @Patch()
  @ApiUpdateProfile()
  async updateProfile(
    @Body() body: UpdateUserProfileDto,
    @CurrentUser() user: CurrentUserDto,
  ) {
    return await this.userService.updateProfile(user.id, body);
  }

  @ApiBearerAuth('access-token')
  @Patch('onboarding')
  @ApiOnBoarding()
  async onBoarding(
    @CurrentUser() user: CurrentUserDto,
    @Body() data: CategoryOnboardingDto,
  ) {
    return await this.userService.onBoarding(user.id, data.categoryIds);
  }

  @ApiBearerAuth('access-token')
  @Patch('location')
  @ApiUpdateLocation()
  async updateLocation(
    @CurrentUser() user: CurrentUserDto,
    @Body() body: UpdateLocationDto,
  ) {
    await this.userService.updateLocation(
      user.id,
      body.latitude,
      body.longitude,
    );
    return { message: 'LOCATION_UPDATED' };
  }
}
