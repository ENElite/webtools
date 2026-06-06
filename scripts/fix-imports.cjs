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

walkDir(testRoot, (file) => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return;
  const relPath = path.relative(testRoot, file);
  const pkgName = relPath.split(path.sep)[0];

  let content = fs.readFileSync(file, 'utf8');

  // For webwidget tests: ../src/ -> @webwidget/src/
  if (pkgName === 'webwidget') {
    content = content.replace(/from\s+['"](\.\.\/src\/[^'"]+)['"]/g, (match, p1) => {
      const importPath = p1.replace(/^\.\.\//, '');
      return `from '@webwidget/${importPath}'`;
    });
  }

  // For webpaper tests: ../src/ -> @webpaper/src/
  if (pkgName === 'webpaper') {
    content = content.replace(/from\s+['"](\.\.\/src\/[^'"]+)['"]/g, (match, p1) => {
      const importPath = p1.replace(/^\.\.\//, '');
      return `from '@webpaper/${importPath}'`;
    });
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed imports in', relPath);
});

console.log('Done fixing imports');
