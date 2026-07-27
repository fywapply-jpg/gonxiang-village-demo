import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  // This mobile demo is self-contained; avoid bundling unrelated workspace assets.
  publicDir: false,
  build: {
    // singlefile 需要关闭 cssCodeSplit
    cssCodeSplit: false,
  },
});
