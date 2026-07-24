> [项目计划](./README.md) / P6 注册与第三方

# P6 -- 注册与第三方

**目标：** 补齐 Tamarix 的账号进入路径和第三方生态能力：Matrix 注册、邀请注册、SSO 登录完善、邮箱/手机号 3PID 绑定、账号恢复入口，以及 GitHub/GitLab/企业 IM/Webhook 等第三方集成的授权与管理。

**核心原则：Tamarix 不成为身份源。** 用户身份仍由 Matrix Homeserver 管理；Tamarix 只做协议客户端和体验编排。注册、登录、SSO、3PID 绑定必须优先走 Matrix Client-Server API。需要第三方 OAuth client secret、Webhook secret、长期刷新令牌的能力放在 AS 或部署方后端，不能写入 Matrix state event 或浏览器 localStorage。

**当前基础：** 登录页已经实现 homeserver 发现、`GET /login` 流程发现、密码登录、SSO/CAS 跳转和 `loginToken` 回调；P6 在此基础上扩展注册、账号绑定、第三方连接管理和开放 API 文档。

---

## 范围边界

| 类型        | P6 包含                                                                      | P6 不包含                                          |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| Matrix 注册 | 用户注册、用户名可用性检查、UIA 流程、注册 token、条款、captcha/邮件校验提示 | 自建用户库、自建密码体系                           |
| 第三方登录  | 基于 homeserver 暴露的 SSO/IdP 列表展示、回调稳定性、错误恢复                | Tamarix 直接接入 Google/GitHub OAuth 并绕过 Matrix |
| 账号绑定    | 邮箱/手机号 3PID 查看、绑定、解绑、用于登录提示                              | 绕过 homeserver 的身份验证                         |
| 邀请进入    | 邀请链接、注册后自动进入项目、项目成员邀请落地页                             | 复杂外部组织目录同步                               |
| 第三方集成  | OAuth 连接管理、Webhook 入口、GitHub/GitLab/飞书/钉钉/企业微信等扩展点       | 把第三方密钥存进 Matrix room state                 |
| 开放能力    | AS API token、OpenAPI、Webhook 签名、集成审计                                | 完整插件市场                                       |

---

## 实施状态总览

| 模块                         | 说明                                                               | 状态     | 待完成项                                   |
| ---------------------------- | ------------------------------------------------------------------ | -------- | ------------------------------------------ |
| 模块1: 注册入口              | `/register` 页面、用户名检查、homeserver 注册策略识别              | 部分完成 | 服务器注册策略精细识别                     |
| 模块2: Matrix UIA 流程       | terms、dummy、registration_token、email/msisdn、captcha 的统一处理 | 部分完成 | email/msisdn/captcha 交互、单测            |
| 模块3: SSO 登录增强          | 已有 SSO 基础上完善 IdP 展示、state 校验、错误恢复                 | 部分完成 | e2e 测试                                   |
| 模块4: 3PID 与账号恢复       | 邮箱/手机号绑定、解绑、密码恢复入口                                | 部分完成 | 手机绑定、忘记密码                         |
| 模块5: 邀请注册与加入项目    | 邀请链接、登录后继续、注册后自动 join/invite accept                | 部分完成 | Matrix URI 支持、邀请审计                  |
| 模块6: 第三方连接中心        | Settings 中管理外部连接，前端只保存非敏感元数据                    | 部分完成 | 项目级权限、连接事件历史、AS 实际 provider |
| 模块7: AS OAuth/Webhook 服务 | 需要服务端密钥的第三方集成由 AS 承接                               | 部分完成 | OAuth callback、secret 存储、Webhook 签名  |
| 模块8: 开放 API 与开发者文档 | OpenAPI、API token、Webhook 签名、示例                             | 计划中   | D1 ~ D8                                    |

> 代码实施状态（2026-06-02）：已新增 Matrix 注册页、UIA helper、SSO state 校验、3PID 邮箱绑定 store、邀请落地页、第三方集成 store/provider catalog，并在设置页展示账号与第三方连接中心。AS 侧 OAuth/Webhook 目前只落到前端契约，真实 callback、secret 存储和 provider 同步仍需后续实现。

---

## 模块1: 注册入口

注册入口应复用当前登录页的 homeserver 发现逻辑。用户先输入 homeserver，Tamarix 再判断是否支持注册、支持哪些 UIA 阶段，以及是否允许公开注册。

