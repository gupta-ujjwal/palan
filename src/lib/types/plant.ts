export type CareType = 'watering' | 'fertilizing' | 'repotting' | 'pruning'

export interface PlantImage {
  type: 'url' | 'base64'
  value: string
  label?: string
}

export interface WateringSchedule {
  frequencyDays: number
  lastDone?: string
  notes?: string
}

export interface FertilizingSchedule {
  frequencyDays: number
  lastDone?: string
  fertilizerType?: string
  notes?: string
}

export interface RepottingSchedule {
  frequencyDays: number
  lastDone?: string
  potSize?: string
  soilType?: string
}

export interface PruningSchedule {
  frequencyDays: number
  lastDone?: string
  notes?: string
}

export interface CareSchedule {
  watering: WateringSchedule
  fertilizing?: FertilizingSchedule
  repotting?: RepottingSchedule
  pruning?: PruningSchedule
}

export interface Environment {
  light?: string
  humidity?: string
  temperature?: string
  pruningStyle?: string
  notes?: string
}

export type PestSeverity = 'mild' | 'moderate' | 'severe'

export interface PestEntry {
  date: string
  pest: string
  severity?: PestSeverity
  treatment?: string
  resolved?: boolean
  resolvedDate?: string
  notes?: string
}

export type HealthLogAction = 'watering' | 'fertilizing' | 'repotting' | 'pruning'

export interface HealthLogEntry {
  date: string
  action: HealthLogAction
  note?: string
}

export interface Plant {
  id: string
  name: string
  nickname?: string
  species?: string
  type: string
  acquiredDate?: string
  location?: string
  images?: PlantImage[]
  careSchedule: CareSchedule
  environment?: Environment
  pestTracking?: PestEntry[]
  healthLog?: HealthLogEntry[]
  notes?: string
  metadata?: Record<string, unknown>
}

export interface CareTask {
  plantId: string
  plantName: string
  plantNickname?: string
  plantImage?: PlantImage
  careType: CareType
  nextDue: Date
  isOverdue: boolean
  daysUntilDue: number
}

export interface AppSettings {
  id: string
  notificationsEnabled: boolean
  notificationTime: string
  mutedPlantIds: string[]
  quietHoursEnabled?: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

export type BadgeId =
  | 'first-plant'
  | 'streak-7'
  | 'streak-30'
  | 'streak-100'
  | 'pest-free-30'
  | 'full-garden-water'
  | 'ten-plants'
  | 'first-rescue'

export interface UnlockedBadge {
  id: BadgeId
  unlockedAt: string
}

export interface GardenState {
  id: string
  graceTokenLastGranted: string
  graceTokensUsed: string[]
  unlockedBadges: UnlockedBadge[]
  lastCelebrationAt?: string
}

export const CARE_TYPES: CareType[] = ['watering', 'fertilizing', 'repotting', 'pruning']

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  watering: 'Watering',
  fertilizing: 'Fertilizing',
  repotting: 'Repotting',
  pruning: 'Pruning',
}

export const CARE_TYPE_ICONS: Record<CareType, string> = {
  watering: '💧',
  fertilizing: '🧪',
  repotting: '🪴',
  pruning: '✂️',
}
