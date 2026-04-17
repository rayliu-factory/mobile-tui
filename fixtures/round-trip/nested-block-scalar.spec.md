---
schema: mobile-tui/1

screens:
  - id: detail
    title: Detail
    kind: regular
    # Acceptance criteria expressed as a multi-line block scalar (literal |).
    # Round-trip must preserve indentation, trailing newline policy,
    # and the comment above the scalar.
    acceptance:
      - |
        Given the user opens the detail screen
        When they tap the accept button
        Then the record is marked completed
          and the timestamp is recorded
    variants:
      content:
        kind: content
        tree: []
      empty: null
      loading: null
      error: null

actions: {}

data:
  entities:
    - name: Thing
      fields:
        - name: label
          type: string
          required: true

navigation:
  root: detail
  edges: []
---

# nested-block-scalar fixture

Covers CST preservation of a multi-line block scalar (`|`) with a comment above.
