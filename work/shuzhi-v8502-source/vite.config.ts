import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

const platformArgIndex = process.argv.findIndex((arg) => arg === "-p" || arg === "--platform");
const platformFromArg = platformArgIndex >= 0 ? process.argv[platformArgIndex + 1] : process.argv.find((arg) => arg.startsWith("--platform="))?.split("=", 2)[1];
const currentPlatform = process.env.UNI_PLATFORM || platformFromArg || "h5";
const isH5Build = currentPlatform === "h5";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  // 单文件手机演示需要把路由异步块收进同一个入口，避免 file:// 或
  // 手机文件查看器尝试请求不存在的 pages-*.js/css 资源。
  build: {
    rollupOptions: { output: isH5Build ? { inlineDynamicImports: true } : {} },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    proxy: { "/api": "http://localhost:8787", "/health": "http://localhost:8787" },
  },
});
