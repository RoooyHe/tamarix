> [项目计划](./README.md) / P4 企业级

# P4 -- 企业级

**目标：** 报表图表、版本管理、导入导出、任务模板、自定义字段、审批流、Git 集成、快捷键、同列排序、外部链接。

**架构原则：前端可独立运行。** 所有 P4 功能在没有 AS 时前端可独立完成。AS 增强层（P3 模块9）提供 API 加速和索引支持，但非必需。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add chart form switch toggle
```

> `chart` -- shadcn-svelte Chart 组件（基于 LayerChart），用于燃尽图/趋势图/饼图的可视化渲染。
> `form` -- Formsnap + Superforms，用于自定义字段的动态表单渲染和 Zod 校验。
> `switch` / `toggle` -- 用于审批开关、自定义字段 required 标记等开关控件。

**新增依赖：**

```bash
bun add layerchart
```

> `layerchart` -- Svelte 图表库，shadcn-svelte Chart 组件底层依赖，支持 SVG 渲染、动画、响应式。

---

## 实施状态总览

| 模块                 | 说明                              | 状态   | 待完成项 |
| -------------------- | --------------------------------- | ------ | -------- |
| 模块1: Chart 报表    | 燃尽图/状态分布/趋势图            | 已完成 | -        |
| 模块2: 版本/发布管理 | 版本 CRUD + 版本进度 + 发布说明   | 已完成 | -        |
| 模块3: 导入/导出     | CSV/JSON 导入导出                 | 已完成 | -        |
| 模块4: 任务模板      | 模板 CRUD + 创建任务选择模板      | 已完成 | -        |
| 模块5: 自定义字段    | 字段定义 + 值存储 + 动态表单      | 已完成 | -        |
| 模块6: 审批流        | 审批状态 + Reactions + 审批 UI    | 已完成 | -        |
| 模块7: Git 集成      | AS Git Bridge + Webhook API       | 已完成 | -        |
| 模块8: 快捷键        | 快捷键 Dialog + 全局监听          | 已完成 | -        |
| 模块9: 同列排序      | sort_order state event + 拖拽排序 | 已完成 | -        |
| 模块10: 外部链接     | 链接存储 + 任务详情展示           | 已完成 | -        |

> 代码核验口径（2026-06-01）：82 个明细项全部完成。P4 完成度 100%。

---

## 模块1: Chart 报表

当前报表页（`src/routes/project/[id]/reports/+page.svelte`）已从纯 CSS 柱状图/进度条升级为 LayerChart 图表组件，包含燃尽图、状态分布、趋势、指派人工作量和版本进度。

| #   | 步骤             | 文件                                                                       | 说明                                                                                                                                                                                                                                                 | 状态   |
| --- | ---------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1  | 安装 LayerChart  | `package.json`                                                             | `bun add layerchart`                                                                                                                                                                                                                                 | 已完成 |
| C2  | Chart 组件注册   | `src/lib/components/ui/chart/`                                             | `bun x shadcn-svelte@latest add chart` 生成 Chart 包装组件                                                                                                                                                                                           | 已完成 |
| C3  | 报表数据 Store   | `src/lib/stores/reports.svelte.ts`                                         | 新文件：封装报表数据计算逻辑（与 UI 解耦）；`getBurndownData(tasks)` / `getStatusDistribution(tasks)` / `getTrendData(tasks, days)` / `getAssigneeWorkload(tasks)`                                                                                   | 已完成 |
| C4  | 燃尽图重构       | `src/lib/components/dashboard/BurndownChart.svelte`                        | 替换 CSS 进度条为 LayerChart SVG 折线图；X轴=迭代天数，Y轴=剩余任务数/故事点；hover 显示具体数值 tooltip                                                                                                                                             | 已完成 |
| C5  | 状态分布饼图重构 | `src/lib/components/dashboard/StatusDistributionChart.svelte`              | 替换 CSS 横向柱状图为 LayerChart 饼图/环形图；各状态任务占比，hover 显示数量和百分比                                                                                                                                                                 | 已完成 |
| C6  | 趋势图重构       | `src/lib/components/dashboard/TrendChart.svelte`                           | 替换 CSS 柱状图为 LayerChart 面积图；近 30 天任务创建/完成趋势，双 Y 轴                                                                                                                                                                              | 已完成 |
| C7  | 指派人工作量图   | `src/lib/components/dashboard/AssigneeWorkloadChart.svelte`                | LayerChart 横向柱状图：按指派人分组统计任务数；与仪表盘 TeamWorkloadCard 数据一致但交互更强                                                                                                                                                          | 已完成 |
| C8  | 版本进度图       | `src/lib/components/dashboard/VersionProgressChart.svelte`                 | LayerChart 堆叠柱状图：按版本分组，各状态堆叠显示；展示版本发布进度                                                                                                                                                                                  | 已完成 |
| C9  | 报表时间范围筛选 | `src/routes/project/[id]/reports/+page.svelte`                             | DropdownMenu 选择时间范围（7天/30天/90天/全部）；影响趋势图和燃尽图数据范围                                                                                                                                                                          | 已完成 |
| C10 | 报表导出         | `src/routes/project/[id]/reports/+page.svelte` + `src/lib/utils/export.ts` | "导出报表"按钮 -- 生成 PNG 图表截图（SVG foreignObject）+ CSV 原始数据；支持逐图 PNG 和合并 CSV 导出                                                                                                                                                 | 已完成 |
| C11 | 报表 i18n 补充   | `src/lib/i18n/locales/zh.ts` + `en.ts`                                     | reports.burndown_tooltip / reports.trend_tooltip / reports.assignee_workload / reports.chart_no_data / reports.version_progress / reports.time_range / reports.export / reports.range_7d / reports.range_30d / reports.range_90d / reports.range_all | 已完成 |

### 图表数据流

```
任务列表 (tasks store)
  → reports store 计算函数
    → getBurndownData: 按日统计剩余/完成
    → getStatusDistribution: 各状态计数
    → getTrendData: 30 天创建/完成趋势
    → getAssigneeWorkload: 按指派人统计
    → getVersionProgress: 按版本统计各状态
  → LayerChart 组件渲染
