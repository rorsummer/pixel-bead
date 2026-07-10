import { useState } from 'react'
import { View, Text, Image, Button, Slider, Switch, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { publishWork } from '../../services/works'
import { getToken, isLoggedIn, updateUser, getUser } from '../../services/store'
import { getPixelateQuota, PixelateQuota } from '../../services/quota'
import './index.scss'

const API_BASE = 'https://pixel-bead-api.onrender.com'

interface ColorStat {
  code: string
  hex: string
  count: number
}

interface PixelateResult {
  grid_width: number
  grid_height: number
  total_beads: number
  color_count: number
  stats: ColorStat[]
  grid_data: (string | null)[][]
  preview_png_base64: string
  chart_png_base64: string
  consumption?: {
    paid: boolean
    amount: number
    used_today: number
    remaining_free: number
    coins: number
  }
}

export default function ImageToChart() {
  const [tempFilePath, setTempFilePath] = useState<string>('')
  const [gridWidth, setGridWidth] = useState(48)
  const [reduceColors, setReduceColors] = useState(12)
  const [removeBackground, setRemoveBackground] = useState(true)
  const [dither, setDither] = useState(false)
  const [smooth, setSmooth] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('处理中...')
  const [result, setResult] = useState<PixelateResult | null>(null)
  const [tab, setTab] = useState<'preview' | 'chart' | 'stats'>('preview')
  const [quota, setQuota] = useState<PixelateQuota | null>(null)

  useDidShow(() => {
    if (isLoggedIn()) {
      loadQuota()
    } else {
      setQuota(null)
    }
  })

  const loadQuota = async () => {
    try {
      const q = await getPixelateQuota()
      setQuota(q)
    } catch (e) {
      // 忽略配额加载错误
    }
  }

  const goLogin = () => {
    Taro.showModal({
      title: '需要登录',
      content: '使用图片转图纸功能前请先登录',
      confirmText: '去登录',
      success: (r) => {
        if (r.confirm) Taro.switchTab({ url: '/pages/mine/index' })
      },
    })
  }

  const chooseImage = async () => {
    if (!isLoggedIn()) {
      goLogin()
      return
    }
    try {
      const res = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      if (res.tempFiles && res.tempFiles.length > 0) {
        setTempFilePath(res.tempFiles[0].tempFilePath)
        setResult(null)
      }
    } catch (e) {}
  }

  const submit = () => {
    if (!tempFilePath) {
      Taro.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }
    if (!isLoggedIn()) {
      goLogin()
      return
    }

    // 检查配额
    if (quota && quota.remaining_free === 0) {
      if (quota.coins < quota.cost_after_free) {
        Taro.showModal({
          title: '金币不足',
          content: `今日免费次数已用完，本次需要 ${quota.cost_after_free} 金币。当前只有 ${quota.coins} 金币，快去每日签到攒金币吧`,
          confirmText: '去签到',
          success: (r) => {
            if (r.confirm) Taro.navigateTo({ url: '/pages/signin/index' })
          },
        })
        return
      }
      // 金币够，但要确认是否扣费
      Taro.showModal({
        title: '今日免费次数已用完',
        content: `本次将消耗 ${quota.cost_after_free} 金币（当前 ${quota.coins} 金币）`,
        confirmText: '继续使用',
        success: (r) => {
          if (r.confirm) reallySubmit()
        },
      })
      return
    }
    reallySubmit()
  }

  const reallySubmit = () => {
    setLoading(true)
    setLoadingText('正在处理，请稍候...')
    const timer = setTimeout(() => {
      setLoadingText('服务器唤醒中，首次访问需要 30-60 秒...')
    }, 15000)

    Taro.uploadFile({
      url: `${API_BASE}/api/pixelate`,
      filePath: tempFilePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${getToken()}`,
      },
      formData: {
        grid_width: String(gridWidth),
        remove_background: String(removeBackground),
        bg_threshold: '240',
        smooth: String(smooth),
        reduce_colors: String(reduceColors),
        dither: String(dither),
        preview_cell: '10',
        chart_cell: '30',
        block_cells: '0',
      },
      timeout: 120000,
      success: (res) => {
        clearTimeout(timer)
        if (res.statusCode >= 400) {
          let msg = '处理失败'
          try {
            const err = JSON.parse(res.data as string)
            msg = err.detail || msg
          } catch {}
          Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
          return
        }
        try {
          const data: PixelateResult = JSON.parse(res.data as string)
          setResult(data)
          setTab('preview')
          if (data.consumption) {
            const me = getUser()
            if (me) updateUser({ ...me, coins: data.consumption.coins })
            setQuota((prev) => prev && ({
              ...prev,
              used_today: data.consumption!.used_today,
              remaining_free: data.consumption!.remaining_free,
              cost_next: data.consumption!.remaining_free > 0 ? 0 : prev.cost_after_free,
              coins: data.consumption!.coins,
            }))
            if (data.consumption.paid) {
              Taro.showToast({
                title: `已扣除 ${data.consumption.amount} 金币`,
                icon: 'none',
                duration: 2000,
              })
            }
          }
        } catch (e) {
          Taro.showToast({ title: '数据解析失败', icon: 'none' })
        }
      },
      fail: (err) => {
        clearTimeout(timer)
        Taro.showToast({ title: err.errMsg || '请求失败', icon: 'none' })
      },
      complete: () => setLoading(false),
    })
  }

  const saveToAlbum = async (base64: string) => {
    try {
      Taro.showLoading({ title: '保存中...' })
      const fs = Taro.getFileSystemManager()
      const tempPath = `${Taro.env.USER_DATA_PATH}/pixel_${Date.now()}.png`
      await new Promise<void>((resolve, reject) => {
        fs.writeFile({
          filePath: tempPath,
          data: base64,
          encoding: 'base64',
          success: () => resolve(),
          fail: (e) => reject(e),
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

  const handlePublish = () => {
    if (!result) return
    if (!isLoggedIn()) {
      goLogin()
      return
    }

    Taro.showModal({
      title: '发布到广场',
      editable: true,
      placeholderText: '给作品起个名字（不超过 20 字）',
      success: async (r) => {
        if (!r.confirm || !r.content) return
        const title = r.content.trim().slice(0, 20)
        if (!title) {
          Taro.showToast({ title: '标题不能为空', icon: 'none' })
          return
        }
        try {
          Taro.showLoading({ title: '发布中...' })
          await publishWork({
            title,
            source_type: 'image',
            grid_width: result.grid_width,
            grid_height: result.grid_height,
            grid_data: result.grid_data,
            stats: result.stats,
            cover_base64: result.preview_png_base64,
            price: 0,
          })
          Taro.hideLoading()
          Taro.showToast({ title: '发布成功', icon: 'success' })
        } catch (e: any) {
          Taro.hideLoading()
          Taro.showToast({ title: e.message || '发布失败', icon: 'none' })
        }
      },
    })
  }

  return (
    <ScrollView scrollY className='page'>
      {/* 配额提示条 */}
      {quota ? (
        <View className='quota-bar'>
          <View className='quota-info'>
            <Text className='quota-text'>
              今日剩余免费次数 <Text className='quota-highlight'>{quota.remaining_free}</Text>
              <Text className='quota-sep'>/</Text>
              <Text>{quota.free_quota}</Text>
            </Text>
            <Text className='quota-hint'>
              {quota.remaining_free > 0
                ? '免费使用中'
                : `已用完，继续使用每次 ${quota.cost_after_free} 金币`}
            </Text>
          </View>
          <View className='quota-coins'>
            <Text>🪙 {quota.coins}</Text>
          </View>
        </View>
      ) : (
        <View className='quota-bar quota-guest'>
          <Text>登录后可查看今日剩余免费次数</Text>
        </View>
      )}

      <View className='section'>
        <View className='section-title'>1. 选择图片</View>
        <View className='upload-area' onClick={chooseImage}>
          {tempFilePath ? (
            <Image src={tempFilePath} mode='aspectFit' className='upload-preview' />
          ) : (
            <View className='upload-hint'>
              <Text className='upload-icon'>📷</Text>
              <Text>点击选择图片</Text>
              <Text className='upload-sub'>相册或拍照</Text>
            </View>
          )}
        </View>
      </View>

      <View className='section'>
        <View className='section-title'>2. 参数设置</View>
        <View className='param-row'>
          <View className='param-label'>
            <Text>横向豆数</Text>
            <Text className='param-value'>{gridWidth}</Text>
          </View>
          <Slider min={16} max={128} step={4} value={gridWidth} activeColor='#4a90e2'
            onChange={(e) => setGridWidth(e.detail.value)} />
          <Text className='param-hint'>数值越大越精细，也越费豆</Text>
        </View>
        <View className='param-row'>
          <View className='param-label'>
            <Text>颜色数量</Text>
            <Text className='param-value'>{reduceColors === 0 ? '不压缩' : reduceColors}</Text>
          </View>
          <Slider min={0} max={32} step={1} value={reduceColors} activeColor='#4a90e2'
            onChange={(e) => setReduceColors(e.detail.value)} />
          <Text className='param-hint'>卡通图建议 8-16 种</Text>
        </View>
        <View className='switch-row'>
          <Text>自动去除背景</Text>
          <Switch checked={removeBackground} color='#4a90e2'
            onChange={(e) => setRemoveBackground(e.detail.value)} />
        </View>
        <View className='switch-row'>
          <Text>抖动算法（照片开启）</Text>
          <Switch checked={dither} color='#4a90e2' onChange={(e) => setDither(e.detail.value)} />
        </View>
        <View className='switch-row'>
          <Text>去噪平滑</Text>
          <Switch checked={smooth} color='#4a90e2' onChange={(e) => setSmooth(e.detail.value)} />
        </View>
      </View>

      <View className='section'>
        <Button className='submit-btn' type='primary' disabled={loading || !tempFilePath} onClick={submit}>
          {loading ? loadingText : '生成拼豆图纸'}
        </Button>
      </View>

      {result && (
        <View className='section'>
          <View className='section-title'>3. 生成结果</View>
          <View className='result-info'>
            <Text>{result.grid_width} × {result.grid_height} · {result.total_beads} 豆 · {result.color_count} 色</Text>
          </View>
          <View className='result-tabs'>
            <View className={`result-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>预览</View>
            <View className={`result-tab ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>图纸</View>
            <View className={`result-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>用量</View>
          </View>

          {tab === 'preview' && (
            <View>
              <Image src={`data:image/png;base64,${result.preview_png_base64}`} mode='widthFix' className='result-image' />
              <Button className='action-btn' onClick={() => saveToAlbum(result.preview_png_base64)}>保存预览图到相册</Button>
            </View>
          )}

          {tab === 'chart' && (
            <View>
              <ScrollView scrollX className='chart-scroll'>
                <Image src={`data:image/png;base64,${result.chart_png_base64}`} mode='widthFix' className='result-image' />
              </ScrollView>
              <Button className='action-btn' onClick={() => saveToAlbum(result.chart_png_base64)}>保存图纸到相册</Button>
            </View>
          )}

          {tab === 'stats' && (
            <View className='stats-list'>
              {result.stats.map((s) => (
                <View className='stats-row' key={s.code}>
                  <View className='color-swatch' style={{ backgroundColor: s.hex }} />
                  <Text className='stats-code'>{s.code}</Text>
                  <Text className='stats-hex'>{s.hex}</Text>
                  <Text className='stats-count'>{s.count} 颗</Text>
                </View>
              ))}
            </View>
          )}

          <Button className='publish-btn' onClick={handlePublish}>🎉 发布到广场</Button>
        </View>
      )}
    </ScrollView>
  )
}
