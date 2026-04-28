---
name: review-api
description: Review backend API and Kafka contract changes across api-gateway, NestJS microservices, and intelligence-service.
---

# Purpose

Use this skill when reviewing:

- new or changed `api-gateway` endpoints
- Kafka handler/service changes in NestJS microservices
- FastAPI intelligence-service message workflow changes
- contract-impacting refactors

# Review checklist

## 1. Service ownership and architecture

- changed logic is in the correct service
- transport layer is thin
- business logic is in service/workflow layer
- no cross-service runtime imports were introduced

## 2. Data-access placement

- NestJS services: DB access via `PrismaService` in service layer
- FastAPI service: DB access via `app/repositories`
- no accidental architecture mixing between stacks

## 3. Contract consistency

- API payloads remain consistent with DTO/model contracts
- Kafka topic payload changes are reflected on producer and consumer sides
- error envelope remains consistent with existing handling pattern

## 4. Swagger/OpenAPI policy

- Swagger updates are present when `api-gateway` endpoint contract changed
- no unnecessary OpenAPI work was added to `core-service`, `auth-service`, `notification-service`

## 5. Reliability and maintainability

- no heavy business/database logic in controllers/handlers
- naming is clear and responsibilities are cohesive
- migration/schema updates are included when DB schema changed

# Output format

Return:

- summary
- blocking issues
- non-blocking suggestions
- contract/docs mismatches

# Rules

- prioritize concrete findings with impact explanation
- distinguish mandatory fixes vs suggestions
- avoid style-only comments without practical value
- do not request test additions for this project
