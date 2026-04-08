import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
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
