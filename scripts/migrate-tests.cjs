const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(workspaceRoot, 'packages');
const destRoot = path.join(packagesDir, 'webtest', '__test__');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

ensureDir(destRoot);

const packages = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(d => d.name)
  .filter(n => n !== 'webtest');

for (const pkg of packages) {
  const testDir = path.join(packagesDir, pkg, '__test__');
  if (!fs.existsSync(testDir)) continue;
  console.log('Copying tests from', pkg);
  walkDir(testDir, (file) => {
    const rel = path.relative(testDir, file);
    const dest = path.join(destRoot, pkg, rel);
    copyFile(file, dest);
    // simple transform: adjust imports from "@/" to keep as-is; resolution handled by tsconfig.paths
    try {
      const content = fs.readFileSync(dest, 'utf8');
      // preserve file as-is; placeholder for further automated replacements
      fs.writeFileSync(dest, content, 'utf8');
    } catch (e) {
      console.error('write failed for', dest, e);
    }
  });
}

console.log('Done copying tests to', destRoot);
