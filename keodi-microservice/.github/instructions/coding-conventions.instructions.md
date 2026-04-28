# Coding Conventions Instructions

Write code that is clear, explicit, and consistent with the current service patterns.

## 1. General principles

- prefer readability over clever shortcuts
- follow existing module/service style before introducing new patterns
- keep methods focused on one responsibility
- reuse existing constants, DTOs, helpers, and providers before creating new ones
- preserve behavior unless requirement explicitly asks for behavior change

## 2. Stack-specific coding boundaries

### NestJS services

- keep controllers/message handlers thin
- keep business logic in services
- access relational DB directly in services using `PrismaService`
- do not force-add repository layer where service-level Prisma access is already standard

### FastAPI service (`intelligence-service`)

- keep route/bootstrap/message-routing code thin
- keep business workflows in `app/services`
- keep database access in `app/repositories`
- use established `get_*` factory/singleton patterns for heavy dependencies

## 3. TypeScript conventions (NestJS)

- use explicit return types for public methods where it improves clarity
- avoid `any`; use concrete types or `unknown` then narrow
- keep DTOs explicit for payload contracts
- prefer enums/constants for topic names, status-like values, and reusable keys

## 4. Python conventions (FastAPI)

- use `snake_case` for module/function names
- use `PascalCase` for classes
- keep async boundaries explicit for IO operations
- keep repository APIs typed/clear and avoid hidden global side effects

## 5. Naming and file patterns

NestJS:

- filenames: `kebab-case`
- suffixes by role: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.helper.ts`, `*.scheduler.ts`, `*.swagger.ts`

FastAPI:

- filenames: `snake_case.py`
- repository files under `app/repositories`
- service files under `app/services`

## 6. Error handling conventions

NestJS microservices:

- throw `RpcException` with predictable payload (`status`, `message`, optional `data`)
- reuse existing service error helper patterns where available

`api-gateway`:

- let global exception filter normalize downstream/microservice errors
- avoid ad-hoc error envelopes in controllers

FastAPI:

- keep response/error envelope behavior consistent with `app/kafka/decorators.py`
- do not leak raw internal exceptions or secrets in logs/payloads

## 7. Logging and diagnostics

- use framework logger patterns (`Logger` in NestJS, `logging` in FastAPI)
- do not log secrets, tokens, passwords, or full sensitive payloads
- avoid noisy debug logs in normal production flows

## 8. Swagger and documentation coupling

- update Swagger decorators only for `api-gateway` endpoint contract changes
- do not add OpenAPI-focused work for `core-service`, `auth-service`, or `notification-service`

## 9. No-test policy for this project

- do not create unit tests
- do not create e2e tests
- do not create Hurl tests
- do not add test-only scaffolding or instructions

## 10. Final coding checklist

Before finishing:

- architecture boundaries are respected for the target stack
- naming and file placement match existing service patterns
- duplicated logic was minimized through reuse
- error handling follows established conventions
- Swagger was updated if and only if `api-gateway` API contracts changed
