---
name: write-docs
description: Write practical backend documentation focused on business flow, contracts, architecture impact, and service ownership.
---

# Purpose

Use this skill to document backend behavior changes in a way that helps future maintainers understand:

- why the change exists
- which service owns it
- how the workflow behaves
- what constraints and assumptions apply

# Documentation focus

Capture:

- business context and scope
- service ownership (`api-gateway`, `auth-service`, `core-service`, `notification-service`, `intelligence-service`)
- workflow and integration impact
- edge cases and failure behavior
- contract/migration impact

# Swagger/OpenAPI rule

- API contract docs are maintained in `api-gateway` Swagger decorators.
- Do not create separate OpenAPI docs for `core-service`, `auth-service`, or `notification-service`.

# Suggested output location

- update existing docs file when possible
- otherwise create a focused file under `/docs/<topic>.md`

# Suggested structure

Use relevant sections only:

- Overview
- Scope and service ownership
- Workflow
- Contract impact
- Migration/data impact
- Edge cases
- Assumptions
- Risks
- Decisions

# Rules

- keep docs concise and decision-oriented
- avoid copying full DTO/model schemas unless necessary
- avoid redundant API tables already covered by Swagger
- do not create test plans or test-case docs for this project
