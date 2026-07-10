import { request } from './request'

export interface PixelateQuota {
  used_today: number
  free_quota: number
  remaining_free: number
  cost_next: number
  cost_after_free: number
  coins: number
}

export async function getPixelateQuota(): Promise<PixelateQuota> {
  return request({
    url: '/api/user/quota/pixelate',
    requireAuth: true,
  })
}
