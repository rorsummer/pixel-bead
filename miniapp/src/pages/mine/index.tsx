import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Mine() {
  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>我的</Text>
      </View>
      <View className='page-content'>
        <Text className='placeholder'>敬请期待</Text>
      </View>
    </View>
  )
}
