import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getRanking, RankingItem } from '../../services/misc'
import './index.scss'

type Period = 'day' | 'week' | 'month'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: '日榜' },
  { key: 'week', label: '周榜' },
  { key: 'month', label: '月榜' },
]

export default function Ranking() {
  const [period, setPeriod] = useState<Period>('day')
  const [items, setItems] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load(period)
  }, [period])

  const load = async (p: Period) => {
    setLoading(true)
    try {
      const res = await getRanking(p, 20)
      setItems(res.items)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/work-detail/index?id=${id}` })
  }

  const rankBadge = (index: number) => {
    if (index === 0) return { text: '🥇', cls: 'gold' }
    if (index === 1) return { text: '🥈', cls: 'silver' }
    if (index === 2) return { text: '🥉', cls: 'bronze' }
    return { text: String(index + 1), cls: 'normal' }
  }

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>排行榜</Text>
        <Text className='page-subtitle'>作品按周期内新增点赞数排序</Text>
      </View>

      <View className='period-tabs'>
        {PERIODS.map((p) => (
          <View
            key={p.key}
            className={`period-tab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </View>
        ))}
      </View>

      <ScrollView scrollY className='ranking-list'>
        {loading && <View className='loading-tip'>加载中...</View>}
        {!loading && items.length === 0 && (
          <View className='empty'>
            <Text className='empty-icon'>🏆</Text>
            <Text>本时段还没有作品上榜</Text>
          </View>
        )}
        {items.map((w, i) => {
          const badge = rankBadge(i)
          return (
            <View
              className='rank-row'
              key={w.id}
              onClick={() => goDetail(w.id)}
            >
              <View className={`rank-badge ${badge.cls}`}>
                <Text>{badge.text}</Text>
              </View>
              <View className='rank-cover'>
                {w.cover_base64 ? (
                  <Image
                    src={`data:image/png;base64,${w.cover_base64}`}
                    mode='aspectFit'
                    className='rank-cover-img'
                  />
                ) : (
                  <Text className='rank-cover-placeholder'>🎨</Text>
                )}
              </View>
              <View className='rank-info'>
                <Text className='rank-title'>{w.title}</Text>
                <Text className='rank-author'>{w.author?.nickname || '匿名'}</Text>
                <Text className='rank-meta'>
                  ❤ {w.rank_likes} 赞 · {w.grid_width}×{w.grid_height}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
