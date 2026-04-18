# Phase 6: Wizard & Graduation — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 06-wizard-graduation
**Areas discussed:** Wizard step layout, Screens step UX, Graduation & end-of-wizard, Re-entry & back-navigation

---

## Wizard Step Layout

| Option | Description | Selected |
|--------|-------------|----------|
| 2-pane: form + spec preview | Left 50% = form/inputs, right 50% = live YAML skeleton preview. Makes the artifact visible from step 1. | ✓ |
| Full-screen single question | Whole terminal per step. Clean but spec stays invisible until canvas. | |
| 3-pane like canvas | Reuse 3-pane shell; wizard content in center. Max code reuse but cramped. | |

**User's choice:** 2-pane: form + spec preview  
**Notes:** Spec preview pane shows raw YAML frontmatter with TODO markers for unanswered fields. Pane split is 50/50.

### Sub-question: Preview pane content

| Option | Description | Selected |
|--------|-------------|----------|
| Raw YAML frontmatter skeleton | Actual YAML being built with TODO markers. Developer sees exact output format. | ✓ |
| ASCII wireframe of first screen | More visually exciting but nothing to show until step 4. | |
| Plain text summary | Friendlier but doesn't show spec format. | |

### Sub-question: Pane split

| Option | Description | Selected |
|--------|-------------|----------|
| 50/50 | Equal split. Room for inputs and YAML preview. | ✓ |
| 60/40 form-heavy | More room for form; narrower preview. | |
| 40/60 preview-heavy | Emphasizes artifact but inputs may feel cramped. | |

---

## Screens Step UX (Step 4)

| Option | Description | Selected |
|--------|-------------|----------|
| Add one-by-one with Enter | Single input; Enter adds to list; empty Enter or Tab finishes. Backspace on empty removes last. | ✓ |
| Multi-line block input | Textarea; one name per line; blank line to finish. Faster for power users. | |

**User's choice:** Add one-by-one with Enter  
**Notes:** Minimum 1 screen required. Name only (no kind, no back_behavior). First screen defaults to `back_behavior: none`; subsequent screens default to `back_behavior: stack`. ID derived by kebab-casing the name.

### Sub-question: Screen metadata per screen

| Option | Description | Selected |
|--------|-------------|----------|
| Name only | Just the name. All other fields in canvas. | ✓ |
| Name + screen kind | Second prompt for kind per screen. More structured but adds friction. | |
| Name + root vs non-root | Second prompt for back_behavior. Useful for model correctness. | |

---

## Graduation & End-of-Wizard

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-flip to canvas immediately | Step 8 completes → canvas launches automatically. No confirmation. | ✓ |
| Show a summary screen first | After step 8, summary pane with Enter to graduate or Esc to go back. | |
| Prompt: graduate or keep editing | Explicit Y/n confirmation prompt. | |

**User's choice:** Auto-flip to canvas immediately  
**Notes:** Spec already saved per WIZARD-02 save-on-advance. Mode flip replaces wizard root with canvas root; store unchanged.

### Sub-question: Skip-to-canvas key

| Option | Description | Selected |
|--------|-------------|----------|
| Ctrl+G (go to canvas) | Mnemonic: G for Graduate. Not bound elsewhere. | ✓ |
| Ctrl+Enter | Risks confusion with field confirm Enter. | |
| You decide | Claude picks a free key. | |

**User's choice:** Ctrl+G  
**Notes:** Shown in help line as `[ctrl+g] canvas` from step 1 onward.

---

## Re-entry & Back-Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Free back/forward with Esc/Tab | Esc = previous step; Tab/Enter = next. Re-entry lands on first TODO step. | ✓ |
| Jump-list sidebar | Left pane shows numbered steps with checkmarks. More visual but complex. | |
| Forward-only, canvas for back-edits | Simplest wizard but violates WIZARD-03. | |

**User's choice:** Free back/forward with Esc/Tab  
**Notes:** Navigating backward does NOT re-save. Pressing Esc discards in-progress edit for the current step; prior advance state preserved.

### Sub-question: Step indicator look

| Option | Description | Selected |
|--------|-------------|----------|
| Top bar with step dots | `Step N/8: Name` on line 1, dot row (● ● ◉ ○ ○ ○ ○ ○) on line 2. Compact. | ✓ |
| Step number only | Just "Step 3 of 8" text. Minimal, no progress bar. | |
| Vertical step list in form pane | Numbered list of all 8 steps taking ~8 lines. Full context but expensive. | |

### Sub-question: Re-entry field display

| Option | Description | Selected |
|--------|-------------|----------|
| Answered steps show value inline, cursor on field | Pre-populated input; user edits and presses Tab to re-save. | ✓ |
| Read-only display with Edit key | Extra keypress to enter edit mode. Clearer but friction. | |
| You decide | Claude minimizes state management complexity. | |

---

## Claude's Discretion

- Step-to-spec field mapping (step 1 → `app_idea`, step 2 → `primary_user`, etc.)
- Step 6 (data) UX: same add-one-by-one pattern as step 4, name-only for entities
- Spec preview YAML serialization: `yaml.stringify(spec)` sufficient for preview (no eemeli/yaml round-trip needed)
- Wizard component file layout within `src/wizard/`
- Exact undo/step-navigation interaction behavior (noted in deferred as complex; planner to address)

## Deferred Ideas

- Variant switching / wireframe preview during wizard (Phase 5.1+)
- Entity field definitions in step 6 (v2)
- Nav edge definition in wizard (canvas-only for v1)
- Animated YAML update flash in preview (v2)
- Undo vs step-navigation interaction (planner to define behavior in plan)
