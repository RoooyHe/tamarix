# Tamarix 项目计划文档

> 基于 Matrix 协议的任务管理系统 — 一个任务就是一个 Matrix Room

## 项目概览

**Tamarix** 是一个以 Matrix 协议为底座的任务管理系统，目标类似于禅道/Jira，核心设计理念是 **一个任务 = 一个 Matrix Room**。项目当前处于脚手架初始阶段（SvelteKit + Svelte 5 + TypeScript），UI 使用 **shadcn-svelte** 组件库 + Tailwind CSS，视觉风格遵循 DESIGN.md 中定义的 Runway 风格深色编辑式设计系统。

---

## 当前项目状态

| 项目 | 状态 |
|---|---|
| 框架 | SvelteKit（`@sveltejs/kit`）+ Svelte 5（runes 模式） |
| 语言 | TypeScript |
| 包管理 | Bun |
| UI 设计系统 | DESIGN.md 已定义（Runway 风格：深色、无阴影、极简界面） |
| UI 组件库 | ✅ 已安装 — shadcn-svelte (zinc base) |
| Matrix 集成 | ✅ 已完成 — matrix-js-sdk + V3 sync + Space/Room CRUD |
| 业务代码 | ✅ P0 已完成 — 登录/项目/任务CRUD/评论/Sync事件监听 |
| P1 进度 | ✅ P1 已完成（17/17）— 看板拖拽 + Data Table + 归档 + 文件上传/附件 + 主题切换 全部实现 |
| P2 进度 | 🔧 P2 进行中（16/21）— i18n ✅ 完成；前端兜底层 10/10；AS 增强层 0/6 |
| 路由/页面 | 登录页 + Dashboard + 项目任务列表 + 任务详情(含评论) |

---

## UI 技术选型：shadcn-svelte

**选择理由：**

- 与 Svelte 5 + SvelteKit + Tailwind CSS 原生集成
- 组件源码直接复制到项目，完全可控可定制
- 基于 Bits UI 原语，无障碍访问开箱即用
- 丰富的组件库（40+ 组件），涵盖表单、导航、数据展示、反馈等
- 内置 Sidebar、Data Table、Dialog、Avatar、Badge 等任务管理核心组件
- CSS 变量主题系统，可通过覆盖变量适配 DESIGN.md 色板

**安装方式：**

```bash
# 1. 初始化 shadcn-svelte（含 Tailwind CSS 配置）
bun x shadcn-svelte@latest init

# 2. 按需添加组件
bun x shadcn-svelte@latest add button badge dialog input select ...
```

**components.json 配置：**

```json
{
  "$schema": "https://shadcn-svelte.com/schema.json",
  "style": "default",
  "tailwind": {
    "config": "",
    "css": "src/app.css",
    "baseColor": "zinc"
  },
  "aliases": {
    "lib": "$lib",
    "components": "$lib/components",
    "utils": "$lib/utils",
    "hooks": "$lib/hooks",
    "ui": "$lib/components/ui"
  }
}
```

> **baseColor 选择 `zinc`**：zinc 的冷灰色调最接近 DESIGN.md 中的 Cool Slate 色系。

---

## DESIGN.md 色板 → shadcn-svelte CSS 变量映射

shadcn-svelte 使用 `oklch` 色彩空间的 CSS 变量。我们需要覆盖 `.dark` 主题变量以匹配 DESIGN.md 色板：

| DESIGN.md 色彩 | 用途 | shadcn-svelte 变量 | 映射值（oklch 近似） |
|---|---|---|---|
| Runway Black `#000000` | 页面背景 | `--background` | `oklch(0 0 0)` |
| Deep Black `#030303` | 分层暗色面 | `--card` / `--popover` | `oklch(0.015 0 0)` |
| Dark Surface `#1a1a1a` | 卡片/容器 | `--secondary` | `oklch(0.18 0 0)` |
| Pure White `#ffffff` | 主文本（暗底） | `--foreground` | `oklch(1 0 0)` |
| Cool Slate `#767d88` | 次要文本 | `--muted-foreground` | `oklch(0.55 0.015 260)` |
| Border Dark `#27272a` | 边框 | `--border` / `--input` | `oklch(0.25 0 0)` |
| Muted Gray `#a7a7a7` | 时间戳 | `--muted` (background) | `oklch(0.7 0 0)` |
| Cool Silver `#c9ccd1` | 浅边框 | `--ring` | `oklch(0.82 0.005 260)` |
| — | 主操作色 | `--primary` | `oklch(0.7 0.15 260)` — 冷蓝色调 |
| — | 危险/删除 | `--destructive` | `oklch(0.65 0.2 25)` — 红色 |

