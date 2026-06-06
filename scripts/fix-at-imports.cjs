const fs = require('fs');
const path = require('path');

const testRoot = path.join(__dirname, '..', 'packages', 'webtest', '__test__');

function walkDir(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDir(full, cb);
    else cb(full);
  }
}

function replaceAtImports(content, pkgAlias) {
  // Replace in from statements
  content = content.replace(/from\s+['"]@\/([^'"]+)['"]/g, (match, importPath) => {
    return `from '@${pkgAlias}/${importPath}'`;
  });

  // Replace in vi.mock() calls
  content = content.replace(/vi\.mock\(\s*['"]@\/([^'"]+)['"]/g, (match, importPath) => {
    return `vi.mock('@${pkgAlias}/${importPath}'`;
  });

  // Replace in require statements (if any)
  content = content.replace(/require\(\s*['"]@\/([^'"]+)['"]\s*\)/g, (match, importPath) => {
    return `require('@${pkgAlias}/${importPath}')`;
  });

  return content;
}

walkDir(testRoot, (file) => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  const relPath = path.relative(testRoot, file);
  const pkgName = relPath.split(path.sep)[0];

  let content = fs.readFileSync(file, 'utf8');

  if (pkgName === 'webpaper') {
    content = replaceAtImports(content, 'webpaper');
  } else if (pkgName === 'webwidget') {
    content = replaceAtImports(content, 'webwidget');
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed @/ imports in', relPath);
});

console.log('Done fixing @/ imports');
