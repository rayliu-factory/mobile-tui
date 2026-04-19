import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/extension.ts", "src/index.ts"],
  format: ["esm"],
  dts: true,
  external: [
    "@mariozechner/pi-coding-agent",
    "@mariozechner/pi-tui",
    "@mariozechner/pi-ai",
  ],
  outDir: "dist",
  clean: true,
});
