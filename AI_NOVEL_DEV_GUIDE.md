# 灵溪写作 (AI-Novel-Generator) 改造开发指南

## 1. 项目说明

灵溪写作是一个基于 Vue 3 + Element Plus 的专业 AI 小说创作平台。
**核心特点：**

- **纯前端架构**：项目没有后端服务，所有的文章、大纲、人物设定等数据均保存在浏览器的本地存储（LocalStorage）中，保障用户隐私与数据安全。
- **兼容多种大模型**：通过标准化的 OpenAI API 格式，可以无缝接入 GPT、Claude、Gemini、DeepSeek、通义千问等主流大模型。
- **全流程写作工具**：集成了从大纲生成、世界观构建、人物设定到正文生成、润色的完整写作链路。
- **富文本编辑**：采用 WangEditor 提供专业的写作编辑环境。

## 2. 如何开发与调试

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0 或 pnpm >= 7.0.0 (推荐使用 pnpm)

### 本地运行

1. **安装依赖**：
   在项目根目录下运行终端命令：
   ```bash
   pnpm install
   ```
2. **启动开发服务器**：
   ```bash
   pnpm dev
   ```
   启动后，浏览器访问终端中输出的地址 (通常是 `http://localhost:5173`)。
3. **打包生产环境**：
   ```bash
   pnpm build
   ```

## 3. 在哪里配置 Key (API 密钥)

由于项目是纯前端应用，API 密钥的管理和调用完全在客户端进行：

- **UI 界面配置**：启动项目后，点击右上角的「API配置」，可以直接在可视化界面上填写 API 地址（BaseURL）、模型名称和 API Key。
- **代码默认配置**：默认的基础配置文件位于 [api.json](file:///Users/Zhuanz/mycode/ai-coding/91Writing/src/config/api.json)。
- **运行时的状态管理与持久化**：
  - 核心 API 逻辑在 [api.js](file:///Users/Zhuanz/mycode/ai-coding/91Writing/src/services/api.js) 中。
  - 项目启动时会尝试从 `localStorage` (`apiConfigType`, `officialApiConfig`, `customApiConfig`) 中读取你的配置，这会覆盖代码中的默认配置。
  - **改造建议**：如果你后续要硬编码你自己的专属 Key 且不想每次都在界面上配置，可以直接修改 `src/services/api.js` 的 `constructor` 方法或在根目录配置 `.env` 环境变量，并将 UI 层的配置项隐藏。

## 4. 整体架构图

以下是该项目的核心架构与数据流转图：

```mermaid
graph TD
    subgraph 表现层 / 视图组件 (Views & Components)
        Home[首页 Dashboard]
        Writer[写作台 Writer.vue]
        Settings[设置 & API配置]
        Tools[大纲/人物/世界观面板]
    end

    subgraph 状态管理层 (Pinia Stores)
        NovelStore[novel.js - 管理小说元数据与章节状态]
    end

    subgraph 服务层 (Services)
        APIService[api.js - AI请求核心类]
        BillingService[billing.js - Token计费与估算]
    end

    subgraph 本地存储 (Local Storage)
        LocalData[(浏览器 LocalStorage <br>小说内容 / 配置文件 / API Key)]
    end

    subgraph 外部 AI 模型 (External AI APIs)
        OpenAI[OpenAI API]
        DeepSeek[DeepSeek API]
        Claude[Claude API]
    end

    %% 数据流转关系
    Writer <--> NovelStore
    Tools <--> NovelStore
    Settings --> APIService

    NovelStore <--> LocalData
    APIService <--> LocalData
    BillingService <--> LocalData

    Writer --> APIService
    Tools --> APIService

    APIService -->|POST /chat/completions| OpenAI
    APIService -->|POST /chat/completions| DeepSeek
    APIService -->|POST /chat/completions| Claude
```

## 5. 后续专属化改造建议 (打造你的专属 AI 小说工具)

1. **固定 API 密钥与模型**：修改 [api.js](file:///Users/Zhuanz/mycode/ai-coding/91Writing/src/services/api.js) 将你的 API 密钥硬编码（或走环境变量注入），并隐藏前台的 API 配置页面，防止不小心改动。
2. **定制化专属 Prompt**：打开 [api.js](file:///Users/Zhuanz/mycode/ai-coding/91Writing/src/services/api.js) ，找到 `generateChapterContent`、`generateOutline` 等方法，在里面的 Prompt 模板中注入你专属的小说风格、行文规矩或禁忌词要求。
3. **数据云端化备份**：目前数据全在 LocalStorage 中，清理浏览器缓存会导致数据丢失。建议后续增加一键导出到本地文件，或者接入一个轻量级的后端（如 Supabase 或 Firebase）进行云端同步。
