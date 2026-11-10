import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  publicDir: "public",
  plugins: [react()],
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
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