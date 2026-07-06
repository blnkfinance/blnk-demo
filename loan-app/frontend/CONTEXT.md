# Frontend context

Read this before building UI. It captures the visual and component direction for the loan-app frontend.

**Status:** direction only — nothing has been ported yet.

## What this is

A Omni Cloud Custom App frontend that should feel native inside Omni Cloud: same dark theme, typography, spacing, and component language as the main dashboard — without importing or depending on `blnk-dashboard` as a package.

`blnk-dashboard/` lives alongside this repo as a **local reference copy** (gitignored). Use it as a source to copy from, not a runtime dependency.

## Design reference

`../blnk-dashboard/` — local copy of Omni Cloud dashboard. Source for tokens, fonts, shadcn primitives, and blnk-ui pieces.

## What to copy

Copy these into the loan-app frontend when work starts. Vend them into our repo; do not add `blnk-dashboard` as an npm dependency or git submodule.

### 1. Design foundation

| Asset | Source | Notes |
| ----- | ------ | ----- |
| CSS variables | `blnk-dashboard/styles/globals.css` | The `:root` block: `--platform-*` tokens plus shadcn HSL slots (`--background`, `--foreground`, `--radius`, etc.) |
| Tailwind theme | `blnk-dashboard/tailwind.config.ts` | Color mappings, radius, fontFamily, shadows, `tailwindcss-animate` |
| shadcn config | `blnk-dashboard/components.json` | Aliases and paths — adapt for App Router layout |
| `cn()` helper | `blnk-dashboard/utils/shadcn.ts` | `clsx` + `tailwind-merge` |

Keep the **dark theme** from dashboard unless we explicitly decide otherwise. Set an explicit `body` background (`--platform-main-bg` / `#121314`) — required for iframe embedding.

### 2. Fonts

| Asset | Source |
| ----- | ------ |
| Inter Variable | `blnk-dashboard/styles/font-inter-variable.css` + `blnk-dashboard/public/fonts/Inter-Variable/` |
| Inter Display | `blnk-dashboard/styles/font-inter-display.css` |
| SF Mono | `blnk-dashboard/styles/font-sf-mono.css` |
| Pastiche Grotesque | `blnk-dashboard/styles/font-pastiche-grotesque.css` |

Respect the Inter Variable license in `public/fonts/Inter-Variable/LICENSE.txt`.

### 3. UI primitives (`components/ui/`)

Standard shadcn/Radix + Tailwind + CVA. Copy incrementally as screens need them — do not bulk-copy all 45 files on day one.

**Start with:**

- `button`, `input`, `label`, `form`, `select`, `textarea`
- `dialog`, `sheet`, `popover`, `dropdown-menu`
- `table`, `card`, `badge`, `tabs`
- `toast`, `toaster`, `tooltip`, `skeleton`, `separator`, `alert`

**Copy with care** — these pull in dashboard-specific logic and will need stripping or replacement:

- `search-input`, `identity-search-input`, `balance-search-input`, `ledger-search-input`
- `currency-combobox`, `datetime-picker` (heavier deps; copy only if needed)
- `sidebar` (Cloud shell; unlikely needed in a Custom App iframe)

Each primitive may drag in sibling ui files (e.g. `form` → `label`). Copy the dependency tree per component, not the whole folder.

### 4. blnk-ui pieces

Cherry-pick presentational components only. Skip Cloud shell and domain screens.

**Good candidates:**

- `status-pill`, `section-header`, `page-titles/single`
- `or-divider`, `notes-section`
- `simple-dropdown`, `status-tabs`

**Do not copy:**

- `side-nav`, `top-bar`, `settings-side-nav` — Cloud navigation shell
- `session-expired-modal` — portal session handling lives in the app foundation, not dashboard auth
- `visualization/*` — deck.gl, mapbox, chart builder; only if loan-app actually needs charts
- `new-forms/*`, `transaction-status`, `reconciliation-status` — domain-specific to Cloud entities
- `pages/cloud/*` — full Cloud screens, not reusable primitives

## What not to do

- Do not import from `blnk-dashboard` at build time or reference it in `package.json`.
- Do not copy the Pages Router structure (`pages/`) — loan-app uses App Router (`src/app/`).
- Do not copy dashboard API utilities (`utils/axios`, saved-views, filters) unless a copied component truly needs them.
- Do not assume Cloud sidebar/top-bar layout — Custom Apps render in an iframe with their own layout.

## Adaptations required at port time

| Dashboard | Loan-app |
| --------- | -------- |
| Pages Router (`pages/`) | App Router (`src/app/`) |
| `"use client"` implicit in pages | Add `"use client"` on interactive Radix/shadcn components |
| `@/` → `components/`, `utils/` | Match paths in `tsconfig.json`; likely `src/components/`, `src/lib/utils/` |
| `content: ["./pages/**", "./components/**"]` | Extend to `./src/**/*.{ts,tsx}` |
| Cloud session/auth | `requirePortalAuth` from blnk-app-setup foundation |

## Suggested port order

```txt
1. package.json deps (tailwind, radix, cva, clsx, tailwind-merge, lucide-react, tailwindcss-animate)
2. postcss.config + tailwind.config.ts
3. globals.css (tokens + base styles) + font CSS + font files
4. cn() helper + components.json
5. Core ui/* primitives (button, input, label, card, …)
6. Selected blnk-ui pieces as screens demand them
7. Strip any dashboard-specific imports that snuck in
```

## Iframe constraints (Custom App)

The app renders inside Omni Cloud's iframe. Practical implications:

- Cloud controls iframe width — layout must work from a narrow side drawer to full page.
- Set an explicit `body` background so the embed doesn't show through.
- Portal session expiry is handled by the app foundation (`requirePortalAuth`), not dashboard's session modal.
- Match Cloud's visual language; don't clone its navigation shell.

## npm dependencies (expected)

Minimal set to support copied primitives — pin versions when porting, using `blnk-dashboard/package.json` as reference:

- `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`
- `@radix-ui/react-*` (per copied component)
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react`
- `react-hook-form`, `@hookform/resolvers` (if copying `form`)
- `cmdk` (if copying `command`)
- `react-day-picker`, `date-fns` (if copying `calendar` / `datetime-picker`)

Add others only when a copied component requires them.

## Definition of done (frontend foundation)

The foundation is ready when:

1. Tokens and fonts render correctly — dark theme, Inter Variable, platform colors.
2. A handful of ui primitives work in isolation (button, input, card, dialog).
3. At least one blnk-ui piece (e.g. status-pill) composes cleanly on top of ui primitives.
4. No imports point at `blnk-dashboard/` — everything is vendored under `src/`.
5. Layout works at iframe narrow width without horizontal scroll.

Domain screens (loan workflows, forms, tables) come after this foundation is in place.
