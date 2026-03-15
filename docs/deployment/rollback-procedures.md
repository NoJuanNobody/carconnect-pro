# CarConnect Pro - Rollback Procedures

> **Version:** 1.0.0
> **Last Updated:** 2026-03-15
> **Status:** Approved

## 1. Overview

This document covers rollback procedures for CarConnect Pro deployments, including version rollback, configuration rollback, and factory reset.

## 2. Rollback Strategies

| Strategy | Use Case | Data Impact | Downtime |
|----------|----------|-------------|----------|
| Service Restart | Transient failures | None | < 5 seconds |
| Version Rollback | Bad update | None (migrations reversible) | < 30 seconds |
| Configuration Reset | Config corruption | Config reset only | < 10 seconds |
| Factory Reset | Unrecoverable state | User data optionally preserved | < 2 minutes |

## 3. Version Rollback (A/B Partition)

### 3.1 Automatic Rollback

The system automatically rolls back if the application fails to pass health checks within 60 seconds of boot:

```
Boot Count: 1 -> Try new version -> Health check fails
Boot Count: 2 -> Retry new version -> Health check fails
Boot Count: 3 -> Rollback to previous partition -> Health check passes
```

### 3.2 Manual Version Rollback

```bash
# Check current and previous versions
cat /opt/carconnect/version.json

# Switch to previous partition
/opt/carconnect/scripts/switch-partition.sh --rollback

# Verify rollback
systemctl restart carconnect
curl -s http://127.0.0.1:8080/api/v1/health | jq '.data.version'
```

## 4. Configuration Rollback

```bash
# Backup current config
cp /etc/carconnect/config.json /etc/carconnect/config.json.bak

# Restore default configuration
cp /opt/carconnect/config/defaults.json /etc/carconnect/config.json

# Restart service
systemctl restart carconnect
```

## 5. Factory Reset Procedure

The factory reset script restores the system to a known-good state. User data can optionally be preserved.

### 5.1 Factory Reset Script

