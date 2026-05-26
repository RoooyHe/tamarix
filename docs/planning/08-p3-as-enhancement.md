> [项目计划](./README.md) / P3 AS 增强

# P3 -- AS 增强

**目标：** Application Service 后端增强层，与前端幂等共存，为 P2 前端兜底功能提供硬校验、自动化和索引增强。

**架构原则：AS 为增强层，前端可独立运行。** AS 与前端幂等共存--两端可安全同时运行，AS 发现前端已处理则跳过。

| # | 步骤 | 文件 | 说明 |
|---|---|---|---|
| 10 | AS 入口 | `as/src/index.ts` | 监听 Matrix 事件，分发到各处理器 |
| 11 | AS 编号生成 | `as/src/ticket-id.ts` | 监听 room 创建，**先检查是否已有 `com.tamarix.ticket_id`，有则跳过**，无则注入。与前端产出格式一致，两端安全共存 |
| 12 | AS 工作流引擎 | `as/src/workflow.ts` | 监听 `com.tamarix.task_status` 变更，非法流转发送 `m.room.message` 通知 + 回滚。前端软校验 + AS 硬校验 = 双重保障 |
| 13 | AS Schema 校验 | `as/src/schema.ts` | 自定义 state event JSON schema 校验，拒绝非法结构 |
| 14 | AS 搜索索引 | `as/src/indexer.ts` | 同步 state -- SQLite 索引，未来可暴露 HTTP API。前端内存搜索为默认，AS 索引为增强 |
| 15 | AS 配置 | `as/config.yaml` + `as/package.json` | homeserver.yaml 注册，独立包 |
| 16 | AS 通知 Bot | `as/src/notifier.ts` | 监听 `com.tamarix.assignee` 变更 -- 向被指派人发 `m.room.message` 通知；监听 `com.tamarix.task_status` 变更 -- 向 watchers 发通知；到期前扫描 -- 发提醒消息 |
| 17 | AS Watcher 管理 | `as/src/watcher.ts` | 监听 `com.tamarix.watcher` 变更，维护项目级 watcher 索引 |

---

## AS 与前端共存接口约定

| State Event | 前端行为 | AS 行为 | 共存策略 |
|---|---|---|---|
| `com.tamarix.ticket_id` | `createTask()` 时 `initial_state` 预注入 | 监听 create，**有则跳过，无则注入** | 幂等：先到先得，格式一致 |
| `com.tamarix.task_status` | UI 白名单校验，禁用非法操作 | 监听变更，**非法则回滚 + 通知** | 前端软校验 + AS 硬校验，互补 |
| `com.tamarix.description` | Markdown 编辑器写入，`marked` 渲染 | Schema 校验 `body`/`formatted_body`/`format` 结构 | 前端写入 + AS 校验 |
| `com.tamarix.worklog` | `addWorklog()` 多实例写入 | Schema 校验 `user_id`/`hours`/`logged_at` 结构 | 前端写入 + AS 校验 |
| `com.tamarix.watcher` | 关注按钮写入/移除 | 维护 watcher 索引，变更时触发通知 | 前端写入 + AS 索引增强 |
| `com.tamarix.notification_prefs` | 设置页读写 | 读取偏好决定是否发 Matrix 通知 | 前端读写 + AS 读取执行 |
| 搜索 | 内存 `Array.filter()`，即时响应 | SQLite 索引，未来 HTTP API | 前端默认，AS 可选切换 |
