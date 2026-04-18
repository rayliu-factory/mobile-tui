// src/emit/wireframe/text-style.ts
// Text.style → ASCII mapping per D-43.
//   heading-1 → ALL CAPS
//   heading-2 → Title Case (respect author capitalization if mixed)
//   body → plain
//   caption → wrapped in ( )
// Implementation lands in Plan 03-03.

export type TextStyle = "heading-1" | "heading-2" | "body" | "caption";

export function applyTextStyle(text: string, style?: TextStyle): string {
  void text;
  void style;
  throw new Error("NYI: Plan 03-03 applyTextStyle");
}