> `--sidebar-*` 系列变量同样覆盖为 Runway Black / Dark Surface 色系。

---

## shadcn-svelte 组件使用规划

| 任务管理 UI 元素 | shadcn-svelte 组件 | 说明 |
|---|---|---|
| 应用侧边栏（项目导航） | **Sidebar** | 内置可折叠侧边栏，collapsible="icon" |
| 顶部导航栏 | 自建 + **Breadcrumb** | 面包屑显示当前路径 |
| 任务卡片 | 自建 TaskCard + **Badge** + **Avatar** | Badge 显示状态/优先级，Avatar 显示指派人 |
| 状态标签 | **Badge** (variant: default/secondary/outline/destructive) | todo→outline, in_progress→default, done→secondary |
| 优先级标签 | **Badge** + 自定义颜色类 | critical→destructive, high→橙色自定义 |
| 新建任务弹窗 | **Dialog** + **Input** + **Select** + **Textarea** + **Field** | 完整表单弹窗 |
| 任务列表 | **Data Table** (TanStack Table) | 支持排序、过滤、分页、列隐藏 |
| 看板视图 | 自建 KanbanBoard（拖拽） + **Card** | 列用 Card 容器 |
| 任务详情页 | **Tabs** + **Separator** + **Avatar** + **Badge** | Tab 切换：详情/评论/历史/关联 |
| 日期选择 | **Date Picker** (Calendar + Popover) | 截止日期设置 |
| 指派人选择 | **Combobox** (Command + Popover) | 搜索并选择成员 |
| 过滤器 | **Select** / **Checkbox** / **Popover** | 多维度过滤 |
| 搜索 | **Command** (Command Palette) | 全局搜索快捷键 ⌘K |
| 通知/提示 | **Toast** / **Sonner** | 操作反馈 |
| 确认删除 | **AlertDialog** | 危险操作确认 |
| 加载状态 | **Skeleton** | 数据加载骨架屏 |
| 右键/更多操作 | **DropdownMenu** + **ContextMenu** | 任务操作菜单 |
| 拖拽调整面板 | **Resizable** | 侧边栏/详情面板宽度调整 |
| 评论输入 | **Textarea** + **Button** | 发送评论 |
| 附件上传 | 自建 FileUploadZone + **Button** + **Toast** | 拖拽/点击上传，调用 `client.uploadContent()`，发送 `m.room.message` (msgtype: m.file/m.image/m.video) |
| 附件列表 | 自建 AttachmentList + **Badge** + **Button**(下载) | 展示已上传附件：文件名、大小、类型图标、下载链接 |
| 表单验证 | **Formsnap** + **Superforms** + **Zod** | P2 阶段引入 |

---

## 自定义 Matrix State Events 定义

所有自定义事件使用 `com.tamarix.*` 命名空间：

| Event Type | 用途 | 内容结构 | 权限控制 |
|---|---|---|---|
| `com.tamarix.task_status` | 任务状态 | `{ status: "todo" \| "in_progress" \| "review" \| "done" \| "closed" }` | power_level ≥ 50 |
| `com.tamarix.priority` | 优先级 | `{ level: "critical" \| "high" \| "medium" \| "low" }` | power_level ≥ 50 |
| `com.tamarix.due_date` | 截止日期 | `{ date: "2025-12-31T23:59:59Z" }` | power_level ≥ 50 |
| `com.tamarix.task_type` | 任务类型 | `{ type: "bug" \| "feature" \| "task" \| "improvement" \| "epic" }` | power_level ≥ 100 |
| `com.tamarix.estimate` | 估时/故事点 | `{ points: 5, unit: "story_points" \| "hours" \| "days" }` | power_level ≥ 50 |
| `com.tamarix.tags` | 全局标签（Room 级） | `{ tags: ["frontend", "urgent"] }` | power_level ≥ 0 |
| `com.tamarix.ticket_id` | 任务编号 | `{ id: "TAM-42" }` | power_level ≥ 100 |
| `com.tamarix.relation` | 任务关联 | `{ rel_type: "blocks" \| "duplicates" \| "relates" \| "subtask_of", target_room: "!xxx:server" }` | power_level ≥ 50 |
| `com.tamarix.sprint_meta` | Sprint 元数据 | `{ name: "Sprint 3", start: "2025-01-01", end: "2025-01-14" }` | power_level ≥ 100 |
| `com.tamarix.assignee` | 指派人 | `{ user_id: "@alice:server" }` | power_level ≥ 50 |
| `com.tamarix.task_archived` | 任务归档标记 | `{ archived: true, archived_by: "@alice:server", archived_at: "2025-07-15T10:30:00Z" }` | power_level ≥ 50 |
---

