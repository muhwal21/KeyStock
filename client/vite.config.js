import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const clientRoot = path.dirname(fileURLToPath(import.meta.url));
const buildVersion = new Date().toISOString();

export default defineConfig({
  define: { __APP_BUILD_VERSION__: JSON.stringify(buildVersion) },
  plugins: [vue(), {
    name: 'write-build-version',
    apply: 'build',
    closeBundle() {
      writeFileSync(path.join(clientRoot, 'dist', 'version.json'), JSON.stringify({ version: buildVersion }));
    },
  }],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
