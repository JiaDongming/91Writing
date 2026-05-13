# AGENTS.md

本文件用于指导后续在本项目中的 AI 编程协作，适用于功能设计、代码实现、重构、调试与评审。

## 1. 总体原则

- 后续所有新增功能、重要改造、架构调整，默认先使用 `using-superpowers`。
- 在存在可用 skill 的情况下，必须优先使用 skill，而不是跳过流程直接实现。
- 先遵守本文件，再遵守对应 skill 的细则；如果用户有明确指令，以用户指令为最高优先级。
- 以“可维护、可验证、可扩展”为优先，不接受只求跑通但难以演进的实现。

## 2. 功能开发流程

- 新功能开发默认流程：

  1. 先使用 `using-superpowers`
  2. 根据任务类型选择合适 skill
  3. 先完成设计或计划，再进入实现
  4. 实现后必须进行验证

- 对于中等及以上复杂度的功能，优先考虑以下流程：
  - 需求或方案不清晰时：使用 `brainstorming`
  - 多步骤任务开始前：使用 `writing-plans`
  - 需要并行拆分任务时：使用 `subagent-driven-development`
  - 功能实现时：优先使用 `test-driven-development`
  - 遇到 bug、测试失败、行为异常时：优先使用 `systematic-debugging`
  - 准备宣称完成时：使用 `verification-before-completion`

## 3. 稳定性要求

- 后续功能开发要在适当情况下使用 TDD 或 SDD，确保功能稳定。
- TDD 对应 skill：`test-driven-development`
  - 适用于新增接口、核心业务逻辑、容易回归的行为修改。
  - 优先先写测试或先明确验证方式，再写实现。
- SDD 对应 skill：`subagent-driven-development`
  - 适用于需求较大、任务可拆分、前后端或多模块并行推进的改造。
  - 通过任务拆解和独立子任务推进，降低复杂改造带来的不稳定性。
- 若是排查故障，不用 SDD 代替调试，应使用 `systematic-debugging`。

## 4. 前端开发要求

- 本项目是 Vue 前端项目，前端任务必须优先使用以下 skills：

  - `vue-best-practices`
  - `element-plus-vue3`

- 前端实现约定：
  - 默认使用 Vue 3 Composition API
  - 优先使用 `<script setup>`
  - 新增前端逻辑尽量使用 TypeScript 思维组织，即使当前部分页面仍是 JavaScript，也要保持类型意识
  - UI 组件优先复用 Element Plus，不重复造轮子
  - 表单、弹窗、表格、分页、消息提示等优先采用 Element Plus 标准模式
  - 代码风格、状态组织、路由组织优先遵循 `vue-best-practices`

## 5. 后端开发要求

- 后续后端任务必须优先参考以下 skills：

  - `nestjs-best-practices`
  - `postgresql-table-design`
  - `prisma-postgres`

- 即使当前后端实现不是 NestJS，也要尽量遵循 NestJS 风格的模块化思想：

  - 按领域拆分模块、服务、路由/控制器、DTO、鉴权、配置
  - 避免把业务逻辑堆在单个文件中
  - 配置、鉴权、订阅、AI 调用、计费、小说业务应尽量分层

- 数据库与 ORM 约定：
  - 默认数据库为 PostgreSQL
  - 默认 ORM 为 Prisma
  - 表结构设计、索引、约束、唯一键、外键、审计字段优先遵循 `postgresql-table-design`
  - PostgreSQL 环境、连接、迁移、管理、云环境相关优先遵循 `prisma-postgres`

## 6. AI 集成要求

- 后续 AI 能力对接默认使用官方 OpenAI Node SDK：

  - `https://github.com/openai/openai-node`

- AI 相关实现要求：
  - 前端不要直接暴露服务端密钥
  - 模型调用尽量经由后端代理
  - 重要调用应记录请求上下文、模型、Token 使用量、业务操作类型
  - 对流式输出、失败重试、配额校验、订阅校验要有明确设计

## 7. 变更与验证要求

- 任何涉及核心业务的修改，完成后都要至少做以下其中之一：

  - 运行测试
  - 运行构建
  - 做最小可复现验证
  - 检查诊断或 lint 错误

- 不允许在未验证的情况下直接宣称“已完成”或“已修复”。

## 8. 文档与实现一致性

- 如果后续实现与当前文档约定发生冲突，应同步更新本文件。
- 如果引入了新的关键工作流或 skill，也应补充到本文件中。
