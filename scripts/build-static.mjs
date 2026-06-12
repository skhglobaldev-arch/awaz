import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

await mkdir('dist/assets', { recursive: true });

const lucideShimPath = fileURLToPath(new URL('../src/lucide-react-shim.ts', import.meta.url));

await esbuild.build({
  entryPoints: ['index.tsx'],
  outfile: 'dist/assets/app.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  sourcemap: false,
  jsx: 'automatic',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
    '.json': 'json',
  },
  define: {
    'process.env': JSON.stringify({}),
  },
  plugins: [
    {
      name: 'lucide-react-shim',
      setup(build) {
        build.onResolve({ filter: /^lucide-react$/ }, () => ({ path: lucideShimPath }));
      },
    },
  ],
});

const html = await readFile('index.html', 'utf8');
const assetVersion = Date.now();
const outputHtml = html.replace(
  '<script type="module" src="/index.tsx"></script>',
  `<script type="module" src="/assets/app.js?v=${assetVersion}"></script>`,
);

await writeFile('dist/index.html', outputHtml);
console.log('Built dist/index.html from the original React source.');
