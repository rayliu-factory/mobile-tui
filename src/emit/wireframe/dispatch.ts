// src/emit/wireframe/dispatch.ts
// renderNode — exhaustive-switch dispatcher over all 18 component kinds.
// Adding a kind to COMPONENT_KINDS breaks compilation HERE until a case
// is added — the `never` fallback is the compile-time gate per
// Phase 1 D-01 + RESEARCH §Pattern 4.
import type { ComponentNode } from "../../model/component.ts";
import { renderButton } from "./components/button.ts";
import { renderCard } from "./components/card.ts";
import { renderColumn } from "./components/column.ts";
import { renderDivider } from "./components/divider.ts";
import { renderIcon } from "./components/icon.ts";
import { renderImage } from "./components/image.ts";
import { renderList } from "./components/list.ts";
import { renderListItem } from "./components/list-item.ts";
import { renderModal } from "./components/modal.ts";
import { renderNavBar } from "./components/nav-bar.ts";
import { renderRow } from "./components/row.ts";
import { renderSegmentedControl } from "./components/segmented-control.ts";
import { renderSheet } from "./components/sheet.ts";
import { renderSpacer } from "./components/spacer.ts";
import { renderTabBar } from "./components/tab-bar.ts";
import { renderText } from "./components/text.ts";
import { renderTextField } from "./components/text-field.ts";
import { renderToggle } from "./components/toggle.ts";

export function renderNode(node: ComponentNode, width: number): string[] {
  switch (node.kind) {
    case "Text":
      return renderText(node, width);
    case "Icon":
      return renderIcon(node, width);
    case "Divider":
      return renderDivider(node, width);
    case "Spacer":
      return renderSpacer(node, width);
    case "Image":
      return renderImage(node, width);
    case "Button":
      return renderButton(node, width);
    case "TextField":
      return renderTextField(node, width);
    case "Toggle":
      return renderToggle(node, width);
    case "SegmentedControl":
      return renderSegmentedControl(node, width);
    case "Column":
      return renderColumn(node, width);
    case "Row":
      return renderRow(node, width);
    case "Card":
      return renderCard(node, width);
    case "List":
      return renderList(node, width);
    case "ListItem":
      return renderListItem(node, width);
    case "NavBar":
      return renderNavBar(node, width);
    case "TabBar":
      return renderTabBar(node, width);
    case "Modal":
      return renderModal(node, width);
    case "Sheet":
      return renderSheet(node, width);
    default: {
      const _exhaustive: never = node;
      throw new Error(`unreachable: ${(_exhaustive as { kind: string }).kind}`);
    }
  }
}
