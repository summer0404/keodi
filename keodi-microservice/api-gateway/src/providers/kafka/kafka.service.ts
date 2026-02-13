import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Injectable()
export class KafkaService implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    //auth topic
    this.kafkaClient.subscribeToResponseOf('auth.register');
    this.kafkaClient.subscribeToResponseOf('auth.login');
    this.kafkaClient.subscribeToResponseOf('auth.google');
    this.kafkaClient.subscribeToResponseOf('auth.forgot-password-otp');
    this.kafkaClient.subscribeToResponseOf('auth.reset-password-otp');
    this.kafkaClient.subscribeToResponseOf('auth.validate-otp');
    this.kafkaClient.subscribeToResponseOf('auth.reset-password');
    this.kafkaClient.subscribeToResponseOf('auth.verify-email');
    this.kafkaClient.subscribeToResponseOf('auth.external-resend-verify-email');
    this.kafkaClient.subscribeToResponseOf('auth.resend-verify-email');

    //user topic
    this.kafkaClient.subscribeToResponseOf('user.get-all');
    this.kafkaClient.subscribeToResponseOf('user.unverify');
    this.kafkaClient.subscribeToResponseOf('user.update-username');
    this.kafkaClient.subscribeToResponseOf('user.update-picture');
    this.kafkaClient.subscribeToResponseOf('user.get');
    this.kafkaClient.subscribeToResponseOf('user.update-profile');
    this.kafkaClient.subscribeToResponseOf('user.onboarding');

    //place topic
    this.kafkaClient.subscribeToResponseOf('place.get-by-id');
    this.kafkaClient.subscribeToResponseOf('place.near-me');

    //favorite topic
    this.kafkaClient.subscribeToResponseOf('favorite.add');
    this.kafkaClient.subscribeToResponseOf('favorite.remove');
    this.kafkaClient.subscribeToResponseOf('favorite.get-list');
    this.kafkaClient.subscribeToResponseOf('favorite.check');

    //category topic
    this.kafkaClient.subscribeToResponseOf('category.get-list-onboarding');

    //friend topic
    this.kafkaClient.subscribeToResponseOf('friend.send-request');
    this.kafkaClient.subscribeToResponseOf('friend.accept-request');
    this.kafkaClient.subscribeToResponseOf('friend.reject-request');
    this.kafkaClient.subscribeToResponseOf('friend.cancel-request');
    this.kafkaClient.subscribeToResponseOf('friend.remove-friend');
    this.kafkaClient.subscribeToResponseOf('friend.get-friends');
    this.kafkaClient.subscribeToResponseOf('friend.get-pending-requests');
    this.kafkaClient.subscribeToResponseOf('friend.get-sent-requests');

    // attribute topic
    this.kafkaClient.subscribeToResponseOf('attribute.create');

    // review topic
    this.kafkaClient.subscribeToResponseOf('review.create');
    
    //group session topic
    this.kafkaClient.subscribeToResponseOf('group-session.create');

    await this.kafkaClient.connect();
  }

  getClient(): ClientKafka {
    return this.kafkaClient;
  }
}
