// src/emit/wireframe/text-style.ts
// Text.style → ASCII mapping per D-43.
//
// Scope:
//   - TextStyle union: "heading-1" | "heading-2" | "body" | "caption"
//   - applyTextStyle(text, style?): string
//       heading-1 → text.toUpperCase()     (ALL CAPS — D-43 density over typography)
//       heading-2 → text                    (identity — respect author capitalization)
//       body      → text                    (identity)
//       caption   → `(${text})`             (parens as soft-italics proxy)
//       undefined → text                    (default === body per component.ts schema)
//
// Rationale for identity on heading-2: D-43 says "respect author
// capitalization if already mixed." A forced Title-Case transform would
// mangle acronyms (e.g., "API reference" → "Api Reference") and defeat
// author intent. Density-driven choice: heading-1 compresses emphasis
// to 0 extra lines via CAPS; heading-2 leaves it to the author.
//
// THREAT T-03-04 (snapshot drift): pure function; no Date, no random.

export type TextStyle = "heading-1" | "heading-2" | "body" | "caption";

export function applyTextStyle(text: string, style?: TextStyle): string {
  switch (style) {
    case "heading-1":
      return text.toUpperCase();
    case "caption":
      return `(${text})`;
    case "heading-2":
    case "body":
    case undefined:
      return text;
  }
}
