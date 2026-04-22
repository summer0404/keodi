import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CreatePlaceResponseDto,
  NearMePlacesResponseDto,
  PlaceRecommendationResponseDto,
} from 'src/shared/dtos/place.dto';
import { ReviewResponseDto } from 'src/shared/dtos/review.dto';

export function ApiNearMePlace() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get nearby places',
      description: 'Get a list of places near the user location',
    }),
    ApiOkResponse({
      description: 'List of nearby places retrieved successfully',
      type: [NearMePlacesResponseDto],
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiBadRequestResponse({
      description: 'Invalid request parameters',
    }),
    ApiNotFoundResponse({
      description: 'No places found near the specified location',
    }),
  );
}

export function ApiSearchPlace() {
  return applyDecorators(
    ApiOperation({
      summary: 'Search places',
      description: 'Search for places based on a query string',
    }),
    ApiOkResponse({
      description:
        'List of places matching the search query retrieved successfully',
      type: [NearMePlacesResponseDto],
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiBadRequestResponse({
      description: 'Invalid request parameters',
    }),
    ApiNotFoundResponse({
      description: 'No places found matching the search query',
    }),
  );
}

export function ApiGetPlaceById() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get place by ID',
      description:
        'Retrieve detailed information about a place using its unique ID',
    }),
    ApiOkResponse({
      description: 'Place details retrieved successfully',
      type: NearMePlacesResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiNotFoundResponse({
      description: 'Place not found with the specified ID',
    }),
    ApiBadRequestResponse({
      description: 'Invalid place ID format',
    }),
  );
}

export function ApiGetPlaceReviews() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get reviews for a place',
      description:
        'Retrieve a list of reviews for a specific place using its unique ID',
    }),
    ApiOkResponse({
      description: 'List of reviews retrieved successfully',
      type: [ReviewResponseDto],
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiNotFoundResponse({
      description: 'Place not found with the specified ID',
    }),
    ApiBadRequestResponse({
      description: 'Invalid place ID format',
    }),
  );
}

export function ApiGetTrendingPlaces() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get trending places',
      description:
        'Retrieve a list of trending places based on user interactions and search trends',
    }),
    ApiOkResponse({
      description: 'List of trending places retrieved successfully',
      type: [PlaceRecommendationResponseDto],
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
  );
}

export function ApiGetForYouPlaces() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get personalized place recommendations',
      description:
        'Retrieve a list of personalized place recommendations based on user preferences and behavior',
    }),
    ApiOkResponse({
      description:
        'List of personalized place recommendations retrieved successfully',
      type: [PlaceRecommendationResponseDto],
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiBadRequestResponse({
      description: 'Invalid request parameters',
    }),
  );
}

export function ApiCreatePlace() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a new place',
      description:
        'Create a new place as an owner. The place is created in UNDER_REVIEW status.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: [
          'name',
          'street',
          'ward',
          'city',
          'countryCode',
          'latitude',
          'longitude',
          'mainCategoryId',
          'featureImage',
        ],
        properties: {
          name: { type: 'string', example: 'Sunset Coffee' },
          description: {
            type: 'string',
            example: 'Cozy cafe with parking and pet-friendly space',
          },
          street: { type: 'string', example: '255 Do Xuan Hop' },
          ward: { type: 'string', example: 'Tan Phu Ward' },
          city: { type: 'string', example: 'Thu Duc City' },
          countryCode: { type: 'string', example: 'VN' },
          latitude: { type: 'number', example: 10.76407 },
          longitude: { type: 'number', example: 106.67838 },
          mainCategoryId: {
            type: 'string',
            example: 'clx123-main-category',
          },
          secondaryCategoryIds: {
            oneOf: [
              {
                type: 'array',
                items: { type: 'string' },
                example: ['clx123-secondary-category'],
              },
              {
                type: 'string',
                example: '["clx123-secondary-category"]',
              },
            ],
          },
          phoneNumber: {
            type: 'string',
            example: '+84901234567',
          },
          website: {
            type: 'string',
            example: 'https://sunsetcoffee.vn',
          },
          openingHours: {
            oneOf: [
              {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    dayOfWeek: { type: 'integer', example: 1 },
                    openTime: { type: 'string', example: '08:00' },
                    closeTime: { type: 'string', example: '22:00' },
                  },
                },
              },
              {
                type: 'string',
                example:
                  '[{"dayOfWeek":1,"openTime":"08:00","closeTime":"22:00"}]',
              },
            ],
          },
          attributeIds: {
            oneOf: [
              {
                type: 'array',
                items: { type: 'string' },
                example: ['clx123-attribute-parking'],
              },
              {
                type: 'string',
                example: '["clx123-attribute-parking"]',
              },
            ],
          },
          featureImage: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Place created successfully and sent for review',
      type: CreatePlaceResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiForbiddenResponse({
      description: 'Forbidden - Owner role is required',
    }),
    ApiBadRequestResponse({
      description: 'Invalid request payload',
    }),
  );
}
