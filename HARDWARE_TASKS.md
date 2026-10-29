# Hardware team: software handoff

The web app can request a short buzzer cue from a local Raspberry Pi bridge. It does not steer, brake, change speed or decide whether someone is fit to drive. Simulation data stays separate from real session scoring. No physical hardware has been validated by these automated tests.

Before connecting anything, add your findings to `docs/hardware-readiness.md`:

1. **Camera:** explain how poor lighting, glasses, camera placement and missing faces affect the signal check. Identify the current missing-data behavior in the code.
2. **Computer:** explain what could slow down camera analysis on a Pi. Record how you would measure responsiveness without claiming an accuracy percentage.
3. **Connection:** explain what works locally and what needs the internet, Supabase or Gemini. Describe what users should see when a connection fails.
4. **Buzzer:** describe the `/alert` request, three-pulse pattern, cooldown and shutdown behavior. Use the mocked tests; no wiring is required for this task.
5. **Installation:** list the checks still needed on a real Pi: GPIO mapping, electrical compatibility, native library installation, camera permissions and kiosk startup. Mark each as untested until measured.

For each item, include the relevant repository file, one limitation and a simple proposed check. Start with `docs/RASPBERRY_PI_5_SETUP.md`, `hardware/raspberry-pi/bridge.js`, `components/CameraPreview.tsx` and `services/faceTracker.ts`.

The `src/services/hardware/` classes are an optional bench-test interface with a mock provider. They do not start automatically in the app. Any future telemetry screen must prominently label simulated readings and must not write them into real trip history.
