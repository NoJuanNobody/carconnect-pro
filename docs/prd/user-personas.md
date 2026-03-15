# Target User Personas and Use Case Scenarios

## Document Information

| Field | Value |
|-------|-------|
| Document Owner | CarConnect Pro Product Team |
| Version | 1.0 |
| Last Updated | 2026-03-15 |
| Status | Draft |
| Related Issues | #18 |

---

## 1. Persona Overview

CarConnect Pro targets three primary user personas, each representing a distinct segment of the Hyundai Elantra GT owner population. These personas drive feature prioritization, UX design decisions, and marketing messaging.

| Persona | Name | Age | Key Motivation | Technical Skill |
|---------|------|-----|----------------|-----------------|
| Daily Commuter | Sarah Chen | 34 | Reliable navigation and hands-free calling | Moderate |
| Tech Enthusiast | Marcus Rivera | 28 | Cutting-edge features and customization | High |
| Family Driver | David & Karen Park | 42/40 | Safety, simplicity, and multi-user support | Low to Moderate |

---

## 2. Persona 1: The Daily Commuter — Sarah Chen

### 2.1 Demographics and Background

| Attribute | Detail |
|-----------|--------|
| Age | 34 |
| Occupation | Marketing Manager |
| Location | Suburban Atlanta, GA |
| Daily commute | 45 minutes each way (28 miles) |
| Vehicle | 2013 Hyundai Elantra GT, purchased used in 2020 |
| Smartphone | iPhone 14 |
| Technical comfort | Moderate — uses apps confidently but avoids complex setup |

### 2.2 Goals and Motivations

- **Primary Goal**: Seamless, hands-free communication during her commute
- Wants Apple CarPlay to use Siri for calls, messages, and podcast control
- Needs reliable real-time traffic navigation to optimize her commute route
- Values a clean, distraction-free interface while driving
- Wants to preserve her car's value and avoid a new car payment

### 2.3 Pain Points

- Factory Bluetooth drops calls and has poor audio quality
- Built-in navigation has outdated maps (last updated 2014)
- Cannot stream Spotify or podcasts through the car stereo without an aux cable
- Feels unsafe looking at her phone mounted on the dashboard for navigation
- Tried a universal head unit but was intimidated by the wiring and dash kit process

### 2.4 Technology Relationship

Sarah is a confident smartphone user but is not comfortable with hardware modifications. She chose her current car for reliability and low cost of ownership. She would install CarConnect Pro herself only if the process is genuinely simple and well-documented, with video instructions.

### 2.5 Use Case Scenarios

#### Scenario 1: Morning Commute

1. Sarah gets in her car at 7:15 AM. CarConnect Pro recognizes her phone via Bluetooth and loads her profile automatically.
2. The home screen shows her saved work route with current traffic conditions. A 12-minute delay is detected on I-85.
3. She taps the suggested alternate route, which adds 3 miles but saves 8 minutes.
4. Apple CarPlay launches in the background. Her podcast "The Daily" resumes where she left off.
5. An incoming call from her manager appears as a banner. She accepts via the steering wheel button.
6. The audio ducks, the call connects through the car speakers, and navigation continues on-screen with voice prompts.
7. After the call ends, the podcast resumes automatically.

#### Scenario 2: Finding a New Restaurant

1. Sarah is meeting a friend after work at a new restaurant downtown.
2. She opens CarPlay and asks Siri: "Navigate to Ponce City Market."
3. CarConnect Pro's navigation activates with the route, showing parking availability nearby.
4. As she approaches, traffic rerouting avoids a closed street near the destination.
5. She arrives and the system shows nearby parking options.

#### Scenario 3: Weekend Errand Run

1. Sarah needs to visit three stops: dry cleaner, grocery store, pet store.
2. She enters all three as waypoints. The system optimizes the route order to minimize total drive time.
3. At each stop, she receives a notification that she has arrived and the next destination is queued.

