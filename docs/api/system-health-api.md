# CarConnect Pro - System Health API

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved
> **API Base Path:** `/api/v1/health`

## 1. Overview

The System Health API provides endpoints for monitoring system status, component health, performance metrics, and diagnostic information.

## 2. API Endpoints

### 2.1 System Health Check

**`GET /api/v1/health`**

Returns overall system health status.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "system_status": "healthy",
    "uptime_seconds": 86400,
    "version": "1.0.0",
    "components": {
      "vehicle_integration": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      },
      "navigation": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      },
      "audio": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      },
      "database": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      }
    }
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

**Response (503 - Degraded):**
```json
{
  "status": "success",
  "data": {
    "system_status": "degraded",
    "uptime_seconds": 86400,
    "version": "1.0.0",
    "components": {
      "vehicle_integration": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      },
      "navigation": {
        "status": "unhealthy",
        "last_check": "2026-03-15T10:29:59Z",
        "error": "E-GPS-002"
      },
      "audio": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      },
      "database": {
        "status": "healthy",
        "last_check": "2026-03-15T10:29:59Z"
      }
    }
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 2.2 Component Health

**`GET /api/v1/health/components/:component`**

Returns detailed health for a specific component.

**Valid components:** `vehicle`, `navigation`, `audio`, `database`, `can`, `gps`

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "component": "vehicle",
    "status": "healthy",
    "metrics": {
      "can_bus_state": "active",
      "messages_per_second": 245,
      "error_rate": 0.001,
      "last_message_age_ms": 12
    },
    "last_check": "2026-03-15T10:29:59Z"
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 2.3 System Metrics

**`GET /api/v1/health/metrics`**

Returns system performance metrics.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "cpu": {
      "usage_percent": 35.2,
      "temperature_celsius": 55.0,
      "frequency_mhz": 1800
    },
    "memory": {
      "total_mb": 4096,
      "used_mb": 1520,
      "available_mb": 2576,
      "usage_percent": 37.1
    },
    "storage": {
      "total_gb": 32.0,
      "used_gb": 12.5,
      "available_gb": 19.5,
      "usage_percent": 39.1
    },
    "database": {
      "size_mb": 45.2,
      "wal_size_mb": 2.1,
      "page_count": 11520
    }
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 2.4 Diagnostic Report

**`GET /api/v1/health/diagnostics`**

Returns a comprehensive diagnostic report.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "system_info": {
      "version": "1.0.0",
      "node_version": "20.11.0",
      "platform": "linux",
      "arch": "arm64",
      "uptime_seconds": 86400
    },
    "active_errors": [],
    "recent_warnings": [
      {
        "code": "E-GPS-003",
        "message": "GPS cold start",
        "timestamp": "2026-03-15T10:00:00Z",
        "resolved": true
      }
    ],
    "watchdog": {
      "status": "active",
      "last_kick": "2026-03-15T10:29:59Z",
      "timeout_ms": 5000
    }
  },
  "timestamp": "2026-03-15T10:30:00.150Z"
}
```

### 2.5 Trigger Health Check

**`POST /api/v1/health/check`**

Forces an immediate health check on all components.

**Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "check_id": "550e8400-e29b-41d4-a716-446655440001",
    "duration_ms": 250,
    "results": {
      "vehicle_integration": "pass",
      "navigation": "pass",
      "audio": "pass",
      "database": "pass"
    }
  },
  "timestamp": "2026-03-15T10:30:00.400Z"
}
```

## 3. Health Status Values

| Status | Description | HTTP Code |
|--------|-------------|-----------|
| `healthy` | All components operating normally | 200 |
| `degraded` | Some components have issues | 503 |
| `unhealthy` | Critical components have failed | 503 |
| `unknown` | Unable to determine status | 503 |

## 4. Monitoring Integration

The health API is designed for integration with monitoring systems:

- **Polling interval**: Recommended 10-30 seconds
- **Alert thresholds**: Configurable per component
- **Prometheus format**: Available at `/api/v1/health/metrics/prometheus` (future)
