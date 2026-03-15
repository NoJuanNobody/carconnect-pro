# Smartphone Integration

**Document ID:** PRD-SI-033
**Issue:** #33
**Product:** CarConnect Pro Aftermarket Infotainment System
**Target Vehicle:** Hyundai Elantra GT 2013
**Version:** 1.0
**Last Updated:** 2026-03-15

---

## 1. Purpose

This document specifies the smartphone integration requirements for CarConnect Pro, covering Android Auto and Apple CarPlay support, wired and wireless connectivity, supported devices, connection performance, audio quality, and multi-device pairing.

---

## 2. Supported Platforms

### 2.1 Android Auto

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-AA-001 | Minimum Android Auto version | 8.0 |
| SI-AA-002 | Maximum tested Android Auto version | 12.x |
| SI-AA-003 | Minimum Android OS version | Android 10 (API 29) |
| SI-AA-004 | Maximum tested Android OS version | Android 16 |
| SI-AA-005 | Wired connection protocol | AOAv2 (Android Open Accessory) over USB |
| SI-AA-006 | Wireless connection protocol | Wi-Fi Direct (5 GHz) + Bluetooth LE for discovery |
| SI-AA-007 | Display projection protocol | H.264 video stream, 800x480 or 1280x720 |
| SI-AA-008 | Audio channel support | Media audio, navigation prompts, phone call audio (3 independent channels) |

### 2.2 Apple CarPlay

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-CP-001 | Minimum CarPlay version | iOS 14 |
| SI-CP-002 | Maximum tested CarPlay version | iOS 19 |
| SI-CP-003 | Wired connection protocol | iAP2 over USB (Lightning or USB-C) |
| SI-CP-004 | Wireless connection protocol | Wi-Fi peer-to-peer (5 GHz) + Bluetooth for discovery |
| SI-CP-005 | Display projection protocol | H.264 video stream, 800x480 or 1280x720 |
| SI-CP-006 | MFi certification | Required; MFi chip integrated on main PCB |
| SI-CP-007 | Siri support | Eyes-free Siri via steering wheel button or on-screen activation |
| SI-CP-008 | Audio channel support | Media, Siri, phone call, navigation alerts (4 independent channels) |

---

## 3. Wired Connection Specifications

### 3.1 USB Hardware

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-WRD-001 | USB port type | USB Type-A (front panel) |
| SI-WRD-002 | USB standard | USB 3.0 (5 Gbps max) |
| SI-WRD-003 | USB power output | 5V, 1.5A (7.5W) for device charging |
| SI-WRD-004 | Cable length support | Up to 2.0 m certified cables |
| SI-WRD-005 | Additional USB port | USB Type-A (rear harness) for media/updates |

### 3.2 Wired Connection Performance

| Requirement ID | Metric | Target |
|---|---|---|
| SI-WRD-006 | Time from USB insertion to phone detection | 2 seconds max |
| SI-WRD-007 | Time from phone detection to projection display | 5 seconds max |
| SI-WRD-008 | Total wired connection time (plug to display) | 7 seconds max |
| SI-WRD-009 | Video latency (touch to screen update) | 100 ms max |
| SI-WRD-010 | Audio latency (wired) | 30 ms max |
| SI-WRD-011 | Connection reliability (drop rate) | < 1 drop per 100 hours of use |

---

## 4. Wireless Connection Specifications

### 4.1 Wireless Hardware

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-WLS-001 | Wi-Fi standard | 802.11ac (Wi-Fi 5), dual-band 2.4/5 GHz |
| SI-WLS-002 | Wi-Fi Direct support | Required for wireless projection |
| SI-WLS-003 | Bluetooth version | 5.0 with BLE |
| SI-WLS-004 | Bluetooth profiles | A2DP 1.3, AVRCP 1.6, HFP 1.7, PBAP 1.2, MAP 1.4 |
| SI-WLS-005 | Internal antenna | PIFA antenna, PCB-integrated |
| SI-WLS-006 | Wi-Fi transmit power | 20 dBm max (per FCC Part 15) |

### 4.2 Wireless Connection Performance

| Requirement ID | Metric | Target |
|---|---|---|
| SI-WLS-007 | Wireless auto-reconnection time (known device) | 10 seconds max |
| SI-WLS-008 | First-time wireless pairing setup time | 30 seconds max (user interaction included) |
| SI-WLS-009 | Video latency (wireless touch to screen update) | 150 ms max |
| SI-WLS-010 | Audio latency (wireless) | 50 ms max |
| SI-WLS-011 | Wireless connection stability | < 2 drops per 100 hours of use |
| SI-WLS-012 | Wireless range (in-vehicle) | Functional throughout entire cabin |
| SI-WLS-013 | Wi-Fi Direct coexistence with station mode | Simultaneous operation for projection + OTA updates |

---

## 5. Supported Device Compatibility

### 5.1 Android Devices (Minimum Compatibility)

| Requirement ID | Manufacturer | Models/Requirements |
|---|---|---|
| SI-DEV-001 | Samsung | Galaxy S series (S20 and newer), Galaxy A series (A52 and newer) |
| SI-DEV-002 | Google | Pixel 4a and newer |
| SI-DEV-003 | OnePlus | OnePlus 8 and newer |
| SI-DEV-004 | Xiaomi | Mi 11 and newer (with Android Auto support) |
| SI-DEV-005 | General Android | Any device with Android 10+, USB-C, Android Auto app |

### 5.2 Apple Devices (Minimum Compatibility)

