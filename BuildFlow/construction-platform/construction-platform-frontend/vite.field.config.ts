import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The field (phone) app: its own page, served by the backend under /field/.
//   npx vite build --config vite.field.config.ts
export default defineConfig({
  base: '/field/',
  publicDir: 'public-field',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: 'dist-field', emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, 'field.html') } },
});
