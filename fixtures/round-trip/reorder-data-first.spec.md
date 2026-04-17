---
data:
  entities:
    - name: Thing
      fields:
        - name: label
          type: string
          required: true

schema: mobile-tui/1

screens:
  - id: only_screen
    title: Only
    kind: regular
    variants:
      content:
        kind: content
        tree: []
      empty: null
      loading: null
      error: null

actions: {}

navigation:
  root: only_screen
  edges: []
---

# reorder-data-first fixture