| #   | 步骤             | 文件                                    | 说明                                                                                   | 状态     |
| --- | ---------------- | --------------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| R1  | 注册路由         | `src/routes/register/+page.svelte`      | 新增注册页面，沿用登录页的紧凑暗色表单布局                                             | 已完成   |
| R2  | 登录页入口       | `src/routes/login/+page.svelte`         | 在发现 homeserver 后展示“创建账号”入口；服务器不支持注册时隐藏或禁用                   | 部分完成 |
| R3  | Auth API 封装    | `src/lib/matrix/auth.ts`                | 增加 `checkUsernameAvailable()`、`startRegistration()`、`continueRegistration()`       | 已完成   |
| R4  | 用户名可用性检查 | `/_matrix/client/v3/register/available` | 输入防抖检查；提示“可用/已占用/格式不支持”                                             | 已完成   |
| R5  | 注册基础表单     | register page                           | username/password/confirm password/device name/可选 registration token                 | 已完成   |
| R6  | 密码规则提示     | register page                           | 显示 homeserver 返回的错误，不在前端硬编码过强规则                                     | 计划中   |
| R7  | 注册成功登录     | auth store                              | 若注册返回 access token，立即持久化并进入 dashboard；若 `inhibit_login` 返回则跳转登录 | 已完成   |
| R8  | 错误归一化       | `src/lib/matrix/errors.ts`              | 处理 `M_USER_IN_USE`、`M_INVALID_USERNAME`、`M_FORBIDDEN`、`M_LIMIT_EXCEEDED`          | 部分完成 |
| R9  | i18n             | `zh.ts` / `en.ts`                       | 注册页面中英文文本                                                                     | 已完成   |

### 注册数据流

```text
homeserver 输入
  -> .well-known / direct baseUrl
  -> register/available 检查 username
  -> POST /register
  -> 若 401 返回 UIA flows/session，则进入模块2
  -> 若 200 返回 access_token，则初始化 Matrix client
```

---

## 模块2: Matrix UIA 流程

Matrix 注册可能返回 User-Interactive Authentication 流程。P6 需要把 UIA 抽成可复用引擎，避免把 terms/token/email/captcha 分散写在页面里。

| #   | 步骤            | 文件                           | 说明                                                           | 状态     |
| --- | --------------- | ------------------------------ | -------------------------------------------------------------- | -------- |
| U1  | UIA 类型定义    | `src/lib/matrix/uia.ts`        | 定义 `UiaSession`、`UiaFlow`、`UiaStage`、`UiaParams`          | 已完成   |
| U2  | UIA 解析器      | `uia.ts`                       | 从 401 响应解析 `flows`、`params`、`session`、已完成 stage     | 已完成   |
| U3  | Stage 选择策略  | `uia.ts`                       | 优先选择 Tamarix 支持的最短 flow；不支持时给出明确说明         | 已完成   |
| U4  | Terms 阶段      | `RegisterTermsStep.svelte`     | 展示 homeserver 返回的条款链接，用户确认后提交 `m.login.terms` | 部分完成 |
| U5  | Dummy 阶段      | auth helper                    | 自动提交 `m.login.dummy`                                       | 已完成   |
| U6  | 注册 token 阶段 | `RegistrationTokenStep.svelte` | 支持 `m.login.registration_token`，可先调用 token validity API | 部分完成 |
| U7  | 邮箱验证阶段    | `EmailValidationStep.svelte`   | 发起邮箱 token 请求，提示用户完成验证后继续                    | 计划中   |
| U8  | 手机验证阶段    | `PhoneValidationStep.svelte`   | 支持 `msisdn` UI，但首版可标记为“按服务器能力显示”             | 计划中   |
| U9  | Captcha 阶段    | `CaptchaStep.svelte`           | 根据 homeserver 参数加载 captcha；不可加载时显示降级说明       | 计划中   |
| U10 | UIA 单测        | `uia.test.ts`                  | 覆盖多 flow、缺失 params、已完成 stage、未知 stage             | 计划中   |

### 支持阶段优先级

| 阶段                         | P6 处理策略                                         |
| ---------------------------- | --------------------------------------------------- |
| `m.login.dummy`              | 自动完成                                            |
| `m.login.terms`              | 展示条款并要求显式确认                              |
| `m.login.registration_token` | 支持输入和有效性预校验                              |
| `m.login.email.identity`     | 支持邮箱验证流程                                    |
| `m.login.msisdn`             | 作为可选能力，优先完成 UI 和错误提示                |
| `m.login.recaptcha`          | 支持参数驱动加载；部署环境缺少 site key 时提示      |
| 未知 stage                   | 展示 homeserver 要求但 Tamarix 暂不支持，不吞掉错误 |

---

## 模块3: SSO 登录增强

当前 SSO 基础已经可用。P6 重点是安全性、可恢复性和多 IdP 体验。

