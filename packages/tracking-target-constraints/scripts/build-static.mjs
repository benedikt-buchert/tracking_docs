import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const distDir = path.join(workspaceDir, 'dist');
const schemaDir = path.join(workspaceDir, 'schemas');
const manifestPath = path.join(workspaceDir, 'manifest.json');

async function buildStatic() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await fs.cp(schemaDir, path.join(distDir, 'schemas'), { recursive: true });
  await fs.copyFile(manifestPath, path.join(distDir, 'manifest.json'));
}

buildStatic().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
