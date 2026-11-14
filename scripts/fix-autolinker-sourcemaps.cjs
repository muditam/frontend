const fs = require('node:fs');
const path = require('node:path');

function fixAutolinkerSourceMaps(packageDir) {
  let changed = 0;
  function visit(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) { visit(file); continue; }
      if (!entry.isFile() || !file.endsWith('.js')) continue;
      const code = fs.readFileSync(file, 'utf8');
      const updated = code.replace(/^\/\/# sourceMappingURL=([^\r\n]+)$/gm, (comment, reference) => {
        // Leave embedded and remote maps alone. Only inspect local package maps.
        if (/^(?:data:|https?:|\/)/.test(reference)) return comment;
        const mapPath = path.resolve(path.dirname(file), reference.trim());
        if (!mapPath.startsWith(packageDir + path.sep)) return comment;
        try {
          const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          const missing = (map.sources || []).some((source, index) =>
            map.sourcesContent?.[index] == null &&
            !fs.existsSync(path.resolve(path.dirname(mapPath), map.sourceRoot || '', source))
          );
          return missing ? '' : comment;
        } catch {
          return comment;
        }
      });
      if (updated !== code) { fs.writeFileSync(file, updated); changed++; }
    }
  }
  visit(path.join(packageDir, 'dist'));
  return changed;
}

if (require.main === module) {
  const swaggerDir = path.dirname(require.resolve('swagger-ui-react'));
  const remarkableDir = path.dirname(require.resolve('remarkable/package.json', { paths: [swaggerDir] }));
  const packageDir = path.dirname(require.resolve('autolinker/package.json', { paths: [remarkableDir] }));
  const changed = fixAutolinkerSourceMaps(packageDir);
  if (changed) console.log(`Removed ${changed} broken Autolinker source-map references.`);
}

module.exports = { fixAutolinkerSourceMaps };
