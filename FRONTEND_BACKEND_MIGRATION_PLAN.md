# 前后端对接计划

将前端所有 `localStorage` 数据操作逐步迁移到后端 API，实现数据持久化、多租户隔离和 SaaS 化基础。

## 对接概览

| 序号 | 模块 | 涉及页面/组件 | localStorage Key | 后端 API | 状态 |
|------|------|--------------|-----------------|-----------|------|
| 1 | HTTP 基础设施 | `src/services/api.js`（新建） | — | 所有接口 | ✅ 已完成 |
| 2 | 小说 CRUD | `NovelManagement.vue`、`HomePage.vue`、`Writer.vue`、`Settings.vue`、`ToolsLibrary.vue` | `novels` | `/api/novels` | ✅ 已完成 |
| 3 | 章节 CRUD | `ChapterManagement.vue`、`ChapterManager.vue`、`Writer.vue` | `novel_chapters`（嵌套在 novels 内） | `/api/novels/:id/chapters` | ✅ 已完成 |
| 4 | 人物 CRUD | `Writer.vue` 及其他 writer 组件 | 嵌套在 novels 内 | `/api/novels/:id/characters` | ✅ API 就绪 |
| 5 | 世界观 CRUD | `Writer.vue` 及其他 writer 组件 | 嵌套在 novels 内 | `/api/novels/:id/world-settings` | ✅ API 就绪 |
| 6 | 事件 CRUD | `Writer.vue` 及其他 writer 组件 | 嵌套在 novels 内 | `/api/novels/:id/events` | ✅ API 就绪 |
| 7 | 提示词库 CRUD | `PromptsLibrary.vue`、`Writer.vue`、`ShortStory.vue`、`BookAnalysis.vue`、`ToolsLibrary.vue` | `prompts` | `/api/workspace/prompts` | ✅ 已完成 |
| 8 | 写作目标 CRUD | `WritingGoals.vue`（组件+页面）、`HomePage.vue` | `writingGoals` | `/api/workspace/goals` | ✅ 已完成 |
| 9 | 小说类型 CRUD | `GenreManagement.vue`、`NovelManagement.vue` | `novelGenres` | `/api/workspace/genres` | ✅ 已完成 |
| 10 | API 配置 | `ApiConfig.vue`（组件+页面）、`Dashboard.vue`、`api.js`、`novel.js` store | `apiConfigType`、`officialApiConfig`、`customApiConfig`、`customModels`、`aiApiConfigs` | `/api/workspace/providers` | ✅ 已完成 |
| 11 | AI 调用代理 | `src/services/api.js` | —（目前直调外部 API） | `/api/ai/chat/completions` | ✅ 已完成 |
| 12 | 计费系统 | `src/services/billing.js` | `account_balance`、`billing_records`、`token_usage_stats` | `/api/workspace/token-usage`、订阅配额 | ✅ 已完成 |
| 13 | 用户设置 | `Settings.vue`、`BackupManager.vue` | 导入/导出/备份数据 | `/api/workspace/settings` | ✅ 已完成 |
| 14 | 认证系统 | 所有页面 | — | `/api/auth/*` | ✅ 已完成 |

---

## 详细对接方案

### 1. HTTP 基础设施

**目标：** 创建统一的 HTTP 客户端，封装鉴权、错误处理、请求/响应拦截。

**涉及文件（新建/修改）：**
- 新建 `src/services/http.js` — Axios 实例，Base URL 指向后端，JWT token 管理，401 自动刷新

**关键实现点：**
- Axios 实例配置 `baseURL`（从环境变量或配置读取后端地址）
- 请求拦截器自动附带 `Authorization: Bearer <accessToken>`
- 响应拦截器处理 401，自动用 refreshToken 刷新，刷新失败跳转登录页
- 统一错误处理和提示

**后端接口依赖：**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

---

### 2. 小说 CRUD

