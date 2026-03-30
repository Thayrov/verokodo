// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

// https://astro.build/config
export default defineConfig({
  vite: {
    envDir: fileURLToPath(new URL('../..', import.meta.url))
  }
});
