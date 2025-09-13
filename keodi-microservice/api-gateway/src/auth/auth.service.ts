import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { RegisterDto } from 'src/dtos/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @Inject('AUTH_SERVICE') private client: ClientKafka
    ){}

    async onModuleInit () {
        this.client.subscribeToResponseOf('auth.register')
        await this.client.connect()
    }

    register(body: RegisterDto) {
        try {
            return this.client.send('auth.register', body)
        } catch (error) {
            throw error
        }
    }
}