```bash
#!/bin/bash
# CarConnect Pro Factory Reset Script
# Usage: factory-reset.sh [--preserve-user-data] [--force]

set -euo pipefail

CARCONNECT_DIR="/opt/carconnect"
DATA_DIR="/var/lib/carconnect"
CONFIG_DIR="/etc/carconnect"
LOG_DIR="/var/log/carconnect"
BACKUP_DIR="/tmp/carconnect-backup"
FACTORY_IMAGE="${CARCONNECT_DIR}/factory/factory-image.tar.gz"
FACTORY_CONFIG="${CARCONNECT_DIR}/factory/default-config.json"

PRESERVE_USER_DATA=false
FORCE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --preserve-user-data)
      PRESERVE_USER_DATA=true
      ;;
    --force)
      FORCE=true
      ;;
    --help)
      echo "Usage: factory-reset.sh [--preserve-user-data] [--force]"
      echo "  --preserve-user-data  Back up and restore user profiles and preferences"
      echo "  --force               Skip confirmation prompt"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $arg"
      echo "Usage: factory-reset.sh [--preserve-user-data] [--force]"
      exit 1
      ;;
  esac
done

# Confirmation prompt
if [ "$FORCE" = false ]; then
  echo "WARNING: This will reset CarConnect Pro to factory defaults."
  if [ "$PRESERVE_USER_DATA" = true ]; then
    echo "User data (profiles, preferences) will be preserved."
  else
    echo "ALL user data will be DELETED."
  fi
  read -r -p "Continue? [y/N] " response
  if [[ ! "$response" =~ ^[yY]$ ]]; then
    echo "Factory reset cancelled."
    exit 0
  fi
fi

echo "=== CarConnect Pro Factory Reset ==="
echo "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 1: Stop the service
echo "[1/8] Stopping CarConnect Pro service..."
if systemctl is-active --quiet carconnect; then
  systemctl stop carconnect
  echo "  Service stopped."
else
  echo "  Service was not running."
fi

# Step 2: Backup user data if requested
if [ "$PRESERVE_USER_DATA" = true ]; then
  echo "[2/8] Backing up user data..."
  mkdir -p "${BACKUP_DIR}"

  if [ -f "${DATA_DIR}/main.db" ]; then
    # Export user profiles and preferences tables
    sqlite3 "${DATA_DIR}/main.db" ".dump user_profiles" > "${BACKUP_DIR}/user_profiles.sql" 2>/dev/null || true
    sqlite3 "${DATA_DIR}/main.db" ".dump user_preferences" > "${BACKUP_DIR}/user_preferences.sql" 2>/dev/null || true
    sqlite3 "${DATA_DIR}/main.db" ".dump audio_presets" > "${BACKUP_DIR}/audio_presets.sql" 2>/dev/null || true
    echo "  User data backed up to ${BACKUP_DIR}"
  else
    echo "  No database found, skipping backup."
  fi
else
  echo "[2/8] Skipping user data backup (--preserve-user-data not set)."
fi

# Step 3: Verify factory image exists
echo "[3/8] Verifying factory image..."
if [ ! -f "${FACTORY_IMAGE}" ]; then
  echo "ERROR: Factory image not found at ${FACTORY_IMAGE}"
  echo "Cannot proceed with factory reset."
  # Attempt to restart service before exiting
  systemctl start carconnect 2>/dev/null || true
  exit 1
fi
echo "  Factory image verified."

# Step 4: Clear application data
echo "[4/8] Clearing application data..."
rm -rf "${DATA_DIR:?}"/*
rm -rf "${LOG_DIR:?}"/*
echo "  Application data cleared."

# Step 5: Restore factory image
echo "[5/8] Restoring factory image..."
tar -xzf "${FACTORY_IMAGE}" -C "${CARCONNECT_DIR}/" --overwrite
echo "  Factory image restored."

# Step 6: Restore default configuration
echo "[6/8] Restoring default configuration..."
if [ -f "${FACTORY_CONFIG}" ]; then
  cp "${FACTORY_CONFIG}" "${CONFIG_DIR}/config.json"
  echo "  Default configuration restored."
else
  echo "WARNING: Default config not found at ${FACTORY_CONFIG}, using existing config."
fi

# Step 7: Restore user data if backed up
if [ "$PRESERVE_USER_DATA" = true ]; then
  echo "[7/8] Restoring user data..."

  # Initialize fresh database first
  cd "${CARCONNECT_DIR}"
  node scripts/init-database.js 2>/dev/null || {
    echo "ERROR: Failed to initialize database."
    echo "User data restoration skipped. Manual recovery may be needed."
    echo "Backup files preserved at: ${BACKUP_DIR}"
    # Continue with reset despite this error
  }

  # Restore user data tables
  restore_failed=false
  for sql_file in "${BACKUP_DIR}"/*.sql; do
    if [ -f "$sql_file" ]; then
      table_name=$(basename "$sql_file" .sql)
      echo "  Restoring table: ${table_name}..."
      if ! sqlite3 "${DATA_DIR}/main.db" < "$sql_file" 2>/dev/null; then
        echo "  WARNING: Failed to restore ${table_name}. Backup preserved at ${sql_file}"
        restore_failed=true
      fi
    fi
  done

  if [ "$restore_failed" = true ]; then
    echo "  WARNING: Some user data could not be restored."
    echo "  Backup files preserved at: ${BACKUP_DIR}"
    echo "  Manual restoration may be required."
  else
    echo "  User data restored successfully."
    rm -rf "${BACKUP_DIR}"
  fi
else
  echo "[7/8] Initializing fresh database..."
  cd "${CARCONNECT_DIR}"
  node scripts/init-database.js 2>/dev/null || {
    echo "ERROR: Failed to initialize database. Service may not start correctly."
  }
fi

# Step 8: Start service and validate
echo "[8/8] Starting service and validating..."
systemctl start carconnect

# Wait for service to be ready (up to 30 seconds)
max_attempts=30
attempt=0
service_healthy=false

while [ $attempt -lt $max_attempts ]; do
  attempt=$((attempt + 1))
  if curl -sf http://127.0.0.1:8080/api/v1/health > /dev/null 2>&1; then
    service_healthy=true
    break
  fi
  sleep 1
done

echo ""
echo "=== Factory Reset Validation ==="

if [ "$service_healthy" = true ]; then
  echo "  Service Status:    RUNNING"

  # Validate health endpoint
  health_response=$(curl -sf http://127.0.0.1:8080/api/v1/health 2>/dev/null || echo '{}')
  system_status=$(echo "$health_response" | grep -o '"system_status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
  version=$(echo "$health_response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

  echo "  System Status:     ${system_status}"
  echo "  Version:           ${version}"

  # Validate database
  if [ -f "${DATA_DIR}/main.db" ]; then
    echo "  Database:          OK"
  else
    echo "  Database:          MISSING (WARNING)"
  fi

  # Validate configuration
  if [ -f "${CONFIG_DIR}/config.json" ]; then
    echo "  Configuration:     OK"
  else
    echo "  Configuration:     MISSING (WARNING)"
  fi

  echo ""
  echo "Factory reset completed successfully at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  exit 0
else
  echo "  Service Status:    FAILED TO START"
  echo "  Check logs:        journalctl -u carconnect --no-pager -n 50"
  echo ""
  echo "Factory reset completed with errors at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  exit 1
fi
```

### 5.2 Usage Examples

```bash
# Full factory reset (deletes all user data)
sudo ./factory-reset.sh

# Factory reset preserving user profiles
sudo ./factory-reset.sh --preserve-user-data

# Automated factory reset (no confirmation prompt)
sudo ./factory-reset.sh --force

# Automated reset preserving user data
sudo ./factory-reset.sh --preserve-user-data --force
```

### 5.3 Post-Reset Validation

After factory reset, verify the following:

- [ ] Service is running (`systemctl status carconnect`)
- [ ] Health endpoint returns healthy (`curl http://127.0.0.1:8080/api/v1/health`)
- [ ] CAN bus interface is active
- [ ] GPS module is detected
- [ ] Audio DSP is initialized
- [ ] Database is accessible and has correct schema
- [ ] If user data was preserved, verify profiles are intact
- [ ] Logs show no errors (`journalctl -u carconnect --since "5 minutes ago"`)

## 6. Emergency Recovery

If all rollback procedures fail:

1. Boot from recovery partition
2. Flash factory firmware via USB/JTAG
3. Reinitialize all partitions
4. Contact support with diagnostic logs from `/var/log/carconnect/`
