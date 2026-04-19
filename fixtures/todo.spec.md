---
schema: mobile-tui/1

screens:
  - id: inbox
    title: Inbox
    kind: regular
    acceptance:
      - User sees a filtered list of tasks
      - User adds a new task via the text field
      - User removes a task from the list
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: Inbox
          - kind: Column
            gap: md
            children:
              - kind: TextField
                label: New task
                action: add_task
                testID: new_task_field
                bindsTo: /Task/title
                placeholder: What needs doing?
              - kind: SegmentedControl
                label: Filter
                action: filter_changed
                testID: filter_control
                bindsTo: /Task/status
                options:
                  - all
                  - active
                  - done
              - kind: List
                bindsTo: /Task/title
                itemTemplate:
                  kind: ListItem
                  label: Remove
                  action: remove_task
                  testID: task_row
                  children:
                    - kind: Text
                      text: Task Title
                      style: body
          - kind: TabBar
            items:
              - label: Inbox
                action: go_inbox
                testID: tab_inbox
              - label: Projects
                action: go_projects
                testID: tab_projects
              - label: Settings
                action: go_settings
                testID: tab_settings
      empty:
        kind: empty
        when:
          collection: /Task/title
        tree:
          - kind: Text
            text: No tasks. Add one above.
            style: body
      loading: null
      error: null

  - id: projects
    title: Projects
    kind: regular
    back_behavior: pop
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: Projects
            trailing:
              kind: Button
              label: Add
              action: push_task_to_project
              testID: add_project_btn
              variant: primary
          - kind: List
            bindsTo: /Project/name
            itemTemplate:
              kind: ListItem
              label: Open Project
              action: go_inbox
              testID: project_row
              children:
                - kind: Text
                  text: Project Name
                  style: body
          - kind: TabBar
            items:
              - label: Inbox
                action: go_inbox
                testID: tab_inbox_projects
              - label: Projects
                action: go_projects
                testID: tab_projects_projects
      empty: null
      loading: null
      error: null

  - id: settings
    title: Settings
    kind: regular
    back_behavior: pop
    variants:
      content:
        kind: content
        tree:
          - kind: NavBar
            title: Settings
          - kind: Column
            gap: md
            children:
              - kind: Toggle
                label: Notifications
                action: filter_changed
                testID: notifications_toggle
                bindsTo: /Task/status
              - kind: Button
                label: Export
                action: export_data
                testID: export_btn
                variant: secondary
              - kind: Button
                label: Done
                action: dismiss_settings
                testID: settings_done_btn
      empty: null
      loading: null
      error: null

actions:
  add_task:
    kind: submit
    entity: Task
  remove_task:
    kind: mutate
    target: /Task/title
    op: remove
  push_task_to_project:
    kind: mutate
    target: /Project/tasks
    op: push
  filter_changed:
    kind: mutate
    target: /Task/status
    op: set
    value: active
  go_inbox:
    kind: navigate
    screen: inbox
  go_projects:
    kind: navigate
    screen: projects
  go_settings:
    kind: navigate
    screen: settings
  export_data:
    kind: custom
    name: export_to_clipboard
    description: Copy all tasks to the clipboard as Markdown
  dismiss_settings:
    kind: dismiss

data:
  entities:
    - name: Task
      fields:
        - name: title
          type: string
          required: true
        - name: done
          type: boolean
        - name: status
          type: string
        - name: project
          type: reference
          of: Project
    - name: Project
      fields:
        - name: name
          type: string
          required: true
        - name: tasks
          type: string

navigation:
  root: inbox
  edges:
    - from: inbox
      to: projects
      trigger: go_projects
      transition: push
    - from: projects
      to: inbox
      trigger: go_inbox
      transition: push
    - from: inbox
      to: settings
      trigger: go_settings
      transition: push

test_flows:
  - name: add_todo_flow
    steps:
      - screen: inbox
        action: add_task
        platform: both
  - name: dismiss_settings_flow
    steps:
      - screen: inbox
        action: go_settings
        platform: both
      - screen: settings
        action: dismiss_settings
        platform: both
  - name: custom_action_flow
    steps:
      - screen: settings
        action: export_data
        platform: both
---

<!-- Phase 1 fixture: triple-form YAML; sigil parser lands in Phase 2 -->

# todo

A tabbed todo app with Inbox / Projects / Settings; covers TabBar, SegmentedControl,
TextField, custom-intent actions, and mutate push/remove.

<!-- Phase 2 body parser will pick up from here. -->
