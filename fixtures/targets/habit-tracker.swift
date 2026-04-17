// habit-tracker.swift
// Hand-translated from fixtures/habit-tracker.spec.md (schema: mobile-tui/1)
// Two-target fidelity gate artifact (Phase 1 success criterion #5).
//
// This file is INTENTIONALLY NOT compiled — no Xcode project, no build step.
// Purpose: demonstrate that the 18-kind closed component catalog maps
// unambiguously to SwiftUI. Each spec component → exactly one native view.
//
// Mapping table (for reviewer reference):
//   Column           → VStack(spacing:)
//   Row              → HStack(spacing:)
//   Text             → Text(...)
//   Button           → Button(action:) { Text(...) } with .accessibilityIdentifier
//   TextField        → TextField(..., text:) with .accessibilityIdentifier
//   List             → List(...) / ForEach
//   ListItem         → HStack as row + .onTapGesture / Button (if tappable)
//   Card             → RoundedRectangle + .padding() wrapper
//   Image            → Image(systemName:) or Image(...)
//   Icon             → Image(systemName:)
//   Divider          → Divider()
//   Toggle           → Toggle(..., isOn:) with .accessibilityIdentifier
//   SegmentedControl → Picker(selection:) with .pickerStyle(.segmented)
//   TabBar           → TabView { ... .tabItem { ... } }
//   NavBar           → .navigationTitle(...) + .toolbar
//   Modal            → .sheet(isPresented:) { ... }
//   Sheet            → .sheet(isPresented:) { ... }
//   Spacer           → Spacer().frame(...)

import SwiftUI

// MARK: - Data model (from habit-tracker.spec.md data.entities)

struct Habit: Identifiable {
  let id: UUID = UUID()
  var title: String      // field: title (string, required)
  var done: Bool         // field: done (boolean)
  // relationship: has_many Completion
}

struct Completion: Identifiable {
  let id: UUID = UUID()
  var date: Date         // field: date (date, required)
  var habitId: UUID      // field: habit (reference → Habit)
}

// MARK: - Screen: home (variants: content, empty)

struct HomeScreen: View {
  @State private var habits: [Habit] = []
  @State private var showDetailModal: Bool = false

  var body: some View {
    NavigationStack {
      Group {
        if habits.isEmpty {
          // variants.empty — when: /Habit/title collection is empty
          Text("No habits yet -- tap + to add one")
        } else {
          // variants.content → List over /Habit
          List(habits) { habit in
            // ListItem sigil (label: "Open Detail", action: open_detail, testID: habit_row)
            Button(action: { showDetailModal = true }) {
              // Card wrapper
              VStack {
                HStack(spacing: 12) {            // Row gap: md
                  Text("Habit Title")             // Text style: heading-2
                    .font(.title2)
                  // Toggle sigil (label: "Done", action: toggle_done, testID: done_toggle)
                  Toggle(
                    "Done",
                    isOn: Binding(get: { habit.done }, set: { _ in /* toggle_done */ })
                  )
                  .accessibilityIdentifier("done_toggle")
                }
                .padding()
                .background(RoundedRectangle(cornerRadius: 8).stroke())
              }
            }
            .accessibilityIdentifier("habit_row")
          }
        }
      }
      .navigationTitle("My Habits")               // NavBar title
      .toolbar {
        // NavBar.trailing — Button sigil (label: "+", action: add_habit, testID: add_habit_btn)
        ToolbarItem(placement: .navigationBarTrailing) {
          NavigationLink(destination: NewHabitScreen()) {
            Text("+")
          }
          .accessibilityIdentifier("add_habit_btn")
        }
      }
      // present.overlay detail_modal → .sheet(isPresented:)
      .sheet(isPresented: $showDetailModal) {
        DetailModalScreen()
      }
    }
  }
}

// MARK: - Screen: new_habit (variants: content, loading, error; back_behavior: pop)

struct NewHabitScreen: View {
  @State private var title: String = ""
  @State private var isSaving: Bool = false
  @State private var errorMessage: String? = nil

  var body: some View {
    Group {
      if isSaving {
        Text("Saving...")                        // variants.loading (async /Habit/title)
      } else if errorMessage != nil {
        Text("Title is required")                // variants.error (field_error /Habit/title)
      } else {
        VStack(spacing: 12) {                     // Column gap: md
          // TextField sigil (label: "Title", action: on_title_change, testID: title_field)
          TextField("Drink water", text: $title)
            .accessibilityIdentifier("title_field")
          // Button sigil (label: "Save", action: save_habit, testID: save_btn)
          Button(action: { isSaving = true /* save_habit */ }) {
            Text("Save")
          }
          .accessibilityIdentifier("save_btn")
        }
        .padding()
      }
    }
    .navigationTitle("New Habit")
  }
}

// MARK: - Screen: detail_modal (kind: overlay, back_behavior: dismiss)

struct DetailModalScreen: View {
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    // Modal → outer sheet container in SwiftUI
    VStack(spacing: 20) {                         // Column gap: lg
      Text("Habit Detail")                        // Text style: heading-1
        .font(.largeTitle)
      Divider()                                    // Divider
      Spacer().frame(height: 12)                  // Spacer size: md
      // Button sigil (label: "Close", action: close_modal, testID: close_modal_btn)
      Button(action: { dismiss() }) {
        Text("Close")
      }
      .accessibilityIdentifier("close_modal_btn")
    }
    .padding()
  }
}
