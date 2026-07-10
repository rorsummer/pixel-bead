import { useState, useEffect, useMemo } from 'react'
import { View, Text, ScrollView, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  getPalette,
  groupBySeries,
  SERIES_INFO,
  ColorItem,
} from '../../services/palette'
import { publishWork } from '../../services/works'
import { isLoggedIn } from '../../services/store'
import './index.scss'

type CellValue = string | null
type Grid = CellValue[][]

const SIZE_OPTIONS = [
  { w: 29, h: 29, label: '29 × 29（一板标准）' },
  { w: 32, h: 32, label: '32 × 32' },
  { w: 48, h: 48, label: '48 × 48（进阶）' },
  { w: 64, h: 64, label: '64 × 64（大图）' },
]

export default function DrawChart() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [grid, setGrid] = useState<Grid>([])
  const [history, setHistory] = useState<Grid[]>([])
  const [future, setFuture] = useState<Grid[]>([])

  const [palette, setPalette] = useState<ColorItem[]>([])
  const [selectedColor, setSelectedColor] = useState<ColorItem | null>(null)
  const [activeSeries, setActiveSeries] = useState<string>('A')
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')

  const paletteGroups = useMemo(() => groupBySeries(palette), [palette])

  useEffect(() => {
    getPalette()
      .then((p) => {
        setPalette(p)
        const first = p.find((c) => c.code === 'A1')
        if (first) setSelectedColor(first)
      })
      .catch(() => Taro.showToast({ title: '色卡加载失败', icon: 'none' }))
  }, [])

  const initGrid = (w: number, h: number): Grid => {
    const g: Grid = []
    for (let y = 0; y < h; y++) g.push(new Array(w).fill(null))
    return g
  }

  const chooseSize = (opt: { w: number; h: number }) => {
    setSize(opt)
    setGrid(initGrid(opt.w, opt.h))
    setHistory([])
    setFuture([])
  }

  const handleCellTap = (x: number, y: number) => {
    if (tool === 'brush' && !selectedColor) {
      Taro.showToast({ title: '请先选择颜色', icon: 'none' })
      return
    }
    const newCode = tool === 'eraser' ? null : selectedColor?.code || null
    if (grid[y][x] === newCode) return
    setHistory([...history, grid.map((row) => [...row])])
    setFuture([])
    const newGrid = grid.map((row, ri) =>
      ri === y ? row.map((c, ci) => (ci === x ? newCode : c)) : row
    )
    setGrid(newGrid)
  }

  const undo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setFuture([grid, ...future])
    setHistory(history.slice(0, -1))
    setGrid(last)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    setHistory([...history, grid])
    setFuture(future.slice(1))
    setGrid(next)
  }

  const clearAll = () => {
    if (!size) return
    Taro.showModal({
      title: '确认清空画布？',
      success: (r) => {
        if (r.confirm) {
          setHistory([...history, grid])
          setFuture([])
          setGrid(initGrid(size.w, size.h))
        }
      },
    })
  }

  const stats = useMemo(() => {
    const map: Record<string, number> = {}
    let total = 0
    for (const row of grid) {
      for (const c of row) {
        if (c) {
          map[c] = (map[c] || 0) + 1
          total++
        }
      }
    }
    return { total, colorCount: Object.keys(map).length, map }
  }, [grid])

  const getHex = (code: string) =>
    palette.find((p) => p.code === code)?.hex || '#fff'

  // 渲染画布到 Canvas，返回 { tempFilePath, base64 }
  const renderCanvas = (): Promise<{ tempFilePath: string; base64: string }> => {
    return new Promise((resolve, reject) => {
      if (!size) return reject(new Error('no size'))
      const query = Taro.createSelectorQuery()
      query.select('#saveCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0] || !res[0].node) return reject(new Error('canvas init failed'))
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const cellSize = 30
        const canvasW = size.w * cellSize
        const canvasH = size.h * cellSize
        canvas.width = canvasW
        canvas.height = canvasH

        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvasW, canvasH)
        for (let y = 0; y < size.h; y++) {
          for (let x = 0; x < size.w; x++) {
            const code = grid[y][x]
            const px = x * cellSize
            const py = y * cellSize
            if (code) {
              ctx.fillStyle = getHex(code)
              ctx.fillRect(px, py, cellSize, cellSize)
              const rgb = palette.find((p) => p.code === code)?.rgb || [0, 0, 0]
              const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
              ctx.fillStyle = lum > 140 ? '#000' : '#fff'
              ctx.font = 'bold 10px sans-serif'
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillText(code, px + cellSize / 2, py + cellSize / 2)
            }
            ctx.strokeStyle = '#e0e0e0'
            ctx.strokeRect(px, py, cellSize, cellSize)
          }
        }

        Taro.canvasToTempFilePath({
          canvas,
          success: (r) => {
            // 读为 base64
            const fs = Taro.getFileSystemManager()
            fs.readFile({
              filePath: r.tempFilePath,
              encoding: 'base64',
              success: (rr: any) => resolve({ tempFilePath: r.tempFilePath, base64: rr.data }),
              fail: (e) => reject(e),
            })
          },
          fail: (e) => reject(e),
        })
      })
    })
  }

  const saveToAlbum = async () => {
    if (!size || stats.total === 0) {
      Taro.showToast({ title: '画布为空', icon: 'none' })
      return
    }
    Taro.showLoading({ title: '生成图片...' })
    try {
      const { tempFilePath } = await renderCanvas()
      Taro.hideLoading()
      await Taro.saveImageToPhotosAlbum({ filePath: tempFilePath })
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

  const buildStats = () => {
    return Object.entries(stats.map).map(([code, count]) => {
      const p = palette.find((pp) => pp.code === code)
      return { code, hex: p?.hex || '#000', count }
    })
  }

  const handlePublish = () => {
    if (!size || stats.total === 0) {
      Taro.showToast({ title: '画布为空', icon: 'none' })
      return
    }
    if (!isLoggedIn()) {
      Taro.showModal({
        title: '需要登录',
        content: '发布作品前请先登录',
        confirmText: '去登录',
        success: (r) => r.confirm && Taro.switchTab({ url: '/pages/mine/index' }),
      })
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
          Taro.showLoading({ title: '生成封面...' })
          const { base64 } = await renderCanvas()
          Taro.showLoading({ title: '发布中...' })
          await publishWork({
            title,
            source_type: 'draw',
            grid_width: size.w,
            grid_height: size.h,
            grid_data: grid,
            stats: buildStats(),
            cover_base64: base64,
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

  if (!size) {
    return (
      <View className='page size-select'>
        <View className='size-select-inner'>
          <Text className='size-title'>选择画布大小</Text>
          <Text className='size-subtitle'>可根据你的拼豆板尺寸选择</Text>
          {SIZE_OPTIONS.map((opt) => (
            <View key={`${opt.w}x${opt.h}`} className='size-option' onClick={() => chooseSize(opt)}>
              <Text className='size-option-label'>{opt.label}</Text>
              <Text className='size-option-arrow'>›</Text>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View className='page'>
      <View className='info-bar'>
        <Text>{size.w} × {size.h}</Text>
        <Text>{stats.total} 豆 · {stats.colorCount} 色</Text>
      </View>

      <ScrollView scrollX className='tool-bar'>
        <View className={`tool-btn ${tool === 'brush' ? 'active' : ''}`} onClick={() => setTool('brush')}>🖌 画笔</View>
        <View className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')}>🧽 橡皮</View>
        <View className={`tool-btn ${history.length === 0 ? 'disabled' : ''}`} onClick={undo}>↶ 撤销</View>
        <View className={`tool-btn ${future.length === 0 ? 'disabled' : ''}`} onClick={redo}>↷ 重做</View>
        <View className='tool-btn' onClick={clearAll}>🗑 清空</View>
        <View className='tool-btn primary' onClick={saveToAlbum}>💾 保存</View>
        <View className='tool-btn publish' onClick={handlePublish}>🎉 发布</View>
      </ScrollView>

      <ScrollView scrollX scrollY className='canvas-wrap'>
        <View className='canvas' style={{ width: `${size.w * 30}rpx` }}>
          {grid.map((row, y) => (
            <View className='canvas-row' key={y}>
              {row.map((code, x) => (
                <View
                  key={x}
                  className='canvas-cell'
                  style={{ backgroundColor: code ? getHex(code) : '#ffffff' }}
                  onClick={() => handleCellTap(x, y)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className='current-color-bar'>
        <Text className='current-label'>当前色</Text>
        {selectedColor ? (
          <>
            <View className='current-swatch' style={{ backgroundColor: selectedColor.hex }} />
            <Text className='current-code'>{selectedColor.code}</Text>
            <Text className='current-hex'>{selectedColor.hex}</Text>
          </>
        ) : (
          <Text className='current-empty'>未选择</Text>
        )}
      </View>

      <ScrollView scrollX className='series-tabs'>
        {SERIES_INFO.map((s) => (
          <View key={s.key}
            className={`series-tab ${activeSeries === s.key ? 'active' : ''}`}
            onClick={() => setActiveSeries(s.key)}>
            {s.key} {s.name}
          </View>
        ))}
      </ScrollView>

      <ScrollView scrollX className='color-picker'>
        {(paletteGroups[activeSeries] || []).map((c) => (
          <View key={c.code}
            className={`color-cell ${selectedColor?.code === c.code ? 'active' : ''}`}
            onClick={() => setSelectedColor(c)}>
            <View className='color-swatch' style={{ backgroundColor: c.hex }} />
            <Text className='color-code'>{c.code}</Text>
          </View>
        ))}
      </ScrollView>

      <Canvas type='2d' id='saveCanvas' style={{
        width: '10rpx', height: '10rpx',
        position: 'fixed', left: '-9999rpx', top: '-9999rpx',
      }} />
    </View>
  )
}
