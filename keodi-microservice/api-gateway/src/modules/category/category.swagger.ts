import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  CategoryDto,
  CategorySearchResultDto,
} from 'src/shared/dtos/category.dto';

export function ApiGetListOnboarding() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get onboarding categories',
      description:
        'Retrieve the list of selectable categories for user onboarding',
    }),
    ApiOkResponse({
      description: 'List of onboarding categories',
      type: [CategoryDto],
    }),
  );
}

export function ApiSearchCategories() {
  return applyDecorators(
    ApiOperation({
      summary: 'Search categories with autocomplete',
      description:
        'Search categories by name with fuzzy matching and typo correction. ' +
        'Prefix matches are ranked higher for autocomplete support. ' +
        'Returns all categories (up to limit) when query is empty.',
    }),
    ApiQuery({
      name: 'q',
      required: false,
      description: 'Search query string (supports typos and partial matches)',
      example: 'coffee',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Maximum number of results to return',
      example: 10,
      type: Number,
    }),
    ApiOkResponse({
      description: 'List of matching categories sorted by relevance',
      type: [CategorySearchResultDto],
    }),
  );
}
