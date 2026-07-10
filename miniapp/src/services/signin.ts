import { request } from './request'

export interface SigninStatus {
  signed_today: boolean
  current_streak: number
  coins: number
  upcoming: {
    streak: number
    reward: number
    is_today: boolean
  }[]
}

export interface SigninResult {
  ok: boolean
  coins_gained: number
  current_streak: number
  coins: number
}

export async function getSigninStatus(): Promise<SigninStatus> {
  return request({ url: '/api/signin/status', requireAuth: true })
}

export async function doSignin(): Promise<SigninResult> {
  return request({
    url: '/api/signin',
    method: 'POST',
    requireAuth: true,
  })
}

export interface CoinTransaction {
  id: number
  kind: string
  amount: number
  balance: number
  remark: string | null
  created_at: string
}

export async function getCoinTransactions(page: number = 1, limit: number = 30) {
  return request<{
    coins: number
    items: CoinTransaction[]
    total: number
    has_more: boolean
  }>({
    url: `/api/coins/transactions?page=${page}&limit=${limit}`,
    requireAuth: true,
  })
}
