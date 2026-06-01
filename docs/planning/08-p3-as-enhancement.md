> [项目计划](./README.md) / P3 AS 增强

# P3 -- AS 增强

**目标：** Application Service 后端增强层，与前端幂等共存，为 P2 前端兜底功能提供硬校验、自动化和索引增强。

**架构原则：AS 为增强层，前端可独立运行。** AS 与前端幂等共存--两端可安全同时运行，AS 发现前端已处理则跳过。E2EE 加密房间中 AS Bot 无法读取消息流（评论、附件），但 state event 仍为明文可处理。

**新增依赖（AS 独立包）：**

```bash
cd as && bun add matrix-bot-sdk better-sqlite3 ajv
cd as && bun add -d @types/better-sqlite3 typescript
```

> - `matrix-bot-sdk` -- Matrix Application Service SDK，提供 AppService 框架、Bot Intent、事件监听
> - `better-sqlite3` -- SQLite3 同步绑定，搜索索引存储
> - `ajv` -- JSON Schema 校验器，校验 `com.tamarix.*` state event 结构

**前端配合改动：**

```bash
bun add -d @types/better-sqlite3  # 仅类型参考
```

---

## 模块1: AS 基础设施

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS0a | AS 项目初始化 | `as/package.json` | Bun 项目，TypeScript strict，scripts: `dev`/`build`/`start` | 已完成 |
| AS0b | AS TypeScript 配置 | `as/tsconfig.json` | strict: true, target: ES2022, module: ESNext, outDir: dist | 已完成 |
| AS0c | AS 配置文件 | `as/config.yaml` | homeserver 注册配置：id、url、as_token、hs_token、sender_localpart、namespaces | 已完成 |
| AS0d | AS 入口 | `as/src/index.ts` | matrix-bot-sdk AppService 初始化，事件监听，分发到各处理器 | 已完成 |
| AS0e | Bot 客户端封装 | `as/src/bot.ts` | Bot Intent 封装，确保 Bot 已加入所有项目房间，提供 `sendMessage(roomId, body)` / `sendNotice(roomId, body)` / `sendStateEvent(roomId, type, stateKey, content)` | 已完成 |
| AS0f | 数据库初始化 | `as/src/db.ts` | better-sqlite3 初始化，建表（tasks / worklogs / watchers / versions / task_versions），提供 getDb() 单例 | 已完成 |
| AS0g | 项目发现 | `as/src/discovery.ts` | Bot 启动时扫描所有已注册 Space，加入子房间，初始化索引；定时全量同步（每小时） | 已完成 |
| AS0h | AS 环境变量 | `as/.env.example` | HOMESERVER_URL / AS_PORT / AS_TOKEN / HS_TOKEN / BOT_LOCALPART / DB_PATH | 已完成 |
| AS0i | 日志工具 | `as/src/logger.ts` | 统一日志（console + 可选文件输出），格式：`[AS] [模块] 消息` | 已完成 |

### AS config.yaml 结构

```yaml
id: "tamarix-as"
url: "http://localhost:9000"
as_token: "${AS_TOKEN}"
hs_token: "${HS_TOKEN}"
sender_localpart: "tamarix-bot"
namespaces:
  users:
    - exclusive: true
      regex: "@tamarix_.*:server\\.name"
  rooms:
    - exclusive: false
      regex: "!.*:server\\.name"
  aliases:
    - exclusive: true
      regex: "#tamarix_.*:server\\.name"
```

### AS SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS tasks (
  room_id TEXT PRIMARY KEY,
  project_room_id TEXT NOT NULL,
  ticket_id TEXT,
  title TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT,
  task_type TEXT,
  assignee TEXT,
  due_date TEXT,
  encrypted INTEGER DEFAULT 0,
  archived INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

