import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const basePath = process.env.VITE_BASE_URL ?? (repoName ? `/${repoName}/` : '/');

export default defineConfig({
  base: basePath,
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  root: path.resolve(__dirname, 'client'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
    preserveSymlinks: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
    force: true,
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // Server config is handled by Express middleware mode
  // No server config needed here
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
  ssr: {
    noExternal: ['react', 'react-dom'],
  },
});

