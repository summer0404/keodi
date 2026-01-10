import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
export class KafkaService implements OnModuleInit {
    constructor(
        @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka
    ) { }

    async onModuleInit() {
        //auth topic
        this.kafkaClient.subscribeToResponseOf('auth.register')
        this.kafkaClient.subscribeToResponseOf('auth.login')
        this.kafkaClient.subscribeToResponseOf('auth.google')
        this.kafkaClient.subscribeToResponseOf('auth.forgot-password-otp')
        this.kafkaClient.subscribeToResponseOf('auth.reset-password-otp')
        this.kafkaClient.subscribeToResponseOf('auth.validate-otp')
        this.kafkaClient.subscribeToResponseOf('auth.reset-password')
        this.kafkaClient.subscribeToResponseOf('auth.verify-email')
        this.kafkaClient.subscribeToResponseOf('auth.external-resend-verify-email')
        this.kafkaClient.subscribeToResponseOf('auth.resend-verify-email')

        //user topic
        this.kafkaClient.subscribeToResponseOf('user.unverify')
        this.kafkaClient.subscribeToResponseOf('user.update-username')
        this.kafkaClient.subscribeToResponseOf('user.update-picture')
        this.kafkaClient.subscribeToResponseOf('user.get')

        //place topic 
        this.kafkaClient.subscribeToResponseOf('place.get-by-id')

        await this.kafkaClient.connect()
    }

    getClient(): ClientKafka{
        return this.kafkaClient
    }
}