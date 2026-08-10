const CACHE_NAME = 'plant-care-v1'
const APP_SHELL = ['/plants/', '/plants/index.html', '/plants/manifest.json', '/plants/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => cached)
    }),
  )
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'plant-care-check') {
    event.waitUntil(checkDueTasks())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus()
      }
      return clients.openWindow('/plants/')
    }),
  )
})

async function checkDueTasks() {
  try {
    const lastSent = await getFromDB('lastNotificationDate')
    const todayStr = new Date().toISOString().slice(0, 10)
    if (lastSent === todayStr) return

    const plants = await getAllPlantsFromDB()
    const dueTasks = calculateDueTasks(plants)

    if (dueTasks.length === 0) return

    const taskList = dueTasks.map((t) => `${t.name} needs ${t.action}`).join(', ')

    await self.registration.showNotification(
      `Palan: ${dueTasks.length} task${dueTasks.length > 1 ? 's' : ''} today`,
      {
        body: taskList,
        icon: '/plants/favicon.svg',
        tag: 'plant-care-daily',
      },
    )

    await setInDB('lastNotificationDate', todayStr)
  } catch (e) {
    // Silently fail — service worker errors should not crash
  }
}

function calculateDueTasks(plants) {
  const tasks = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const plant of plants) {
    const careTypes = ['watering', 'fertilizing', 'repotting', 'pruning']
    for (const ct of careTypes) {
      const entry = plant.careSchedule?.[ct]
      if (!entry || typeof entry.frequencyDays !== 'number' || entry.frequencyDays <= 0) continue

      let lastDone
      if (entry.lastDone) {
        lastDone = new Date(entry.lastDone)
        if (isNaN(lastDone.getTime())) continue
        if (lastDone > today) lastDone = new Date(today)
      } else if (plant.acquiredDate) {
        lastDone = new Date(plant.acquiredDate)
        if (isNaN(lastDone.getTime())) lastDone = new Date(today)
      } else {
        lastDone = new Date(today)
      }

      const nextDue = new Date(lastDone)
      nextDue.setDate(nextDue.getDate() + entry.frequencyDays)

      if (today >= nextDue) {
        tasks.push({ name: plant.nickname || plant.name, action: ct })
      }
    }
  }

  return tasks
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('PlantCareDB')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAllPlantsFromDB() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('plants', 'readonly')
    const store = tx.objectStore('plants')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

async function getFromDB(key) {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('appSettings', 'readonly')
    const store = tx.objectStore('appSettings')
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function setInDB(key, value) {
  const db = await openDB()
  return new Promise((resolve) => {
    const tx = db.transaction('appSettings', 'readwrite')
    const store = tx.objectStore('appSettings')
    store.put({ id: key, value })
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}