## 文件结构

```
tamarix/
├── components.json              # shadcn-svelte 配置
├── src/
│   ├── app.css                  # 全局样式：Tailwind 指令 + DESIGN.md 色板 CSS 变量覆盖
│   ├── app.html                 # HTML 模板
│   ├── app.d.ts                 # 类型声明
│   ├── lib/
│   │   ├── index.ts
│   │   ├── utils/
│   │   │   └── cn.ts            # shadcn-svelte 自动生成：clsx + tailwind-merge
│   │   ├── components/
│   │   │   ├── ui/              # shadcn-svelte 组件（CLI 自动生成）
│   │   │   │   ├── button/
│   │   │   │   ├── badge/
│   │   │   │   ├── dialog/
│   │   │   │   ├── input/
│   │   │   │   ├── select/
│   │   │   │   ├── textarea/
│   │   │   │   ├── avatar/
│   │   │   │   ├── sidebar/
│   │   │   │   ├── tabs/
│   │   │   │   ├── separator/
│   │   │   │   ├── dropdown-menu/
│   │   │   │   ├── command/
│   │   │   │   ├── popover/
│   │   │   │   ├── calendar/
│   │   │   │   ├── date-picker/
│   │   │   │   ├── data-table/
│   │   │   │   ├── alert-dialog/
│   │   │   │   ├── toast/
│   │   │   │   ├── skeleton/
│   │   │   │   ├── card/
│   │   │   │   ├── resizable/
│   │   │   │   ├── breadcrumb/
│   │   │   │   ├── scroll-area/
│   │   │   │   ├── checkbox/
│   │   │   │   ├── combobox/
│   │   │   │   ├── field/
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.svelte        # 基于 shadcn Sidebar 的项目导航
│   │   │   │   ├── AppHeader.svelte         # 顶部栏（搜索+用户 Avatar）
│   │   │   │   └── AppShell.svelte          # 主布局（Sidebar + Resizable Panel）
│   │   │   ├── task/
│   │   │   │   ├── TaskCard.svelte          # 任务卡片（列表项）
│   │   │   │   ├── TaskRow.svelte           # Data Table 行渲染
│   │   │   │   ├── TaskStatusSelect.svelte  # 状态选择（Select 组件）
│   │   │   │   ├── PrioritySelect.svelte    # 优先级选择
│   │   │   │   ├── TaskTypeSelect.svelte    # 类型选择
│   │   │   │   ├── TaskCreateDialog.svelte  # 新建任务（Dialog + Form）
│   │   │   │   ├── TaskDetailPanel.svelte   # 任务详情侧面板
│   │   │   │   ├── TaskCommentInput.svelte  # 评论输入
│   │   │   │   ├── AssigneeSelect.svelte   # 指派人选择（Combobox 搜索成员）
│   │   │   │   ├── FileUploadZone.svelte    # 拖拽上传区域 + 文件选择按钮
│   │   │   │   ├── AttachmentList.svelte     # 附件列表（文件名/大小/预览/下载）
│   │   │   │   └── AttachmentPreview.svelte  # 图片/视频内联预览
│   │   │   ├── board/
│   │   │   │   ├── KanbanBoard.svelte       # 看板主容器
│   │   │   │   ├── KanbanColumn.svelte      # 看板列（按状态分组）
│   │   │   │   └── KanbanCard.svelte        # 看板卡片（可拖拽）
│   │   │   └── common/
│   │   │       ├── MatrixAvatar.svelte      # Matrix 用户头像（Avatar 封装）
│   │   │       └── TaskIdBadge.svelte       # 任务编号标签（TAM-42）
│   │   ├── matrix/
│   │   │   ├── client.ts          # Matrix 客户端初始化与单例管理
│   │   │   ├── auth.ts            # 登录/登出/会话恢复
│   │   │   ├── room-utils.ts      # Room → Task 映射工具函数
│   │   │   ├── state-events.ts    # 自定义 state event 读写封装
│   │   │   ├── media.ts          # Matrix 媒体上传/下载/缩略图封装
│   │   │   └── types.ts           # Matrix 相关类型定义 + 枚举
│   │   └── stores/
│   │       ├── auth.svelte.ts     # 用户认证状态（Svelte 5 runes）
│   │       ├── tasks.svelte.ts    # 任务列表状态 + Sync 事件监听
│   │       ├── projects.svelte.ts # 项目(Space)列表状态 + Sync 事件监听
│   │       ├── comments.svelte.ts # 评论状态 + RoomEvent.Timeline 实时监听
│   │       └── ui.svelte.ts       # UI 状态（侧边栏、视图模式等）
│   └── routes/
│       ├── +layout.svelte         # 重写：条件渲染（已登录→AppShell，未登录→登录页）
│       ├── +page.svelte           # 重写：重定向到 /dashboard
│       ├── login/
│       │   └── +page.svelte       # Matrix 登录页
│       ├── dashboard/
│       │   └── +page.svelte       # 仪表盘：我的任务、近期截止、统计摘要
│       ├── project/
│       │   └── [id]/
│       │       ├── +page.svelte   # 项目页：Data Table 任务列表
│       │       ├── board/
│       │       │   └── +page.svelte # 看板视图
│       │       └── task/
│       │           └── [taskId]/
│       │               └── +page.svelte  # 任务详情
│       └── settings/
│           └── +page.svelte       # 用户设置
├── static/                        # 静态资源
└── DESIGN.md                      # 设计系统文档
```

