import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpStatus,
} from '@nestjs/common';

@Catch()
export class ConvertToHttpExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        if(exception.response){
            return response.status(Number(exception.response.statusCode)).json({
                status: exception.response.statusCode,
                message: exception.response.message[0]
            })
        }

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Unexpected error';

        if (typeof exception === 'object' && exception !== null) {
            status = (exception as any).status ?? status;
            message = (exception as any).message ?? message;
        }

        response.status(status).json({
            status,
            message
        });
    }
}
