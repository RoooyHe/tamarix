const en: Record<string, string> = {
  // --- Status ---
  "status.todo": "To Do",
  "status.in_progress": "In Progress",
  "status.review": "In Review",
  "status.done": "Done",
  "status.closed": "Closed",

  // --- Priority ---
  "priority.critical": "Critical",
  "priority.high": "High",
  "priority.medium": "Medium",
  "priority.low": "Low",

  // --- Task Type ---
  "type.bug": "Bug",
  "type.feature": "Feature",
  "type.task": "Task",
  "type.improvement": "Improvement",
  "type.epic": "Epic",

  // --- Common ---
  "common.cancel": "Cancel",
  "common.create": "Create",
  "common.creating": "Creating...",
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.loading": "Loading...",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.clear_filter": "Clear Filters",
  "common.archived": "Archived",
  "common.unarchive": "Unarchive",
  "common.archive": "Archive",
  "common.no_results": "No results found",
  "common.back": "Back",

  // --- Breadcrumb ---
  "breadcrumb.projects": "Projects",
  "breadcrumb.dashboard": "Dashboard",
  "breadcrumb.settings": "Settings",

  // --- Theme ---
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",

  // --- Menu ---
  "menu.settings": "Settings",
  "menu.logout": "Log Out",
  "menu.language": "Language",
  "menu.language_zh": "中文",
  "menu.language_en": "English",
  // --- Search ---
  "search.title": "Search",
  "search.placeholder": "Search tasks, projects...",
  "search.empty": "No results found",
  "search.tasks": "Tasks",
  "search.projects": "Projects",
  "search.search_tasks": "Search tasks...",
  "search.syntax_hint": "Syntax: status:todo priority:high type:bug assignee:alice tag:frontend",

  // --- Task ---
  "task.create": "New Task",
  "task.create_desc": "Create a new task in this project",
  "task.title": "Task Title",
  "task.title_placeholder": "Enter task title...",
  "task.description": "Description",
  "task.description_placeholder": "Enter task description...",
  "task.status": "Status",
  "task.priority": "Priority",
  "task.type": "Type",
  "task.due_date": "Due Date",
  "task.assignee": "Assignee",
  "task.estimate": "Estimate",
  "task.estimate.story_points": "Story Points",
  "task.estimate.hours": "Hours",
  "task.estimate.days": "Days",
  "task.created_at": "Created",
  "task.room_id": "Room ID",
  "task.loading": "Loading task...",
  "task.no_tasks": "No tasks yet",
  "task.no_tasks_hint": "Click \"New Task\" to create your first task",
  "task.details": "Details",
  "task.comments": "Comments",
  "task.attachments": "Attachments",
  "task.history": "History",
  "task.relations": "Relations",
  "task.tags": "Tags",
  "task.comment_placeholder": "Add a comment...",
  "task.upload_attachment": "Upload Attachment",
  "task.loading_comments": "Loading comments...",
  "task.no_comments_hint": "No comments yet. Be the first!",
  "task.no_attachments": "No attachments",

  // --- Dashboard ---
  "dashboard.title": "Dashboard",
  "dashboard.welcome": "Welcome back, {{name}}",
  "dashboard.my_tasks": "My Tasks",
  "dashboard.no_my_tasks": "No tasks assigned to you",
  "dashboard.upcoming": "Upcoming",

  // --- Kanban ---
  "kanban.drop_here": "Drop tasks here",
  "kanban.drop_to": "Drop to \"{{label}}\"",
  "kanban.label": "Board",

  // --- Project ---
  "project.title": "Project",
  "project.no_description": "No description",
  "project.name_placeholder": "Project name",
  "project.no_projects_hint": "No projects yet, create one",

  // --- List view ---
  "list.view": "List",
  "list.ticket_id": "ID",
  "list.title": "Title",
  "list.status": "Status",
  "list.priority": "Priority",
  "list.type": "Type",
  "list.assignee": "Assignee",
  "list.archive": "Archive",
  "list.show_archived": "Show Archived",
  "list.board": "Board",

  // --- Pagination ---
  "pagination.per_page": "Per page",
  "pagination.total": "{{n}} total",
  "pagination.items": "items, ",

  // --- Comments ---
  "comments.input_placeholder": "Add a comment...",
  "comments.loading": "Loading comments...",
  "comments.empty": "No comments yet. Be the first!",
  "comments.send": "Send",
  "comments.upload_attachment": "Upload Attachment",

  // --- Attachments ---
  "attachments.upload": "Upload Attachment",
  "attachments.no_attachments": "No attachments",
  "attachments.upload_hint": "Drag files here, or click to browse",
  "attachments.uploading": "Uploading {{progress}}%",
  "attachments.validation_failed": "File validation failed",
  "attachments.upload_failed": "Upload failed",

  // --- Settings ---
  "settings.title": "Settings",
  "settings.subtitle": "Account & App Settings",
  "settings.account_info": "Account Info",
  "settings.user_id": "User ID",
  "settings.not_logged_in": "Not logged in",
  "settings.connection_status": "Status",
  "settings.connected": "Connected",
  "settings.danger_zone": "Danger Zone",
  "settings.logout_desc": "Clear local session and return to login",
  "settings.logout": "Log Out",

  // --- Login ---
  "login.title": "Tamarix",
  "login.subtitle": "Matrix-based Task Management",
  "login.homeserver": "Homeserver",
  "login.homeserver_hint": "Matrix server domain (e.g. matrix.org)",
  "login.connecting": "Connecting...",
  "login.connect": "Connect",
  "login.server_url": "Server URL: {{url}}",
  "login.username": "Username",
  "login.password": "Password",
  "login.password_placeholder": "Enter password",
  "login.logging_in": "Logging in...",
  "login.login": "Log In",
  "login.or": "or",
  "login.login_via": "Log in via {{provider}}",
  "login.login_via_sso": "Log in via SSO",
  "login.no_supported_methods": "Server does not support any available login methods",
  "login.cannot_connect": "Cannot connect to server",
  "login.change_server": "Change Server",
  "login.agreement": "By logging in, you agree to use the Matrix protocol for data communication",
  "login.invalid_callback": "Invalid callback parameter",
  "login.session_expired": "Session expired, please log in again",
  "login.sso_failed": "SSO login failed",
  "login.completing": "Completing login",
  "login.verifying": "Verifying identity...",
  "login.back_to_login": "Back to login",

  // --- Restore ---
  "restore.restoring": "Restoring session...",

  // --- Errors ---
  "error.load_tasks": "Failed to load tasks",
  "error.create_task": "Failed to create task",
  "error.update_status": "Failed to update status",
  "error.load_projects": "Failed to load projects",
  "error.create_project": "Failed to create project",
  "error.load_comments": "Failed to load comments",
  "error.unsupported_file_type": "Unsupported file type: {{type}}",
  "error.file_size_exceeded": "File size exceeds limit (max {{max}}MB)",
  "error.invalid_transition": "Cannot transition from {{from}} to {{to}}",
  "error.login_failed": "Login failed",
  "error.restore_failed": "Failed to restore session",
  // --- Workflow ---
  "workflow.valid_transitions": "Allowed transitions",

  // --- Relation ---
  "relation.blocks": "Blocks",
  "relation.duplicates": "Duplicates",
  "relation.relates": "Relates to",
  "relation.subtask_of": "Subtask of",

  // --- History ---
  "history.show_all": "Show all ({{n}})",
  "history.ticket_id": "Ticket ID",
  "history.relation_to": "to",

  // --- Kanban ---
  "kanban.invalid_transition": "Cannot move task to \"{{to}}\"",
  "kanban.expand_column": "Expand",
  "kanban.collapse_column": "Collapse",

  // --- Notification ---
  "notification.title": "Notifications",
  "notification.empty": "No notifications",
  "notification.mark_read": "Mark as read",
  "notification.mark_all_read": "Mark all as read",
  "notification.assign": "assigned a task to you",
  "notification.status_change": "Task status changed",
  "notification.mention": "mentioned you in a comment",
  "notification.due_remind": "Task is due soon",

  // --- Project Management ---
  "project.settings": "Project Settings",
  "project.settings.name": "Project Name",
  "project.settings.description": "Project Description",
  "project.settings.save": "Save Settings",
  "project.settings.archive": "Archive Project",
  "project.members": "Members",
  "project.members.invite": "Invite Member",
  "project.members.remove": "Remove",
  "project.members.role": "Role",
  "project.template": "Project Template",
  "project.template.basic": "Basic Project",
  "project.template.kanban": "Kanban Project",
  "project.template.scrum": "Scrum Project",

  // --- Worklog ---
  "worklog.title": "Work Log",
  "worklog.add": "Log Work",
  "worklog.hours": "Hours",
  "worklog.hours_placeholder": "Enter hours...",
  "worklog.note": "Note",
  "worklog.note_placeholder": "Enter note...",
  "worklog.total": "Total Hours",
  "worklog.estimate_vs_actual": "Estimate vs Actual",
  "worklog.delete": "Delete Entry",
  "worklog.no_worklogs": "No work logs yet",

  // --- Bulk Operations ---
  "bulk.select": "Select",
  "bulk.selected": "{{n}} selected",
  "bulk.status": "Change Status",
  "bulk.priority": "Change Priority",
  "bulk.archive": "Bulk Archive",
  "bulk.add_tag": "Add Tag",
  "bulk.confirm": "Confirm Action",

  // --- Markdown Description ---
  "markdown.edit": "Edit",
  "markdown.preview": "Preview",
  "markdown.toolbar.bold": "Bold",
  "markdown.toolbar.italic": "Italic",
  "markdown.toolbar.code": "Code",
  "markdown.toolbar.link": "Link",
  "markdown.toolbar.list": "List",

  // --- Dashboard Enhancements ---
  "dashboard.overdue": "Overdue Tasks",
  "dashboard.overdue_count": "{{n}} overdue tasks",
  "dashboard.overdue_days": "{{n}}d overdue",
  "dashboard.team_workload": "Team Workload",
  "dashboard.project_progress": "Project Progress",
  "dashboard.quick_create": "Quick Create",
  "dashboard.recently_viewed": "Recently Viewed",
  "dashboard.completion_rate": "completion rate",
  "dashboard.unassigned": "Unassigned",
  "dashboard.overdue_tasks": "Overdue Tasks",

  // --- Attachments Delete ---
  "attachments.delete": "Delete",
  "attachments.delete_confirm": "Confirm Delete Attachment",
  "attachments.delete_desc": "This action cannot be undone. The attachment will be permanently deleted from the Matrix server.",

  // --- Task Watch ---
  "task.watch": "Watch",
  "task.unwatch": "Unwatch",
  "task.watchers": "Watchers",
  "task.metadata": "Properties",

  // --- Mobile ---
  "mobile.list_summary": "{{title}} - {{status}}",
  "mobile.comment_input_placeholder": "Write a comment...",

  // --- Encryption ---
  "encrypt.label": "End-to-End Encryption",
  "encrypt.description": "Messages and attachments in this room will be encrypted",
  "encrypt.encrypted": "Encrypted",
  "encrypt.unencrypted": "Not Encrypted",
  "encrypt.task_option": "Encrypt task room",
  "encrypt.project_option": "Encrypt project rooms",
  "encrypt.warning_as": "Note: Encrypted rooms cannot be read by the Application Service bot",
};

export default en;
