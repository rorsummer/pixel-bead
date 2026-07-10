import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCoinTransactions, CoinTransaction } from '../../services/signin'
import './index.scss'

const KIND_LABEL: Record<string, string> = {
  signin: '每日签到',
  task: '完成任务',
  purchase: '购买作品',
  sale: '作品售出',
  reward: '打赏',
  recharge: '金币充值',
  refund: '退款',
}

export default function CoinsPage() {
  const [coins, setCoins] = useState(0)
  const [items, setItems] = useState<CoinTransaction[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    load(1)
  }, [])

  const load = async (p: number) => {
    setLoading(true)
    try {
      const res = await getCoinTransactions(p, 30)
      setCoins(res.coins)
      if (p === 1) setItems(res.items)
      else setItems([...items, ...res.items])
      setPage(p)
      setHasMore(res.has_more)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <View className='page'>
      <View className='header'>
        <Text className='coins-num'>🪙 {coins}</Text>
        <Text className='coins-label'>当前金币</Text>
      </View>

      <ScrollView
        scrollY
        className='list'
        lowerThreshold={100}
        onScrollToLower={() => hasMore && !loading && load(page + 1)}
      >
        {items.length === 0 && !loading && (
          <View className='empty'>暂无金币流水</View>
        )}
        {items.map((t) => (
          <View className='txn-row' key={t.id}>
            <View className='txn-info'>
              <Text className='txn-kind'>{KIND_LABEL[t.kind] || t.kind}</Text>
              {t.remark && <Text className='txn-remark'>{t.remark}</Text>}
              <Text className='txn-time'>{formatTime(t.created_at)}</Text>
            </View>
            <View className='txn-amount'>
              <Text className={t.amount > 0 ? 'plus' : 'minus'}>
                {t.amount > 0 ? '+' : ''}{t.amount}
              </Text>
              <Text className='txn-balance'>余额 {t.balance}</Text>
            </View>
          </View>
        ))}
        {loading && <View className='loading-tip'>加载中...</View>}
        {!hasMore && items.length > 0 && <View className='loading-tip'>没有更多了</View>}
      </ScrollView>
    </View>
  )
}
