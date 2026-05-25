const zh: Record<string, string> = {
  // --- Status ---
  "status.todo": "待办",
  "status.in_progress": "进行中",
  "status.review": "审核中",
  "status.done": "已完成",
  "status.closed": "已关闭",

  // --- Priority ---
  "priority.critical": "紧急",
  "priority.high": "高",
  "priority.medium": "中",
  "priority.low": "低",

  // --- Task Type ---
  "type.bug": "缺陷",
  "type.feature": "功能",
  "type.task": "任务",
  "type.improvement": "改进",
  "type.epic": "史诗",

  // --- Common ---
  "common.cancel": "取消",
  "common.create": "创建",
  "common.creating": "创建中...",
  "common.save": "保存",
  "common.saving": "保存中...",
  "common.delete": "删除",
  "common.edit": "编辑",
  "common.loading": "加载中...",
  "common.search": "搜索",
  "common.filter": "过滤",
  "common.clear_filter": "清除过滤",
  "common.archived": "已归档",
  "common.unarchive": "取消归档",
  "common.archive": "归档",
  "common.no_results": "未找到结果",

  // --- Breadcrumb ---
  "breadcrumb.projects": "项目",
  "breadcrumb.dashboard": "仪表盘",
  "breadcrumb.settings": "设置",

  // --- Theme ---
  "theme.light": "浅色",
  "theme.dark": "深色",
  "theme.system": "跟随系统",

  // --- Menu ---
  "menu.settings": "设置",
  "menu.logout": "退出登录",
  "menu.language": "语言",
  "menu.language_zh": "中文",
  "menu.language_en": "English",
  // --- Search ---
  "search.title": "搜索",
  "search.placeholder": "搜索任务、项目...",
  "search.empty": "未找到结果",
  "search.tasks": "任务",
  "search.projects": "项目",
  "search.search_tasks": "搜索任务...",
  "search.syntax_hint": "语法: status:todo priority:high type:bug assignee:alice tag:frontend",

  // --- Task ---
  "task.create": "新建任务",
  "task.create_desc": "创建一个新任务到当前项目",
  "task.title": "任务标题",
  "task.title_placeholder": "输入任务标题...",
  "task.description": "描述",
  "task.description_placeholder": "输入任务描述...",
  "task.status": "状态",
  "task.priority": "优先级",
  "task.type": "类型",
  "task.due_date": "截止日期",
  "task.assignee": "负责人",
  "task.estimate": "估算",
  "task.estimate.story_points": "故事点",
  "task.estimate.hours": "小时",
  "task.estimate.days": "天",
  "task.created_at": "创建时间",
  "task.room_id": "Room ID",
  "task.loading": "加载任务中...",
  "task.no_tasks": "暂无任务",
  "task.no_tasks_hint": "点击「新建任务」创建第一个任务",
  "task.details": "详情",
  "task.comments": "评论",
  "task.attachments": "附件",
  "task.history": "历史",
  "task.relations": "关联",
  "task.tags": "标签",
  "task.comment_placeholder": "输入评论...",
  "task.upload_attachment": "上传附件",
  "task.loading_comments": "加载评论中...",
  "task.no_comments_hint": "暂无评论，发送第一条评论吧",
  "task.no_attachments": "暂无附件",

  // --- Dashboard ---
  "dashboard.title": "仪表盘",
  "dashboard.welcome": "欢迎回来，{{name}}",
  "dashboard.my_tasks": "我的任务",
  "dashboard.no_my_tasks": "暂无分配给你的任务",
  "dashboard.upcoming": "即将到期",

  // --- Kanban ---
  "kanban.drop_here": "拖拽任务到此处",
  "kanban.drop_to": "放置到「{{label}}」",
  "kanban.label": "看板",

  // --- Project ---
  "project.title": "项目",
  "project.no_description": "暂无描述",
  "project.name_placeholder": "项目名称",
  "project.no_projects_hint": "暂无项目，创建一个吧",

  // --- List view ---
  "list.view": "列表",
  "list.ticket_id": "编号",
  "list.title": "标题",
  "list.status": "状态",
  "list.priority": "优先级",
  "list.type": "类型",
  "list.assignee": "指派人",
  "list.archive": "归档",
  "list.show_archived": "显示已归档",
  "list.board": "看板",

  // --- Pagination ---
  "pagination.per_page": "每页",
  "pagination.total": "共 {{n}} 条",
  "pagination.items": "条，",

  // --- Comments ---
  "comments.input_placeholder": "输入评论...",
  "comments.loading": "加载评论中...",
  "comments.empty": "暂无评论，发送第一条评论吧",
  "comments.send": "发送",
  "comments.upload_attachment": "上传附件",

  // --- Attachments ---
  "attachments.upload": "上传附件",
  "attachments.no_attachments": "暂无附件",
  "attachments.upload_hint": "拖拽文件到此处，或点击选择文件",
  "attachments.uploading": "上传中 {{progress}}%",
  "attachments.validation_failed": "文件验证失败",
  "attachments.upload_failed": "上传失败",

  // --- Settings ---
  "settings.title": "设置",
  "settings.subtitle": "账户与应用设置",
  "settings.account_info": "账户信息",
  "settings.user_id": "用户 ID",
  "settings.not_logged_in": "未登录",
  "settings.connection_status": "状态",
  "settings.connected": "已连接",
  "settings.danger_zone": "危险操作",
  "settings.logout_desc": "清除本地会话并返回登录页",
  "settings.logout": "退出",

  // --- Login ---
  "login.title": "Tamarix",
  "login.subtitle": "基于 Matrix 协议的任务管理",
  "login.homeserver": "Homeserver",
  "login.homeserver_hint": "Matrix 服务器域名（如 matrix.org）",
  "login.connecting": "连接中...",
  "login.connect": "连接",
  "login.server_url": "服务器地址: {{url}}",
  "login.username": "用户名",
  "login.password": "密码",
  "login.password_placeholder": "输入密码",
  "login.logging_in": "登录中...",
  "login.login": "登录",
  "login.or": "或",
  "login.login_via": "通过 {{provider}} 登录",
  "login.login_via_sso": "通过 SSO 登录",
  "login.no_supported_methods": "服务器不支持任何可用的登录方式",
  "login.cannot_connect": "无法连接到服务器",
  "login.change_server": "更改服务器",
  "login.agreement": "登录即表示您同意使用 Matrix 协议进行数据通信",
  "login.invalid_callback": "无效的回调参数",
  "login.session_expired": "会话已过期，请重新登录",
  "login.sso_failed": "SSO 登录失败",
  "login.completing": "正在完成登录",
  "login.verifying": "正在验证身份...",
  "login.back_to_login": "返回登录",

  // --- Restore ---
  "restore.restoring": "恢复会话中...",

  // --- Errors ---
  "error.load_tasks": "加载任务失败",
  "error.create_task": "创建任务失败",
  "error.update_status": "更新状态失败",
  "error.load_projects": "加载项目失败",
  "error.create_project": "创建项目失败",
  "error.load_comments": "加载评论失败",
  "error.unsupported_file_type": "不支持的文件类型: {{type}}",
  "error.file_size_exceeded": "文件大小超过限制 (最大 {{max}}MB)",
  "error.invalid_transition": "不允许从 {{from}} 转换到 {{to}}",
  "error.login_failed": "登录失败",
  "error.restore_failed": "恢复会话失败",
  // --- Workflow ---
  "workflow.valid_transitions": "允许的转换",

  // --- Relation ---
  "relation.blocks": "阻塞",
  "relation.duplicates": "重复",
  "relation.relates": "关联",
  "relation.subtask_of": "子任务",

  // --- History ---
  "history.show_all": "显示全部 ({{n}})",
  "history.ticket_id": "编号",
  "history.relation_to": "至",

  // --- Kanban ---
  "kanban.invalid_transition": "无法将任务移至\"{{to}}\"",
};

export default zh;
