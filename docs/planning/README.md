# Tamarix 项目计划文档

> 基于 Matrix 协议的任务管理系统 -- 一个任务就是一个 Matrix Room

## 项目概览

**Tamarix** 是一个以 Matrix 协议为底座的任务管理系统，目标类似于禅道/Jira，核心设计理念是 **一个任务 = 一个 Matrix Room**。项目当前处于脚手架初始阶段（SvelteKit + Svelte 5 + TypeScript），UI 使用 **shadcn-svelte** 组件库 + Tailwind CSS，视觉风格遵循 DESIGN.md 中定义的 Runway 风格深色编辑式设计系统。

---

## 当前项目状态

| 项目 | 状态 |
|---|---|
| 框架 | SvelteKit（`@sveltejs/kit`）+ Svelte 5（runes 模式） |
| 语言 | TypeScript |
| 包管理 | Bun |
| UI 设计系统 | DESIGN.md 已定义（Runway 风格：深色、无阴影、极简界面） |
| UI 组件库 | 已安装 -- shadcn-svelte (zinc base) |
| Matrix 集成 | 已完成 -- matrix-js-sdk + V3 sync + Space/Room CRUD |
| 业务代码 | P0 已完成 -- 登录/项目/任务CRUD/评论/Sync事件监听 |
| P1 进度 | P1 已完成（17/17）-- 看板拖拽 + Data Table + 归档 + 文件上传/附件 + 主题切换 全部实现 |
| P2 进度 | P2 第一批已完成；第二批已部分完成（模块3工时/模块5富文本/模块8附件删除 已完成；模块1通知/模块2项目管理/模块7仪表盘/模块9关注 大部分完成；模块4批量操作/模块6移动端 未开始） |
| P3 进度 | 未开始（AS 增强） |
| P4 进度 | 未开始 |

---

## 计划文档索引

| 文档 | 说明 |
|------|------|
| [01-ui-tech-stack](./01-ui-tech-stack.md) | UI 技术选型、shadcn-svelte CSS 变量映射、组件使用规划 |
| [02-matrix-events](./02-matrix-events.md) | 自定义 Matrix State Events 定义 |
| [03-file-structure](./03-file-structure.md) | 项目文件结构树 |
| [04-templates-and-permissions](./04-templates-and-permissions.md) | Room/Space 创建模板、权限模型 |
| [05-p0-mvp](./05-p0-mvp.md) | P0 -- 最小可用产品（MVP） |
| [06-p1-kanban](./06-p1-kanban.md) | P1 -- 可用看板视图 |
| [07-p2-intelligence](./07-p2-intelligence.md) | P2 -- 智能化（前端兜底） |
| [08-p3-as-enhancement](./08-p3-as-enhancement.md) | P3 -- AS 增强 + 共存接口约定 |
| [09-p4-enterprise](./09-p4-enterprise.md) | P4 -- 企业级 |
| [10-decisions-and-risks](./10-decisions-and-risks.md) | 关键技术决策、风险与缓解 |

---

## 里程碑时间线

| 阶段 | 预计工作量 | 核心交付物 |
|---|---|---|
| P0 - MVP | 3-4 周 | 登录 -- 项目列表(Sidebar) -- 任务 CRUD(Dialog/Data Table) -- 任务详情(Tabs+聊天) |
| P1 - 看板 | 1-2 周 | 看板拖拽 + Data Table + Command Palette(Cmd+K) + 归档 + 文件上传/附件 + 主题切换 |
| P2 - 智能化+核心功能 | 4-6 周 | i18n/编号/工作流/搜索/关联/历史 + 通知系统/项目管理UI/工时/批量操作/富文本描述/移动端适配/仪表盘增强/附件删除/任务关注 |
| P3 - AS 增强 | 2-3 周 | AS 编号生成+工作流引擎+Schema校验+搜索索引+通知Bot+Watcher管理 |
| P4 - 企业级 | 4-6 周 | Chart报表/版本管理/导入导出/任务模板/自定义字段/审批流/Git集成/快捷键/同列排序/外部链接 |