| Requirement ID | Device | Connection Type |
|---|---|---|
| SI-DEV-006 | iPhone 8 and newer | Wired (Lightning) and Wireless |
| SI-DEV-007 | iPhone 15 and newer | Wired (USB-C) and Wireless |
| SI-DEV-008 | iPhone SE (2nd gen and newer) | Wired and Wireless |

### 5.3 Compatibility Testing

| Requirement ID | Requirement | Specification |
|---|---|---|
| SI-DEV-009 | Device compatibility testing | Minimum 20 device models tested per release |
| SI-DEV-010 | OS version regression testing | Each new iOS/Android major version tested within 30 days of release |
| SI-DEV-011 | Known issues documentation | Published compatibility matrix updated quarterly |

---

## 6. Connection Time Requirements

| Requirement ID | Scenario | Target | Max Acceptable |
|---|---|---|---|
| SI-CON-001 | Wired first-time connection (Android Auto) | 8 seconds | 10 seconds |
| SI-CON-002 | Wired first-time connection (CarPlay) | 7 seconds | 10 seconds |
| SI-CON-003 | Wired reconnection (known device) | 5 seconds | 7 seconds |
| SI-CON-004 | Wireless reconnection (Android Auto) | 7 seconds | 10 seconds |
| SI-CON-005 | Wireless reconnection (CarPlay) | 6 seconds | 10 seconds |
| SI-CON-006 | Bluetooth audio reconnection (no projection) | 3 seconds | 5 seconds |
| SI-CON-007 | Connection switchover (wired to wireless) | 3 seconds | 5 seconds |
| SI-CON-008 | Source switch (projection to native) | 1 second | 2 seconds |

---

## 7. Audio Quality Requirements

### 7.1 Smartphone Audio Output

| Requirement ID | Parameter | Wired Spec | Wireless Spec |
|---|---|---|---|
| SI-AUD-001 | Audio codec (media) | AAC-LC, 48 kHz | AAC-LC, 48 kHz / SBC |
| SI-AUD-002 | Audio codec (phone call) | mSBC, 16 kHz wideband | mSBC / CVSD |
| SI-AUD-003 | Sample rate support | 44.1/48 kHz | 44.1/48 kHz |
| SI-AUD-004 | Audio bit depth | 16-bit minimum | 16-bit minimum |
| SI-AUD-005 | Audio channel mixing | Phone call ducking of media (-20 dB) | Same as wired |
| SI-AUD-006 | Navigation prompt mixing | Navigation overlay with media ducking (-12 dB) | Same as wired |

### 7.2 Microphone Input

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-AUD-007 | Built-in microphone | Dual MEMS microphones, beamforming |
| SI-AUD-008 | Microphone sensitivity | -26 dBFS at 1 Pa |
| SI-AUD-009 | Echo cancellation | Full-duplex AEC |
| SI-AUD-010 | Noise suppression | Adaptive noise cancellation, 15 dB suppression |
| SI-AUD-011 | Microphone sample rate | 16 kHz (wideband voice) |

---

## 8. Multi-Device Pairing

### 8.1 Pairing Capacity

| Requirement ID | Parameter | Specification |
|---|---|---|
| SI-MDP-001 | Maximum paired Bluetooth devices (stored) | 10 devices |
| SI-MDP-002 | Maximum simultaneous Bluetooth connections | 2 devices (1 HFP + 1 A2DP, or 2 HFP) |
| SI-MDP-003 | Maximum simultaneous projection sessions | 1 (Android Auto OR CarPlay, not both) |
| SI-MDP-004 | Paired device priority | User-configurable priority order |
| SI-MDP-005 | Auto-connect behavior | Connect to highest-priority available device |

### 8.2 Multi-Device Switching

| Requirement ID | Scenario | Specification |
|---|---|---|
| SI-MDP-006 | Switch active phone (HFP) | User-initiated, < 3 seconds |
| SI-MDP-007 | Switch projection source | Disconnect current, connect new, < 10 seconds |
| SI-MDP-008 | Incoming call on secondary phone | Audio alert on system, user chooses to accept |
| SI-MDP-009 | Driver/passenger device roles | Configurable per paired device |
| SI-MDP-010 | Device removal | Remove individual device without affecting others |

### 8.3 User Profile Device Association

| Requirement ID | Requirement | Specification |
|---|---|---|
| SI-MDP-011 | Device-to-profile linking | Each paired device can be associated with a user profile |
| SI-MDP-012 | Auto-profile activation | Connecting a linked device auto-switches to associated profile |
| SI-MDP-013 | Profile settings applied on device connect | Audio EQ, display brightness, favorites restored within 2 seconds |

---

## 9. Error Handling and Recovery

| Requirement ID | Scenario | System Behavior |
|---|---|---|
| SI-ERR-001 | USB cable disconnection during projection | Revert to native UI within 1 second, resume on reconnect |
| SI-ERR-002 | Wireless connection drop | Attempt reconnection 3 times over 15 seconds, then fall back to native |
| SI-ERR-003 | Phone app crash during projection | Display "reconnecting" message, retry for 10 seconds |
| SI-ERR-004 | Unsupported phone connected via USB | Display compatibility message, offer Bluetooth audio as alternative |
| SI-ERR-005 | USB port power overload | Disable port, display warning, re-enable after device removal |
| SI-ERR-006 | Bluetooth pairing failure | Prompt user to retry, offer manual pairing instructions |
| SI-ERR-007 | Wi-Fi interference causing quality degradation | Switch to 5 GHz channel, reduce video resolution if needed |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-03-15 | CarConnect Pro Team | Initial release |
