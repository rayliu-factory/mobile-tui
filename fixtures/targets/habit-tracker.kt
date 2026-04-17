// habit-tracker.kt
// Hand-translated from fixtures/habit-tracker.spec.md (schema: mobile-tui/1)
// Two-target fidelity gate artifact (Phase 1 success criterion #5).
//
// This file is INTENTIONALLY NOT compiled.
// Purpose: demonstrate that the 18-kind closed component catalog maps
// unambiguously to Jetpack Compose. Each spec component → exactly one composable.
//
// Mapping table:
//   Column           → Column
//   Row              → Row
//   Text             → Text(...)
//   Button           → Button(onClick=...) with Modifier.testTag
//   TextField        → TextField(value=, onValueChange=) with Modifier.testTag
//   List             → LazyColumn { items(...) }
//   ListItem         → Row/Column with Modifier.clickable (if tappable)
//   Card             → Card(modifier=)
//   Image            → Image(painter=...)
//   Icon             → Icon(imageVector=...)
//   Divider          → HorizontalDivider()
//   Toggle           → Switch(checked=, onCheckedChange=) with Modifier.testTag
//   SegmentedControl → SegmentedButton with SingleChoiceSegmentedButtonRow
//   TabBar           → BottomAppBar { NavigationBarItem(...) }
//   NavBar           → TopAppBar(title=, actions=)
//   Modal            → Dialog { ... }
//   Sheet            → ModalBottomSheet { ... }
//   Spacer           → Spacer(Modifier.height(...))

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

// Data model — habit-tracker.spec.md data.entities

data class Habit(
  val id: String,
  var title: String,   // field: title (string, required)
  var done: Boolean,   // field: done (boolean)
  // relationship: has_many Completion
)

data class Completion(
  val id: String,
  val date: String,    // field: date (date)
  val habitId: String, // field: habit (reference → Habit)
)

// Screen: home (variants: content, empty)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(onAddHabit: () -> Unit, onOpenDetail: () -> Unit) {
  val habits = remember { mutableStateListOf<Habit>() }

  Scaffold(
    topBar = {
      TopAppBar(
        title = { Text("My Habits") },
        actions = {
          // Button sigil (label: "+", action: add_habit, testID: add_habit_btn)
          TextButton(onClick = onAddHabit, modifier = Modifier.testTag("add_habit_btn")) {
            Text("+")
          }
        },
      )
    },
  ) { padding ->
    if (habits.isEmpty()) {
      // variants.empty — when: /Habit/title collection empty
      Box(Modifier.padding(padding)) {
        Text("No habits yet -- tap + to add one")
      }
    } else {
      // variants.content → List over /Habit
      LazyColumn(Modifier.padding(padding)) {
        items(habits) { habit ->
          // ListItem sigil (label: "Open Detail", action: open_detail, testID: habit_row)
          Card(
            modifier = Modifier
              .testTag("habit_row")
              .clickable(onClick = onOpenDetail),
          ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {  // Row gap: md
              Text("Habit Title", style = MaterialTheme.typography.titleMedium)  // heading-2
              // Toggle sigil (label: "Done", action: toggle_done, testID: done_toggle)
              Switch(
                checked = habit.done,
                onCheckedChange = { /* toggle_done */ },
                modifier = Modifier.testTag("done_toggle"),
              )
            }
          }
        }
      }
    }
  }
}

// Screen: new_habit (variants: content, loading, error; back_behavior: pop)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewHabitScreen(onSave: (String) -> Unit) {
  var title by remember { mutableStateOf("") }
  var isSaving by remember { mutableStateOf(false) }
  var errorMessage by remember { mutableStateOf<String?>(null) }

  Scaffold(
    topBar = { TopAppBar(title = { Text("New Habit") }) },
  ) { padding ->
    Box(Modifier.padding(padding)) {
      when {
        isSaving -> Text("Saving...")                       // variants.loading
        errorMessage != null -> Text("Title is required")   // variants.error
        else -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {  // gap: md
          // TextField sigil (label: "Title", action: on_title_change, testID: title_field)
          TextField(
            value = title,
            onValueChange = { title = it },
            placeholder = { Text("Drink water") },
            modifier = Modifier.testTag("title_field"),
          )
          // Button sigil (label: "Save", action: save_habit, testID: save_btn)
          Button(
            onClick = { isSaving = true; onSave(title) },
            modifier = Modifier.testTag("save_btn"),
          ) {
            Text("Save")
          }
        }
      }
    }
  }
}

// Screen: detail_modal (kind: overlay, back_behavior: dismiss)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetailModalScreen(onClose: () -> Unit) {
  // Modal → ModalBottomSheet in Compose (idiomatic overlay)
  ModalBottomSheet(onDismissRequest = onClose) {
    Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {  // gap: lg
      Text("Habit Detail", style = MaterialTheme.typography.headlineLarge)  // heading-1
      HorizontalDivider()
      Spacer(Modifier.height(12.dp))  // Spacer size: md
      // Button sigil (label: "Close", action: close_modal, testID: close_modal_btn)
      Button(onClick = onClose, modifier = Modifier.testTag("close_modal_btn")) {
        Text("Close")
      }
    }
  }
}
