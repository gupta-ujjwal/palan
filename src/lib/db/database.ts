import Dexie, { type Table } from 'dexie'
import type { Plant, AppSettings, GardenState } from '../types/plant'

export class PlantCareDB extends Dexie {
  plants!: Table<Plant, string>
  appSettings!: Table<AppSettings, string>
  gardenState!: Table<GardenState, string>

  constructor() {
    super('PlantCareDB')
    this.version(1).stores({
      plants: 'id, name, type, species',
      appSettings: 'id',
    })
    this.version(2).stores({
      plants: 'id, name, type, species',
      appSettings: 'id',
      gardenState: 'id',
    })
  }
}

export const db = new PlantCareDB()

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings',
  notificationsEnabled: false,
  notificationTime: '09:00',
  mutedPlantIds: [],
  quietHoursEnabled: false,
  quietHoursStart: '21:00',
  quietHoursEnd: '08:00',
}

export const DEFAULT_GARDEN_STATE: GardenState = {
  id: 'garden',
  graceTokenLastGranted: '',
  graceTokensUsed: [],
  unlockedBadges: [],
}
