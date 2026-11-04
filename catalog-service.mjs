import { CATALOG_URL, normalizeCatalog } from "./catalog.mjs";

export const CATALOG_CACHE_MS = 15 * 60 * 1000;
const MAX_BYTES = 50 * 1024 * 1024;

async function readCatalogResponse(response) {
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body?.cancel();
    throw new Error("The Ignite catalog exceeds the 50 MB response limit.");
  }
  if (!response.body) throw new Error("The Ignite catalog response was empty.");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error("The Ignite catalog exceeds the 50 MB response limit.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Microsoft returned an invalid JSON catalog. The feed may be temporarily unavailable.");
  }
}

export function createCatalogLoader({ fetchImpl = fetch, now = Date.now } = {}) {
  let cached = null;
  let cachedAt = 0;
  let pending = null;

  async function download() {
    let response;
    try {
      response = await fetchImpl(CATALOG_URL, {
        headers: { Accept: "application/json" },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000)
      });
    } catch (error) {
      const reason = error.cause?.code || error.name || "network error";
      throw new Error(`Could not reach Microsoft's Ignite 2026 catalog (${reason}). Check this server's internet access and try again.`);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Microsoft's Ignite catalog returned HTTP ${response.status}. Try refreshing later.`);
    }
    const normalized = normalizeCatalog(await readCatalogResponse(response));
    cachedAt = now();
    cached = {
      event: "ignite-2026",
      source: CATALOG_URL,
      fetchedAt: new Date(cachedAt).toISOString(),
      ...normalized
    };
    return cached;
  }

  return async function loadCatalog({ refresh = false } = {}) {
    if (pending) return pending;
    if (!refresh && cached && now() - cachedAt < CATALOG_CACHE_MS) return cached;
    cached = null;
    pending = download();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}