---

## Room 创建模板（任务）

```json
{
  "name": "实现用户登录功能",
  "topic": "使用 Matrix 协议完成 OAuth2 登录流程",
  "creation_content": {},
  "initial_state": [
    { "type": "m.room.name", "state_key": "", "content": { "name": "实现用户登录功能" } },
    { "type": "m.room.topic", "state_key": "", "content": { "topic": "使用 Matrix 协议完成 OAuth2 登录流程" } },
    { "type": "com.tamarix.task_status", "state_key": "", "content": { "status": "todo" } },
    { "type": "com.tamarix.priority", "state_key": "", "content": { "level": "high" } },
    { "type": "com.tamarix.task_type", "state_key": "", "content": { "type": "feature" } },
    { "type": "com.tamarix.due_date", "state_key": "", "content": { "date": "2025-08-01T00:00:00Z" } },
    { "type": "com.tamarix.tags", "state_key": "", "content": { "tags": ["frontend", "auth"] } },
    { "type": "com.tamarix.estimate", "state_key": "", "content": { "points": 5, "unit": "story_points" } },
    { "type": "m.room.power_levels", "state_key": "", "content": {
      "users_default": 0,
      "events_default": 50,
      "state_default": 50,
      "events": {
        "com.tamarix.task_status": 50,
        "com.tamarix.priority": 50,
        "com.tamarix.task_type": 100,
        "com.tamarix.ticket_id": 100,
        "com.tamarix.tags": 0,
        "com.tamarix.task_archived": 50
      }
    }}
  ]
}
```

## Space 创建模板（项目）

```json
{
  "name": "Tamarix v1.0",
  "topic": "Tamarix 首个正式版本开发",
  "creation_content": { "type": "m.space" },
  "initial_state": [
    { "type": "com.tamarix.sprint_meta", "state_key": "sprint-1", 
      "content": { "name": "Sprint 1", "start": "2025-07-01", "end": "2025-07-14" } }
  ],
  "power_level_content_override": {
    "events": { "com.tamarix.sprint_meta": 100 }
  }
}
```

---

## 权限模型（Power Levels 映射）

| Power Level | 角色 | 能力 |
|---|---|---|
| 0 | 观察者 | 查看任务、添加标签(`com.tamarix.tags`)、发送消息(评论) |
| 50 | 成员 | 修改状态/优先级/截止日期/估算、邀请成员、归档/取消归档任务(`com.tamarix.task_archived`) |
| 100 | 管理员 | 修改任务类型、删除房间、设置 Sprint、修改权限 |

---

## 实施阶段

### P0 — 最小可用产品（MVP）

**目标：** 用户可以登录 Matrix，查看项目下的任务列表，创建任务，修改任务基本属性。

**新增依赖：**

- `matrix-js-sdk` — Matrix 客户端 SDK
- `@lucide/svelte` — 图标库（shadcn-svelte 推荐搭配）
- shadcn-svelte CLI 自动安装的依赖（`bits-ui`, `tailwind-merge`, `clsx`, `tailwindcss` 等）

**P0 实施步骤（严格顺序）：**

