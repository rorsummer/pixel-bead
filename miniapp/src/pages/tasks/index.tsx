import { useState, useEffect } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getTasksStatus, claimTask, TasksStatus } from '../../services/tasks'
import { getUser, updateUser } from '../../services/store'
import './index.scss'

export default function TasksPage() {
  const [status, setStatus] = useState<TasksStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimingKey, setClaimingKey] = useState<string | null>(null)

  useDidShow(() => {
    load()
  })

  const load = async () => {
    setLoading(true)
    try {
      const s = await getTasksStatus()
      setStatus(s)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (key: string) => {
    if (claimingKey) return
    setClaimingKey(key)
    try {
      const res = await claimTask(key)
      const me = getUser()
      if (me) updateUser({ ...me, coins: res.coins })
      Taro.showToast({ title: `+${res.reward} 金币`, icon: 'success' })
      await load()
    } catch (e: any) {
      Taro.showToast({ title: e.message || '领取失败', icon: 'none' })
    } finally {
      setClaimingKey(null)
    }
  }

  const totalReward = status?.items
    .filter((t) => t.claimable)
    .reduce((sum, t) => sum + t.reward, 0) || 0

  if (loading) return <View className='page loading'>加载中...</View>
  if (!status) return <View className='page loading'>加载失败</View>

  return (
    <ScrollView scrollY className='page'>
      <View className='header'>
        <View className='header-top'>
          <Text className='header-title'>今日任务</Text>
          <Text className='header-coins'>🪙 {status.coins}</Text>
        </View>
        {totalReward > 0 ? (
          <Text className='header-hint'>还有 <Text className='hint-highlight'>{totalReward}</Text> 金币等你领取</Text>
        ) : (
          <Text className='header-hint'>完成任务，赚取金币</Text>
        )}
      </View>

      <View className='task-list'>
        {status.items.map((t) => {
          const percent = Math.min(100, (t.progress / t.target) * 100)
          return (
            <View className='task-card' key={t.key}>
              <View className='task-main'>
                <View className='task-info'>
                  <View className='task-title-row'>
                    <Text className='task-title'>{t.title}</Text>
                    <Text className='task-reward'>+{t.reward} 🪙</Text>
                  </View>
                  <Text className='task-desc'>{t.desc}</Text>
                </View>
              </View>

              <View className='progress-row'>
                <View className='progress-bar'>
                  <View
                    className={`progress-fill ${t.completed ? 'done' : ''}`}
                    style={{ width: `${percent}%` }}
                  />
                </View>
                <Text className='progress-text'>
                  {t.progress} / {t.target}
                </Text>
              </View>

              <View className='task-action'>
                {t.claimed ? (
                  <Button className='action-btn claimed' disabled>已领取</Button>
                ) : t.claimable ? (
                  <Button
                    className='action-btn claim'
                    loading={claimingKey === t.key}
                    onClick={() => handleClaim(t.key)}
                  >
                    领取奖励
                  </Button>
                ) : (
                  <Button className='action-btn todo' disabled>去完成</Button>
                )}
              </View>
            </View>
          )
        })}
      </View>

      <View className='tips'>
        <Text className='tips-title'>任务说明</Text>
        <Text className='tips-line'>· 任务每天 0 点重置</Text>
        <Text className='tips-line'>· 达成条件后需手动领取金币</Text>
        <Text className='tips-line'>· 点赞、收藏自己的作品不计入任务</Text>
      </View>
    </ScrollView>
  )
}
