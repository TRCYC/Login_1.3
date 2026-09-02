import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const screensDirectory = resolve(projectRoot, 'src/screens');
const screenEntries = {};

if (existsSync(screensDirectory)) {
  for (const entry of readdirSync(screensDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const screenEntry = resolve(screensDirectory, entry.name, 'index.jsx');

      if (existsSync(screenEntry)) {
        screenEntries[entry.name] = screenEntry;
      }
    }
  }
}

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        ...screenEntries,
        main: resolve(projectRoot, 'index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => (
          screenEntries[chunkInfo.name]
            ? `assets/${chunkInfo.name}/index.[hash].js`
            : 'assets/main.[hash].js'
        ),
        chunkFileNames: (chunkInfo) => {
          const screenName = Object.keys(screenEntries).find((name) =>
            chunkInfo.name.startsWith(`${name}-`),
          );

          return screenName
            ? `assets/${screenName}/chunk.[hash].js`
            : 'assets/shared/[name].[hash].js';
        },
        assetFileNames: (assetInfo) => (
          assetInfo.name?.endsWith('.css')
            ? 'assets/shared/style.[hash][extname]'
            : 'assets/shared/[name].[hash][extname]'
        ),
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/node_modules/react/')
            || id.includes('/node_modules/react-dom/')
            || id.includes('/node_modules/scheduler/')
          ) {
            return 'react-vendor';
          }

          return 'vendor';
        },
      },
    },
  },
});
