---
schema: mobile-tui/1

screens:
  - id: home
    title: Malformed Home
    kind: regular
    variants:
      content:
        kind: content
        tree:
          - kind: Column
            children:
              - kind: Button
                label: First
                action: ghost_action
                testID: shared_id
              - kind: Card
                child:
                  kind: Button
                  label: Second (colliding)
                  action: dismiss_this
                  testID: shared_id
      empty: null
      loading: null
      error: null

  - id: broken_detail
    title: Missing back_behavior
    kind: regular
    variants:
      content:
        kind: content
        tree: []
      empty: null
      loading: null
      error: null

  - id: home
    title: Duplicate Home
    kind: regular
    back_behavior: pop
    variants:
      content:
        kind: content
        tree: []
      empty: null
      loading: null
      error: null

actions:
  dismiss_this:
    kind: dismiss
  go_nowhere:
    kind: navigate
    screen: ghost_screen
  submit_nothing:
    kind: submit
    entity: GhostEntity
  present_regular:
    kind: present
    overlay: home
  mutate_ghost:
    kind: mutate
    target: /GhostEntity/field
    op: set
    value: x

data:
  entities:
    - name: Habit
      fields:
        - name: title
          type: string
    - name: Habit
      fields:
        - name: count
          type: number

navigation:
  root: home
  edges:
    - from: home
      to: broken_detail
      trigger: dismiss_this
---

<!-- Phase 1 fixture: triple-form YAML; sigil parser lands in Phase 2 -->

# malformed

Deliberately-malformed fixture. Stage A passes; Stage B (cross-reference) emits
every SPEC_* cross-ref diagnostic code used by validateSpec().

Expected diagnostics (at least one occurrence each):
- SPEC_DUPLICATE_SCREEN_ID (id: home declared twice)
- SPEC_DUPLICATE_ENTITY_NAME (name: Habit declared twice)
- SPEC_UNRESOLVED_SCREEN (go_nowhere.screen, navigation root/edge checks)
- SPEC_UNRESOLVED_ACTION (ghost_action sigil, submit_nothing.entity, nav.edge.trigger)
- SPEC_JSONPTR_UNRESOLVED (mutate_ghost.target)
- SPEC_TESTID_COLLISION (nested shared_id)
- SPEC_MISSING_BACK_BEHAVIOR (broken_detail)
- SPEC_ACTION_TYPE_MISMATCH (present_regular.overlay = home, kind: regular)
