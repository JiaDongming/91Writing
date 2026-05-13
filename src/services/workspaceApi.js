import http from './http'

// ==================== 提示词 CRUD ====================

export function listPrompts() {
  return http.get('/workspace/prompts').then(r => r.data)
}

export function createPrompt(data) {
  return http.post('/workspace/prompts', data).then(r => r.data)
}

export function updatePrompt(id, data) {
  return http.put(`/workspace/prompts/${id}`, data).then(r => r.data)
}

export function deletePrompt(id) {
  return http.delete(`/workspace/prompts/${id}`)
}

// ==================== 写作目标 CRUD ====================

export function listGoals() {
  return http.get('/workspace/goals').then(r => r.data)
}

export function createGoal(data) {
  return http.post('/workspace/goals', data).then(r => r.data)
}

export function updateGoal(id, data) {
  return http.put(`/workspace/goals/${id}`, data).then(r => r.data)
}

export function deleteGoal(id) {
  return http.delete(`/workspace/goals/${id}`)
}

// ==================== 小说类型 CRUD ====================

export function listGenres() {
  return http.get('/workspace/genres').then(r => r.data)
}

export function createGenre(data) {
  return http.post('/workspace/genres', data).then(r => r.data)
}

export function updateGenre(id, data) {
  return http.put(`/workspace/genres/${id}`, data).then(r => r.data)
}

export function deleteGenre(id) {
  return http.delete(`/workspace/genres/${id}`)
}

// ==================== AI 配置 CRUD ====================

export function listProviders() {
  return http.get('/workspace/providers').then(r => r.data)
}

export function createProvider(data) {
  return http.post('/workspace/providers', data).then(r => r.data)
}

export function updateProvider(id, data) {
  return http.put(`/workspace/providers/${id}`, data).then(r => r.data)
}

export function deleteProvider(id) {
  return http.delete(`/workspace/providers/${id}`)
}

// ==================== Token 使用记录 ====================

export function listTokenUsage() {
  return http.get('/workspace/token-usage').then(r => r.data)
}

// ==================== 用户设置 ====================

export function getSettings() {
  return http.get('/workspace/settings').then(r => r.data)
}

export function updateSettings(data) {
  return http.put('/workspace/settings', data).then(r => r.data)
}

// ==================== 订阅 ====================

export function getMySubscription() {
  return http.get('/subscriptions/me').then(r => r.data)
}

export function listSubscriptionPlans() {
  return http.get('/subscriptions/plans').then(r => r.data)
}
