export class RequestBodyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Bound bytes while reading, including chunked requests without Content-Length. */
export async function readLimitedJson(request: Request, limit: number): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new RequestBodyError(415, 'Content-Type must be application/json.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, 'Request body must be a JSON object.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestBodyError(413, 'Request is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new RequestBodyError(400, 'Request body must be JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RequestBodyError(400, 'Request body must be a JSON object.');
  return value as Record<string, unknown>;
}

export function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.floor(parsed))) : fallback;
}
