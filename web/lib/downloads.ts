import { randomUUID } from "crypto";

interface StoredDownload {
  buf: Buffer;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;

const store: Map<string, StoredDownload> =
  (globalThis as { __tinyYouDownloads?: Map<string, StoredDownload> })
    .__tinyYouDownloads ?? new Map();
(globalThis as { __tinyYouDownloads?: Map<string, StoredDownload> }).__tinyYouDownloads =
  store;

function sweep(): void {
  const now = Date.now();
  for (const [token, entry] of store) {
    if (entry.expiresAt <= now) store.delete(token);
  }
}

/** Hold a clean portrait in memory for up to 10 minutes, per privacy policy. */
export function stashDownload(buf: Buffer): string {
  sweep();
  const token = randomUUID();
  store.set(token, { buf, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function takeDownload(token: string): Buffer | null {
  sweep();
  const entry = store.get(token);
  return entry ? entry.buf : null;
}