| #   | 步骤           | 文件                          | 说明                                                                        | 状态     |
| --- | -------------- | ----------------------------- | --------------------------------------------------------------------------- | -------- |
| S1  | SSO state 参数 | login page / callback         | 生成随机 state，保存 baseUrl、flowType、idpId、redirectTo，回调校验后再登录 | 已完成   |
| S2  | 回调参数兼容   | `login/callback/+page.svelte` | 兼容 `loginToken` 和错误参数，显示 IdP/服务器错误                           | 已完成   |
| S3  | IdP 图标与名称 | login page                    | 使用 homeserver 返回的 `identity_providers` 名称；图标 URL 只做安全展示     | 部分完成 |
| S4  | 登录后继续     | auth flow                     | 支持 `redirectTo`，从受保护页面跳登录后回到原页面                           | 已完成   |
| S5  | SSO 失败重试   | callback page                 | baseUrl/session 丢失时允许重新选择 homeserver，不只显示失败                 | 部分完成 |
| S6  | CAS 标识       | login page                    | `m.login.cas` 与 `m.login.sso` 使用同一跳转封装，但 UI 文案可区分           | 部分完成 |
| S7  | SSO e2e 测试   | Playwright                    | mock callback 验证 token 登录、state 校验、错误页                           | 计划中   |
| S8  | 安全检查       | auth helper                   | 清理一次性 sessionStorage，避免旧 `loginToken` 被重复消费                   | 已完成   |

---

## 模块4: 3PID 与账号恢复

邮箱和手机号属于 Matrix 3PID。P6 在设置页补账号绑定管理，让用户知道哪些第三方标识已绑定到 homeserver 账号，并为后续邮箱登录、密码恢复和成员邀请打基础。

| #   | 步骤           | 文件                                      | 说明                                                                         | 状态     |
| --- | -------------- | ----------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| A1  | 3PID API 封装  | `src/lib/matrix/account.ts`               | `getThreePids()`、`requestEmailToken()`、`addThreePid()`、`unbindThreePid()` | 已完成   |
| A2  | Account Store  | `src/lib/stores/account.svelte.ts`        | 当前用户资料、3PID 列表、设备名、绑定状态                                    | 部分完成 |
| A3  | 设置页账号 Tab | `src/routes/settings/+page.svelte`        | 增加“账号与安全”视图                                                         | 已完成   |
| A4  | 邮箱绑定 UI    | `EmailBindDialog.svelte`                  | 输入邮箱、发送验证、确认绑定、错误提示                                       | 已完成   |
| A5  | 手机绑定 UI    | `PhoneBindDialog.svelte`                  | 支持国家码和手机号；服务器不支持时隐藏                                       | 计划中   |
| A6  | 解绑确认       | settings                                  | 解绑 3PID 前提醒可能影响密码恢复或 3PID 登录                                 | 部分完成 |
| A7  | 3PID 登录提示  | login page                                | 用户名输入可接受邮箱/手机号时，用 Matrix identifier 类型提交                 | 计划中   |
| A8  | 忘记密码入口   | `src/routes/forgot-password/+page.svelte` | 通过 homeserver 支持的邮箱流程发起密码重置                                   | 计划中   |
| A9  | 隐私提示       | settings                                  | 明确 3PID 绑定在 homeserver/identity server 侧，不写入任务房间               | 已完成   |

---

## 模块5: 邀请注册与加入项目

企业使用场景中，用户常从项目邀请进入。P6 需要保证“收到邀请 -> 登录/注册 -> 加入项目 -> 打开项目”的链路不中断。

| #   | 步骤             | 文件                             | 说明                                                             | 状态     |
| --- | ---------------- | -------------------------------- | ---------------------------------------------------------------- | -------- |
| I1  | 邀请落地页       | `src/routes/invite/+page.svelte` | 解析 `roomId/projectId/via/token` 等参数，提示登录或注册         | 已完成   |
| I2  | 登录后继续       | auth store                       | 保存邀请上下文，登录/注册完成后继续处理                          | 已完成   |
| I3  | 项目邀请接受     | matrix helper                    | 对已有 Matrix room invite 调用 join/accept                       | 已完成   |
| I4  | Matrix URI 支持  | invite page                      | 识别 `matrix:r/...` 或 `matrix:roomid/...` 形式并转 Tamarix 路由 | 计划中   |
| I5  | 项目成员邀请增强 | `MemberManager.svelte`           | 生成邀请链接、复制链接、按 Matrix ID 邀请                        | 已完成   |
| I6  | 未注册用户提示   | MemberManager                    | 说明外部用户需要在同一 homeserver 或可联邦 homeserver 注册       | 部分完成 |
| I7  | 邀请错误处理     | invite page                      | 房间不存在、无权限、homeserver 不匹配、联邦失败                  | 已完成   |
| I8  | 邀请审计         | AS 可选                          | 记录谁创建邀请、谁接受、失败原因                                 | 计划中   |

