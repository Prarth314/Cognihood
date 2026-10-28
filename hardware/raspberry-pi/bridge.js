import express from 'express';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const DEFAULT_GPIO_CHIP = 'gpiochip4';
const DEFAULT_GPIO_LINE = 17;
const BEEP_PATTERN = [
  { value: 1, durationMs: 250 },
  { value: 0, durationMs: 180 },
  { value: 1, durationMs: 250 },
  { value: 0, durationMs: 180 },
  { value: 1, durationMs: 250 },
  { value: 0, durationMs: 250 },
];

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultDistDir = resolve(projectRoot, 'dist');

export function createBuzzerController(line, logger = console, chipHandle = null) {
  let active = false;
  let disposed = false;
  let timer = null;
  let stepIndex = 0;

  const stopPattern = (error) => {
    if (timer) clearTimeout(timer);
    timer = null;
    active = false;
    if (error) logger.error('[GPIO bridge] Failed to drive buzzer GPIO.', error);

    try {
      line.setValue(0);
    } catch (writeError) {
      logger.error('[GPIO bridge] Failed to return buzzer GPIO to low.', writeError);
    }
  };

  const advancePattern = () => {
    const step = BEEP_PATTERN[stepIndex];
    if (!step) {
      active = false;
      timer = null;
      return;
    }

    stepIndex += 1;
    try {
      line.setValue(step.value);
    } catch (error) {
      stopPattern(error);
      return;
    }

    timer = setTimeout(advancePattern, step.durationMs);
  };

  return {
    chipHandle,
    trigger() {
      if (disposed) throw new Error('Buzzer controller has been closed');
      if (active) return false;

      stepIndex = 1;
      line.setValue(BEEP_PATTERN[0].value);
      active = true;
      timer = setTimeout(advancePattern, BEEP_PATTERN[0].durationMs);
      return true;
    },
    close() {
      if (disposed) return;
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      active = false;
      try {
        line.setValue(0);
      } finally {
        line.release();
      }
    },
  };
}

export function createApp({ buzzer, distDir = defaultDistDir, port = DEFAULT_PORT }) {
  if (!buzzer) throw new Error('A buzzer controller is required');

  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
  const app = express();

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (!allowedHosts.has(req.get('host') ?? '')) {
      return res.status(403).json({ error: 'Local requests only' });
    }
    next();
  });
  app.use(express.json({ limit: '1kb', strict: true }));

  app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

  app.post('/alert', (req, res, next) => {
    if (!allowedOrigins.has(req.get('origin') ?? '')) {
      return res.status(403).json({ error: 'Untrusted request origin' });
    }
    if (req.body?.type !== 'critical') {
      return res.status(400).json({ error: 'Expected a critical alert event' });
    }

    try {
      const started = buzzer.trigger();
      return res.status(started ? 202 : 200).json({
        status: started ? 'alerting' : 'already-alerting',
      });
    } catch (error) {
      return next(error);
    }
  });

  app.use(express.static(distDir, { index: false }));
  app.get('*', (req, res, next) => {
    if (!req.accepts('html')) return next();
    return res.sendFile(resolve(distDir, 'index.html'), (error) => {
      if (error) next(error);
    });
  });

  app.use((error, _req, res, next) => {
    console.error('[GPIO bridge] Request failed.', error);
    if (res.headersSent) return next(error);
    const status = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
    return res.status(status).json({
      error: status === 413 ? 'Request body too large' : status === 400 ? 'Invalid request body' : 'Hardware bridge request failed',
    });
  });

  return app;
}

function openBuzzerLine() {
  const chipName = process.env.GPIO_CHIP || DEFAULT_GPIO_CHIP;
  const lineNumber = Number(process.env.GPIO_LINE ?? DEFAULT_GPIO_LINE);
  if (!Number.isInteger(lineNumber) || lineNumber < 0) {
    throw new Error(`GPIO_LINE must be a non-negative integer; received "${process.env.GPIO_LINE}"`);
  }

  const { Chip } = require('node-libgpiod');
  const chip = new Chip(chipName);
  const line = chip.getLine(lineNumber);
  line.requestOutputMode();
  line.setValue(0);
  return { chip, line };
}

export function startBridge() {
  const port = Number(process.env.PORT ?? DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be between 1 and 65535; received "${process.env.PORT}"`);
  }
  if (!existsSync(resolve(defaultDistDir, 'index.html'))) {
    throw new Error('The local app build is missing. Run the Pi production build before starting the bridge.');
  }

  const { chip, line } = openBuzzerLine();
  const buzzer = createBuzzerController(line, console, chip);
  const app = createApp({ buzzer, port });
  const server = app.listen(port, HOST, () => {
    console.info(`[GPIO bridge] Serving CogniHood at http://${HOST}:${port}`);
  });

  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    console.info(`[GPIO bridge] Received ${signal}; shutting down.`);
    try {
      buzzer.close();
    } catch (error) {
      console.error('[GPIO bridge] Failed to release buzzer GPIO.', error);
      process.exitCode = 1;
    }
    server.close((error) => {
      if (error) {
        console.error('[GPIO bridge] Failed to close HTTP server.', error);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.on('error', (error) => {
    console.error('[GPIO bridge] HTTP server failed.', error);
    process.exitCode = 1;
    shutdown('server error');
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    startBridge();
  } catch (error) {
    console.error('[GPIO bridge] Startup failed.', error);
    process.exitCode = 1;
  }
}
