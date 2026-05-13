import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import http from '../services/http'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value && !!localStorage.getItem('accessToken'))

  function setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  function clearTokens() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async function init() {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      const { data } = await http.get('/auth/me')
      user.value = data
    } catch {
      // 静默失败，等导航守卫处理
    }
  }

  async function login(email, password) {
    const { data } = await http.post('/auth/login', { email, password })
    setTokens(data.accessToken, data.refreshToken)
    user.value = data.user
    return data
  }

  async function register(email, password, nickname) {
    const { data } = await http.post('/auth/register', { email, password, nickname })
    setTokens(data.accessToken, data.refreshToken)
    user.value = data.user
    return data
  }

  async function logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await http.post('/auth/logout', { refreshToken })
      }
    } finally {
      clearTokens()
      user.value = null
    }
  }

  return {
    user,
    isLoggedIn,
    init,
    login,
    register,
    logout,
    setTokens,
    clearTokens
  }
})
