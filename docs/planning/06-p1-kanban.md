> [项目计划](./README.md) / P1 看板

# P1 -- 可用看板视图

**目标：** 看板拖拽、Data Table 排序过滤、视图切换、任务归档、文件上传/附件。

**新增 shadcn-svelte 组件：**

```bash
bun x shadcn-svelte@latest add card tabs command popover checkbox tooltip
```

| #   | 步骤                  | 文件                                              | 说明                                                                                                                                                                                                   | 状态   |
| --- | --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | 拖拽工具              | `src/lib/utils/drag.ts`                           | 原生 HTML5 Drag & Drop 封装                                                                                                                                                                            | 已完成 |
| 2   | KanbanCard            | `src/lib/components/board/KanbanCard.svelte`      | Card + Badge + Avatar，可拖拽                                                                                                                                                                          | 已完成 |
| 3   | KanbanColumn          | `src/lib/components/board/KanbanColumn.svelte`    | Card 容器 + 拖放区域                                                                                                                                                                                   | 已完成 |
| 4   | KanbanBoard           | `src/lib/components/board/KanbanBoard.svelte`     | 多列水平滚动，拖拽跨列改状态                                                                                                                                                                           | 已完成 |
| 5   | 看板视图              | `src/routes/project/[id]/+page.svelte` 内嵌       | Tabs 切换看板视图（非独立路由）                                                                                                                                                                        | 已完成 |
| 6   | 任务 Data Table       | `src/routes/project/[id]/+page.svelte` 重构       | 替换简易列表为 Data Table                                                                                                                                                                              | 已完成 |
| 7   | 视图切换              | `src/routes/project/[id]/+page.svelte`            | Tabs 切换：列表 / 看板                                                                                                                                                                                 | 已完成 |
| 8   | Command Palette       | `src/lib/components/common/CommandPalette.svelte` | Cmd+K 全局搜索                                                                                                                                                                                         | 已完成 |
| 9   | 过滤面板              | `src/routes/project/[id]/+page.svelte` 增强       | Select/Checkbox 过滤：指派人、优先级、标签                                                                                                                                                             | 已完成 |
| 10  | 归档 State Event 封装 | `src/lib/matrix/state-events.ts` 扩展             | 添加 `setArchive(client, roomId, archived)` 和 `getArchiveState(client, roomId)`                                                                                                                       | 已完成 |
| 11  | Task 接口扩展         | `src/lib/matrix/types.ts` 扩展                    | Task 增加 `archived?: boolean; archivedBy?: string; archivedAt?: string` 字段                                                                                                                          | 已完成 |
| 12  | 归档 UI               | `+page.svelte` + 任务详情页增强                   | 过滤面板加"显示归档"开关；任务详情 DropdownMenu 加归档/取消归档（AlertDialog 确认）；归档任务显示 Badge                                                                                                | 已完成 |
| 13  | Media 工具封装        | `src/lib/matrix/media.ts`                         | `uploadFile(client, file, options)` -- `client.uploadContent()` + 返回 `mxc://` URL；`getDownloadUrl(client, mxcUrl)` -- HTTP 下载链接；`getThumbnailUrl(client, mxcUrl, width, height)` -- 缩略图链接 | 已完成 |
| 14  | Attachment 接口       | `src/lib/matrix/types.ts` 扩展                    | 新增 `Attachment` 接口；扩展 `Comment` 接口增加 `attachments?: Attachment[]`                                                                                                                           | 已完成 |
| 15  | FileUploadZone        | `src/lib/components/task/FileUploadZone.svelte`   | 拖拽区域 + 点击选择；文件类型校验；大小限制；上传进度条；调用 `media.ts` 上传后发送 `m.room.message`                                                                                                   | 已完成 |
| 17  | 评论+附件集成         | `src/lib/stores/comments.svelte.ts` 扩展          | `loadComments()` 中解析附件消息；`Comment` 类型支持附件字段；发送评论支持附加文件                                                                                                                      | 已完成 |
| 18  | 主题切换              | `ui.svelte.ts` + `app.html` + `AppHeader.svelte`  | `ui.svelte.ts` 增加 `theme` 状态，`$effect` 监听 -- 修改 classList，持久化 localStorage；`app.html` 内联脚本避免 FOUC；AppHeader DropdownMenu 增加切换按钮                                             | 已完成 |
