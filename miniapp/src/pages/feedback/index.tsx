import { useState } from 'react'
import { View, Text, Textarea, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { submitFeedback } from '../../services/misc'
import './index.scss'

export default function FeedbackPage() {
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const t = content.trim()
    if (t.length < 5) {
      Taro.showToast({ title: '内容至少 5 个字', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await submitFeedback(t, contact.trim() || undefined)
      Taro.showToast({ title: '反馈已提交，感谢', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 800)
    } catch (e: any) {
      Taro.showToast({ title: e.message || '提交失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className='page'>
      <View className='block'>
        <Text className='label'>你的建议或问题</Text>
        <Textarea
          className='textarea'
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          placeholder='请详细描述遇到的问题或想要的功能，帮助我们做得更好'
          maxlength={500}
          autoHeight
        />
        <Text className='hint'>{content.length}/500</Text>
      </View>

      <View className='block'>
        <Text className='label'>联系方式（选填）</Text>
        <Input
          className='input'
          value={contact}
          onInput={(e) => setContact(e.detail.value)}
          placeholder='微信号 / QQ / 邮箱，方便我们回复你'
          maxlength={128}
        />
      </View>

      <Button
        className='submit-btn'
        type='primary'
        loading={submitting}
        onClick={submit}
      >
        提交反馈
      </Button>
    </View>
  )
}
