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
                example: [
                    {
                        id: 'cm5g8h9j0k1l2m3n4o5p',
                        name: 'ALCOHOL_VARIETY',
                    },
                    {
                        id: 'cm5a1b2c3d4e5f6g7h8i',
                        name: 'HAPPY_HOUR_VALUE',
                    }
                ],
            },
        }),
        ApiBadRequestResponse({
            description: 'Invalid attributes data',
        })
    );
}
