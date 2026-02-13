import { applyDecorators } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiCreatedResponse,
    ApiOperation
} from '@nestjs/swagger';

export function ApiCreateAttributes() {
    return applyDecorators(
        ApiOperation({
            summary: 'Create list of attributes',
            description: 'Create an list of attributes for a place',
        }),
        ApiCreatedResponse({
            description: 'Attributes created successfully',
            schema: {
                example: {
                    message: 'Attributes created successfully',
                },
            },
        }),
        ApiBadRequestResponse({
            description: 'Invalid attributes data',
        })
    );
}
