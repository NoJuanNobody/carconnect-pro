# Data Privacy and Storage

**Document ID:** PRD-DP-030
**Issue:** #30
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document defines the personal data types collected by CarConnect Pro, consent mechanisms, retention periods, deletion capabilities, third-party data sharing restrictions, and encryption requirements.

---

## 2. Personal Data Inventory

### 2.1 Data Types Collected

| Data ID | Data Category | Data Elements | Collection Method | Storage Location |
|---|---|---|---|---|
| PD-001 | User Profile | Display name, language preference, UI theme | User input | Local eMMC |
| PD-002 | Audio Preferences | Equalizer settings, volume levels, last source | Automatic | Local eMMC |
| PD-003 | Navigation History | Recent destinations, favorite locations, route history | Automatic + User input | Local eMMC |
| PD-004 | Paired Device Records | Bluetooth device names, MAC addresses, pairing keys | User-initiated pairing | Local eMMC (encrypted) |
| PD-005 | Contact Data (mirrored) | Phone contacts synced via Bluetooth | User-authorized sync | Volatile RAM only |
| PD-006 | Call History (mirrored) | Recent calls synced via Bluetooth HFP | User-authorized sync | Volatile RAM only |
| PD-007 | Vehicle Diagnostics | CAN bus parameters (speed, RPM, fuel, temperature) | Automatic via CAN | Local eMMC (rolling buffer) |
| PD-008 | GPS Position Data | Current location, trip logs | Automatic during navigation | Local eMMC |
| PD-009 | System Logs | Boot events, errors, crash dumps, firmware version | Automatic | Local eMMC |
| PD-010 | Wi-Fi Credentials | SSID, passphrase for saved networks | User input | Local eMMC (encrypted) |
| PD-011 | Media Metadata | Track names, album art cached from USB/Bluetooth | Automatic | Local eMMC |
| PD-012 | Voice Command Audio | Temporary audio buffers during voice recognition | User-initiated | Volatile RAM only |

### 2.2 Data Classification

| Classification | Data IDs | Sensitivity Level | Encryption Required |
|---|---|---|---|
| Personally Identifiable | PD-003, PD-004, PD-005, PD-006, PD-008, PD-010 | High | Yes (AES-256) |
| User Preferences | PD-001, PD-002, PD-011 | Low | No (integrity protected) |
| System/Diagnostic | PD-007, PD-009 | Medium | No (access-controlled) |
| Transient | PD-005, PD-006, PD-012 | High | N/A (RAM only, never persisted) |

---

## 3. Consent Mechanisms

### 3.1 Initial Setup Consent

| Requirement ID | Requirement | Specification |
|---|---|---|
| DP-CON-001 | First-boot privacy notice | Full privacy policy displayed before any data collection begins |
| DP-CON-002 | Granular consent options | Separate opt-in toggles for: navigation history, vehicle diagnostics, contact sync |
| DP-CON-003 | Consent language | Plain language, no legal jargon, 8th-grade reading level |
| DP-CON-004 | Consent record | Timestamp and version of policy accepted, stored locally |
| DP-CON-005 | Proceed without optional consent | System fully functional with only essential data collection |

### 3.2 Ongoing Consent Management

| Requirement ID | Requirement | Specification |
|---|---|---|
| DP-CON-006 | Settings menu access | Privacy settings accessible within 3 taps from home screen |
| DP-CON-007 | Consent withdrawal | Any optional consent can be revoked at any time |
| DP-CON-008 | Withdrawal effect | Associated data deleted within 24 hours of consent withdrawal |
| DP-CON-009 | Re-consent on policy update | User prompted to review and accept updated privacy policy |
| DP-CON-010 | Consent for contact sync | Explicit per-session or persistent consent option |

---

## 4. Data Retention Periods

| Requirement ID | Data Category | Retention Period | Rationale |
|---|---|---|---|
| DP-RET-001 | User profile settings | Until user deletes profile or factory reset | Required for functionality |
| DP-RET-002 | Navigation history | 90 days rolling, max 500 entries | User convenience, storage limits |
| DP-RET-003 | Favorite locations | Until user deletes or factory reset | User convenience |
| DP-RET-004 | Paired device records | Until user unpairs or factory reset | Required for reconnection |
| DP-RET-005 | Vehicle diagnostics | 30 days rolling buffer, max 50 MB | Troubleshooting support |
| DP-RET-006 | GPS position data (trip logs) | 30 days rolling | User convenience |
| DP-RET-007 | System logs | 7 days rolling, max 20 MB | Diagnostics |
| DP-RET-008 | Mirrored contacts/call history | Current session only (RAM) | Never persisted to storage |
| DP-RET-009 | Wi-Fi credentials | Until user removes network or factory reset | Required for reconnection |
| DP-RET-010 | Media metadata cache | 7 days since last access | Storage optimization |

---

## 5. Data Deletion Capabilities

### 5.1 User-Initiated Deletion

