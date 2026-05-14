/**
 * localStorage 兼容层
 *
 * 在前后端对接过渡期使用。所有 localStorage 读写被拦截：
 * - 读操作返回 null/[]  ← 页面不会崩溃，但也不读旧数据
 * - 写操作被静默忽略   ← 防止数据继续散落在 localStorage
 *
 * 对接计划：逐步将调用处替换为 novelApi / workspaceApi 的对应方法。
 */

const MIGRATED_KEYS = [
  'novels',
  'novel_chapters',
  'prompts',
  'novelGenres',
  'writingGoals',
  'apiConfig',
  'aiApiConfigs',
  'account_balance',
  'billing_records',
  'token_usage_stats',
  'customTemplates',
  'api-config',
  'token-usage',
  'apiConfigType',
  'officialApiConfig',
  'customApiConfig',
  'customModels',
  'auto_backup_settings',
  'backup_list',
  'chapterSummaryPromptTemplate',
  'shortStoryConfig',
]

export function getItem(key) {
  if (MIGRATED_KEYS.includes(key)) {
    console.warn(`[storageCompat] localStorage.getItem('${key}') — 已迁移，返回 null`)
    return null
  }
  return localStorage.getItem(key)
}

export function setItem(key, value) {
  if (MIGRATED_KEYS.includes(key)) {
    console.warn(`[storageCompat] localStorage.setItem('${key}') — 已迁移，操作被忽略`)
    return
  }
  localStorage.setItem(key, value)
}

export function removeItem(key) {
  if (MIGRATED_KEYS.includes(key)) {
    console.warn(`[storageCompat] localStorage.removeItem('${key}') — 已迁移，操作被忽略`)
    return
  }
  localStorage.removeItem(key)
}

export default { getItem, setItem, removeItem }
