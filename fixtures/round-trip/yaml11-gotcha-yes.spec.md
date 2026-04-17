---
# author intentionally quoted this so YAML 1.2 parses as string, not bool
schema: mobile-tui/1

screens:
  - id: yes_screen
    title: "yes"
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
  root: yes_screen
  edges: []
---

# yaml11-gotcha-yes fixture

The title "yes" is quoted at authoring time so a YAML 1.1 parser won't mis-read
it as a boolean. Round-trip must preserve the double quotes verbatim.
