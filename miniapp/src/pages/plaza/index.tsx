import { useState } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { listWorks, WorkItem } from '../../services/works'
import './index.scss'

type SortType = 'newest' | 'hot' | 'likes'

export default function Plaza() {
  const [works, setWorks] = useState<WorkItem[]>([])
  const [sort, setSort] = useState<SortType>('newest')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useDidShow(() => {
    refresh(sort)
  })

  const refresh = async (currentSort: SortType) => {
    setLoading(true)
    try {
      const res = await listWorks({
        sort: currentSort,
        price_type: 'free',
        page: 1,
        limit: 20,
      })
      setWorks(res.items)
      setPage(1)
      setHasMore(res.has_more)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const next = page + 1
      const res = await listWorks({
        sort,
        price_type: 'free',
        page: next,
        limit: 20,
      })
      setWorks([...works, ...res.items])
      setPage(next)
      setHasMore(res.has_more)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  const changeSort = (s: SortType) => {
    if (s === sort) return
    setSort(s)
    refresh(s)
  }

  const goDetail = (id: number) => {
    Taro.navigateTo({ url: `/pages/work-detail/index?id=${id}` })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000
    if (diff < 60) return '刚刚'
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}天前`
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>广场</Text>
      </View>

      <View className='sort-tabs'>
        <View className={`sort-tab ${sort === 'newest' ? 'active' : ''}`} onClick={() => changeSort('newest')}>最新</View>
        <View className={`sort-tab ${sort === 'hot' ? 'active' : ''}`} onClick={() => changeSort('hot')}>最热</View>
        <View className={`sort-tab ${sort === 'likes' ? 'active' : ''}`} onClick={() => changeSort('likes')}>点赞</View>
      </View>

      <ScrollView
        scrollY
        className='works-scroll'
        lowerThreshold={100}
        onScrollToLower={loadMore}
      >
        {works.length === 0 && !loading && (
          <View className='empty'>
            <Text className='empty-icon'>🎨</Text>
            <Text>还没有作品，快来发布第一个吧</Text>
          </View>
        )}

        <View className='works-grid'>
          {works.map((w) => (
            <View className='work-card' key={w.id} onClick={() => goDetail(w.id)}>
              <View className='work-cover'>
                {w.cover_base64 ? (
                  <Image src={`data:image/png;base64,${w.cover_base64}`} mode='aspectFit' className='work-cover-img' />
                ) : (
                  <View className='work-cover-placeholder'>🎨</View>
                )}
              </View>
              <View className='work-info'>
                <Text className='work-title'>{w.title}</Text>
                <Text className='work-meta'>
                  {w.grid_width}×{w.grid_height} · {w.total_beads}豆
                </Text>
                <View className='work-footer'>
                  <Text className='work-author'>{w.author?.nickname || '匿名'}</Text>
                  <Text className='work-time'>{formatTime(w.created_at)}</Text>
                </View>
                <View className='work-stats'>
                  <Text>❤ {w.likes_count}</Text>
                  <Text>⭐ {w.favorites_count}</Text>
                  <Text>👁 {w.views_count}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {loading && <View className='loading-tip'>加载中...</View>}
        {!hasMore && works.length > 0 && <View className='loading-tip'>没有更多了</View>}
      </ScrollView>
    </View>
  )
}