---

## 模块6: 第三方连接中心

第三方连接中心管理“连接了哪些外部服务”和“它们可以操作什么”。前端只保存展示所需的非敏感元数据；密钥、refresh token、Webhook secret 必须由 AS 或部署方后端保存。

| #   | 步骤                 | 文件                                    | 说明                                                       | 状态     |
| --- | -------------------- | --------------------------------------- | ---------------------------------------------------------- | -------- |
| C1  | 集成类型定义         | `src/lib/integrations/types.ts`         | provider、status、scopes、createdBy、createdAt、lastSyncAt | 已完成   |
| C2  | Matrix state event   | `com.tamarix.integration`               | 保存连接元数据，不保存 secret/token                        | 部分完成 |
| C3  | 集成 Store           | `src/lib/stores/integrations.svelte.ts` | 读取项目级连接、状态刷新、断开连接                         | 部分完成 |
| C4  | 设置入口             | settings / project settings             | 全局账号连接 + 项目连接分区                                | 部分完成 |
| C5  | GitHub/GitLab 连接卡 | IntegrationCard                         | 显示仓库、权限、最后同步、Webhook 状态                     | 部分完成 |
| C6  | 企业 IM 连接卡       | IntegrationCard                         | 飞书/钉钉/企业微信 Webhook 或 OAuth 状态                   | 部分完成 |
| C7  | Webhook 连接卡       | IntegrationCard                         | 自定义入站/出站 Webhook 配置状态                           | 部分完成 |
| C8  | 权限检查             | integrations store                      | 只有项目管理员可新增/断开项目级连接                        | 计划中   |
| C9  | 连接事件历史         | `com.tamarix.integration_event`         | 记录连接、断开、同步失败、权限变更                         | 计划中   |
| C10 | E2EE 限制提示        | UI                                      | 加密任务房间中 AS 只能读明文 state，不能读加密消息内容     | 计划中   |

### Integration state event 草案

```json
{
	"provider": "github",
	"connection_id": "github:org/repo",
	"scope": "project",
	"project_room_id": "!project:example.org",
	"display_name": "org/repo",
	"status": "connected",
	"permissions": ["issues:read", "pull_requests:read"],
	"created_by": "@alice:example.org",
	"created_at": "2026-06-02T00:00:00.000Z",
	"last_sync_at": "2026-06-02T00:00:00.000Z"
}
```

---

## 模块7: AS OAuth/Webhook 服务

第三方 OAuth 和 Webhook 需要服务端能力。P6 的 AS 增强重点是授权回调、密钥保存、签名校验、限流和审计。

| #   | 步骤                   | 文件/服务                                      | 说明                                                                   | 状态                 |
| --- | ---------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | -------------------- |
| O1  | OAuth 配置             | `as/config.yaml`                               | provider client_id/client_secret/callback_url/scopes，支持环境变量注入 | 计划中               |
| O2  | OAuth state            | `as/src/oauth.ts`                              | state 绑定 Matrix user、project room、provider、过期时间、防重放       | 计划中               |
| O3  | OAuth start API        | `POST /api/integrations/:provider/oauth/start` | 返回第三方授权 URL                                                     | 部分完成（前端契约） |
| O4  | OAuth callback API     | `GET /api/oauth/:provider/callback`            | 校验 state/code，换 token，保存 secret                                 | 计划中               |
| O5  | Secret 存储接口        | `as/src/secrets.ts`                            | 本地开发可加密文件，生产建议接入 Vault/KMS/数据库                      | 计划中               |
| O6  | GitHub/GitLab provider | `as/src/integrations/`                         | 复用 P4 Git Bridge，补 OAuth 连接和 webhook 管理                       | 计划中               |
| O7  | IM provider            | integrations                                   | 飞书/钉钉/企业微信消息推送，支持任务通知和审批通知                     | 计划中               |
| O8  | 入站 Webhook           | `POST /api/webhooks/:connectionId`             | 签名校验、幂等 key、事件映射成任务更新                                 | 计划中               |
| O9  | 出站 Webhook           | `as/src/outbound-webhook.ts`                   | 任务创建/状态变更/审批完成时发送事件                                   | 计划中               |
| O10 | 限流与重试             | AS                                             | provider 级限流、指数退避、死信队列                                    | 计划中               |
| O11 | 审计日志               | AS + Matrix state                              | 连接变更和 webhook 失败写入审计，不泄露 secret                         | 计划中               |
| O12 | 健康检查               | `GET /api/integrations/status`                 | 返回连接数量、失败数、provider 可用性                                  | 计划中               |

