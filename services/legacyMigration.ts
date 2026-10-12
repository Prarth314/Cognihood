
import { TripRecord, CognitiveFingerprint } from '../types';
import { saveTrip, saveBaseline } from './tripStore';

const DB_NAME = 'cognihood_db';
const TRIPS_STORE = 'trips';
const BASELINE_STORE = 'baseline';
const MIGRATION_KEY = 'cognihood_supabase_migrated';

function openLegacyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => resolve(req.result);
  });
}

async function readLegacyTrips(): Promise<TripRecord[]> {
  try {
    const db = await openLegacyDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRIPS_STORE, 'readonly');
      const store = tx.objectStore(TRIPS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as TripRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function readLegacyBaseline(): Promise<CognitiveFingerprint | null> {
  try {
    const db = await openLegacyDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BASELINE_STORE, 'readonly');
      const store = tx.objectStore(BASELINE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result as CognitiveFingerprint[];
        resolve(rows?.[0] ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getLegacyMigrationSummary(): Promise<{ trips: number; hasBaseline: boolean }> {
  const [trips, baseline] = await Promise.all([readLegacyTrips(), readLegacyBaseline()]);
  return { trips: trips.length, hasBaseline: Boolean(baseline) };
}

async function clearLegacyData(): Promise<void> {
  const db = await openLegacyDb();
  const stores = [TRIPS_STORE, BASELINE_STORE].filter(name => db.objectStoreNames.contains(name));
  if (stores.length === 0) {
    db.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    for (const storeName of stores) tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function migrateLegacyIndexedDbToSupabase(
  userId: string,
  deleteAfterSuccess = true
): Promise<{ tripsMigrated: number; baselineMigrated: boolean }> {
  if (localStorage.getItem(MIGRATION_KEY) === userId) {
    return { tripsMigrated: 0, baselineMigrated: false };
  }

  const trips = await readLegacyTrips();
  let migrated = 0;

  for (const trip of trips) {
    await saveTrip({ ...trip, userId });
    migrated++;
  }

  const baseline = await readLegacyBaseline();
  let baselineMigrated = false;
  if (baseline) {
    await saveBaseline({ ...baseline, userId });
    baselineMigrated = true;
  }

  if (migrated > 0 || baselineMigrated) {
    localStorage.setItem(MIGRATION_KEY, userId);
    if (deleteAfterSuccess) await clearLegacyData();
  }

  return { tripsMigrated: migrated, baselineMigrated };
}
