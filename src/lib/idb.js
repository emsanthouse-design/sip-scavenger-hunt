// Tiny IndexedDB wrapper for the offline submission queue. We use IndexedDB
// (not localStorage) because it can persist the actual photo/video Blob, so a
// queued submission survives a page reload or a crash mid-upload — which is the
// brief's #1 reliability requirement over flaky cellular.

const DB_NAME = 'sip-hunt'
const STORE = 'outbox'
const VERSION = 1

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const store = t.objectStore(STORE)
        const result = fn(store)
        t.oncomplete = () => resolve(result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const idb = {
  async put(item) {
    await tx('readwrite', (s) => s.put(item))
    return item
  },
  async delete(id) {
    await tx('readwrite', (s) => s.delete(id))
  },
  async all() {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, 'readonly')
      const req = t.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  },
}
