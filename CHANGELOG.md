# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.2.0]

### Added

- Notification system: types, parsing, due reminders, panel UI, preferences
- Worklog / time tracking: WorklogEntry, state event persistence, WorklogPanel
- Version management: VersionInfo, versions store, UI in project settings
- Rich text Markdown descriptions: MarkdownEditor, `com.tamarix.description`
- Member management: MemberManager, power level display
- Bulk operations: BulkActionBar, multi-select on Kanban + data table
- Mobile adaptation: responsive sidebar, Kanban/table/detail layouts, long-press drag
- Dashboard enhancements: ProjectProgressCard, TeamWorkloadCard, OverdueTaskList
- Task watching: `com.tamarix.watcher` state event
- Recent tasks: localStorage persistence (max 20 entries)
- Attachment deletion with confirmation dialog
- E2EE infrastructure: task encryption, room detection, UI indicators
- New shadcn-svelte components: Progress, Switch, Toggle
- New custom components: NotificationPanel, MemberManager, BulkActionBar, MarkdownEditor, WorklogPanel, ProjectProgressCard, TeamWorkloadCard, OverdueTaskList

### Fixed

- Kanban card drag state not resetting after failed drop
- Mobile sidebar not closing after navigation
- Worklog store not refreshing after sync

## [0.1.0]

### Added

- Matrix authentication: homeserver URL, username/password, token persistence
- Project management: Matrix Spaces mapped to Projects
- Task CRUD: Matrix Rooms mapped to Tasks
- Task attributes: status, priority, type, due date, estimate, tags
- Task detail page with inline comments
- Real-time sync via Matrix ClientEvent.Sync
- Kanban drag & drop: KanbanBoard/KanbanColumn/KanbanCard
- Command Palette (Ctrl+K)
- Project task list with filtering and sorting
- Dashboard: tasks, deadlines, statistics
- Internationalization: Chinese/English bilingual support
- Auto-generated task IDs: TAM-N format
- Workflow validation: status transition rules
- Full-text search
- Assignee selection from room members
- Task relations: blocks/blocked-by/related/duplicates/subtask-of
- Change history: timeline display from state events
- File attachments: upload/preview/delete
- New UI components: Alert, Collapsible, Pagination, Table

### Fixed

- Project list `isLoading` not resetting on success path
- i18n module using `$state` rune in non-`.svelte.ts` file
- tsconfig `$lib/i18n` module path resolution
- Svelte 5 runes compatibility in Kanban components
