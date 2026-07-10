import { request } from './request'

export interface WorkItem {
  id: number
  user_id: number
  title: string
  source_type: 'image' | 'draw'
  grid_width: number
  grid_height: number
  total_beads: number
  color_count: number
  cover_base64: string | null
  price: number
  likes_count: number
  favorites_count: number
  views_count: number
  created_at: string
  author?: {
    id: number
    nickname: string
    avatar_url: string | null
  }
}

export interface WorkDetail extends WorkItem {
  grid_data: (string | null)[][]
  stats: { code: string; hex: string; count: number }[]
}

export interface PublishWorkParams {
  title: string
  source_type: 'image' | 'draw'
  grid_width: number
  grid_height: number
  grid_data: (string | null)[][]
  stats: { code: string; hex: string; count: number }[]
  cover_base64?: string
  price?: number
}

export async function publishWork(params: PublishWorkParams): Promise<WorkItem> {
  return request({
    url: '/api/works/publish',
    method: 'POST',
    data: params,
    requireAuth: true,
  })
}

export interface WorkListResponse {
  items: WorkItem[]
  page: number
  has_more: boolean
}

export async function listWorks(params: {
  sort?: 'newest' | 'hot' | 'likes'
  price_type?: 'free' | 'paid' | 'all'
  page?: number
  limit?: number
}): Promise<WorkListResponse> {
  const query = new URLSearchParams()
  if (params.sort) query.set('sort', params.sort)
  if (params.price_type) query.set('price_type', params.price_type)
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 20))
  return request({ url: `/api/works?${query.toString()}` })
}

export async function getWorkDetail(id: number): Promise<WorkDetail> {
  return request({ url: `/api/works/${id}` })
}

export async function deleteWork(id: number): Promise<void> {
  return request({
    url: `/api/works/${id}`,
    method: 'DELETE',
    requireAuth: true,
  })
}
