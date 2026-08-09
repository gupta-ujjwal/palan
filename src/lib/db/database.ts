import Dexie, { type Table } from 'dexie'
import type { Plant, AppSettings } from '../types/plant'

export class PlantCareDB extends Dexie {
  plants!: Table<Plant, string>
  appSettings!: Table<AppSettings, string>

  constructor() {
    super('PlantCareDB')
    this.version(1).stores({
      plants: 'id, name, type, species',
      appSettings: 'id',
    })
  }
}

export const db = new PlantCareDB()

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  notificationsEnabled: false,
  notificationTime: '09:00',
  mutedPlantIds: [],
}
