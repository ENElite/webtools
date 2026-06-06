const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
const from = path.join(workspaceRoot, 'packages', 'webpaper', 'coverage');
const to = path.join(workspaceRoot, 'packages', 'webtest', 'coverage');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
  return true;
}

if (!fs.existsSync(from)) {
  console.log('No coverage found at', from);
  process.exit(0);
}

copyDir(from, to);
console.log('Coverage copied to', to);
