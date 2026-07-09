import Taro from '@tarojs/taro'
import { API_BASE } from './config'
import { clearAuth, getToken, setAuth, updateUser, UserInfo } from './store'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  requireAuth?: boolean // 是否需要登录
}

export async function request<T = any>(opts: RequestOptions): Promise<T> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getToken()
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  } else if (opts.requireAuth) {
    throw new Error('未登录')
  }

  const res = await Taro.request({
    url: `${API_BASE}${opts.url}`,
    method: opts.method || 'GET',
    data: opts.data,
    header,
    timeout: 60000,
  })

  if (res.statusCode === 401) {
    clearAuth()
    throw new Error('登录已过期')
  }
  if (res.statusCode >= 400) {
    const msg =
      (res.data as any)?.detail || (res.data as any)?.message || `请求失败 ${res.statusCode}`
    throw new Error(msg)
  }

  return res.data as T
}

interface LoginResult {
  token: string
  user: UserInfo
}

/**
 * 微信登录：调 wx.login 拿 code，发给后端换取 token
 */
export async function wechatLogin(profile?: { nickname?: string; avatar_url?: string }) {
  const loginRes = await Taro.login()
  if (!loginRes.code) {
    throw new Error('微信登录失败：未拿到 code')
  }

  const data = await request<LoginResult>({
    url: '/api/auth/wechat-login',
    method: 'POST',
    data: {
      code: loginRes.code,
      nickname: profile?.nickname,
      avatar_url: profile?.avatar_url,
    },
  })

  setAuth(data.token, data.user)
  return data.user
}

/**
 * 拉取最新的用户信息（比如金币变化后刷新）
 */
export async function fetchMe(): Promise<UserInfo> {
  const user = await request<UserInfo>({
    url: '/api/user/me',
    requireAuth: true,
  })
  updateUser(user)
  return user
}

/**
 * 更新昵称/头像到后端
 */
export async function updateProfile(patch: {
  nickname?: string
  avatar_url?: string
}): Promise<UserInfo> {
  const user = await request<UserInfo>({
    url: '/api/user/update-profile',
    method: 'POST',
    data: patch,
  })
  updateUser(user)
  return user
}