CREATE TABLE IF NOT EXISTS worklogs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  state_key TEXT NOT NULL,
  user_id TEXT,
  hours REAL,
  note TEXT,
  logged_at INTEGER,
  FOREIGN KEY (room_id) REFERENCES tasks(room_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worklogs_room ON worklogs(room_id);

CREATE TABLE IF NOT EXISTS watchers (
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_watchers_user ON watchers(user_id);

CREATE TABLE IF NOT EXISTS versions (
  project_room_id TEXT NOT NULL,
  version_key TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'planned',
  release_date TEXT,
  description TEXT,
  PRIMARY KEY (project_room_id, version_key)
);

CREATE TABLE IF NOT EXISTS task_versions (
  room_id TEXT NOT NULL,
  version_key TEXT NOT NULL,
  PRIMARY KEY (room_id, version_key),
  FOREIGN KEY (room_id) REFERENCES tasks(room_id) ON DELETE CASCADE
);

-- FTS5 全文搜索虚拟表
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  title,
  note,
  content=tasks,
  content_rowid=rowid
);

-- 事件处理水位表（崩溃恢复用）
CREATE TABLE IF NOT EXISTS event_watermarks (
  stream_ordering INTEGER PRIMARY KEY,
  processed_at INTEGER NOT NULL
);

-- 已发送通知去重表
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  room_id TEXT NOT NULL,
  target_user TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  UNIQUE(event_type, room_id, target_user, sent_at)
);
```

---

## 模块2: 编号生成（AS 幂等）

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS1a | 编号生成器 | `as/src/ticket-id.ts` | `handleRoomCreated(event)` -- 监听 `m.room.create` 事件 | 已完成 |
| AS1b | 幂等检查 | `as/src/ticket-id.ts` | 检查房间是否已有 `com.tamarix.ticket_id` state event，有则跳过（前端已注入） | 已完成 |
| AS1c | 编号注入 | `as/src/ticket-id.ts` | 无则计算下一个编号（遍历同项目子房间最大 ticketId + 1），通过 Bot Intent 写入 `com.tamarix.ticket_id` | 已完成 |

### 幂等共存逻辑

```
Room 创建事件 → 检查 com.tamarix.ticket_id state
  ├─ 已存在 → 跳过（前端已注入，格式一致）
  └─ 不存在 → 扫描项目子房间 → 找最大编号 → 写入 TAM-{n+1}
```

> 编号格式与前端 `generateNextTicketId()` 产出完全一致（`TAM-{n}`），两端安全共存。

---

## 模块3: 工作流引擎（AS 硬校验）

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS2a | 工作流校验 | `as/src/workflow.ts` | 监听 `com.tamarix.task_status` 变更事件 | 已完成 |
| AS2b | 流转校验 | `as/src/workflow.ts` | `validateTransition(from, to)` -- 使用与前端相同的 VALID_TRANSITIONS 白名单 | 已完成 |
| AS2c | 非法回滚 | `as/src/workflow.ts` | 校验失败：回滚 `com.tamarix.task_status` 到上一个合法值 | 已完成 |
| AS2d | 回滚通知 | `as/src/workflow.ts` | 回滚后向房间发送 `m.room.message` notice 通知操作者和房间成员 | 已完成 |
| AS2e | E2EE 降级 | `as/src/workflow.ts` | 加密房间中 state event 仍为明文，工作流校验正常执行 | 已完成 |

### 工作流校验流程

```
com.tamarix.task_status 变更事件
  → 读取旧值（from）和新值（to）
  → validateTransition(from, to)
    ├─ 合法 → 更新索引，通知 watchers
    └─ 非法 → 回滚到 from + 发送 notice 通知
