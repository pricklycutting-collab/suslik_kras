let opening;
function database() {
  if (!opening)
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open("suslik-adventure", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("visits", { keyPath: "id" });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        opening = null;
        reject(request.error);
      };
      request.onblocked = () => {
        opening = null;
        reject(new Error("Закройте другие вкладки игры и попробуйте снова."));
      };
    });
  return opening;
}
async function run(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    let result;
    const tx = db.transaction("visits", mode);
    try {
      action(tx.objectStore("visits"), (value) => {
        result = value;
      });
    } catch (error) {
      tx.abort();
      reject(error);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Операция отменена."));
  });
}
export async function loadVisits() {
  return new Map(
    (
      await run("readonly", (store, set) => {
        const req = store.getAll();
        req.onsuccess = () => set(req.result);
      })
    ).map((v) => [v.id, v]),
  );
}
export const saveRecord = (record) =>
  run("readwrite", (store) => store.put(record));
export const deleteRecord = (id) =>
  run("readwrite", (store) => store.delete(id));
export const mergeRecords = (records) =>
  run("readwrite", (store) => {
    for (const record of records) store.put(record);
  });
export function readSetting(name, fallback = "") {
  try {
    return localStorage.getItem("suslik-" + name) || fallback;
  } catch {
    return fallback;
  }
}
export function saveSetting(name, value) {
  try {
    localStorage.setItem("suslik-" + name, value);
    return true;
  } catch {
    return false;
  }
}