**目标：** 将小说的创建、读取、更新、删除从 `localStorage` 迁移到后端 API。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/views/NovelManagement.vue` | `getItem('novels')` 加载列表，`setItem('novels')` 保存/更新/删除 | 改用 `GET/POST/PUT/DELETE /api/novels` |
| `src/views/HomePage.vue` | `getItem('novels')` 读统计 | 改用 `GET /api/novels` |
| `src/views/Writer.vue` | `getItem('novels')` / `setItem('novels')` 读写小说数据 | 改用 `GET /api/novels/:id` 获取完整数据（含章节/人物/世界观/事件），`PUT /api/novels/:id` 更新 |
| `src/views/Settings.vue` | 导入/导出/删除 `novels` | 改用 `GET /api/novels` 导出，`POST /api/novels` 导入，`DELETE /api/novels/:id` 删除 |
| `src/views/ToolsLibrary.vue` | `getItem('novels')` 读取小说用于工具 | 改用 `GET /api/novels` |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/novels` | 获取当前用户所有小说列表（含章节计数） |
| POST | `/api/novels` | 创建小说 |
| GET | `/api/novels/:novelId` | 获取单个小说完整数据（含章节/人物/世界观/事件） |
| PUT | `/api/novels/:novelId` | 更新小说 |
| DELETE | `/api/novels/:novelId` | 删除小说 |

**改造要点：**
- NovelManagement.vue 中 `loadNovels()` 改为调 `GET /api/novels`
- 创建小说 `saveNovel()` 改为调 `POST /api/novels`
- 编辑小说改为调 `PUT /api/novels/:id`
- 删除小说改为调 `DELETE /api/novels/:id`
- Writer.vue 进入写作页时调 `GET /api/novels/:id` 获取完整数据
- 写作过程中的自动保存改为定时或关键操作点调 `PUT /api/novels/:id`

---

### 3. 章节 CRUD

**目标：** 章节数据从 `novels` 对象中剥离，使用独立 API。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/views/ChapterManagement.vue` | 操作 `novels` 对象中的 `chapters` 数组 | 改用 `/api/novels/:id/chapters` CRUD |
| `src/components/ChapterManager.vue` | `getItem/setItem('novel_chapters')` | 改用 `/api/novels/:id/chapters` CRUD |
| `src/views/Writer.vue` | 操作 novels 对象中的章节 | 改为调用章节 API |
| `src/components/BackupManager.vue` | `getItem('novel_chapters')` 导出 | 改为调 `GET /api/novels/:id`（已含章节） |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/novels/:novelId/chapters` | 创建章节 |
| PUT | `/api/novels/chapters/:chapterId` | 更新章节 |
| DELETE | `/api/novels/chapters/:chapterId` | 删除章节 |

**改造要点：**
- 章节列表改为从 `GET /api/novels/:id` 的 `chapters` 字段获取（后端已实现 include）
- 新增/编辑/删除章节分别调用对应 API
- 章节内容自动保存改为 Debounce 触发 `PUT /api/novels/chapters/:id`

---

### 4. 人物 CRUD

**目标：** 人物数据独立管理，不再嵌套在 novels 内。

**涉及文件：**
- `src/components/writer/WriterCharacterPanel.vue`
- `src/views/Writer.vue`（人物相关操作）

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/novels/:novelId/characters` | 创建人物 |
| PUT | `/api/novels/characters/:characterId` | 更新人物 |
| DELETE | `/api/novels/characters/:characterId` | 删除人物 |

**改造要点：**
- 人物列表从 `GET /api/novels/:id` 的 `characters` 字段获取
- 人物新增/编辑/删除调用对应 API

---

### 5. 世界观 CRUD

**目标：** 世界观数据独立管理。

**涉及文件：**
- `src/components/writer/WriterWorldviewPanel.vue`
- `src/views/Writer.vue`（世界观相关操作）

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/novels/:novelId/world-settings` | 创建世界观设定 |
| PUT | `/api/novels/world-settings/:settingId` | 更新世界观设定 |
| DELETE | `/api/novels/world-settings/:settingId` | 删除世界观设定 |

**改造要点：**
- 世界观列表从 `GET /api/novels/:id` 的 `worldSettings` 字段获取
- 世界观新增/编辑/删除调用对应 API

---

### 6. 事件 CRUD

**目标：** 事件时间线数据独立管理。

