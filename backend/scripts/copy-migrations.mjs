import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The migration runner reads .sql files at runtime, so they must be copied next
 * to the compiled JavaScript in dist/ (tsc only emits .ts files).
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src', 'db', 'migrations');
const destination = path.join(root, 'dist', 'src', 'db', 'migrations');

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

process.stdout.write(`Copied SQL migrations to ${path.relative(root, destination)}\n`);
