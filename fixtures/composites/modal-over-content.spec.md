---
schema: mobile-tui/1

screens:
  - id: main
    title: Main
    kind: regular
    variants:
      content:
        kind: content
        tree:
          - kind: Column
            gap: md
            children:
              - kind: Text
                text: main screen body
                style: body
              - kind: Button
                label: Show
                action: present_detail
                testID: show_btn
                variant: primary
      empty: null
      loading: null
      error: null

  - id: detail_modal
    title: Detail
    kind: overlay
    back_behavior: dismiss
    variants:
      content:
        kind: content
        tree:
          - kind: Modal
            child:
              kind: Column
              gap: md
              children:
                - kind: Text
                  text: Confirm?
                  style: heading-1
                - kind: Divider
                - kind: Spacer
                  size: md
                - kind: Button
                  label: "Yes"
                  action: confirm
                  testID: yes_btn
                  variant: primary
      empty: null
      loading: null
      error: null

actions:
  present_detail:
    kind: present
    overlay: detail_modal
  confirm:
    kind: dismiss

data:
  entities:
    - name: Thing
      fields:
        - name: title
          type: string

navigation:
  root: main
  edges:
    - from: main
      to: detail_modal
      trigger: present_detail
      transition: modal
---

<!-- Composite fixture 4 (WIREFRAME-03): Modal overlay with labeled top border. -->
<!-- Two screens so navigation cross-ref is sound; wireframe renders detail_modal content per plan. -->
<!-- Source for composites/modal-over-content.wf.txt. -->
