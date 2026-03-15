# Data Management and Privacy Specification

**Document ID:** SPEC-DMP-024
**Issue:** #24
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document specifies the data collection, storage, retention, user consent, encryption, data portability, and GDPR/CCPA compliance requirements for CarConnect Pro.

---

## 2. Data Collection Policies

### 2.1 Data Collection Principles

| Requirement ID | Principle | Implementation |
|---|---|---|
| DMP-COL-001 | Data minimization | Collect only data necessary for system functionality |
| DMP-COL-002 | Purpose limitation | Each data element has a defined, documented purpose |
| DMP-COL-003 | Transparency | Users informed of all data collection at setup and in settings |
| DMP-COL-004 | No covert collection | No background data collection beyond documented categories |
| DMP-COL-005 | No third-party analytics | No data sent to external analytics or advertising services |

### 2.2 Data Collection Points

| Requirement ID | Collection Point | Data Collected | Trigger | User Visibility |
|---|---|---|---|---|
| DMP-COL-006 | System boot | Boot timestamp, firmware version | Automatic | Visible in system logs |
| DMP-COL-007 | Navigation use | Start/end coordinates, route taken | User initiates navigation | Visible in navigation history |
| DMP-COL-008 | Bluetooth pairing | Device name, MAC, supported profiles | User initiates pairing | Visible in Bluetooth settings |
| DMP-COL-009 | Audio playback | Source type, track metadata, volume level | User plays audio | Visible in now-playing screen |
| DMP-COL-010 | CAN bus monitoring | Vehicle speed, RPM, coolant temp, fuel level | Continuous while ACC on | Visible in vehicle info screen |
| DMP-COL-011 | Settings changes | Changed setting key, new value, timestamp | User changes setting | Visible in settings history |
| DMP-COL-012 | Error events | Error code, subsystem, stack trace | Automatic on error | Visible in diagnostic logs |
| DMP-COL-013 | OTA update check | Device hardware ID, firmware version | Periodic (24h) or manual | Visible in update settings |

---

## 3. Data Storage Architecture

### 3.1 Storage Layout

| Requirement ID | Partition | Size | Purpose | Encryption |
|---|---|---|---|---|
| DMP-STO-001 | System firmware A | 2 GB | Active firmware image | Verified boot |
| DMP-STO-002 | System firmware B | 2 GB | Inactive firmware (rollback) | Verified boot |
| DMP-STO-003 | User data | 4 GB | Profiles, settings, navigation, logs | AES-256-XTS |
| DMP-STO-004 | Map data | 8 GB | Offline navigation maps | Integrity-checked |
| DMP-STO-005 | Backup | 256 MB | Pre-update backup | AES-256 |
| DMP-STO-006 | Cache | 512 MB | Media cache, tile cache | Not encrypted |
| DMP-STO-007 | Recovery | 256 MB | Recovery mode image | Verified boot |

### 3.2 Storage Security

| Requirement ID | Requirement | Specification |
|---|---|---|
| DMP-STO-008 | File system | ext4 with dm-crypt for user data partition |
| DMP-STO-009 | Encryption key storage | Hardware secure element, non-extractable |
| DMP-STO-010 | Wear leveling awareness | Encryption operates at block level to prevent data remnants |
| DMP-STO-011 | eMMC TRIM support | Enabled to ensure deleted data blocks are physically erased |
| DMP-STO-012 | Storage health monitoring | SMART-like monitoring, user warning at 90% lifetime |

---

## 4. Data Retention Policies

### 4.1 Retention Schedule

| Requirement ID | Data Type | Retention Period | Enforcement |
|---|---|---|---|
| DMP-RET-001 | User profiles | Indefinite (until user-deleted) | Manual deletion |
| DMP-RET-002 | Navigation history | 90 days, max 500 entries | Automatic pruning, oldest-first |
| DMP-RET-003 | Favorite/saved locations | Indefinite (until user-deleted) | Manual deletion |
| DMP-RET-004 | Vehicle diagnostic logs | 30 days, max 50 MB | Automatic rotation |
| DMP-RET-005 | System event logs | 7 days, max 20 MB | Automatic rotation |
| DMP-RET-006 | Crash dumps | 30 days, max 5 dumps | Automatic rotation |
| DMP-RET-007 | Bluetooth pairing records | Indefinite (until unpaired) | Manual deletion |
| DMP-RET-008 | Audio playback history | 7 days, max 200 entries | Automatic pruning |
| DMP-RET-009 | Media metadata cache | 7 days since last access | Automatic expiry |
| DMP-RET-010 | Wi-Fi credentials | Indefinite (until user-removed) | Manual deletion |

### 4.2 Retention Enforcement

| Requirement ID | Mechanism | Specification |
|---|---|---|
| DMP-RET-011 | Retention daemon | Background service runs daily at 03:00 local time |
| DMP-RET-012 | Storage pressure cleanup | Additional cleanup triggered when user partition > 85% full |
| DMP-RET-013 | Retention audit log | Record of automatic deletions stored for 7 days |
| DMP-RET-014 | Retention policy versioning | Policy version stored with each data record |

---

## 5. User Consent Framework

### 5.1 Consent Categories

| Requirement ID | Category | Default | Required for Function | Revocable |
|---|---|---|---|---|
| DMP-CNS-001 | Essential system operation | Opt-in (implicit, required) | Yes | No |
| DMP-CNS-002 | Navigation history storage | Opt-in (prompted at setup) | No | Yes |
| DMP-CNS-003 | Vehicle diagnostics logging | Opt-in (prompted at setup) | No | Yes |
| DMP-CNS-004 | Contact/call history sync | Opt-in (per session or persistent) | No | Yes |
| DMP-CNS-005 | OTA update check | Opt-in (recommended, prompted) | No | Yes |
| DMP-CNS-006 | Crash reporting | Opt-in (prompted at setup) | No | Yes |

