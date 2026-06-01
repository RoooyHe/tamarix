<div align="center">

# Tamarix

**Matrix-native task management -- One Task = One Matrix Room**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-orange?style=flat-square&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-ff3e00?style=flat-square&logo=svelte&logoColor=white)](https://svelte-5-preview.vercel.app)
[![Matrix](https://img.shields.io/badge/Matrix-Protocol-000000?style=flat-square&logo=matrix&logoColor=white)](https://matrix.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-runtime-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh)

[English](./README.md) | [中文](./README.zh-CN.md)

</div>

---

Tamarix maps Matrix's decentralized Room/Space model onto task management. Every task becomes a Matrix room, every project a Matrix space. Because data lives on the Matrix federation -- not a proprietary backend -- you get real-time collaboration, cross-server federation, and end-to-end encryption for free.

## Features

- **Real-time** -- Built on the Matrix sync protocol; every change is pushed instantly
- **Federated** -- Users on different homeservers collaborate on the same tasks
- **End-to-end encrypted** -- Task content is protected by Matrix's E2EE (Olm/Megolm)
- **Open protocol** -- Any Matrix client can participate; no vendor lock-in
- **Internationalized** -- Multi-language support (i18n) out of the box
- **Workflow validation** -- Customizable task status transitions with matrix-powered enforcement

## How It Works

```
  Matrix Space   <----->   Tamarix Project
  Matrix Room    <----->   Tamarix Task
  State Event    <----->   Task Attribute (status / priority / tags ...)
  Timeline Msg   <----->   Task Comment
  Power Levels   <----->   Permission Control
```

<details>
<summary><strong>Custom State Events</strong> -- the <code>com.tamarix.*</code> namespace</summary>

| Event Type | Purpose |
|---|---|
| `com.tamarix.task_status` | Status (todo / in_progress / review / done / closed) |
| `com.tamarix.priority` | Priority (critical / high / medium / low) |
| `com.tamarix.task_type` | Type (bug / feature / task / improvement / epic) |
| `com.tamarix.due_date` | Due date |
| `com.tamarix.estimate` | Time estimate / Story points |
| `com.tamarix.tags` | Tags |
| `com.tamarix.ticket_id` | Ticket ID (e.g. TAM-42) |
| `com.tamarix.assignee` | Assignee |
| `com.tamarix.relation` | Task relation (blocks / duplicates / subtask_of) |
| `com.tamarix.task_archived` | Archive flag |

</details>

## Tech Stack

[![SvelteKit](https://img.shields.io/badge/SvelteKit-2-orange?style=for-the-badge&logo=svelte&logoColor=white)](https://kit.svelte.dev)
[![Svelte 5](https://img.shields.io/badge/Svelte_5-Runes-ff3e00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte-5-preview.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![shadcn-svelte](https://img.shields.io/badge/shadcn-svelte-zinc-18181B?style=for-the-badge)](https://shadcn-svelte.com)
[![matrix-js-sdk](https://img.shields.io/badge/matrix--js--sdk-000000?style=for-the-badge&logo=matrix&logoColor=white)](https://github.com/matrix-org/matrix-js-sdk)
[![Bun](https://img.shields.io/badge/Bun-runtime-000000?style=for-the-badge&logo=bun&logoColor=white)](https://bun.sh)

## Quick Start

```sh
# Install dependencies
bun install

# Start dev server
bun run dev

# Type checking
bun run check

# Production build
bun run build && bun run preview
```

## Project Structure

```
src/
  lib/
    components/       # UI components (board, task, project, dashboard, ...)
    stores/           # Svelte 5 rune-based stores ($state / $derived)
    matrix/           # Matrix SDK integration (auth, client, search, workflow, ...)
    i18n/             # Internationalization
  routes/             # SvelteKit file-based routing
    dashboard/        # Main task board
    project/[id]/     # Project views & settings
    search/           # Full-text search
    settings/         # App settings
```

## Roadmap

| Phase | Status | Highlights |
|---|---|---|
| P0 -- MVP | ![Done](https://img.shields.io/badge/status-done-brightgreen?style=flat-square) | Login / Project list / Task CRUD / Detail / Comments |
| P1 -- Board View | ![Done](https://img.shields.io/badge/status-done-brightgreen?style=flat-square) | Kanban DnD / Command Palette / Filter & Sort / Data Table / Archive / Upload / Theme |
| P2 -- Intelligence | ![Done](https://img.shields.io/badge/status-done-brightgreen?style=flat-square) | i18n / Ticket ID / Workflow / Search / Change History / Relations / E2EE Infrastructure |
| P3 -- Enterprise | ![Planned](https://img.shields.io/badge/status-planned-lightgrey?style=flat-square) | Charts / Reminder Bot / Git Bridge / Custom Fields |
| P4 -- Advanced | ![In Progress](https://img.shields.io/badge/status-in--progress-yellow?style=flat-square) | Chart Reports / Custom Field Renderer / Approval / Sort Order / Keyboard Shortcuts / External Links |

## Contributing

Issues and pull requests are welcome. Please open an issue first to discuss what you would like to change.

## License

This project is licensed under the [MIT License](./LICENSE).