**涉及文件：**
- `src/components/writer/WriterEventPanel.vue`

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/novels/:novelId/events` | 创建事件 |
| PUT | `/api/novels/events/:eventId` | 更新事件 |
| DELETE | `/api/novels/events/:eventId` | 删除事件 |

**改造要点：**
- 事件列表从 `GET /api/novels/:id` 的 `storyEvents` 字段获取
- 事件新增/编辑/删除调用对应 API

---

### 7. 提示词库 CRUD

**目标：** 提示词模板从 `localStorage` 迁移到后端。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/views/PromptsLibrary.vue` | `getItem/setItem('prompts')` | 改用 `GET/POST /api/workspace/prompts` |
| `src/views/Writer.vue` | `getItem/setItem('prompts')` | 改用 `GET /api/workspace/prompts` |
| `src/views/ShortStory.vue` | `getItem/setItem('prompts')` | 改用 `GET /api/workspace/prompts` |
| `src/views/BookAnalysis.vue` | `getItem('prompts')` | 改用 `GET /api/workspace/prompts` |
| `src/views/ToolsLibrary.vue` | `getItem('prompts')` | 改用 `GET /api/workspace/prompts` |

**后端接口（当前缺少 PUT/DELETE，需补充）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/prompts` | 获取当前用户的提示词列表 |
| POST | `/api/workspace/prompts` | 创建提示词 |
| PUT | `/api/workspace/prompts/:id` | 更新提示词（**需新增**） |
| DELETE | `/api/workspace/prompts/:id` | 删除提示词（**需新增**） |

**改造要点：**
- PromptsLibrary.vue 为提示词管理核心页面，需完整对接 CRUD
- 其他页面只读取提示词列表，改为调 `GET /api/workspace/prompts`
- 后端需补充 `PUT` 和 `DELETE` 路由

---

### 8. 写作目标 CRUD

**目标：** 写作目标从 `localStorage` 迁移到后端。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/components/WritingGoals.vue` | `getItem/setItem('writingGoals')` | 改用 `/api/workspace/goals` CRUD |
| `src/views/WritingGoals.vue` | `getItem/setItem('writingGoals')` | 改用 `/api/workspace/goals` CRUD |
| `src/views/HomePage.vue` | `getItem('writingGoals')` | 改用 `GET /api/workspace/goals` |

**后端接口（当前缺少 PUT/DELETE，需补充）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/goals` | 获取用户写作目标列表 |
| POST | `/api/workspace/goals` | 创建写作目标 |
| PUT | `/api/workspace/goals/:id` | 更新写作目标（**需新增**） |
| DELETE | `/api/workspace/goals/:id` | 删除写作目标（**需新增**） |

**改造要点：**
- WritingGoals.vue 组件和页面都操作同一份数据，需统一走 API
- 写作进度更新（currentWords）改为调 `PUT /api/workspace/goals/:id`
- 后端需补充 `PUT` 和 `DELETE` 路由

---

### 9. 小说类型 CRUD

**目标：** 小说类型从 `localStorage` 迁移到后端。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/views/GenreManagement.vue` | `getItem/setItem('novelGenres')` | 改用 `/api/workspace/genres` CRUD |
| `src/views/NovelManagement.vue` | `getItem/setItem('novelGenres')` | 改用 `GET /api/workspace/genres` |
| `src/views/Settings.vue` | `getItem('novelGenres')` 导入/导出 | 改用 `GET /api/workspace/genres` |

**后端接口（当前缺少 PUT/DELETE，需补充）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/genres` | 获取用户小说类型列表 |
| POST | `/api/workspace/genres` | 创建小说类型 |
| PUT | `/api/workspace/genres/:id` | 更新小说类型（**需新增**） |
| DELETE | `/api/workspace/genres/:id` | 删除小说类型（**需新增**） |

**改造要点：**
- GenreManagement.vue 为类型管理核心页面，需完整对接 CRUD
- NovelManagement.vue 创建小说时读取类型列表用于下拉选择
- 后端需补充 `PUT` 和 `DELETE` 路由

---

### 10. API 配置

**目标：** AI API 配置从 `localStorage` 迁移到后端存储，前端不再直接持有 API Key。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/components/ApiConfig.vue` | 管理 `officialApiConfig`、`customApiConfig`、`customModels`、`apiConfigType` | 改用 `/api/workspace/providers` CRUD |
| `src/views/ApiConfig.vue` | 管理 `aiApiConfigs` | 改用 `/api/workspace/providers` CRUD |
| `src/views/Dashboard.vue` | 读取各类 API 配置 | 改用 `GET /api/workspace/providers` |
| `src/services/api.js` | 从 localStorage 读 Key 直调外部 API | 改为从后端获取配置，调用后端代理 |
| `src/stores/novel.js` | 初始化时读 API 配置 | 改为从后端加载 |