```

### 合法流转规则（与前端一致）

```
todo      → [in_progress, closed]
in_progress → [review, todo, closed]
review    → [done, in_progress, closed]
done      → [closed]
closed    → []（终态）
```

---

## 模块4: Schema 校验

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS3a | Schema 定义目录 | `as/src/schemas/` | 每个 `com.tamarix.*` event 类型一个 JSON Schema 文件 | 已完成 |
| AS3b | task_status Schema | `as/src/schemas/task-status.json` | `{ "type": "object", "properties": { "status": { "enum": ["todo","in_progress","review","done","closed"] } }, "required": ["status"] }` | 已完成 |
| AS3c | priority Schema | `as/src/schemas/priority.json` | `{ "level": { "enum": ["critical","high","medium","low"] } }` | 已完成 |
| AS3d | task_type Schema | `as/src/schemas/task-type.json` | `{ "type": { "enum": ["bug","feature","task","improvement","epic"] } }` | 已完成 |
| AS3e | description Schema | `as/src/schemas/description.json` | `{ "body": string, "format": "org.matrix.custom.html", "formatted_body": string }` -- body 必填，format/formatted_body 可选 | 已完成 |
| AS3f | worklog Schema | `as/src/schemas/worklog.json` | `{ "user_id": string, "hours": number >= 0, "note": string, "logged_at": string }` -- user_id/hours/logged_at 必填 | 已完成 |
| AS3g | tags Schema | `as/src/schemas/tags.json` | `{ "tags": { "type": "array", "items": { "type": "string" } } }` | 已完成 |
| AS3h | assignee Schema | `as/src/schemas/assignee.json` | `{ "user_id": { "type": "string", "pattern": "^@.+:.+$" } }` -- Matrix ID 格式 | 已完成 |
| AS3i | due_date Schema | `as/src/schemas/due-date.json` | `{ "date": { "type": "string", "format": "date-time" } }` | 已完成 |
| AS3j | estimate Schema | `as/src/schemas/estimate.json` | `{ "points": number >= 0, "unit": { "enum": ["story_points","hours","days"] } }` | 已完成 |
| AS3k | ticket_id Schema | `as/src/schemas/ticket-id.json` | `{ "id": { "type": "string", "pattern": "^TAM-\\d+$" } }` | 已完成 |
| AS3l | version Schema | `as/src/schemas/version.json` | `{ "name": string, "status": enum, "release_date": string?, "description": string? }` | 已完成 |
| AS3m | watcher Schema | `as/src/schemas/watcher.json` | `{ "user_id": string, Matrix ID 格式 }` | 已完成 |
| AS3n | notification_prefs Schema | `as/src/schemas/notification-prefs.json` | `{ "assign_notify": boolean, "status_change_notify": boolean, "due_remind": string, "mention_notify": boolean }` | 已完成 |
| AS3o | relation Schema | `as/src/schemas/relation.json` | `{ "rel_type": enum, "target_room": string }` | 已完成 |
| AS3p | Schema 校验器 | `as/src/schema.ts` | ajv 编译所有 schema，导出 `validateEvent(type, content)` 函数 | 已完成 |
| AS3q | Schema 校验回调 | `as/src/schema.ts` | 监听 state event 变更，校验失败：发送 notice 通知 + 可选 redact 非法 event | 已完成 |

### Schema 校验流程

```
state event 变更
  → 查找对应 JSON Schema
  → validateEvent(type, content)
    ├─ 合法 → 更新索引
    └─ 非法 → 发送 notice 通知（说明哪些字段不合法）
              → 可选：redact 非法 event（配置开关，默认仅通知不 redact）
