# mobile-tui

A [pi.dev](https://pi.dev) extension that guides developers through creating mobile app specs inside a terminal UI. A wizard-then-canvas flow captures screens, navigation, data models, and state; the extension renders detailed ASCII wireframes you can preview, then writes a Markdown + YAML-frontmatter spec file (with Maestro E2E flows) that an LLM can consume to build and test the app.

**Core value:** The ASCII wireframes are good enough to share — the wireframe artifact is the centrepiece.

## Requirements

- [pi.dev](https://pi.dev) v0.67.x or later
- Node.js 20+

## Install

```bash
pi install npm:mobile-tui
```

Or load directly from source during development:

```bash
pi -e /path/to/mobile-tui/src/extension.ts
```

## Usage — `/spec`

Run `/spec` inside any pi session. The extension inspects your project and routes you automatically:

| Situation | What opens |
|-----------|------------|
| No `SPEC.md` found | Wizard (fresh project) |
| `SPEC.md` exists | Canvas (edit existing spec) |
| Prior session saved | Resumes from where you left off |

### Fresh project (wizard path)

```
/spec
```

The wizard walks you through 8 steps in order:

1. **App Idea** — one-sentence description of the app
2. **Primary User** — who uses it and why
3. **Navigation Pattern** — tab bar, stack, drawer, or hybrid
4. **Screens** — list every screen by name
5. **Auth** — authentication requirements (none, email, social, …)
6. **Data** — core entities and their relationships
7. **Offline/Sync** — offline mode and sync strategy
8. **Target Platforms** — iOS, Android, or both

When all 8 steps are answered the wizard graduates to the canvas automatically.

### Existing spec (canvas path)

```
/spec
```

Opens the 3-pane canvas:

```
┌──────────────┬────────────────────┬──────────────────┐
│  Screens     │   Inspector        │  Wireframe       │
│  (list)      │   (component tree) │  (ASCII preview) │
└──────────────┴────────────────────┴──────────────────┘
```

`Tab` / `Shift+Tab` cycles focus between panes.

## Canvas Keybindings

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Cycle focus between panes |
| `:` or `Ctrl+P` | Open command palette |
| `Ctrl+Z` | Undo last change |
| `Ctrl+Y` | Redo |
| `Ctrl+W` | Yank wireframe for active screen to clipboard |
| `Ctrl+E` | Emit Maestro E2E flow files |
| `Ctrl+Q` | Quit (autosaves before exit) |

## Handoff Commands

Run these from the command palette (`:` or `Ctrl+P`):

### Yank wireframe

Copies the ASCII wireframe for a screen to the clipboard — paste into a prompt or doc.

```
:yank wireframe <screen-id>
```

### Generate LLM prompt

Emits a structured prompt for a target framework, ready to paste into an LLM.

```
:prompt screen <screen-id> <target>
```

Targets: `swiftui`, `compose`

### Extract screen spec

Extracts a single screen's full spec block as standalone Markdown.

```
:extract --screen <screen-id>
```

## Spec File Format

The extension reads and writes `SPEC.md` — a Markdown file with a YAML frontmatter block followed by free-form notes.

**Annotated example:**

```yaml
---
schema: mobile-tui/1         # always present; version-pins the parser

screens:
  - id: home                 # kebab-case identifier used in commands + navigation edges
    title: My Habits         # display title rendered in wireframe NavBar
    kind: regular            # regular | modal | sheet | tab
    acceptance:
      - User sees a list of habits with their daily-complete state
      - Tapping a habit toggles its completion
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: My Habits
            trailing:
              kind: Button
              label: "+"
              action: add_habit
          - kind: List
            bindsTo: /Habit   # binds to the Habit entity defined below
            itemTemplate:
              kind: ListItem
              label: Open Detail
              action: open_detail

navigation:
  root: home                 # first screen shown on launch
  edges:
    - from: home
      to: detail
      trigger: open_detail
      kind: push

entities:
  - name: Habit
    fields:
      - name: id
        type: uuid
      - name: name
        type: string
      - name: completedToday
        type: boolean
---

## Notes

Any free-form Markdown below the frontmatter is preserved across edits.
```

## Output Files

After running `Ctrl+E` the extension writes Maestro YAML flow files alongside `SPEC.md`:

```
SPEC.md
maestro/
  home.yaml
  detail.yaml
```

These can be run directly with the [Maestro CLI](https://maestro.mobile.dev):

```bash
maestro test maestro/home.yaml
```

## Session Persistence

The extension saves your position (current screen, pane focus, wizard step) to `.planning/.mobile-tui/session.json`. This directory is automatically added to `.gitignore` — session state is local only.

## Building from Source

```bash
npm install
npm run build   # produces dist/extension.js via tsup
npm test        # runs vitest suite
```

To verify the bundle does not accidentally bundle pi runtime dependencies:

```bash
npm run build && npx vitest run tests/no-pi-bundle.test.ts
```
