---
schema: mobile-tui/1

screens:
  - id: main
    title: NavBar TabBar
    kind: regular
    variants:
      content:
        kind: content
        tree:
          - kind: Column
            gap: md
            children:
              - kind: NavBar
                title: Home
                trailing:
                  kind: Button
                  label: "+"
                  action: add
                  testID: add_btn
                  variant: text
              - kind: Column
                gap: md
                children:
                  - kind: Text
                    text: body content
                    style: body
              - kind: TabBar
                items:
                  - label: Home
                    action: go_home
                    testID: home_tab
                  - label: Stats
                    action: go_stats
                    testID: stats_tab
      empty: null
      loading: null
      error: null

actions:
  add:
    kind: custom
    name: add
  go_home:
    kind: custom
    name: go_home
  go_stats:
    kind: custom
    name: go_stats

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

<!-- Composite fixture 3 (WIREFRAME-03): NavBar + TabBar chrome shell. -->
<!-- Exercises D-37 NavBar `---` rule + TabBar bottom-anchored `---` rule. Source for composites/navbar-tabbar.wf.txt. -->
