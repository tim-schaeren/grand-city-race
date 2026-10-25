// Bundles the functions into dist/, with the shared TypeScript package
// compiled in. dist/ is what Firebase deploys (firebase.json points at it):
// it gets a package.json of its own that names only what Cloud Functions
// must install, since the workspace packages don't exist there.
//   npm run build --workspace=apps/functions
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(here, 'package.json'), 'utf8'));
const external = ['firebase-admin', 'firebase-functions'];

mkdirSync(path.join(here, 'dist'), { recursive: true });
await build({
  entryPoints: [path.join(here, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: external.flatMap(name => [name, `${name}/*`]),
  outfile: path.join(here, 'dist/index.js'),
  logLevel: 'warning',
});
writeFileSync(path.join(here, 'dist/package.json'), JSON.stringify({
  name: 'grand-city-race-functions',
  private: true,
  type: 'module',
  main: 'index.js',
  engines: { node: '22' },
  dependencies: Object.fromEntries(external.map(name => [name, pkg.dependencies[name]])),
}, null, 2) + '\n');
console.log('Built the functions into apps/functions/dist');
