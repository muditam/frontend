const DEFAULT_TTL_MS = 60 * 1000;

const safeStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const getCachedData = async (key, fetcher, ttlMs = DEFAULT_TTL_MS) => {
  const storage = safeStorage();
  const cacheKey = `api-cache:${key}`;
  const now = Date.now();

  if (storage) {
    try {
      const raw = storage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached?.ts && now - cached.ts < ttlMs) {
          return cached.data;
        }
        storage.removeItem(cacheKey);
      }
    } catch {
      storage.removeItem(cacheKey);
    }
  }

  const data = await fetcher();

  if (storage) {
    try {
      storage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // Ignore quota/private-mode failures; the API response is still returned.
    }
  }

  return data;
};

export const clearCachedData = (keyPrefix = "") => {
  const storage = safeStorage();
  if (!storage) return;

  const prefix = `api-cache:${keyPrefix}`;
  Object.keys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => storage.removeItem(key));
};
