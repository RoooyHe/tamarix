> [项目计划](./README.md) / P2 智能化

# P2 -- 智能化（前端兜底）

**目标：** i18n 国际化、编号生成、工作流校验、搜索、变更历史 + 通知系统、项目管理UI、工时记录、批量操作、富文本描述、移动端适配、仪表盘增强、附件删除、任务关注。

**架构原则：前端可独立运行。** 所有 P2 功能在没有 AS 时前端可独立完成。AS 增强层移至 P3 独立实施，与前端幂等共存--两端可安全同时运行，AS 发现前端已处理则跳过。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add alert collapsible table pagination sheet progress
```

**新增依赖：**

```bash
bun add marked
```

> `marked` -- 轻量 Markdown 解析库（~30KB gzip），支持 GFM，纯 JS 无依赖，用于任务富文本描述渲染。

---

## 前端兜底层（无 AS 也可用）

### 第一批（已完成）

| #   | 步骤               | 文件                                                                 | 说明                                                                                                                                                                                                                                              |
| --- | ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0a  | i18n 框架          | `src/lib/i18n/index.ts`                                              | 自研轻量方案（Svelte 5 runes），`currentLocale` 状态 + `t(key, params?)` 函数 + `setLocale()`，localStorage 持久化，`<html lang>` 动态更新                                                                                                        |
| 0b  | 中文翻译           | `src/lib/i18n/locales/zh.ts`                                         | 中文翻译字典（161 条 key），覆盖所有现有硬编码中文文本                                                                                                                                                                                            |
| 0c  | 英文翻译           | `src/lib/i18n/locales/en.ts`                                         | 英文翻译字典（161 条 key，与 zh 完全同步）                                                                                                                                                                                                        |
| 0d  | 迁移硬编码中文     | `types.ts` + 全部 `.svelte` 文件                                     | `TASK_STATUS_LABELS` 等改为 `getXxxLabel()` 响应式函数；所有组件内中文文本 -- `t("key")`；`ui.svelte.ts` 增加 `locale` 状态                                                                                                                       |
| 0e  | 语言切换 UI        | `src/lib/components/layout/AppHeader.svelte`                         | 用户 DropdownMenu 增加 Globe 图标语言切换（中文/English）                                                                                                                                                                                         |
| 1   | 编号生成（前端）   | `src/lib/matrix/ticket-id.ts`                                        | `generateNextTicketId(client, projectRoomId)` -- 遍历项目子房间找最大 ticketId 编号 +1，返回 `"TAM-{n}"` 格式                                                                                                                                     |
| 2   | 集成编号到创建流程 | `src/lib/stores/tasks.svelte.ts`                                     | `createTask()` 调用 `generateNextTicketId()`，结果放入 `initial_state` 的 `com.tamarix.ticket_id`（与 AS 产出格式一致）                                                                                                                           |
| 2a  | 指派人选择         | `src/lib/components/task/AssigneeSelect.svelte`                      | Combobox（Command + Popover）搜索项目 Space 成员列表，选择后写入 `com.tamarix.assignee` state event                                                                                                                                               |
| 3   | 工作流校验（前端） | `src/lib/matrix/workflow.ts`                                         | 导出 `VALID_TRANSITIONS` 白名单 + `canTransition(from, to)` + `getAllowedNextStatuses(current)`。流转规则：`todo--[in_progress,closed]`、`in_progress--[review,todo,closed]`、`review--[done,in_progress,closed]`、`done--[closed]`、`closed--[]` |
| 4   | 集成工作流到 UI    | `tasks.svelte.ts` + `TaskStatusSelect.svelte` + `KanbanBoard.svelte` | `updateTaskStatus()` 内校验；`TaskStatusSelect` 过滤禁用非法选项；`KanbanBoard` 拖拽校验目标列合法性                                                                                                                                              |
| 5   | 内存搜索           | `src/lib/matrix/search.ts`                                           | `searchTasks(tasks, query)` -- 全字段 filter，支持 `status:done priority:high keyword` 语法                                                                                                                                                       |
| 6   | 变更历史           | `src/lib/components/task/TaskHistory.svelte`                         | 读取 Room state event 变更历史，Timeline 展示"谁在何时改了什么"                                                                                                                                                                                   |
| 7   | 任务关联           | `src/lib/components/task/TaskRelations.svelte`                       | 读写 `com.tamarix.relation` state event，展示 blocks/duplicates/relates 关系链                                                                                                                                                                    |
| 8   | 搜索页             | `src/routes/search/+page.svelte`                                     | 全文搜索输入框 + 元数据过滤 + 结果列表，调用 `searchTasks()`                                                                                                                                                                                      |
| 9   | 评论输入           | `src/lib/components/task/TaskCommentInput.svelte`                    | Textarea + 发送                                                                                                                                                                                                                                   |

### 第二批A -- 已完成模块

| #   | 步骤                    | 文件                                            | 说明                                                                                           |
| --- | ----------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
|     |                         |                                                 | **模块3: 时间跟踪/工时记录**                                                                   |
| WT1 | Worklog 类型            | `src/lib/matrix/types.ts` 扩展                  | `WorklogEntry` 接口 + `TAMARIX_EVENT_TYPES.WORKLOG`                                            |
| WT2 | Worklog 封装            | `src/lib/matrix/state-events.ts` 扩展           | `addWorklog` / `getWorklogs` / `removeWorklog`                                                 |
| WT3 | Worklog Store           | `src/lib/stores/worklogs.svelte.ts`             | 工时列表、汇总、addWorklog/removeWorklog                                                       |
| WT4 | 工时登记 UI             | `src/lib/components/task/WorklogPanel.svelte`   | 任务详情页 "工时" Tab；工时列表 + 登记表单 + 预估vs实际                                        |
| WT5 | 集成到任务详情          | `+page.svelte` 修改                             | Tabs 增加 "工时" 标签页                                                                        |
| WT6 | 工时 i18n               | `zh.ts` + `en.ts`                               | worklog.title / hours / note / add / total / estimate_vs_actual / no_worklogs                  |
|     |                         |                                                 | **模块5: 富文本描述**                                                                          |
| RD1 | Description State Event | `src/lib/matrix/types.ts` 扩展                  | `TAMARIX_EVENT_TYPES.DESCRIPTION`；Task 接口 `formattedDescription` 字段                       |
| RD2 | Description 封装        | `src/lib/matrix/state-events.ts` 扩展           | `setDescription` / `getDescription`                                                            |
| RD3 | Markdown 编辑器         | `src/lib/components/task/MarkdownEditor.svelte` | Textarea + 实时预览 + 工具栏 + `marked` 渲染                                                   |
| RD4 | 任务创建时描述          | `tasks.svelte.ts` 修改                          | `createTask()` 同时写入 topic 和 description                                                   |
| RD5 | 任务详情描述区          | `+page.svelte` 修改                             | MarkdownEditor 替换原描述区                                                                    |
|     |                         |                                                 | **模块8: 附件删除**                                                                            |
| AD1 | 附件删除 UI             | `src/lib/components/task/AttachmentList.svelte` | 附件项增加红色删除按钮；点击 -- AlertDialog 确认 -- `client.redactEvent()`；删除后刷新评论列表 |
| AD2 | 附件删除 i18n           | `zh.ts` + `en.ts`                               | attachment.delete / delete_confirm / delete_success / delete_failed                            |

### 第二批B -- 已完成模块

| #   | 步骤           | 文件                                                      | 说明                                                                                                                                                           |
| --- | -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     |                |                                                           | **模块1: 通知系统**                                                                                                                                            |
| N1  | 通知类型定义   | `src/lib/matrix/types.ts` 扩展                            | `NotificationType` 枚举：`assign`, `status_change`, `due_remind`, `mention`；`Notification` 接口：`{ id, type, taskId, taskTitle, fromUser, timestamp, read }` |
| N2  | 通知解析工具   | `src/lib/matrix/notifications.ts`                         | `parseNotificationFromEvent(event, currentUser)` -- 解析 state event 变更生成 Notification 对象；`isDueSoon(dueDate, remindBefore)` -- 到期判断                |
| N3  | 通知 Store     | `src/lib/stores/notifications.svelte.ts`                  | `$state`：通知列表、未读数；方法：addNotification, markAsRead, markAllAsRead, clearAll；监听 Sync 事件自动生成通知                                             |
| N4  | 通知面板 UI    | `src/lib/components/layout/NotificationPanel.svelte`      | AppHeader 右上角 Bell 图标 + 未读数 Badge + Popover 通知列表；每项：图标+任务标题+描述+时间；点击跳转任务详情；"全部已读"按钮                                  |
| N5  | 通知 i18n      | `zh.ts` + `en.ts`                                         | notification.assign / status_change / due_remind / mention / mark_all_read / no_notifications / unread                                                         |
| N6  | 到期提醒       | `notifications.svelte.ts` 增强                            | `$effect` 定时检查（每30分钟）所有任务的 `com.tamarix.due_date`，若到期日距今 < 1天则生成 `due_remind` 通知                                                    |
|     |                |                                                           | **模块2: 项目管理UI**                                                                                                                                          |
| PM1 | 项目设置页     | `src/routes/project/[id]/settings/+page.svelte`           | 项目信息编辑（名称/描述） + 成员管理（复用 MemberManager）                                                                                                     |
| PM2 | 项目成员管理   | `src/lib/components/project/MemberManager.svelte`         | 成员列表（Avatar+名称+角色）；邀请（Input userId + Button）；角色调整（Select power level）；移除（Button + AlertDialog 确认）                                 |
| PM3 | 项目管理 i18n  | `zh.ts` + `en.ts`                                         | project.settings / members / invite / role / remove / remove_confirm / admin / member / observer                                                               |
|     |                |                                                           | **模块7: 仪表盘增强**                                                                                                                                          |
| DA1 | 逾期任务卡片   | `src/lib/components/dashboard/OverdueTaskList.svelte`     | 扫描所有任务 `due_date`，逾期且非 done/closed 的任务列表；Badge(destructive) 显示"逾期 N 天"                                                                   |
| DA2 | 团队工作量卡片 | `src/lib/components/dashboard/TeamWorkloadCard.svelte`    | 按指派人分组统计任务数；纯CSS横向柱状图；显示每人进行中/待办/已完成任务数                                                                                      |
| DA3 | 项目进度卡片   | `src/lib/components/dashboard/ProjectProgressCard.svelte` | 各项目完成率百分比；纯CSS进度条；点击跳转项目页                                                                                                                |
| DA4 | 仪表盘 i18n    | `zh.ts` + `en.ts`                                         | dashboard.overdue / team_workload / project_progress / completion_rate / overdue_days                                                                          |
|     |                |                                                           | **模块9: 任务关注**                                                                                                                                            |
| FW1 | Watcher 类型   | `src/lib/matrix/types.ts` 扩展                            | `TAMARIX_EVENT_TYPES.WATCHER`；`Watcher` 接口                                                                                                                  |
| FW2 | Watcher 封装   | `src/lib/matrix/state-events.ts` 扩展                     | `addWatcher(client, roomId, userId)` / `removeWatcher(client, roomId, stateKey)` / `getWatchers(room)`                                                         |
| FW3 | 关注按钮 UI    | 任务详情页                                                | "关注"/"取消关注" 按钮；调用 `addWatcher` / `removeWatcher`                                                                                                    |
| FW4 | 关注者列表 UI  | 任务详情页                                                | 显示当前任务关注者列表（Avatar）                                                                                                                               |
| FW5 | 关注 i18n      | `zh.ts` + `en.ts`                                         | watcher.watch / unwatch / watchers / watching                                                                                                                  |
| FW6 | 关注触发通知   | `notifications.svelte.ts`                                 | status_change 通知生成逻辑中，额外调用 `getWatchers(room)` 获取 watcher 列表，为每个 watcher（排除变更发起人自身）生成通知                                     |

### 第二批C -- 已完成模块

| #   | 步骤                | 文件                                                      | 说明                                                                                                                                                                                                                                               |
| --- | ------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     |                     |                                                           | **模块4: 批量操作**                                                                                                                                                                                                                                |
| B1  | 多选状态            | `src/routes/project/[id]/+page.svelte` 修改               | (a) 新增 `selectedTaskIds = $state<Set<string>>(new Set())`；(b) Data Table 表头增加全选 Checkbox（`indeterminate` 三态）；(c) 每行增加 Checkbox；(d) `toggleAll()` / `clearSelection()` 辅助方法                                                  |
| B2  | 批量操作工具栏      | `src/lib/components/task/BulkActionBar.svelte`            | Props: `selectedCount`, `onClear`, `onBulkStatus`, `onBulkPriority`, `onBulkArchive`, `onBulkTag`；固定底部居中浮动；Badge 显示选中数 + DropdownMenu(修改状态) + DropdownMenu(修改优先级) + Button(添加标签) + Button(批量归档) + Button(清除选择) |
| B3  | 批量操作 Store 方法 | `src/lib/stores/tasks.svelte.ts` 扩展                     | `bulkUpdateStatus` / `bulkUpdatePriority` / `bulkArchive` / `bulkAddTag`；所有方法执行后调用 `fetchTasksFromRooms` 刷新                                                                                                                            |
| B4  | 看板多选            | `KanbanCard.svelte` + `KanbanBoard.svelte`                | (a) KanbanBoard 新增 Props: `selectedTaskIds`, `onToggleSelect`；(b) KanbanCard 新增 Props: `selected`, `onToggleSelect`；(c) Shift+点击触发多选；(d) 选中态 Checkbox + `ring-2 ring-primary` 高亮                                                 |
| B5  | 批量操作 i18n       | `zh.ts` + `en.ts`                                         | bulk.selected / status / priority / archive / add_tag / confirm（已预置）                                                                                                                                                                          |
|     |                     |                                                           | **模块6: 移动端基础适配**                                                                                                                                                                                                                          |
| M1  | 响应式侧边栏        | `AppSidebar.svelte`                                       | 移动端 Sheet 抽屉式侧边栏（shadcn Sidebar 组件内置支持）                                                                                                                                                                                           |
| M2  | 看板移动适配        | `src/lib/components/board/KanbanBoard.svelte` 修改        | (a) 移动端 (`md:` 断点 768px 以下) 看板列改为垂直堆叠，每列折叠为 Accordion；(b) 桌面端保持现有横向排列不变；(c) 可选：横向滚动 + CSS `scroll-snap-type: x mandatory` 作为替代方案                                                                 |
| M3  | Data Table 移动适配 | `src/routes/project/[id]/+page.svelte` 修改               | (a) 移动端隐藏 Table 组件，改用卡片列表布局（复用 TaskCard 组件）；(b) 卡片列表只显示关键信息；(c) 过滤/排序面板移动端改为底部 Sheet 弹出；(d) Tailwind `md:hidden` / `hidden md:block` 切换两种布局                                               |
| M4  | 任务详情移动适配    | `src/routes/project/[id]/task/[taskId]/+page.svelte` 修改 | (a) 移动端详情面板全屏显示；(b) Tabs 改为底部固定 Tab Bar；(c) 元数据区域改为可折叠 Accordion；(d) 返回按钮固定在顶部                                                                                                                              |
| M5  | 触控优化            | 全局                                                      | (a) 拖拽操作：增加 `long-press` 触发（300ms touchstart 后触发 drag）；(b) 按钮/Checkbox 最小触控区域 `min-h-[44px] min-w-[44px]`；(c) 拖拽手柄在移动端显示为图标，宽度 >= 44px                                                                     |

### 模块7: 端到端加密 (E2EE) -- 已完成

| #   | 步骤                     | 文件                                                 | 说明                                                                                                                                                            |
| --- | ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Task 类型扩展            | `src/lib/matrix/types.ts`                            | `Task` 接口新增 `encrypted?: boolean` 字段                                                                                                                      |
| E2  | 加密状态检测             | `src/lib/matrix/room-utils.ts`                       | `isRoomEncrypted(room)` -- 检查 `m.room.encryption` state event；`roomToTask()` 中自动读取加密状态                                                              |
| E3  | 创建任务加密             | `src/lib/stores/tasks.svelte.ts`                     | `createTask()` 接收 `encrypted` 参数，在 `initial_state` 中条件加入 `m.room.encryption` 事件 (algorithm: `m.megolm.v1.aes-sha2`)                                |
| E4  | 创建项目加密             | `src/lib/stores/projects.svelte.ts`                  | `createProject()` 接收 `encrypted` 参数，Space 本身不支持加密但模板子房间跟随加密设置                                                                           |
| E5  | 任务创建 Dialog 加密开关 | `TaskCreateDialog.svelte`                            | 新增 Switch + Lock 图标，`encrypt.task_option` i18n                                                                                                             |
| E6  | 项目创建加密开关         | `AppSidebar.svelte`                                  | 创建项目表单新增 Switch + Lock 图标，`encrypt.label` i18n                                                                                                       |
| E7  | 看板卡片加密标识         | `KanbanCard.svelte`                                  | `task.encrypted` 为 true 时显示 Lock 图标                                                                                                                       |
| E8  | 任务详情加密标识         | `src/routes/project/[id]/task/[taskId]/+page.svelte` | header 区域显示加密 Badge                                                                                                                                       |
| E9  | 加密 i18n                | `zh.ts` + `en.ts`                                    | `encrypt.label` / `encrypt.description` / `encrypt.encrypted` / `encrypt.unencrypted` / `encrypt.task_option` / `encrypt.project_option` / `encrypt.warning_as` |

> **重要说明：** Matrix Space（项目）本身不支持 E2EE，只有子房间（任务 Room）可以加密。E2EE 只保护消息流（评论、附件），state event（`com.tamarix.*`）仍然是明文。加密房间中的内容无法被 AS Bot 读取，P3 AS 增强层需考虑此限制。