---

## 模块8: 开放 API 与开发者文档

P3 的 OpenAPI 文档仍有未完成项。P6 需要把第三方开发者需要的 API、认证、事件格式和安全要求补齐。

| #   | 步骤              | 文件                            | 说明                                                             | 状态   |
| --- | ----------------- | ------------------------------- | ---------------------------------------------------------------- | ------ |
| D1  | OpenAPI 基线      | `as/docs/api.yaml`              | 补全 AS 搜索、任务、Git Bridge、Integration、Webhook API         | 计划中 |
| D2  | API token 管理    | AS config / settings            | 支持项目级 API token，哈希存储，显示最后使用时间                 | 计划中 |
| D3  | Webhook 签名规范  | `docs/integrations/webhook.md`  | `X-Tamarix-Signature`、timestamp、防重放窗口                     | 计划中 |
| D4  | 事件模型文档      | `docs/integrations/events.md`   | task.created/task.updated/task.status_changed/approval.completed | 计划中 |
| D5  | Provider 开发指南 | `docs/integrations/provider.md` | 如何新增第三方 provider                                          | 计划中 |
| D6  | 示例脚本          | `examples/integrations/`        | curl、TypeScript、GitHub Actions 示例                            | 计划中 |
| D7  | 权限矩阵          | docs                            | 哪些 API 需要用户 token、AS token、项目管理员权限                | 计划中 |
| D8  | 安全核查清单      | docs                            | secret 存储、日志脱敏、签名校验、E2EE 限制                       | 计划中 |

---

## 推荐实施顺序

1. **先做 R/S：** 把注册入口和现有 SSO 稳住，保证用户能顺利进入系统。
2. **再做 U/A：** 抽 Matrix UIA 引擎并补 3PID 绑定，这是账号体系可维护性的核心。
3. **接着做 I：** 邀请注册链路打通，解决团队协作的首次进入问题。
4. **最后做 C/O/D：** 第三方连接中心、AS OAuth/Webhook、开放文档作为生态增强层逐步落地。

---

## 验收清单

| 验收项                 | 标准                                                                    | 状态   |
| ---------------------- | ----------------------------------------------------------------------- | ------ |
| 支持 Matrix 注册       | 对支持公开注册或 registration token 的 homeserver，可完成注册并登录     | 计划中 |
| UIA 流程可恢复         | terms/token/email/captcha 任一步失败后可重试，不丢 session              | 计划中 |
| SSO 回调安全           | callback 校验 state，成功后清理一次性状态                               | 计划中 |
| 3PID 可管理            | 用户可查看、绑定、解绑邮箱/手机号，错误来源清晰                         | 计划中 |
| 邀请链路不中断         | 未登录用户从邀请链接进入后，登录/注册完成可回到目标项目                 | 计划中 |
| 第三方 secret 不进前端 | localStorage、Matrix state event、浏览器日志中不出现 OAuth secret/token | 计划中 |
| Webhook 有签名校验     | 入站 webhook 必须校验签名、timestamp、幂等 key                          | 计划中 |
| OpenAPI 可用于集成     | 第三方开发者可按文档完成认证和任务事件集成                              | 计划中 |

---

## 风险与缓解

| 风险                           | 影响                            | 缓解                                                                  |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------- |
| 不同 homeserver 注册策略差异大 | 注册页无法覆盖所有流程          | UIA 引擎只承诺支持明确 stage；未知 stage 显示服务器要求和降级说明     |
| SSO 回调状态丢失               | 用户登录失败或进入错误页面      | callback state 使用短期 sessionStorage；丢失时允许重新选择 homeserver |
| 3PID 依赖 identity server      | 邮箱/手机号绑定在部分部署不可用 | 按 homeserver 能力显示功能，不把 3PID 作为必需能力                    |
| 第三方 OAuth 密钥泄露          | 安全事故                        | secret 只放 AS/部署方后端；日志脱敏；state 防重放                     |
| Webhook 重放或伪造             | 外部事件污染任务数据            | HMAC 签名、timestamp 窗口、幂等 key、provider 级限流                  |
| E2EE 造成集成能力不完整        | AS 无法读取加密消息             | 明确只同步可见 state event；评论/附件内容不作为第三方自动同步依据     |

---

## 参考规范

- Matrix Client-Server API: Registration、Login、3PID account APIs
- Matrix Identity Service API: third-party identifier validation and binding
- Matrix Application Service API: third-party lookup and AS capability boundary
