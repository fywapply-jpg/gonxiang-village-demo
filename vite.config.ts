import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace 'gonxiang-village-demo' with your actual GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/gonxiang-village-demo/',
});
