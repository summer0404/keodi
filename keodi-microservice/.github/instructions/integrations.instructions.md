# Integrations Instructions

External communication and infrastructure access must stay isolated and consistent with existing service patterns.

## 1. Integration boundaries by stack

### NestJS services

Use `src/providers` as the integration boundary for:

- Kafka clients
- Redis
- Google auth
- S3
- Email
- FCM
- other infra/external SDK clients

Feature modules should consume provider services, not instantiate SDK clients directly.

### FastAPI service (`intelligence-service`)

Use dedicated packages for integration concerns:

- Kafka integration: `app/kafka`
- LLM provider integration: `app/services/llm`
- database client integration: `app/database`

## 2. Kafka contract rules

- keep topic names centralized in constants/enums where already established
- when changing payload shape, update producer and consumer together
- keep request/response vs fire-and-forget semantics explicit
- avoid hidden implicit contract changes

## 3. Gateway orchestration rules

In `api-gateway`:

- use `KafkaService.sendWithTimeout` for request/response interactions
- keep timeout handling and response subscription concerns inside provider layer
- keep controller/service layer focused on orchestration and payload mapping

## 4. Microservice consumer/handler rules

In Kafka-first NestJS services:

- handlers should map payload to service method
- service layer performs business operations and Prisma access
- integration failures should be converted to predictable `RpcException` payloads

In `intelligence-service`:

- Kafka consumer/router should delegate to handlers/workflows
- keep response/error envelope behavior centralized in kafka decorator utilities

## 5. Security and secrets

- never hardcode credentials
- keep secrets in environment configuration
- never log secrets/tokens/passwords
- avoid returning raw external error payloads to clients

## 6. Reliability and failure behavior

- keep timeouts explicit where request/response over Kafka is used
- surface integration failures with stable, meaningful error messages
- avoid silent failures unless behavior is explicitly designed as best-effort

## 7. Integration checklist

Before finishing integration work, verify:

- integration code is in the right boundary layer
- producer and consumer contracts remain compatible
- secret handling follows env-based configuration
- error surfaces remain consistent with service conventions