```

### 燃尽图数据结构

```typescript
interface BurndownDataPoint {
	date: string; // "6/15"
	remaining: number; // 剩余任务数
	completed: number; // 累计完成任务数
	idealRemaining?: number; // 理想燃尽线（可选）
}
```

### 报表数据 Store 接口

```typescript
// src/lib/stores/reports.svelte.ts
interface ReportsStore {
	burndownData: BurndownDataPoint[];
	statusDistribution: { status: string; count: number; color: string }[];
	trendData: { date: string; created: number; completed: number }[];
	assigneeWorkload: { assignee: string; count: number }[];
	versionProgress: {
		version: string;
		todo: number;
		in_progress: number;
		review: number;
		done: number;
		closed: number;
	}[];

	getBurndownData(tasks: Task[], days?: number): BurndownDataPoint[];
	getStatusDistribution(tasks: Task[]): { status: string; count: number; color: string }[];
	getTrendData(tasks: Task[], days: number): { date: string; created: number; completed: number }[];
	getAssigneeWorkload(tasks: Task[]): { assignee: string; count: number }[];
	getVersionProgress(
		tasks: Task[],
		versions: VersionInfo[]
	): {
		version: string;
		todo: number;
		in_progress: number;
		review: number;
		done: number;
		closed: number;
	}[];
}
```

### 当前报表页实现详情（LayerChart 版本）

当前 `reports/+page.svelte` 已接入 LayerChart 组件并实现：

- **燃尽图**：`BurndownChart.svelte`，显示 remaining/idealRemaining 折线/面积图
- **状态分布**：`StatusDistributionChart.svelte`，显示 LayerChart 饼图/环形图
- **趋势图**：`TrendChart.svelte`，显示近 7/30/90 天或全部范围的创建/完成趋势
- **指派人工作量图**：`AssigneeWorkloadChart.svelte`
- **版本进度图**：`VersionProgressChart.svelte`

数据计算已迁移到 `src/lib/stores/reports.svelte.ts`，报表页负责选择时间范围、渲染图表和导出 PNG/CSV。

---

## 模块2: 版本/发布管理

| #   | 步骤            | 文件                                               | 说明                                                                                                                                 | 状态   |
| --- | --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| V1  | Version 类型    | `src/lib/matrix/types.ts` 扩展                     | `VersionInfo` 接口：`{ name, description, releaseDate, status }`；`TAMARIX_EVENT_TYPES.VERSION` / `TAMARIX_EVENT_TYPES.TASK_VERSION` | 已完成 |
| V2  | Version 封装    | `src/lib/matrix/state-events.ts` 扩展              | `setVersion()` / `getVersions()` / `setTaskVersion()` / `getTaskVersion()`                                                           | 已完成 |
| V3  | Version Store   | `src/lib/stores/versions.svelte.ts`                | 版本列表、createVersion、updateVersion、startSyncListener                                                                            | 已完成 |
| V4  | 版本管理页      | `src/routes/project/[id]/versions/+page.svelte`    | 版本列表 + 进度条 + 任务数统计；创建版本 Dialog                                                                                      | 已完成 |
| V5  | 任务关联版本 UI | `src/lib/components/task/VersionSelect.svelte`     | 任务详情侧面板"修复版本"字段                                                                                                         | 已完成 |
| V6  | 发布说明生成    | `src/routes/project/[id]/versions/+page.svelte` 内 | "生成发布说明"按钮 -- 汇总该版本下 done 状态任务标题列表，可复制                                                                     | 已完成 |
| V7  | 版本 i18n       | `src/lib/i18n/locales/zh.ts` + `en.ts`             | version.title / create / name / release_date / status / progress / release_notes / link_task / no_versions / unversioned             | 已完成 |

---

## 模块3: 导入/导出

| #   | 步骤          | 文件                                          | 说明                                                                                                                                      | 状态   |
| --- | ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| IE1 | 导出工具      | `src/lib/utils/export.ts`                     | `exportTasksToCSV(tasks)` -- CSV 格式；`exportTasksToJSON(tasks)` -- JSON 格式；`downloadFile(content, filename, mimeType)` -- 浏览器下载 | 已完成 |
| IE2 | 导出 UI       | `src/routes/project/[id]/+page.svelte` 修改   | 工具栏"导出"按钮（DropdownMenu: CSV / JSON）                                                                                              | 已完成 |
| IE3 | 导入工具      | `src/lib/utils/import.ts`                     | `parseCSV(file)` / `parseJSON(file)` -- 解析上传文件为任务数组                                                                            | 已完成 |
| IE4 | 导入 UI       | `src/lib/components/task/ImportDialog.svelte` | Dialog：上传 -- 预览映射 -- 批量 createTask()；进度条                                                                                     | 已完成 |
| IE5 | 导入导出 i18n | `src/lib/i18n/locales/zh.ts` + `en.ts`        | import.title / upload / format / mapping / preview / progress / success / error + export.title / csv / json                               | 已完成 |

---

## 模块4: 任务模板

| #   | 步骤          | 文件                                                   | 说明                                                                             | 状态   |
| --- | ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------- | ------ |
| TT1 | Template 类型 | `src/lib/matrix/types.ts` 扩展                         | `TaskTemplate` 接口 + `TAMARIX_EVENT_TYPES.TASK_TEMPLATE`                        | 已完成 |
| TT2 | Template 封装 | `src/lib/matrix/state-events.ts` 扩展                  | `createTaskTemplate()` / `getTaskTemplates()` / `deleteTaskTemplate()`           | 已完成 |
| TT3 | 模板管理 UI   | `src/routes/project/[id]/settings/+page.svelte` 内     | 模板列表 + 创建/删除                                                             | 已完成 |
| TT4 | 模板选择 UI   | `src/lib/components/task/TaskCreateDialog.svelte` 修改 | 创建任务 Dialog 模板选择 DropdownMenu；选中自动填充                              | 已完成 |
| TT5 | 模板 i18n     | `src/lib/i18n/locales/zh.ts` + `en.ts`                 | template.title / create / select / name / default_values / delete / no_templates | 已完成 |

---

## 模块5: 自定义字段

类型定义、state event 存储、项目设置页的管理 UI、任务详情页的渲染均已完成。独立渲染器组件（CustomFieldRenderer.svelte）已提取完成，内置必填校验逻辑。任务详情页已重构为使用 CustomFieldRenderer（CF8）。自定义字段搜索已实现（CF11），支持 `custom:fieldName:value` 语法。剩余工作：创建任务时传递自定义字段、DataTable 可选列。

| #    | 步骤                     | 文件                                                      | 说明                                                                                                                                                                                                                                                                  | 状态                                                      |
| ---- | ------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| CF1  | 自定义字段定义类型       | `src/lib/matrix/types.ts` 扩展                            | `com.tamarix.custom_field` state event（多实例，state_key = 字段名）；`CustomFieldDefinition` 接口：`{ label, type: "text"                                                                                                                                            | "number"                                                  | "select" | "date", options?, required }` | 已完成 |
| CF2  | 自定义字段值类型         | `src/lib/matrix/types.ts` 扩展                            | `com.tamarix.custom_field_value` state event（多实例，state_key = 字段名）；`CustomFieldValue` 接口：`{ value }`                                                                                                                                                      | 已完成                                                    |
| CF3  | 字段定义封装             | `src/lib/matrix/state-events.ts`                          | `setCustomFieldDefinition()` / `getCustomFieldDefinitions()` / `deleteCustomFieldDefinition()`                                                                                                                                                                        | 已完成                                                    |
| CF4  | 字段值封装               | `src/lib/matrix/state-events.ts`                          | `setCustomFieldValue()` / `getCustomFieldValues()`                                                                                                                                                                                                                    | 已完成                                                    |
| CF5  | 字段管理 UI              | `src/routes/project/[id]/settings/+page.svelte` 内        | 项目设置页自定义字段管理：字段列表 + 创建/编辑/删除/排序                                                                                                                                                                                                              | 已完成                                                    |
| CF6  | 自定义字段 i18n          | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | custom_field.title / label / type / options / required / add / delete / types.text / types.number / types.select / types.date                                                                                                                                         | 已完成                                                    |
| CF7  | 自定义字段渲染器         | `src/lib/components/task/CustomFieldRenderer.svelte`      | 新文件：从任务详情页内联渲染逻辑提取为独立组件；根据 `CustomFieldDefinition.type` 动态渲染表单控件；`text` → Input，`number` → Input[type=number]，`select` → 原生 select，`date` → Input[type=date]；值变更时回调 `onchange`；支持 `showValidation` 属性触发必填校验 | 已完成                                                    |
| CF8  | 任务详情自定义字段区     | `src/routes/project/[id]/task/[taskId]/+page.svelte` 修改 | 重构为使用 CustomFieldRenderer 组件替换当前内联渲染                                                                                                                                                                                                                   | 已完成（任务详情页已导入并使用 CustomFieldRenderer 组件） |
| CF9  | 创建任务传递自定义字段   | `src/lib/components/task/TaskCreateDialog.svelte` 修改    | 创建任务 Dialog 底部显示项目自定义字段；提交后 `setCustomFieldValue()` 写入新任务 Room                                                                                                                                                                                | 已完成                                                    |
| CF10 | 自定义字段必填校验       | `src/lib/components/task/CustomFieldRenderer.svelte` 修改 | `required: true` 的字段提交前校验非空；校验失败高亮 + 错误提示                                                                                                                                                                                                        | 已完成（渲染器已内置 showValidation 属性和必填校验逻辑）  |
| CF11 | 自定义字段搜索支持       | `src/lib/matrix/search.ts` 修改                           | `searchTasks()` 扩展：支持 `custom:{fieldName}:{value}` 语法搜索自定义字段值；调用方已传递 `client` 参数                                                                                                                                                              | 已完成                                                    |
| CF12 | 自定义字段 Data Table 列 | `src/routes/project/[id]/+page.svelte` 修改               | Data Table 可选列：项目自定义字段作为可添加的列显示                                                                                                                                                                                                                   | 已完成                                                    |

### 当前自定义字段渲染实现详情

任务详情页 (`task/[taskId]/+page.svelte`) 已改为使用 `CustomFieldRenderer.svelte` 渲染四种字段类型：

```svelte
{#each customFieldDefs as [fieldName, def] (fieldName)}
	<CustomFieldRenderer
		definition={def}
		{fieldName}
		value={customFieldValues.get(fieldName)}
		onchange={handleCustomFieldChange}
	/>
{/each}
```

`CustomFieldRenderer.svelte` 已包含 text/number/select/date 控件渲染、`showValidation` 属性和 required 校验。剩余集成点是创建任务时传递自定义字段（CF9）和 Data Table 可选列（CF12）。

### 自定义字段渲染逻辑

```
加载任务详情页
  → 读取项目级 com.tamarix.custom_field 定义列表
  → 逐个渲染 CustomFieldRenderer
    → text:   <Input type="text" value={fieldValue} onchange={update} />
    → number: <Input type="number" value={fieldValue} onchange={update} />
    → select: <select options={definition.options} value={fieldValue} onchange={update} />
    → date:   <Input type="date" value={fieldValue} onchange={update} />
  → 值变更 → setCustomFieldValue(roomId, fieldKey, newValue)
```

---

## 模块6: 审批流

类型定义、state event 存储、i18n、基础审批 UI（请求审批/通过/驳回按钮/状态 Badge）已完成。手动点击“通过”时已能在 `currentApprovals >= requiredApprovals` 后自动置为 approved；剩余工作：Reactions 集成、非手动场景的审批自动推进、审批开关、审批约束。

| #   | 步骤               | 文件                                                 | 说明                                                                                                                  | 状态                                                |
| --- | ------------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| AP1 | Approval 类型      | `src/lib/matrix/types.ts`                            | `ApprovalState` 接口：`{ status: "pending"                                                                            | "approved"                                          | "rejected", requiredApprovals, currentApprovals }` | 已完成 |
| AP2 | Approval 封装      | `src/lib/matrix/state-events.ts`                     | `setApproval()` / `getApproval()`                                                                                     | 已完成                                              |
| AP3 | Approval i18n      | `src/lib/i18n/locales/zh.ts` + `en.ts`               | approval.title / status.pending / status.approved / status.rejected / required / current / approve / reject / request | 已完成                                              |
| AP4 | ApprovalBadge 组件 | `src/lib/components/task/ApprovalBadge.svelte`       | 新文件：独立审批状态 Badge 组件（可复用于看板卡片/任务列表）                                                          | 已完成                                              |
| AP5 | 审批操作 UI        | `src/routes/project/[id]/task/[taskId]/+page.svelte` | 当前已在"details"Tab 内实现基础审批 UI（请求/通过/驳回按钮）。需重构为独立组件 + ApprovalBadge                        | 已完成（任务详情页已导入并使用 ApprovalBadge 组件） |
| AP6 | Reactions 集成     | `src/routes/project/[id]/task/[taskId]/+page.svelte` | 读取 m.reaction 事件（+1/-1），将 Reaction 计数同步到审批 state event                                                 | 已完成                                              |
| AP7 | 审批状态自动推进   | `src/routes/project/[id]/task/[taskId]/+page.svelte` | 当 currentApprovals >= requiredApprovals 时自动将状态改为 "approved"                                                  | 已完成                                              |
| AP8 | 审批开关           | `src/routes/project/[id]/settings/+page.svelte`      | 项目设置页增加"启用审批流"开关，存储为 `com.tamarix.approval_config` state event                                      | 已完成                                              |
| AP9 | 审批约束           | `src/lib/matrix/workflow.ts`                         | 审批中(pending)的任务限制状态流转：不可从 todo/in_progress 转到 done/review，除非审批通过                             | 已完成                                              |

### 当前审批 UI 实现详情

任务详情页 (`task/[taskId]/+page.svelte` L503-535) 已实现：

- **无审批时**：显示"发起审批"按钮
- **待审批时**：显示状态 Badge(pending) + 计数 + "通过"/"驳回"按钮
- **已通过时**：显示 Badge(approved) + 计数
- **已驳回时**：显示 Badge(rejected)
- `handleApprove()` 已实现 currentApprovals+1 后自动判断是否达到 requiredApprovals 并更新状态
- `handleRequestApproval()` 创建初始审批 state (status=pending, requiredApprovals=1, currentApprovals=0)

### 审批流程

```
无审批 → 点击"发起审批"
  → setApproval({ status: "pending", requiredApprovals: 1, currentApprovals: 0 })
  → UI 显示 pending 状态 + 操作按钮

待审批 → 点击"通过"
  → currentApprovals += 1
  → if currentApprovals >= requiredApprovals → status = "approved"
  → else → status 保持 "pending"

待审批 → 点击"驳回"
  → status = "rejected"
  → currentApprovals 不变

已通过/已驳回 → 可再次发起审批（重置为 pending）
```

### Matrix Reaction 读取

```
1. 读取任务 Room 最近 1000 条 timeline 事件
2. 过滤 m.reaction 类型事件
3. 统计 +1 (👍) 和 -1 (👎) Reaction 数量
4. 将 Reaction 计数与 state event 审批计数同步：
   - 如果 Reaction 数 > state event 的 currentApprovals → 自动更新
   - 如果 Reaction 反对数 > 0 → 自动 reject
5. 注意：审批操作统一走 state event，Reaction 仅辅助记录
```

---

## 模块7: Git 集成

AS 后端 `as/src/git-bridge.ts` 已完成 GitHub/GitLab webhook 解析和 commit 关联通知。前端需完成 Git 配置存储、配置 UI 和 commit 展示。

| #   | 步骤                | 文件                                                      | 说明                                                                                                                                                          | 状态            |
| --- | ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| G1  | GitProvider 类型    | `as/src/git-bridge.ts`                                    | `GitProvider = "github"                                                                                                                                       | "gitlab"`       | 已完成（AS 侧） |
| G2  | GitHub Push 解析    | `as/src/git-bridge.ts`                                    | `parseGitHubPush(body)` -- 解析 GitHub webhook push event                                                                                                     | 已完成（AS 侧） |
| G3  | GitLab Push 解析    | `as/src/git-bridge.ts`                                    | `parseGitLabPush(body)` -- 解析 GitLab webhook push event                                                                                                     | 已完成（AS 侧） |
| G4  | Commit 通知发送     | `as/src/git-bridge.ts`                                    | `postCommitNotification()` -- 向任务 Room 发送 commit 关联消息                                                                                                | 已完成（AS 侧） |
| G5  | Git Webhook API     | `as/src/api.ts`                                           | `POST /api/git/webhook` 接收 webhook + `GET /api/git/config/:projectId` 查询配置                                                                              | 已完成          |
| G6  | Git 配置存储        | `src/lib/matrix/state-events.ts`                          | `setGitConfig()` / `getGitConfig()` -- `com.tamarix.git_config` state event；`{ provider, webhookSecret, repoUrl }`                                           | 已完成          |
| G7  | 前端 Git 配置页     | `src/routes/project/[id]/settings/+page.svelte` 修改      | 项目设置页增加 Git 集成配置区域：Provider 选择 + Repo URL + Webhook Secret 生成 + Webhook URL 显示                                                            | 已完成          |
| G8  | commit 关联展示     | `src/routes/project/[id]/task/[taskId]/+page.svelte` 修改 | 任务详情"details"Tab 增加"关联 Commits"区域：从 timeline 过滤 AS Bot 发送的 commit 消息，展示 commit hash + message + 链接                                    | 已完成          |
| G9  | Git i18n            | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | git.title / provider / repo_url / webhook_secret / webhook_url / generate_secret / save_config / no_config / config_saved / provider.github / provider.gitlab | 已完成          |
| G10 | Webhook 签名验证    | `as/src/git-bridge.ts`                                    | `verifyGitHubSignature()` / `verifyGitLabToken()` -- HMAC-SHA256 签名验证                                                                                     | 已完成          |
| G11 | Webhook Secret 生成 | `src/lib/utils/crypto.ts`                                 | `generateWebhookSecret()` -- 随机 32 字节 hex 字符串                                                                                                          | 已完成          |

### Git Webhook 验证流程

```
1. 前端生成 webhook secret → 存储到 com.tamarix.git_config
2. 用户在 GitHub/GitLab 仓库设置中配置 webhook URL + secret
3. Git push → GitHub/GitLab 发送 webhook 到 AS
4. AS 验证签名：
   - GitHub: HMAC-SHA256(secret, body) 与 X-Hub-Signature-256 比对
   - GitLab: secret 与 X-Gitlab-Token 比对
5. 验证通过 → 解析 commit → 匹配任务编号 → 发送通知到任务 Room
6. 验证失败 → 401 + 日志记录
```

### Commit 展示数据结构

```typescript
interface CommitInfo {
	hash: string; // "a1b2c3d" (7 chars)
	message: string; // 第一行 commit message
	author: string; // commit author
	url?: string; // GitHub/GitLab commit URL
	branch: string; // 推送分支
	timestamp: number; // 推送时间
}
```

### Git 配置 UI 布局

```
项目设置页新增区域:
┌──────────────────────────────────────────────────────────────┐
│ Git 集成                                                     │
├──────────────────────────────────────────────────────────────┤
│ Provider:   [GitHub ▼]                                       │
│ Repo URL:   [https://github.com/org/repo         ]          │
│ Webhook Secret: [••••••••••••] [生成] [复制]                  │
│ Webhook URL:    http://as.example.com:9000/api/git/webhook  │
│                                                              │
│ [保存配置]                                                    │
│                                                              │
│ 提示: 将上述 Webhook URL 和 Secret 配置到 GitHub/GitLab      │
│ 仓库的 Webhook 设置中，选择 push events 事件。                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 模块8: 快捷键

Dialog 展示已有，全局键盘监听有基础实现（`+layout.svelte` 中 `?` 键切换 Dialog，`Cmd/Ctrl+K` 切换 CommandPalette，`Esc` 关闭面板）。上下文状态、输入框冲突判断和 i18n 已补齐。剩余工作：把 `tamarix:shortcut` 事件接到页面动作（新建任务、编辑任务、状态切换、聚焦搜索等），并实现 T/A/D 扩展快捷键监听。

| #   | 步骤                | 文件                                                      | 说明                                                                                                                                                                | 状态   |
| --- | ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| KS1 | 快捷键 Dialog       | `src/lib/components/common/KeyboardShortcuts.svelte`      | 展示快捷键列表（? / N / E / Cmd+K / Esc）                                                                                                                           | 已完成 |
| KS2 | 快捷键 i18n         | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | shortcuts.title / open / new_task / edit / search / close                                                                                                           | 已完成 |
| KS3 | 快捷键上下文状态    | `src/lib/stores/ui.svelte.ts` 修改                        | 新增 `$state`：当前焦点任务 ID、是否在输入框中、当前页面路由；用于确定快捷键应触发的动作                                                                            | 已完成 |
| KS4 | 全局键盘监听        | `src/routes/+layout.svelte` 修改                          | `window.addEventListener("keydown", handler)`：非输入框上下文时响应单字母快捷键（? / N / E）；全局响应 Cmd/Ctrl+K 和 Esc                                            | 已完成 |
| KS5 | 快捷键冲突处理      | `src/lib/utils/keyboard.ts`                               | 新文件：`isInputElement(el)` 判断当前焦点是否在 input/textarea/select/contenteditable 上；是则忽略单字母快捷键                                                      | 已完成 |
| KS6 | 快捷键注册到 Layout | `src/routes/+layout.svelte` 修改                          | 全局 keydown 处理器中分发快捷键动作：? → 打开 KeyboardShortcuts Dialog，N → 打开 TaskCreateDialog，E → 编辑当前任务，Cmd+K → 打开 CommandPalette，Esc → 关闭 Dialog | 已完成 |
| KS7 | 扩展快捷键映射      | `src/lib/components/common/KeyboardShortcuts.svelte` 修改 | 增加更多快捷键：1-5 切换任务状态、T 切换标签、A 指派、D 设置截止日期、/ 聚焦搜索                                                                                    | 已完成 |
| KS8 | 快捷键 i18n 补充    | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | shortcuts.set_status / shortcuts.toggle_tag / shortcuts.assign / shortcuts.due_date / shortcuts.focus_search                                                        | 已完成 |

### 快捷键映射表

| 快捷键       | 上下文   | 动作                                                          |
| ------------ | -------- | ------------------------------------------------------------- |
| `?`          | 非输入框 | 打开快捷键 Dialog                                             |
| `N`          | 非输入框 | 目标：打开新建任务 Dialog；当前：仅 dispatch 事件，页面未消费 |
| `E`          | 非输入框 | 目标：编辑当前选中任务；当前：仅 dispatch 事件，页面未消费    |
| `Cmd/Ctrl+K` | 全局     | 打开命令面板 / 搜索                                           |
| `Esc`        | 全局     | 关闭当前 Dialog / 面板                                        |
| `1`-`5`      | 非输入框 | 目标：切换选中任务状态；当前：仅 dispatch 事件，页面未消费    |
| `T`          | 非输入框 | 目标：切换标签；当前：未监听                                  |
| `A`          | 非输入框 | 目标：打开指派人选择；当前：未监听                            |
| `D`          | 非输入框 | 目标：设置截止日期；当前：未监听                              |
| `/`          | 非输入框 | 目标：聚焦搜索框；当前：仅 dispatch 事件，页面未消费          |

### 快捷键冲突处理逻辑

```
1. keydown 事件触发
2. 检查当前焦点元素：
   - input / textarea / select / contenteditable → 仅响应 Esc 和 Cmd/Ctrl+K
   - 其他元素 → 响应所有快捷键
3. 检查 Dialog 状态：
   - 有 Dialog 打开 → 仅响应 Esc（关闭）
   - 无 Dialog → 正常分发
4. 检查页面上下文：
   - 任务详情页 → E 编辑当前任务
   - 项目列表页 → N 新建任务（需要项目 ID）
   - 其他页面 → 部分快捷键不可用
```

---

## 模块9: 同列内手动排序

sort_order state event 存储和读写 API 已完成，并已与 `sort-order.ts` 的 base-62 `string` 类型对齐。看板列内排序感知渲染、列内拖拽排序和 Data Table 拖拽排序均已实现。

| #   | 步骤                | 文件                                                | 说明                                                                                                                     | 状态   |
| --- | ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| SO1 | SortOrder 类型      | `src/lib/matrix/types.ts`                           | `SortOrderState` 接口：`{ order: number }`；`TAMARIX_EVENT_TYPES.SORT_ORDER`                                             | 已完成 |
| SO2 | SortOrder 封装      | `src/lib/matrix/state-events.ts`                    | `setSortOrder()` / `getSortOrder()`                                                                                      | 已完成 |
| SO3 | 排序感知渲染        | `src/lib/components/board/KanbanColumn.svelte` 修改 | 看板列内任务按 sort_order 排序渲染（而非默认按创建时间）；读取每个任务的 `com.tamarix.sort_order` state event            | 已完成 |
| SO4 | 看板列内拖拽排序    | `src/lib/components/board/KanbanColumn.svelte` 修改 | KanbanCard 增加 draggable + 拖拽占位符；同列内拖拽时重新计算 sort_order 并调用 setSortOrder                              | 已完成 |
| SO5 | Data Table 拖拽排序 | `src/routes/project/[id]/+page.svelte` 修改         | 列表视图表格行增加拖拽手柄；拖拽排序后更新 sort_order                                                                    | 已完成 |
| SO6 | 排序 i18n           | `src/lib/i18n/locales/zh.ts` + `en.ts`              | sort.manual / sort.priority / sort.due_date / sort.created / sort.drag_hint / sort.rebalanced                            | 已完成 |
| SO7 | 排序间距重排工具    | `src/lib/utils/sort-order.ts`                       | 新文件：`generateSortBetween()` base-62 分数索引排序（永不需重排）；`sortByOrder()` / `computeSortAtPosition()` 辅助函数 | 已完成 |

### 拖拽排序交互区分

```
看板视图:
  - 跨列拖拽: 改变任务状态 (已有，KanbanColumn.handleDrop)
  - 同列内拖拽: 仅改变 sort_order (新增)

列表视图:
  - 行拖拽: 改变 sort_order
  - 列头点击排序: 临时排序（不影响 sort_order state event）
```

### sort_order 策略

```
采用 base-62 分数索引方案（sort-order.ts），无需数字间距分配和重排：

初始分配:
  - 第1个任务: SORT_MIN + midpoint
  - 第2个任务: 第1个 + midpoint
  - 插入到任意位置: generateSortBetween(prev, next)

插入到任务 A("a00000") 和任务 B("a0Zzzz") 之间:
  - 新 sort_order = base62(floor((fromBase62("a00000") + fromBase62("a0Zzzz")) / 2))

空间耗尽时（相邻值差 1）:
  - 自动扩展 key 长度（KEY_LENGTH + 1）
  - 永不需要重排（rebalance）

旧方案（已废弃）:
  初始值: 1000 间距分配
  间距不足 (差值 < 1) 时需触发整列重排 rebalanceSortOrders
```

### sort_order 工具函数

```typescript
// src/lib/utils/sort-utils.ts

/**
 * 计算两个相邻 sort_order 之间的插入值
 * @param before 前一个任务的 sort_order（如果插入到最前面则为 undefined）
 * @param after 后一个任务的 sort_order（如果插入到最后面则为 undefined）
 * @returns 新的 sort_order 值
 */
export function insertSortOrder(before: number | undefined, after: number | undefined): number {
	if (before === undefined && after === undefined) return 1000;
	if (before === undefined) return after! - 1000;
	if (after === undefined) return before + 1000;
	return Math.round((before + after) / 2);
}

/**
 * 重新分配 sort_order 间距
 * @param count 需要重排的任务数量
 * @returns 按顺序分配的 sort_order 数组
 */
export function rebalanceSortOrders(count: number): number[] {
	return Array.from({ length: count }, (_, i) => (i + 1) * 1000);
}

/**
 * 检测 sort_order 数组是否需要重排（存在间距 < 1 的相邻值）
 * @param orders 已排序的 sort_order 数组
 * @returns 是否需要重排
 */
export function needsRebalance(orders: number[]): boolean {
	const sorted = [...orders].sort((a, b) => a - b);
	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] - sorted[i - 1] < 1) return true;
	}
	return false;
}
```

---

## 模块10: 外部链接

存储、i18n、任务详情页基础 UI 已完成。URL 格式校验工具函数（url.ts）已完成，任务详情页已集成校验和 sanitize；链接 state_key 已保留用于删除，外部链接 favicon 也已接入。

| #   | 步骤                | 文件                                                      | 说明                                                                                                                                          | 状态                                                             |
| --- | ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| EL1 | ExternalLink 类型   | `src/lib/matrix/types.ts`                                 | `ExternalLink` 接口：`{ url, label }`；`TAMARIX_EVENT_TYPES.EXTERNAL_LINK`                                                                    | 已完成                                                           |
| EL2 | ExternalLink 封装   | `src/lib/matrix/state-events.ts`                          | `addExternalLink()` / `getExternalLinks()` / `removeExternalLink()`                                                                           | 已完成                                                           |
| EL3 | ExternalLink i18n   | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | external_link.title / add / url / label / delete / no_links                                                                                   | 已完成                                                           |
| EL4 | 任务详情外部链接 UI | `src/routes/project/[id]/task/[taskId]/+page.svelte`      | "details"Tab 内外部链接列表 + 添加/删除；输入 Label + URL，点击添加                                                                           | 已完成                                                           |
| EL5 | URL 格式校验        | `src/lib/utils/url.ts`                                    | 新文件：`isValidUrl(str)` -- try/catch new URL(str)，仅允许 http/https 协议；`sanitizeUrl(str)` -- 清理 URL；任务详情页已集成添加链接时的校验 | 已完成（url.ts 已创建，任务详情页已使用 isValidUrl/sanitizeUrl） |
| EL6 | 外部链接图标        | `src/routes/project/[id]/task/[taskId]/+page.svelte` 修改 | 根据 URL 域名显示对应 favicon 或通用链接图标；使用 `https://www.google.com/s2/favicons?domain=` 获取 favicon                                  | 已完成                                                           |
| EL7 | 外部链接 i18n 补充  | `src/lib/i18n/locales/zh.ts` + `en.ts`                    | external_link.invalid_url / external_link.open_link                                                                                           | 已完成                                                           |

### 当前外部链接 UI 实现详情

任务详情页 (`task/[taskId]/+page.svelte` L585-633) 已实现：

- 链接列表：Link2 图标 + 可点击标签 + 删除按钮
- 添加表单：Label 输入 + URL 输入 + 添加按钮（需两者非空）
- URL 格式校验：添加链接时使用 `sanitizeUrl()` 自动补全协议 + `isValidUrl()` 校验 http/https 协议，校验失败显示 `external_link.invalid_url` 提示
- 缺失：favicon 显示

---

## 前端文件结构新增

```
src/
├── lib/
│   ├── components/
│   │   ├── common/
│   │   │   └── KeyboardShortcuts.svelte     # [已有]
│   │   ├── task/
│   │   │   ├── CustomFieldRenderer.svelte   # [新增] 独立自定义字段渲染器
│   │   │   ├── ApprovalBadge.svelte         # [新增] 审批状态 Badge
│   │   │   └── ...existing...
│   │   └── ui/
│   │       └── chart/                        # [新增] shadcn-svelte Chart 组件
│   ├── stores/
│   │   └── reports.svelte.ts                # [新增] 报表数据 Store
│   ├── utils/
│   │   ├── sort-order.ts                    # [已有] base-62 分数索引排序工具
│   │   ├── keyboard.ts                      # [已有] isInputElement() 快捷键冲突处理
│   │   ├── url.ts                           # [新增] URL 校验工具
│   └── matrix/
│       ├── state-events.ts                  # [修改] 新增 git_config 存取
│       └── search.ts                        # [修改] 自定义字段搜索
├── routes/
│   ├── +layout.svelte                       # [修改] 全局键盘监听
│   └── project/[id]/
│       ├── +page.svelte                     # [修改] Data Table 拖拽排序 + 自定义字段列
│       ├── reports/+page.svelte             # [修改] LayerChart 升级
│       ├── versions/+page.svelte            # [已有]
│       ├── settings/+page.svelte            # [修改] Git 集成配置 + 审批开关
│       └── task/[taskId]/+page.svelte       # [修改] ApprovalBadge/外部链接图标/Commits
```

---

## 实施顺序建议

### 第一批：Chart 报表（独立模块，无外部依赖）

| 顺序 | 步骤                | 依赖   |
| ---- | ------------------- | ------ |
| 1    | C1 安装 LayerChart  | 无     |
| 2    | C2 Chart 组件注册   | C1     |
| 3    | C3 报表数据 Store   | 无     |
| 4    | C4 燃尽图重构       | C2, C3 |
| 5    | C5 状态分布饼图重构 | C2, C3 |
| 6    | C6 趋势图重构       | C2, C3 |
| 7    | C7 指派人工作量图   | C2, C3 |
| 8    | C8 版本进度图       | C2, C3 |
| 9    | C9 报表时间范围筛选 | C3     |
| 10   | C10 报表导出        | C4~C8  |
| 11   | C11 报表 i18n 补充  | 无     |

### 第二批：自定义字段 + 审批流（任务详情页集成）

| 顺序 | 步骤                          | 依赖             | 状态   |
| ---- | ----------------------------- | ---------------- | ------ |
| 12   | CF7 自定义字段渲染器          | CF1~CF6 (已完成) | 已完成 |
| 13   | CF8 任务详情自定义字段区      | CF7              | 已完成 |
| 14   | CF10 自定义字段必填校验       | CF7              | 已完成 |
| 15   | CF9 创建任务传递自定义字段    | CF7              | 已完成 |
| 16   | CF11 自定义字段搜索支持       | CF7              | 已完成 |
| 17   | CF12 自定义字段 Data Table 列 | CF8              | 已完成 |
| 18   | AP4 ApprovalBadge 组件        | AP1~AP3 (已完成) | 已完成 |
| 19   | AP5 审批操作 UI 重构          | AP4              | 已完成 |
| 20   | AP6 Reactions 集成            | AP5              | 已完成 |
| 21   | AP7 审批状态自动推进          | AP6              | 已完成 |
| 22   | AP8 审批开关                  | AP4              | 已完成 |
| 23   | AP9 审批约束                  | AP5              | 已完成 |

### 第三批：排序 + 外部链接 + 快捷键

| 顺序 | 步骤                    | 依赖                  | 状态   |
| ---- | ----------------------- | --------------------- | ------ |
| 24   | SO7 排序间距重排工具    | 无                    | 已完成 |
| 25   | SO3 排序感知渲染        | SO1~SO2 (已完成)      | 已完成 |
| 26   | SO4 看板列内拖拽排序    | SO3, SO7              | 已完成 |
| 27   | SO5 Data Table 拖拽排序 | SO3, SO7              | 已完成 |
| 28   | EL5 URL 格式校验        | EL1~EL4 (已完成)      | 已完成 |
| 29   | EL6 外部链接图标        | EL4 (已完成)          | 已完成 |
| 30   | EL7 外部链接 i18n 补充  | 无                    | 已完成 |
| 31   | KS3 快捷键上下文状态    | 无                    | 已完成 |
| 32   | KS4 全局键盘监听        | KS1~KS2 (已完成), KS3 | 已完成 |
| 33   | KS5 快捷键冲突处理      | KS4                   | 已完成 |
| 34   | KS6 快捷键注册到 Layout | KS4                   | 已完成 |
| 35   | KS7 扩展快捷键映射      | KS4                   | 已完成 |
| 36   | KS8 快捷键 i18n 补充    | 无                    | 已完成 |

### 第四批：Git 集成（依赖 AS）

| 顺序 | 步骤                    | 依赖           | 状态   |
| ---- | ----------------------- | -------------- | ------ |
| 37   | G11 Webhook Secret 生成 | 无             | 已完成 |
| 38   | G6 Git 配置存储         | 无             | 已完成 |
| 39   | G9 Git i18n             | 无             | 已完成 |
| 40   | G10 Webhook 签名验证    | G1~G4 (已完成) | 已完成 |
| 41   | G5 Git Webhook API      | G10            | 已完成 |
| 42   | G7 前端 Git 配置页      | G6             | 已完成 |
| 43   | G8 commit 关联展示      | 无             | 已完成 |

---

## P4 与 AS 交互

P4 功能主要为前端实现，AS 提供可选增强：

| P4 功能    | 前端独立                            | AS 增强                                                                           |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| Chart 报表 | 前端计算任务数据，LayerChart 渲染   | `GET /api/stats` 提供聚合数据（大数据量场景）                                     |
| 版本管理   | 前端读写 state event                | AS 索引版本数据，`GET /api/versions` 加速查询                                     |
| 导入导出   | 前端解析/生成文件 + 批量 createTask | 无                                                                                |
| 任务模板   | 前端读写 state event                | 无                                                                                |
| 自定义字段 | 前端读写 state event                | AS Schema 校验（P3 已有 ajv 校验器，新增 custom_field/custom_field_value schema） |
| 审批流     | 前端读写 state event + Reactions    | 无（审批状态为 state event，AS 可监听但无额外增强）                               |
| Git 集成   | 前端配置 webhook                    | AS Git Bridge 处理 webhook 事件，向任务 Room 发 commit 通知                       |
| 快捷键     | 前端全局键盘监听                    | 无                                                                                |
| 同列排序   | 前端拖拽 + setSortOrder             | AS 索引 sort_order，搜索结果支持按排序字段排序                                    |
| 外部链接   | 前端读写 state event                | AS 索引外部链接，搜索 API 可搜链接内容                                            |

### AS Schema 新增（P4 配合）

P3 模块4 的 ajv 校验器需新增以下 schema：

| 文件                                     | Schema                                                                                                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as/src/schemas/task-template.json`      | `{ name: string, default_title?: string, default_description?: string, default_status?: enum, default_priority?: enum, default_type?: enum, default_tags?: string[] }` |
| `as/src/schemas/custom-field.json`       | `{ label: string, type: enum("text","number","select","date"), options?: string[], required?: boolean }`                                                               |
| `as/src/schemas/custom-field-value.json` | `{ value: string \| number }`                                                                                                                                          |
| `as/src/schemas/approval.json`           | `{ status: enum("pending","approved","rejected"), required_approvals: integer>=1, current_approvals: integer>=0 }`                                                     |
| `as/src/schemas/sort-order.json`         | `{ order: integer }`                                                                                                                                                   |
| `as/src/schemas/external-link.json`      | `{ url: string(format=uri), label: string }`                                                                                                                           |
| `as/src/schemas/git-config.json`         | `{ provider: enum("github","gitlab"), webhook_secret: string, repo_url: string(format=uri) }`                                                                          |

---

## 风险与缓解

| 风险                                 | 影响                                 | 缓解措施                                                                                                      |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| LayerChart 与 Svelte 5 Runes 兼容性  | 图表组件渲染失败                     | shadcn-svelte Chart 已适配 Svelte 5；若 LayerChart 有问题，回退 CSS 图表（当前已有）                          |
| Formsnap + Superforms 动态表单复杂度 | 自定义字段表单校验逻辑复杂           | 简化方案：不用 Formsnap，直接手写表单 + Zod 校验；自定义字段类型有限（4种），无需过度抽象                     |
| Matrix Reaction 事件遍历性能         | 大量 reaction 事件遍历慢             | 只读取最近 1000 条 timeline 事件中的 reaction；或使用 AS 索引                                                 |
| 快捷键与浏览器/输入框冲突            | 意外触发快捷操作                     | 非输入框上下文才触发单字母快捷键；全局仅 Cmd/Ctrl+K 和 Esc                                                    |
| sort_order 间距耗尽                  | 频繁拖拽后间距不足                   | 检测间距 < 1 时自动重排整列（rebalanceSortOrders）                                                            |
| Git Webhook 签名验证                 | 错误密钥导致 webhook 失败            | 前端显示 webhook URL 和配置步骤文档；AS 日志记录验签失败详情                                                  |
| 导入大量任务                         | 前端逐个 createTask 耗时长           | 批量操作已有逐个 await 模式；进度条反馈；失败行收集并展示                                                     |
| 自定义字段搜索性能                   | 遍历所有任务的 state event           | AS 搜索 API 可索引自定义字段值；前端仅对当前项目内存数据过滤                                                  |
| 审批 Reaction 与手动审批不一致       | Reaction 和 state event 审批状态冲突 | 审批操作统一走 state event（`com.tamarix.approval`）；Reaction 仅作为辅助记录，不同步回 state event           |
| LayerChart SVG 渲染性能              | 大量数据点时图表卡顿                 | 数据量 > 500 点时降采样（每 N 点取 1 点）；折线图最多显示 90 天粒度                                           |
| Webhook Secret 明文存储              | 泄露后可伪造 webhook                 | `com.tamarix.git_config` 中 webhook_secret 仅管理员可见（前端按 Power Level 过滤展示）；AS 侧环境变量覆盖优先 |
