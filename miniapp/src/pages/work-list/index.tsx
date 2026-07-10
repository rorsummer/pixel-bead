import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import {
  listMyWorks,
  listMyLikes,
  listMyFavorites,
  WorkItem,
} from '../../services/works'
import './index.scss'

type Kind = 'mine' | 'likes' | 'favorites'

const TITLE_MAP: Record<Kind, string> = {
  mine: '我的作品',
  likes: '我点赞的',
  favorites: '我收藏的',
}

const EMPTY_MAP: Record<Kind, string> = {
  mine: '还没有作品，去创建一个吧',
  likes: '还没有点赞过任何作品',
  favorites: '还没有收藏过任何作品',
}

export default function WorkList() {
  const router = useRouter()
  const kind = (router.params.kind || 'mine') as Kind

  const [works, setWorks] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    Taro.setNavigationBarTitle({ title: TITLE_MAP[kind] || '列表' })
    refresh()
  }, [kind])

  const fetchPage = (p: number) => {
    if (kind === 'likes') return listMyLikes({ page: p, limit: 20 })
    if (kind === 'favorites') return listMyFavorites({ page: p, limit: 20 })
    return listMyWorks({ page: p, limit: 20 })
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetchPage(1)
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
      const res = await fetchPage(next)
      setWorks([...works, ...res.items])
      setPage(next)
      setHasMore(res.has_more)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
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
    <ScrollView
      scrollY
      className='page'
      lowerThreshold={100}
      onScrollToLower={loadMore}
    >
      {works.length === 0 && !loading && (
        <View className='empty'>
          <Text className='empty-icon'>🎨</Text>
          <Text>{EMPTY_MAP[kind]}</Text>
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
              <Text className='work-meta'>{w.grid_width}×{w.grid_height} · {w.total_beads}豆</Text>
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
  )
}
