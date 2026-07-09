import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Create() {
  const handleImageToChart = () => {
    Taro.navigateTo({ url: '/pages/image-to-chart/index' })
  }

  const handleDrawChart = () => {
  Taro.navigateTo({ url: '/pages/draw-chart/index' })
}



  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>创建作品</Text>
        <Text className='page-subtitle'>选择创作方式</Text>
      </View>
      <View className='page-content'>
        <View className='option-card' onClick={handleImageToChart}>
          <Text className='option-icon'>🖼️</Text>
          <Text className='option-title'>图片转图纸</Text>
          <Text className='option-desc'>上传图片，自动生成拼豆图纸</Text>
        </View>
        <View className='option-card' onClick={handleDrawChart}>
          <Text className='option-icon'>✏️</Text>
          <Text className='option-title'>绘制图纸</Text>
          <Text className='option-desc'>手动创作，画出你的原创作品</Text>
        </View>
      </View>
    </View>
  )
}