```

---

## 模块5: 搜索索引

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS4a | 索引同步 | `as/src/indexer.ts` | 监听所有 `com.tamarix.*` state event 变更，upsert 到 SQLite tasks 表 | 已完成 |
| AS4b | 工时索引 | `as/src/indexer.ts` | 监听 `com.tamarix.worklog` 变更，upsert 到 worklogs 表 | 已完成 |
| AS4c | Watcher 索引 | `as/src/watcher.ts` 内 | 监听 `com.tamarix.watcher` 变更，upsert 到 watchers 表 | 已完成 |
| AS4d | 版本索引 | `as/src/indexer.ts` | 监听 `com.tamarix.version` / `com.tamarix.task_version` 变更，upsert 到 versions / task_versions 表 | 已完成 |
| AS4e | 房间删除/归档清理 | `as/src/indexer.ts` | 监听 `com.tamarix.task_archived` 变更，更新 archived 标记；监听房间删除，从索引移除 | 已完成 |
| AS4f | HTTP API 框架 | `as/src/api.ts` | Bun 原生 HTTP server 或 Fastify，路由注册 | 已完成 |
| AS4g | 搜索 API | `as/src/api.ts` | `GET /api/search?q={query}&project={roomId}&status={status}&assignee={userId}` -- SQLite FTS5 全文搜索 | 已完成 |
| AS4h | 任务列表 API | `as/src/api.ts` | `GET /api/tasks?project={roomId}&status={status}&page={n}&limit={n}` -- 分页查询 | 已完成 |
| AS4i | 统计 API | `as/src/api.ts` | `GET /api/stats?project={roomId}` -- 各状态任务数、版本进度 | 已完成 |
| AS4j | E2EE 状态 API | `as/src/api.ts` | `GET /api/rooms/{roomId}/e2ee-status` -- 返回加密状态和降级功能列表 | 已完成 |
| AS4k | 健康检查 API | `as/src/api.ts` | `GET /api/health` -- AS 运行状态、Bot 连接状态、DB 状态 | 已完成 |
| AS4l | API 认证 | `as/src/api.ts` | Bearer token 校验（配置 API_TOKEN 环境变量），或 Matrix access token 校验 | 已完成 |
| AS4m | 前端搜索源状态 | `src/lib/stores/ui.svelte.ts` | 新增 `searchSource: $state<'local' | 'as'>('local')` | 已完成 |
| AS4n | AS 搜索函数 | `src/lib/matrix/search.ts` 扩展 | 新增 `searchViaAS(query, filters?)` -- HTTP GET 调用 AS 搜索 API | 已完成 |
| AS4o | AS 状态 Store | `src/lib/stores/as-status.svelte.ts` | 新文件：`asAvailable: $state<boolean>(false)`；`checkHealth()` 定时 ping `/api/health`（每60秒）；`asUrl: $state<string>('')` | 已完成 |
| AS4p | 搜索源切换 UI | `src/routes/search/+page.svelte` | 设置项切换本地/AS 搜索；AS 不可用时自动降级为本地搜索 | 已完成 |
| AS4q | AS 配置 UI | `src/routes/settings/+page.svelte` | AS URL 配置输入框；健康检测按钮；连接状态指示 | 已完成 |
| AS4r | FTS5 建表 | `as/src/db.ts` | `CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(title, note, content=tasks, content_rowid=rowid)` -- 全文搜索虚拟表 | 已完成 |

---

## 模块6: 通知 Bot + Watcher 管理

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS5a | 指派通知 | `as/src/notifier.ts` | 监听 `com.tamarix.assignee` 变更，向被指派人发 1:1 房间 `m.room.message` notice | 已完成 |
| AS5b | 状态变更通知 | `as/src/notifier.ts` | 监听 `com.tamarix.task_status` 变更，查询 watchers 表，向所有 watcher 发通知 | 已完成 |
| AS5c | 到期提醒扫描 | `as/src/notifier.ts` | 定时任务（每30分钟），扫描所有 due_date 距今 < 24h 的未完成任务，向 assignee + watchers 发提醒 | 已完成 |
| AS5d | @提及检测 | `as/src/notifier.ts` | 监听 `m.room.message`，正则匹配 `@userId:server` 格式提及，向被提及者发通知 | 已完成 |
| AS5e | 通知偏好过滤 | `as/src/notifier.ts` | 发通知前读取目标用户 `com.tamarix.notification_prefs`，尊重用户偏好（assign_notify / status_change_notify / due_remind / mention_notify） | 部分完成 |
| AS5f | 1:1 房间管理 | `as/src/notifier.ts` | Bot 与用户首次通信时自动创建 1:1 房间（`m.room.create` with `is_direct: true`） | 已完成 |
| AS5g | 通知格式 | `as/src/notifier.ts` | `m.room.message` notice 格式：`[Tamarix] {ticketId} {title}: {变更描述}` | 已完成 |
| AS5h | Watcher 索引维护 | `as/src/watcher.ts` | 监听 `com.tamarix.watcher` 变更，upsert/delete watchers 表 | 已完成 |
| AS5i | 项目级 Watcher | `as/src/watcher.ts` | Space 级 watcher 自动关注所有子房间变更（子房间 status/assignee 变更时，Space watcher 也收到通知） | 已完成 |
| AS5j | Watcher 通知分发 | `as/src/watcher.ts` | 查询 watchers 表获取关注者列表，调用 notifier 发通知 | 已完成 |
| AS5k | 通知 i18n | `as/src/notifier.ts` | 通知消息支持中/英双语（读取用户 locale 偏好，默认英文） | 未完成 |

### 通知触发链

```
state event 变更
  → 识别变更类型（assignee / status / due_date）
  → 查询 watchers 表获取关注者
  → 合并 assignee（如不同）
  → 逐个读取 notification_prefs 过滤
  → 创建/复用 1:1 房间
  → 发送 m.room.message notice
```

### 到期提醒流程

```
每30分钟定时触发
  → 查询 tasks 表：due_date < now + 24h AND status NOT IN (done, closed) AND archived = 0
  → 逐任务：读取 assignee + watchers
  → 检查 notification_prefs.due_remind（1d / 4h / 1h / none）
  → 过滤后发送提醒通知
