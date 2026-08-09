import { derived } from 'svelte/store'
import { plantsStore } from './plants'
import {
  getDueTasks,
  getOverdueTasks,
  getTodayTasks,
  getUpcomingTasks,
  sortTasksByUrgency,
} from '../utils/schedule'

export const dueTasks = derived(plantsStore, ($plants) => {
  return sortTasksByUrgency(getDueTasks($plants))
})

export const overdueTasks = derived(plantsStore, ($plants) => {
  return getOverdueTasks($plants)
})

export const todayTasks = derived(plantsStore, ($plants) => {
  return getTodayTasks($plants)
})

export const upcomingTasks = derived(plantsStore, ($plants) => {
  return getUpcomingTasks($plants, 3)
})

export const taskStats = derived(plantsStore, ($plants) => {
  const due = getDueTasks($plants)
  const overdue = getOverdueTasks($plants)
  const today = getTodayTasks($plants)
  return {
    totalPlants: $plants.length,
    tasksToday: today.length,
    tasksOverdue: overdue.length,
    tasksDue: due.length,
  }
})