---

## 3. Persona 2: The Tech Enthusiast — Marcus Rivera

### 3.1 Demographics and Background

| Attribute | Detail |
|-----------|--------|
| Age | 28 |
| Occupation | Software Developer |
| Location | Austin, TX |
| Daily commute | 20 minutes (works hybrid, 3 days/week in office) |
| Vehicle | 2013 Hyundai Elantra GT, purchased used in 2019 as a project car |
| Smartphone | Google Pixel 8 Pro |
| Technical comfort | High — builds PCs, runs home servers, comfortable with command line |

### 3.2 Goals and Motivations

- **Primary Goal**: Maximum customization and access to vehicle data
- Wants to monitor CAN bus data (engine temps, fuel consumption, OBD-II codes)
- Interested in customizing the UI theme, layout, and widget arrangement
- Values OTA updates and wants early access to new features
- Plans to add a backup camera and dashcam integrated through CarConnect Pro
- Wants Android Auto with wireless connectivity

### 3.3 Pain Points

- Factory head unit feels like using a phone from 2010
- Cannot access any vehicle diagnostic data without a separate OBD-II dongle
- Previous universal head unit had compatibility issues with his Pixel phone
- Wants a system he can tinker with but does not want to void his car's powertrain warranty
- Frustrated by aftermarket units that stop receiving firmware updates after 1 year

### 3.4 Technology Relationship

Marcus views his car as another device in his tech ecosystem. He follows CarConnect Pro's development on GitHub, reads the technical specs, and would provide detailed bug reports. He is willing to spend more time on installation if it unlocks additional capabilities.

### 3.5 Use Case Scenarios

#### Scenario 1: Vehicle Diagnostics Dashboard

1. Marcus long-presses the home button to access the advanced dashboard.
2. He configures a custom layout showing: coolant temperature, instantaneous fuel economy, battery voltage, and transmission temperature.
3. He notices the coolant temperature is running 10 degrees higher than usual and sets an alert threshold.
4. The system logs the data to CSV for later analysis.
5. When a check engine light appears, he reads the OBD-II code directly on the CarConnect Pro display: P0456 (small EVAP leak). He clears the code and monitors.

#### Scenario 2: System Customization

1. Marcus opens Settings and switches the UI theme to a dark mode with green accent colors.
2. He rearranges the home screen widgets: vehicle stats top-left, navigation top-right, media controls bottom.
3. He enables developer mode to access the system logs and API endpoint for his home automation integration.
4. He configures the system to send a webhook to his Home Assistant when the car starts, triggering his garage door to open.

#### Scenario 3: OTA Update and Beta Testing

1. Marcus receives a notification that firmware v2.3.0-beta is available.
2. He reviews the changelog: new equalizer presets, improved CAN bus polling rate, bug fixes.
3. He opts into the beta channel and initiates the update over Wi-Fi.
4. After a 4-minute update and reboot, he tests the new features and submits feedback through the built-in feedback form.

#### Scenario 4: Backup Camera and Dashcam Integration

1. Marcus installs an aftermarket backup camera and connects it to CarConnect Pro's video input.
2. When he shifts into reverse, the display automatically switches to the camera feed with dynamic guidelines.
3. He also connects a front dashcam. CarConnect Pro provides a split-screen view when parked and records to a microSD card.

---

## 4. Persona 3: The Family Driver — David & Karen Park

### 4.1 Demographics and Background

| Attribute | Detail |
|-----------|--------|
| Ages | David 42, Karen 40 |
| Occupation | David: Electrician; Karen: Elementary school teacher |
| Location | Suburban Chicago, IL |
| Daily use | School drop-off, errands, weekend family trips |
| Vehicle | 2013 Hyundai Elantra GT, family's second car |
| Smartphones | David: Samsung Galaxy S23; Karen: iPhone 13 |
| Children | Two kids, ages 8 and 11 |
| Technical comfort | Low (Karen) to Moderate (David) |

