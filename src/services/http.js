import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 —— 自动附带 JWT token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 是否正在刷新 token，避免并发请求同时刷新
let isRefreshing = false
let refreshQueue = []

function resolveRefreshQueue(token) {
  refreshQueue.forEach(({ resolve }) => resolve(token))
  refreshQueue = []
}

function rejectRefreshQueue(error) {
  refreshQueue.forEach(({ reject }) => reject(error))
  refreshQueue = []
}

// 响应拦截器 —— 401 自动刷新 token
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error

    // 401 且不是刷新 token 请求本身，且没有重试过
    if (response?.status === 401 && !config._retry && !config.url?.includes('/auth/refresh')) {
      config._retry = true

      if (isRefreshing) {
        // 已有刷新请求进行中，将当前请求加入等待队列
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          config.headers.Authorization = `Bearer ${token}`
          return http(config)
        })
      }

      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) {
          throw new Error('无刷新令牌')
        }

        const { data } = await axios.post(
          `${http.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        )

        const newToken = data.accessToken
        localStorage.setItem('accessToken', newToken)
        resolveRefreshQueue(newToken)
        config.headers.Authorization = `Bearer ${newToken}`
        return http(config)
      } catch (refreshError) {
        rejectRefreshQueue(refreshError)
        // 刷新失败，清除登录态并跳转登录页
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.hash = '#/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 统一错误提示
    const message = response?.data?.message || error.message || '请求失败'
    if (response?.status !== 401) {
      ElMessage.error(message)
    }

    return Promise.reject(error)
  }
)

export default http
