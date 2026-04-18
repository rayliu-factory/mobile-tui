# Phase 6: Wizard & Graduation — Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the 8-step linear intake wizard layered on the Phase 5 canvas store. A developer with an idea but no spec reaches a saved skeleton in 8 linear steps; graduation to canvas is a mode flip — same store, same command registry, same keybindings, no reset. The wizard and canvas share one `ctx.ui.custom()` lifecycle; the wizard swaps out the root component, not the store.

**The 8 steps (fixed order, no branching):**
1. App idea
2. Primary user
3. Navigation pattern
4. Screens
5. Auth
6. Data
7. Offline/sync
8. Target platforms

**In scope (this phase):** `src/wizard/` directory (root wizard component, step form pane, spec preview pane, step indicator, step definitions for all 8 steps), `scripts/wizard.ts` CLI entry, mode-flip logic (wizard root → canvas root with same store), re-entry detection (first unanswered step), per-step save-on-advance, integration tests asserting wizard→canvas graduation and re-entry edit behavior.

**Explicitly NOT in scope:** Maestro emission (Phase 7), clipboard/yank (Phase 8), pi extension lifecycle (Phase 9), component tree editing inside the wizard, nav graph editing in wizard mode.

**Requirements covered:** WIZARD-01, WIZARD-02, WIZARD-03, WIZARD-04, WIZARD-05.

</domain>

<decisions>
## Implementation Decisions

### Wizard Layout

- **D-88:** **2-pane layout: form pane (left, 50%) + spec preview pane (right, 50%).** The form pane shows the current step's question(s) and input fields. The spec preview pane shows the raw YAML frontmatter skeleton being built, with answered fields filled in and unanswered fields as `TODO` markers. This makes the wireframe/spec artifact visible from step 1 — reinforcing the core-value promise.
- **D-89:** **Minimum terminal width for wizard is 80 cols.** Below 80 cols, collapse the preview pane and show only the form pane full-width (same graceful-degrade pattern as canvas D-83).
- **D-90:** **The spec preview pane shows the raw YAML frontmatter skeleton.** Not an ASCII wireframe, not a human-readable summary — the actual YAML that will be written to disk, with `TODO` markers for unanswered fields. Answered fields fill in immediately on advance (no buffering — WIZARD-02). When step 4 (screens) is answered, the `screens:` block in the preview shows the screen list. This preview is read-only; it is NOT editable inline.

### Step Indicator

- **D-91:** **Step indicator is a compact top bar in the form pane:** `Step N/8: [Step name]` on line 1, then a dot row on line 2 — filled dot `●` for answered steps, current step marker `◉` (or `●` bright), empty circle `○` for unanswered TODO steps. Example: `● ● ◉ ○ ○ ○ ○ ○` when on step 3 with steps 1–2 answered. This costs 2 lines and stays out of the way of the form content below.

### Screens Step UX (Step 4)

- **D-92:** **Step 4 uses an add-one-by-one interaction.** Single input field at the top of the step. User types a screen name, presses `Enter` to add it to the list below the input, then types the next name. An empty `Enter` OR `Tab` finishes the step (advances to step 5). The list below the input shows all screens added so far, with the last-added item indicated. `Backspace` on an empty input field removes the last screen from the list.
- **D-93:** **Screen metadata in the wizard is name only.** Slug/ID is derived by kebab-casing the name (e.g., "Login Screen" → `login-screen`). No kind, no back_behavior, no component tree in the wizard. All other screen fields default to safe values (`back_behavior: stack` for non-root, `back_behavior: none` for the first screen). Full screen editing happens in canvas.
- **D-94:** **Minimum 1 screen required to advance past step 4.** If the user presses Tab/Enter on an empty list, the step does not advance — show an inline error: `At least one screen is required.` No maximum; the list scrolls within the form pane.

### Navigation & Back-Navigation

- **D-95:** **Esc goes to the previous step; Tab/Enter advances to the next step.** Free bidirectional navigation. This applies from step 2 onward; pressing Esc on step 1 does nothing (step 1 has no previous step). Steps save their answers immediately on advance (Tab/Enter), not on Esc. Navigating backward does NOT re-save the previous step's current answers (the saved state from the previous advance is preserved).
- **D-96:** **Re-entry lands on the first unanswered (TODO) step.** A step is "answered" if its corresponding spec field is non-null and non-empty. If all 8 steps are answered, re-entry lands on step 8 (the last step). The user can then navigate backward to any step.

