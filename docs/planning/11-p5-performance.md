> [项目计划](./README.md) / P5 数据加载与交互性能优化

# P5 -- 数据加载与交互性能优化

**目标：** 解决当前数据加载和操作卡顿问题，先通过性能观测确认瓶颈归属，再分层优化 Matrix 同步、前端缓存、派生计算、列表渲染、搜索和报表。

**核心问题：** 现在不能直接判断是 API 慢还是前端慢。P5 第一阶段必须先加测量点，把每次“加载任务 / 更新状态 / 切换视图 / 搜索 / 打开详情”的耗时拆成 Matrix SDK、数据转换、派生计算、DOM 渲染四段。

**架构原则：前端先稳住，AS 作为加速层。** Tamarix 的基础体验必须在没有 AS 时可用；AS 可以提供索引、批量操作和聚合查询加速，但不能成为普通任务列表可用性的硬依赖。

---

## 初步判断

基于当前代码结构，卡顿高风险点集中在前端数据层和渲染层，但仍需通过 P5-1 的指标验证。

| 位置 | 当前行为 | 风险 |
|------|----------|------|
| `src/lib/stores/tasks.svelte.ts` | `fetchTasksFromRooms()` 每次从 `client.getRooms()` 全量过滤任务房间，并 `map(roomToTask)` 全量重建数组 | 任务越多，每次同步、状态修改、批量操作后都会触发 O(n) 转换和全量 UI 更新 |
| `src/lib/stores/projects.svelte.ts` | 每次 sync 都全量扫描 rooms 并重建项目数组 | 项目数量和房间数量变大后 sidebar/dashboard 会被频繁刷新 |
| `src/lib/matrix/client.ts` | `onSyncUpdate()` 对 `PREPARED` 和每次 `SYNCING` 都直接回调 | Matrix sync 频率可能被放大成前端全量重算频率 |
| `src/routes/project/[id]/+page.svelte` | 过滤、排序、自定义字段值读取、可选看板分组都依赖完整任务数组 | 搜索/筛选/切视图时会重复扫描任务列表 |
| `src/routes/dashboard/+page.svelte` | 多个 `$derived` 分别 filter 同一任务数组，桌面端渲染全部我的任务 | 首页可能成为大列表渲染热点 |
| `src/routes/search/+page.svelte` | 本地搜索对 `tasks.tasks` 即时全量搜索 | 输入过程中可能每键触发全量过滤 |
| `CommandPalette.svelte` | 打开命令面板时列出全部任务 | 大任务量下弹窗打开和输入可能卡顿 |

> 推断：如果 Matrix 请求本身耗时不高，但状态修改后 UI 仍卡，优先优化 store 增量缓存、sync 防抖和列表虚拟化；如果 Matrix `/sync` 或 `sendStateEvent` 慢，则需要 AS 加速、乐观更新和批量写入策略。

---

## 性能目标

| 场景 | P5 目标 | 说明 |
|------|---------|------|
| 首次进入项目任务列表 | 1000 个任务 < 1.5s 可交互 | 不要求所有二级元数据同步完成 |
| 状态切换/拖拽 | 本地反馈 < 100ms，最终同步可异步完成 | 使用乐观更新，失败回滚 |
| 搜索输入 | 每键主线程阻塞 < 50ms | 本地搜索需防抖或索引化 |
| 列表滚动 | 60fps 附近，无明显掉帧 | 大列表必须分页或虚拟滚动 |
| 看板切换 | 1000 个任务 < 300ms | 分组结果缓存，避免重复 sort |
| Dashboard 打开 | < 500ms 展示关键统计 | 次要列表延迟渲染或限制数量 |

---

## 实施状态总览

