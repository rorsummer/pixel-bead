import { request } from './request'

export interface TaskItem {
  key: string
  title: string
  desc: string
  target: number
  reward: number
  progress: number
  completed: boolean
  claimed: boolean
  claimable: boolean
}

export interface TasksStatus {
  items: TaskItem[]
  coins: number
}

export async function getTasksStatus(): Promise<TasksStatus> {
  return request({ url: '/api/tasks/status', requireAuth: true })
}

export async function claimTask(key: string): Promise<{
  ok: boolean
  reward: number
  coins: number
}> {
  return request({
    url: `/api/tasks/claim/${key}`,
    method: 'POST',
    requireAuth: true,
  })
}
