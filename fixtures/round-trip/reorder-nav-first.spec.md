---
navigation:
  root: only_screen
  edges: []

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

data:
  entities:
    - name: Thing
      fields:
        - name: label
          type: string
          required: true
---

# reorder-nav-first fixture
