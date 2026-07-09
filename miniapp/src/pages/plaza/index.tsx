import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Plaza() {
  return (
    <View className='page'>
      <View className='page-header'>
        <Text className='page-title'>广场</Text>
        <Text className='page-subtitle'>发现精美拼豆图纸</Text>
      </View>
      <View className='page-content'>
        <Text className='placeholder'>敬请期待</Text>
      </View>
    </View>
  )
}
