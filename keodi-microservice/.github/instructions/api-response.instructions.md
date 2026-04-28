# API Response Instructions

This instruction controls response and contract behavior across services.

## 1. Scope and ownership

- Public HTTP API contract documentation is owned by `api-gateway`.
- Swagger updates apply only to `api-gateway` endpoint changes.
- `auth-service`, `core-service`, and `notification-service` do not maintain OpenAPI docs.

## 2. `api-gateway` HTTP response rules

Success responses:

- return DTO-aligned payloads that match endpoint contract
- keep response shape consistent with existing module patterns
- avoid inventing one-off wrappers for similar endpoint types

Error responses:

- rely on global exception conversion behavior in `src/common/filters/rpc-to-http-exception.filter.ts`
- keep normalized fields consistent: `status`, `message`, optional `data`
- avoid leaking internal stack traces or implementation details

## 3. NestJS Kafka microservice error contract

For `auth-service`, `core-service`, `notification-service`:

- propagate service failures through `RpcException`
- include meaningful `status` and `message`
- include `data` only when needed for client flow (for example, follow-up action payload)

This keeps gateway-side error conversion predictable.

## 4. FastAPI message response rules (`intelligence-service`)

Current pattern uses Kafka request/response decorators:

- successful handler results are published via `send_response`
- failures are published via `send_error_response` with controlled `code` and `message`

Rules:

- keep envelope logic centralized in `app/kafka/decorators.py`
- avoid custom per-handler response envelope formats unless required and coordinated

## 5. DTO/model alignment

When input/output contract changes:

- update relevant DTOs/models in the same change
- update Swagger decorators for `api-gateway` endpoints in the same change
- ensure downstream payload expectations remain compatible

## 6. API response checklist

Before finishing contract-impacting work, verify:

- endpoint payload shape matches DTO/model definitions
- error behavior remains consistent with established envelopes
- Swagger is updated for `api-gateway` changes
- no OpenAPI tasks were added for non-gateway NestJS services
