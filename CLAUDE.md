# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

灵溪写作 是一个 AI 小说创作平台。前端是 Vue 3 + Element Plus SPA，SaaS 后端（Express + Prisma + PostgreSQL）正在 `dev` 分支上开发中。

**当前状态：** 前端功能完整，所有数据存储在浏览器 `localStorage` 中。后端（JWT 鉴权、AI 代理、小说/章节/人物/世界观/事件的 CRUD）已搭建完成，但尚未与前端对接。整体架构正从纯前端模式向 SaaS 模式演进。

## 快速开始

```bash
# 1. 配置环境变量
cp server/.env.example server/.env
# 编辑 server/.env：填写 DATABASE_URL、OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL

# 2. 一键初始化数据库（生成 client + 建表 + 种子数据）
pnpm db:setup

# 3. 启动后端（端口 4000，tsx watch 热重载）
pnpm server:dev

# 4. 启动前后端（同在终端启动）
pnpm dev:all
```

## 常用命令

```bash
# 前端
pnpm dev                   # Vite 开发服务器，端口 7520
pnpm dev:all               # 前后端一起启动（server :4000 + app :7520）
pnpm build                 # 生产构建，输出到 dist/
pnpm lint                  # ESLint + Prettier 自动修复

# 后端
pnpm server:dev            # Express 开发模式，tsx watch，端口 4000
pnpm server:build          # TypeScript 编译

# 数据库
pnpm db:setup              # 一键初始化：生成 Prisma client + 建表 + 种子数据
pnpm db:push               # 推送 schema 到数据库（仅建表/更新表结构）
pnpm db:seed               # 写入初始种子数据
pnpm db:studio              # 打开 Prisma Studio 数据库管理界面

# Docker
docker-compose --profile dev up -d       # 开发环境，端口 :3000（热重载）
docker-compose --profile prod up -d      # 生产环境，端口 :80
```

目前没有配置测试框架。

## 架构

### 前端（`/src`）

- **入口：** `src/main.js` → 挂载 Vue 应用，注册 Router 和 Pinia
- **路由：** Hash 模式（`createWebHashHistory`），13 个路由统一挂在 `Dashboard` 布局下（`src/router/index.js`）
- **状态管理：** `src/stores/novel.js`（Pinia）—— 管理小说、章节、人物、世界观等核心数据，同时读写 `localStorage`
- **AI 调用：** `src/services/api.js` —— `APIService` 类负责构造 chat completion 请求、处理 SSE 流式输出、中止请求。目前**直接从浏览器**调用外部 AI API，API Key 从 `localStorage` 读取
- **计费：** `src/services/billing.js` —— `BillingService` 负责 Token 统计、费用计算（元/千 token）、预算管理，数据存 `localStorage`
- **默认配置：** `src/config/api.json` —— AI 服务商的默认配置（Key/URL 为空）
- **页面：** `src/views/` —— 13 个页面组件。根目录的 `Writer.vue` 是早期独立版本，不在路由中
- **组件：** `src/components/` —— 通用组件；`src/components/writer/` —— 写作台专用面板（章节、人物、编辑器、事件、世界观、语料库）

### 后端（`/server`）

技术栈：Express 4 (TypeScript)、Prisma ORM + PostgreSQL、JWT 鉴权（access + refresh token）、Zod 参数校验、OpenAI Node SDK。

```
server/src/
├── server.ts              # Express 应用入口
├── lib/
│   ├── env.ts             # 类型化的环境变量（dotenv）
│   └── prisma.ts          # Prisma client 单例
├── middleware/
│   └── auth.ts            # JWT 鉴权中间件
├── routes/
│   ├── auth.routes.ts     # /api/auth/*
│   ├── ai.routes.ts       # /api/ai/chat/completions（支持 SSE 流式与非流式）
│   ├── novel.routes.ts    # /api/novels CRUD 及嵌套资源
│   ├── subscription.routes.ts
│   └── workspace.routes.ts
├── services/
│   ├── auth.service.ts    # 注册（自动创建免费试用订阅）、登录、JWT 刷新
│   ├── ai.service.ts      # OpenAI 封装，含 Token 配额校验
│   └── subscription.service.ts
└── utils/
    ├── jwt.ts
    ├── password.ts
    └── time.ts
```

后端虽然用的是 Express，但按 NestJS 风格组织代码 —— 按领域拆分 service / route / middleware，业务逻辑不堆在单个文件中。

### 数据库

Prisma schema 位于 `server/prisma/schema.prisma`。共 16 个模型：`User`、`Novel`、`Chapter`、`Character`、`WorldSetting`、`StoryEvent`、`Subscription`、`TokenUsage`、`PromptTemplate`、`GenrePreset`、`WritingGoal` 等。

**关键规则：** 所有业务表必须包含 `user_id` 字段用于多租户隔离，后端每个查询都必须带 `WHERE user_id = 当前登录用户ID`。

### AI 集成策略

最终目标架构（见 `BACKEND_ARCHITECTURE.md`）：浏览器 → 后端（JWT 鉴权 + 配额校验）→ 后端调用 OpenAI → SSE 流式返回浏览器。这样可以避免 API Key 暴露。当前前端仍然直调 AI API —— 这是主要的待重构部分。

## 开发约定

### 开发流程选择

| 场景                                  | 流程                                        | 说明                                                  |
| ------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| 新功能开发                            | **SDD**（Specification-Driven Development） | 使用 `using-superpowers` 技能，先写规格说明再实现     |
| Bug 修复（有一定复杂度 + 涉及前后端） | **TDD**（Test-Driven Development）          | 使用 `using-superpowers` 技能，先写测试复现问题再修复 |
| 简单样式调试 / 纯前端小调整           | 自行分析处理                                | 不涉及后端，可直接修改并验证                          |

### 编码规范

- 前端：Vue 3 Composition API、`<script setup>`、优先复用 Element Plus 组件，即使在 `.js` 文件中也要保持类型意识
- 后端：按 NestJS 风格模块化（按领域拆分 service / route / DTO），使用 Prisma + PostgreSQL
- AI 调用应通过后端代理，不从前端直调
- 实现后必须验证（构建、lint 或手动检查），不允许未经验证就宣称完成

## 环境配置

复制 `server/.env.example` 为 `server/.env` 并填写以下变量：

| 变量              | 说明                                          |
| ----------------- | --------------------------------------------- |
| `DATABASE_URL`    | PostgreSQL 连接串                             |
| `JWT_SECRET`      | JWT 签名密钥（随机字符串）                    |
| `OPENAI_API_KEY`  | AI 服务商 API Key                             |
| `OPENAI_BASE_URL` | AI 接口地址，默认 `https://api.openai.com/v1` |
| `OPENAI_MODEL`    | 模型名称，默认 `gpt-4o-mini`                  |
| `CORS_ORIGIN`     | 前端地址，默认 `http://localhost:7520`        |

> **注意：** `.env.example` 中 `CORS_ORIGIN` 默认值为 `http://localhost:5173`，本项目前端使用 `pnpm dev` 启动时为 **7520** 端口，需修改为 `http://localhost:7520`，否则后端会拒绝前端请求。

## Docker

多阶段 Dockerfile：`development`（Node 18 Alpine + pnpm，端口 3000）、`builder`（pnpm build）、`production`（Nginx 托管 `dist/`，端口 80）。Docker Compose 支持三种 profile：`dev`、`prod`、`external-nginx`。
