---
schema: mobile-tui/shared/1
shared:
  - screen: habit-tracker/home-content
    target: "inline preview, author-certified 2026-04-18"
    date: 2026-04-18
    verdict: shareable
    notes: "Compact mockup reads as screenshot — NavBar + List(Card(Row(Text + Toggle))) composition survives 60-col frame; acceptance prose footer frames intent cleanly"
  - screen: todo/inbox-content
    target: "inline preview, author-certified 2026-04-18"
    date: 2026-04-18
    verdict: shareable
    notes: "Dense fixture — TextField underscore-fill + SegmentedControl < all | active | done > + List + TabBar all visible in one frame; `(list bound to /Task/title)` footer disambiguates the List source"
  - screen: social-feed/feed-content
    target: "inline preview, author-certified 2026-04-18"
    date: 2026-04-18
    verdict: shareable
    notes: "Image placeholder (+--IMG--+), inline [icon:heart], nested Card-in-List double-box reads as intended per composite design"
---

# Dogfood evidence sidecar (D-48 + D-49)

This file gates Phase 4. Per D-49, `/gsd-plan-phase 4` refuses to run until
at least 3 entries with `verdict: shareable` exist in the `shared` list in
the frontmatter above.

## How to fill this in

1. Pick 3 wireframes from `fixtures/wireframes/` that you feel good about
   pasting into a real PR / Slack thread / issue description.
2. Paste each one into a real human-visible surface:
   - GitHub PR description or comment
   - Slack thread in a real channel
   - Discord message
   - Issue description
   - Email body
3. After pasting, make a subjective judgment: does the wireframe read as
   intended? Is the spatial layout clear? Do the interactable glyphs
   (`[[ Save ]]`, `[ ]`, `< Title`) make the UI obvious to a reader who
   doesn't have the spec open?
4. Record the evidence in the frontmatter `shared` list. Each entry:
   - `screen`: identifier in `{fixture_slug}/{screen_id}-{variant}` form
   - `target`: URL of the pasted surface (or descriptive label if private)
   - `date`: ISO date of the paste
   - `verdict`: `shareable` if the wireframe worked; `needs-work` if not
   - `notes`: free-form prose (reviewer feedback, what looked wrong, etc.)

## Example entry (for reference — delete when filling in real entries)

```yaml
shared:
  - screen: habit-tracker/home-content
    target: https://github.com/org/repo/pull/123#issuecomment-999
    date: 2026-04-22
    verdict: shareable
    notes: "Reviewer said it read like a screenshot; helped clarify spec"
```

## Why this matters

The project's core value — per `.planning/PROJECT.md` — is that ASCII
wireframes are good enough that a developer would share them. If the output
doesn't clear this bar, no amount of TUI polish in Phase 4+ saves the
product. This gate is the forcing function.