| # | 步骤 | 命令/文件 | 说明 |
|---|---|---|---|
| 1 | 安装 shadcn-svelte | `bun x shadcn-svelte@latest init` | 选择 zinc base color，CSS 路径 `src/app.css`，别名 `$lib` |
| 2 | 覆盖 CSS 变量 | `src/app.css` | 替换 `.dark` 块中的 CSS 变量为 DESIGN.md 色板映射值 |
| 3 | 安装基础组件 | `bun x shadcn-svelte@latest add button badge input field label textarea select dialog avatar separator skeleton dropdown-menu scroll-area` | P0 所需组件 |
| 4 | 安装侧边栏 | `bun x shadcn-svelte@latest add sidebar` | 项目导航侧边栏 |
| 5 | 定义类型 | `src/lib/matrix/types.ts` | TaskStatus, Priority, TaskType 枚举；Task, Project 接口 |
| 6 | Matrix 客户端 | `src/lib/matrix/client.ts` | 创建客户端、连接、监听同步状态 |
| 7 | 认证封装 | `src/lib/matrix/auth.ts` | 登录/登出/token 持久化 |
| 8 | State Event 封装 | `src/lib/matrix/state-events.ts` | 读写 `com.tamarix.*` state event |
| 9 | Room→Task 映射 | `src/lib/matrix/room-utils.ts` | `roomToTask(room)` 函数 |
| 10 | 认证 Store | `src/lib/stores/auth.svelte.ts` | `$state` rune：当前用户、客户端实例、登录状态 |
| 11 | 任务 Store | `src/lib/stores/tasks.svelte.ts` | `$state`：任务列表、加载状态；方法：fetchTasks, createTask, updateTaskStatus |
| 12 | 项目 Store | `src/lib/stores/projects.svelte.ts` | `$state`：Space 列表；方法：fetchProjects, createProject |
| 13 | UI Store | `src/lib/stores/ui.svelte.ts` | 侧边栏展开状态、当前视图模式 |
| 14 | AppSidebar | `src/lib/components/layout/AppSidebar.svelte` | 基于 Sidebar 组件，显示项目列表、创建项目入口 |
| 15 | AppHeader | `src/lib/components/layout/AppHeader.svelte` | 面包屑 + 搜索框 + Avatar Dropdown |
| 16 | AppShell | `src/lib/components/layout/AppShell.svelte` | Sidebar + Resizable Panel 主布局 |
| 17 | 登录页 | `src/routes/login/+page.svelte` | Field + Input + Button 表单：Homeserver URL / 用户名 / 密码 |
| 18 | 根布局 | `src/routes/+layout.svelte` | 条件渲染：已登录→AppShell，未登录→跳转 /login |
| 19 | 根页面 | `src/routes/+page.svelte` | 重定向到 /dashboard |
| 20 | 仪表盘 | `src/routes/dashboard/+page.svelte` | 我的任务卡片、近期截止、统计 |
| 21 | TaskCard | `src/lib/components/task/TaskCard.svelte` | Badge(状态) + Badge(优先级) + Avatar(指派人) + 标题 |
| 22 | TaskStatusSelect | `src/lib/components/task/TaskStatusSelect.svelte` | Select 组件，选项：todo/in_progress/review/done/closed |
| 23 | PrioritySelect | `src/lib/components/task/PrioritySelect.svelte` | Select 组件，选项：critical/high/medium/low |
| 24 | TaskTypeSelect | `src/lib/components/task/TaskTypeSelect.svelte` | Select 组件，选项：bug/feature/task/improvement/epic |
| 25 | TaskCreateDialog | `src/lib/components/task/TaskCreateDialog.svelte` | Dialog + Field + Input + Textarea + Select 组合表单 |
| 26 | MatrixAvatar | `src/lib/components/common/MatrixAvatar.svelte` | 封装 Avatar，从 Matrix mxc:// 加载头像 |
| 27 | TaskIdBadge | `src/lib/components/common/TaskIdBadge.svelte` | Badge 显示 "TAM-42" 编号 |
| 28 | 项目任务列表 | `src/routes/project/[id]/+page.svelte` | 简易列表视图 + TaskCreateDialog |
| 29 | 任务详情 | `src/routes/project/[id]/task/[taskId]/+page.svelte` | Tabs(详情/评论) + 元数据编辑 + 内嵌聊天 |
| 30 | 安装 matrix-js-sdk | `bun add matrix-js-sdk` | Matrix 客户端 SDK |
| 31 | 评论 Store | `src/lib/stores/comments.svelte.ts` | 从 timeline 读取 m.room.message；RoomEvent.Timeline 实时追加 |
| 32 | Sync 事件监听 | `projects.svelte.ts` / `tasks.svelte.ts` | onSyncUpdate() 监听 ClientEvent.Sync，PREPARED/SYNCING 时刷新数据 |
---

### P1 — 可用看板视图

