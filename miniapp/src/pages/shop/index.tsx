import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Shop() {
  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>小卖部</Text>
        <Text className='page-subtitle'>用金币购买精品图纸</Text>
      </View>
      <View className='page-content'>
        <Text className='placeholder'>敬请期待</Text>
      </View>
    </View>
  )
}
