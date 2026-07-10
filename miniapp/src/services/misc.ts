import { request } from './request'
import type { WorkItem } from './works'

export interface RankingItem extends WorkItem {
  rank_likes: number
}

export async function getRanking(
  period: 'day' | 'week' | 'month',
  limit: number = 20
): Promise<{ period: string; items: RankingItem[] }> {
  return request({
    url: `/api/ranking?period=${period}&limit=${limit}`,
  })
}

export async function submitFeedback(content: string, contact?: string) {
  return request({
    url: '/api/feedback',
    method: 'POST',
    data: { content, contact },
    requireAuth: true,
  })
}
