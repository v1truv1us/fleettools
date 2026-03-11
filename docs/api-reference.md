# API Reference

Complete reference for all FleetTools API endpoints.

## Base URLs

| Service | URL |
|---------|-----|
| API Server | `http://localhost:3001/api/v1` |
| Squawk Service | `http://localhost:3002/squawk/v1` |

## Common Headers

```json
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

## Common Response Format

### Success Response

```json
{
  "data": { /* response data */ },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

### Error Response

```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional details */ }
  },
  "timestamp": "2026-01-14T10:30:00Z"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request |
| `404` | Not Found |
| `409` | Conflict |
| `500` | Internal Server Error |

---

## Flightline API

### Missions

#### Create Mission

```http
POST /api/v1/flightline/missions
```

**Request Body**:
```json
{
  "title": "Build authentication system",
  "description": "Implement JWT-based authentication"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "msn-abc123",
    "title": "Build authentication system",
    "description": "Implement JWT-based authentication",
    "status": "pending",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T10:00:00Z"
}
```

#### Get Mission

```http
GET /api/v1/flightline/missions/:id
```

**Response** (200):
```json
{
  "data": {
    "id": "msn-abc123",
    "title": "Build authentication system",
    "description": "Implement JWT-based authentication",
    "status": "in_progress",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T15:30:00Z",
    "work_orders": [
      {
        "id": "wo-jkl012",
        "title": "Design database schema",
        "status": "in_progress"
      }
    ]
  },
  "error": null,
  "timestamp": "2026-01-14T10:00:00Z"
}
```

#### List Missions

```http
GET /api/v1/flightline/missions
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (`pending`, `in_progress`, `completed`) |
| `limit` | number | Maximum results (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Example**:
```http
GET /api/v1/flightline/missions?status=in_progress&limit=10
```

**Response** (200):
```json
{
  "data": {
    "missions": [
      {
        "id": "msn-abc123",
        "title": "Build authentication system",
        "status": "in_progress",
        "created_at": "2026-01-14T10:00:00Z"
      }
    ],
    "total": 1,
    "limit": 10,
    "offset": 0
  },
  "error": null,
  "timestamp": "2026-01-14T10:00:00Z"
}
```

#### Update Mission

```http
PATCH /api/v1/flightline/missions/:id
```

**Request Body**:
```json
{
  "status": "completed",
  "title": "Updated title"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "msn-abc123",
    "title": "Updated title",
    "status": "completed",
    "updated_at": "2026-01-14T16:00:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T16:00:00Z"
}
```

#### Delete Mission

```http
DELETE /api/v1/flightline/missions/:id
```

**Response** (200):
```json
{
  "data": {
    "message": "Mission deleted successfully",
    "id": "msn-abc123"
  },
  "error": null,
  "timestamp": "2026-01-14T16:00:00Z"
}
```

---

### Work Orders

#### Create Work Order

```http
POST /api/v1/flightline/work-orders
```

**Request Body**:
```json
{
  "mission_id": "msn-abc123",
  "title": "Design database schema",
  "description": "Create user and session tables",
  "priority": "high"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "wo-jkl012",
    "mission_id": "msn-abc123",
    "title": "Design database schema",
    "description": "Create user and session tables",
    "priority": "high",
    "status": "pending",
    "created_at": "2026-01-14T11:00:00Z",
    "updated_at": "2026-01-14T11:00:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T11:00:00Z"
}
```

#### Get Work Order

```http
GET /api/v1/flightline/work-orders/:id
```

**Response** (200):
```json
{
  "data": {
    "id": "wo-jkl012",
    "mission_id": "msn-abc123",
    "title": "Design database schema",
    "status": "in_progress",
    "priority": "high",
    "assigned_agent": "full-stack-developer",
    "created_at": "2026-01-14T11:00:00Z",
    "updated_at": "2026-01-14T12:00:00Z",
    "checkpoints": [
      {
        "id": "chk-vwx123",
        "description": "Schema validated",
        "passed": true
      }
    ]
  },
  "error": null,
  "timestamp": "2026-01-14T12:00:00Z"
}
```

#### List Work Orders

```http
GET /api/v1/flightline/work-orders
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `mission_id` | string | Filter by mission |
| `status` | string | Filter by status |
| `assigned_agent` | string | Filter by assigned agent |
| `priority` | string | Filter by priority (`low`, `medium`, `high`) |
| `limit` | number | Maximum results (default: 50) |
| `offset` | number | Pagination offset (default: 0) |

**Example**:
```http
GET /api/v1/flightline/work-orders?mission_id=msn-abc123&status=in_progress
```

#### Update Work Order

```http
PATCH /api/v1/flightline/work-orders/:id
```

**Request Body**:
```json
{
  "status": "completed",
  "assigned_agent": "full-stack-developer"
}
```

#### Assign Work Order

```http
POST /api/v1/flightline/work-orders/:id/assign
```

**Request Body**:
```json
{
  "agent_type": "full-stack-developer"
}
```

**Response** (200):
```json
{
  "data": {
    "message": "Work order assigned successfully",
    "work_order_id": "wo-jkl012",
    "assigned_agent": "full-stack-developer"
  },
  "error": null,
  "timestamp": "2026-01-14T12:00:00Z"
}
```

---

### Checkpoints

#### Create Checkpoint

```http
POST /api/v1/flightline/checkpoints
```

**Request Body**:
```json
{
  "work_order_id": "wo-jkl012",
  "description": "Database schema validated",
  "criteria": "All tables have primary keys and foreign keys"
}
```

**Response** (201):
```json
{
  "data": {
    "id": "chk-vwx123",
    "work_order_id": "wo-jkl012",
    "description": "Database schema validated",
    "criteria": "All tables have primary keys and foreign keys",
    "passed": false,
    "created_at": "2026-01-14T13:00:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T13:00:00Z"
}
```

#### Get Checkpoint

```http
GET /api/v1/flightline/checkpoints/:id
```

#### List Checkpoints

```http
GET /api/v1/flightline/checkpoints
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `work_order_id` | string | Filter by work order |
| `passed` | boolean | Filter by pass status |
| `limit` | number | Maximum results |
| `offset` | number | Pagination offset |

#### Pass Checkpoint

```http
POST /api/v1/flightline/checkpoints/:id/pass
```

**Request Body**:
```json
{
  "notes": "All criteria met"
}
```

**Response** (200):
```json
{
  "data": {
    "id": "chk-vwx123",
    "passed": true,
    "passed_at": "2026-01-14T14:00:00Z",
    "notes": "All criteria met"
  },
  "error": null,
  "timestamp": "2026-01-14T14:00:00Z"
}
```

---

## Squawk API

### Mailbox

#### Send Message

```http
POST /squawk/v1/mailbox/:agent-id/messages
```

**Request Body**:
```json
{
  "type": "work_assignment",
  "from": "system",
  "payload": {
    "work_order_id": "wo-jkl012",
    "priority": "high",
    "deadline": "2026-01-14T18:00:00Z"
  }
}
```

**Response** (201):
```json
{
  "data": {
    "id": "msg-abc123",
    "agent_id": "full-stack-developer",
    "type": "work_assignment",
    "from": "system",
    "payload": { /* message payload */ },
    "created_at": "2026-01-14T10:30:00Z",
    "read": false
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

#### Get Messages

```http
GET /squawk/v1/mailbox/:agent-id/messages
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter by message type |
| `unread` | boolean | Filter unread messages |
| `limit` | number | Maximum results |
| `offset` | number | Pagination offset |

**Response** (200):
```json
{
  "data": {
    "messages": [
      {
        "id": "msg-abc123",
        "type": "work_assignment",
        "from": "system",
        "payload": { /* message payload */ },
        "created_at": "2026-01-14T10:30:00Z",
        "read": false
      }
    ],
    "total": 1,
    "unread": 1
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

#### Mark as Read

```http
POST /squawk/v1/mailbox/:agent-id/messages/:message-id/read
```

**Response** (200):
```json
{
  "data": {
    "message": "Message marked as read",
    "message_id": "msg-abc123"
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

---

### Cursor

#### Get Cursor

```http
GET /squawk/v1/cursor/:resource-id
```

**Response** (200):
```json
{
  "data": {
    "resource_id": "wo-jkl012",
    "cursor_value": "{\"progress\": 50, \"status\": \"in_progress\"}",
    "updated_at": "2026-01-14T10:30:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

#### Update Cursor

```http
PUT /squawk/v1/cursor/:resource-id
```

**Request Body**:
```json
{
  "cursor_value": "{\"progress\": 75, \"status\": \"in_progress\"}"
}
```

**Response** (200):
```json
{
  "data": {
    "resource_id": "wo-jkl012",
    "cursor_value": "{\"progress\": 75, \"status\": \"in_progress\"}",
    "updated_at": "2026-01-14T11:00:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T11:00:00Z"
}
```

#### Delete Cursor

```http
DELETE /squawk/v1/cursor/:resource-id
```

---

### Locks

#### Acquire Lock

```http
POST /squawk/v1/locks/:resource-id/acquire
```

**Request Body**:
```json
{
  "holder_id": "full-stack-developer",
  "ttl": 60000
}
```

**Response** (200):
```json
{
  "data": {
    "resource_id": "wo-jkl012",
    "holder_id": "full-stack-developer",
    "acquired_at": "2026-01-14T10:30:00Z",
    "expires_at": "2026-01-14T10:31:00Z"
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

#### Release Lock

```http
POST /squawk/v1/locks/:resource-id/release
```

**Request Body**:
```json
{
  "holder_id": "full-stack-developer"
}
```

**Response** (200):
```json
{
  "data": {
    "message": "Lock released successfully",
    "resource_id": "wo-jkl012"
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

#### Check Lock Status

```http
GET /squawk/v1/locks/:resource-id
```

**Response** (200):
```json
{
  "data": {
    "resource_id": "wo-jkl012",
    "holder_id": "full-stack-developer",
    "acquired_at": "2026-01-14T10:30:00Z",
    "expires_at": "2026-01-14T10:31:00Z",
    "active": true
  },
  "error": null,
  "timestamp": "2026-01-14T10:30:00Z"
}
```

---

## Health Endpoints

### Server Health

```http
GET /health
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "squawk": "connected",
    "database": "connected"
  }
}
```

### Squawk Health

```http
GET http://localhost:3002/health
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2026-01-14T10:30:00Z",
  "version": "1.0.0"
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `NOT_FOUND` | Resource not found | 404 |
| `CONFLICT` | Resource conflict (duplicate, lock, etc.) | 409 |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | Service not available | 503 |

---

## Rate Limiting

Currently, no rate limiting is enforced. Future versions will implement:
- Per-IP rate limits
- Per-agent rate limits
- Burst allowance

---

## Authentication

Currently, no authentication is required. Future versions will implement:
- API key authentication
- JWT tokens for agents
- OAuth integration

---

## WebSocket API

Coming soon! WebSocket API will provide real-time updates for:
- Mission status changes
- Agent activity
- Cursor updates
- Lock notifications

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { FleetClient } from '@fleettools/sdk';

const client = new FleetClient({
  apiUrl: 'http://localhost:3001/api/v1',
  squawkUrl: 'http://localhost:3002/squawk/v1'
});

// Create mission
const mission = await client.flightline.createMission({
  title: 'Build authentication system'
});

// Create work order
const workOrder = await client.flightline.createWorkOrder({
  mission_id: mission.id,
  title: 'Design database schema'
});

// Send message via Squawk
await client.squawk.sendMessage('full-stack-developer', {
  type: 'work_assignment',
  payload: { work_order_id: workOrder.id }
});
```

### Python

```python
from fleettools import FleetClient

client = FleetClient(
    api_url='http://localhost:3001/api/v1',
    squawk_url='http://localhost:3002/squawk/v1'
)

# Create mission
mission = client.flightline.create_mission(
    title='Build authentication system'
)

# Create work order
work_order = client.flightline.create_work_order(
    mission_id=mission.id,
    title='Design database schema'
)
```

---

**Version**: [Current Version]
**Last Updated**: 2026-01-14
