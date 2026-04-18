---
schema: mobile-tui/1

screens:
  - id: main
    title: Nested Col Row
    kind: regular
    variants:
      content:
        kind: content
        tree:
          - kind: Column
            gap: md
            children:
              - kind: Row
                gap: md
                children:
                  - kind: Text
                    text: left text
                    style: body
                  - kind: Button
                    label: Go
                    action: do_thing
                    testID: go_btn
                    variant: primary
              - kind: Row
                gap: md
                children:
                  - kind: Icon
                    name: star
                  - kind: Text
                    text: starred
                    style: body
      empty: null
      loading: null
      error: null

actions:
  do_thing:
    kind: custom
    name: do_thing

data:
  entities:
    - name: Thing
      fields:
        - name: title
          type: string

navigation:
  root: main
  edges: []
---

<!-- Composite fixture 1 (WIREFRAME-03): nested Column > Row([Text, Button]) and Row([Icon, Text]). -->
<!-- Source for fixtures/wireframes/composites/nested-col-row.wf.txt (Plan 03-09). -->
