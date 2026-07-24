> [项目计划](./README.md) / UI 技术选型

# UI 技术选型：shadcn-svelte

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

---

## DESIGN.md 色板 -- shadcn-svelte CSS 变量映射

shadcn-svelte 使用 `oklch` 色彩空间的 CSS 变量。我们需要覆盖 `.dark` 主题变量以匹配 DESIGN.md 色板：

| DESIGN.md 色彩         | 用途           | shadcn-svelte 变量     | 映射值（oklch 近似）              |
| ---------------------- | -------------- | ---------------------- | --------------------------------- |
| Runway Black `#000000` | 页面背景       | `--background`         | `oklch(0 0 0)`                    |
| Deep Black `#030303`   | 分层暗色面     | `--card` / `--popover` | `oklch(0.015 0 0)`                |
| Dark Surface `#1a1a1a` | 卡片/容器      | `--secondary`          | `oklch(0.18 0 0)`                 |
| Pure White `#ffffff`   | 主文本（暗底） | `--foreground`         | `oklch(1 0 0)`                    |
| Cool Slate `#767d88`   | 次要文本       | `--muted-foreground`   | `oklch(0.55 0.015 260)`           |
| Border Dark `#27272a`  | 边框           | `--border` / `--input` | `oklch(0.25 0 0)`                 |
| Muted Gray `#a7a7a7`   | 时间戳         | `--muted` (background) | `oklch(0.7 0 0)`                  |
| Cool Silver `#c9ccd1`  | 浅边框         | `--ring`               | `oklch(0.82 0.005 260)`           |
| --                     | 主操作色       | `--primary`            | `oklch(0.7 0.15 260)` -- 冷蓝色调 |
| --                     | 危险/删除      | `--destructive`        | `oklch(0.65 0.2 25)` -- 红色      |

> `--sidebar-*` 系列变量同样覆盖为 Runway Black / Dark Surface 色系。

---

## shadcn-svelte 组件使用规划

| 任务管理 UI 元素       | shadcn-svelte 组件                                             | 说明                                                                                                  |
| ---------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 应用侧边栏（项目导航） | **Sidebar**                                                    | 内置可折叠侧边栏，collapsible="icon"                                                                  |
| 顶部导航栏             | 自建 + **Breadcrumb**                                          | 面包屑显示当前路径                                                                                    |
| 任务卡片               | 自建 TaskCard + **Badge** + **Avatar**                         | Badge 显示状态/优先级，Avatar 显示指派人                                                              |
| 状态标签               | **Badge** (variant: default/secondary/outline/destructive)     | todo--outline, in_progress--default, done--secondary                                                  |
| 优先级标签             | **Badge** + 自定义颜色类                                       | critical--destructive, high--橙色自定义                                                               |
| 新建任务弹窗           | **Dialog** + **Input** + **Select** + **Textarea** + **Field** | 完整表单弹窗                                                                                          |
| 任务列表               | **Data Table** (TanStack Table)                                | 支持排序、过滤、分页、列隐藏                                                                          |
| 看板视图               | 自建 KanbanBoard（拖拽） + **Card**                            | 列用 Card 容器                                                                                        |
| 任务详情页             | **Tabs** + **Separator** + **Avatar** + **Badge**              | Tab 切换：详情/评论/历史/关联                                                                         |
| 日期选择               | **Date Picker** (Calendar + Popover)                           | 截止日期设置                                                                                          |
| 指派人选择             | **Combobox** (Command + Popover)                               | 搜索并选择成员                                                                                        |
| 过滤器                 | **Select** / **Checkbox** / **Popover**                        | 多维度过滤                                                                                            |
| 搜索                   | **Command** (Command Palette)                                  | 全局搜索快捷键 Cmd+K                                                                                  |
| 通知/提示              | **Toast** / **Sonner**                                         | 操作反馈                                                                                              |
| 确认删除               | **AlertDialog**                                                | 危险操作确认                                                                                          |
| 加载状态               | **Skeleton**                                                   | 数据加载骨架屏                                                                                        |
| 右键/更多操作          | **DropdownMenu** + **ContextMenu**                             | 任务操作菜单                                                                                          |
| 拖拽调整面板           | **Resizable**                                                  | 侧边栏/详情面板宽度调整                                                                               |
| 评论输入               | **Textarea** + **Button**                                      | 发送评论                                                                                              |
| 附件上传               | 自建 FileUploadZone + **Button** + **Toast**                   | 拖拽/点击上传，调用 `client.uploadContent()`，发送 `m.room.message` (msgtype: m.file/m.image/m.video) |
| 附件列表               | 自建 AttachmentList + **Badge** + **Button**(下载)             | 展示已上传附件：文件名、大小、类型图标、下载链接                                                      |
| 附件删除               | AttachmentList + **AlertDialog**                               | 红删按钮 -- AlertDialog 确认 -- `client.redactEvent()`                                                |
| 通知面板               | 自建 NotificationPanel + **Popover** + **Badge**               | AppHeader 右上角 Bell 图标 + 未读数 Badge + Popover 通知列表                                          |
| 批量操作工具栏         | 自建 BulkActionBar + **DropdownMenu** + **Checkbox**           | 多选后浮动工具栏：批量修改状态/优先级/指派人/标签/归档                                                |
| 工时登记面板           | 自建 WorklogPanel + **Input** + **Button**                     | 任务详情 Tab：工时列表 + 登记表单 + 预估vs实际汇总                                                    |
| Markdown 编辑器        | 自建 MarkdownEditor + **Textarea** + **Button**                | 编辑/预览双模式 + 工具栏（加粗/斜体/标题/列表/代码/链接）                                             |
| 成员管理               | 自建 MemberManager + **Avatar** + **Button** + **Input**       | 成员列表 + 邀请/移除/角色调整                                                                         |
| 版本选择               | 自建 VersionSelect + **Select**                                | 任务详情侧栏"修复版本"字段                                                                            |
| 导入 Dialog            | 自建 ImportDialog + **Dialog** + **Input**(file)               | 上传 CSV/JSON -- 预览映射 -- 批量创建                                                                 |
| 逾期任务卡片           | 自建 OverdueTaskList + **Badge**(destructive)                  | 仪表盘红色警告区域                                                                                    |
| 团队工作量卡片         | 自建 TeamWorkloadCard + **Avatar** + 纯CSS柱状图               | 按指派人分组统计任务数                                                                                |
| 项目进度卡片           | 自建 ProjectProgressCard + 纯CSS进度条                         | 各项目完成率百分比                                                                                    |
| 移动端侧边栏           | **Sheet** (替代 Sidebar)                                       | <768px 时侧边栏变为底部抽屉式                                                                         |
| 表单验证               | **Formsnap** + **Superforms** + **Zod**                        | P2 阶段引入                                                                                           |