**后端接口（当前缺少 PUT/DELETE，需补充）：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/providers` | 获取用户 AI 提供商配置列表 |
| POST | `/api/workspace/providers` | 创建 AI 提供商配置 |
| PUT | `/api/workspace/providers/:id` | 更新 AI 提供商配置（**需新增**） |
| DELETE | `/api/workspace/providers/:id` | 删除 AI 提供商配置（**需新增**） |

**改造要点：**
- ApiConfig.vue 组件是配置入口，需完整对接 CRUD
- API Key 不再存储在浏览器，安全性提升
- 后端存储 `apiKey` 字段，前端只展示脱敏后的 Key（如 `sk-****xxxx`）
- Dashboard.vue 中读取配置用于模型选择，改为调 `GET /api/workspace/providers`

---

### 11. AI 调用代理

**目标：** 前端 AI 请求统一经过后端代理，后端负责配额校验和使用记录。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/services/api.js` | 直接调外部 AI API | 改为调 `POST /api/ai/chat/completions` |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat/completions` | AI 代理接口，支持 SSE 流式和非流式 |

**改造要点：**
- `APIService` 所有生成方法（`generateText`、`generateTextStream`、`generateChapterContent` 等）改为调后端代理
- 保留原有的 Prompt 拼接逻辑，将拼接后的 messages 传给后端
- SSE 流式响应需保持现有体验，后端已支持 `stream: true`
- 请求体增加 `operationType`、`novelId`、`chapterId` 用于后端记录
- 移除前端直接持有 API Key 的逻辑

---

### 12. 计费系统

**目标：** 计费从 localStorage 模拟改为基于后端订阅配额和 Token 使用记录。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/services/billing.js` | 本地模拟余额、记录、统计 | 改为调后端接口获取真实数据 |
| `src/views/TokenBilling.vue` | 展示计费信息 | 改为展示后端 Token 使用记录和订阅配额 |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/token-usage` | 获取用户 Token 使用记录（最近 100 条） |
| GET | `/api/subscriptions/me` | 获取用户当前订阅和配额信息 |
| GET | `/api/subscriptions/plans` | 获取所有订阅套餐 |

**改造要点：**
- `BillingService` 不再维护本地余额，改为查询后端订阅配额
- Token 使用记录从 `GET /api/workspace/token-usage` 获取
- 剩余配额通过订阅的 `tokenQuotaMonthly - usedTokens` 计算
- 前端 `billing.js` 可大幅简化，仅保留展示逻辑

---

### 13. 用户设置 & 数据导入导出

**目标：** 系统设置、数据备份从 localStorage 迁移到后端。

**涉及文件：**

| 文件 | 当前操作 | 改造内容 |
|------|---------|---------|
| `src/views/Settings.vue` | 导入/导出/清除 localStorage 所有数据 | 导出改为调各 GET 接口汇总数据，导入改为调各 POST 接口写入 |
| `src/components/BackupManager.vue` | `auto_backup_settings`、`backup_list` | 自动备份设置改为存后端 `/api/workspace/settings` |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workspace/settings` | 获取用户设置 |
| PUT | `/api/workspace/settings` | 更新用户设置（upsert） |

**改造要点：**
- 导出功能改为并行请求所有 GET 接口，组装 JSON 下载
- 导入功能改为解析 JSON 后逐模块调用 POST/PUT 接口
- 自动备份设置存入 `UserSetting.data` JSON 字段
- 不再需要 `localStorage.clear()` 等批量清除操作

---

### 14. 认证系统

**目标：** 添加登录/注册页面，所有 API 请求携带 JWT token。

**涉及文件（新建/修改）：**

| 文件 | 操作 |
|------|------|
| 新建 `src/views/Login.vue` | 登录/注册页面 |
| 新建 `src/stores/auth.js` | Pinia store 管理 token 和用户信息 |
| 修改 `src/router/index.js` | 添加登录路由，添加导航守卫（未登录跳转登录页） |
| 修改 `src/services/http.js` | token 存取和自动刷新 |

