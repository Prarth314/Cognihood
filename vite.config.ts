/// <reference types="vitest/config" />
import path from 'path';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { validatePublicEnvironment } from './scripts/public-env.mjs';

export default defineConfig(({ mode }) => {
    validatePublicEnvironment({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
    return {
      test: { exclude: ['**/node_modules/**', '**/.git/**', 'tests/browser/**'] },
      define: {
        __COGNI_VISION_VERSION__: JSON.stringify(JSON.parse(readFileSync(path.resolve('node_modules/@mediapipe/tasks-vision/package.json'), 'utf8')).version),
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          input: mode === 'e2e' ? { app: path.resolve('index.html'), workerCheck: path.resolve('tests/browser/worker-harness.html') } : undefined,
          output: {
            manualChunks(id) {
              if (id.includes('@mediapipe/tasks-vision')) return 'mediapipe';
              if (id.includes('@supabase')) return 'supabase';
            },
          },
        },
      },
    };
});
