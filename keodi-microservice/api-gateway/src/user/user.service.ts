import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UpdateUserProfileDto } from 'src/dtos/user.dto';

@Injectable()
export class UserService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) { }

    async unverifyUser(userId: number) {
        return await firstValueFrom(this.client.send('user.unverify', { userId }))
    }

    async updateUsername(userId: number, username: string, accessToken: string) {
        return await firstValueFrom(this.client.send('user.update-username', { userId, username, accessToken }))
    }

    async updatePicture(userId: number, file: Buffer, type: string) {
        return await firstValueFrom(this.client.send('user.update-picture', { 
            userId, 
            file, 
            type,
        }))
    }

    async updateProfile(userId: number, data: UpdateUserProfileDto) {
        return await firstValueFrom(this.client.send('user.update-profile', { userId, data }))
    }
}