### Re-entry & Edit-in-Place

- **D-97:** **When navigating to a completed step, the input field is pre-populated with the saved value.** The cursor is placed at the end of the field. Editing and pressing Tab re-saves the updated value. Pressing Esc discards the in-progress edit and navigates to the previous step (saved value unchanged). This is "edit in place" — no separate read-only/edit-mode toggle.
- **D-98:** **For step 4 (screens), re-entry shows the existing screen list.** The screen list is populated from `spec.screens[]` at load time. The user can add more screens (Enter) or remove the last one (Backspace on empty input). Removing a screen via the wizard removes it from the spec. No rename in the wizard — use the canvas inspector for that.
- **D-99:** **TODO markers display as `TODO` in the spec preview pane.** In the form pane, unanswered steps that haven't been visited show their question with a placeholder `(not yet answered)` below it — visible only when the user navigates back to that step before answering it. This satisfies WIZARD-04's "unfinished steps show TODO markers."

### Graduation

- **D-100:** **After step 8 completes (user presses Tab/Enter with a valid answer), the wizard auto-flips to canvas immediately.** No confirmation prompt, no summary step. The spec is already saved at this point (per WIZARD-02 save-on-advance). The canvas root component replaces the wizard root component in-place via `ctx.ui.custom()` (or equivalent component swap) — the store is unchanged, the spec loaded, canvas opens with the first screen selected.
- **D-101:** **`Ctrl+G` is the skip-to-canvas key, available from any wizard step.** Shown in the help line as `[ctrl+g] canvas`. Triggers the same mode flip as step-8 completion: store unchanged, canvas root loads, wizard root discarded. The partial spec (however far the user got) is already saved. Global key — handled by the wizard root before delegating to the focused step.
- **D-102:** **Help line in wizard shows:** `[tab] next  [esc] back  [ctrl+g] canvas  [ctrl+z] undo  [ctrl+q] quit`. This is static for all steps except step 1 (no `[esc] back`). The step indicator (D-91) handles the position context; the help line doesn't duplicate it.

### Store Sharing & Command Palette

- **D-103:** **Wizard uses the same `createStore` + `COMMANDS` registry as canvas (WIZARD-05).** The wizard root component subscribes to the same store for its spec preview pane updates. Palette is reachable via `:` or `Ctrl+P` from any wizard step — same overlay as canvas (D-74). Commands that apply in wizard context (e.g., `add-screen`, `rename-screen`) work; canvas-specific commands (that make no sense mid-wizard) are still listed but may produce a diagnostic if the spec isn't yet in a valid state.
- **D-104:** **The wizard CLI entry (`scripts/wizard.ts`) takes one positional arg:** the target `.spec.md` path. If the file does not exist, it creates a new empty spec with `schema: mobile-tui/1` and opens wizard at step 1. If the file exists and is a valid spec, it opens wizard at re-entry (first TODO step). Same `parseSpecFile` → `createStore` → `ctx.ui.custom()` pattern as `scripts/canvas.ts`.

### Claude's Discretion

