import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AddMembersPayloadDto,
  LeaveConversationPayloadDto,
} from 'src/shared/dtos/chat.dto';
import { MemberTopics } from 'src/shared/constants/topic.constant';
import { MemberService } from './member.service';

@Controller()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @MessagePattern(MemberTopics.Add)
  async add(@Payload() payload: AddMembersPayloadDto) {
    return this.memberService.add(payload);
  }

  @MessagePattern(MemberTopics.Leave)
  async leave(@Payload() payload: LeaveConversationPayloadDto) {
    return this.memberService.leave(payload);
  }
}
