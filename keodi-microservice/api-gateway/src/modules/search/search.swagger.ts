import { applyDecorators } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";

export function ApiGetTrending() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get trending searches',
            description: 'Retrieve the list of trending search terms',
        }),
        ApiOkResponse({
            description: 'Trending searches retrieved successfully',
            schema: {
                example: [
                    "pizza",
                    "sushi",
                    "burgers"
                ]
            }
        })
    )
}