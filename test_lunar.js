// 农历换算测试：对照已知春节、闰月、中秋。运行：node test_lunar.js
const L = require('./src/lunar.js');
let pass = 0, fail = 0;
const eq = (a, b, msg) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log(`  ✗ ${msg}：得到 ${JSON.stringify(a)}，期望 ${JSON.stringify(b)}`); } };
// 春节（公历）
const cny = { 1976: [1, 31], 1985: [2, 20], 1999: [2, 16], 2000: [2, 5], 2009: [1, 26], 2012: [1, 23], 2014: [1, 31], 2017: [1, 28], 2020: [1, 25], 2021: [2, 12], 2022: [2, 1], 2023: [1, 22], 2024: [2, 10], 2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3] };
for (const y in cny) eq(L.newYearOf(+y), [+y, ...cny[y]], `${y} 年春节`);
// 闰月：[农历年, 闰几月]
const leaps = [[2009, 5], [2012, 4], [2014, 9], [2017, 6], [2020, 4], [2023, 2], [2025, 6], [2028, 5], [2031, 3], [1990, 5], [1993, 3], [1995, 8], [1998, 5], [2001, 4], [2004, 2], [2006, 7], [2033, 11]];
for (const [ly, lm] of leaps) {
  const found = new Set();
  for (let m = 1; m <= 12; m++) for (const d of [1, 15, 28]) { const r = L.fromSolar(ly, m, d); if (r.leap && r.year === ly) found.add(r.month); }
  // 闰十一月等跨年月份，再扫次年一二月
  for (let m = 1; m <= 3; m++) for (const d of [1, 15, 28]) { const r = L.fromSolar(ly + 1, m, d); if (r.leap && r.year === ly) found.add(r.month); }
  eq([...found], [lm], `${ly} 年闰 ${lm} 月`);
}
// 非闰年不应出现闰月
for (const ly of [2019, 2021, 2022, 2024, 2026, 2027]) {
  let any = false;
  for (let m = 1; m <= 12; m++) for (const d of [1, 10, 20, 28]) { const r = L.fromSolar(ly, m, d); if (r.leap && r.year === ly) any = true; }
  eq(any, false, `${ly} 年无闰月`);
}
// 具体日期
eq(L.fromSolar(2025, 10, 6).month + '-' + L.fromSolar(2025, 10, 6).day, '8-15', '2025-10-06 中秋 八月十五');
eq(L.fromSolar(2026, 9, 25).month + '-' + L.fromSolar(2026, 9, 25).day, '8-15', '2026-09-25 中秋 八月十五');
eq(L.fromSolar(2024, 6, 10).month + '-' + L.fromSolar(2024, 6, 10).day, '5-5', '2024-06-10 端午 五月初五');
eq(L.fromSolar(2026, 2, 16).year + '-' + L.fromSolar(2026, 2, 16).month, '2025-12', '2026-02-16 仍是农历乙巳年腊月');
eq(L.fromSolar(2026, 2, 17).year + '-' + L.fromSolar(2026, 2, 17).month + '-' + L.fromSolar(2026, 2, 17).day, '2026-1-1', '2026-02-17 丙午年正月初一');
console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exitCode = fail ? 1 : 0;
