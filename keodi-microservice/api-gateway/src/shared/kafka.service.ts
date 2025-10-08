import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
export class KafkaService implements OnModuleInit {
    constructor(@Inject('AUTH_SERVICE') private readonly client: ClientKafka) { }

    async onModuleInit() {
        //auth topic
        this.client.subscribeToResponseOf('auth.register')
        this.client.subscribeToResponseOf('auth.login')
        this.client.subscribeToResponseOf('auth.google')
        this.client.subscribeToResponseOf('auth.forgot-password-otp')
        this.client.subscribeToResponseOf('auth.reset-password-otp')
        this.client.subscribeToResponseOf('auth.validate-otp')
        this.client.subscribeToResponseOf('auth.reset-password')
        this.client.subscribeToResponseOf('auth.verify-email')
        this.client.subscribeToResponseOf('auth.external-resend-verify-email')
        this.client.subscribeToResponseOf('auth.resend-verify-email')

        //user topic
        this.client.subscribeToResponseOf('user.unverify')

        await this.client.connect()
    }

    getClient(): ClientKafka{
        return this.client
    }
}