| 模块 | 说明 | 状态 | 待完成项 |
|------|------|------|----------|
| 模块1: 性能观测 | 拆分 API/SDK/转换/渲染耗时 | 部分完成 | Debug 面板、基准脚本 |
| 模块2: 任务 Store 增量缓存 | Map 索引、按项目索引、局部更新 | 部分完成 | Store 单测、事件级删除校验 |
| 模块3: Sync 防抖与事件过滤 | 合并 sync 更新，只处理相关 room/event | 部分完成 | 事件级监听过滤 |
| 模块4: 乐观更新 | 状态/优先级/指派人等操作立即更新 UI | 部分完成 | pending 状态 UI、批量失败明细 |
| 模块5: 列表与看板渲染优化 | 虚拟滚动、分页策略、稳定引用 | 部分完成 | 虚拟滚动、看板列虚拟化 |
| 模块6: 搜索与命令面板优化 | 防抖、本地索引、结果限制、AS 优先 | 部分完成 | 本地索引、Command Palette 索引 |
| 模块7: 报表与 Dashboard 降本 | 聚合缓存、懒计算、按需渲染 | 部分完成 | 报表聚合缓存、版本页聚合 |
| 模块8: AS 性能接口增强 | 聚合查询、批量操作、索引同步状态 | 计划中 | A1 ~ A8 |

> 代码实施状态（2026-06-02）：已新增 `src/lib/utils/performance.ts`；`onSyncUpdate()` 已默认防抖；`tasks.svelte.ts` 已改为 roomId/projectId 缓存并提供局部刷新和乐观更新；项目页、详情页、Dashboard、搜索页、Command Palette 已接入核心降本路径。

---

## 模块1: 性能观测

先确认“慢在哪里”，再动结构。观测点默认仅开发环境启用，生产环境通过设置开关打开。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| P5-1 | 新增性能工具 | `src/lib/utils/performance.ts` | 封装 `performance.mark/measure`、耗时分段、慢操作阈值 | 已完成 |
| P5-2 | 任务加载分段 | `src/lib/stores/tasks.svelte.ts` | 记录 `getRooms`、`filter isTaskRoom`、`parent filter`、`roomToTask`、state 写入耗时 | 已完成 |
| P5-3 | 项目加载分段 | `src/lib/stores/projects.svelte.ts` | 记录项目扫描和 `roomToProject` 耗时 | 已完成 |
| P5-4 | Matrix 写操作分段 | `state-events.ts` 调用点 | 记录 `sendStateEvent/createRoom` 请求耗时和 sync 回写耗时 | 计划中 |
| P5-5 | 页面交互测量 | `project/[id]/+page.svelte` | 记录搜索、排序、切换 list/board、分页变化后的阻塞时间 | 计划中 |
| P5-6 | Long Task 观测 | `+layout.svelte` | 使用 `PerformanceObserver` 记录 >50ms 主线程阻塞 | 计划中 |
| P5-7 | 性能 Debug 面板 | `settings` 或开发浮层 | 展示最近慢操作、任务数量、sync 次数、渲染热点 | 计划中 |
| P5-8 | 基准脚本 | `docs/performance/` | 记录 100/500/1000/5000 任务下的基准结果 | 计划中 |

### 判定口径

| 现象 | 更可能是 API/Matrix 问题 | 更可能是前端问题 |
|------|--------------------------|------------------|
| `sendStateEvent` 耗时高，UI 等待期间无本地反馈 | 是 | 否 |
| `/sync` 到达慢，SDK 房间状态长时间不更新 | 是 | 否 |
| Matrix 请求已完成，但页面仍卡住或输入延迟 | 否 | 是 |
| `roomToTask` / filter / sort 耗时高 | 否 | 是 |
| 切换 board/list 或打开 Command Palette 卡 | 否 | 是 |
| 少量任务不卡，大量任务线性变慢 | 可能 | 大概率是 |

---

## 模块2: 任务 Store 增量缓存

当前 `tasks` 是单一数组，刷新时全量替换。P5 需要改成内部 Map 缓存，对外仍保持数组接口，降低页面改动成本。

### 目标结构

```typescript
interface TasksCache {
  byRoomId: Map<string, Task>;
  byProjectId: Map<string, Set<string>>;
  roomVersion: Map<string, string>;
  allTaskIds: string[];
}
```

