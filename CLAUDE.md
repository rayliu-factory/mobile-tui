<!-- GSD:project-start source:PROJECT.md -->
## Project

**mobile-tui**

A pi.dev TypeScript extension that guides developers through creating mobile app specs
inside a terminal UI. A wizard-then-canvas flow captures screens, navigation, data
models, and state; the extension renders detailed ASCII wireframes the dev can preview,
then writes a Markdown + YAML-frontmatter spec file (with Maestro/Detox E2E flows) that
an LLM can consume to build and test the app.

**Core Value:** The ASCII wireframes are good enough that a developer would share them — the wireframe
artifact is the centerpiece; everything else (nav, data, state, tests) is structure
around it.

### Constraints

- **Platform**: pi.dev extension runtime (TypeScript) — all code runs inside pi's extension API
- **Interface**: TUI only — no web or native GUI surface
- **Mobile target**: SwiftUI + Jetpack Compose — native-only for v1; framework-agnostic spec, but those are the two consumers the spec must serve well
- **State**: Git-backed — the spec file on disk is the single source of truth; no extension-local database
- **Output format**: Markdown + YAML frontmatter — fixed choice so LLMs and humans both parse it cleanly
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Executive Take
- **No React Ink, no Blessed, no Yoga layout.** pi ships its own TUI toolkit (`@mariozechner/pi-tui`) with differential rendering, theming, keybindings, and a component model extensions are expected to use. Bringing a second rendering runtime fights the host.
- **No compile step.** pi loads extensions through **jiti**; `.ts` files run directly. A build step is only needed if we want `tsup` bundling for a clean npm publish (recommended — smaller install, faster cold start for consumers).
- **No local database, no config stores.** The spec file on disk *is* the state; `ctx.sessionManager` handles any ephemeral session state pi wants to persist in its own JSONL.
- **No HTTP server, no file watcher library.** We read/write the spec file directly through `node:fs/promises`, wrapped in pi's `withFileMutationQueue` helper so we coordinate cleanly with pi's built-in `edit`/`write` tools.
## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|---|---|---|---|
| `@mariozechner/pi-coding-agent` | `^0.67.6` (peer/host) | Extension host runtime. Provides `ExtensionAPI` (`pi.registerCommand`, `pi.on(...)`, `pi.registerTool`, `pi.registerShortcut`, `ctx.ui.custom()`, `ctx.sessionManager`, etc.). | This is pi itself. We target it as a **peer dependency**, not a bundled dep — extensions run inside the host pi process. Version `0.67.6` is current on npm (verified against registry). |
| `@mariozechner/pi-tui` | `^0.67.6` (peer) | TUI component library. Exports `Component` interface, `Text`, `Box`, `Container`, `Spacer`, `SelectList`, `Editor`, `Input`, `Markdown`, `Loader`, `TruncatedText`, plus `matchesKey()` / `Key` helpers. Differential renderer with CSI 2026 synchronized output. | This is the pi TUI toolkit. Using anything else (Ink, Blessed) means running a competing render loop inside pi's terminal — unsupported and visually broken. We compose `Component`s for the wizard steps, canvas panes, and wireframe preview. |
| `@mariozechner/pi-ai` | `^0.67.6` (peer) | Provides `StringEnum` helper used with `TypeBox` for `pi.registerTool` parameters. We only touch this to declare any LLM-callable tools the extension exposes (e.g. `generate_wireframe_from_description`). | Peer-deps only; follows the coding-agent version. Only pulled in if we expose LLM-callable tools (optional for MVP). |
| `zod` | `^4.3.6` | Single-source-of-truth schema for the spec DSL: screens, components, navigation edges, data models, state machines, test flows. Drives TypeScript types, runtime validation, and Maestro/Detox output generation. | Zod v4 is stable (InfoQ Aug 2025), **14× faster string parsing, 7× faster array parsing, 2.3× smaller bundle, 10× faster `tsc`** than v3 — all of which matter because we re-validate the full spec on every save. Best-in-class DX. See "Alternatives Considered" for why not TypeBox/Valibot. |
| `yaml` (eemeli/yaml) | `^2.8.3` | YAML parser/stringifier for the frontmatter block **and** Maestro flow output. Preserves comments and blank lines across round-trips, which `js-yaml` cannot do. Native TS types, streaming, modern API. | The spec file lives in git and is human-edited. If a dev adds a `# note to self` comment in the frontmatter, we must not wipe it when the tool writes back. `eemeli/yaml` is the only mainstream library that preserves comments. Also actively maintained; `js-yaml`'s last release was years ago. |
| `gray-matter` | `^4.0.3` | Splits a Markdown file into `{ data, content, matter }` (frontmatter object + body string). Robust, battle-tested, supports custom YAML engines — we wire it to `yaml` to keep the round-trip story consistent. | Industry standard (VitePress, Astro, 11ty, Docusaurus all use it). We keep gray-matter only for split/detect logic and pass an `engines: { yaml: { parse, stringify } }` override so the actual YAML goes through `eemeli/yaml`. That gives us gray-matter's file-shape handling *plus* comment-preserving YAML. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---|---|---|---|
| `@sinclair/typebox` | `^0.34.49` | JSON-Schema-compatible type builder. **Only** needed for `pi.registerTool({ parameters: Type.Object({...}) })` — pi's `registerTool` API wants a TypeBox schema. | If (and only if) we expose LLM-callable tools. Internal spec validation stays on Zod. Do not mix Zod and TypeBox for the same data. |
| `mdast-util-from-markdown` + `mdast-util-to-markdown` | parser `^2.x`, stringifier `^2.x` | Only pulled in **if** we need AST-level editing of the Markdown body (e.g., find a specific screen heading and update it without reflowing the whole file). | Defer. MVP treats body sections as "find heading + read/write slab of text" — string-based. Only reach for `mdast` if string manipulation proves fragile after real-world use. |
| `chalk` | `^5.4.x` (already present as pi-tui transitive) | ANSI styling inside our `Component.render()` return strings when we need raw color outside of `theme.fg()`. | Prefer `theme.fg("accent", text)` via pi's theme system. Only drop to `chalk` for edge cases (ASCII wireframe accents the theme doesn't cover). |
| `clipboardy` | `^4.x` | "Copy wireframe to clipboard" quality-of-life action. The wireframe is the shareable artifact; making it one-keystroke copyable matters. | Add when we wire up the canvas "yank current wireframe" action. |
| `fast-glob` | `^3.x` | Find existing spec files to open (`*.spec.md`, `.planning/*.md`). | If we add a "pick spec to edit" entry screen. Plain `fs.readdir` + suffix filter is fine for MVP. |
### Development Tools
| Tool | Version | Purpose | Notes |
|---|---|---|---|
| `typescript` | `^5.6.x` | Types only — jiti handles execution. We still need `tsc --noEmit` in CI to catch errors. | `tsconfig.json` targets `ES2022` / `moduleResolution: "bundler"` / `strict: true`. `"types"` can include `@mariozechner/pi-coding-agent` / `@mariozechner/pi-tui` for ambient types. |
| `tsup` | `^8.5.1` | Build-to-`dist/` for **npm-publish output only**. Not required for local development (jiti loads `.ts` directly). Gives consumers a smaller, faster-cold-start install. | Output CJS+ESM, treat `@mariozechner/pi-*` as `external`. Entry: `src/index.ts`. Single `"pi": { "extensions": ["./dist/index.js"] }` entry in the published package. |
| `@biomejs/biome` | `^2.4.12` | Linter + formatter. Single binary, fast, no ESLint/Prettier coordination. | The pi-mono repo uses Biome; matching reduces friction for downstream contributors and keeps PR noise down. |
| `vitest` | `^4.1.4` | Unit tests for spec parse/serialize/round-trip + Maestro YAML emission + Zod schema validation. | TUI components are tested via snapshot of `render(width)` output (array of strings) — no headless browser needed. Pure function testing is trivial because every component outputs deterministic strings. |
| `@vitest/coverage-v8` | `^4.1.x` | Coverage. | Aim high coverage on parse/serialize/emit logic; skip rendering. |
| Node.js | `>=20.x` | pi itself requires Node 20+. | Use `engines.node: ">=20"` in `package.json`. |
## Installation
# Core runtime deps (bundled into the extension)
# Optional (only if we expose LLM-callable tools)
# Peer dependencies — the host pi install provides these at runtime,
# but we need them at dev time for types and local testing:
# Dev tooling
### `package.json` shape (for publishing)
## pi.dev Extension Shape (concrete)
- **Extensions are a `default export` function** — not a class, not a module with named exports. pi's loader looks for `module.default(pi)` specifically.
- **Custom UI is a `Component`, not JSX.** Every wizard step and canvas pane is a class implementing `Component { render(width): string[]; handleInput?(data): void; invalidate?(): void }`. Composition is via `Container`/`Box` children, not a virtual DOM.
- **`ctx.ui.custom(...)` is the "go fullscreen" escape hatch.** It replaces the editor region with our component until we call `done(result)`. This is the mode mobile-tui runs in 99% of the time.
- **Rendering is pull-based and diffed.** pi-tui calls `root.render(width)` each tick; we emit the full line array and pi diffs against the previous frame. Do **not** try to do manual `process.stdout.write` — breaks the diff engine.
- **Keyboard is opaque strings.** `handleInput(data: string)` receives raw sequences; match them with `matchesKey(data, "ctrl+s")` or `matchesKey(data, "return")`. Return `true` to mark handled, else bubble.
- **Theme is injected, not imported.** Colors come through `theme.fg("accent", str)` so user themes apply. Only hardcode ANSI for ASCII wireframe structural characters.
- **File mutations go through `withFileMutationQueue(absPath, fn)`** so pi's own `edit`/`write` tools don't race with us if the LLM decides to poke the same spec file.
## The Wireframe Rendering Question
### Libraries investigated and why each fails:
| Library | Why not |
|---|---|
| `cli-boxes@4.0.1` | Just a data table of Unicode border characters. Useful as a character reference, **not** as a layout engine. We may internally copy a few glyph sets but don't need the dep. |
| `boxen@8.0.1` | Wraps *one* string in *one* decorated box with padding/alignment. Doesn't compose, doesn't nest at mobile-UI fidelity, outputs a finished string (can't integrate with pi-tui diff-render). |
| `ink@7.0.1` + `ink-box` | React/Yoga runtime. **Explicitly incompatible with pi's render loop** — running two competing render schedulers in one terminal is visually broken and unsupported by pi. |
| `blessed` / `neo-blessed` | Same problem — owns the screen. Also abandoned / sporadically maintained. |
| `tty-box` (Ruby) | Not JS. |
| `boxes` (C binary) | Not a library. |
### What to build instead (~200 LOC):
- Fixed-width rendering at the **target phone width in chars** (e.g. 40 cols for a narrow mobile mockup).
- Unicode box-drawing glyphs (`┌─┐│└┘├┤┬┴┼`) for structural lines, ASCII fallback (`+-|`) selectable via a config flag for environments that mangle Unicode.
- Each node renders to `string[]` (list of lines, already padded to phone width), which the parent concatenates vertically.
- Colors via `theme.fg("muted", glyph)` so the wireframe respects user theme.
- Zero new rendering primitives (composes into the same diff engine).
- Complete control over fidelity — the wireframe is the core value; library constraints would fight us.
- ~200 LOC of pure functions, trivially unit-testable (snapshot the line-array output).
- Stable output for git diffs — dev shares the wireframe text, we don't want library updates to re-wrap the ASCII.
## Maestro vs Detox (what we emit)
| Dimension | Maestro | Detox |
|---|---|---|
| Authoring format | **YAML flows** | JavaScript / TypeScript (Jest) |
| Latest version (Apr 2026) | CLI `2.4.0` (released 2026-04-02) | `detox@20.50.1` |
| Setup complexity | Minutes; no app instrumentation for basic flows | Heavy: native build, test runner integration, app recompilation with detox lib |
| Target platforms | iOS native, Android native, React Native, Flutter, Web | Originally React Native; iOS/Android native supported via XCUITest/Espresso |
| Fit for "extension emits E2E tests" | **Excellent** — we generate plain YAML text, user runs `maestro test file.yaml` | Poor — we'd generate `.test.ts` files that require the target project to already have Detox wired up to its native build |
| Fit for native-only targets (SwiftUI, Jetpack Compose) | **Yes** — Maestro explicitly supports native iOS/Android | Yes, but with heavier setup; code-based tests are less "LLM-writeable" as a shareable artifact |
### Recommendation: **v1 emits Maestro only. Detox is a v2 "stretch" target.**
- Spec goal is "artifact an LLM and a human can both read." YAML wins decisively over a compiled `.ts` file that depends on a test-runner bootstrap.
- SwiftUI and Jetpack Compose are the stated mobile targets → Maestro's native support is the actual constraint match.
- Maestro `CLI 2.4.0` is current; command surface is stable (`launchApp`, `tapOn`, `assertVisible`, `inputText`, `scrollUntilVisible`, `runFlow`, `assertTrue`, `runScript`, `swipe`, `back`, `takeScreenshot`).
- A Maestro flow is just YAML — we already have `yaml@2.8.3` on the Critical Path. Marginal cost to add a Maestro emitter: one file.
### Maestro emission approach
### Detox (v2 only)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|---|---|---|
| `pi-tui` as the TUI library | `ink@7` (React for CLI) | **Never, inside pi.** If project pivoted to a standalone CLI, Ink is the standard pick — React mental model, huge component ecosystem (`ink-select-input`, `ink-text-input`, `ink-table`). But the pivot kills the "persistent canvas" capability pi gives us natively. |
| `pi-tui` | `blessed` / `neo-blessed` | Never. Abandoned-ish, owns the screen, doesn't compose with pi. |
| `zod@4` | `@sinclair/typebox` | Use TypeBox when you already need JSON Schema output (OpenAPI, Ajv), **and** when raw parsing throughput dominates (typebox+ajv is ~50× faster than Zod v3, ~22× faster than v4). For our workload — one parse per spec save, maybe 10KB file — Zod's DX dominates perf. We *do* use TypeBox, but only in the narrow slot pi requires (`registerTool.parameters`). |
| `zod@4` | `valibot` | Use Valibot when bundle size is critical (1.4kB vs Zod's 18kB, per esbuild benchmarks). Doesn't apply to us — we're a TUI extension running in Node, not a browser bundle. |
| `zod@4` | `arktype` | ArkType is 3–4× faster than Zod and has excellent inference, but ecosystem is smaller and the "spec schema" is our most important data contract — pick the one with the deepest community knowledge. Reconsider if Zod parse time shows up in profiles (unlikely for our file sizes). |
| `yaml` (eemeli) | `js-yaml@4.1.1` | Use js-yaml when comment preservation doesn't matter and you want maximum throughput (parsing benchmarked ~140× faster on one large-file test). For us, comment preservation is non-negotiable because the spec file is human-edited in git. |
| `gray-matter` | `remark-frontmatter` + `unified` | Use the remark/unified ecosystem if we need AST-level *body* editing (e.g., "find the `## Login Screen` section and insert a new wireframe block programmatically without reflowing the whole body"). MVP treats body as string slabs — simpler. Re-evaluate after first round of real usage. |
| Maestro (v1) | Detox (v1) | Ship Detox in v1 only if an early user explicitly says "I have a Detox setup, I won't adopt Maestro." Otherwise defer — the YAML-vs-JS authoring gap is the core of Maestro's product advantage and matches "LLM-consumable artifact" perfectly. |
| Custom wireframe component | `boxen` | Never for nested mobile-UI fidelity. `boxen` is fine for a one-off banner in a CLI script. |
| `tsup` for publish | Ship raw `.ts` + `jiti` | Shipping raw TS works (jiti handles it), but means every install pays jiti startup + users get our `node_modules` bloat. tsup-bundled output is ~10× smaller and ~loads faster. Skip tsup only if you explicitly want hackability over install size. |
| `biome` | `eslint + prettier` | Use ESLint+Prettier if the team already has a house style in those tools. For a greenfield solo extension matching the pi-mono monorepo's style, Biome is one binary and zero config fights. |
| `vitest` | `node:test` + `tsx` | node:test works but vitest's watch mode, snapshot assertions (for Component output), and coverage integration are worth the single dev dep. |
## What NOT to Use
| Avoid | Why | Use Instead |
|---|---|---|
| **React Ink** | Its own render loop and scheduler; running two render loops in pi's terminal is visually broken and unsupported. Also a much bigger dep tree (React + Yoga). | `pi-tui` `Component` / `Container` / `Box`. |
| **blessed / neo-blessed** | Owns the full screen (alt-buffer), incompatible with pi's in-place rendering model. Also effectively unmaintained. | `pi-tui`. |
| **commander / yargs / oclif** | These build standalone CLIs with their own argument parsing. We are *not* a CLI — we're a pi extension invoked via `/spec`. pi handles command registration via `pi.registerCommand`. | `pi.registerCommand("spec", { ... })`, `pi.registerFlag(...)` for CLI-style flags. |
| **chalk as a primary styling layer** | Bypasses pi's theme system — user theme changes won't apply to our UI. | `theme.fg("accent", str)`, `theme.bold(str)`. Drop to chalk only for wireframe glyphs where no theme token fits. |
| **js-yaml** as the round-trip writer | Cannot preserve comments or blank lines; writing the file back will silently destroy user annotations. Spec file is git-tracked and human-edited — destroying comments is a correctness bug. | `yaml@^2.8.3` (eemeli/yaml). |
| **zod v3** | Zod v4 is stable (since Aug 2025), ~10× faster tsc, dramatically faster runtime, better error customization. No reason to pick v3 for a greenfield project in 2026. | `zod@^4.3.6`. |
| **TypeBox for internal validation** | Excellent JSON-Schema output, mediocre DX for hand-written schemas. We already need Zod for the spec; adding TypeBox as a second validation model is unnecessary surface area. | Zod for all internal validation. TypeBox **only** in the narrow `pi.registerTool.parameters` slot where pi requires it. |
| **Ajv standalone** | JSON Schema validator — only relevant if we ship JSON Schema as the source of truth. We ship Zod as SOT; any JSON Schema output is derived via `z.toJSONSchema()` (Zod v4 built-in). | `zod@4`'s built-in `.toJSONSchema()` if we ever need to publish a schema. |
| **SQLite / any persistent store** | Explicit project constraint: spec file IS the state. Hidden stores violate the "git-backed, dev sees everything" promise. | `fs/promises` + `withFileMutationQueue`. Ephemeral cross-session state goes in `ctx.sessionManager` via `pi.appendEntry()`. |
| **chokidar** / file watchers | We're the only writer; pi's own file-mutation queue coordinates with `edit`/`write` tools. External file-system watches add race conditions. | Re-read on command, or poll `mtime` on canvas focus if needed. |
| **dotenv / env config** | Settings belong in pi's `settings.json` or in flags registered via `pi.registerFlag("wireframe-width", { type: "number", default: 40 })`. | `pi.registerFlag(...)` + `pi.getFlag(...)`. |
## Stack Patterns by Variant
- Add `@sinclair/typebox` for `pi.registerTool.parameters`.
- Add `@mariozechner/pi-ai` for the `StringEnum` helper.
- Keep Zod as the *internal* spec validator; convert TypeBox → Zod at the tool boundary, not throughout.
- Lazy-render wireframe previews (only render the focused-pane wireframe full-fidelity; others render a placeholder).
- Memoize `Component.render(width)` output per-node by `(stateHash, width)`.
- No stack change — pi-tui's diff renderer handles scale fine; the bottleneck will be our wireframe layout, not the host.
- Extract the `schema + parser + emitters` into a sibling package (`mobile-spec-core`).
- pi extension becomes a thin presentation layer.
- This is the correct shape for a v2 or v3, not v1.
- Switch to "footer-block" convention — human comments go in a dedicated `## Notes` section of the Markdown body, not in YAML frontmatter. Simpler round-trip.
- Reconsider only after observed problems; `eemeli/yaml` round-tripping is widely proven.
## Version Compatibility
| Package A | Compatible With | Notes |
|---|---|---|
| `@mariozechner/pi-coding-agent@^0.67.6` | `@mariozechner/pi-tui@^0.67.6`, `@mariozechner/pi-ai@^0.67.6` | **Version-locked to the same minor.** The pi-mono monorepo ships all three at the same version — `0.67.6` today. Always upgrade them together. |
| `zod@^4.3.6` | Node 20+ | Zod v4 requires modern runtime features. ESM-only for the `zod/mini` import. |
| `yaml@^2.8.3` | Node 20+, browsers, ESM + CJS | Native TS types, no `@types/*` needed. |
| `gray-matter@^4.0.3` + `yaml@^2.8.3` | Compatible via `engines` option | Pass `{ engines: { yaml: { parse: YAML.parse, stringify: YAML.stringify } } }` to use eemeli/yaml instead of gray-matter's bundled js-yaml. |
| `jiti` (transitive via pi) | TypeScript `^5.6` | jiti handles TS without `tsc`. We still run `tsc --noEmit` in CI for type-check only. |
| `tsup@^8.5.1` | TypeScript `^5.6`, Node 20+ | esbuild-based; bundles ESM + type declarations. |
| Maestro CLI `2.4.0` | YAML produced by `yaml@^2.8.3` | Validated via `maestro check-flow-syntax`. Flows are plain YAML — no JS runtime dep. |
## pi.dev Extension Gotchas
## Confidence Assessment
| Area | Confidence | Why |
|---|---|---|
| pi.dev extension API + `pi-tui` primitives | **HIGH** | Verified against extensions.md (live in `badlogic/pi-mono` main), registry versions, multiple independent write-ups agree, confirmed package shape. |
| Zod v4 recommendation | **HIGH** | Official v4 migration guide, InfoQ coverage of stable release, consistent benchmark reports, Context7 library entry confirms v4 is current. |
| `yaml@2.8.3` over `js-yaml` for round-trip | **HIGH** | Comment-preservation is eemeli/yaml's headline feature and js-yaml's documented non-feature. Registry confirms `yaml@2.8.3`. |
| `gray-matter` as splitter | **HIGH** | Industry standard; custom-engine override is documented API; registry confirms `4.0.3`. |
| Maestro (not Detox) for v1 | **HIGH** | YAML-first authoring is Maestro's thesis; current release is CLI `2.4.0` (2026-04-02); native SwiftUI/Jetpack Compose support is documented. Detox is TypeScript-first by design. |
| Build wireframe ourselves vs library | **MEDIUM-HIGH** | Exhaustive library search turned up nothing that composes at mobile-UI fidelity inside pi-tui. "Build it" is a reasoned conclusion, but someone may know an obscure library I missed. |
| `tsup`/`biome`/`vitest` tooling picks | **MEDIUM** | All current, all widely used; "best" is taste-dependent. Could swap any of them without disturbing the stack. |
| Detox emission path in v2 | **MEDIUM** | Shape is clear (template + same AST) but implementation details depend on target app setup; revisit when we actually commit to it. |
## Sources
- [pi.dev official](https://pi.dev) — philosophy, distribution model
- [pi-mono extension docs](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) — full ExtensionAPI surface, lifecycle events, `ctx.ui.*`, `ctx.ui.custom()`, `registerTool`, `registerCommand`, session persistence, package shape
- [@mariozechner/pi-coding-agent on npm](https://www.npmjs.com/package/@mariozechner/pi-coding-agent) — version 0.67.6 confirmed
- [pi-tui deepwiki / package docs](https://deepwiki.com/badlogic/pi-mono/5-pi-tui:-terminal-ui-library) — Component, Box, Container, rendering model, keyboard helpers
- npm registry direct: `@mariozechner/pi-coding-agent@0.67.6`, `@mariozechner/pi-tui@0.67.6`, `@mariozechner/pi-ai@0.67.6`
- [Zod v4 release notes](https://zod.dev/v4) — stable, performance gains, breaking changes
- [InfoQ: Zod v4 stable Aug 2025](https://www.infoq.com/news/2025/08/zod-v4-available/) — ecosystem readiness, adopters
- [TypeScript runtime benchmark](https://moltar.github.io/typescript-runtime-type-benchmarks/) — comparative perf for Zod/TypeBox/Valibot/ArkType
- Context7 library IDs: `/colinhacks/zod`, `/websites/zod_dev_v4`
- [eemeli/yaml README](https://github.com/eemeli/yaml) — comment preservation, streaming, native TS types
- [yaml on npm](https://www.npmjs.com/package/yaml) — `2.8.3` confirmed
- [gray-matter README](https://github.com/jonschlinkert/gray-matter) — custom engines, widespread adoption
- [npm-compare: front-matter vs gray-matter](https://npm-compare.com/front-matter,gray-matter,remark-frontmatter,yaml-front-matter) — scope comparison
- [Maestro GitHub releases](https://github.com/mobile-dev-inc/maestro/releases) — CLI `2.4.0` (2026-04-02)
- [Maestro docs (llms-full.txt)](https://docs.maestro.dev/llms-full.txt) — flow structure, command reference
- [QA Wolf — Best Mobile E2E Frameworks 2026](https://www.qawolf.com/blog/best-mobile-app-testing-frameworks-2026) — comparative positioning
- [Panto — Detox vs Maestro](https://www.getpanto.ai/blog/detox-vs-maestro) — authoring-model tradeoff
- Context7: `/mobile-dev-inc/maestro`, `/mobile-dev-inc/maestro-docs`, `/websites/maestro_dev`
- `detox@20.50.1` on npm registry
- [boxen on npm](https://www.npmjs.com/package/boxen), [cli-boxes on npm](https://www.npmjs.com/package/cli-boxes) — scope confirmed too small
- [ink on npm](https://www.npmjs.com/package/ink) — confirmed as React-based runtime, incompatible with pi's render loop
- Unicode Box Drawing block reference — structural characters for our custom renderer
- `tsup@8.5.1`, `@biomejs/biome@2.4.12`, `vitest@4.1.4` — current versions verified on npm registry
- [tsup docs](https://tsup.egoist.dev) — zero-config esbuild bundler
- [Biome docs](https://biomejs.dev) — single-binary linter+formatter
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
