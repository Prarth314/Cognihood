import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { createApp, createBuzzerController } from './bridge.js';

const servers = [];

async function listen(buzzer) {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port: availablePort } = probe.address();
      probe.close(() => resolve(availablePort));
    });
  });
  const app = createApp({ buzzer, port, distDir: 'missing-dist' });
  const server = await new Promise((resolve) => {
    const instance = app.listen(port, '127.0.0.1', () => resolve(instance));
  });
  servers.push(server);
  return { url: `http://127.0.0.1:${port}`, origin: `http://127.0.0.1:${port}` };
}

function postWithHost(url, host, origin) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, {
      method: 'POST',
      headers: {
        Host: host,
        Origin: origin,
        'Content-Type': 'application/json',
      },
    }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject);
    request.end(JSON.stringify({ type: 'critical' }));
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
  vi.useRealTimers();
});

describe('createBuzzerController', () => {
  it('plays a bounded three-pulse pattern and releases the output low', () => {
    vi.useFakeTimers();
    const line = { setValue: vi.fn(), release: vi.fn() };
    const buzzer = createBuzzerController(line);

    expect(buzzer.trigger()).toBe(true);
    expect(buzzer.trigger()).toBe(false);
    vi.advanceTimersByTime(2000);
    expect(line.setValue.mock.calls.map(([value]) => value)).toEqual([1, 0, 1, 0, 1, 0]);

    buzzer.close();
    expect(line.setValue).toHaveBeenLastCalledWith(0);
    expect(line.release).toHaveBeenCalledOnce();
  });
});

describe('local bridge API', () => {
  it('accepts a critical alert from the kiosk origin only', async () => {
    const buzzer = { trigger: vi.fn(() => true) };
    const { url, origin } = await listen(buzzer);

    const response = await fetch(`${url}/alert`, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'critical' }),
    });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'alerting' });
    expect(buzzer.trigger).toHaveBeenCalledOnce();
  });

  it('rejects non-local hosts, untrusted origins, and unknown events without triggering GPIO', async () => {
    const buzzer = { trigger: vi.fn(() => true) };
    const { url, origin } = await listen(buzzer);
    const request = (requestOrigin, body) => fetch(`${url}/alert`, {
      method: 'POST',
      headers: {
        Origin: requestOrigin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    expect(await postWithHost(url, 'attacker.example:3001', origin)).toBe(403);
    expect((await request('https://attacker.example', { type: 'critical' })).status).toBe(403);
    expect((await request(origin, { type: 'arbitrary' })).status).toBe(400);
    expect(buzzer.trigger).not.toHaveBeenCalled();
  });

  it('bounds repeated output, rejects large bodies and applies browser security headers', async () => {
    const buzzer = { trigger: vi.fn(() => true) };
    const { url, origin } = await listen(buzzer);
    const post = body => fetch(`${url}/alert`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const first = await post({ type: 'critical' });
    expect(first.status).toBe(202);
    expect(first.headers.get('content-security-policy')).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(first.headers.get('content-security-policy')).not.toContain('upgrade-insecure-requests');
    expect(first.headers.get('x-content-type-options')).toBe('nosniff');
    expect(first.headers.get('cache-control')).toBe('private, no-store');
    const repeated = await post({ type: 'critical' });
    expect(repeated.status).toBe(429);
    expect(Number(repeated.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await post({ type: 'critical', padding: 'x'.repeat(2048) })).status).toBe(413);
    expect(buzzer.trigger).toHaveBeenCalledOnce();
  });
});
