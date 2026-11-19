// Builds dist/index.html: the whole app as one self-contained page for Claude hosting.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

const root = path.dirname(new URL(import.meta.url).pathname);
const res = await build({
  entryPoints: [path.join(root, "artifact/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  alias: { "@": root },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
  logOverride: { "unsupported-directive": "silent" },
});
const js = res.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = readFileSync(path.join(root, "app/globals.css"), "utf8");
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#fbf3ea" />
<title>Table for Two</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
mkdirSync(path.join(root, "dist"), { recursive: true });
writeFileSync(path.join(root, "dist/index.html"), html);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + " KB");