`roomVersion` 可由关键 state event 的 event id / timestamp 组合生成；版本未变化时复用原 Task 对象，避免触发无意义渲染。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| T1 | Store 内部改 Map | `tasks.svelte.ts` | 保留 `get tasks()`，内部改为 `byRoomId` + 派生数组 | 计划中 |
| T2 | 项目索引 | `tasks.svelte.ts` | 维护 `projectRoomId -> taskIds`，项目页不再从全部任务中过滤 | 计划中 |
| T3 | `getTasksByProject()` | `tasks.svelte.ts` | 项目页调用明确接口，避免 `projectTasks = tasks.tasks` 混用 | 计划中 |
| T4 | Task 对象复用 | `room-utils.ts` / `tasks.svelte.ts` | room 状态未变化时复用旧对象，减少 Svelte diff | 计划中 |
| T5 | 局部刷新 | `tasks.svelte.ts` | 增加 `refreshTask(roomId)`，状态/优先级/指派人修改后只刷新单个任务 | 计划中 |
| T6 | 批量刷新 | `tasks.svelte.ts` | 批量操作只刷新受影响 roomIds，再合并数组 | 计划中 |
| T7 | 加载状态分离 | `tasks.svelte.ts` | 区分 `isInitialLoading`、`isRefreshing`、`pendingRoomIds`，避免每次小更新显示骨架屏 | 计划中 |
| T8 | 项目页接入 | `project/[id]/+page.svelte` | 使用 `getTasksByProject(projectId)` | 计划中 |
| T9 | Dashboard 接入 | `dashboard/+page.svelte` | 使用 store 聚合接口或缓存后的数组 | 计划中 |
| T10 | Store 单测 | `tasks.store.test.ts` | 覆盖新增/更新/删除/跨项目索引 | 计划中 |

---

## 模块3: Sync 防抖与事件过滤

Matrix sync 是持续流。前端不能把每次 sync 状态变化都当作全量刷新信号。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| S1 | `onSyncUpdate` 增加防抖 | `src/lib/matrix/client.ts` | 默认 100-300ms 合并更新，避免连续 sync 触发多次重算 | 已完成 |
| S2 | 提供事件级监听 | `client.ts` | 基于 `RoomEvent.Timeline` / state event 类型派发 roomId 和 eventType | 计划中 |
| S3 | tasks 只监听任务相关事件 | `tasks.svelte.ts` | 仅处理 `com.tamarix.*`、`m.room.name`、`m.room.topic`、`m.space.parent` | 计划中 |
| S4 | projects 只监听 Space 相关事件 | `projects.svelte.ts` | 仅处理 `m.room.create`、`m.room.name`、`m.room.topic`、`m.space.child` | 计划中 |
| S5 | versions 只监听当前项目 Space | `versions.svelte.ts` | 避免所有 sync 都刷新版本列表 | 部分完成 |
| S6 | 页面卸载清理 | 相关 route | 确保项目页、详情页不会遗留重复监听 | 计划中 |
| S7 | 初始加载去重 | `+layout.svelte` | 避免 `onMount` 和 `$effect` 重复拉项目 | 已完成 |
| S8 | sync 指标 | 性能面板 | 展示 sync 次数、合并次数、实际刷新次数 | 计划中 |

---

## 模块4: 乐观更新

用户操作卡顿不应等待 Matrix 写入和下一次 sync。可先更新本地缓存，再异步提交；失败时恢复并提示。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| O1 | 乐观更新通用 helper | `tasks.svelte.ts` | `optimisticPatch(roomId, patch, commit)` | 计划中 |
| O2 | 状态更新乐观化 | `updateTaskStatus` | 拖拽/选择状态立即反映 | 计划中 |
| O3 | 优先级/类型/指派人乐观化 | 详情页调用点 | 避免每次修改后全量 `fetchTasksFromRooms` | 计划中 |
| O4 | 归档乐观化 | 列表/详情页 | 归档后立即从默认列表隐藏 | 计划中 |
| O5 | 批量操作进度 | `BulkActionBar` / store | 显示成功/失败数量，不阻塞整批 UI | 计划中 |
| O6 | 失败回滚 | store | 保存修改前快照，失败后恢复单个 task | 计划中 |
| O7 | pending 状态展示 | TaskCard/Table row | 正在同步的任务显示轻量 loading 状态 | 计划中 |
| O8 | E2EE/权限失败提示 | store error | 明确错误来源，避免用户误判为卡死 | 计划中 |

