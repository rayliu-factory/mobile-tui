---
schema: mobile-tui/1

integrations:
  sentry: true
  datadog: false

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

navigation:
  root: only_screen
  edges: []
---

# unknown-top-key-integrations fixture

The `integrations:` map is unknown to the Phase-1 schema but must round-trip
byte-identical via AST-native preservation (D-26, nested object variant).
