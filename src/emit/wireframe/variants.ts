// src/emit/wireframe/variants.ts
// Top-level `render(spec, screenId, opts?): string` composition.
//
// GUARANTEES:
//   - render() returns a string deterministically.
//   - Throws ONLY on unknown screenId (CLI-caller error per Phase-1 01-06).
//   - Stage-B error diagnostics (opts.diagnostics) are passed through but
//     `[BROKEN LINK]` inline markers are v1-deferred (follow-up plan);
//     diagnostics currently ignored by the composer.
//   - No Date, no process.env, no fs, no Math.random (threat T-03-04).
//
// PIPELINE (numbered-step analog to src/serialize/parse.ts):
//   1. Locate screen in spec.screens by id; throw on miss.
//   2. Determine screenIsRoot = (screen.back_behavior === undefined).
//   3. Render 4 variant blocks: content → empty → loading → error (D-39).
//      Null variants render as 1-line (N/A) marker frames (D-39).
//      Block headers merge into top border (D-40).
//      `when` trigger in header only, empty/loading/error only (D-41).
//      NavBar root-trim: strip leading `< ` for root screens (D-37).
//   4. Append acceptance footer under content variant only (D-45).
//   5. Join blocks with blank lines; end with trailing newline.
//
// NavBar root-trim rationale (D-37): per Plan 03-07 the NavBar emitter
// unconditionally emits `< Title`. The trim is centralized HERE so the
// per-kind emitter signature stays pure `(node, width) => string[]`.
// Implementation: post-process the content variant's padded body rows;
// strip the first line matching `| < ` → `|   ` and re-pad to width.
//
// buildNullMarker rationale: `buildVariantHeader` is shaped for the
// optional `when` slot; piggybacking `(N/A)` on top of that API would
// read as "(N/A) is a when-expression", which it isn't. A dedicated
// helper keeps the two concerns legible at the call-site.
import type { ComponentNode } from "../../model/component.ts";
import type { Screen, Spec } from "../../model/index.ts";
import type { Diagnostic } from "../../primitives/diagnostic.ts";
import { renderNode } from "./dispatch.ts";
import { buildVariantHeader, PHONE_WIDTH, padRight, type VariantKind } from "./layout.ts";
import { truncate } from "./overflow.ts";

export interface RenderOptions {
  diagnostics?: Diagnostic[];
}

export function render(spec: Spec, screenId: string, opts?: RenderOptions): string {
  // diagnostics pass-through reserved for [BROKEN LINK] marker (v1 deferred).
  void opts;

  // Step 1 — locate screen.
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) {
    throw new Error(`render: screen "${screenId}" not in spec.screens`);
  }

  const width = PHONE_WIDTH;
  // Step 2 — root determination (D-37).
  const screenIsRoot = screen.back_behavior === undefined;

  // Step 3 — render 4 variant blocks in fixed order (D-39).
  const blocks: string[] = [];
  blocks.push(renderVariantBlock(screen, "content", screen.variants.content, screenIsRoot, width));
  blocks.push(renderVariantBlock(screen, "empty", screen.variants.empty, screenIsRoot, width));
  blocks.push(renderVariantBlock(screen, "loading", screen.variants.loading, screenIsRoot, width));
  blocks.push(renderVariantBlock(screen, "error", screen.variants.error, screenIsRoot, width));

  // Step 4 — acceptance under content (D-45).
  if (screen.acceptance && screen.acceptance.length > 0) {
    const contentBlock = blocks[0];
    if (contentBlock !== undefined) {
      blocks[0] = `${contentBlock}\n\n${renderAcceptance(screen.acceptance, width)}`;
    }
  }

  // Step 5 — join with blank lines + trailing newline.
  return `${blocks.join("\n\n")}\n`;
}

export function renderAllVariants(spec: Spec, screenId: string, opts?: RenderOptions): string {
  return render(spec, screenId, opts);
}

// renderSingleVariant: renders ONE variant block for ONE screen.
// Used by scripts/render-wireframe.ts (3-arg form) + Phase 3 Plan 03-09's
// 20-file corpus generation (one .wf.txt per screen-variant, per D-47).
//
// Behavior notes:
//   - Locates screen by id; throws on miss (same contract as render()).
//   - Renders ONLY the named variant block via the shared
//     renderVariantBlock() helper — null variants still produce the 1-line
//     (N/A) marker (D-39), identical to how render() treats them.
//   - For `content`, appends the acceptance footer (D-45); other variants
//     never render acceptance (no duplication).
//   - Returns the block string with a trailing newline (same shape as
//     render(), so CLI stdout behavior is uniform).
export function renderSingleVariant(
  spec: Spec,
  screenId: string,
  variantKind: VariantKind,
  opts?: RenderOptions,
): string {
  void opts;
  const screen = spec.screens.find((s) => s.id === screenId);
  if (!screen) {
    throw new Error(`renderSingleVariant: screen "${screenId}" not in spec.screens`);
  }
  const width = PHONE_WIDTH;
  const screenIsRoot = screen.back_behavior === undefined;
  const variantValue = screen.variants[variantKind];
  let block = renderVariantBlock(screen, variantKind, variantValue, screenIsRoot, width);

  if (variantKind === "content" && screen.acceptance && screen.acceptance.length > 0) {
    block = `${block}\n\n${renderAcceptance(screen.acceptance, width)}`;
  }

  return `${block}\n`;
}

