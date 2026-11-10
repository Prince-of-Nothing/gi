import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";

const rootDir = __dirname;
const htmlFiles = fs.readdirSync(rootDir).filter((file) => file.endsWith(".html"));
const input = Object.fromEntries(
  htmlFiles.map((file) => [file.replace(/\.html$/i, ""), resolve(rootDir, file)])
);

function copyClassicScripts() {
  const classicSrcs = new Set();
  const re = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  for (const file of htmlFiles) {
    const html = fs.readFileSync(resolve(rootDir, file), "utf8");
    let m;
    while ((m = re.exec(html))) {
      const tag = m[0];
      const src = m[1];
      if (/type=["']module["']/i.test(tag)) continue;
      if (/^(https?:)?\/\//i.test(src)) continue;
      if (src.startsWith("/")) classicSrcs.add(src.slice(1));
      else classicSrcs.add(src);
    }
  }
  return {
    name: "copy-classic-scripts",
    apply: "build",
    closeBundle() {
      for (const src of classicSrcs) {
        const from = resolve(rootDir, src);
        const to = resolve(rootDir, "dist", src);
        if (!fs.existsSync(from)) {
          console.warn(`[copy-classic-scripts] missing: ${src}`);
          continue;
        }
        fs.mkdirSync(resolve(rootDir, "dist", src, ".."), { recursive: true });
        fs.copyFileSync(from, to);
      }
      console.log(`[copy-classic-scripts] copied ${classicSrcs.size} classic script(s)`);
    }
  };
}

export default defineConfig({
  base: "/",
  publicDir: "public",
  plugins: [react(), copyClassicScripts()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input,
      output: {
        entryFileNames: "assets/js/[name]-[hash].js",
        chunkFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "";
          if (/\.(css)$/i.test(name)) return "assets/css/[name]-[hash][extname]";
          if (/\.(woff2?|ttf|otf|eot)$/i.test(name)) return "assets/fonts/[name]-[hash][extname]";
          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/i.test(name)) return "assets/img/[name]-[hash][extname]";
          return "assets/[name]-[hash][extname]";
        }
      }
    }
  }
});