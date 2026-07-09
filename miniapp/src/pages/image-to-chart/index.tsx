import { useState } from 'react'
import { View, Text, Image, Button, Slider, Switch, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
  preview_png_base64: string
  chart_png_base64: string
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

  const chooseImage = async () => {
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
    } catch (e) {
      // 用户取消选择
    }
  }

  const submit = () => {
    if (!tempFilePath) {
      Taro.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    setLoading(true)
    setLoadingText('正在处理，请稍候...')

    // 15 秒后提示可能是服务器唤醒
    const timer = setTimeout(() => {
      setLoadingText('服务器唤醒中，首次访问需要 30-60 秒...')
    }, 15000)

    Taro.uploadFile({
      url: `${API_BASE}/api/pixelate`,
      filePath: tempFilePath,
      name: 'file',
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
        try {
          const data: PixelateResult = JSON.parse(res.data)
          setResult(data)
          setTab('preview')
        } catch (e) {
          Taro.showToast({ title: '返回数据解析失败', icon: 'none' })
        }
      },
      fail: (err) => {
        clearTimeout(timer)
        console.error('上传失败', err)
        Taro.showToast({
          title: err.errMsg || '请求失败，请重试',
          icon: 'none',
          duration: 3000,
        })
      },
      complete: () => {
        setLoading(false)
      },
    })
  }

  // 把 base64 保存为临时文件，再存到相册
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
          content: '请在设置中开启相册权限后重试',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm) Taro.openSetting()
          },
        })
      } else {
        Taro.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }

  return (
    <ScrollView scrollY className='page'>
      {/* 图片选择区 */}
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

      {/* 参数设置 */}
      <View className='section'>
        <View className='section-title'>2. 参数设置</View>

        <View className='param-row'>
          <View className='param-label'>
            <Text>横向豆数</Text>
            <Text className='param-value'>{gridWidth}</Text>
          </View>
          <Slider
            min={16}
            max={128}
            step={4}
            value={gridWidth}
            activeColor='#4a90e2'
            onChange={(e) => setGridWidth(e.detail.value)}
          />
          <Text className='param-hint'>数值越大越精细，也越费豆</Text>
        </View>

        <View className='param-row'>
          <View className='param-label'>
            <Text>颜色数量</Text>
            <Text className='param-value'>
              {reduceColors === 0 ? '不压缩' : reduceColors}
            </Text>
          </View>
          <Slider
            min={0}
            max={32}
            step={1}
            value={reduceColors}
            activeColor='#4a90e2'
            onChange={(e) => setReduceColors(e.detail.value)}
          />
          <Text className='param-hint'>卡通图建议 8-16 种</Text>
        </View>

        <View className='switch-row'>
          <Text>自动去除背景</Text>
          <Switch
            checked={removeBackground}
            color='#4a90e2'
            onChange={(e) => setRemoveBackground(e.detail.value)}
          />
        </View>

        <View className='switch-row'>
          <Text>抖动算法（照片开启）</Text>
          <Switch
            checked={dither}
            color='#4a90e2'
            onChange={(e) => setDither(e.detail.value)}
          />
        </View>

        <View className='switch-row'>
          <Text>去噪平滑</Text>
          <Switch
            checked={smooth}
            color='#4a90e2'
            onChange={(e) => setSmooth(e.detail.value)}
          />
        </View>
      </View>

      {/* 生成按钮 */}
      <View className='section'>
        <Button
          className='submit-btn'
          type='primary'
          disabled={loading || !tempFilePath}
          onClick={submit}
        >
          {loading ? loadingText : '生成拼豆图纸'}
        </Button>
      </View>

      {/* 结果展示 */}
      {result && (
        <View className='section'>
          <View className='section-title'>3. 生成结果</View>

          <View className='result-info'>
            <Text>
              尺寸 {result.grid_width} × {result.grid_height} · 共 {result.total_beads}{' '}
              颗豆 · {result.color_count} 种颜色
            </Text>
          </View>

          <View className='result-tabs'>
            <View
              className={`result-tab ${tab === 'preview' ? 'active' : ''}`}
              onClick={() => setTab('preview')}
            >
              预览
            </View>
            <View
              className={`result-tab ${tab === 'chart' ? 'active' : ''}`}
              onClick={() => setTab('chart')}
            >
              图纸
            </View>
            <View
              className={`result-tab ${tab === 'stats' ? 'active' : ''}`}
              onClick={() => setTab('stats')}
            >
              用量
            </View>
          </View>

          {tab === 'preview' && (
            <View>
              <Image
                src={`data:image/png;base64,${result.preview_png_base64}`}
                mode='widthFix'
                className='result-image'
              />
              <Button
                className='action-btn'
                onClick={() => saveToAlbum(result.preview_png_base64)}
              >
                保存预览图到相册
              </Button>
            </View>
          )}

          {tab === 'chart' && (
            <View>
              <ScrollView scrollX className='chart-scroll'>
                <Image
                  src={`data:image/png;base64,${result.chart_png_base64}`}
                  mode='widthFix'
                  className='result-image'
                />
              </ScrollView>
              <Button
                className='action-btn'
                onClick={() => saveToAlbum(result.chart_png_base64)}
              >
                保存图纸到相册
              </Button>
            </View>
          )}

          {tab === 'stats' && (
            <View className='stats-list'>
              {result.stats.map((s) => (
                <View className='stats-row' key={s.code}>
                  <View
                    className='color-swatch'
                    style={{ backgroundColor: s.hex }}
                  />
                  <Text className='stats-code'>{s.code}</Text>
                  <Text className='stats-hex'>{s.hex}</Text>
                  <Text className='stats-count'>{s.count} 颗</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}
