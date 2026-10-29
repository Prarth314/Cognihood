
import { TripRecord, CognitiveFingerprint } from '../types';
import { saveTrip } from './tripStore';

const DB_NAME = 'cognihood_db';
const TRIPS_STORE = 'trips';
const BASELINE_STORE = 'baseline';

function openLegacyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.transaction?.abort();
      reject(new Error('No legacy database exists on this device.'));
    };
  });
}

export function validLegacyTrip(value: unknown, userId: string): TripRecord | null {
  if (!value || typeof value !== 'object') return null;
  const trip = value as Partial<TripRecord>;
  if (trip.userId && trip.userId !== userId) return null;
  const finite = (number: unknown) => typeof number === 'number' && Number.isFinite(number);
  if (
    typeof trip.id !== 'string' || trip.id.length < 16 ||
    !finite(trip.startTime) || !finite(trip.endTime) || !finite(trip.durationMs) ||
    !finite(trip.avgScore) || !finite(trip.minScore) || !finite(trip.maxScore) ||
    !Array.isArray(trip.events) || !Array.isArray(trip.coachingTips) || !Array.isArray(trip.scoreTimeline) ||
    (trip.durationMs as number) < 30_000 || trip.events.length > 500 || trip.scoreTimeline.length > 5000
  ) return null;
  return {
    ...(trip as TripRecord),
    userId,
    algorithmVersion: 'legacy-import-2026.10.13',
    measurementSource: 'BROWSER_CAMERA',
    cloudAnalysisUsed: false,
    cloudConsentAt: null,
    dataQuality: 'VALID',
  };
}

async function readLegacyTrips(): Promise<TripRecord[]> {
  try {
    const db = await openLegacyDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TRIPS_STORE, 'readonly');
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
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
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
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

async function clearLegacyData(importedIds: string[]): Promise<void> {
  const db = await openLegacyDb();
  const stores = [TRIPS_STORE].filter(name => db.objectStoreNames.contains(name));
  if (stores.length === 0) {
    db.close();
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      const store = tx.objectStore(TRIPS_STORE);
      if (store.keyPath !== 'id') {
        tx.abort();
        reject(new Error('Imported data saved; local cleanup requires manual review of the legacy key format.'));
        return;
      }
      for (const id of importedIds) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function migrateLegacyIndexedDbToSupabase(
  userId: string,
  deleteAfterSuccess = true
): Promise<{ tripsMigrated: number; baselineMigrated: boolean }> {
  const trips = await readLegacyTrips();
  let migrated = 0;
  const importedIds: string[] = [];

  for (const trip of trips) {
    const validated = validLegacyTrip(trip, userId);
    if (!validated) continue;
    await saveTrip(validated);
    migrated++;
    importedIds.push(validated.id);
  }

  const baselineMigrated = false;

  if (migrated > 0 || baselineMigrated) {
    if (deleteAfterSuccess) await clearLegacyData(importedIds);
  }

  return { tripsMigrated: migrated, baselineMigrated };
}
