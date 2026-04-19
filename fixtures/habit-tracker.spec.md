---
schema: mobile-tui/1

screens:
  - id: home
    title: My Habits
    kind: regular
    acceptance:
      - User sees a list of habits with their daily-complete state
      - Tapping a habit toggles its completion
      - Tapping a habit row opens the detail modal
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: My Habits
            trailing:
              kind: Button
              label: "+"
              action: add_habit
              testID: add_habit_btn
              variant: primary
          - kind: List
            bindsTo: /Habit
            itemTemplate:
              kind: ListItem
              label: Open Detail
              action: open_detail
              testID: habit_row
              children:
                - kind: Card
                  child:
                    kind: Row
                    gap: md
                    children:
                      - kind: Text
                        text: Habit Title
                        style: heading-2
                      - kind: Toggle
                        label: Done
                        action: toggle_done
                        testID: done_toggle
                        bindsTo: /Habit/done
      empty:
        kind: empty
        when:
          collection: /Habit/title
        tree:
          - kind: Text
            text: No habits yet -- tap + to add one
            style: body
      loading: null
      error: null

  - id: new_habit
    title: New Habit
    kind: regular
    back_behavior: pop
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: New Habit
          - kind: Column
            gap: md
            children:
              - kind: TextField
                label: Title
                action: on_title_change
                testID: title_field
                bindsTo: /Habit/title
                placeholder: Drink water
              - kind: Button
                label: Save
                action: save_habit
                testID: save_btn
                variant: primary
      empty: null
      loading:
        kind: loading
        when:
          async: /Habit/title
        tree:
          - kind: Text
            text: Saving...
            style: body
      error:
        kind: error
        when:
          field_error: /Habit/title
        tree:
          - kind: Text
            text: Title is required
            style: body

  - id: detail_modal
    title: Habit Detail
    kind: overlay
    back_behavior: dismiss
    variants:
      content:
        kind: content
        tree:
          - kind: Modal
            child:
              kind: Column
              gap: lg
              children:
                - kind: Text
                  text: Habit Detail
                  style: heading-1
                - kind: Divider
                - kind: Spacer
                  size: md
                - kind: Button
                  label: Close
                  action: close_modal
                  testID: close_modal_btn
      empty: null
      loading: null
      error: null

actions:
  add_habit:
    kind: navigate
    screen: new_habit
  open_detail:
    kind: present
    overlay: detail_modal
  toggle_done:
    kind: mutate
    target: /Habit/done
    op: toggle
  save_habit:
    kind: submit
    entity: Habit
  close_modal:
    kind: dismiss
  on_title_change:
    kind: mutate
    target: /Habit/title
    op: set

data:
  entities:
    - name: Habit
      fields:
        - name: title
          type: string
          required: true
        - name: done
          type: boolean
      relationships:
        - from: Habit
          to: Completion
          kind: has_many
    - name: Completion
      fields:
        - name: date
          type: date
          required: true
        - name: habit
          type: reference
          of: Habit

navigation:
  root: home
  edges:
    - from: home
      to: new_habit
      trigger: add_habit
      transition: push
    - from: home
      to: detail_modal
      trigger: open_detail
      transition: modal
    - from: new_habit
      to: home
      trigger: save_habit
      transition: replace

test_flows:
  - name: add_habit_flow
    steps:
      - screen: home
        action: add_habit
        platform: both
      - screen: home
        action: open_detail
        platform: both
      - screen: detail_modal
        action: close_modal
        platform: both
  - name: toggle_done_flow
    steps:
      - screen: home
        action: toggle_done
        platform: both
  - name: ios_permission_flow
    steps:
      - screen: home
        action: add_habit
        platform: ios
      - screen: home
        action: toggle_done
        platform: android
---

<!-- Phase 1 fixture: triple-form YAML; sigil parser lands in Phase 2 -->

# habit-tracker

A minimal habit-tracking app with add / toggle / detail flow.

<!-- Phase 2's Markdown body parser will render this section. -->
<!-- Phase 1 ignores the body entirely. -->