**目标：** 看板拖拽、Data Table 排序过滤、视图切换、任务归档、文件上传/附件。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add card tabs command popover checkbox tooltip
```

| # | 步骤 | 文件 | 说明 | 状态 |
|---|---|---|---|---|
| 1 | 拖拽工具 | `src/lib/utils/drag.ts` | 原生 HTML5 Drag & Drop 封装 | ✅ |
| 2 | KanbanCard | `src/lib/components/board/KanbanCard.svelte` | Card + Badge + Avatar，可拖拽 | ✅ |
| 3 | KanbanColumn | `src/lib/components/board/KanbanColumn.svelte` | Card 容器 + 拖放区域 | ✅ |
| 4 | KanbanBoard | `src/lib/components/board/KanbanBoard.svelte` | 多列水平滚动，拖拽跨列改状态 | ✅ |
| 5 | 看板视图 | `src/routes/project/[id]/+page.svelte` 内嵌 | Tabs 切换看板视图（非独立路由） | ✅ |
| 6 | 任务 Data Table | `src/routes/project/[id]/+page.svelte` 重构 | 替换简易列表为 Data Table | ✅ |
| 7 | 视图切换 | `src/routes/project/[id]/+page.svelte` | Tabs 切换：列表 / 看板 | ✅ |
| 8 | Command Palette | `src/lib/components/common/CommandPalette.svelte` | ⌘K 全局搜索 | ✅ |
| 9 | 过滤面板 | `src/routes/project/[id]/+page.svelte` 增强 | Select/Checkbox 过滤：指派人、优先级、标签 | ✅ |
| 10 | 归档 State Event 封装 | `src/lib/matrix/state-events.ts` 扩展 | 添加 `setArchive(client, roomId, archived)` 和 `getArchiveState(client, roomId)` | ✅ |
| 11 | Task 接口扩展 | `src/lib/matrix/types.ts` 扩展 | Task 增加 `archived?: boolean; archivedBy?: string; archivedAt?: string` 字段 | ✅ |
| 12 | 归档 UI | `src/routes/project/[id]/+page.svelte` + `src/routes/project/[id]/task/[taskId]/+page.svelte` 增强 | 过滤面板加"显示归档"开关；任务详情 DropdownMenu 加归档/取消归档（AlertDialog 确认）；归档任务显示 Badge | ✅ |
| 13 | Media 工具封装 | `src/lib/matrix/media.ts` | `uploadFile(client, file, options)` → `client.uploadContent()` + 返回 `mxc://` URL；`getDownloadUrl(client, mxcUrl)` → HTTP 下载链接；`getThumbnailUrl(client, mxcUrl, width, height)` → 缩略图链接 | ✅ |
| 14 | Attachment 接口 | `src/lib/matrix/types.ts` 扩展 | 新增 `Attachment` 接口：`{ eventId, fileName, mimeType, size, mxcUrl, downloadUrl?, thumbnailUrl?, uploadedBy, uploadedAt }`；扩展 `Comment` 接口增加 `attachments?: Attachment[]` | ✅ |
| 15 | FileUploadZone | `src/lib/components/task/FileUploadZone.svelte` | 拖拽区域 + 点击选择；文件类型校验（MIME whitelist）；大小限制（默认 50MB）；上传进度条；调用 `media.ts` 上传后发送 `m.room.message` | ✅ |
| 17 | 评论+附件集成 | `src/lib/stores/comments.svelte.ts` 扩展 | `loadComments()` 中解析 `m.image`/`m.file`/`m.video` 消息的 `content.url`/`content.info`；`Comment` 类型支持附件字段；发送评论支持附加文件 | ✅ |
| 18 | 主题切换 | `src/lib/stores/ui.svelte.ts` + `src/app.html` + `AppHeader.svelte` | `ui.svelte.ts` 增加 `theme` 状态（`light`/`dark`/`system`），`$effect` 监听 → 修改 `document.documentElement.classList`，持久化 `localStorage`；`app.html` 内联脚本读 `localStorage` 避免 FOUC；AppHeader DropdownMenu 增加 Sun/Moon 切换按钮 | ✅ |
---

### P2 — 智能化（前端兜底 + Application Service 增强）

**目标：** i18n 国际化、编号生成、工作流校验、搜索、变更历史。

