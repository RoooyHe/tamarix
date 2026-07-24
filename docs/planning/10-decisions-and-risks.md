> [项目计划](./README.md) / 关键技术决策与风险

# 关键技术决策

| 决策点               | 选择                                                     | 理由                                                              |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| UI 组件库            | **shadcn-svelte**                                        | Svelte 5 原生、源码可控、丰富组件、Bits UI 无障碍                 |
| base color           | **zinc**                                                 | 冷灰色调最接近 DESIGN.md Cool Slate 色系                          |
| 图标                 | **@lucide/svelte**                                       | shadcn-svelte 官方推荐，极简风格                                  |
| 状态管理             | Svelte 5 Runes ($state/$derived)                         | 项目已启用 runes 模式                                             |
| Matrix SDK           | matrix-js-sdk                                            | 官方 JS SDK                                                       |
| 拖拽                 | 原生 HTML5 Drag & Drop                                   | 无额外依赖                                                        |
| Data Table           | TanStack Table (via shadcn-svelte)                       | 功能完整，排序/过滤/分页                                          |
| 表单                 | Formsnap + Superforms + Zod                              | P2 阶段引入，shadcn-svelte 推荐                                   |
| i18n                 | 自研轻量方案（Svelte 5 runes）                           | 仅中/英需求，无需 ICU 复数等高级功能，与 runes 体系一致零学习成本 |
| AS 实现              | Bun + TypeScript                                         | 与前端技术栈统一                                                  |
| 搜索索引             | 前端内存搜索（默认）+ SQLite (better-sqlite3)（AS 增强） | 前端兜底即时响应，AS 索引支持大规模数据                           |
| 图表                 | LayerChart (via shadcn-svelte Chart)                     | P3 阶段引入                                                       |
| 通知推送（前端兜底） | Sync 事件监听 + 本地通知队列                             | 无需 AS 即可工作，前端监听 state event 变更生成本地通知           |
| 通知推送（AS 增强）  | Bot 发送 `m.room.message` @提及                          | Matrix 原生推送机制，用户可在任何 Matrix 客户端收到通知           |
| Markdown 渲染        | `marked` 库                                              | 轻量（~30KB gzip），支持 GFM，纯 JS 无依赖                        |
| 工时存储             | `com.tamarix.worklog` 多实例 state event                 | state_key = `{userId}_{timestamp}`，支持多人多次登记              |
| 版本存储             | `com.tamarix.version` 多实例 state event on Space        | state_key = version name，Space 级别管理                          |
| 移动端适配           | Tailwind 响应式 + Sheet 组件                             | 复用已有 shadcn-svelte Sheet 组件，无需额外框架                   |
| 导出格式             | CSV + JSON                                               | 覆盖 Excel 兼容（CSV）和程序化消费（JSON）两种场景                |
| 批量操作             | 循环 sendStateEvent                                      | Matrix 协议无批量 API，前端循环+逐个 await；AS 可优化为批量处理   |

---

## 风险与缓解

| 风险                                          | 影响                                                        | 缓解措施                                                                                             |
| --------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Matrix 同步延迟                               | 用户操作后 UI 更新慢                                        | 前端乐观更新：操作立即反映到 UI，Sync 确认后修正                                                     |
| 自定义 state event 在联邦环境传播             | 其他 HS 忽略但不报错                                        | `com.tamarix.*` 命名空间隔离                                                                         |
| Space 只支持一层嵌套                          | 无法表达 Epic→Story→Task 三层                               | 用 `com.tamarix.relation` 的 `subtask_of` 替代                                                       |
| 联邦环境下自定义 event 传播                   | 其他 HS 忽略但不报错                                        | `com.tamarix.*` 命名空间隔离                                                                         |
| Power Levels 粒度不足                         | 无法做字段级权限                                            | Bot 校验 + 前端隐藏无权限操作                                                                        |
| Tailwind v4 + shadcn-svelte 兼容性            | 样式构建失败                                                | shadcn-svelte 最新版已支持 TW v4，必要时参考 Migration 指南                                          |
| 通知量大时前端性能                            | 频繁 Sync 事件导致 UI 卡顿                                  | 通知列表虚拟滚动 + 防抖聚合（1秒内同一任务多变更合并为1条通知）                                      |
| 多实例 state event (worklog/version) 查询效率 | state_key 遍历开销                                          | 前端缓存 + 懒加载（仅任务详情页加载工时）；AS 索引增强                                               |
| Markdown XSS                                  | formatted_body 注入恶意脚本                                 | 使用 DOMPurify 对 rendered HTML 做消毒；或限制 Markdown 子集                                         |
| 移动端拖拽体验                                | 触控拖拽不如鼠标精确                                        | 提供列表视图降级；长按拖拽 + 触觉反馈                                                                |
| 批量操作部分失败                              | 50 个任务修改状态，10 个失败                                | 逐个 await + 收集失败列表 + Toast 展示失败项；不使用 Promise.allSettled 全部并行                     |
| E2EE 房间与 AS Bot 冲突                       | AS Bot 无法读取加密房间消息/附件                            | 加密房间不启用 AS 通知/索引；前端本地处理；UI 提示加密房间限制                                       |
| E2EE 加密房间无法被 AS 读取                   | 加密房间中的 `m.room.message`（评论、附件）对 AS Bot 不可见 | AS 无法处理加密任务的评论通知、搜索索引；应在文档中明确标注加密任务哪些功能降级；前端提供降级提示 UI |
