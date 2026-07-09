import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Ranking() {
  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>排行榜</Text>
        <Text className='page-subtitle'>看看谁的作品最受欢迎</Text>
      </View>
      <View className='page-content'>
        <Text className='placeholder'>敬请期待</Text>
      </View>
    </View>
  )
}
