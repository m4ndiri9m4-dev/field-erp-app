import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // This line is the fix.
      // It tells Vite that '@' is an alias for the './src' directory.
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
