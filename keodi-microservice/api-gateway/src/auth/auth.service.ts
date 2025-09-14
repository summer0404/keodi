import { Inject, Injectable, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom } from 'rxjs';
import { LoginDto, RegisterDto } from 'src/dtos/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        @Inject('AUTH_SERVICE') private client: ClientKafka,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        this.client.subscribeToResponseOf('auth.register')
        this.client.subscribeToResponseOf('auth.login')
        this.client.subscribeToResponseOf('auth.google')
        await this.client.connect()
    }

    async register(@Res({ passthrough: true }) res: Response, body: RegisterDto) {
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

    async login(@Res({ passthrough: true }) res: Response, body: LoginDto) {
        try {
            const response = await firstValueFrom(this.client.send('auth.login', body))

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


    async googleCallback(@Res({ passthrough: true }) res: Response, user: any) {
        try {
            const response = await firstValueFrom(this.client.send('auth.google', user))

            res.cookie('refreshToken', response.refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            return res.redirect(`${this.configService.get<string>('FRONTEND_URL')}/auth-google`)
        } catch (error) {
            throw error
        }
    }
}
