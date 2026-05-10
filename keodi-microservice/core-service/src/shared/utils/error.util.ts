import { HttpStatus, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { INTERNAL_SERVER_ERROR } from "../constants/error.constant";

const logger = new Logger('ServiceErrorHandler');

export const handleServiceErrorCatching = (error: any) => {
    if (error instanceof RpcException) {
        throw error;
    }
    logger.error(error.message ?? error, error.stack);
    throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: INTERNAL_SERVER_ERROR,
    });
};