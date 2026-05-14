import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useNovelStore } from '../stores/novel'
import Dashboard from '../views/Dashboard.vue'
import HomePage from '../views/HomePage.vue'
import PromptsLibrary from '../views/PromptsLibrary.vue'
import NovelManagement from '../views/NovelManagement.vue'
import WritingGoals from '../views/WritingGoals.vue'
import TokenBilling from '../views/TokenBilling.vue'
import ApiConfig from '../views/ApiConfig.vue'
import Settings from '../views/Settings.vue'
import ChapterManagement from '../views/ChapterManagement.vue'
import Writer from '../views/Writer.vue'
import GenreManagement from '../views/GenreManagement.vue'
import ToolsLibrary from '../views/ToolsLibrary.vue'
import ShortStory from '../views/ShortStory.vue'
import BookAnalysis from '../views/BookAnalysis.vue'
import Login from '../views/Login.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { noAuth: true }
  },
  {
    path: '/',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'HomePage',
        component: HomePage
      },
      {
        path: 'prompts',
        name: 'PromptsLibrary',
        component: PromptsLibrary
      },
      {
        path: 'novels',
        name: 'NovelManagement',
        component: NovelManagement
      },
      {
        path: 'goals',
        name: 'WritingGoals',
        component: WritingGoals
      },
      {
        path: 'billing',
        name: 'TokenBilling',
        component: TokenBilling
      },
      {
        path: 'config',
        name: 'ApiConfig',
        component: ApiConfig
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings
      },
      {
        path: 'chapters',
        name: 'ChapterManagement',
        component: ChapterManagement
      },
      {
        path: 'writer',
        name: 'Writer',
        component: Writer
      },
      {
        path: 'genres',
        name: 'GenreManagement',
        component: GenreManagement
      },
      {
        path: 'tools',
        name: 'ToolsLibrary',
        component: ToolsLibrary
      },
      {
        path: 'short-story',
        name: 'ShortStory',
        component: ShortStory
      },
      {
        path: 'book-analysis',
        name: 'BookAnalysis',
        component: BookAnalysis
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 导航守卫 —— 未登录跳转登录页
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('accessToken')
  const authStore = useAuthStore()

  if (to.meta.noAuth) {
    // 已登录用户访问登录页，跳转首页
    if (token) {
      return next('/')
    }
    return next()
  }

  if (to.meta.requiresAuth && !token) {
    return next({ path: '/login', query: { redirect: to.fullPath } })
  }

  // 有 token 但用户信息为空，恢复登录态
  if (token && !authStore.user) {
    await authStore.init()
    if (!authStore.user) {
      return next({ path: '/login', query: { redirect: to.fullPath } })
    }
    // 恢复 API 配置（从后端加载）
    const novelStore = useNovelStore()
    await novelStore.initFromBackend()
  }

  next()
})

export default router