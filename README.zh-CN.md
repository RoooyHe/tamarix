# Tamarix

基于 Matrix 的任务管理系统 -- **一个任务 = 一个 Matrix Room**。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-orange?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00?style=flat-square&logo=svelte&logoColor=white)](https://svelte-5-preview.vercel.app)
[![Matrix](https://img.shields.io/badge/Matrix-Protocol-000000?style=flat-square&logo=matrix&logoColor=white)](https://matrix.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-runtime-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh)
[![AtomGitStars](https://atomgit.com/qiusls/tamarix/star/badge.svg)](https://atomgit.com/qiusls/firmiana)

[English](./README.md) | [中文](./README.zh-CN.md)

---

Tamarix 将 Matrix 的去中心化 Room/Space 模型映射到任务管理领域。每个任务是一个 Matrix Room，每个项目是一个 Matrix Space。数据存储在 Matrix 联邦网络上 -- 无需私有后端 -- 天然支持实时协作、跨服务器联邦和端到端加密。

## 功能特性

- **实时协作** -- 基于 Matrix 同步协议，每次变更即时推送
- **联邦通信** -- 不同 Homeserver 上的用户可协作处理同一任务
- **端到端加密** -- 任务内容通过 Matrix E2EE (Olm/Megolm) 保护
- **开放协议** -- 任何 Matrix 客户端都可参与，无供应商锁定
- **国际化** -- 内置多语言支持 (i18n)
- **工作流校验** -- 可自定义的任务状态流转规则，由 Matrix 权限强制执行
- **看板视图** -- 拖拽排序、列内排序、批量操作
- **报表图表** -- 燃尽图、趋势图、状态分布、版本进度
- **审批流** -- 基于 Matrix 反应的审批机制
- **自定义字段** -- 项目级自定义字段定义与渲染
- **Git 集成** -- 提交关联、分支链接
- **注册与第三方集成** -- Matrix 注册、SSO、GitHub/GitLab/Webhook 集成

## 核心概念

```
  Matrix Space   <----->   Tamarix 项目
  Matrix Room    <----->   Tamarix 任务
  State Event    <----->   任务属性（状态 / 优先级 / 标签 ...）
  Timeline Msg   <----->   任务评论
  Power Levels   <----->   权限控制
```

<details>
<summary><strong>自定义 State Events</strong> -- <code>com.tamarix.*</code> 命名空间</summary>

| Event Type                        | 用途                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `com.tamarix.task_status`         | 任务状态（todo / in_progress / review / done / closed） |
| `com.tamarix.priority`            | 优先级（critical / high / medium / low）                |
| `com.tamarix.task_type`           | 任务类型（bug / feature / task / improvement / epic）   |
| `com.tamarix.due_date`            | 截止日期                                                |
| `com.tamarix.estimate`            | 时间估算 / Story points                                 |
| `com.tamarix.tags`                | 标签                                                    |
| `com.tamarix.ticket_id`           | 编号（如 TAM-42）                                       |
| `com.tamarix.assignee`            | 指派人                                                  |
| `com.tamarix.relation`            | 任务关联（blocks / duplicates / subtask_of）            |
| `com.tamarix.task_archived`       | 归档标记                                                |
| `com.tamarix.description`         | 富文本描述（Markdown）                                  |
| `com.tamarix.worklog`             | 工时记录                                                |
| `com.tamarix.version`             | 项目版本定义                                            |
| `com.tamarix.task_version`        | 任务-版本关联                                           |
| `com.tamarix.watcher`             | 任务关注者                                              |
| `com.tamarix.notification_prefs`  | 通知偏好设置                                            |
| `com.tamarix.sprint_meta`         | 迭代元数据                                              |
| `com.tamarix.template`            | 任务模板                                                |
| `com.tamarix.custom_field_defs`   | 自定义字段定义                                          |
| `com.tamarix.custom_field_values` | 自定义字段值                                            |
| `com.tamarix.approval`            | 审批状态                                                |
| `com.tamarix.sort_order`          | 手动排序                                                |
| `com.tamarix.external_links`      | 外部链接                                                |
| `com.tamarix.git_config`          | Git 集成配置                                            |
| `com.tamarix.integration`         | 第三方集成配置                                          |

</details>

## 技术栈

| 层         | 技术                                                        |
| ---------- | ----------------------------------------------------------- |
| 框架       | SvelteKit + Svelte 5 (Runes)                                |
| 语言       | TypeScript (strict)                                         |
| UI 组件    | [shadcn-svelte](https://www.shadcn-svelte.com/) (zinc base) |
| 样式       | Tailwind CSS v4 + tailwind-variants                         |
| 图标       | @lucide/svelte                                              |
| Matrix SDK | matrix-js-sdk                                               |
| 包管理器   | Bun                                                         |
| 状态管理   | Svelte 5 Runes (`$state` / `$derived` / `$effect`)          |

## 项目结构

```
src/
  lib/
    components/
      ui/           # shadcn-svelte 组件（自动生成）
      task/         # 任务相关组件（TaskCard, TaskStatusSelect, TaskCreateDialog 等）
      board/        # 看板组件（KanbanBoard, KanbanColumn）
      project/      # 项目组件（ProjectHeader, FilterToolbar, MemberManager）
      dashboard/    # 仪表盘图表（BurndownChart, TrendChart 等）
      common/       # 通用组件（MatrixAvatar, TaskIdBadge）
      layout/       # 布局组件（AppSidebar, AppHeader）
    stores/         # Svelte 5 Runes 状态管理（auth, tasks, projects, ui 等）
    matrix/         # Matrix SDK 集成
      client.ts         # Matrix 客户端单例
      client-manager.ts # 客户端生命周期（登录/恢复/登出）
      sync-manager.ts   # 同步事件监听管理
      task-repository.ts# 任务数据层（CRUD + 乐观更新）
      state-events.ts   # State Event 读写
      room-utils.ts     # 房间分类工具
      auth.ts           # 认证（发现/SSO/注册）
      search.ts         # 结构化搜索
      types.ts          # TypeScript 类型定义
      workflow.ts       # 状态流转规则
      ticket-id.ts      # 编号生成
      notifications.ts  # 通知解析
      file-service.ts   # 文件上传/下载
      account.ts        # 账号管理
      errors.ts         # 错误类型
      uia.ts            # UIA 认证流程
    hooks/          # 可组合 Hooks
      useTaskFilters.svelte.ts   # 任务过滤/排序/搜索
      useTaskPagination.svelte.ts# 分页
      useTaskSelection.svelte.ts # 多选
      is-mobile.svelte.ts        # 移动端检测
    reports.ts      # 报表纯计算逻辑
    i18n/           # 国际化
  routes/             # SvelteKit 文件路由
    login/            # Matrix 登录
    register/         # Matrix 注册
    dashboard/        # 仪表盘
    project/[id]/     # 项目视图
      task/[taskId]/  # 任务详情
      settings/       # 项目设置
      reports/        # 项目报表
      versions/       # 版本管理
    search/           # 全文搜索
    settings/         # 应用设置
```

## 开发

```sh
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 类型检查
bun run check

# 生产构建
bun run build && bun run preview
```

## 项目进度

| 阶段               | 状态   | 核心交付                                                                        |
| ------------------ | ------ | ------------------------------------------------------------------------------- |
| P0 -- MVP          | 已完成 | 登录 / 项目列表 / 任务 CRUD / 任务详情 / 评论                                   |
| P1 -- 看板视图     | 已完成 | 看板拖拽 / Command Palette / 过滤排序 / Data Table / 归档 / 文件上传 / 主题切换 |
| P2 -- 智能化       | 已完成 | i18n / 编号生成 / 工作流校验 / 搜索 / 变更历史 / 任务关联 / E2EE 基础设施       |
| P3 -- 企业级       | 已完成 | 图表报表 / 提醒 Bot / Git Bridge / 自定义字段                                   |
| P4 -- 高级功能     | 已完成 | 报表图表 / 自定义字段 / 审批流 / 排序 / 快捷键 / 外部链接 / 任务模板 / 导入导出 |
| P5 -- 性能优化     | 已完成 | 数据加载优化 / 前端缓存 / 派生计算 / 列表渲染 / 搜索 / 报表                     |
| P6 -- 注册与第三方 | 已完成 | Matrix 注册 / SSO / 邮箱手机绑定 / GitHub/GitLab/Webhook 集成                   |

## 许可证

[MIT](./LICENSE)
