# Phase 3 reference wireframes (20 golden fixtures)

20 ASCII wireframes rendered by `src/emit/wireframe/render()` at fixed 60-col
width (D-38). File layout (D-47): `{fixture_slug}/{screen_id}-{variant}.wf.txt`.
Authoritative shape: D-33..D-49 in
`.planning/phases/03-wireframe-renderer-dogfood-gate/03-CONTEXT.md`.

Regenerate any file:

    npx tsx scripts/render-wireframe.ts <spec-path> <screen-id> <variant> > fixtures/wireframes/<slug>/<screen>-<variant>.wf.txt

| #  | File                                   | Purpose                                                      |
|----|----------------------------------------|--------------------------------------------------------------|
| 01 | habit-tracker/home-content.wf.txt      | Happy-path home screen (NavBar, list of habits, add button)  |
| 02 | habit-tracker/home-empty.wf.txt        | Empty habit-list state (when collection /Habit/title)        |
| 03 | habit-tracker/home-loading.wf.txt      | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 04 | habit-tracker/home-error.wf.txt        | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 05 | habit-tracker/new_habit-content.wf.txt | Create-habit form (TextField + Save button)                  |
| 06 | todo/inbox-content.wf.txt              | Happy-path inbox screen                                      |
| 07 | todo/inbox-empty.wf.txt                | Empty inbox state                                            |
| 08 | todo/inbox-loading.wf.txt              | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 09 | todo/inbox-error.wf.txt                | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 10 | todo/projects-content.wf.txt           | Projects list screen                                         |
| 11 | social-feed/feed-content.wf.txt        | Happy-path social feed                                       |
| 12 | social-feed/feed-empty.wf.txt          | Empty feed state                                             |
| 13 | social-feed/feed-loading.wf.txt        | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 14 | social-feed/feed-error.wf.txt          | Null-variant N/A marker (D-39 / WIREFRAME-04)                |
| 15 | social-feed/post_detail-content.wf.txt | Post-detail screen                                           |
| 16 | composites/nested-col-row.wf.txt       | WIREFRAME-03 composite 1: nested Column > Row[...] pair      |
| 17 | composites/card-in-list.wf.txt         | WIREFRAME-03 composite 2: Card inside List item              |
| 18 | composites/navbar-tabbar.wf.txt        | WIREFRAME-03 composite 3: NavBar + TabBar chrome shell       |
| 19 | composites/modal-over-content.wf.txt   | WIREFRAME-03 composite 4: Modal overlay with labeled border  |
| 20 | composites/sheet.wf.txt                | WIREFRAME-03 composite 5: Sheet overlay wrapping a form      |

## Dogfood gate (WIREFRAME-06 + D-48 + D-49)

Phase 4 planning is blocked until the author pastes ≥3 of the wireframes above
into real PR / Slack / issue surfaces and records a `shareable` verdict per
paste in `SHARED.md`. See `SHARED.md` for instructions and the evidence
schema.

## Snapshot stability

Every `.wf.txt` in this directory is the BYTE-EXACT output of
`render(spec, screen, variant)` (or `renderSingleVariant(...)`) at the moment
of generation. Files are regenerated from the CLI, never hand-edited.
`.gitattributes` locks LF line endings. Every file matches the ASCII-baseline
regex `^[|\-+. \x20-\x7E\n]*$` (WIREFRAME-02).
