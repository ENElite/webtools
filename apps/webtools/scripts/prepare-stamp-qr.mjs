import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const dest = fileURLToPath(new URL('../public/stamp-qr/', import.meta.url));
mkdirSync(dest, { recursive: true });
for (const file of ['highs.js', 'highs.wasm'])
    copyFileSync(resolve(dirname(require.resolve('highs')), file), resolve(dest, file));
console.log('Prepared local HiGHS assets.');
