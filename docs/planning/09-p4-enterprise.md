> [项目计划](./README.md) / P4 企业级

# P4 -- 企业级

**目标：** 报表图表、版本管理、导入导出、任务模板、自定义字段、审批流、Git 集成、快捷键、同列排序、外部链接。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add chart form switch toggle
```

| # | 模块 | 步骤 | 文件 | 说明 |
|---|---|---|---|---|
| | | | | **模块1: Chart 报表** |
| C1 | 燃尽图/统计 | 安装 LayerChart | `bun add layerchart` | Sprint 维度数据可视化 |
| C2 | 燃尽图组件 | 燃尽图页 | `src/routes/project/[id]/reports/+page.svelte` | Sprint 燃尽图：X轴=天数，Y轴=剩余任务数/故事点 |
| C3 | 状态分布饼图 | 统计页 | `src/routes/project/[id]/reports/+page.svelte` 内 | 各状态任务占比饼图 |
| C4 | 趋势图 | 统计页 | `src/routes/project/[id]/reports/+page.svelte` 内 | 近 30 天任务创建/完成趋势 |
| | | | | **模块2: 版本/发布管理** |
| V1 | Version 类型 | `src/lib/matrix/types.ts` 扩展 | 新增 `Version` 接口：`{ name, description, releaseDate, status }`；新增 `TAMARIX_EVENT_TYPES.VERSION` / `TAMARIX_EVENT_TYPES.TASK_VERSION` |
| V2 | Version 封装 | `src/lib/matrix/state-events.ts` 扩展 | `createVersion(client, spaceRoomId, version)` / `updateVersionStatus(client, spaceRoomId, key, status)` / `setTaskVersion(client, taskRoomId, versionKey)` / `getVersions(room)` / `getTaskVersion(room)` |
| V3 | Version Store | `src/lib/stores/versions.svelte.ts` | `$state`：版本列表；方法：fetchVersions, createVersion, linkTaskToVersion, getVersionProgress（计算该版本下各状态任务数） |
| V4 | 版本管理页 | `src/routes/project/[id]/versions/+page.svelte` | 列出所有版本 + 进度条 + 任务数统计；创建版本 Dialog |
| V5 | 任务关联版本 UI | `src/lib/components/task/VersionSelect.svelte` | 在任务详情侧面板添加"修复版本"字段 |
| V6 | 发布说明生成 | `src/routes/project/[id]/versions/+page.svelte` 内 | "生成发布说明"按钮 → 汇总该版本下 done 状态任务的标题列表，可复制 |
| V7 | 版本 i18n | `src/lib/i18n/locales/zh.ts` + `en.ts` 扩展 | "version.title" / "version.create" / "version.name" / "version.release_date" / "version.status" / "version.progress" / "version.release_notes" / "version.link_task" |
| | | | | **模块3: 导入/导出** |
| IE1 | 导出工具 | `src/lib/utils/export.ts` | `exportTasksToCSV(tasks)` -- 将任务列表序列化为 CSV（标题/状态/优先级/指派人/截止日期/标签）；`exportTasksToJSON(tasks)` -- JSON 格式 |
| IE2 | 导出 UI | `src/routes/project/[id]/+page.svelte` 修改 | 工具栏增加"导出"按钮（DropdownMenu: CSV / JSON）；调用 `exportTasksToCSV()` + `Blob` 下载 |
| IE3 | 导入工具 | `src/lib/utils/import.ts` | `parseCSV(file)` / `parseJSON(file)` → `{ name, status, priority, type, assignee, tags }[]`；字段映射配置 |
| IE4 | 导入 UI | `src/lib/components/task/ImportDialog.svelte` | Dialog：上传 CSV/JSON 文件 → 预览映射 → 批量 createTask()；进度条显示导入进度 |
| IE5 | 导入导出 i18n | `src/lib/i18n/locales/zh.ts` + `en.ts` 扩展 | "import.title" / "import.upload" / "import.mapping" / "import.progress" / "import.success" / "export.title" / "export.csv" / "export.json" |
| | | | | **模块4: 任务模板** |
| TT1 | Template 类型 | `src/lib/matrix/types.ts` 扩展 | 新增 `TaskTemplate` 接口 + `TAMARIX_EVENT_TYPES.TASK_TEMPLATE` |
| TT2 | Template 封装 | `src/lib/matrix/state-events.ts` 扩展 | `createTaskTemplate(client, spaceRoomId, template)` / `getTaskTemplates(room)` / `deleteTaskTemplate(client, spaceRoomId, key)` |
| TT3 | 模板管理 UI | `src/routes/project/[id]/settings/+page.svelte` 内 | 项目设置页增加"任务模板"区域：模板列表 + 创建/编辑/删除 |
| TT4 | 模板选择 UI | `src/lib/components/task/TaskCreateDialog.svelte` 修改 | 创建任务 Dialog 增加模板选择 DropdownMenu；选中模板后自动填充 title/description/status/priority/type/tags |
| TT5 | 模板 i18n | `src/lib/i18n/locales/zh.ts` + `en.ts` 扩展 | "template.title" / "template.create" / "template.select" / "template.name" / "template.default_values" / "template.delete" |
| | | | | **模块5: 自定义字段** |
| CF1 | 自定义字段定义 | `src/lib/matrix/types.ts` 扩展 | 新增 `com.tamarix.custom_field` state event（多实例，state_key = 字段名）；`{ label, type: "text" | "number" | "select" | "date", options?, required }` |
| CF2 | 自定义字段值 | `src/lib/matrix/types.ts` 扩展 | 新增 `com.tamarix.custom_field_value` state event（多实例，state_key = 字段名）；`{ value }` |
| CF3 | 动态表单 | `src/routes/project/[id]/settings/+page.svelte` + `TaskDetailPanel.svelte` | Formsnap + Superforms + Zod 动态渲染自定义字段表单 |
| | | | | **模块6: 审批流** |
| AP1 | 审批 Reactions | 任务详情内 | 利用 Matrix `m.reaction` (emoji) 实现简易审批：thumbs_up = 通过，thumbs_down = 驳回；统计 reaction 计数 |
| AP2 | 审批状态 | `src/lib/matrix/types.ts` 扩展 | 新增 `com.tamarix.approval` state event：`{ status: "pending" | "approved" | "rejected", required_approvals: 2, current_approvals: 0 }` |
| | | | | **模块7: Git 集成** |
| G1 | AS Git Bridge | `as/src/git-bridge.ts` | 监听 Git webhook（GitHub/GitLab），commit message 含 `TAM-42` 时自动在任务 Room 发送 `m.room.message` 关联 commit |
| | | | | **模块8: 快捷键** |
| KS1 | 快捷键 Dialog | `src/lib/components/common/KeyboardShortcuts.svelte` | `?` 键打开快捷键列表；`e` 编辑 / `n` 新建 / `Esc` 关闭 / `Cmd+K` 搜索 |
| | | | | **模块9: 同列内手动排序** |
| SO1 | 排序 State Event | `src/lib/matrix/types.ts` 扩展 | 新增 `com.tamarix.sort_order` state event `{ order: 0 }` |
| SO2 | 拖拽排序 UI | `KanbanColumn.svelte` + Data Table 修改 | 同列内支持拖拽重排；更新 sort_order 值 |
| | | | | **模块10: 外部链接** |
| EL1 | 外部链接 State Event | `src/lib/matrix/types.ts` 扩展 | 新增 `com.tamarix.external_link` state event `{ url, label }` |
| EL2 | 外部链接 UI | `src/lib/components/task/TaskDetailPanel.svelte` 修改 | 任务详情侧栏显示外部链接列表；添加/删除链接 |
