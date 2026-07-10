import { useState, useEffect } from 'react'
import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { getWorkDetail, deleteWork, WorkDetail } from '../../services/works'
import { getUser } from '../../services/store'
import './index.scss'

export default function WorkDetailPage() {
  const router = useRouter()
  const workId = Number(router.params.id)
  const [work, setWork] = useState<WorkDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workId) {
      Taro.showToast({ title: '参数错误', icon: 'none' })
      return
    }
    getWorkDetail(workId)
      .then(setWork)
      .catch((e) => {
        Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
      })
      .finally(() => setLoading(false))
  }, [workId])

  const saveCover = async () => {
    if (!work?.cover_base64) return
    try {
      Taro.showLoading({ title: '保存中...' })
      const fs = Taro.getFileSystemManager()
      const tempPath = `${Taro.env.USER_DATA_PATH}/work_${work.id}.png`
      await new Promise<void>((resolve, reject) => {
        fs.writeFile({
          filePath: tempPath,
          data: work.cover_base64!,
          encoding: 'base64',
          success: () => resolve(),
          fail: reject,
        })
      })
      await Taro.saveImageToPhotosAlbum({ filePath: tempPath })
      Taro.hideLoading()
      Taro.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (e: any) {
      Taro.hideLoading()
      if (e.errMsg && e.errMsg.includes('auth deny')) {
        Taro.showModal({
          title: '需要相册权限',
          content: '请在设置中开启',
          confirmText: '去设置',
          success: (r) => r.confirm && Taro.openSetting(),
        })
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }

  const handleDelete = () => {
    if (!work) return
    Taro.showModal({
      title: '确认删除？',
      content: '删除后无法恢复',
      success: async (r) => {
        if (!r.confirm) return
        try {
          await deleteWork(work.id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => Taro.navigateBack(), 500)
        } catch (e: any) {
          Taro.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  if (loading) {
    return <View className='page loading'>加载中...</View>
  }
  if (!work) {
    return <View className='page loading'>作品不存在</View>
  }

  const me = getUser()
  const isMine = me && me.id === work.user_id

  return (
    <ScrollView scrollY className='page'>
      {work.cover_base64 && (
        <View className='cover-wrap'>
          <Image src={`data:image/png;base64,${work.cover_base64}`} mode='aspectFit' className='cover-img' />
        </View>
      )}

      <View className='info-block'>
        <Text className='title'>{work.title}</Text>
        <View className='meta-row'>
          {work.author?.avatar_url ? (
            <Image src={work.author.avatar_url} className='avatar' />
          ) : (
            <View className='avatar-placeholder'>👤</View>
          )}
          <Text className='nickname'>{work.author?.nickname || '匿名'}</Text>
          <Text className='time'>{formatTime(work.created_at)}</Text>
        </View>
      </View>

      <View className='stats-block'>
        <View className='stat-item'>
          <Text className='stat-value'>{work.grid_width}×{work.grid_height}</Text>
          <Text className='stat-label'>尺寸</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{work.total_beads}</Text>
          <Text className='stat-label'>总豆数</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-value'>{work.color_count}</Text>
          <Text className='stat-label'>色号数</Text>
        </View>
      </View>

      <View className='color-list-block'>
        <Text className='block-title'>色号用量</Text>
        {work.stats.map((s) => (
          <View className='color-row' key={s.code}>
            <View className='color-swatch' style={{ backgroundColor: s.hex }} />
            <Text className='color-code'>{s.code}</Text>
            <Text className='color-hex'>{s.hex}</Text>
            <Text className='color-count'>{s.count} 颗</Text>
          </View>
        ))}
      </View>

      <View className='action-block'>
        <Button className='action-btn primary' onClick={saveCover}>下载图纸</Button>
        {isMine && (
          <Button className='action-btn danger' onClick={handleDelete}>删除作品</Button>
        )}
      </View>
    </ScrollView>
  )
}
