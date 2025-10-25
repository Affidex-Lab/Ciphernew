import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { promises as fs } from 'fs';

function copyStatic(outDirPath: string){
  return {
    name: 'copy-static-ext',
    apply: 'build' as const,
    async writeBundle(){
      const root = process.cwd();
      const srcManifest = resolve(root, 'extension/manifest.json');
      const dstManifest = resolve(outDirPath, 'manifest.json');
      const manifest = await fs.readFile(srcManifest);
      await fs.mkdir(resolve(outDirPath, 'assets'), { recursive: true });
      await fs.writeFile(dstManifest, manifest);
      async function copyDir(src: string, dst: string){
        await fs.mkdir(dst, { recursive: true });
        const entries = await fs.readdir(src, { withFileTypes: true });
        for (const e of entries){
          const s = resolve(src, e.name);
          const d = resolve(dst, e.name);
          if (e.isDirectory()) await copyDir(s, d); else await fs.copyFile(s, d);
        }
      }
      await copyDir(resolve(root, 'extension/assets'), resolve(outDirPath, 'assets'));
    }
  }
}

const OUT_DIR = resolve(__dirname, 'extension/dist');

export default defineConfig({
  plugins: [react(), copyStatic(OUT_DIR)],
  root: resolve(__dirname, 'extension'),
  build: {
    outDir: OUT_DIR,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'src/background/index': resolve(__dirname, 'extension/src/background/index.ts'),
        'src/content/index': resolve(__dirname, 'extension/src/content/index.ts'),
        'src/inject/ethereum': resolve(__dirname, 'extension/src/inject/ethereum.ts'),
        'src/inject/near': resolve(__dirname, 'extension/src/inject/near.ts'),
        'src/popup/index': resolve(__dirname, 'extension/src/popup/index.html'),
        'src/options/index': resolve(__dirname, 'extension/src/options/index.html'),
        'src/dashboard/index': resolve(__dirname, 'extension/src/dashboard/index.html'),
      },
      output: {
        entryFileNames: (chunk) => `${chunk.name}.js`,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return `assets/[name][extname]`;
          return `assets/[name]-[hash][extname]`;
        },
      }
    },
    target: 'es2022',
    sourcemap: false,
  }
});
