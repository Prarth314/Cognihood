import { describe, it, expect } from 'vitest';
import { readLimitedJson, boundedInteger } from '../supabase/functions/_shared/requestSafety';

describe('edge request boundaries', () => {
  const request = (body: string) =>
    new Request('https://example.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  it('accepts only a JSON object', async () => {
    expect(await readLimitedJson(request('{"action":"analyze"}'), 100)).toEqual({ action: 'analyze' });
    for (const body of ['null', '[]', '"text"', '{'])
      await expect(readLimitedJson(request(body), 100)).rejects.toMatchObject({ status: 400 });
  });
  it('rejects streamed excess bytes without trusting Content-Length', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(200));
        controller.close();
      },
    });
    const input = new Request('https://example.invalid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      duplex: 'half',
    } as RequestInit);
    await expect(readLimitedJson(input, 100)).rejects.toMatchObject({ status: 413 });
  });
  it('rejects other content types and honors bounded configuration defaults', async () => {
    await expect(
      readLimitedJson(new Request('https://example.invalid', { method: 'POST', body: '{}' }), 100),
    ).rejects.toMatchObject({ status: 415 });
    expect(boundedInteger('', 15, 1, 60)).toBe(15);
    expect(boundedInteger(undefined, 15, 1, 60)).toBe(15);
    expect(boundedInteger('1000', 15, 1, 60)).toBe(60);
  });
});