### 4.2 Goals and Motivations

- **Primary Goal**: Safe, simple system that works for the whole family
- Need multi-user profiles so each driver has their own settings
- Want large, readable text and simple menus for quick glances while driving
- Need reliable navigation for unfamiliar destinations (sports events, family visits)
- Want Bluetooth audio for Karen's audiobooks and David's sports radio
- Looking for a cost-effective upgrade instead of buying a second new car

### 4.3 Pain Points

- Factory system is too small and hard to read, especially at night
- Karen finds the current interface confusing and avoids using it
- No way to save favorite destinations separately for each driver
- Kids argue over music; no easy way to manage audio sources
- Concerned about installation voiding warranty or causing electrical issues
- David is handy but has no experience with car electronics specifically

### 4.4 Technology Relationship

David and Karen are practical technology users. They want things to work without fuss. David is comfortable following installation instructions if they are clear and specific. Karen will only use the system if it is intuitive enough that she does not need to read a manual.

### 4.5 Use Case Scenarios

#### Scenario 1: Multi-User Profile Switching

1. Karen gets in the car Monday morning for school drop-off. CarConnect Pro detects her iPhone and loads her profile.
2. Her home screen shows large buttons: Navigate, Music, Phone. Her preferred font size (large) and brightness (auto) are applied.
3. Her saved destinations appear: School, Home, Mom's House, Soccer Practice.
4. She taps "School" and navigation starts with voice guidance. Her audiobook resumes on Audible via CarPlay.
5. Later, David gets in the car. His Galaxy connects and his profile loads: smaller widgets, sports radio preset, work address as default destination.

#### Scenario 2: Family Road Trip

1. David enters the destination for their weekend trip: Grandma's house in Indianapolis (3.5 hours).
2. The system shows the route, estimated arrival time, and suggests a rest stop halfway.
3. During the drive, the kids watch content on their tablets. Karen uses CarPlay to manage the family playlist.
4. A traffic incident causes a 30-minute delay. The system automatically reroutes and updates the ETA.
5. David receives a low-fuel alert from CAN bus integration. The system suggests the nearest gas station along the rerouted path.
6. They arrive safely. The system saves "Grandma's House" as a favorite for future trips.

#### Scenario 3: Evening Pickup in Unfamiliar Area

1. Karen needs to pick up her son from a friend's birthday party at an address she has never visited.
2. She types the address using the large on-screen keyboard. Autocomplete suggestions appear after 4 characters.
3. Navigation provides clear, well-lit turn-by-turn guidance with large arrow indicators.
4. She arrives at the destination. The system provides a "Return Home" button prominently on screen.
5. She taps it and is guided home via the fastest route.

---

## 5. User Journey Maps

### 5.1 Purchase-to-First-Use Journey (All Personas)

| Stage | Touchpoint | Sarah (Commuter) | Marcus (Tech) | David/Karen (Family) |
|-------|-----------|-------------------|----------------|---------------------|
| **Awareness** | Discovers product | Forum recommendation | GitHub/tech blog | YouTube review |
| **Research** | Evaluates fit | Checks CarPlay compatibility | Reads technical specs | Watches install video |
| **Purchase** | Buys product | Online store | Online store | Amazon (trusted returns) |
| **Unboxing** | Opens package | Checks quick-start guide | Examines connectors | Reads full manual |
| **Installation** | Installs unit | Follows video (30 min) | Self-installs (20 min) | David installs (45 min) |
| **First Boot** | Powers on | Sets up CarPlay profile | Explores all settings | Creates two profiles |
| **First Drive** | Uses in car | Tests navigation + calls | Tests CAN bus data | Tests basic nav + music |
| **Ongoing Use** | Daily usage | Nav + music + calls | Diagnostics + customization | Profiles + nav + music |
| **Advocacy** | Shares experience | Tells coworkers | Writes forum review | Tells family and friends |

