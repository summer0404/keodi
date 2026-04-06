import { HttpStatus, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

const logger = new Logger('ServiceErrorHandler');

export const handleServiceErrorCatching = (error: any) => {
    logger.error(error.message ?? error, error.stack);
    if (error instanceof RpcException) {
        throw error;
    }
    throw new RpcException({
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
    });
};