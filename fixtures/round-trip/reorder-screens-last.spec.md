---
schema: mobile-tui/1

actions: {}

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
---

# reorder-screens-last fixture