### 5.2 Key Interaction Journey: Navigation Setup

```
[Start Car] --> [Profile Loaded] --> [Home Screen]
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
              [Saved Dest]      [Search Address]     [CarPlay Nav]
                    |                   |                   |
              [Confirm Route]   [Autocomplete]       [Phone Nav]
                    |                   |                   |
              [Navigation Active] <----+-------------------+
                    |
              [Voice Guidance + Visual Display]
                    |
              [Traffic Reroute?] --Yes--> [New Route Suggested]
                    |                            |
                    No                     [Accept/Decline]
                    |                            |
              [Arrive at Destination] <----------+
```

---

## 6. Accessibility Requirements

### 6.1 Visual Accessibility

| Requirement | Implementation | Persona Benefit |
|------------|----------------|-----------------|
| Large font mode | Minimum 18pt body text, 24pt headers | Karen (Family) |
| High contrast mode | WCAG AA contrast ratios (4.5:1 minimum) | All personas |
| Night mode | Automatic brightness adjustment based on ambient light sensor | Sarah (Commuter, evening drives) |
| Color-blind safe palette | Avoid red/green only indicators; use shape + color | All personas |
| Glanceable UI | Critical info readable in <1 second glance | All personas (safety) |

### 6.2 Motor Accessibility

| Requirement | Implementation | Persona Benefit |
|------------|----------------|-----------------|
| Large touch targets | Minimum 48x48dp touch targets | Karen (Family) |
| Steering wheel controls | Full navigation via steering wheel buttons | All personas (safety) |
| Voice control | Complete hands-free operation via Siri/Google Assistant | Sarah (Commuter) |
| Reduced motion option | Disable animations for users with vestibular sensitivity | Accessibility |

### 6.3 Cognitive Accessibility

| Requirement | Implementation | Persona Benefit |
|------------|----------------|-----------------|
| Simple mode | Reduced UI with only essential functions | Karen (Family) |
| Consistent navigation | Same menu structure across all screens | All personas |
| Confirmation dialogs | Confirm before destructive actions (delete profile, factory reset) | David/Karen (Family) |
| Progressive disclosure | Advanced features hidden behind "Advanced" submenu | All personas |
| Clear iconography | Icons paired with text labels; no icon-only buttons for primary actions | Karen (Family) |

### 6.4 Auditory Accessibility

| Requirement | Implementation | Persona Benefit |
|------------|----------------|-----------------|
| Visual alerts | On-screen indicators for all audio notifications | Hearing-impaired users |
| Adjustable alert volume | Independent volume for navigation, media, and alerts | All personas |
| Haptic feedback | Vibration confirmation for touch inputs (via steering wheel) | All personas |

---

## 7. Persona-Based Feature Priority Matrix

| Feature | Sarah (Commuter) | Marcus (Tech) | David/Karen (Family) | Priority |
|---------|:-----------------:|:-------------:|:--------------------:|:--------:|
| Apple CarPlay | Critical | Low | High | P0 |
| Android Auto | Low | Critical | High | P0 |
| Real-time Navigation | Critical | Medium | High | P0 |
| Bluetooth Hands-free | Critical | Medium | High | P0 |
| Multi-user Profiles | Medium | High | Critical | P0 |
| CAN Bus Diagnostics | Low | Critical | Low | P1 |
| UI Customization | Low | Critical | Low | P1 |
| OTA Updates | Medium | Critical | Medium | P1 |
| Backup Camera Input | Medium | Critical | High | P1 |
| Large Font / Simple Mode | Low | Low | Critical | P1 |
| Voice Control | High | Medium | Medium | P1 |
| Offline Maps | High | Medium | High | P2 |
| Dashcam Integration | Low | High | Medium | P2 |
| Home Automation Hooks | Low | High | Low | P3 |

---

*This document should be revisited after beta testing to validate persona assumptions against real user behavior data.*
