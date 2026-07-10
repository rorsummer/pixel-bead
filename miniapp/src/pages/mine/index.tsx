import { useState } from 'react'
import { View, Text, Image, Button, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { fetchMe, updateProfile, wechatLogin } from '../../services/request'
import { clearAuth, getUser, isLoggedIn, UserInfo } from '../../services/store'
import './index.scss'

export default function Mine() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nickname, setNickname] = useState('')

  useDidShow(() => {
    setUser(getUser())
    if (isLoggedIn()) {
      fetchMe().then(setUser).catch(() => {})
    }
  })

  const handleLogin = async () => {
    setLoading(true)
    try {
      const profile = await Taro.getUserProfile({ desc: '用于完善用户资料' }).catch(() => null)
      const u = await wechatLogin({
        nickname: profile?.userInfo.nickName,
        avatar_url: profile?.userInfo.avatarUrl,
      })
      setUser(u)
      Taro.showToast({ title: '登录成功', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message || '登录失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    Taro.showModal({
      title: '确认退出登录？',
      success: (r) => {
        if (r.confirm) {
          clearAuth()
          setUser(null)
          Taro.showToast({ title: '已退出', icon: 'success' })
        }
      },
    })
  }

  const startEditNickname = () => {
    setNickname(user?.nickname || '')
    setEditingName(true)
  }

  const saveNickname = async () => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }
    try {
      const u = await updateProfile({ nickname: trimmed })
      setUser(u)
      setEditingName(false)
      Taro.showToast({ title: '已保存', icon: 'success' })
    } catch (e: any) {
      Taro.showToast({ title: e.message || '保存失败', icon: 'none' })
    }
  }

  const requireLogin = (): boolean => {
    if (isLoggedIn()) return true
    Taro.showToast({ title: '请先登录', icon: 'none' })
    return false
  }

  const goList = (kind: 'mine' | 'likes' | 'favorites') => {
    if (!requireLogin()) return
    Taro.navigateTo({ url: `/pages/work-list/index?kind=${kind}` })
  }

  const goSignin = () => {
    if (!requireLogin()) return
    Taro.navigateTo({ url: '/pages/signin/index' })
  }

  const goTasks = () => {
    if (!requireLogin()) return
    Taro.navigateTo({ url: '/pages/tasks/index' })
  }

  const goCoins = () => {
    if (!requireLogin()) return
    Taro.navigateTo({ url: '/pages/coins/index' })
  }

  const goFeedback = () => {
    if (!requireLogin()) return
    Taro.navigateTo({ url: '/pages/feedback/index' })
  }

  if (!user) {
    return (
      <View className='page'>
        <View className='page-header'>
          <Text className='page-title'>我的</Text>
        </View>
        <View className='login-block'>
          <View className='login-avatar'>👤</View>
          <Text className='login-title'>登录后享受完整功能</Text>
          <Text className='login-desc'>发布作品、点赞收藏、赚取金币</Text>
          <Button className='login-btn' type='primary' loading={loading} onClick={handleLogin}>
            微信一键登录
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='page'>
      <View className='user-header'>
        {user.avatar_url ? (
          <Image src={user.avatar_url} className='user-avatar' />
        ) : (
          <View className='user-avatar-placeholder'>👤</View>
        )}
        <View className='user-info'>
          {editingName ? (
            <View className='edit-name-row'>
              <Input
                className='edit-name-input'
                value={nickname}
                onInput={(e) => setNickname(e.detail.value)}
                maxlength={20}
                focus
              />
              <Text className='edit-name-btn' onClick={saveNickname}>保存</Text>
              <Text className='edit-name-btn cancel' onClick={() => setEditingName(false)}>取消</Text>
            </View>
          ) : (
            <View className='name-row' onClick={startEditNickname}>
              <Text className='user-nickname'>{user.nickname}</Text>
              <Text className='edit-icon'>✎</Text>
            </View>
          )}
          <View className='coins-row' onClick={goCoins}>
            <Text className='coins-icon'>🪙</Text>
            <Text className='coins-value'>{user.coins}</Text>
            <Text className='coins-label'>金币</Text>
            <Text className='coins-arrow'>›</Text>
          </View>
        </View>
      </View>

      <View className='menu-section'>
        <View className='menu-item' onClick={goSignin}>
          <Text className='menu-icon'>📅</Text>
          <Text className='menu-text'>每日签到</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={goTasks}>
          <Text className='menu-icon'>🎯</Text>
          <Text className='menu-text'>每日任务</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => goList('mine')}>
          <Text className='menu-icon'>🎨</Text>
          <Text className='menu-text'>我的作品</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => goList('likes')}>
          <Text className='menu-icon'>❤️</Text>
          <Text className='menu-text'>我点赞的</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={() => goList('favorites')}>
          <Text className='menu-icon'>⭐</Text>
          <Text className='menu-text'>我收藏的</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>

      <View className='menu-section'>
        <View className='menu-item' onClick={goFeedback}>
          <Text className='menu-icon'>💬</Text>
          <Text className='menu-text'>意见反馈</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
        <View className='menu-item' onClick={handleLogout}>
          <Text className='menu-icon'>🚪</Text>
          <Text className='menu-text'>退出登录</Text>
          <Text className='menu-arrow'>›</Text>
        </View>
      </View>
    </View>
  )
}
