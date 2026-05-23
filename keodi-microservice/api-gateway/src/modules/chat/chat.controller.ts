import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  AddMembersDto,
  CreateConversationDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from 'src/shared/dtos/chat.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { NotificationTopics } from 'src/shared/constants/topic.constant';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import {
  ApiAddMembers,
  ApiCreateConversation,
  ApiDeleteMessage,
  ApiGetConversation,
  ApiLeaveConversation,
  ApiListConversations,
  ApiListMessages,
  ApiSendMessage,
  ApiUpdateConversation,
} from './chat.swagger';

@ApiTags('Chat')
@ApiBearerAuth('access-token')
@Controller('conversations')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ── REST endpoints ──────────────────────────────────────────────────────────

  @Post()
  @ApiCreateConversation()
  createConversation(
    @CurrentUser() user: CurrentUserDto,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get()
  @ApiListConversations()
  listConversations(
    @CurrentUser() user: CurrentUserDto,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.chatService.listConversations(user.id, query);
  }

  @Get(':id')
  @ApiGetConversation()
  getConversation(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(user.id, id);
  }

  @Patch(':id')
  @ApiUpdateConversation()
  updateConversation(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.chatService.updateConversation(user.id, id, dto);
  }

  @Get(':id/messages')
  @ApiListMessages()
  listMessages(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.chatService.listMessages(user.id, id, query);
  }

  @Post(':id/messages')
  @UseInterceptors(FileInterceptor('file'))
  @ApiSendMessage()
  sendMessage(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.chatService.sendMessage(user.id, id, dto, file);
  }

  @Delete(':id/messages/:msgId')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteMessage()
  deleteMessage(
    @CurrentUser() user: CurrentUserDto,
    @Param('msgId') msgId: string,
  ) {
    return this.chatService.deleteMessage(user.id, msgId);
  }

  @Post(':id/members')
  @ApiAddMembers()
  addMembers(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addMembers(user.id, id, dto);
  }

  @Delete(':id/members/me')
  @HttpCode(HttpStatus.OK)
  @ApiLeaveConversation()
  leaveConversation(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
  ) {
    return this.chatService.leaveConversation(user.id, id);
  }

  // ── Kafka EventPattern consumer ──────────────────────────────────────────────

  @EventPattern(NotificationTopics.ChatRealtimePush)
  async realtimePush(
    @Payload() payload: { conversationId: string; event: string; payload: any },
  ) {
    this.chatGateway.broadcastToRoom(payload.conversationId, payload.event, payload.payload);
  }
}
