---
# Inline author comment at top of frontmatter.
schema: mobile-tui/1  # version pin

screens:
  - id: only_screen  # the one and only
    title: Only
    kind: regular
    variants:
      content:
        kind: content
        tree: []
      empty: null
      loading: null
      error: null

actions: {}  # no actions yet

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

<!-- trailing body comment -->
