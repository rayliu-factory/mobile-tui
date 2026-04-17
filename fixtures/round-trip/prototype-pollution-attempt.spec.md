---
__proto__: evil
schema: mobile-tui/1

screens:
  - id: home
    title: Home
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
  root: home
  edges: []
---

<!-- security fixture — save must be blocked. -->

# Prototype-pollution attempt

This fixture is intentionally invalid. parseSpecFile emits
SPEC_UNKNOWN_TOP_LEVEL_KEY error; writeSpecFile's BLOCKER-fix-#3 pre-gate
returns { written: false } without touching disk.
