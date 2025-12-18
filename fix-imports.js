const fs = require('fs');
const path = require('path');

function fixImports(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixImports(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix relative imports to add .js extension
      content = content.replace(
        /from\s+['"](\.[^'"]*?)['"];?/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('?') && !importPath.includes('#')) {
            return match.replace(importPath, importPath + '.js');
          }
          return match;
        }
      );
      
      content = content.replace(
        /import\s+['"](\.[^'"]*?)['"];?/g,
        (match, importPath) => {
          if (!importPath.endsWith('.js') && !importPath.includes('?') && !importPath.includes('#')) {
            return match.replace(importPath, importPath + '.js');
          }
          return match;
        }
      );
      
      fs.writeFileSync(filePath, content);
    }
  }
}

console.log('Fixing import paths...');
fixImports('./dist');
console.log('Import paths fixed!');