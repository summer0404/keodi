import { Inject, Injectable, Res } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
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

    async register(@Res({ passthrough: true}) res: Response, body: RegisterDto) {
        try {
            const response = await firstValueFrom(this.client.send('auth.register', body))
            res.cookie('refreshToken', response.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            return {
                accessToken: response.accessToken
            }
        } catch (error) {
            throw error
        }
    }
}
