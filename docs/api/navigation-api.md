# CarConnect Pro - Navigation API

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved
> **API Base Path:** `/api/v1/navigation`

## 1. Overview

The Navigation API provides access to GPS position data, route calculation, and turn-by-turn navigation functionality.

## 2. GPS Configuration

### 2.1 Supported GPS Protocols

| Protocol | Interface | Baud Rate | Update Rate |
|----------|----------|-----------|-------------|
| NMEA 0183 | UART | 9600-115200 | 1-10 Hz |
| UBX (u-blox) | UART/I2C | 9600-921600 | 1-18 Hz |

### 2.2 Position Accuracy

| Mode | Horizontal | Vertical | TTFF (Cold) | TTFF (Warm) |
|------|-----------|----------|-------------|-------------|
| GPS Only | 2.5 m CEP | 5.0 m | 30 s | 5 s |
| GPS + GLONASS | 2.0 m CEP | 4.0 m | 25 s | 3 s |
| GPS + Dead Reckoning | 1.0 m CEP | 3.0 m | 30 s | 5 s |

## 3. API Endpoints

### 3.1 Get Current Position

**`GET /api/v1/navigation/position`**

Returns current GPS position.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude_m": 15.2,
    "heading_deg": 245.0,
    "gps_speed_kmh": 45.2,
    "accuracy_m": 2.1,
    "fix_type": "3D",
    "satellites_used": 12,
    "timestamp": "2026-03-15T10:30:00.123Z"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "error": {
    "code": "E-GPS-003",
    "message": "GPS cold start in progress - acquiring satellites",
    "details": {
      "satellites_visible": 4,
      "satellites_used": 0,
      "time_since_start_s": 15,
      "estimated_ttff_s": 15
    }
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 3.2 Calculate Route

**`POST /api/v1/navigation/route`**

Calculates a route between two points.

**Request Body:**
```json
{
  "origin": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "destination": {
    "latitude": 37.3382,
    "longitude": -121.8863
  },
  "options": {
    "avoid_tolls": false,
    "avoid_highways": false,
    "route_preference": "fastest"
  }
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "distance_km": 77.5,
    "duration_minutes": 55,
    "waypoints": [
      {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "instruction": "Start on Market St heading east",
        "distance_km": 0.0
      },
      {
        "latitude": 37.5585,
        "longitude": -122.2711,
        "instruction": "Merge onto US-101 S",
        "distance_km": 25.3
      },
      {
        "latitude": 37.3382,
        "longitude": -121.8863,
        "instruction": "Arrive at destination",
        "distance_km": 77.5
      }
    ]
  },
  "timestamp": "2026-03-15T10:30:01.500Z"
}
```

### 3.3 Get Navigation Status

**`GET /api/v1/navigation/status`**

Returns the current navigation guidance status.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "active": true,
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "next_instruction": "Turn right on El Camino Real in 500m",
    "distance_to_next_km": 0.5,
    "eta_minutes": 22,
    "remaining_distance_km": 35.2,
    "current_road": "US-101 S"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 3.4 Cancel Navigation

**`DELETE /api/v1/navigation/route/:route_id`**

Cancels active navigation.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "route_id": "550e8400-e29b-41d4-a716-446655440000",
    "cancelled": true
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

## 4. Validation Rules

| Field | Type | Constraints |
|-------|------|-------------|
| `latitude` | float | -90.0 to 90.0 |
| `longitude` | float | -180.0 to 180.0 |
| `altitude_m` | float | -1000.0 to 100000.0 |
| `heading_deg` | float | 0.0 to 360.0 |
| `gps_speed_kmh` | float | 0.0 to 400.0 |
| `route_preference` | string | "fastest", "shortest", "eco" |

## 5. Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| E-GPS-001 | GPS module not detected | Check hardware connection |
| E-GPS-002 | GPS signal lost | Move to open area, wait for reacquisition |
| E-GPS-003 | GPS cold start in progress | Wait for satellite acquisition (up to 30s) |

See [Error Codes Reference](../validation/error-codes.md) for complete list.