```

---

## 模块7: E2EE 降级处理

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS7a | E2EE 房间检测 | `as/src/e2ee-guard.ts` | `isRoomEncrypted(roomId)` -- 检查 `m.room.encryption` state event；房间创建时自动检测并标记 tasks.encrypted | 已完成 |
| AS7b | E2EE 功能降级 | `as/src/e2ee-guard.ts` | `getDegradedFeatures(roomId)` -- 返回加密房间中不可用的 AS 功能列表 | 已完成 |
| AS7c | 加密房间事件过滤 | `as/src/index.ts` | `m.room.message` 事件在加密房间中跳过（@提及检测、评论索引） | 已完成 |
| AS7d | 降级功能对照导出 | `as/src/e2ee-guard.ts` | `DEGRADED_FEATURES` 常量映射，供 API 返回和日志记录 | 已完成 |
| AS7e | E2EE 状态 API | `as/src/api.ts` 内 | `GET /api/rooms/{roomId}/e2ee-status` -- 返回 `{ encrypted: boolean, degraded_features: string[] }` | 已完成 |
| AS7f | 前端 AS 状态检测 | `src/lib/stores/as-status.svelte.ts` | 定时 ping `/api/health`；`asAvailable` 状态；`checkE2eeStatus(roomId)` 方法 | 已完成 |
| AS7g | 前端降级提示 UI | `src/routes/project/[id]/task/[taskId]/+page.svelte` | 加密任务详情页显示 Banner：当前任务为加密房间，AS 以下增强功能不可用：{列表} | 已完成 |
| AS7h | 降级 i18n | `src/lib/i18n/locales/zh.ts` + `en.ts` | `as.degraded_title` / `as.degraded_features` / `as.degraded_mention` / `as.degraded_comment_index` / `as.degraded_attachment_index` | 已完成 |

### E2EE 降级功能对照表

| 功能 | 非加密房间 | 加密房间 | 原因 |
|------|-----------|----------|------|
| 编号生成 | AS 自动注入 | AS 自动注入 | state event 明文 |
| 工作流校验 | AS 硬校验+回滚 | AS 硬校验+回滚 | state event 明文 |
| Schema 校验 | AS 校验 | AS 校验 | state event 明文 |
| 元数据搜索索引 | SQLite 索引 | SQLite 索引 | state event 明文 |
| 评论内容索引 | SQLite 索引 | 不可用 | m.room.message 加密 |
| 附件索引 | SQLite 索引 | 不可用 | m.room.message 加密 |
| 指派通知 | Bot 发 m.room.message | Bot 发 m.room.message | Bot 可发不可读，1:1 房间不加密 |
| 状态变更通知 | Bot 发通知 | Bot 发通知 | 基于 state event，1:1 房间 |
| 到期提醒 | Bot 发通知 | Bot 发通知 | 基于 state event，1:1 房间 |
| @提及检测 | Bot 检测并通知 | 不可用 | 无法读取消息内容 |

---

## 模块8: AS 可靠性与运维

AS 已完成核心功能，但生产级部署需要增加可靠性保障、运维工具和监控能力。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS8a | 事件水位持久化 | `as/src/db.ts` + `as/src/index.ts` | 记录已处理事件的 stream_ordering 到 event_watermarks 表；AS 重启后从水位点续传，避免事件遗漏 | 未完成 |
| AS8b | 通知去重 | `as/src/notifier.ts` | 写入 notification_log 表记录已发送通知；同一事件 + 目标用户 + 时间窗口内不重复发送 | 未完成 |
| AS8c | 通知偏好读取 | `as/src/notifier.ts` | 从 `com.tamarix.notification_prefs` state event 读取用户偏好；目前使用硬编码默认值，需改为从 Matrix 读取 | 未完成 |
| AS8d | Bot 权限自提升 | `as/src/bot.ts` | Bot 加入房间时检查自身 Power Level，若 < 50 则请求提升（需管理员预授权）；确保回滚 state event 和发送通知的权限 | 未完成 |
| AS8e | WAL 模式配置 | `as/src/db.ts` | SQLite 启用 WAL 模式：`PRAGMA journal_mode=WAL`；提升并发读写性能，避免事件处理阻塞 | 未完成 |
| AS8f | 事件队列串行处理 | `as/src/index.ts` | 事件处理通过队列串行化，避免 SQLite 并发写入冲突；使用内存队列 + 串行消费 | 未完成 |
| AS8g | 增量同步 | `as/src/discovery.ts` | 全量同步后记录同步水位；后续同步仅处理 `since` token 以来变更的房间，减少初始化耗时 | 未完成 |
| AS8h | 通知 i18n | `as/src/notifier.ts` | 通知消息支持中/英双语；读取目标用户 `com.tamarix.notification_prefs.locale` 偏好，默认英文 | 未完成 |
| AS8i | 分批项目发现 | `as/src/discovery.ts` | 首次启动分批处理 Space 子房间（每批 50 个），避免大量房间初始化时内存溢出；添加进度日志 | 未完成 |
| AS8j | 1:1 房间创建重试 | `as/src/notifier.ts` | DM 房间创建失败时重试 3 次（间隔 1s/2s/5s）；失败记录日志不影响主流程 | 未完成 |
| AS8k | API 限流 | `as/src/api.ts` | 简易限流：基于 IP 的滑动窗口（60 次/分钟）；防止 API 滥用 | 未完成 |
| AS8l | API CORS | `as/src/api.ts` | 配置允许的 Origin 列表（默认 `localhost:5173`）；跨域请求支持 | 未完成 |

### 事件水位恢复流程

```
AS 启动 → 读取 event_watermarks 最后记录
  ├─ 有记录 → 从 stream_ordering + 1 开始续传
  └─ 无记录 → 执行全量同步
