import { expect, it } from 'vitest';
import { readProviderJson } from '../supabase/functions/_shared/providerResponse';
it('bounds streamed provider output and safely rejects invalid responses', async () => {
  expect(await readProviderJson(new Response('{"safe":"fixture"}'))).toEqual({ safe: 'fixture' });
  await expect(readProviderJson(new Response('private provider message', { status: 503 }))).rejects.toThrow('Provider request failed');
  await expect(readProviderJson(new Response('not json'))).rejects.toThrow('Provider JSON invalid');
  const cancel = () => {};
  const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(101)); }, cancel }));
  await expect(readProviderJson(response, 100)).rejects.toThrow('Provider response too large');
});