**架构原则：前端可独立运行，AS 为增强层。** 所有 P2 功能在没有 AS 时前端可独立完成。AS 代码照常编写，但与前端幂等共存——两端可安全同时运行，AS 发现前端已处理则跳过。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add alert collapsible table pagination
```

#### 前端兜底层（无 AS 也可用）

| # | 步骤 | 文件 | 说明 |
|---|---|---|---|
| 0a | ✅ i18n 框架 | `src/lib/i18n/index.ts` | 自研轻量方案（Svelte 5 runes），`currentLocale` 状态 + `t(key, params?)` 函数 + `setLocale()`，localStorage 持久化，`<html lang>` 动态更新 |
| 0b | ✅ 中文翻译 | `src/lib/i18n/locales/zh.ts` | 中文翻译字典（161 条 key），覆盖所有现有硬编码中文文本 |
| 0c | ✅ 英文翻译 | `src/lib/i18n/locales/en.ts` | 英文翻译字典（161 条 key，与 zh 完全同步） |
| 0d | ✅ 迁移硬编码中文 | `types.ts` + 全部 `.svelte` 文件 | `TASK_STATUS_LABELS` 等改为 `getXxxLabel()` 响应式函数；所有组件内中文文本 → `t("key")`；`ui.svelte.ts` 增加 `locale` 状态 |
| 0e | ✅ 语言切换 UI | `src/lib/components/layout/AppHeader.svelte` | 用户 DropdownMenu 增加 Globe 图标语言切换（中文/English） |
| 1 | ✅ 编号生成（前端） | `src/lib/matrix/ticket-id.ts` | `generateNextTicketId(client, projectRoomId)` — 遍历项目子房间找最大 ticketId 编号 +1，返回 `"TAM-{n}"` 格式 |
| 2 | ✅ 集成编号到创建流程 | `src/lib/stores/tasks.svelte.ts` | `createTask()` 调用 `generateNextTicketId()`，结果放入 `initial_state` 的 `com.tamarix.ticket_id`（与 AS 产出格式一致） |
| 2a | ✅ 指派人选择 | `src/lib/components/task/AssigneeSelect.svelte` | Combobox（Command + Popover）搜索项目 Space 成员列表，选择后写入 `com.tamarix.assignee` state event（`{ user_id }`），TaskCreateDialog + TaskDetailPanel 集成 |
| 3 | ✅ 工作流校验（前端） | `src/lib/matrix/workflow.ts` | 导出 `VALID_TRANSITIONS` 白名单 + `canTransition(from, to)` + `getAllowedNextStatuses(current)`。流转规则：`todo→[in_progress,closed]`、`in_progress→[review,todo,closed]`、`review→[done,in_progress,closed]`、`done→[closed]`、`closed→[]` |
| 4 | ✅ 集成工作流到 UI | `tasks.svelte.ts` + `TaskStatusSelect.svelte` + `KanbanBoard.svelte` | `updateTaskStatus()` 内校验；`TaskStatusSelect` 过滤禁用非法选项；`KanbanBoard` 拖拽校验目标列合法性 |
| 5 | ✅ 内存搜索 | `src/lib/matrix/search.ts` | `searchTasks(tasks, query)` — 全字段 filter（title/description/tags/assignee/ticketId/status/priority/type），支持 `status:done priority:high keyword` 语法 |
| 6 | ✅ 变更历史 | `src/lib/components/task/TaskHistory.svelte` | 读取 Room state event 变更历史（`com.tamarix.*` 过滤 + 时间排序），Timeline 展示"谁在何时改了什么" |
| 7 | ✅ 任务关联 | `src/lib/components/task/TaskRelations.svelte` | 读写 `com.tamarix.relation` state event，展示 blocks/duplicates/relates 关系链 |
| 8 | ✅ 搜索页 | `src/routes/search/+page.svelte` | 全文搜索输入框 + 元数据过滤 + 结果列表，调用 `searchTasks()` |
| 9 | ✅ 评论输入 | `src/lib/components/task/TaskCommentInput.svelte` | Textarea + 发送 |

#### Application Service 增强层（与前端幂等共存）

| # | 步骤 | 文件 | 说明 |
|---|---|---|---|
| 10 | AS 入口 | `as/src/index.ts` | 监听 Matrix 事件，分发到各处理器 |
| 11 | AS 编号生成 | `as/src/ticket-id.ts` | 监听 room 创建，**先检查是否已有 `com.tamarix.ticket_id`，有则跳过**，无则注入。与前端 #1 产出格式一致，两端安全共存 |
| 12 | AS 工作流引擎 | `as/src/workflow.ts` | 监听 `com.tamarix.task_status` 变更，非法流转发送 `m.room.message` 通知 + 回滚。前端 #3 的软校验 + AS 硬校验 = 双重保障 |
| 13 | AS Schema 校验 | `as/src/schema.ts` | 自定义 state event JSON schema 校验，拒绝非法结构 |
| 14 | AS 搜索索引 | `as/src/indexer.ts` | 同步 state → SQLite 索引，未来可暴露 HTTP API。前端 #5 内存搜索为默认，AS 索引为增强 |
| 15 | AS 配置 | `as/config.yaml` + `as/package.json` | homeserver.yaml 注册，独立包 |

#### AS 与前端共存接口约定

| State Event | 前端行为 | AS 行为 | 共存策略 |
|---|---|---|---|
| `com.tamarix.ticket_id` | `createTask()` 时 `initial_state` 预注入 | 监听 create，**有则跳过，无则注入** | 幂等：先到先得，格式一致 |
| `com.tamarix.task_status` | UI 白名单校验，禁用非法操作 | 监听变更，**非法则回滚 + 通知** | 前端软校验 + AS 硬校验，互补 |
| 搜索 | 内存 `Array.filter()`，即时响应 | SQLite 索引，未来 HTTP API | 前端默认，AS 可选切换 |

---

### P3 — 企业级

**目标：** 报表、定时提醒、Git 集成、自定义字段。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add chart form switch toggle
```

