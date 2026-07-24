> [项目计划](./README.md) / P0 MVP

# P0 -- 最小可用产品（MVP）

**目标：** 用户可以登录 Matrix，查看项目下的任务列表，创建任务，修改任务基本属性。

**新增依赖：**

- `matrix-js-sdk` -- Matrix 客户端 SDK
- `@lucide/svelte` -- 图标库（shadcn-svelte 推荐搭配）
- shadcn-svelte CLI 自动安装的依赖（`bits-ui`, `tailwind-merge`, `clsx`, `tailwindcss` 等）

**P0 实施步骤（严格顺序）：**

| #   | 步骤               | 命令/文件                                                                                                                                  | 说明                                                                         |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | 安装 shadcn-svelte | `bun x shadcn-svelte@latest init`                                                                                                          | 选择 zinc base color，CSS 路径 `src/app.css`，别名 `$lib`                    |
| 2   | 覆盖 CSS 变量      | `src/app.css`                                                                                                                              | 替换 `.dark` 块中的 CSS 变量为 DESIGN.md 色板映射值                          |
| 3   | 安装基础组件       | `bun x shadcn-svelte@latest add button badge input field label textarea select dialog avatar separator skeleton dropdown-menu scroll-area` | P0 所需组件                                                                  |
| 4   | 安装侧边栏         | `bun x shadcn-svelte@latest add sidebar`                                                                                                   | 项目导航侧边栏                                                               |
| 5   | 定义类型           | `src/lib/matrix/types.ts`                                                                                                                  | TaskStatus, Priority, TaskType 枚举；Task, Project 接口                      |
| 6   | Matrix 客户端      | `src/lib/matrix/client.ts`                                                                                                                 | 创建客户端、连接、监听同步状态                                               |
| 7   | 认证封装           | `src/lib/matrix/auth.ts`                                                                                                                   | 登录/登出/token 持久化                                                       |
| 8   | State Event 封装   | `src/lib/matrix/state-events.ts`                                                                                                           | 读写 `com.tamarix.*` state event                                             |
| 9   | Room--Task 映射    | `src/lib/matrix/room-utils.ts`                                                                                                             | `roomToTask(room)` 函数                                                      |
| 10  | 认证 Store         | `src/lib/stores/auth.svelte.ts`                                                                                                            | `$state` rune：当前用户、客户端实例、登录状态                                |
| 11  | 任务 Store         | `src/lib/stores/tasks.svelte.ts`                                                                                                           | `$state`：任务列表、加载状态；方法：fetchTasks, createTask, updateTaskStatus |
| 12  | 项目 Store         | `src/lib/stores/projects.svelte.ts`                                                                                                        | `$state`：Space 列表；方法：fetchProjects, createProject                     |
| 13  | UI Store           | `src/lib/stores/ui.svelte.ts`                                                                                                              | 侧边栏展开状态、当前视图模式                                                 |
| 14  | AppSidebar         | `src/lib/components/layout/AppSidebar.svelte`                                                                                              | 基于 Sidebar 组件，显示项目列表、创建项目入口                                |
| 15  | AppHeader          | `src/lib/components/layout/AppHeader.svelte`                                                                                               | 面包屑 + 搜索框 + Avatar Dropdown                                            |
| 16  | AppShell           | `src/lib/components/layout/AppShell.svelte`                                                                                                | Sidebar + Resizable Panel 主布局                                             |
| 17  | 登录页             | `src/routes/login/+page.svelte`                                                                                                            | Field + Input + Button 表单：Homeserver URL / 用户名 / 密码                  |
| 18  | 根布局             | `src/routes/+layout.svelte`                                                                                                                | 条件渲染：已登录--AppShell，未登录--跳转 /login                              |
| 19  | 根页面             | `src/routes/+page.svelte`                                                                                                                  | 重定向到 /dashboard                                                          |
| 20  | 仪表盘             | `src/routes/dashboard/+page.svelte`                                                                                                        | 我的任务卡片、近期截止、统计                                                 |
| 21  | TaskCard           | `src/lib/components/task/TaskCard.svelte`                                                                                                  | Badge(状态) + Badge(优先级) + Avatar(指派人) + 标题                          |
| 22  | TaskStatusSelect   | `src/lib/components/task/TaskStatusSelect.svelte`                                                                                          | Select 组件，选项：todo/in_progress/review/done/closed                       |
| 23  | PrioritySelect     | `src/lib/components/task/PrioritySelect.svelte`                                                                                            | Select 组件，选项：critical/high/medium/low                                  |
| 24  | TaskTypeSelect     | `src/lib/components/task/TaskTypeSelect.svelte`                                                                                            | Select 组件，选项：bug/feature/task/improvement/epic                         |
| 25  | TaskCreateDialog   | `src/lib/components/task/TaskCreateDialog.svelte`                                                                                          | Dialog + Field + Input + Textarea + Select 组合表单                          |
| 26  | MatrixAvatar       | `src/lib/components/common/MatrixAvatar.svelte`                                                                                            | 封装 Avatar，从 Matrix mxc:// 加载头像                                       |
| 27  | TaskIdBadge        | `src/lib/components/common/TaskIdBadge.svelte`                                                                                             | Badge 显示 "TAM-42" 编号                                                     |
| 28  | 项目任务列表       | `src/routes/project/[id]/+page.svelte`                                                                                                     | 简易列表视图 + TaskCreateDialog                                              |
| 29  | 任务详情           | `src/routes/project/[id]/task/[taskId]/+page.svelte`                                                                                       | Tabs(详情/评论) + 元数据编辑 + 内嵌聊天                                      |
| 30  | 安装 matrix-js-sdk | `bun add matrix-js-sdk`                                                                                                                    | Matrix 客户端 SDK                                                            |
| 31  | 评论 Store         | `src/lib/stores/comments.svelte.ts`                                                                                                        | 从 timeline 读取 m.room.message；RoomEvent.Timeline 实时追加                 |
| 32  | Sync 事件监听      | `projects.svelte.ts` / `tasks.svelte.ts`                                                                                                   | onSyncUpdate() 监听 ClientEvent.Sync，PREPARED/SYNCING 时刷新数据            |
