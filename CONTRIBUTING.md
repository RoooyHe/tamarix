# Contributing to Tamarix

Thank you for your interest in contributing to Tamarix! This document covers everything you need to get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) runtime (not npm/yarn)
- A [Matrix](https://matrix.org) homeserver for testing (e.g. [Conduit](https://conduit.rs) or [Synapse](https://element-hq.github.io/synapse/))

### Getting Started

```sh
# Clone the repository
git clone https://github.com/RoooyHe/tamarix.git
cd tamarix

# Install dependencies
bun install

# Start the dev server
bun run dev
```

The dev server runs at `http://localhost:5173`.

### Application Service (Optional)

If you need the full experience including bot features and custom state event validation, set up the Application Service:

```sh
cd as
cp .env.example .env  # Edit with your homeserver config
bun install
bun run dev
```

## Available Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `bun run dev`         | Start development server             |
| `bun run build`       | Production build                     |
| `bun run preview`     | Preview production build             |
| `bun run check`       | Type checking (svelte-check)         |
| `bun run lint`        | Run ESLint                           |
| `bun run lint:fix`    | Auto-fix lint + format issues        |
| `bun run format`      | Format all files with Prettier       |
| `bun run format:check`| Check formatting without modifying   |

## Code Conventions

### TypeScript

- **Strict mode** is enabled — all code must pass `svelte-check`
- Prefer `T[]` over `Array<T>`
- Avoid `any` — use proper types or `unknown` where necessary
- Unused variables must be prefixed with `_`

### Svelte 5

This project uses **Svelte 5 runes mode** exclusively:

- Use `$props()` instead of `export let`
- Use `$state` for reactive state
- Use `$derived` for computed values
- Use `$effect` for side effects
- Never use `export let` in components

### Styling

- **Tailwind CSS v4** with CSS-based config (no `tailwind.config.js`)
- Use `tv()` (tailwind-variants) for component variants — not inline class strings
- Design tokens live in `src/app.css` under `@theme inline`
- Dark theme palette: `#000000` bg, `#1a1a1a` cards, `#27272a` borders

### Components

- shadcn-svelte components in `src/lib/components/ui/`
- Business components in `src/lib/components/task/`, `board/`, `dashboard/`, etc.
- Use `cn()` from `$lib/utils` for conditional classes

### Matrix Integration

- All task data stored as Matrix room state events (`com.tamarix.*`)
- See `CONTEXT.md` for the full domain glossary and event type reference
- Client singleton lives in `src/lib/matrix/client.ts`

### Linting & Formatting

- **ESLint** with `eslint-plugin-svelte` and `typescript-eslint`
- **Prettier** with `prettier-plugin-svelte`
- Run `bun run lint:fix` before committing to auto-fix issues

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
- `feat(task): add bulk status change`
- `fix(auth): handle SSO token refresh`
- `docs: update CONTRIBUTING guide`

## Pull Request Process

1. **Fork and create a branch** from `master`
   ```sh
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code conventions above

3. **Ensure quality checks pass**:
   ```sh
   bun run check       # Type checking
   bun run lint        # Linting
   bun run format:check # Formatting
   bun run build       # Build
   ```

4. **Commit with a clear message** following Conventional Commits

5. **Push and open a PR** against `master`

6. In your PR description:
   - Describe **what** changed and **why**
   - Link to any related issues (e.g., "Closes #42")
   - Include screenshots for UI changes

### What We Look For

- TypeScript passes (`bun run check` with no errors)
- No new lint errors introduced
- Code follows Svelte 5 runes patterns
- Components use `tv()` for variants
- No `console.log` in production code
- i18n keys added for any new user-facing text

## Reporting Issues

- Use [GitHub Issues](https://github.com/RoooyHe/tamarix/issues)
- Include steps to reproduce for bugs
- Include your environment (OS, browser, Matrix homeserver)
- For feature requests, describe the use case

## Architecture

For a deeper understanding of the codebase:

- `CONTEXT.md` — Domain glossary and module dependency map
- `DESIGN.md` — Design system and visual language
- `AGENTS.md` — Technical conventions and architecture overview
- `docs/planning/` — Historical planning documents

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
