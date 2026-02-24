import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

@Injectable()
export class GoogleService {
    private readonly googleClient: OAuth2Client

    constructor(private readonly configService: ConfigService) {
        this.googleClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'))
    }

    async verifyIdToken(token: string) {
        const ticket = await this.googleClient.verifyIdToken({
            idToken: token,
            audience: [
                this.configService.get<string>('GOOGLE_CLIENT_ID')!,
                this.configService.get<string>('GOOGLE_IOS_CLIENT_ID')!,
                this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID')!,
            ],
        });
        const payload = ticket.getPayload();
        return payload;
    }
}