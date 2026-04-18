// src/emit/wireframe/layout.ts
// Fixed-60-col frame composer + border drawing + content padding.
// Width arithmetic documented per RESEARCH Pitfall 4 in Plan 03-02.
//
// Scope:
//   - PHONE_WIDTH: the fixed outer width (D-38 = 60)
//   - buildVariantHeader(screenId, kind, whenExpr, width) — merges block
//     header into top border (D-40); two-stage overflow (try --+, then -+,
//     then truncate) per RESEARCH Pitfall 5.
//   - padRight(str, width): string — right-pads with spaces, truncates
//     via overflow.ts if overlong.
//   - drawFrame(bodyLines, width): string[] — wraps body in `| ... |`
//     content rows + top/bottom `+--+` borders.
//
// Implementation lands in Plan 03-02.

export const PHONE_WIDTH = 60;
export type VariantKind = "content" | "empty" | "loading" | "error";

export function buildVariantHeader(
  screenId: string,
  kind: VariantKind,
  whenExpr: string | undefined,
  width: number,
): string {
  void screenId;
  void kind;
  void whenExpr;
  void width;
  throw new Error("NYI: Plan 03-02 buildVariantHeader");
}

export function padRight(str: string, width: number): string {
  void str;
  void width;
  throw new Error("NYI: Plan 03-02 padRight");
}

export function drawFrame(bodyLines: string[], width: number): string[] {
  void bodyLines;
  void width;
  throw new Error("NYI: Plan 03-02 drawFrame");
}