- **Step-to-spec field mapping:** Claude defines how each of the 8 steps maps to spec frontmatter fields. Suggested mapping: step 1 → `app_idea` (string), step 2 → `primary_user` (string), step 3 → `nav_pattern` (enum: `tab_bar | side_drawer | stack | modal_first`), step 4 → `screens[]`, step 5 → `auth` (enum: `none | email_password | oauth | biometric | magic_link`), step 6 → `data_models[]` (list of entity names only — full schema editing in canvas), step 7 → `offline_sync` (enum: `none | read_only | full`), step 8 → `target_platforms[]` (multiselect: `ios | android`). Planner verifies these align with the Zod schema.
- **Step 6 (data) UX:** Same add-one-by-one pattern as step 4 (screens) — user types entity names, Enter adds each, Tab finishes. Name-only; no fields or relationships in the wizard.
- **Spec preview YAML serialization:** The preview pane renders the spec as YAML by serializing the current store state (not by reading the file). Pure function from `Snapshot.spec` → `string[]`. No need to go through the full eemeli/yaml round-trip for preview; a simple `yaml.stringify(spec)` is fine.
- **Wizard component file layout:** `src/wizard/root.ts` (root; owns store subscription, mode-flip logic, step cursor state), `src/wizard/step-indicator.ts` (pure function: step index → string[]), `src/wizard/help-line.ts` (pure function → string), `src/wizard/panes/form-pane.ts` (renders current step form), `src/wizard/panes/spec-preview.ts` (YAML preview pane), `src/wizard/steps/` (one file per step definition).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 canvas (wizard extends and mode-flips to this)
- `.planning/phases/05-canvas-tui-shell/05-CONTEXT.md` — D-74..D-87 (canvas layout, palette, focus FSM, keybindings, save indicator, help line — wizard shares all of this)
- `src/canvas/root.ts` — mode-flip target; wizard graduation replaces its own root with `RootCanvas` via the same `ctx.ui.custom()` handle
- `src/canvas/focus-fsm.ts` — `FocusState` type; wizard may extend or keep separate; graduation hands off the canvas focus FSM
- `src/canvas/palette/index.ts` — `CommandPalette` component; wizard reuses same overlay
- `src/canvas/help-line.ts` — reference for help line rendering pattern
- `src/canvas/save-indicator.ts` — reference for save state visual

### Phase 4 store contract
- `.planning/phases/04-editor-store-commands-undo/04-CONTEXT.md` §decisions — store API, command shape, undo stack, autosave
- `src/editor/index.ts` — public barrel: `createStore`, `COMMANDS`, `Snapshot`, `Store`
- `src/editor/store.ts` — `createStore(initial, commands): Store`; `apply`, `subscribe`, `flush`, `undo`, `redo`
- `src/editor/commands/index.ts` — `COMMANDS` registry; wizard palette enumerates this

### Phase 2 serializer
- `src/serialize/parse.ts` — `parseSpecFile(path)` — wizard entry calls this at startup (or creates new spec if file doesn't exist)

### Phase 1 model (spec fields wizard populates)
- `src/model/spec.ts` — `Spec` root shape; wizard populates top-level frontmatter fields
- `src/model/screen.ts` — `Screen` shape; wizard creates minimal screens (name + ID + back_behavior defaults)

### Requirements
- `.planning/REQUIREMENTS.md` §Wizard mode — WIZARD-01..WIZARD-05 full text
- `.planning/ROADMAP.md` §Phase 6 — goal + 5 success criteria

### Project constraints
- `.planning/PROJECT.md` — keyboard-only, git-backed state, no external stores
- `CLAUDE.md` §pi.dev Extension Shape — `ctx.ui.custom()` pattern, pull-based rendering, `matchesKey()` for keyboard
- `CLAUDE.md` §What NOT to Use — no React Ink, no blessed, no raw escape sequences

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phases 4–5)

- **`createStore(initial, commands): Store`** (`src/editor/store.ts`) — Wizard initializes the store once. Subscribes for spec preview pane re-renders.
- **`CommandPalette` component** (`src/canvas/palette/index.ts`) — Wizard imports and reuses directly. Palette overlay is unchanged.
- **`renderHelpLine()`** (`src/canvas/help-line.ts`) — Reference pattern; wizard defines its own help line strings (different from canvas per D-102).
- **`renderSaveIndicator()`** (`src/canvas/save-indicator.ts`) — Can be reused in wizard chrome if a save indicator is desired.
- **`nextFocus()` + `FocusState`** (`src/canvas/focus-fsm.ts`) — Wizard may define its own simplified focus (form-pane only; no inspector/preview focus needed mid-wizard). On graduation, canvas focus FSM takes over.
- **`parseSpecFile(path)`** (`src/serialize/parse.ts`) — Wizard entry point uses same initialization pattern as `scripts/canvas.ts`.
- **`truncateToWidth()`, `visibleWidth()`** (`src/canvas/tui-utils.ts`) — Utility functions available for wizard form rendering.
- **Fixture `.spec.md` files** — Used as re-entry test inputs (specs with partial and full wizard completion states).

### Established Patterns

