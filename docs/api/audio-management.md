# Audio Management API

## Overview

The Audio Management API provides endpoints for managing audio sources and controls in the CarConnect Pro infotainment system.

## Base URL

```
/api/v1/audio
```

## Endpoints

### GET /api/v1/audio/sources

Returns all available audio sources.

**Response (200):**

```json
{
  "success": true,
  "timestamp": "2026-03-15T12:00:00.000Z",
  "data": {
    "sources": [
      {
        "id": "radio",
        "name": "Radio",
        "type": "built-in",
        "connected": true,
        "available": true,
        "active": true
      }
    ],
    "activeSource": "radio"
  }
}
```

### POST /api/v1/audio/source

Switches the active audio source with configurable fade time.

**Request Body:**

| Field    | Type   | Required | Description                        |
|----------|--------|----------|------------------------------------|
| sourceId | string | Yes      | One of: radio, bluetooth, usb, aux, android_auto, apple_carplay |
| fadeTime | number | No       | Fade transition time in ms (0-500, default 200) |

**Response (200):**

```json
{
  "success": true,
  "timestamp": "2026-03-15T12:00:00.000Z",
  "data": {
    "previousSource": "radio",
    "currentSource": "bluetooth",
    "fadeTime": 200,
    "switchTime": 205,
    "transactionId": "uuid-v4"
  }
}
```

**Error Responses:**

- `400` — Validation error (invalid sourceId or fadeTime)
- `404` — Source not found
- `409` — Source not connected

### PATCH /api/v1/audio/control

Updates audio control parameters.

**Request Body (at least one field required):**

| Field   | Type   | Range       | Description          |
|---------|--------|-------------|----------------------|
| volume  | number | 0 to 100    | Volume level         |
| balance | number | -100 to 100 | Left/right balance   |
| fade    | number | -100 to 100 | Front/rear fade      |
| bass    | number | -10 to 10   | Bass adjustment      |
| treble  | number | -10 to 10   | Treble adjustment    |

**Response (200):**

```json
{
  "success": true,
  "timestamp": "2026-03-15T12:00:00.000Z",
  "data": {
    "controls": {
      "volume": 75,
      "balance": 0,
      "fade": 0,
      "bass": 3,
      "treble": -2
    },
    "updatedFields": {
      "volume": 75
    }
  }
}
```

**Error Response (400):**

```json
{
  "success": false,
  "timestamp": "2026-03-15T12:00:00.000Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "volume",
        "message": "Volume must be between 0 and 100"
      }
    ]
  }
}
```

## Audio Sources

| ID             | Name          | Type        |
|----------------|---------------|-------------|
| radio          | Radio         | built-in    |
| bluetooth      | Bluetooth     | wireless    |
| usb            | USB           | wired       |
| aux            | AUX           | wired       |
| android_auto   | Android Auto  | integration |
| apple_carplay  | Apple CarPlay | integration |

## Performance

- Audio source switching completes within 500ms maximum.
