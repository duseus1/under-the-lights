import { invoke, isTauri } from '@tauri-apps/api/core';
import { appSchema, initialState, type AppState } from './domain/types';
export type Backup = { id: number; createdAt: string; data: string };
const MAX_BYTES = 8_000_000;
let database: Promise<IDBDatabase> | null = null;
function openDB() {
  return (database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('under-the-lights', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('state');
      request.result.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = null;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = null;
      reject(request.error);
    };
  }));
}
function requestValue<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function completion(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Save transaction was interrupted.'));
  });
}
export function parseSave(data: string): AppState {
  if (data.length > MAX_BYTES) throw new Error('This save exceeds the 8 MB import limit.');
  try {
    return appSchema.parse(JSON.parse(data));
  } catch {
    throw new Error(
      'This is not a valid version 1 Under the Lights save. Your current careers have not been changed.',
    );
  }
}
export async function loadState(): Promise<AppState> {
  let data: string | null;
  if (isTauri()) data = await invoke('load_state');
  else {
    const db = await openDB();
    data = await requestValue(db.transaction('state').objectStore('state').get('current'));
  }
  return data ? parseSave(data) : structuredClone(initialState);
}
export async function saveState(state: AppState) {
  const data = JSON.stringify(appSchema.parse(state));
  if (data.length > MAX_BYTES)
    throw new Error('Save is too large. Export an archive before adding more careers.');
  if (isTauri()) {
    await invoke('save_state', { data });
    return;
  }
  const db = await openDB();
  const tx = db.transaction(['state', 'backups'], 'readwrite');
  const done = completion(tx);
  const stateStore = tx.objectStore('state');
  const backups = tx.objectStore('backups');
  const request = stateStore.get('current');
  request.onsuccess = () => {
    if (request.result) backups.add({ data: request.result, createdAt: new Date().toISOString() });
    stateStore.put(data, 'current');
    const all = backups.getAllKeys();
    all.onsuccess = () => {
      for (const key of all.result.slice(0, -10)) backups.delete(key);
    };
  };
  await done;
}
export async function listBackups(): Promise<Backup[]> {
  if (isTauri()) return invoke('list_backups');
  const db = await openDB();
  const result = await requestValue<Backup[]>(
    db.transaction('backups').objectStore('backups').getAll(),
  );
  return result.reverse();
}
export async function exportSave(state: AppState): Promise<boolean> {
  const data = JSON.stringify(appSchema.parse(state), null, 2);
  if (isTauri()) return invoke('export_save', { data });
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `under-the-lights-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
export async function nativeImport(): Promise<string | null> {
  return invoke('import_save');
}
export function mergeImport(current: AppState, incoming: AppState): AppState {
  const imported = incoming.careers.map((c) => ({ ...c, id: crypto.randomUUID() }));
  return appSchema.parse({
    ...current,
    careers: [...current.careers, ...imported],
    activeId: imported[0]?.id ?? current.activeId,
  });
}
export const storageLabel = () =>
  isTauri() ? 'SQLite · on this device' : 'Browser preview · local IndexedDB';
