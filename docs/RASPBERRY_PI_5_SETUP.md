# Raspberry Pi 5 kiosk and hardware bridge

CogniHood's Pi deployment uses a Node.js Express server to serve the Vite production build and a local-only `POST /alert` endpoint. A critical assessment in the kiosk app requests a short buzzer pattern through that endpoint. The bridge only binds to `127.0.0.1`; it does not expose a GPIO endpoint to the LAN and does not control vehicle systems.

## Hardware and software assumptions

- Raspberry Pi 5, Raspberry Pi OS 64-bit (Bookworm), Chromium, and Node.js 22.x.
- The project requires Node.js `>=22 <25`; the Bookworm Node.js package may not satisfy this.
- BCM GPIO 17 is line 17 on the RP1 GPIO chip, commonly exposed as `gpiochip4`. Verify this on the installed kernel; chip numbering can vary.
- The buzzer is assumed active-high; the bridge drives BCM 17 with three 250 ms on-pulses separated by 180 ms off-pulses. It does not generate a tone with PWM.
- GPIO is 3.3 V only. Check the buzzer's voltage and current before wiring; use a transistor/MOSFET driver and suitable external supply if its input current exceeds the GPIO's safe output. Share ground with the Pi and keep 5 V off the GPIO pin.

## 1. Check GPIO mapping and install prerequisites

Use the Pi's GPIO tools to confirm the chip and line before enabling the service:

```bash
gpiodetect
gpioinfo gpiochip4
```

Confirm the RP1 chip and line 17 correspond to BCM GPIO 17 (physical header pin 11). If they do not, change `GPIO_CHIP` and `GPIO_LINE` in `cognihood-bridge.service`. The line must not already be claimed by another process or assigned to a conflicting overlay.

Install the system build prerequisites and Chromium (package availability varies by Raspberry Pi OS image):

```bash
sudo apt update
sudo apt install -y build-essential gpiod libgpiod-dev chromium curl
```

Install a supported Node.js 22.x release and npm from a trusted source. Make sure `node --version` and `command -v node` match the version and path used by systemd.

## 2. Build the local app

Place the repository at `/opt/cognihood`, ensure the kiosk account can read it, and configure `.env.local` with the required browser Supabase values. Do not put server secrets in Vite variables.

```bash
cd /opt/cognihood
npm ci
cd hardware/raspberry-pi
npm ci
cd /opt/cognihood
VITE_ENABLE_HARDWARE_BRIDGE=true npm run build
```

`node-libgpiod` is isolated in the Pi-specific package so non-Linux development and CI do not install the native GPIO binding. On the Pi, `libgpiod-dev` and the C++ build toolchain must be present before its `npm ci` so the native binding can compile. The Pi package pins a current `node-gyp` override to avoid the known tar extraction advisories in the package's older build-tool dependency. If the native binding is missing, bridge startup fails explicitly rather than silently disabling the buzzer.

## 3. Grant GPIO access and install the bridge service

The service template assumes a login account named `pi`. Change `User`, `Group`, and the `ExecStart` Node.js path in `cognihood-bridge.service` if your installation differs. Add that account to the GPIO group, then sign out and back in:

```bash
sudo usermod -aG gpio pi
sudo cp hardware/raspberry-pi/cognihood-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cognihood-bridge.service
```

Verify the server and GPIO initialization before starting Chromium:

```bash
curl --fail http://127.0.0.1:3001/healthz
sudo journalctl -u cognihood-bridge.service -n 50 --no-pager
```

The bridge serves `dist/` at `http://127.0.0.1:3001` and accepts only a same-origin `POST /alert` with `{ "type": "critical" }`. It returns 202 while starting the three-pulse pattern and 200 if a pattern is already active. Invalid origins and payloads are rejected.

## 4. Launch Chromium in kiosk mode

Install the desktop autostart entry for the same graphical login account:

```bash
mkdir -p ~/.config/autostart
cp /opt/cognihood/hardware/raspberry-pi/cognihood-kiosk.desktop ~/.config/autostart/
chmod +x /opt/cognihood/hardware/raspberry-pi/start_cognihood.sh
```

Configure Raspberry Pi OS to boot into the desktop with that user logged in, set the display to 1024x600, and disable screen blanking. Grant Chromium camera permission for `http://127.0.0.1:3001` during the initial interactive launch. The USB camera must be visible to the OS and not in use by another process.

The script waits up to 30 seconds for the bridge, then starts Chromium fullscreen with WebGL/EGL and GPU-rasterization flags for the camera/MediaPipe workload. Chromium/GPU driver behavior is OS-image dependent; if the display fails to start, launch the script from a terminal and check `chromium --enable-logging=stderr` output before removing or adjusting individual GPU flags.

After changing frontend code, rebuild with `VITE_ENABLE_HARDWARE_BRIDGE=true` and restart the kiosk browser. Vercel and ordinary web builds should leave the flag disabled.

## Safety and verification limits

- The browser-to-bridge request is gated by `VITE_ENABLE_HARDWARE_BRIDGE`, and bridge traffic is loopback-only with exact host/origin checks. This is not a security boundary against other local processes.
- Never rely on the buzzer or browser as a driving-safety system. It is an optional attention cue, not an actuator for steering, braking, or vehicle control.
- Automated tests validate HTTP request validation and the three-pulse logic using a mock GPIO line. They cannot validate the RP1 chip mapping, native binding build, electrical load, camera, display, or GPU behavior; perform those checks on the Pi before use.
