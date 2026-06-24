import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    setupFiles: ['./setup.ts'],
    // frontend/ → happy-dom、backend/ → node (デフォルト)
    environmentMatchGlobs: [
      ['frontend/**', 'happy-dom'],
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        '../backend/src/routes/auth.ts',
        '../frontend/src/pages/RegisterPage.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../frontend/src'),
    },
    // TypeScript の .ts/.tsx ファイルを .js 拡張子でもインポートできるようにする
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // react / react-dom は test/node_modules の単一インスタンスに統一
    // （frontend/node_modules/react と test/node_modules/react の二重インスタンスを防ぐ）
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
});
