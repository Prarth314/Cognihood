/** Bounded provider JSON; no response text or credentials are put into errors. */
export async function readProviderJson(response: Response, limit = 262144): Promise<unknown> {
  if (!response.ok) { await response.body?.cancel(); throw new Error('Provider request failed'); }
  if (Number(response.headers.get('content-length') ?? 0) > limit) { await response.body?.cancel(); throw new Error('Provider response too large'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Provider response missing');
  let bytes = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength; if (bytes > limit) throw new Error('Provider response too large'); chunks.push(value);
    }
    const buffer = new Uint8Array(bytes); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(buffer)); } catch { throw new Error('Provider JSON invalid'); }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