每处理一个事件 → 更新水位
```

### 通知去重逻辑

```
准备发送通知
  → 查询 notification_log（event_type + room_id + target_user + 时间窗口）
  ├─ 已存在 → 跳过（避免重复通知）
  └─ 不存在 → 发送通知 + 写入 notification_log
定期清理 7 天前的记录
```

---

## 模块9: AS HTTP API 增强

现有 API 覆盖了搜索、任务列表、统计、E2EE 状态等基础能力。以下增强项面向 P4 功能支持和更好的开发者体验。

| # | 步骤 | 文件 | 说明 | 状态 |
|---|------|------|------|------|
| AS9a | 版本进度 API | `as/src/api.ts` | `GET /api/versions?project={roomId}` -- 返回项目下所有版本及其各状态任务数 | 未完成 |
| AS9b | 任务详情 API | `as/src/api.ts` | `GET /api/tasks/{roomId}` -- 返回单个任务的完整索引数据（含工时汇总、版本关联） | 未完成 |
| AS9c | 活动 Stream API | `as/src/api.ts` | `GET /api/activity?project={roomId}&limit={n}` -- 最近变更记录（状态变更、指派变更等），按 updated_at 排序 | 未完成 |
| AS9d | 批量查询 API | `as/src/api.ts` | `POST /api/tasks/batch` -- body: `{ room_ids: string[] }`，批量获取任务数据 | 未完成 |
| AS9e | WebSocket 实时推送 | `as/src/api.ts` | `WS /api/ws` -- 订阅项目/任务变更事件流；前端可替代部分 Sync 轮询，降低延迟 | 未完成 |
| AS9f | OpenAPI 文档 | `as/docs/api.yaml` | 自动生成或手写 OpenAPI 3.0 规范；便于前端集成测试和第三方开发 | 未完成 |
| AS9g | Git Webhook API | `as/src/api.ts` | `POST /api/webhook/git/{provider}` -- 接收 GitHub/GitLab push webhook，触发 git-bridge | 未完成 |

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
| `com.tamarix.assignee` | AssigneeSelect 写入 | 监听变更，触发指派通知 | 前端写入 + AS 通知增强 |
| `com.tamarix.due_date` | DatePicker 写入 | 定时扫描，到期提醒 | 前端写入 + AS 提醒增强 |
| `com.tamarix.version` | VersionSelect 写入 | 维护版本索引 | 前端写入 + AS 索引增强 |
| 搜索 | 内存 `Array.filter()`，即时响应 | SQLite FTS5 索引，HTTP API | 前端默认，AS 可选切换 |

---

## AS HTTP API 路由汇总

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/health` | AS 运行状态、Bot 连接、DB 状态 | 无 |
| GET | `/api/search?q={query}&project={id}&status={s}&assignee={u}&page={n}` | 全文搜索 | Bearer |
| GET | `/api/tasks?project={id}&status={s}&page={n}&limit={n}` | 任务列表分页 | Bearer |
| GET | `/api/tasks/{roomId}` | 任务详情 | Bearer |
| POST | `/api/tasks/batch` | 批量查询任务 | Bearer |
| GET | `/api/stats?project={id}` | 项目统计（各状态数、版本进度） | Bearer |
| GET | `/api/versions?project={id}` | 版本列表及进度 | Bearer |
| GET | `/api/activity?project={id}&limit={n}` | 最近活动流 | Bearer |
| GET | `/api/rooms/{roomId}/e2ee-status` | 加密状态和降级功能 | Bearer |
| WS | `/api/ws` | 实时变更推送 | Bearer |
| POST | `/api/webhook/git/{provider}` | Git webhook 接收 | Webhook Secret |

