> [项目计划](./README.md) / 文件结构

# 文件结构

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
│   │   │   ├── cn.ts            # shadcn-svelte 自动生成：clsx + tailwind-merge
│   │   │   ├── export.ts        # 导出工具：CSV/JSON 序列化 + Blob 下载
│   │   │   └── import.ts        # 导入工具：CSV/JSON 解析 + 字段映射
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
│   │   │   │   ├── sheet/            # P2: 移动端侧边栏
│   │   │   │   ├── progress/         # P2: 进度条
│   │   │   │   ├── alert/            # P2: 提醒信息
│   │   │   │   ├── collapsible/      # P2: 折叠区域
│   │   │   │   ├── table/            # P2: HTML 表格
│   │   │   │   ├── pagination/       # P2: 分页
│   │   │   │   ├── chart/            # P3: LayerChart 图表
│   │   │   │   ├── form/             # P3: Formsnap 表单
│   │   │   │   ├── switch/           # P3: 开关
│   │   │   │   ├── toggle/           # P3: 切换按钮
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── AppSidebar.svelte        # 基于 shadcn Sidebar 的项目导航
│   │   │   │   ├── AppHeader.svelte         # 顶部栏（搜索+用户 Avatar+通知 Bell）
│   │   │   │   ├── AppShell.svelte          # 主布局（Sidebar + Resizable Panel）
│   │   │   │   └── NotificationPanel.svelte  # 通知面板（Bell 图标 + Popover 通知列表）
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
│   │   │   │   ├── AttachmentList.svelte     # 附件列表（文件名/大小/预览/下载/删除）
│   │   │   │   ├── AttachmentPreview.svelte  # 图片/视频内联预览
│   │   │   │   ├── MarkdownEditor.svelte     # Markdown 编辑器（编辑/预览双模式 + 工具栏）
│   │   │   │   ├── WorklogPanel.svelte       # 工时登记面板（工时列表 + 登记表单 + 预估vs实际）
│   │   │   │   ├── BulkActionBar.svelte      # 批量操作浮动工具栏
│   │   │   │   ├── VersionSelect.svelte      # 版本选择（任务关联版本）
│   │   │   │   └── ImportDialog.svelte       # 导入 Dialog（CSV/JSON 上传 + 映射预览）
│   │   │   ├── board/
│   │   │   │   ├── KanbanBoard.svelte       # 看板主容器
│   │   │   │   ├── KanbanColumn.svelte      # 看板列（按状态分组）
│   │   │   │   └── KanbanCard.svelte        # 看板卡片（可拖拽）
│   │   │   ├── project/
│   │   │   │   ├── MemberManager.svelte      # 成员管理（列表 + 邀请/移除/角色调整）
│   │   │   │   └── ProjectCreateDialog.svelte # 创建项目（含模板选择）
│   │   │   ├── dashboard/
│   │   │   │   ├── OverdueTaskList.svelte    # 逾期任务卡片（红色警告）
│   │   │   │   ├── TeamWorkloadCard.svelte   # 团队工作量卡片（纯CSS柱状图）
│   │   │   │   └── ProjectProgressCard.svelte # 项目进度卡片（纯CSS进度条）
│   │   │   └── common/
│   │   │       ├── MatrixAvatar.svelte      # Matrix 用户头像（Avatar 封装）
│   │   │       ├── TaskIdBadge.svelte       # 任务编号标签（TAM-42）
│   │   │       └── KeyboardShortcuts.svelte  # 快捷键列表 Dialog
│   │   ├── matrix/
│   │   │   ├── client.ts          # Matrix 客户端初始化与单例管理
│   │   │   ├── auth.ts            # 登录/登出/会话恢复
│   │   │   ├── room-utils.ts      # Room -- Task 映射工具函数
│   │   │   ├── state-events.ts    # 自定义 state event 读写封装
│   │   │   ├── media.ts          # Matrix 媒体上传/下载/缩略图封装
│   │   │   ├── notifications.ts  # 通知事件解析工具函数
│   │   │   └── types.ts           # Matrix 相关类型定义 + 枚举
│   │   ├── stores/
│   │   │   ├── auth.svelte.ts     # 用户认证状态（Svelte 5 runes）
│   │   │   ├── tasks.svelte.ts    # 任务列表状态 + Sync 事件监听
│   │   │   ├── projects.svelte.ts # 项目(Space)列表状态 + Sync 事件监听
│   │   │   ├── comments.svelte.ts # 评论状态 + RoomEvent.Timeline 实时监听
│   │   │   ├── notifications.svelte.ts # 通知状态 + 到期提醒
│   │   │   ├── worklogs.svelte.ts # 工时记录状态
│   │   │   ├── versions.svelte.ts # 版本管理状态
│   │   │   └── ui.svelte.ts       # UI 状态（侧边栏、视图模式等）
│   │   └── routes/
│       ├── +layout.svelte         # 重写：条件渲染（已登录--AppShell，未登录--登录页）
│       ├── +page.svelte           # 重写：重定向到 /dashboard
│       ├── login/
│       │   └── +page.svelte       # Matrix 登录页
│       ├── dashboard/
│       │   └── +page.svelte       # 仪表盘：我的任务、近期截止、统计摘要、逾期/工作量/进度
│       ├── search/
│       │   └── +page.svelte       # 全局搜索页
│       ├── project/
│       │   └── [id]/
│       │       ├── +page.svelte   # 项目页：Data Table 任务列表 + 看板视图
│       │       ├── settings/
│       │       │   └── +page.svelte # 项目设置 + 成员管理 + 任务模板
│       │       ├── versions/
│       │       │   └── +page.svelte # 版本/发布管理
│       │       ├── reports/
│       │       │   └── +page.svelte # Chart 报表（燃尽图/饼图/趋势图）
│       │       └── task/
│       │           └── [taskId]/
│       │               └── +page.svelte  # 任务详情（详情/评论/历史/关联/工时）
│       └── settings/
│           └── +page.svelte       # 用户设置
├── static/                        # 静态资源
├── DESIGN.md                      # 设计系统文档
└── as/                            # Application Service（P2 增强层）
    ├── config.yaml                # AS 注册配置
    ├── package.json               # AS 独立包
    └── src/
        ├── index.ts               # AS 入口：监听 Matrix 事件，分发到各处理器
        ├── ticket-id.ts           # AS 编号生成（幂等：有则跳过）
        ├── workflow.ts            # AS 工作流引擎（非法流转回滚+通知）
        ├── schema.ts              # AS Schema 校验（拒绝非法 state event 结构）
        ├── indexer.ts             # AS 搜索索引（state -- SQLite）
        ├── notifier.ts            # AS 通知 Bot（@提及/到期提醒）
        ├── watcher.ts             # AS Watcher 管理（维护索引+触发通知）
        └── git-bridge.ts          # AS Git 集成（webhook -- 关联 commit）
```
