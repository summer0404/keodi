import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";

@Injectable()
export class KafkaService implements OnModuleInit {
    constructor(
        @Inject('AUTH_SERVICE') private readonly authClient: ClientKafka,
        @Inject('CORE_SERVICE') private readonly coreClient: ClientKafka
    ) { }

    async onModuleInit() {
        //auth topic
        this.authClient.subscribeToResponseOf('auth.register')
        this.authClient.subscribeToResponseOf('auth.login')
        this.authClient.subscribeToResponseOf('auth.google')
        this.authClient.subscribeToResponseOf('auth.forgot-password-otp')
        this.authClient.subscribeToResponseOf('auth.reset-password-otp')
        this.authClient.subscribeToResponseOf('auth.validate-otp')
        this.authClient.subscribeToResponseOf('auth.reset-password')
        this.authClient.subscribeToResponseOf('auth.verify-email')
        this.authClient.subscribeToResponseOf('auth.external-resend-verify-email')
        this.authClient.subscribeToResponseOf('auth.resend-verify-email')

        //user topic
        this.authClient.subscribeToResponseOf('user.unverify')

        //place topic 
        this.coreClient.subscribeToResponseOf('place.get-by-id')

        await this.authClient.connect()
        await this.coreClient.connect()
    }

    getAuthClient(): ClientKafka{
        return this.authClient
    }

    getCoreClient(): ClientKafka{
        return this.coreClient
    }
}