# mobile-tui

## What This Is

A pi.dev TypeScript extension that guides developers through creating mobile app specs
inside a terminal UI. A wizard-then-canvas flow captures screens, navigation, data
models, and state; the extension renders detailed ASCII wireframes the dev can preview,
then writes a Markdown + YAML-frontmatter spec file (with Maestro/Detox E2E flows) that
an LLM can consume to build and test the app.

## Core Value

The ASCII wireframes are good enough that a developer would share them — the wireframe
artifact is the centerpiece; everything else (nav, data, state, tests) is structure
around it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Wizard flow: linear intake from "idea in head" → skeleton spec
- [ ] Canvas mode: persistent TUI for editing screens/nav/data/state in any order via keyboard
- [ ] Detailed ASCII wireframe rendering per screen (~40 lines; component tree, spacing, copy, states)
- [ ] Capture navigation / flows (how screens connect, transitions, back behavior)
- [ ] Capture data models (entities, fields, relationships)
- [ ] Capture state & behavior (interactions, loading / empty / error states, local state needs)
- [ ] Spec output in Markdown with YAML frontmatter
- [ ] Spec file IS the state — tool reads an existing spec and lets the dev continue editing
- [ ] Framework-agnostic spec representation that targets SwiftUI + Jetpack Compose as concrete consumers
- [x] Generate Maestro / Detox YAML E2E test flows from the spec — Validated in Phase 7: Maestro Emitter (2026-04-19)
- [ ] Packaged and publishable as a pi.dev TypeScript extension (distributable via npm/git)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Graphical / web wireframing UI — project is explicitly terminal-only; the point is "text-based wireframes in the TUI"
- Shipping as a pi skill or standalone CLI — custom TUI components and persistent canvas state need the full TypeScript extension surface
- React Native / Flutter target generation — v1 targets the two native stacks (SwiftUI, Jetpack Compose) only
- The extension generating the app code itself — the dev reviews the spec, then hands it to an LLM of their choice
- Multi-user collaboration / cloud-stored drafts — state is the spec file, checked into git; no hidden stores

## Context

- **Runtime:** Built as a pi.dev (https://pi.dev) TypeScript extension. pi is a
  terminal-based coding agent with a TS extension API, custom TUI components, sub-agents,
  skills, and a package ecosystem. A TUI tool is the natural fit here.
- **Motivation:** There is no low-friction way to go from a rough mobile app idea to
  something an LLM can reliably build and test against. Existing wireframing tools are
  visual/heavy; loose prose specs leave LLMs to hallucinate structure.
- **Consumer chain:** Human dev runs the extension → reviews the generated spec → hands
  it to an LLM (pi, Claude Code, any) → LLM produces SwiftUI / Jetpack Compose code and
  runs the generated Maestro / Detox flows.
- **Audience (initial):** The author, scratching their own itch. v1 success is
  publishing the extension and getting community feedback — not revenue, not scale.

## Constraints

- **Platform**: pi.dev extension runtime (TypeScript) — all code runs inside pi's extension API
- **Interface**: TUI only — no web or native GUI surface
- **Mobile target**: SwiftUI + Jetpack Compose — native-only for v1; framework-agnostic spec, but those are the two consumers the spec must serve well
- **State**: Git-backed — the spec file on disk is the single source of truth; no extension-local database
- **Output format**: Markdown + YAML frontmatter — fixed choice so LLMs and humans both parse it cleanly

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| pi.dev TypeScript extension (vs. skill or standalone CLI) | Needs persistent canvas state + custom TUI components — beyond what a skill supports | — Pending |
| Framework-agnostic spec targeting SwiftUI + Jetpack Compose | Portable spec, but concrete enough to validate against the two native stacks | — Pending |
| Wizard → canvas flow | Wizard gets from "blank page" to a skeleton fast; canvas handles the long tail of refinement | — Pending |
| Markdown + YAML frontmatter as spec format | Human-first review, machine-parseable structure, ASCII wireframes embed cleanly | — Pending |
| Git-backed state (spec file IS the state) | No hidden storage surprises; dev edits / versions / shares the file directly | — Pending |
| Detailed ASCII wireframes (~40 lines/screen) over rough box-sketches | Core value depends on wireframes being "shareable good" | — Pending |
| E2E test flows via Maestro/Detox YAML | Concrete test artifact an LLM can actually execute, not just prose acceptance criteria | — Pending |
| Human dev reviews spec first, LLM second | Spec is the contract — dev catches LLM-misleading ambiguity before the handoff | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 — Phase 7.2 complete: retroactive Nyquist VALIDATION.md records created for phases 6.1 and 6.2; both files have nyquist_compliant: true, status: final, wave_0_complete: true; verification score 4/4
