import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { HttpStatus, Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

@Injectable()
export class S3Service {
    private readonly s3Client: S3Client;
    private readonly bucket: string;
    private readonly endpoint: string;

    constructor() {
        const endpoint = process.env.S3_ENDPOINT;
        const region = process.env.S3_REGION;
        const accessKeyId = process.env.S3_ACCESS_KEY;
        const secretAccessKey = process.env.S3_SECRET_KEY;
        const bucket = process.env.S3_BUCKET;

        if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket) {
            throw new Error('Missing S3 configuration in environment variables');
        }

        this.bucket = bucket;
        this.endpoint = endpoint;
        
        this.s3Client = new S3Client({
            endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true,
        });
    }

    async uploadImage(body: Buffer, userId: number, contentType: string = 'image/jpeg'): Promise<string> {
        try {
            if (!body || body.length === 0) {
                throw new RpcException({
                    status: HttpStatus.BAD_REQUEST,
                    message: 'File body is required'
                });
            }

            const key = `user_${userId}_picture.jpg`;

            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
            }));

            return `${this.endpoint}/${this.bucket}/${key}`;
        } catch (error) {
            console.error(error);
            
            if (error instanceof RpcException) {
                throw error;
            }
            
            throw new RpcException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: error.message || 'Failed to upload file to S3'
            });
        }
    }
}