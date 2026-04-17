---
actions: {}

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

data:
  entities:
    - name: Thing
      fields:
        - name: label
          type: string
          required: true

navigation:
  root: only_screen
  edges: []
---

# reorder-actions-first fixture
