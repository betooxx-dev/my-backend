import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProperty,
  ApiResponse,
  ApiServiceUnavailableResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'object' }],
    example: 'Blog post not found',
  })
  error!: string | Record<string, unknown>;

  @ApiProperty({ example: '/api/blog/posts/en/missing' })
  path!: string;

  @ApiProperty({ format: 'uuid' })
  requestId!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}

export function ApiSuccessResponse(
  model: Type<unknown>,
  options: { isArray?: boolean; description?: string; status?: 200 | 201 } = {},
) {
  const data = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  const response = options.status === 201 ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiExtraModels(model),
    response({
      description: options.description,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data,
        },
      },
    }),
  );
}

export function ApiStringArrayResponse() {
  return ApiOkResponse({
    schema: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', example: true },
        data: { type: 'array', items: { type: 'string' } },
      },
    },
  });
}

export function ApiAdminDocumentation() {
  return applyDecorators(
    ApiBearerAuth('api-key'),
    ApiBadRequestResponse({ type: ApiErrorResponseDto }),
    ApiResponse({ status: 401, type: ApiErrorResponseDto }),
    ApiForbiddenResponse({ type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ type: ApiErrorResponseDto }),
    ApiConflictResponse({ type: ApiErrorResponseDto }),
  );
}

export function ApiPublicNotFoundDocumentation() {
  return applyDecorators(
    ApiBadRequestResponse({ type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ type: ApiErrorResponseDto }),
  );
}

export function ApiReadinessDocumentation() {
  return applyDecorators(
    ApiServiceUnavailableResponse({ type: ApiErrorResponseDto }),
  );
}
