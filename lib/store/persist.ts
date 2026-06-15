import fs from "fs";
import path from "path";
import { TEST_ACCOUNT_ID } from "@/lib/auth/constants";

/**
 * Simple file-backed persistence for the MVP's in-memory stores.
 * Data is scoped per account under data/accounts/{accountId}/store.json.
 * Swap this layer for Supabase/Postgres in Phase 2.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const LEGACY_STORE_FILE = path.join(DATA_DIR, "store.json");
const ACCOUNT_ID = process.env.RESTAURANT_ACCOUNT_ID ?? TEST_ACCOUNT_ID;

function getStoreFile(): string {
  return path.join(DATA_DIR, "accounts", ACCOUNT_ID, "store.json");
}

function migrateLegacyStoreIfNeeded(): void {
  const storeFile = getStoreFile();
  if (fs.existsSync(storeFile)) return;

  if (fs.existsSync(LEGACY_STORE_FILE)) {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.copyFileSync(LEGACY_STORE_FILE, storeFile);
    return;
  }

  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
}

function readStoreFile(): Record<string, unknown> {
  migrateLegacyStoreIfNeeded();
  const storeFile = getStoreFile();
  try {
    return JSON.parse(fs.readFileSync(storeFile, "utf8"));
  } catch {
    return {};
  }
}

/** Load a store's persisted value, or seed (and persist) it on first run. */
export function loadPersisted<T>(key: string, seed: () => T): T {
  const data = readStoreFile();
  if (data[key] !== undefined) return data[key] as T;
  const seeded = seed();
  savePersisted(key, seeded);
  return seeded;
}

export function savePersisted(key: string, value: unknown): void {
  const data = readStoreFile();
  data[key] = value;
  const storeFile = getStoreFile();
  fs.mkdirSync(path.dirname(storeFile), { recursive: true });
  fs.writeFileSync(storeFile, JSON.stringify(data, null, 2));
}
