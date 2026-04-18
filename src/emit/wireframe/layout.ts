// src/emit/wireframe/layout.ts
// Fixed-60-col frame composer, border drawing, content padding.
//
// Scope (pure functions — no IO, no clock, no process.env):
//   - PHONE_WIDTH = 60 (D-38)
//   - buildVariantHeader — merges block header into top border (D-40, D-41)
//     with 3-stage overflow cascade per RESEARCH Pitfall 5.
//   - padRight — right-pads with spaces, truncates if overlong.
//   - drawFrame — wraps body lines in `| ... |` content rows with
//     `+---+` top/bottom borders; ensures every output line has
//     length === width (rectangular contract per RESEARCH Pitfall 7).
//
// Width arithmetic (RESEARCH Pitfall 4): outer frame consumes 2 cols
// for the `|` borders + 2 cols inner padding → children see width - 4.
//
// THREAT T-03-04 (snapshot drift): deterministic output; no Date, no
// process.env, no Math.random anywhere in this module.
import { truncate } from "./overflow.ts";

export const PHONE_WIDTH = 60;
export type VariantKind = "content" | "empty" | "loading" | "error";

export function padRight(str: string, width: number): string {
  if (str.length === width) return str;
  if (str.length < width) return str + " ".repeat(width - str.length);
  return truncate(str, width);
}

export function drawFrame(bodyLines: string[], width: number): string[] {
  const border = `+${"-".repeat(Math.max(0, width - 2))}+`;
  if (bodyLines.length === 0) return [border, border];
  const bodyRows: string[] = [];
  for (const line of bodyLines) {
    // Outer frame: 2 cols `|` + 2 cols inner pad → child region = width - 4.
    const inner = padRight(line, width - 4);
    bodyRows.push(`| ${inner} |`);
  }
  return [border, ...bodyRows, border];
}

export function buildVariantHeader(
  screenId: string,
  kind: VariantKind,
  whenExpr: string | undefined,
  width: number,
): string {
  const whenPart = whenExpr ? `  when ${whenExpr}` : "";
  const content = ` screen: ${screenId}  variant: ${kind}${whenPart} `;

  // Stage 1: try full `+-- <content> --+` shape.
  const fullFixedLen = "+--".length + content.length + "--+".length;
  if (fullFixedLen <= width) {
    const padLen = width - fullFixedLen;
    return `+--${content}${"-".repeat(padLen)}--+`;
  }

  // Stage 2: try single-dash close `+-- <content> -+`.
  const singleFixedLen = "+--".length + content.length + "-+".length;
  if (singleFixedLen <= width) {
    const padLen = width - singleFixedLen;
    return `+--${content}${"-".repeat(padLen)}-+`;
  }

  // Stage 3: truncate content; preserve `screen:` + `variant:` metadata.
  // Frame overhead = `+-- ` (4) + ` --+` (4) = 8 chars.
  const avail = width - "+--  --+".length;
  const truncatedInner = truncate(content.trim(), avail);
  return `+-- ${padRight(truncatedInner, avail)} --+`;
}
