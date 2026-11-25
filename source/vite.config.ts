// Builds the game as one self-contained file: ../panel/index.html (an Orca sandboxed-ui panel).
// Orca panels have no network, so all JS and CSS are inlined into the HTML.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = fileURLToPath(new URL(".", import.meta.url));

/** Inline the built JS and CSS into index.html. */
function inlineAll(): Plugin {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return {
    name: "orca:inline",
    apply: "build",
    enforce: "post",
    generateBundle(_opts, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith(".html"));
      if (!html || html.type !== "asset") return;
      let src = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        const script = new RegExp(`<script[^>]*src="[^"]*${esc(name)}"[^>]*></script>`);
        const link = new RegExp(`<link[^>]*href="[^"]*${esc(name)}"[^>]*>`);
        if (file.type === "chunk" && script.test(src)) {
          const code = file.code.replace(/<\/script/gi, "<\\/script");
          src = src.replace(script, () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (file.type === "asset" && name.endsWith(".css") && link.test(src)) {
          src = src.replace(link, () => `<style>${String(file.source)}</style>`);
          delete bundle[name];
        }
      }
      html.source = src;
    },
  };
}

export default defineConfig({
  base: "./",
  resolve: { alias: { "@": resolve(here, "src") } },
  plugins: [tailwindcss(), viteReact(), inlineAll()],
  build: {
    outDir: resolve(here, "../panel"),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
  },
});