**后端接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/refresh` | 刷新 token |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 获取当前用户信息 |

**改造要点：**
- accessToken 存储在内存（Pinia store），refreshToken 可存 localStorage（仅用于刷新）
- 导航守卫 `router.beforeEach` 检查 token 是否存在，无 token 跳转登录页
- 登录/注册成功后自动跳转到之前访问的页面
- 后端当前注册接口自动创建免费试用订阅，登录时检查订阅状态

---

## 后端需补充的接口

以下接口当前缺失，需要在对接前补充：

| 模块 | 需补充的接口 |
|------|------------|
| 提示词库 | `PUT /api/workspace/prompts/:id`、`DELETE /api/workspace/prompts/:id` |
| 写作目标 | `PUT /api/workspace/goals/:id`、`DELETE /api/workspace/goals/:id` |
| 小说类型 | `PUT /api/workspace/genres/:id`、`DELETE /api/workspace/genres/:id` |
| API 配置 | `PUT /api/workspace/providers/:id`、`DELETE /api/workspace/providers/:id` |

---

## 建议执行顺序

按依赖关系和影响范围，建议按以下顺序推进：

1. **第 1 步：HTTP 基础设施** — 所有后续步骤的依赖
2. **第 2 步：认证系统** — 用户登录后才能调用 API
3. **第 3 步：补充后端缺失接口** — 确保前端可用的 API 完整
4. **第 4 步：小说 CRUD** — 核心数据，影响面最大
5. **第 5 步：章节 CRUD** — 依赖小说
6. **第 6 步：人物 CRUD** — 依赖小说
7. **第 7 步：世界观 CRUD** — 依赖小说
8. **第 8 步：事件 CRUD** — 依赖小说
9. **第 9 步：提示词库 CRUD** — 独立模块
10. **第 10 步：写作目标 CRUD** — 独立模块
11. **第 11 步：小说类型 CRUD** — 独立模块
12. **第 12 步：API 配置** — 依赖后端 AI 代理
13. **第 13 步：AI 调用代理** — 核心功能，需充分测试
14. **第 14 步：计费系统** — 依赖 AI 代理和 Token 记录
15. **第 15 步：用户设置 & 导入导出** — 收尾

---

## 对接进度

| 步骤 | 状态 | 开始时间 | 完成时间 | 备注 |
|------|------|---------|---------|------|
| HTTP 基础设施 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | `src/services/http.js` 已创建 |
| 认证系统 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | Login.vue、auth store、路由守卫已添加 |
| 补充后端缺失接口 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | prompts/goals/genres/providers 的 PUT/DELETE 共 8 个接口 |
| 小说 CRUD | ✅ 已完成 | 2026-05-13 | 2026-05-13 | NovelManagement.vue 核心 CRUD 已对接 |
| 章节 CRUD | ✅ 已完成 | 2026-05-13 | 2026-05-13 | ChapterManagement.vue 核心 CRUD 已对接 |
| 人物/世界观/事件 CRUD | ✅ API 就绪 | 2026-05-13 | 2026-05-13 | `novelApi.js` 已封装，Writer.vue 待对接 |
| 提示词库 CRUD | ✅ 已完成 | 2026-05-13 | 2026-05-13 | PromptsLibrary.vue 等已对接 |
| 写作目标 CRUD | ✅ 已完成 | 2026-05-13 | 2026-05-13 | WritingGoals.vue 等已对接 |
| 小说类型 CRUD | ✅ 已完成 | 2026-05-13 | 2026-05-13 | GenreManagement.vue 已对接 |
| API 配置 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | 页面已对接 providers CRUD，AI 调用改为后端代理 |
| AI 调用代理 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | api.js 已改为通过后端 `/api/ai/chat/completions` 代理 |
| 计费系统 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | billing.js + TokenBilling.vue 已对接 listTokenUsage |
| 用户设置 & 导入导出 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | Settings.vue 导出对接后端 API，BackupManager 已更新 |
| storageCompat 批量迁移 | ✅ 已完成 | 2026-05-13 | 2026-05-13 | 17 个文件已批量替换为 storageCompat 导入 |

---

> 最后更新：2026-05-13