| 模块 | 使用组件 | 说明 |
|---|---|---|
| 燃尽图/统计 | **Chart** (LayerChart) | Sprint 维度数据可视化 |
| 自定义字段 | **Form** (Formsnap + Superforms + Zod) | 动态表单渲染 |
| 审批流 | **Switch** + Reactions | 简易审批/投票 |
| 批量操作 | **Checkbox** + **DropdownMenu** | 多选 + 批量操作 |

---

## 关键技术决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| UI 组件库 | **shadcn-svelte** | Svelte 5 原生、源码可控、丰富组件、Bits UI 无障碍 |
| base color | **zinc** | 冷灰色调最接近 DESIGN.md Cool Slate 色系 |
| 图标 | **@lucide/svelte** | shadcn-svelte 官方推荐，极简风格 |
| 状态管理 | Svelte 5 Runes ($state/$derived) | 项目已启用 runes 模式 |
| Matrix SDK | matrix-js-sdk | 官方 JS SDK |
| 拖拽 | 原生 HTML5 Drag & Drop | 无额外依赖 |
| Data Table | TanStack Table (via shadcn-svelte) | 功能完整，排序/过滤/分页 |
| 表单 | Formsnap + Superforms + Zod | P2 阶段引入，shadcn-svelte 推荐 |
| i18n | 自研轻量方案（Svelte 5 runes） | 仅中/英需求，无需 ICU 复数等高级功能，与 runes 体系一致零学习成本 |
| AS 实现 | Bun + TypeScript | 与前端技术栈统一 |
| 搜索索引 | 前端内存搜索（默认）+ SQLite (better-sqlite3)（AS 增强） | 前端兜底即时响应，AS 索引支持大规模数据 |
| 图表 | LayerChart (via shadcn-svelte Chart) | P3 阶段引入 |

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| Matrix Room 数量多时同步慢 | 任务列表加载 >5s | 前端内存搜索兜底（<2000 条无感知差异），AS 索引增强（>2000 条可切换远程搜索） |
| shadcn-svelte 组件样式与 DESIGN.md 冲突 | 视觉不统一 | 通过 CSS 变量覆盖 + 自定义 className 适配 |
| 自定义 state event 无 schema 校验 | 数据不一致 | AS 拦截非法事件；前端做客户端校验 |
| Space 只支持一层嵌套 | 无法表达 Epic→Story→Task 三层 | 用 `com.tamarix.relation` 的 `subtask_of` 替代 |
| 联邦环境下自定义 event 传播 | 其他 HS 忽略但不报错 | `com.tamarix.*` 命名空间隔离 |
| Power Levels 粒度不足 | 无法做字段级权限 | Bot 校验 + 前端隐藏无权限操作 |
| Tailwind v4 + shadcn-svelte 兼容性 | 样式构建失败 | shadcn-svelte 最新版已支持 TW v4，必要时参考 Migration 指南 |

---

## 里程碑时间线

| 阶段 | 预计工作量 | 核心交付物 |
|---|---|---|
| P0 - MVP | 3-4 周 | 登录 → 项目列表(Sidebar) → 任务 CRUD(Dialog/Data Table) → 任务详情(Tabs+聊天) |
| P1 - 看板 | 1-2 周 | ✅ 全部完成：看板拖拽 + Data Table + Command Palette(⌘K) + 归档 + 文件上传/附件 + 主题切换 |
| P2 - 智能化 | 2-3 周 | i18n 国际化 + 前端兜底（编号/工作流/搜索）+ AS 增强层 + 变更历史 + 任务关联 |
| P3 - 企业级 | 4-6 周 | Chart 报表 + 提醒 Bot + Git Bridge + Formsnap 自定义字段 |
