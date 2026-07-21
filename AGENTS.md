# tamarix — Agent Instructions

## Tech Stack
- **Framework**: SvelteKit + Svelte 5 (runes mode — `$state`, `$derived`, `$effect`, `$props`)
- **Styling**: Tailwind CSS v4 + tailwind-variants (`tv()` helper, not inline class strings)
- **UI Library**: shadcn-svelte (Nova style) + bits-ui primitives
- **Icons**: `@lucide/svelte`
- **Data Layer**: matrix-js-sdk — all task data stored as Matrix room state events (`com.tamarix.*`)
- **Package Manager**: bun (`bun.lock` present) — prefer `bun run` over `npm run`

## Developer Commands
```sh
bun run dev        # dev server
bun run build      # production build
bun run preview    # preview production build
bun run check      # svelte-kit sync && svelte-check (typecheck)
bun run check:watch  # watch mode
bun run prepare    # runs svelte-kit sync (or ignores error if not needed)
```

**Order matters**: `prepare` must run before `check`. The `prepare` script guards with `|| echo ''` so it won't fail on first run before `.svelte-kit/` exists.

## Svelte Config Notes
- **Runes mode is forced** via `svelte.config.js` `runes: ({ filename }) => ...` — no `export let` anywhere in `src/` (except `node_modules`).
- **No `tailwind.config.js`** — Tailwind v4 uses CSS-based config via `@tailwindcss/vite` plugin. Design tokens live in `src/app.css` under `@theme inline`.
- **$lib alias** is handled by SvelteKit; no manual path mapping needed in `tsconfig.json`.

## Custom Matrix Event Types (com.tamarix.*)
| Event | Content |
|---|---|
| `task_status` | `status: "todo" \| "in_progress" \| "review" \| "done" \| "closed"` |
| `priority` | `level: "critical" \| "high" \| "medium" \| "low"` |
| `task_type` | `type: "bug" \| "feature" \| "task" \| "improvement" \| "epic"` |
| `due_date` | ISO date string |
| `estimate` | `{ value: number, unit: "story_points" \| "hours" \| "days" }` |
| `tags` | `string[]` |
| `ticket_id` | e.g. `"TAM-42"` |
| `assignee` | Matrix user ID |

UI labels are in **Chinese**: 待办/进行中/审核中/已完成/已关闭, 紧急/高/中/低, 缺陷/功能/任务/改进/史诗

## Architecture
```
src/lib/
  matrix/       # client.ts (singleton), auth.ts, room-utils.ts, state-events.ts, types.ts
  stores/       # Svelte 5 runes stores: auth, tasks, projects, ui (all *.svelte.ts)
  components/
    ui/         # shadcn-svelte components (auto-generated)
    task/       # TaskCard, TaskStatusSelect, PrioritySelect, TaskCreateDialog, etc.
    common/     # MatrixAvatar, TaskIdBadge
src/routes/
  login/        # Matrix auth page
  dashboard/    # Main dashboard
  project/[id]/ # Project task list + board view + task detail
  settings/     # App settings
```

## Design System
- **Dark theme palette** (via `.dark` class override in `src/app.css`): `#000000` bg, `#1a1a1a` cards, `#27272a` borders
- shadcn-svelte CSS variables overridden in `src/app.css` for dark theme
- Runway-inspired: **zero shadows**, minimal borders, no gradients

## Code Conventions
- TypeScript `strict: true` — all type errors must be fixed
- Svelte 5 runes: use `$props()` (not `export let`), `$state`, `$derived`, `$effect`
- Tailwind via `tv()` (tailwind-variants) for component variants
- shadcn-svelte components in `src/lib/components/ui/`
- Matrix client: `src/lib/matrix/client.ts` (singleton pattern)

## What to Avoid
- Do not use `export let` in Svelte 5 components — use `$props()` instead
- Do not use inline Tailwind class strings on shadcn-svelte components — use `tv()` variants
- Do not add generic `console.log` or debug output

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` at repo root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.