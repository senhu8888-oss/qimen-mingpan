// 把 CSS、排盘引擎、页面脚本拼成单文件 dist/index.html
const fs = require('fs');
const path = require('path');
const d = __dirname + path.sep;
const tpl = fs.readFileSync(d + 'src/template.html', 'utf8');
const css = fs.readFileSync(d + 'src/style.css', 'utf8');
// 排盘引擎 + 梅花易数 + 四柱补充，各自是 UMD 模块，分别挂到 window.Qimen / QimenMei / QimenBazi
const eng = ['engine.js', 'src/meihua.js', 'src/bazi-extra.js'].map((f) => fs.readFileSync(d + f, 'utf8')).join('\n;\n');
const app = fs.readFileSync(d + 'src/app.js', 'utf8');
const out = tpl
  .replace('/*__CSS__*/', () => css)
  .replace('/*__ENGINE__*/', () => eng)
  .replace('/*__APP__*/', () => app);
fs.mkdirSync(d + 'dist', { recursive: true });
fs.writeFileSync(d + 'dist/index.html', out);
console.log('built', d + 'dist/index.html', (out.length / 1024).toFixed(1) + ' KB');
