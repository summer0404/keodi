import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { GetNotificationInboxQueryDto } from 'src/shared/dtos/notification-inbox.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { NotificationInboxService } from './notification-inbox.service';
import {
  ApiGetNotificationInbox,
  ApiGetUnreadCount,
  ApiMarkAllNotificationsAsRead,
  ApiMarkNotificationAsRead,
} from './notification-inbox.swagger';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('access-token')
export class NotificationInboxController {
  constructor(private readonly notificationInboxService: NotificationInboxService) {}

  @Get()
  @ApiGetNotificationInbox()
  async getInbox(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: GetNotificationInboxQueryDto,
  ) {
    return this.notificationInboxService.getInbox(user.id, query);
  }

  @Get('unread-count')
  @ApiGetUnreadCount()
  async getUnreadCount(@CurrentUser() user: CurrentUserDto) {
    return this.notificationInboxService.getUnreadCount(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiMarkNotificationAsRead()
  async markAsRead(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.notificationInboxService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiMarkAllNotificationsAsRead()
  async markAllAsRead(@CurrentUser() user: CurrentUserDto) {
    return this.notificationInboxService.markAllAsRead(user.id);
  }
}