| Requirement ID | Capability | Specification |
|---|---|---|
| DP-DEL-001 | Delete individual navigation history entries | Available in navigation history screen |
| DP-DEL-002 | Clear all navigation history | Single action in privacy settings |
| DP-DEL-003 | Delete individual paired devices | Available in Bluetooth settings |
| DP-DEL-004 | Delete user profile | Removes all data associated with that profile |
| DP-DEL-005 | Clear vehicle diagnostic logs | Single action in privacy settings |
| DP-DEL-006 | Factory reset | Cryptographic erasure of all user data |
| DP-DEL-007 | Delete Wi-Fi credentials | Per-network or all networks |

### 5.2 Deletion Verification

| Requirement ID | Requirement | Specification |
|---|---|---|
| DP-DEL-008 | Deletion confirmation | User must confirm before irreversible deletion |
| DP-DEL-009 | Deletion completeness | Cryptographic erasure (key destruction) for encrypted data |
| DP-DEL-010 | Deletion of backup copies | All local copies deleted; no cloud copies exist |
| DP-DEL-011 | Deletion timing | Completed within 5 seconds of user confirmation |
| DP-DEL-012 | Post-deletion verification | System verifies data sectors are overwritten or keys destroyed |

---

## 6. Third-Party Data Sharing Restrictions

### 6.1 Data Sharing Policy

| Requirement ID | Requirement | Specification |
|---|---|---|
| DP-SHR-001 | No cloud telemetry | System does not transmit any user data to external servers |
| DP-SHR-002 | No advertising data collection | No data collected for advertising purposes |
| DP-SHR-003 | Android Auto/CarPlay data isolation | Data exchanged with phone stays within the mirroring session |
| DP-SHR-004 | USB data access | Read-only access to media files on USB; no data written to USB without user action |
| DP-SHR-005 | Diagnostic export | User must explicitly initiate diagnostic data export |
| DP-SHR-006 | OTA update metadata | Only firmware version and hardware ID sent during update check |

### 6.2 Third-Party Component Restrictions

| Requirement ID | Component | Restriction |
|---|---|---|
| DP-SHR-007 | Map data provider | No user location data shared with provider; maps are offline |
| DP-SHR-008 | Bluetooth stack | No device data transmitted beyond pairing scope |
| DP-SHR-009 | Audio DSP firmware | No data egress capability; isolated processing |
| DP-SHR-010 | Wi-Fi module | Only connects to user-configured networks for OTA updates |

---

## 7. Encryption Requirements

### 7.1 Encryption at Rest

| Requirement ID | Data Scope | Algorithm | Key Management |
|---|---|---|---|
| DP-ENC-001 | User profiles (high-sensitivity fields) | AES-256-XTS | Hardware-bound key in secure element |
| DP-ENC-002 | Navigation history and GPS logs | AES-256-XTS | Per-profile encryption key |
| DP-ENC-003 | Paired device records and keys | AES-256-GCM | Hardware-bound key |
| DP-ENC-004 | Wi-Fi credentials | AES-256-GCM | Hardware-bound key |
| DP-ENC-005 | System logs | Not encrypted | Access-controlled by OS permissions |

### 7.2 Encryption in Transit

| Requirement ID | Data Path | Algorithm | Specification |
|---|---|---|---|
| DP-ENC-006 | Bluetooth audio/data | BLE SC, AES-CCM | Bluetooth 5.0 Secure Connections |
| DP-ENC-007 | Wi-Fi (OTA updates) | WPA3, TLS 1.3 | Certificate-pinned HTTPS |
| DP-ENC-008 | USB data transfer | N/A | Physical access control only |
| DP-ENC-009 | CAN bus | N/A (vehicle-internal) | Message authentication for outbound |

### 7.3 Key Management

| Requirement ID | Requirement | Specification |
|---|---|---|
| DP-ENC-010 | Key storage | Hardware secure element (tamper-resistant) |
| DP-ENC-011 | Key rotation | Encryption keys rotated on factory reset |
| DP-ENC-012 | Key destruction on factory reset | All encryption keys securely erased |
| DP-ENC-013 | Key derivation | PBKDF2 with 100,000 iterations for PIN-derived keys |

---

## 8. Compliance Framework

### 8.1 CCPA Compliance

| Requirement ID | CCPA Right | Implementation |
|---|---|---|
| DP-CMP-001 | Right to know | Data inventory viewable in privacy settings |
| DP-CMP-002 | Right to delete | Factory reset and per-category deletion available |
| DP-CMP-003 | Right to opt-out of sale | No data is sold; not applicable |
| DP-CMP-004 | Non-discrimination | Full functionality regardless of privacy choices |

### 8.2 GDPR Applicability

| Requirement ID | GDPR Principle | Implementation |
|---|---|---|
| DP-CMP-005 | Lawful basis | Consent-based for optional data; legitimate interest for essential |
| DP-CMP-006 | Data minimization | Only data necessary for stated function is collected |
| DP-CMP-007 | Storage limitation | Retention periods enforced automatically |
| DP-CMP-008 | Right to erasure | Factory reset provides complete erasure |
| DP-CMP-009 | Data portability | Settings export in JSON format via USB |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