---

## 前端配合改动汇总

| 文件 | 改动 | 说明 | 状态 |
|------|------|------|------|
| `src/lib/stores/ui.svelte.ts` | 新增 `searchSource: $state<'local' | 'as'>('local')` | 搜索源切换 | 已完成 |
| `src/lib/matrix/search.ts` | 新增 `searchViaAS(query, filters?)` | HTTP GET 调用 AS 搜索 API | 已完成 |
| `src/lib/stores/as-status.svelte.ts` | 新文件 | AS 健康检测 + E2EE 状态查询 | 已完成 |
| `src/routes/search/+page.svelte` | 搜索源切换设置 | local / as 选项 | 已完成 |
| `src/routes/settings/+page.svelte` | AS URL 配置 | AS 连接设置 | 已完成 |
| `src/routes/project/[id]/task/[taskId]/+page.svelte` | E2EE 降级 Banner | 加密任务显示 AS 功能降级提示 | 已完成 |
| `src/lib/components/layout/AppHeader.svelte` | AS 状态指示 | 在线/离线小圆点 | 已完成 |
| `src/lib/i18n/locales/zh.ts` | AS 相关 key | as.status_online / as.status_offline / as.degraded_* / as.search_source / as.url | 已完成 |
| `src/lib/i18n/locales/en.ts` | AS 相关 key | 同上英文版 | 已完成 |

### 前端 AS 相关 i18n Key

```typescript
// zh.ts 新增
"as.status_online": "AS 在线",
"as.status_offline": "AS 离线",
"as.search_source": "搜索源",
"as.search_local": "本地搜索",
"as.search_as": "AS 搜索",
"as.url": "AS 服务地址",
"as.url_placeholder": "http://localhost:9000",
"as.health_check": "检测连接",
"as.health_ok": "AS 连接正常",
"as.health_failed": "AS 连接失败",
"as.degraded_title": "加密任务功能降级",
"as.degraded_desc": "当前任务为加密房间，以下 AS 增强功能不可用：",
"as.degraded.mention": "@提及通知",
"as.degraded.comment_index": "评论搜索索引",
"as.degraded.attachment_index": "附件搜索索引",
```

---

## AS 项目文件结构

```
as/
├── package.json
├── tsconfig.json
├── .env.example
├── config.yaml
├── docs/
│   └── api.yaml              # OpenAPI 3.0 规范
└── src/
    ├── index.ts              # AS 入口：AppService 初始化 + 事件分发
    ├── bot.ts                # Bot Intent 封装
    ├── db.ts                 # SQLite 数据库初始化 + getDb() 单例
    ├── discovery.ts          # 启动时项目发现 + 定时全量同步
    ├── logger.ts             # 统一日志工具
    ├── ticket-id.ts          # 编号生成（幂等）
    ├── workflow.ts           # 工作流引擎（硬校验 + 回滚 + 通知）
    ├── schema.ts             # Schema 校验器（ajv）
    ├── indexer.ts            # 搜索索引同步（state → SQLite）
    ├── notifier.ts           # 通知 Bot（指派/状态/到期/@提及）
    ├── watcher.ts            # Watcher 管理（索引 + 通知分发）
    ├── e2ee-guard.ts         # E2EE 降级处理
    ├── git-bridge.ts         # Git Webhook 集成
    ├── api.ts                # HTTP API 路由
    └── schemas/              # JSON Schema 定义
        ├── task-status.json
        ├── priority.json
        ├── task-type.json
        ├── description.json
        ├── worklog.json
        ├── tags.json
        ├── assignee.json
        ├── due-date.json
        ├── estimate.json
        ├── ticket-id.json
        ├── version.json
        ├── watcher.json
        ├── notification-prefs.json
        └── relation.json
```