- **Script entry mirrors `scripts/canvas.ts`** — `scripts/wizard.ts` reads one positional arg, initializes store, mounts `ctx.ui.custom(new WizardRoot(store))`.
- **One file per concern.** Wizard adds `src/wizard/{root, step-indicator, help-line, panes/form-pane, panes/spec-preview, steps/*.ts}`.
- **Snapshot-based rendering.** Spec preview pane's `render(width)` consumes the latest `Snapshot.spec` from store subscription.
- **TDD commit pairs.** `test(06-XX): RED` → `feat(06-XX): GREEN` per Phase 1–5 convention.
- **Biome + vitest + tsc zero-error line** continues.

### Integration Points

- **Wizard → Phase 5 canvas (graduation):** Mode flip replaces wizard root with canvas root. Store and `ctx.ui.custom()` handle are unchanged. Implemented as a callback from wizard root: `onGraduate = () => ctx.ui.custom(new RootCanvas(store))` — or equivalent pattern the planner chooses.
- **Wizard → Phase 4 store:** Wizard subscribes; spec preview re-renders on every `Snapshot`. Each step's save-on-advance calls `store.apply(commandName, args)`. Undo (`Ctrl+Z`) is global — wizard undo reverts the last `store.apply`.
- **Wizard → Phase 9 (pi integration):** Phase 9's `/spec` command will detect existing spec → canvas, no spec → wizard. Phase 6 ships the standalone `scripts/wizard.ts` entry as the testable substrate.

</code_context>

<specifics>
## Specific Ideas

- **2-pane with YAML preview as the wireframe-first moment.** The user sees the skeleton spec appear in YAML on the right as they answer each step. This is the first time they see the actual artifact format. By step 4 (screens), the `screens:` block is populated. By step 8, the whole frontmatter is filled. The "aha moment" of seeing YAML update live is deliberate — it trains the user to understand that the spec is the output.
- **Step 4 (screens) as the most important step.** Every other step is a single string or enum. Step 4 is the only one that produces a list of structured objects. Getting the add-one-by-one UX right (Enter adds, backspace-on-empty removes, Tab finishes) is critical. The planner should give this step its own file (`src/wizard/steps/screens.ts`) with dedicated tests.
- **Graduation as instant mode-flip.** The phrase "mode flip" is intentional: there's no transition animation, no loading state, no "welcome to canvas" message. The canvas just appears, fully functional, with the spec that was just built. This is only possible because the store is shared — the canvas reads from the same in-memory state the wizard just populated.
- **`Ctrl+G` mnemonic (Go to canvas).** Chosen over `Ctrl+C` (reserved by terminal), `Ctrl+X` (cancel), `Ctrl+E` (used in some editors). `G` for Graduate. Should appear in the help line from step 1 onward so users discover it early.
- **Re-entry first-TODO-step logic.** The wizard determines "where to resume" by scanning the 8 step definitions in order and checking each step's spec field for a null/empty value. The first null field → that step. If all 8 are answered → step 8. This is a pure function from `Spec` → `stepIndex` and should be tested with fixture specs at various completion states.

</specifics>

<deferred>
## Deferred Ideas

- **Variant switching in wizard preview** — Showing wireframe previews per screen during the screens step. Would be visually compelling but adds complexity and the wireframe renderer needs a screen with components (which the wizard doesn't populate). Deferred to Phase 5.1 or later.
- **Step 6 (data) with field definitions** — Letting the user define entity fields (name, type, nullable) during the wizard's data step. Name-only in v1; full schema editing in canvas. Deferred to v2.
- **Nav edge definition in wizard** — Step 3 captures the nav *pattern* (tab_bar, side_drawer, etc.) but doesn't let the user define which screen connects to which. Nav edge editing is canvas-only. Deferred.
- **Wizard undo history vs step navigation** — A subtle question: if the user goes back to step 2, edits, then undoes with `Ctrl+Z`, does undo revert the step-2 edit or the step-3 advance? WIZARD-02 says save-on-advance; undo reverts the last `store.apply`. The interaction between step navigation and undo history is complex. Deferred to planner to handle with a clear decision in the plan.
- **Animated YAML update in preview** — A brief highlight or diff flash when a field changes in the YAML preview. Not needed for v1; helps orientation in v2.

</deferred>

---

*Phase: 06-wizard-graduation*
*Context gathered: 2026-04-19*
