import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { validatePublicEnvironment } from './scripts/public-env.mjs';

export default defineConfig(({ mode }) => {
    validatePublicEnvironment({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
    return {
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
