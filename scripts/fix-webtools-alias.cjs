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

  // Fix @webtools/webwidget to @webwidget
  content = content.replace(/@webtools\/webwidget/g, '@webwidget');

  // Fix @webtools/webpaper to @webpaper
  content = content.replace(/@webtools\/webpaper/g, '@webpaper');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed @webtools aliases in', relPath);
});

console.log('Done fixing @webtools aliases');