---

## 实施顺序建议

### 已完成批次（第一批~第四批）

| 顺序 | 步骤 | 依赖 |
|------|------|------|
| 1 | AS0a ~ AS0i | 无 |
| 2 | AS1a ~ AS1c | AS0 |
| 3 | AS2a ~ AS2e | AS0 |
| 4 | AS3a ~ AS3q | AS0 |
| 5 | AS4a ~ AS4r | AS0, AS0f |
| 6 | AS5a ~ AS5j | AS0, AS5h |
| 7 | AS7a ~ AS7h | AS0, AS4g |

### 第五批：可靠性增强

| 顺序 | 步骤 | 依赖 |
|------|------|------|
| 8 | AS8a 事件水位持久化 | AS0f |
| 9 | AS8b 通知去重 | AS0f |
| 10 | AS8c 通知偏好读取 | AS5a |
| 11 | AS8d Bot 权限自提升 | AS0e |
| 12 | AS8e WAL 模式配置 | AS0f |
| 13 | AS8f 事件队列串行处理 | AS0d |
| 14 | AS8g 增量同步 | AS0g |
| 15 | AS8h 通知 i18n | AS5a |
| 16 | AS8i 分批项目发现 | AS0g |
| 17 | AS8j 1:1 房间创建重试 | AS5f |
| 18 | AS8k API 限流 | AS4f |
| 19 | AS8l API CORS | AS4f |

### 第六批：API 增强

| 顺序 | 步骤 | 依赖 |
|------|------|------|
| 20 | AS9a 版本进度 API | AS4f |
| 21 | AS9b 任务详情 API | AS4f |
| 22 | AS9c 活动 Stream API | AS4f |
| 23 | AS9d 批量查询 API | AS4f |
| 24 | AS9e WebSocket 实时推送 | AS4f |
| 25 | AS9f OpenAPI 文档 | AS4f |
| 26 | AS9g Git Webhook API | git-bridge.ts |

---

## AS 启动流程

```
1. 读取 .env / config.yaml
2. 初始化 AppService (matrix-bot-sdk)
3. 初始化 SQLite (better-sqlite3)
4. 运行数据库迁移（建表）
5. 启动 Bot Intent，连接 homeserver
6. 运行项目发现（扫描 Space + 加入子房间）
7. 全量同步索引（遍历所有房间 state event）
8. 注册事件处理器：
   - m.room.create → ticket-id.ts
   - com.tamarix.task_status → workflow.ts + indexer.ts
   - com.tamarix.assignee → notifier.ts + indexer.ts
   - com.tamarix.* → schema.ts + indexer.ts
   - com.tamarix.watcher → watcher.ts
   - m.room.message → notifier.ts (@提及)
9. 启动定时任务：
   - 每30分钟：到期提醒扫描
   - 每60分钟：全量索引同步
10. 启动 HTTP API server (端口 9000)
11. 日志：AS 启动完成
```

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AS Bot 权限不足 | 无法回滚 state event / 发送消息 | 确保Bot Power Level >= 100；首次加入房间时提升权限 |
| SQLite 并发写入 | 事件处理阻塞 | better-sqlite3 WAL 模式；事件队列串行处理 |
| 大量房间初始化慢 | 首次启动耗时长 | 分批处理 + 进度日志；增量同步（仅处理 startSnc 以来事件） |
| AS 与前端同时写 ticket_id | 编号冲突 | 幂等检查：先到先得；编号用 MAX+1 避免重复 |
| 1:1 房间创建失败 | 通知无法送达 | 重试机制（3次）；失败记录日志，不影响主流程 |
| E2EE 房间误处理 | 尝试读取加密消息失败 | e2ee-guard 预检查，加密房间跳过消息处理 |
| AS 崩溃重启 | 事件遗漏 | 记录已处理 event_id 水位；重启后从水位点续传 |
| API 无认证 | 数据泄露 | 强制 Bearer token；生产环境建议 HTTPS + 限流 |
| WebSocket 连接管理 | 内存泄漏/断连 | 心跳检测（30s ping/pong）；断连自动重连；最大连接数限制 |
| 通知风暴 | 短时间内大量通知 | 通知合并（同一任务多变更聚合）；速率限制；用户偏好过滤 |
