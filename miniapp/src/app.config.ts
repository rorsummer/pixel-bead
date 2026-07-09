export default defineAppConfig({
  pages: [
    'pages/plaza/index',
    'pages/shop/index',
    'pages/create/index',
    'pages/ranking/index',
    'pages/mine/index',
    'pages/image-to-chart/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '创豆纪',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#4a90e2',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/plaza/index', text: '广场' },
      { pagePath: 'pages/shop/index', text: '小卖部' },
      { pagePath: 'pages/create/index', text: '＋ 创建' },
      { pagePath: 'pages/ranking/index', text: '排行榜' },
      { pagePath: 'pages/mine/index', text: '我的' },
    ],
  },
})
