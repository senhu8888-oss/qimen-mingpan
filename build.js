// 把 CSS、排盘引擎、页面脚本拼成单文件 dist/index.html
const fs = require('fs');
const path = require('path');
const d = __dirname + path.sep;
const tpl = fs.readFileSync(d + 'src/template.html', 'utf8');
const css = fs.readFileSync(d + 'src/style.css', 'utf8');
const eng = fs.readFileSync(d + 'engine.js', 'utf8');
const app = fs.readFileSync(d + 'src/app.js', 'utf8');
const out = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('/*__ENGINE__*/', () => eng)
  .replace('/*__APP__*/', () => app);
fs.mkdirSync(d + 'dist', { recursive: true });
fs.writeFileSync(d + 'dist/index.html', out);
console.log('built', d + 'dist/index.html', (out.length / 1024).toFixed(1) + ' KB');
