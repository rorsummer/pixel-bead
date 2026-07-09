import Taro from '@tarojs/taro'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

export interface UserInfo {
  id: number
  nickname: string
  avatar_url: string | null
  coins: number
}

// 内存缓存，避免频繁读 storage
let cachedToken: string | null = null
let cachedUser: UserInfo | null = null

export function getToken(): string | null {
  if (cachedToken !== null) return cachedToken
  try {
    const t = Taro.getStorageSync(TOKEN_KEY)
    cachedToken = t || null
    return cachedToken
  } catch {
    return null
  }
}

export function getUser(): UserInfo | null {
  if (cachedUser !== null) return cachedUser
  try {
    const u = Taro.getStorageSync(USER_KEY)
    cachedUser = u || null
    return cachedUser
  } catch {
    return null
  }
}

export function setAuth(token: string, user: UserInfo) {
  cachedToken = token
  cachedUser = user
  Taro.setStorageSync(TOKEN_KEY, token)
  Taro.setStorageSync(USER_KEY, user)
}

export function updateUser(user: UserInfo) {
  cachedUser = user
  Taro.setStorageSync(USER_KEY, user)
}

export function clearAuth() {
  cachedToken = null
  cachedUser = null
  Taro.removeStorageSync(TOKEN_KEY)
  Taro.removeStorageSync(USER_KEY)
}

export function isLoggedIn(): boolean {
  return !!getToken()
}
