---
schema: mobile-tui/1   # trailing comment after scalar value

screens:                # trailing comment after sequence key
  - id: only_screen
    title: Only
    kind: regular
    variants:
      content:
        kind: content
        tree: []        # trailing comment after empty seq
      empty: null
      loading: null
      error: null

actions: {}             # trailing comment after empty map

data:
  entities:
    - name: Thing
      fields:
        - name: label
          type: string
          required: true

navigation:
  root: only_screen     # trailing comment after root value
  edges: []
---

# trailing-comment fixture

Body after the frontmatter.