type VariantRecord = Screen["variants"];
type VariantValue = VariantRecord[VariantKind];

function renderVariantBlock(
  screen: Screen,
  kind: VariantKind,
  variant: VariantValue,
  screenIsRoot: boolean,
  width: number,
): string {
  if (variant === null) {
    return buildNullMarker(screen.id, kind, width);
  }

  const whenExpr = extractWhenExpr(kind, variant);
  const header = buildVariantHeader(screen.id, kind, whenExpr, width);
  const tree = variant.tree as ComponentNode[];

  // Render tree at inner width (width-4 for `| ` + ` |`).
  const innerWidth = width - 4;
  const bodyLines: string[] = [];
  for (const child of tree) {
    for (const line of renderNode(child, innerWidth)) {
      bodyLines.push(line);
    }
  }
  let paddedBody = bodyLines.map((l) => `| ${padRight(l, innerWidth)} |`);

  // NavBar root-trim (D-37): strip leading `< ` from first matching line when
  // screenIsRoot AND rendering the content variant. The NavBar emitter is
  // unconditional about `< `; trim is centralized here to keep per-kind
  // emitters pure. The 2 `< ` chars are REPLACED with 2 spaces (not dropped
  // then right-padded) so column alignment — including the closing `|` at
  // the right border — is preserved. Rectangular contract stays intact.
  if (screenIsRoot && kind === "content") {
    let trimmed = false;
    paddedBody = paddedBody.map((line) => {
      if (!trimmed && line.startsWith("| < ")) {
        trimmed = true;
        return `|   ${line.slice(4)}`;
      }
      return line;
    });
  }

  const bottom = `+${"-".repeat(width - 2)}+`;
  return [header, ...paddedBody, bottom].join("\n");
}

function extractWhenExpr(
  kind: VariantKind,
  variant: NonNullable<VariantValue>,
): string | undefined {
  if (kind === "content") return undefined;
  // Variant union discriminated by kind. Narrow via explicit property checks.
  if (kind === "empty" && "when" in variant && "collection" in variant.when) {
    return `collection ${variant.when.collection}`;
  }
  if (kind === "loading" && "when" in variant && "async" in variant.when) {
    return `async ${variant.when.async}`;
  }
  if (kind === "error" && "when" in variant && "field_error" in variant.when) {
    return `field_error ${variant.when.field_error}`;
  }
  return undefined;
}

function buildNullMarker(screenId: string, kind: VariantKind, width: number): string {
  const content = ` screen: ${screenId}  variant: ${kind}  (N/A) `;

  // Stage 1: full `+-- <content> --+`.
  const fullFixedLen = "+--".length + content.length + "--+".length;
  if (fullFixedLen <= width) {
    const padLen = width - fullFixedLen;
    return `+--${content}${"-".repeat(padLen)}--+`;
  }
  // Stage 2: single-dash close.
  const singleFixedLen = "+--".length + content.length + "-+".length;
  if (singleFixedLen <= width) {
    const padLen = width - singleFixedLen;
    return `+--${content}${"-".repeat(padLen)}-+`;
  }
  // Stage 3: truncate inner; preserve `+-- ` + ` --+` frame.
  const avail = width - "+--  --+".length;
  const truncated = truncate(content.trim(), Math.max(0, avail));
  return `+-- ${padRight(truncated, avail)} --+`;
}

function renderAcceptance(lines: string[], width: number): string {
  const out: string[] = ["acceptance:"];
  for (const line of lines) {
    for (const wrapped of wrapBullet(line, width)) {
      out.push(wrapped);
    }
  }
  // Pad each row to width for rectangular contract with the frames above/below.
  return out.map((l) => padRight(l, width)).join("\n");
}

function wrapBullet(line: string, width: number): string[] {
  const bulletPrefix = "- ";
  const continuation = "  ";
  const words = line.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [bulletPrefix];
  const out: string[] = [];
  let current = bulletPrefix;
  for (const word of words) {
    const separator = current === bulletPrefix || current === continuation ? "" : " ";
    const candidate = current + separator + word;
    if (candidate.length > width && current !== bulletPrefix && current !== continuation) {
      out.push(current);
      current = continuation + word;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}