---

## 模块5: 列表与看板渲染优化

项目页已经有分页，但 Dashboard、搜索结果、命令面板和看板仍可能一次渲染大量任务。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| R1 | 统一大列表策略 | `components/task/` | 100 条以上默认分页或虚拟滚动 | 计划中 |
| R2 | 引入虚拟列表 | 新组件 `VirtualTaskList.svelte` | 搜索页、Dashboard、Command Palette 可复用 | 计划中 |
| R3 | Dashboard 限制渲染数量 | `dashboard/+page.svelte` | 桌面端也默认展示前 20 条，提供进入搜索/列表查看全部 | 计划中 |
| R4 | Command Palette 限制候选 | `CommandPalette.svelte` | 默认只展示最近/匹配前 50 项，不渲染全部任务 | 计划中 |
| R5 | 看板列虚拟化 | `KanbanColumn.svelte` | 单列任务过多时虚拟滚动 | 计划中 |
| R6 | 分组缓存 | `KanbanBoard.svelte` / store | 按 status 维护数组，避免每次切换都重新 group + sort | 计划中 |
| R7 | 自定义字段值缓存 | `project/[id]/+page.svelte` / store | 避免 `$effect` 每次遍历所有任务读取 room state | 计划中 |
| R8 | 派生计算合并 | Dashboard/Project page | 一次遍历得到多个计数，减少多个 `$derived(filter)` | 计划中 |
| R9 | 稳定事件回调 | TaskCard/Table/Kanban | 避免在大量 each 内创建过多临时函数造成 diff 压力 | 计划中 |
| R10 | 渲染基准 | Playwright/浏览器性能 | 记录 1000 任务下列表、看板、搜索页 FPS 和 Long Task | 计划中 |

---

## 模块6: 搜索与命令面板优化

搜索是典型大数组热点。P5 需要把即时全量扫描改成防抖 + 索引 + 结果限制。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| Q1 | 本地搜索防抖 | `search/+page.svelte` | 与 AS 搜索一致，输入 150-300ms 后再搜索 | 计划中 |
| Q2 | 搜索索引缓存 | 新 `stores/search-index.svelte.ts` | 为 title/description/ticketId/tags 维护 lower-case 拼接字段 | 计划中 |
| Q3 | 自定义字段索引 | search index | 不在每次搜索时进入 room 读取 custom field | 计划中 |
| Q4 | 搜索结果限制 | search page | 默认展示前 100 条，提示结果总数 | 计划中 |
| Q5 | Command Palette 独立索引 | `CommandPalette.svelte` | 打开时使用轻量索引，不渲染完整任务组件 | 计划中 |
| Q6 | AS 优先策略 | search page | AS 可用时优先远程索引；本地仅兜底 | 计划中 |
| Q7 | AS 请求取消 | `search.ts` | 新查询取消旧请求，避免乱序覆盖 | 计划中 |
| Q8 | 搜索基准 | docs/performance | 记录 1000/5000 任务输入延迟 | 计划中 |

---

## 模块7: 报表与 Dashboard 降本

报表和首页统计不应在每次 UI 小状态变化时重新扫描所有任务多次。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| D1 | 聚合 store | `reports.svelte.ts` / 新 `analytics.svelte.ts` | 一次遍历产出状态、优先级、负责人、逾期、版本聚合 | 计划中 |
| D2 | Dashboard 统计缓存 | `dashboard/+page.svelte` | 替换多个独立 filter 派生 | 计划中 |
| D3 | 报表按需计算 | `reports/+page.svelte` | 当前 Tab/图表可见时再计算 | 计划中 |
| D4 | 时间范围缓存 | reports store | 7/30/90/all 结果按任务版本缓存 | 计划中 |
| D5 | 图表懒加载 | reports page | 图表组件按需 import，降低初始页面成本 | 计划中 |
| D6 | 版本页聚合优化 | `versions/+page.svelte` | 避免每个版本都 filter 全任务形成 O(v*n) | 计划中 |
| D7 | 关系页降本 | `TaskRelations.svelte` | 大任务量下按需搜索关系候选 | 计划中 |
| D8 | 聚合一致性测试 | store tests | 验证缓存更新后统计正确 | 计划中 |

