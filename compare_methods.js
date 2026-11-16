// 对比脚本：列出 2000–2030 年三种定局方法局数不同的日期。
// 用法：node compare_methods.js [起始年] [结束年]   默认 2000 2030
// 取每天北京时间 12:00 的盘（交节恰在当天时，按中午是否已过交节判断）。
// 输出：docs/compare/ju-diff-<起>-<止>.csv（逐日明细）和 docs/compare/ju-diff-<起>-<止>.md（按年汇总 + 连续段表格）。
const fs = require('fs');
const Q = require('./engine.js');
const y0 = +(process.argv[2] || 2000), y1 = +(process.argv[3] || 2030);
const M = ['chaibu', 'zhirun', 'maoshan'], NAME = { chaibu: '拆补', zhirun: '置闰', maoshan: '茅山' };
const lab = (j) => `${j.termName}${j.yang ? '阳' : '阴'}${j.ju}${j.yuanName.charAt(0)}${j.run ? '闰' : ''}`;   // 如 “白露阴3中”
const key = (j) => `${j.yang ? '阳' : '阴'}${j.ju}`;
const pad = (n) => String(n).padStart(2, '0');

const rows = [];
const yearStat = {};
for (let y = y0; y <= y1; y++) {
  const days = (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1)) / 86400000;
  const st = yearStat[y] = { days, any: 0, cz: 0, cm: 0, zm: 0, run: 0 };
  for (let k = 0; k < days; k++) {
    const dt = new Date(Date.UTC(y, 0, 1 + k));
    const mo = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const ms = Q.utcFromBeijing(y, mo, d, 12, 0, 0);
    const js = M.map((m) => Q.chart(ms, { method: m }).ju);
    const [a, b, c] = js.map(key);
    if (js[1].run) st.run++;
    if (a !== b) st.cz++;
    if (a !== c) st.cm++;
    if (b !== c) st.zm++;
    if (a !== b || a !== c || b !== c) {
      st.any++;
      rows.push({ date: `${y}-${pad(mo)}-${pad(d)}`, gz: Q.chart(ms, { method: 'chaibu' }).pillars.day.gz, js });
    }
  }
}
fs.mkdirSync('docs/compare', { recursive: true });
const base = `docs/compare/ju-diff-${y0}-${y1}`;
fs.writeFileSync(base + '.csv', '﻿日期,日柱,拆补法,置闰法,茅山法,置闰法超神接气,置闰法是否闰期\n' +
  rows.map((r) => [r.date, r.gz, lab(r.js[0]), lab(r.js[1]), lab(r.js[2]), r.js[1].chao ? r.js[1].chao.kind + (r.js[1].chao.days || '') : '', r.js[1].run ? '闰期' : ''].join(',')).join('\n') + '\n');

// 连续日期段：三种方法的局（阴阳+局数）组合相同的连续日合并成一行
const segs = [];
for (const r of rows) {
  const sig = r.js.map(key).join('|');
  const prev = segs[segs.length - 1];
  const dayN = Date.parse(r.date) / 86400000;
  if (prev && prev.sig === sig && dayN - prev.endN === 1) { prev.end = r.date; prev.endN = dayN; prev.n++; }
  else segs.push({ sig, start: r.date, end: r.date, endN: dayN, n: 1, r });
}
let md = `# 三种定局方法对比（${y0}–${y1} 年）\n\n由 \`node compare_methods.js ${y0} ${y1}\` 生成。取每天北京时间 12:00 的盘，比较“阴阳遁 + 局数”。\n逐日明细见同名 CSV；下面是汇总和连续段。\n\n`;
md += '## 按年汇总（天数）\n\n| 年 | 天数 | 三法不全相同 | 拆补≠置闰 | 拆补≠茅山 | 置闰≠茅山 | 置闰法处于闰期 |\n|---|---|---|---|---|---|---|\n';
let tot = { days: 0, any: 0, cz: 0, cm: 0, zm: 0, run: 0 };
for (const y in yearStat) { const s = yearStat[y]; md += `| ${y} | ${s.days} | ${s.any} | ${s.cz} | ${s.cm} | ${s.zm} | ${s.run} |\n`; for (const k in tot) tot[k] += s[k]; }
md += `| 合计 | ${tot.days} | ${tot.any} | ${tot.cz} | ${tot.cm} | ${tot.zm} | ${tot.run} |\n\n`;
md += `三种方法不全相同的日子共 ${tot.any} 天，占 ${(tot.any / tot.days * 100).toFixed(1)}%。\n\n`;
md += '## 连续段明细\n\n每行是一段连续日期，段内每天三种方法给出的“阴阳遁+局数”组合相同（括号内为该段第一天的节气与元）。\n\n';
md += '| 起 | 止 | 天数 | 拆补法 | 置闰法 | 茅山法 |\n|---|---|---|---|---|---|\n';
for (const g of segs) md += `| ${g.start} | ${g.end} | ${g.n} | ${lab(g.r.js[0])} | ${lab(g.r.js[1])} | ${lab(g.r.js[2])} |\n`;
fs.writeFileSync(base + '.md', md);
console.log(`${y0}–${y1}：共 ${tot.days} 天，三法不全相同 ${tot.any} 天（${(tot.any / tot.days * 100).toFixed(1)}%）；拆补≠置闰 ${tot.cz}，拆补≠茅山 ${tot.cm}，置闰≠茅山 ${tot.zm}；置闰法闰期 ${tot.run} 天`);
console.log('连续段', segs.length, '→', base + '.md,', base + '.csv');
