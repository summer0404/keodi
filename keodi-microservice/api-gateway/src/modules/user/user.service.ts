import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { UpdateUserProfileDto } from 'src/shared/dtos/user.dto';

@Injectable()
export class UserService {
    constructor(@Inject('KAFKA_SERVICE') private readonly client: ClientKafka) { }

    async unverifyUser(userId: string) {
        return await firstValueFrom(this.client.send('user.unverify', { userId }))
    }

    async updateUsername(userId: string, username: string, accessToken: string) {
        return await firstValueFrom(this.client.send('user.update-username', { userId, username, accessToken }))
    }

    async updatePicture(userId: string, file: Buffer, type: string) {
        return await firstValueFrom(this.client.send('user.update-picture', { 
            userId, 
            file, 
            type,
        }))
    }

    async updateProfile(userId: string, data: UpdateUserProfileDto) {
        return await firstValueFrom(this.client.send('user.update-profile', { userId, data }))
    }

    async getAll() {
        return await firstValueFrom(this.client.send('user.get-all', {}))
    }

    async onBoarding(userId: string, categoryIds: string[]) {
        return await firstValueFrom(this.client.send('user.onboarding', { userId, categoryIds }))
    }
}