---

## 模块8: AS 性能接口增强

AS 不是 P5 的第一依赖，但大规模数据下需要作为加速层。

| # | 步骤 | 文件/服务 | 说明 | 状态 |
|---|-----------|------|------|------|
| A1 | AS 健康与延迟指标 | AS status API | 返回索引延迟、最后 sync 时间、任务数量 | 计划中 |
| A2 | 项目任务分页 API | AS HTTP API | `GET /api/projects/:id/tasks?limit&cursor&sort&filter` | 计划中 |
| A3 | 聚合 API | AS HTTP API | 返回 dashboard/reports 需要的计数和图表数据 | 计划中 |
| A4 | 批量操作 API | AS HTTP API | 服务端并发控制、失败明细、幂等 key | 计划中 |
| A5 | 搜索 API 增强 | AS HTTP API | 支持项目、状态、优先级、负责人、标签、自定义字段过滤 | 计划中 |
| A6 | 前端 fallback | API client | AS 超时自动回本地缓存，不阻塞页面 | 计划中 |
| A7 | E2EE 降级说明 | UI/docs | 加密房间 AS 无法索引消息内容，只索引可见 state | 计划中 |
| A8 | AS 与本地一致性指标 | 性能面板 | 展示本地任务数和 AS 索引任务数差异 | 计划中 |

---

## 推荐实施顺序

1. **先做 P5-1 ~ P5-8：** 用真实指标确认 API、SDK、转换、渲染各占多少。
2. **立刻修 T/S/O：** 任务 store 增量缓存、sync 防抖、状态修改乐观更新，这三项最可能改善“操作很卡”。
3. **再修 R/Q/D：** 大列表、搜索、看板、Dashboard、报表降本，解决任务量增长后的线性卡顿。
4. **最后做 A：** AS 分页、聚合、批量 API 作为大规模部署增强。

---

## 验收清单

| 验收项 | 标准 | 状态 |
|--------|------|------|
| 性能面板可区分 API 慢和前端慢 | 每个慢操作有分段耗时 | 计划中 |
| 状态切换不卡 UI | 点击/拖拽后 <100ms 本地反馈 | 计划中 |
| 项目任务加载不再全量重建所有 Task | 未变化任务对象可复用 | 计划中 |
| Sync 不触发无关页面全量刷新 | 只刷新相关 room/project | 计划中 |
| 搜索输入不卡 | 1000 任务下无明显输入延迟 | 计划中 |
| Command Palette 打开不卡 | 不渲染全部任务项 | 计划中 |
| Dashboard 不渲染全部我的任务 | 默认限制数量或虚拟化 | 计划中 |
| 看板大列不卡 | 单列大量任务可滚动且无明显掉帧 | 计划中 |
| AS 不可用时仍可使用 | 本地缓存路径完整 | 计划中 |

---

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| 增量缓存和 Matrix SDK 状态不一致 | UI 显示旧数据 | 每个乐观更新保留回滚快照；sync 到达后以 SDK 状态校正 |
| 过度防抖导致实时性下降 | 新消息/状态显示延迟 | 状态变更可 100ms 合并，评论/通知走事件级监听 |
| 虚拟滚动影响键盘操作和选择 | 可访问性下降 | 保留分页 fallback，并覆盖键盘选择测试 |
| AS 索引延迟造成搜索结果不全 | 用户误判数据丢失 | UI 展示 AS 索引时间和本地 fallback |
| 性能埋点污染生产日志 | 噪音和隐私风险 | 默认仅开发环境启用，生产需显式开启 debug |
