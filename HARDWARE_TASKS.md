
# GitHub Tasks: CogniHood Hardware Simulation Phase

## Task 1: Advanced Vehicle Physics & Gear Simulation
**Objective:** Enhance `src/services/hardware/providers/mockProvider.ts` to simulate realistic vehicle dynamics.
**Acceptance Criteria:**
- Implement acceleration curves based on `acceleratorPosition`.
- Implement braking deceleration curves based on `brakePressure`.
- Simulate Gear shifting logic (P -> D -> R) and its impact on speed.
- Add "engine noise" (fluctuating RPM) and gradual odometer increases.
- **File to Edit:** `src/services/hardware/providers/mockProvider.ts`

---

## Task 2: Vehicle Instrumentation UI (The Cockpit)
**Objective:** Create a new React component `VehicleCockpit.tsx` to display real-time telemetry from the VHAL.
**Acceptance Criteria:**
- Display a digital Speedometer (Kph) and RPM Gauge.
- Show current Gear status and Odometer.
- Use `vhal.onSignal()` to subscribe to data updates.
- Style with a "military-grade" or "automotive-glass" aesthetic consistent with the app.
- **Location:** `src/components/hardware/VehicleCockpit.tsx`

---

## Task 3: Active Intervention HUD & Actuator Feedback
**Objective:** Visualize hardware interventions triggered by the `SafetyController`.
**Acceptance Criteria:**
- Create a UI overlay that triggers when `vhal.sendCommand()` receives an `emergencyBrake: true`.
- Implement a screen-flash effect for `visualAlert`.
- Show a "Haptic Feedback" icon pulsing when `hapticWarning` is active.
- Ensure the HUD is highly visible but doesn't block the camera stream completely.
- **Location:** `src/components/hardware/InterventionHUD.tsx`

---

## Task 4: Research: Web Serial/Bluetooth CAN Bus Bridge
**Objective:** Document the technical requirements for connecting physical hardware (OBD-II readers) to the browser.
**Acceptance Criteria:**
- Research the `Web Bluetooth API` and `Web Serial API`.
- Find a compatible ELM327 Bluetooth protocol schema.
- Write a short technical proposal (`docs/HARDWARE_BRIDGE.md`) on how to implement a `PhysicalCanProvider.ts`.
- **Location:** `docs/HARDWARE_BRIDGE.md`
