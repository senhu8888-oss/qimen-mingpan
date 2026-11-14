// 校准：统计 2026 全年 4380 个时辰各类原始分的中位数，输出可写入 engine.js 的 CAL 常数
const Q = require('./engine.js');
const bj = (y, mo, d, h, mi) => Q.utcFromBeijing(y, mo, d, h, mi, 0);
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const mode = process.argv[2] || 'measure';

if (mode === 'measure') for (const k in Q.CAL) Q.CAL[k] = 0;

const acc = { overall: [], palace: [], personal: [], wealth: [], career: [], people: [], study: [], health: [], travel: [] };
const verdicts = {}; const pctAll = []; const domPct = { wealth: [], career: [], people: [], study: [], health: [], travel: [] };
for (let day = 0; day < 365; day++) {
  for (let hh = 0; hh < 24; hh += 2) {
    const c = Q.chart(bj(2026, 1, 1, hh, 10) + day * 86400000); const an = c.analysis;
    acc.overall.push(an.overallRaw);
    an.domains.forEach((d) => { acc[d.key].push(d.raw); domPct[d.key].push(d.pct); });
    const raws = [1, 2, 3, 4, 6, 7, 8, 9].map((p) => an.palaces[p].raw);
    raws.forEach((r) => acc.palace.push(r));
    for (const a of raws) for (const b of raws) acc.personal.push(0.5 * a + 0.5 * b + an.boardAdj);
    verdicts[an.verdict.word] = (verdicts[an.verdict.word] || 0) + 1; pctAll.push(an.overall);
  }
}
if (mode === 'measure') {
  const out = {}; for (const k in acc) out[k] = Math.round(med(acc[k]) * 100) / 100;
  console.log('CAL =', JSON.stringify(out));
} else {
  const n = pctAll.length; const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
  console.log('校准后总分分位 5/25/50/75/95:', [.05, .25, .5, .75, .95].map((p) => q(pctAll, p)).join(' / '));
  console.log('时辰评语占比:', ['大吉', '小吉', '平', '小凶', '凶'].map((k) => `${k} ${(100 * (verdicts[k] || 0) / n).toFixed(1)}%`).join('  '));
  for (const k in domPct) console.log(' ', k.padEnd(7), '中位', med(domPct[k]), ' 5%-95%:', q(domPct[k], .05), '-', q(domPct[k], .95));
}
