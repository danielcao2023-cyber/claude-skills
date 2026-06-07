import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = resolve(__dirname, "..", "cache");

interface CacheEntry {
  palette: string[];
  isDark: boolean;
  cachedAt: number;
  detailMtime: number;
}

export function ensureCacheDir(): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKey(slug: string): string {
  return resolve(CACHE_DIR, `${slug}.json`);
}

export function getCachedPalette(slug: string, detailMtime: number): CacheEntry | null {
  try {
    const raw = readFileSync(cacheKey(slug), "utf-8");
    const entry: CacheEntry = JSON.parse(raw);
    if (entry.detailMtime === detailMtime) return entry;
  } catch { /* cache miss */ }
  return null;
}

export function setCachedPalette(
  slug: string,
  detailMtime: number,
  entry: Omit<CacheEntry, "cachedAt" | "detailMtime">,
): void {
  ensureCacheDir();
  writeFileSync(cacheKey(slug), JSON.stringify({
    ...entry,
    cachedAt: Date.now(),
    detailMtime,
  }, null, 2));
}
