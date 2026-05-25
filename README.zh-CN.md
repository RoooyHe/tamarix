# Tamarix

基于 Matrix 的任务管理系统 -- **一个任务 = 一个 Matrix Room**。

## 核心概念

Tamarix 将 Matrix 的 Room/Space 模型映射到任务管理领域概念：

| Matrix 概念 | Tamarix 概念 |
|---|---|
| Space | 项目 |
| Room | 任务 |
| State Event (`com.tamarix.*`) | 任务属性（状态/优先级/标签等） |
| Timeline Message | 任务评论 |
| Power Levels | 权限控制 |

这意味着 Tamarix 原生提供：
- **实时协作** — 基于 Matrix 同步协议
- **联邦通信** — 跨服务器任务协作
- **端到端加密** — 任务内容隐私保护
- **开放协议** — 任何 Matrix 客户端都可参与

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | SvelteKit + Svelte 5 (Runes) |
| 语言 | TypeScript |
| UI 组件 | [shadcn-svelte](https://www.shadcn-svelte.com/) (zinc base) |
| 样式 | Tailwind CSS v4 |
| 图标 | @lucide/svelte |
| Matrix SDK | matrix-js-sdk |
| 包管理器 | Bun |
| 状态管理 | Svelte 5 Runes (`$state` / `$derived`) |

## 自定义 Matrix State Events

所有任务元数据通过 `com.tamarix.*` 命名空间下的自定义 State Events 存储：

| Event Type | 用途 |
|---|---|
| `com.tamarix.task_status` | 任务状态（todo / in_progress / review / done / closed） |
| `com.tamarix.priority` | 优先级（critical / high / medium / low） |
| `com.tamarix.task_type` | 任务类型（bug / feature / task / improvement / epic） |
| `com.tamarix.due_date` | 截止日期 |
| `com.tamarix.estimate` | 时间估算 / Story points |
| `com.tamarix.tags` | 标签 |
| `com.tamarix.ticket_id` | 编号（如 TAM-42） |
| `com.tamarix.assignee` | 指派人 |
| `com.tamarix.relation` | 任务关联（blocks / duplicates / subtask_of） |
| `com.tamarix.task_archived` | 归档标记 |

## 开发

```sh
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 类型检查
bun run check

# 生产构建
bun run build
bun run preview
```

## 项目进度

| 阶段 | 状态 | 核心交付 |
|---|---|---|
| P0 — MVP | 已完成 | 登录 / 项目列表 / 任务 CRUD / 任务详情 / 评论 |
| P1 — 看板视图 | 已完成 | 看板拖拽 / Command Palette / 过滤排序 / Data Table / 归档 / 文件上传 / 主题切换 |
| P2 — 智能化 | 前端兜底层已完成 | i18n / 编号生成 / 工作流校验 / 搜索 / 变更历史 / 任务关联 |
| P3 — 企业级 | 计划中 | Chart 报表 / 提醒 Bot / Git Bridge / 自定义字段 |

## 许可证

[MIT](./LICENSE)
