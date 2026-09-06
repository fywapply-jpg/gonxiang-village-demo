import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({ root: "admin", base: "./", plugins: [react()], server: { host: "0.0.0.0", port: 5180, allowedHosts: true, proxy: { "/api": "http://localhost:8787", "/health": "http://localhost:8787" } }, build: { outDir: resolve(rootDir, "dist-admin"), emptyOutDir: true } });
