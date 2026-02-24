import { HttpStatus } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";

export const handleServiceErrorCatching = (error: any) => {
    if (error instanceof RpcException) {
        throw error;
    }
    console.error(error);
    throw new RpcException({
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message ?? error,
    });
};