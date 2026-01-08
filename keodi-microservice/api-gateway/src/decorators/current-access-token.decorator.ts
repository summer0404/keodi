import { createParamDecorator } from "@nestjs/common";

export const CurrentAccessToken = createParamDecorator(
    (data: unknown, ctx) => {
        const request = ctx.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'] || '';
        const token = authHeader.split(' ')[1];
        return token;
    }
)