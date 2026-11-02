/// <reference types="vitest/config" />
import path from 'path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { validatePublicEnvironment } from './scripts/public-env.mjs';

function sourceCommit(): string {
  const hosted = process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
  if (hosted && /^[a-f0-9]{40}$/i.test(hosted)) return hosted;
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'unavailable'; } // Source archives/CLI uploads may not contain .git.
}

export default defineConfig(({ mode }) => {
    validatePublicEnvironment({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
    return {
      test: { exclude: ['**/node_modules/**', '**/.git/**', 'tests/browser/**'] },
      define: {
        __COGNI_COMMIT__: JSON.stringify(sourceCommit()),
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
          input: mode === 'e2e' ? { app: path.resolve('index.html'), workerCheck: path.resolve('tests/browser/worker-harness.html'), cameraCheck: path.resolve('tests/browser/camera-harness.html') } : undefined,
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
