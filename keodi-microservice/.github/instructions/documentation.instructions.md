# Documentation Instructions

Documentation should be practical and architecture-aware.

## 1. Documentation goals

Document only what future maintainers need to understand quickly:

- business behavior and workflow decisions
- assumptions and constraints
- non-obvious edge cases
- contract changes that affect integration between services

Avoid verbose duplication of code that is already self-explanatory.

## 2. API contract documentation policy

- Swagger contract docs are maintained in `api-gateway` only.
- When `api-gateway` endpoints change, update Swagger decorators in the same change.
- Do not create OpenAPI documentation tasks for `core-service`, `auth-service`, or `notification-service`.

## 3. Service-specific documentation expectations

NestJS microservices:

- focus docs on topic workflows, cross-service effects, and business rules
- reference impacted modules and Kafka topics clearly

FastAPI (`intelligence-service`):

- focus docs on handler workflow, repository usage, and model/integration behavior
- document lifecycle or processing assumptions when changed

## 4. Where to document

Preferred locations:

- existing service README sections when appropriate
- `/docs` when business/workflow knowledge must persist beyond code comments
- inline comments only for non-obvious implementation details

## 5. What not to do

- do not create test plans or test-case documents for this project
- do not duplicate full DTO/model schemas unnecessarily
- do not create separate API contract docs that diverge from Swagger in `api-gateway`

## 6. Documentation checklist

Before finishing documentation-impacting work, verify:

- changed business behavior is documented where needed
- Swagger is updated for `api-gateway` API contract changes
- cross-service contract assumptions are explicit
- no test-related documentation artifacts were introduced
