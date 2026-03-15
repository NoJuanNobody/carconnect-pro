# ADR-004: RESTful API Design with Express

> **Status:** Accepted
> **Date:** 2026-01-25
> **Deciders:** Architecture Team
> **Version:** 1.0.0

## Context

CarConnect Pro needs an API layer for communication between the UI, external tools, and internal services. The API must support real-time data queries, configuration, and system management.

## Decision

We will use **Express** to implement a RESTful HTTP API with JSON payloads and **Joi** for request validation.

## Rationale

### Considered Alternatives

| Option | Pros | Cons |
|--------|------|------|
| Express REST | Mature, simple, well-documented | No built-in validation |
| Fastify | Faster, schema validation built-in | Smaller ecosystem |
| gRPC | Efficient binary protocol, code generation | Complex for simple queries |
| GraphQL | Flexible queries | Overhead for embedded system |

### API Design Principles

1. **Consistent naming**: snake_case for all JSON fields (e.g., `vehicle_speed_kmh`)
2. **Standard HTTP methods**: GET for reads, POST for creates, PUT for updates, DELETE for removes
3. **Versioned endpoints**: `/api/v1/` prefix for all routes
4. **Joi validation**: All request bodies and parameters validated before reaching controllers
5. **Structured errors**: Consistent error response format with error codes

### Response Format

```json
{
  "status": "success",
  "data": { },
  "timestamp": "2026-03-15T10:30:00Z"
}
```

### Error Format

```json
{
  "status": "error",
  "error": {
    "code": "E-CAN-004",
    "message": "CAN bus timeout",
    "details": { }
  },
  "timestamp": "2026-03-15T10:30:00Z"
}
```

## Consequences

- All API endpoints documented with request/response examples
- Joi schemas serve as living documentation of data contracts
- Express middleware pipeline handles cross-cutting concerns
- API versioning enables backward-compatible evolution
