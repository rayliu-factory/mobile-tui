---
schema: mobile-tui/1

screens:
  - id: norway_screen
    title: "NO"
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
  root: norway_screen
  edges: []
---

# yaml11-gotcha-norway fixture

The title "NO" (Norway country code) is quoted so a YAML 1.1 parser won't
mis-read it as a boolean false. Round-trip preserves the double quotes.
