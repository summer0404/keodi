import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { KAFKA_TIMEOUT_MS } from 'src/shared/constants/kafka.constant';
import {
  AuthTopics,
  UserTopics,
  PlaceTopics,
  RecommendationTopics,
  FavoriteTopics,
  CategoryTopics,
  FriendTopics,
  GroupSessionTopics,
  SearchTopics,
  SettingTopics,
  AttributeTopics,
  ReviewTopics,
} from 'src/shared/constants/topic.constant';

@Injectable()
export class KafkaService implements OnModuleInit {
  private readonly logger = new Logger(KafkaService.name);

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    //auth topic
    this.kafkaClient.subscribeToResponseOf(AuthTopics.Register);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.Login);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.Google);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ForgotPasswordOtp);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ResetPasswordOtp);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ValidateOtp);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ResetPassword);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.VerifyEmail);
    this.kafkaClient.subscribeToResponseOf(
      AuthTopics.ExternalResendVerifyEmail,
    );
    this.kafkaClient.subscribeToResponseOf(AuthTopics.ResendVerifyEmail);
    this.kafkaClient.subscribeToResponseOf(AuthTopics.Refresh);

    //user topic
    this.kafkaClient.subscribeToResponseOf(UserTopics.GetAll);
    this.kafkaClient.subscribeToResponseOf(UserTopics.Unverify);
    this.kafkaClient.subscribeToResponseOf(UserTopics.UpdateUsername);
    this.kafkaClient.subscribeToResponseOf(UserTopics.UpdatePicture);
    this.kafkaClient.subscribeToResponseOf(UserTopics.Get);
    this.kafkaClient.subscribeToResponseOf(UserTopics.UpdateProfile);
    this.kafkaClient.subscribeToResponseOf(UserTopics.Onboarding);
    this.kafkaClient.subscribeToResponseOf(UserTopics.GetOtherProfile);

    //place topic
    this.kafkaClient.subscribeToResponseOf(PlaceTopics.GetById);
    this.kafkaClient.subscribeToResponseOf(PlaceTopics.NearMe);
    this.kafkaClient.subscribeToResponseOf(PlaceTopics.Search);
    this.kafkaClient.subscribeToResponseOf(RecommendationTopics.Trending);
    this.kafkaClient.subscribeToResponseOf(RecommendationTopics.ForYou);
    this.kafkaClient.subscribeToResponseOf(
      RecommendationTopics.GroupSessionGetRecommendations,
    );

    //favorite topic
    this.kafkaClient.subscribeToResponseOf(FavoriteTopics.Add);
    this.kafkaClient.subscribeToResponseOf(FavoriteTopics.Remove);
    this.kafkaClient.subscribeToResponseOf(FavoriteTopics.GetList);
    this.kafkaClient.subscribeToResponseOf(FavoriteTopics.Check);

    //category topic
    this.kafkaClient.subscribeToResponseOf(CategoryTopics.GetListOnboarding);

    //friend topic
    this.kafkaClient.subscribeToResponseOf(FriendTopics.SendRequest);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.AcceptRequest);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.RejectRequest);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.CancelRequest);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.RemoveFriend);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.GetFriends);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.GetPendingRequests);
    this.kafkaClient.subscribeToResponseOf(FriendTopics.GetSentRequests);

    // attribute topic
    this.kafkaClient.subscribeToResponseOf(AttributeTopics.Create);

    // review topic
    this.kafkaClient.subscribeToResponseOf(ReviewTopics.Create);
    this.kafkaClient.subscribeToResponseOf(ReviewTopics.GetByPlaceId);

    //group session topic
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.Create);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.Join);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.InviteFriend);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.Close);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.CastVote);
    this.kafkaClient.subscribeToResponseOf(
      GroupSessionTopics.FinalizeMemberVote,
    );
    this.kafkaClient.subscribeToResponseOf(
      GroupSessionTopics.FinalizeSessionVote,
    );
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.GetVotes);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.GetSession);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.GetAll);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.AddCandidate);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.GetCandidates);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.DeleteCandidate);
    this.kafkaClient.subscribeToResponseOf(GroupSessionTopics.LeaveSession);
    this.kafkaClient.subscribeToResponseOf(
      GroupSessionTopics.UpdateRecommendationRadius,
    );
    this.kafkaClient.subscribeToResponseOf(
      GroupSessionTopics.UpdateRecommendationCategories,
    );

    //search topic
    this.kafkaClient.subscribeToResponseOf(SearchTopics.Trending);

    //setting topics
    this.kafkaClient.subscribeToResponseOf(SettingTopics.Get);
    this.kafkaClient.subscribeToResponseOf(SettingTopics.Update);

    await this.kafkaClient.connect();
  }

  getClient(): ClientKafka {
    return this.kafkaClient;
  }

  sendWithTimeout(
    topic: string,
    data: unknown,
    timeoutMs: number = KAFKA_TIMEOUT_MS,
  ) {
    return firstValueFrom(
      this.kafkaClient.send(topic, data).pipe(timeout(timeoutMs)),
    );
  }
}
