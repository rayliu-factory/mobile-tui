---
schema: mobile-tui/1

screens:
  - id: only_screen
    # comment inside list item, before title
    title: Only
    kind: regular
    variants:
      content:
        kind: content
        # tree is intentionally empty while the designer iterates
        tree: []
      empty: null
      loading: null
      error: null

actions: {}

data:
  entities:
    - name: Thing
      # fields list follows; keep at least one for validateSpec
      fields:
        - name: label
          type: string
          required: true

navigation:
  root: only_screen
  # edges remain empty until the nav graph is sketched
  edges: []
---

# nested-comment fixture
