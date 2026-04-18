---
schema: mobile-tui/1

screens:
  - id: main
    title: Card In List
    kind: regular
    variants:
      content:
        kind: content
        tree:
          - kind: List
            bindsTo: /Thing/title
            itemTemplate:
              kind: ListItem
              children:
                - kind: Card
                  child:
                    kind: Row
                    gap: md
                    children:
                      - kind: Text
                        text: title
                        style: heading-2
                      - kind: Toggle
                        label: done
                        action: toggle_done
                        testID: done_tog
                        bindsTo: /Thing/done
      empty: null
      loading: null
      error: null

actions:
  toggle_done:
    kind: mutate
    target: /Thing/done
    op: toggle

data:
  entities:
    - name: Thing
      fields:
        - name: title
          type: string
        - name: done
          type: boolean

navigation:
  root: main
  edges: []
---

<!-- Composite fixture 2 (WIREFRAME-03): List bound to /Thing, itemTemplate = ListItem -> Card -> Row([Text h2, Toggle]). -->
<!-- Exercises D-36's Card-in-List double-box pattern. Source for composites/card-in-list.wf.txt. -->
