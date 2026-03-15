# CarConnect Pro - Error Codes Reference

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved

## 1. Overview

This document provides a comprehensive reference of all error codes in CarConnect Pro. Error codes follow the format `E-{SUBSYSTEM}-{NUMBER}` where subsystem identifies the originating component.

## 2. Error Code Format

```
E-CAN-004
| |   |
| |   +-- Sequential number (3 digits)
| +------ Subsystem identifier
+-------- Error prefix
```

### Subsystem Identifiers

| ID | Subsystem | Description |
|----|-----------|-------------|
| CAN | CAN Bus | Vehicle CAN bus communication |
| GPS | GPS/Navigation | GPS module and navigation |
| AUD | Audio | Audio DSP and playback |
| SYS | System | System-level errors |
| DB | Database | Database operations |
| API | API | REST API errors |

## 3. CAN Bus Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-CAN-001 | CAN_INTERFACE_NOT_FOUND | CRITICAL | CAN bus interface (can0) not detected at startup | 1. Check physical connection. 2. Verify kernel module loaded (`modprobe can`). 3. Restart system. |
| E-CAN-002 | CAN_BUS_OFF | HIGH | CAN controller entered bus-off state due to error count threshold | 1. Reset CAN controller (`ip link set can0 down && ip link set can0 up`). 2. Check for wiring issues. 3. If persistent, check bus termination. |
| E-CAN-003 | CAN_INVALID_FRAME | LOW | Received CAN frame with invalid format or unexpected DLC | 1. Log frame details for analysis. 2. Skip frame and continue. 3. If frequent, investigate source on bus. |
| E-CAN-004 | CAN_TIMEOUT | MEDIUM | No CAN message received within expected timeout period (default: 500ms) | 1. Check CAN bus connection status. 2. Verify target ECU is powered and transmitting. 3. Check message filter configuration. 4. Retry with exponential backoff (500ms, 1s, 2s). 5. If persistent after 3 retries, report degraded vehicle integration status. |

## 4. GPS Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-GPS-001 | GPS_MODULE_NOT_FOUND | CRITICAL | GPS hardware module not detected on configured interface | 1. Check UART/I2C connection. 2. Verify device node exists (`/dev/ttyS1`). 3. Check power supply to GPS module. |
| E-GPS-002 | GPS_SIGNAL_LOST | MEDIUM | GPS fix lost after previously having a valid position | 1. Continue with last known position. 2. Use dead reckoning if available. 3. Wait for signal reacquisition. 4. Notify user of degraded navigation. |
| E-GPS-003 | GPS_COLD_START | LOW | GPS module performing cold start, no almanac/ephemeris data available | 1. Wait for satellite acquisition (up to 30 seconds typical). 2. Ensure antenna has clear sky view. 3. Report acquisition progress to user (satellites visible/used). 4. If TTFF exceeds 60 seconds, check antenna connection. |

## 5. Audio Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-AUD-001 | AUDIO_DEVICE_NOT_FOUND | HIGH | Audio output device not detected | 1. Check I2S/SPI connection. 2. Verify audio driver loaded. 3. Restart audio service. |
| E-AUD-002 | AUDIO_PLAYBACK_FAILED | MEDIUM | Audio playback failed to start or interrupted | 1. Stop current playback. 2. Reset audio pipeline. 3. Retry playback. |
| E-AUD-003 | AUDIO_BUFFER_UNDERRUN | LOW | Audio buffer underrun causing audible glitch | 1. Increase buffer size. 2. Check CPU load. 3. Reduce DSP processing if needed. |
| E-AUD-004 | AUDIO_FORMAT_UNSUPPORTED | LOW | Requested audio format not supported by DSP | 1. Check supported formats. 2. Transcode to supported format. 3. Report to user. |
| E-AUD-005 | AUDIO_DSP_INIT_FAILED | HIGH | Audio DSP processor failed to initialize during startup or reset | 1. Power cycle the DSP hardware (toggle DSP reset GPIO pin). 2. Wait 500ms for DSP boot sequence. 3. Retry initialization (max 3 attempts). 4. If retry fails, check DSP firmware integrity (SHA-256 checksum). 5. If firmware corrupted, restore from factory backup: `cp /opt/carconnect/factory/dsp-firmware.bin /lib/firmware/audio-dsp.bin`. 6. Attempt re-initialization after firmware restore. 7. If still failing, disable audio subsystem and report E-AUD-001. 8. Log full diagnostic info: DSP register dump, firmware version, error codes from DSP status register. |

## 6. System Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-SYS-001 | SYSTEM_LOW_MEMORY | MEDIUM | Available memory below threshold (< 256 MB) | 1. Release caches. 2. Reduce non-essential services. 3. Log memory consumers. |
| E-SYS-002 | SYSTEM_HIGH_TEMPERATURE | HIGH | CPU temperature exceeds threshold (> 80C) | 1. Reduce processing load. 2. Activate thermal throttling. 3. If > 90C, initiate safe shutdown. |
| E-SYS-003 | SYSTEM_STORAGE_FULL | MEDIUM | Storage usage exceeds 90% | 1. Rotate and compress logs. 2. Clear temporary files. 3. Notify user. |
| E-SYS-004 | SYSTEM_WATCHDOG_TIMEOUT | CRITICAL | Service failed to respond to watchdog within timeout | 1. Restart affected service. 2. If repeated, escalate severity. 3. Enter safe mode if critical service. |

## 7. Database Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-DB-001 | DATABASE_CORRUPTED | CRITICAL | SQLite database integrity check failed | 1. Attempt repair with `.recover`. 2. Restore from backup. 3. Factory reset if no backup. |
| E-DB-002 | DATABASE_LOCKED | MEDIUM | Database locked by another process | 1. Wait and retry (exponential backoff). 2. Check for stuck processes. 3. Restart if persistent. |
| E-DB-003 | DATABASE_MIGRATION_FAILED | HIGH | Schema migration failed during update | 1. Rollback migration. 2. Check migration script. 3. Rollback to previous version if needed. |

## 8. API Error Codes

| Code | Name | Severity | Description | Recovery Procedure |
|------|------|----------|-------------|-------------------|
| E-API-001 | API_VALIDATION_FAILED | LOW | Request body/params failed Joi validation | Return 400 with validation error details. |
| E-API-002 | API_UNAUTHORIZED | LOW | Missing or invalid authentication token | Return 401, client should re-authenticate. |
| E-API-003 | API_RATE_LIMITED | LOW | Request rate limit exceeded | Return 429 with Retry-After header. |
| E-API-004 | API_INTERNAL_ERROR | HIGH | Unhandled internal server error | Log full stack trace, return 500. |

## 9. Error Response Format

All errors returned via API follow this format:

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
