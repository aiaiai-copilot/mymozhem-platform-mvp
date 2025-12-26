---
description: Launch API design session. Activates api-designer subagent for designing endpoints and protocols.
---

# API Design Session

Launch specialized API design workflow using the `api-designer` subagent.

## What It Does

The API designer subagent helps you:
1. Design REST API endpoints
2. Define WebSocket event protocols
3. Specify request/response schemas
4. Document permission requirements
5. Create validation rules

## Usage

Simply mention API design in your request, or explicitly call:
- "Design API for room management"
- "Create WebSocket protocol for quiz events"
- "Add participant registration endpoints"

The `api-designer` subagent will automatically activate.

## Design Process

### 1. Requirements Gathering
- What entities are involved?
- What operations are needed?
- Who has permission to perform actions?
- What data validation is required?

### 2. Endpoint Design
For each operation:
- HTTP method (GET, POST, PUT, DELETE)
- URL path with parameters
- Request body schema
- Response format
- Error cases

### 3. WebSocket Events
For real-time features:
- Event naming convention
- Payload structure
- Event direction (client→server, server→client)
- Acknowledgment requirements

### 4. Security
- Authentication method
- Permission checks
- Input validation
- Rate limiting

### 5. Documentation
- OpenAPI spec
- Example requests/responses
- SDK types

## Example

**Request:**
> Design API for managing room participants

**Output:**
- `GET /api/rooms/:roomId/participants` — List participants
- `POST /api/rooms/:roomId/participants` — Add participant
- `PATCH /api/rooms/:roomId/participants/:userId` — Update role
- `DELETE /api/rooms/:roomId/participants/:userId` — Remove participant
- WebSocket event: `participant:joined`, `participant:left`
- Schemas for request/response
- Permission requirements
- Validation rules

## Context7 Integration

The designer will "use context7" to check:
- Latest Fastify routing patterns
- Socket.io best practices
- REST API conventions
