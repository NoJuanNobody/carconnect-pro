# CarConnect Pro - Deployment Guide

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved

## 1. Overview

This guide covers the deployment process for CarConnect Pro on target automotive hardware, including build, flash, configuration, and validation steps.

## 2. Prerequisites

### 2.1 Development Environment

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | Application runtime |
| npm | 10+ | Package management |
| Git | 2.40+ | Version control |
| Jest | 29.7+ | Testing framework |

### 2.2 Target Hardware

| Component | Specification |
|-----------|--------------|
| CPU | ARM Cortex-A53/A72 (quad-core minimum) |
| RAM | 2 GB minimum, 4 GB recommended |
| Storage | 16 GB eMMC minimum, 32 GB eUFS recommended |
| CAN | SocketCAN-compatible interface |
| GPS | UART/I2C connected GNSS module |
| Audio | I2S/SPI connected DSP |

## 3. Build Process

### 3.1 Build Steps

```bash
# Clone repository
git clone https://github.com/carconnect/carconnect-pro.git
cd carconnect-pro

# Install dependencies
npm install --production

# Run validation suite
npm test

# Run architecture compliance tests
npx jest tests/architecture-compliance.test.js

# Run documentation validation
python3 scripts/validate-docs.py
```

### 3.2 Build Configuration

Create a deployment configuration file at `/etc/carconnect/config.json`:

```json
{
  "environment": "production",
  "log_level": "info",
  "database": {
    "path": "/var/lib/carconnect/main.db",
    "wal_mode": true
  },
  "can": {
    "interface": "can0",
    "bitrate": 500000
  },
  "gps": {
    "device": "/dev/ttyS1",
    "baud_rate": 115200
  },
  "api": {
    "port": 8080,
    "host": "127.0.0.1"
  },
  "watchdog": {
    "enabled": true,
    "timeout_ms": 5000
  }
}
```

## 4. Deployment Procedure

### 4.1 Pre-Deployment Checklist

See [Pre-Production Checklist](pre-production-checklist.md) for complete validation requirements.

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Architecture compliance tests passing
- [ ] Documentation validation passing
- [ ] Security audit completed
- [ ] Performance benchmarks within targets
- [ ] Hardware compatibility verified

### 4.2 Deployment Steps

1. **Prepare target system**
   ```bash
   # Create application directory
   mkdir -p /opt/carconnect
   mkdir -p /var/lib/carconnect
   mkdir -p /var/log/carconnect
   mkdir -p /etc/carconnect
   ```

2. **Deploy application**
   ```bash
   # Copy application files
   rsync -av --exclude=node_modules --exclude=.git \
     ./carconnect-pro/ target:/opt/carconnect/

   # Install production dependencies on target
   ssh target "cd /opt/carconnect && npm install --production"
   ```

3. **Configure system service**
   ```bash
   # Copy systemd service file
   cp deployment/carconnect.service /etc/systemd/system/
   systemctl daemon-reload
   systemctl enable carconnect
   ```

4. **Deploy configuration**
   ```bash
   cp config/production.json /etc/carconnect/config.json
   ```

5. **Initialize database**
   ```bash
   cd /opt/carconnect
   node scripts/init-database.js
   ```

6. **Start service**
   ```bash
   systemctl start carconnect
   systemctl status carconnect
   ```

### 4.3 Post-Deployment Validation

```bash
# Check service status
systemctl status carconnect

# Verify health endpoint
curl -s http://127.0.0.1:8080/api/v1/health | jq .

# Verify CAN bus integration
curl -s http://127.0.0.1:8080/api/v1/vehicle/can/status | jq .

# Check logs for errors
journalctl -u carconnect --since "5 minutes ago" --no-pager
```

## 5. OTA Update Procedure

### 5.1 Update Package Format

```
carconnect-update-1.0.1.tar.gz
  ├── manifest.json        (version, checksum, dependencies)
  ├── signature.sig         (Ed25519 signature)
  ├── application/          (application files)
  ├── migrations/           (database migrations)
  └── config/               (configuration updates)
```

### 5.2 Update Steps

1. Download update package to staging partition
2. Verify Ed25519 signature
3. Verify SHA-256 checksum
4. Apply to inactive partition (A/B scheme)
5. Run database migrations
6. Switch active partition
7. Reboot and validate
8. If validation fails, rollback to previous partition

## 6. Rollback

See [Rollback Procedures](rollback-procedures.md) for detailed rollback instructions including factory reset.

## 7. Monitoring

### 7.1 Log Locations

| Log | Path | Rotation |
|-----|------|----------|
| Application | /var/log/carconnect/app.log | Daily, 7 days |
| Error | /var/log/carconnect/error.log | Daily, 30 days |
| Audit | /var/log/carconnect/audit.log | Daily, 90 days |
| CAN | /var/log/carconnect/can.log | Hourly, 24 hours |

### 7.2 Health Monitoring

Configure monitoring to poll the health endpoint:

```bash
# Recommended monitoring interval: 30 seconds
curl -sf http://127.0.0.1:8080/api/v1/health || alert "CarConnect health check failed"
```
