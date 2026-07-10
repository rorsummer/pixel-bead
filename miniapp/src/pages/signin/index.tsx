import { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getSigninStatus, doSignin, SigninStatus } from '../../services/signin'
import { updateUser, getUser } from '../../services/store'
import './index.scss'

export default function SigninPage() {
  const [status, setStatus] = useState<SigninStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const s = await getSigninStatus()
      setStatus(s)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleSignin = async () => {
    if (!status || status.signed_today || signing) return
    setSigning(true)
    try {
      const res = await doSignin()
      // 更新本地用户金币
      const u = getUser()
      if (u) updateUser({ ...u, coins: res.coins })
      Taro.showToast({
        title: `+${res.coins_gained} 金币`,
        icon: 'success',
      })
      await load()
    } catch (e: any) {
      Taro.showToast({ title: e.message || '签到失败', icon: 'none' })
    } finally {
      setSigning(false)
    }
  }

  if (loading) return <View className='page loading'>加载中...</View>
  if (!status) return <View className='page loading'>加载失败</View>

  return (
    <ScrollView scrollY className='page'>
      <View className='top-block'>
        <Text className='current-coins'>🪙 {status.coins}</Text>
        <Text className='coins-label'>当前金币</Text>
        <View className='streak-badge'>
          <Text className='streak-num'>{status.current_streak}</Text>
          <Text className='streak-label'>连续签到天数</Text>
        </View>
      </View>

      <View className='calendar-block'>
        <Text className='block-title'>本轮奖励</Text>
        <View className='calendar-grid'>
          {status.upcoming.map((item, i) => (
            <View
              key={i}
              className={`calendar-cell ${item.is_today ? 'today' : ''} ${i === 0 && status.signed_today ? 'done' : ''}`}
            >
              <Text className='calendar-day'>第 {item.streak} 天</Text>
              <Text className='calendar-reward'>🪙 {item.reward}</Text>
              {i === 0 && status.signed_today && <Text className='calendar-mark'>✓</Text>}
              {item.is_today && <Text className='calendar-mark'>今</Text>}
            </View>
          ))}
        </View>
      </View>

      <View className='action-block'>
        <Button
          className={`signin-btn ${status.signed_today ? 'done' : ''}`}
          loading={signing}
          disabled={status.signed_today}
          onClick={handleSignin}
        >
          {status.signed_today ? '今日已签到' : '立即签到'}
        </Button>
      </View>

      <View className='tips-block'>
        <Text className='tips-title'>签到规则</Text>
        <Text className='tips-line'>· 每天签到可获得金币奖励</Text>
        <Text className='tips-line'>· 连续签到奖励递增：10 → 15 → 20 → 25 → 30 → 40 → 50</Text>
        <Text className='tips-line'>· 断签一天将重置为第 1 天</Text>
      </View>
    </ScrollView>
  )
}
