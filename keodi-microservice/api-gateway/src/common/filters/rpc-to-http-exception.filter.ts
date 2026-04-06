import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { TimeoutError } from 'rxjs';

@Catch()
export class ConvertToHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(ConvertToHttpExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        if (exception instanceof TimeoutError) {
            this.logger.error(`Kafka request timed out: ${exception.message}`);
            return response.status(HttpStatus.GATEWAY_TIMEOUT).json({
                status: HttpStatus.GATEWAY_TIMEOUT,
                message: 'Service request timed out',
            });
        }

        if (exception.response) {
            const message = Array.isArray(exception.response.message)
                ? exception.response.message[0]
                : exception.response.message;
            return response.status(Number(exception.response.statusCode)).json({
                status: exception.response.statusCode,
                message
            })
        }

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Unexpected error';
        let data = null

        if (typeof exception === 'object' && exception !== null) {
            status = (exception as any).status ?? status;
            message = (exception as any).message ?? message;
            data = (exception as any).data ?? data
        }

        this.logger.error(`Unhandled exception: ${message}`, exception.stack);

        response.status(status).json({
            status,
            message,
            ...(data ? { data } : {})
        });
    }
}
