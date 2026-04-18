---
schema: mobile-tui/1

screens:
  - id: sheet_screen
    title: Sheet
    kind: overlay
    back_behavior: dismiss
    variants:
      content:
        kind: content
        tree:
          - kind: Sheet
            child:
              kind: Column
              gap: md
              children:
                - kind: NavBar
                  title: Sheet
                - kind: TextField
                  label: Name
                  action: edit_name
                  testID: name_in
                  placeholder: Enter name
                - kind: Button
                  label: Save
                  action: save
                  testID: save_btn
                  variant: primary
      empty: null
      loading: null
      error: null

actions:
  edit_name:
    kind: custom
    name: edit_name
  save:
    kind: submit
    entity: Thing

data:
  entities:
    - name: Thing
      fields:
        - name: name
          type: string

navigation:
  root: sheet_screen
  edges: []
---

<!-- Composite fixture 5 (WIREFRAME-03): Sheet overlay wrapping Column([NavBar, TextField, Button]). -->
<!-- Tests Sheet's bottom-anchored position + labeled top border. Source for composites/sheet.wf.txt. -->
