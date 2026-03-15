# CarConnect Pro - Vehicle Integration API

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved
> **API Base Path:** `/api/v1/vehicle`

## 1. Overview

The Vehicle Integration API provides access to vehicle telemetry data via CAN bus, including speed, RPM, fuel level, and diagnostic information.

## 2. CAN Bus Configuration

### 2.1 Supported CAN Messages

| Parameter | CAN Message ID | DLC | Update Rate | Unit |
|-----------|---------------|-----|-------------|------|
| Vehicle Speed | 0x0CF | 8 | 100 ms | km/h |
| Engine RPM | 0x0C0 | 8 | 50 ms | RPM |
| Fuel Level | 0x348 | 8 | 1000 ms | % |
| Engine Temperature | 0x3E8 | 8 | 1000 ms | C |
| Odometer | 0x3F0 | 8 | 5000 ms | km |

### 2.2 CAN Frame Format

```
CAN Frame: ID 0x0CF (Vehicle Speed)
+--------+--------+--------+--------+--------+--------+--------+--------+
| Byte 0 | Byte 1 | Byte 2 | Byte 3 | Byte 4 | Byte 5 | Byte 6 | Byte 7 |
+--------+--------+--------+--------+--------+--------+--------+--------+
| Speed (MSB) | Speed (LSB) | Reserved                                   |
| uint16, 0.01 km/h resolution                                           |
+--------+--------+--------+--------+--------+--------+--------+--------+
```

## 3. API Endpoints

### 3.1 Get Vehicle Speed

**`GET /api/v1/vehicle/speed`**

Returns the current vehicle speed from CAN bus.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "vehicle_speed_kmh": 60.5,
    "timestamp": "2026-03-15T10:30:00.123Z",
    "source": "can_bus",
    "can_message_id": "0x0CF",
    "quality": "valid"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

**Error Response (503 Service Unavailable):**
```json
{
  "status": "error",
  "error": {
    "code": "E-CAN-004",
    "message": "CAN bus timeout - no response within 500ms",
    "details": {
      "can_message_id": "0x0CF",
      "timeout_ms": 500,
      "last_valid_timestamp": "2026-03-15T10:29:59.500Z"
    }
  },
  "timestamp": "2026-03-15T10:30:00.500Z"
}
```

### 3.2 Get Engine RPM

**`GET /api/v1/vehicle/rpm`**

Returns the current engine RPM.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "engine_rpm": 2500,
    "timestamp": "2026-03-15T10:30:00.123Z",
    "source": "can_bus",
    "can_message_id": "0x0C0",
    "quality": "valid"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 3.3 Get Fuel Level

**`GET /api/v1/vehicle/fuel`**

Returns the current fuel level percentage.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "fuel_level_percent": 72.5,
    "timestamp": "2026-03-15T10:30:00.123Z",
    "source": "can_bus",
    "can_message_id": "0x348",
    "quality": "valid"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 3.4 Get All Vehicle Telemetry

**`GET /api/v1/vehicle/telemetry`**

Returns all available vehicle telemetry data.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "vehicle_speed_kmh": 60.5,
    "engine_rpm": 2500,
    "fuel_level_percent": 72.5,
    "engine_temp_celsius": 92.0,
    "odometer_km": 45230.5,
    "timestamp": "2026-03-15T10:30:00.123Z",
    "source": "can_bus",
    "quality": "valid"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 3.5 Get CAN Bus Status

**`GET /api/v1/vehicle/can/status`**

Returns the status of the CAN bus interface.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "interface": "can0",
    "state": "active",
    "bitrate": 500000,
    "tx_count": 12450,
    "rx_count": 1893200,
    "error_count": 0,
    "bus_off_count": 0,
    "uptime_seconds": 3600
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

## 4. Parameter Naming Convention

All API responses use **snake_case** parameter naming:

| Parameter | Format | Example |
|-----------|--------|---------|
| `vehicle_speed_kmh` | float | 60.5 |
| `engine_rpm` | integer | 2500 |
| `fuel_level_percent` | float | 72.5 |
| `engine_temp_celsius` | float | 92.0 |
| `odometer_km` | float | 45230.5 |
| `can_message_id` | hex string | "0x0CF" |

**Note:** The parameter is `vehicle_speed_kmh` (not `speed_kmh`) to avoid ambiguity with other speed measurements in the system (e.g., GPS speed).

## 5. CAN Message ID Format

All CAN message IDs are represented in **hexadecimal format** with the `0x` prefix:

- Correct: `"0x0CF"`, `"0x0C0"`, `"0x348"`
- Incorrect: `"207"`, `"CF"`, `"0cf"`

## 6. Validation Rules

| Field | Type | Constraints |
|-------|------|-------------|
| `vehicle_speed_kmh` | float | 0.0 - 400.0 |
| `engine_rpm` | integer | 0 - 15000 |
| `fuel_level_percent` | float | 0.0 - 100.0 |
| `engine_temp_celsius` | float | -40.0 - 150.0 |
| `can_message_id` | string | Hex format: /^0x[0-9A-F]{3}$/ |

## 7. Error Codes

| Code | Description | Recovery |
|------|-------------|----------|
| E-CAN-001 | CAN interface not found | Check hardware connection |
| E-CAN-002 | CAN bus off | Reset CAN controller |
| E-CAN-003 | Invalid CAN frame | Log and skip frame |
| E-CAN-004 | CAN bus timeout | Retry with backoff, check connection |

See [Error Codes Reference](../validation/error-codes.md) for complete list.
