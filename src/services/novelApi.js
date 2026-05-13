import http from './http'

// ==================== 小说 CRUD ====================

export function listNovels() {
  return http.get('/novels').then(r => r.data)
}

export function getNovel(novelId) {
  return http.get(`/novels/${novelId}`).then(r => r.data)
}

export function createNovel(data) {
  return http.post('/novels', data).then(r => r.data)
}

export function updateNovel(novelId, data) {
  return http.put(`/novels/${novelId}`, data).then(r => r.data)
}

export function deleteNovel(novelId) {
  return http.delete(`/novels/${novelId}`).then(r => r.data)
}

// ==================== 章节 CRUD ====================

export function listChapters(novelId) {
  return http.get(`/novels/${novelId}/chapters`).then(r => r.data)
}

export function createChapter(novelId, data) {
  return http.post(`/novels/${novelId}/chapters`, data).then(r => r.data)
}

export function updateChapter(chapterId, data) {
  return http.put(`/novels/chapters/${chapterId}`, data).then(r => r.data)
}

export function deleteChapter(chapterId) {
  return http.delete(`/novels/chapters/${chapterId}`)
}

// ==================== 人物 CRUD ====================

export function createCharacter(novelId, data) {
  return http.post(`/novels/${novelId}/characters`, data).then(r => r.data)
}

export function updateCharacter(characterId, data) {
  return http.put(`/novels/characters/${characterId}`, data).then(r => r.data)
}

export function deleteCharacter(characterId) {
  return http.delete(`/novels/characters/${characterId}`)
}

// ==================== 世界观 CRUD ====================

export function createWorldSetting(novelId, data) {
  return http.post(`/novels/${novelId}/world-settings`, data).then(r => r.data)
}

export function updateWorldSetting(settingId, data) {
  return http.put(`/novels/world-settings/${settingId}`, data).then(r => r.data)
}

export function deleteWorldSetting(settingId) {
  return http.delete(`/novels/world-settings/${settingId}`)
}

// ==================== 事件 CRUD ====================

export function createEvent(novelId, data) {
  return http.post(`/novels/${novelId}/events`, data).then(r => r.data)
}

export function updateEvent(eventId, data) {
  return http.put(`/novels/events/${eventId}`, data).then(r => r.data)
}

export function deleteEvent(eventId) {
  return http.delete(`/novels/events/${eventId}`)
}