### 5.2 Consent Implementation

| Requirement ID | Requirement | Specification |
|---|---|---|
| DMP-CNS-007 | First-boot consent flow | Step-by-step privacy wizard before system is usable |
| DMP-CNS-008 | Consent UI language | Plain language, no legal jargon |
| DMP-CNS-009 | Consent granularity | Individual toggle per category |
| DMP-CNS-010 | Consent persistence | Stored locally with timestamp and policy version |
| DMP-CNS-011 | Consent review | Full consent status viewable in Settings > Privacy |
| DMP-CNS-012 | Consent modification | Any consent can be changed at any time in settings |
| DMP-CNS-013 | Policy update re-consent | User prompted on next boot after policy version change |

---

## 6. Encryption Specifications

### 6.1 Encryption at Rest

| Requirement ID | Scope | Algorithm | Key Length | Key Source |
|---|---|---|---|---|
| DMP-ENC-001 | User data partition | AES-256-XTS | 256-bit | Secure element |
| DMP-ENC-002 | Per-profile sensitive data | AES-256-GCM | 256-bit | Profile-derived key |
| DMP-ENC-003 | Bluetooth pairing keys | AES-256-GCM | 256-bit | Secure element |
| DMP-ENC-004 | Wi-Fi credentials | AES-256-GCM | 256-bit | Secure element |
| DMP-ENC-005 | Backup archive | AES-256-GCM | 256-bit | Secure element |

### 6.2 Key Management

| Requirement ID | Requirement | Specification |
|---|---|---|
| DMP-ENC-006 | Master key storage | ARM TrustZone-backed secure element |
| DMP-ENC-007 | Key hierarchy | Master key > partition key > per-profile key |
| DMP-ENC-008 | Key derivation function | HKDF-SHA256 |
| DMP-ENC-009 | PIN-derived keys | PBKDF2-SHA256, 100,000 iterations, 128-bit salt |
| DMP-ENC-010 | Key rotation | On factory reset (master key regenerated) |
| DMP-ENC-011 | Key destruction | Secure element key erasure on factory reset |
| DMP-ENC-012 | Forward secrecy | New session keys for each Bluetooth connection |

---

## 7. Data Portability

### 7.1 Export Capabilities

| Requirement ID | Data Category | Export Format | Export Method |
|---|---|---|---|
| DMP-PRT-001 | User profile settings | JSON | USB drive |
| DMP-PRT-002 | Navigation favorites | GPX (GPS Exchange Format) | USB drive |
| DMP-PRT-003 | Audio equalizer presets | JSON | USB drive |
| DMP-PRT-004 | Complete user backup | Encrypted archive (.ccpbak) | USB drive |
| DMP-PRT-005 | Diagnostic logs | Plain text / CSV | USB drive |
| DMP-PRT-006 | Navigation history | GPX | USB drive |

### 7.2 Import Capabilities

| Requirement ID | Data Category | Import Format | Import Method |
|---|---|---|---|
| DMP-PRT-007 | User profile settings | JSON (CarConnect Pro format) | USB drive |
| DMP-PRT-008 | Navigation favorites | GPX | USB drive |
| DMP-PRT-009 | Complete user backup | .ccpbak | USB drive |
| DMP-PRT-010 | Audio equalizer presets | JSON (CarConnect Pro format) | USB drive |

### 7.3 Interoperability

| Requirement ID | Requirement | Specification |
|---|---|---|
| DMP-PRT-011 | Cross-unit portability | Backup from one CarConnect Pro can be restored to another |
| DMP-PRT-012 | Version compatibility | Import supports data from current and one prior major version |
| DMP-PRT-013 | Schema documentation | Export format schemas published in developer documentation |

---

## 8. GDPR Compliance

| Requirement ID | GDPR Article | Right/Obligation | Implementation |
|---|---|---|---|
| DMP-GDR-001 | Art. 6 | Lawful basis for processing | Consent for optional; legitimate interest for essential |
| DMP-GDR-002 | Art. 5(1)(c) | Data minimization | Only functional data collected; documented justification |
| DMP-GDR-003 | Art. 5(1)(e) | Storage limitation | Automated retention enforcement per schedule |
| DMP-GDR-004 | Art. 13 | Right to be informed | Privacy notice at first boot, accessible in settings |
| DMP-GDR-005 | Art. 15 | Right of access | Data inventory viewable in Settings > Privacy > My Data |
| DMP-GDR-006 | Art. 17 | Right to erasure | Factory reset and per-category deletion |
| DMP-GDR-007 | Art. 20 | Right to data portability | Export in machine-readable formats (JSON, GPX) |
| DMP-GDR-008 | Art. 25 | Data protection by design | Encryption at rest, minimal collection, access control |
| DMP-GDR-009 | Art. 32 | Security of processing | AES-256 encryption, secure element key storage |
| DMP-GDR-010 | Art. 35 | Data protection impact assessment | DPIA documented and maintained |

---

## 9. CCPA Compliance

| Requirement ID | CCPA Section | Right | Implementation |
|---|---|---|---|
| DMP-CCA-001 | 1798.100 | Right to know | Data categories and purposes disclosed in privacy settings |
| DMP-CCA-002 | 1798.105 | Right to delete | Factory reset and category-level deletion |
| DMP-CCA-003 | 1798.110 | Right to know (specific pieces) | Per-category data viewing in settings |
| DMP-CCA-004 | 1798.120 | Right to opt-out of sale | Not applicable; no data is sold |
| DMP-CCA-005 | 1798.125 | Non-discrimination | Full functionality regardless of data choices |
| DMP-CCA-006 | 1798.130 | Submission methods | In-device settings menu; no internet submission required |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
