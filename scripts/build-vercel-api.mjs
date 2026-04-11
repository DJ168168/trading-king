import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const outdir = path.join(projectRoot, 'dist', 'api');

await mkdir(outdir, { recursive: true });

await build({
  entryPoints: [path.join(projectRoot, 'api', 'index.ts')],
  outfile: path.join(outdir, 'index.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node20'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  banner: {
    js: "require('dotenv/config');",
  },
});

console.log('Built dist/api/index.cjs');
