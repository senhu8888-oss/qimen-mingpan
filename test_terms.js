const Q = require('./engine.js');

// 【权威】香港天文台 2026 年中气（HKT=UTC+8=北京时间；官方只公布到分钟）
const HKO = [
  ['大寒', 2026, 1, 20, 9, 45], ['雨水', 2026, 2, 18, 23, 52], ['春分', 2026, 3, 20, 22, 46],
  ['谷雨', 2026, 4, 20, 9, 39], ['小满', 2026, 5, 21, 8, 37], ['夏至', 2026, 6, 21, 16, 25],
  ['大暑', 2026, 7, 23, 3, 13], ['处暑', 2026, 8, 23, 10, 19], ['秋分', 2026, 9, 23, 8, 5],
  ['霜降', 2026, 10, 23, 17, 38], ['小雪', 2026, 11, 22, 15, 23], ['冬至', 2026, 12, 22, 4, 50]
];
// 【参考】凭记忆的节气时刻，非权威来源，只做交叉参考
const RECALL = [
  ['立春', 2024, 2, 4, 16, 27], ['春分', 2024, 3, 20, 11, 6], ['夏至', 2024, 6, 21, 4, 51],
  ['立春', 2025, 2, 3, 22, 10], ['冬至', 2025, 12, 21, 23, 3], ['立春', 2023, 2, 4, 10, 42],
  ['立春', 2026, 2, 4, 4, 2]
];

function run(label, mode, rows) {
  Q._setMode(mode);
  let worst = 0, sum = 0;
  const out = [];
  for (const [name, y, mo, d, h, mi] of rows) {
    const t = Q.termsOfYear(y).find((x) => x.name === name);
    const lo = Q.utcFromBeijing(y, mo, d, h, mi, 0);        // 官方值截断到分钟：真值在 [lo, lo+1分)
    const errMin = (t.ms - lo) / 60000;
    const err = errMin < 0 ? errMin : errMin > 1 ? errMin - 1 : 0; // 落在区间内算 0
    out.push(`${y} ${name} 官方 ${String(mo).padStart(2)}/${String(d).padStart(2)} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}  算得偏差 ${errMin >= 0 ? '+' : ''}${errMin.toFixed(2)} 分${err === 0 ? '  ✓区间内' : ''}`);
    worst = Math.max(worst, Math.abs(err)); sum += Math.abs(err);
  }
  console.log(`\n== ${label} ==`);
  out.forEach((r) => console.log(r));
  console.log(`越出官方一分钟区间的最大误差 ${worst.toFixed(2)} 分钟`);
  return worst;
}

const low = run('低精度公式（对照）— 官方12中气', 'low', HKO);
const hi = run('VSOP87 — 官方12中气', 'vsop', HKO);
run('VSOP87 — 记忆参考值（非权威）', 'vsop', RECALL);
console.log(`\n结论：低精度 ${low.toFixed(2)} 分钟 → VSOP87 ${hi.toFixed(2)} 分钟`);
process.exitCode = hi < 1.5 ? 0 : 1;
