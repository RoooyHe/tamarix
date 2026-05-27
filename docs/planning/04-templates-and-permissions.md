> [项目计划](./README.md) / 模板与权限

# Room 创建模板（任务）

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
    { "type": "com.tamarix.description", "state_key": "",
      "content": { "body": "使用 Matrix 协议完成 OAuth2 登录流程", "format": "org.matrix.custom.html", "formatted_body": "<p>使用 Matrix 协议完成 OAuth2 登录流程</p>" } },
    { "type": "com.tamarix.notification_prefs", "state_key": "",
      "content": { "assign_notify": true, "status_change_notify": true, "due_remind": "1d", "mention_notify": true } },
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
        "com.tamarix.task_archived": 50,
        "com.tamarix.description": 0,
        "com.tamarix.worklog": 0,
        "com.tamarix.watcher": 0,
        "com.tamarix.task_version": 50,
        "com.tamarix.notification_prefs": 0
      }
    }}
  ]
}
```

### Room 创建模板（任务 -- E2EE 加密变体）

与上方模板相同，但在 `initial_state` 开头追加加密事件：

```json
{
  "type": "m.room.encryption",
  "state_key": "",
  "content": { "algorithm": "m.megolm.v1.aes-sha2" }
}
```

> **注意：** E2EE 只保护消息流（评论、附件），state event（`com.tamarix.*`）仍然是明文，服务器可读。加密房间无法被 AS Bot 读取。

---

## Space 创建模板（项目）

```json
{
  "name": "前端重构项目",
  "topic": "Q3 前端架构升级与组件库迁移",
  "creation_content": {
    "m.room.create": { "room_version": "11" },
    "m.federate": false,
    "type": "m.space"
  },
  "initial_state": [
    { "type": "m.room.name", "state_key": "", "content": { "name": "前端重构项目" } },
    { "type": "m.room.topic", "state_key": "", "content": { "topic": "Q3 前端架构升级与组件库迁移" } },
    { "type": "com.tamarix.sprint_meta", "state_key": "sprint-1", "content": { "name": "Sprint 1", "start": "2025-07-01", "end": "2025-07-14" } },
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
        "com.tamarix.sprint_meta": 100
      }
    }}
  ]
}
```

---

## 权限模型（Power Levels 映射）

| Power Level | 角色 | 能力 |
|---|---|---|
| 0 | 观察者 | 查看任务、添加标签(`com.tamarix.tags`)、发送消息(评论) |
| 50 | 成员 | 修改状态/优先级/截止日期/估算、邀请成员、归档/取消归档任务(`com.tamarix.task_archived`) |
| 100 | 管理员 | 修改任务类型、删除房间、设置 Sprint、修改权限 |
