// src/extension.ts
// pi.dev extension entry point for mobile-tui.
// Registers /spec command, wires session lifecycle, injects withFileMutationQueue.
//
// ARCHITECTURE:
//   - This file is the ONLY file that imports from @mariozechner/pi-coding-agent at runtime.
//   - pi coupling is contained here; all other modules are headless-testable.
//   - ctx.ui.custom ALWAYS uses factory form: (tui, theme, _kb, done) => Component.
//   - done() is called AFTER flush and writeSession complete (never before).
//   - session_start is NOT registered: UI opened only via explicit /spec invocation.
//
// THREATS:
//   T-09-03-01 (done-before-flush): onQuit sequence enforces flush → writeSession → done order.
//   T-09-03-02 (stale component reuse): graduation loop always creates fresh WizardRoot/RootCanvas.
//   T-09-03-03 (@mariozechner/pi-* bundled in dist/): tsup external list (Plan 01) prevents this.
//   T-09-03-04 (UI on session_start): session_start handler is NOT registered.
//   T-09-03-05 (raw stdout writes): no process.stdout.write calls; all output via ctx.ui.custom.
//
// RELATED: src/session.ts, src/canvas/root.ts, src/wizard/root.ts, src/editor/store.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { withFileMutationQueue } from "@mariozechner/pi-coding-agent";
import { stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { RootCanvas } from "./canvas/root.ts";
import { createAutosave } from "./editor/autosave.ts";
import { createStore } from "./editor/store.ts";
import { parseSpecFile } from "./serialize/index.ts";
import { writeSpecFile } from "./serialize/write.ts";
import { readSession, writeSession, ensureGitignore } from "./session.ts";
import { WizardRoot } from "./wizard/root.ts";

export default function (pi: ExtensionAPI) {
  // session_shutdown: onQuit chain handles the normal path (flush + writeSession + done).
  // session_shutdown fires for abnormal exits (SIGTERM, SIGHUP) after the UI is closed.
  // No additional action needed here for v1 — autosave.beforeExit is the safety net.
  pi.on("session_shutdown", async (_event, _ctx) => {
    // Intentionally empty: normal quit path handled in onQuit; emergency handled by autosave.beforeExit.
  });

  pi.registerCommand("spec", {
    description: "Open mobile-tui wizard or canvas for this project",
    handler: async (_args, ctx) => {
      // Guard: requires interactive mode for full-screen TUI.
      if (!ctx.hasUI) {
        ctx.ui.notify("mobile-tui requires interactive mode — run pi interactively", "error");
        return;
      }

      // Ensure .planning/.mobile-tui/ is gitignored (D-306). Idempotent.
      await ensureGitignore(ctx.cwd);

      // Determine spec path and starting mode.
      const defaultSpecPath = join(ctx.cwd, "SPEC.md");
      let absSpecPath = defaultSpecPath;
      let startMode: "wizard" | "canvas" = "wizard";

      const session = await readSession(ctx.cwd);
      if (session) {
        // Session rehydration: use stored specPath (already validated against cwd in readSession).
        absSpecPath = resolve(ctx.cwd, session.specPath);
        startMode = session.mode;
      } else {
        // No session: check if SPEC.md exists to decide wizard vs canvas.
        try {
          await stat(defaultSpecPath);
          startMode = "canvas";
        } catch {
          startMode = "wizard";
        }
      }

      // Load the spec file.
      // On ENOENT in wizard mode, write a seed file first then re-parse.
      // On ENOENT in canvas mode or any other error, notify the user.
      let parseResult: Awaited<ReturnType<typeof parseSpecFile>> | null = null;
      try {
        parseResult = await parseSpecFile(absSpecPath);
      } catch (err) {
        if (
          err instanceof Error &&
          (err as NodeJS.ErrnoException).code === "ENOENT" &&
          startMode === "wizard"
        ) {
          // New project: write minimal seed SPEC.md, then re-parse.
          const seedContent =
            "---\nschema: mobile-tui/1\n\nscreens:\n  - id: placeholder\n    title: TODO\n    kind: regular\n    variants:\n      content:\n        kind: content\n        tree: []\n      empty: null\n      loading: null\n      error: null\n\nactions: {}\n\ndata:\n  entities: []\n\nnavigation:\n  root: placeholder\n  edges: []\n---\n";
          await writeFile(absSpecPath, seedContent, "utf8");
          parseResult = await parseSpecFile(absSpecPath);
        } else {
          ctx.ui.notify(
            `Cannot open spec at ${absSpecPath}. Create a SPEC.md file in your project root first.`,
            "error",
          );
          return;
        }
      }

      if (!parseResult.spec || !parseResult.astHandle) {
        ctx.ui.notify(
          `Spec file at ${absSpecPath} could not be parsed. Check for YAML errors.`,
          "error",
        );
        return;
      }

      const store = createStore({
        spec: parseResult.spec,
        astHandle: parseResult.astHandle,
        filePath: absSpecPath,
      });

      // Inject withFileMutationQueue into autosave (D-307/D-308).
      // This is the autosave write site that needs queue coordination.
      // The store's flush() also uses queueWrap (Task 2), providing defense-in-depth.
      const autosave = createAutosave(store, absSpecPath, 500, {
        write: (path, spec, ast) =>
          withFileMutationQueue(path, () => writeSpecFile(path, spec, ast)),
      });

      // Wizard-or-canvas routing loop.
      // Re-calls ctx.ui.custom with a FRESH component instance on graduation (T-09-03-02).
      let mode = startMode;
      while (true) {
        if (mode === "wizard") {
          const graduated = await ctx.ui.custom<boolean>((tui, theme, _kb, done) => {
            // theme is pi's Theme; cast to MinimalTheme (structurally compatible at runtime).
            const root = new WizardRoot(store, { tui, theme: theme as { fg: (token: string, str: string) => string } });
            root.onGraduate = async () => {
              // Graduate: flush → persist canvas session with live step → open canvas.
              // T-09-03-01: done() called AFTER flush and writeSession complete.
              const liveStep = root.getStepCursor();
              await autosave.flush();
              await writeSession(ctx.cwd, {
                specPath: "./SPEC.md",
                mode: "canvas",
                wizardStep: liveStep,
                focusedScreenIndex: session?.focusedScreenIndex ?? 0,
                focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
              });
              done(true);
            };
            root.onQuit = async () => {
              // Shutdown sequence (T-09-03-01): flush → write session → done.
              // Use live stepCursor — not stale session value.
              await autosave.flush();
              await writeSession(ctx.cwd, {
                specPath: "./SPEC.md",
                mode: "wizard",
                wizardStep: root.getStepCursor(),
                focusedScreenIndex: session?.focusedScreenIndex ?? 0,
                focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
              });
              done(false);
            };
            return root;
          });
          if (graduated) {
            mode = "canvas";
            continue;
          }
          break;
        } else {
          await ctx.ui.custom<void>((tui, theme, _kb, done) => {
            // theme is pi's Theme; cast to CanvasTheme (structurally compatible at runtime).
            const root = new RootCanvas(store, { tui, theme: theme as { fg: (token: string, str: string) => string } });
            root.onQuit = async () => {
              // Shutdown sequence (T-09-03-01): flush → write session → done.
              await autosave.flush();
              await writeSession(ctx.cwd, {
                specPath: "./SPEC.md",
                mode: "canvas",
                wizardStep: session?.wizardStep ?? 0,
                focusedScreenIndex: session?.focusedScreenIndex ?? 0,
                focusedPane: (session?.focusedPane ?? "screens") as "screens" | "inspector" | "preview",
              });
              done(undefined);
            };
            return root;
          });
          break;
        }
      }

      // Clean up: remove beforeExit handler, unsubscribe from store.
      autosave.dispose();
    },
  });
}
