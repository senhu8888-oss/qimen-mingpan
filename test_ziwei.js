// 紫微斗数测试：安星公式的经典已知结果与结构检查。运行：node test_ziwei.js
const Z = require('./src/ziwei.js');
let pass = 0, fail = 0;
const eq = (a, b, msg) => { if (JSON.stringify(a) === JSON.stringify(b)) pass++; else { fail++; console.log(`  ✗ ${msg}：得到 ${JSON.stringify(a)}，期望 ${JSON.stringify(b)}`); } };
const D = '子丑寅卯辰巳午未申酉戌亥';
const zp = (ju, d) => D[Z.ziweiPos(ju, d)];

console.log('── 紫微星位置（各局初一、初二的教科书结果）──');
eq(zp(2, 1), '丑', '水二局初一'); eq(zp(2, 2), '寅', '水二局初二'); eq(zp(2, 3), '寅', '水二局初三');
eq(zp(3, 1), '辰', '木三局初一'); eq(zp(4, 1), '亥', '金四局初一');
eq(zp(5, 1), '午', '土五局初一'); eq(zp(6, 1), '酉', '火六局初一');
{ // 逢局数整除的日子：初 n 日紫微在寅起第 1 步，如水二局初二、木三局初三、金四局初四
  eq(zp(2, 2), '寅', '水二局初二'); eq(zp(3, 3), '寅', '木三局初三'); eq(zp(4, 4), '寅', '金四局初四');
  eq(zp(5, 5), '寅', '土五局初五'); eq(zp(6, 6), '寅', '火六局初六');
}

console.log('── 命宫与身宫 ──');
const base = { lunarYear: 2000, leap: false, male: true };
eq(Z.chart({ ...base, month: 1, day: 1, hourIdx: 0 }).ming, '寅', '正月子时命宫在寅');
eq(Z.chart({ ...base, month: 1, day: 1, hourIdx: 1 }).ming, '丑', '正月丑时命宫在丑');
eq(Z.chart({ ...base, month: 1, day: 1, hourIdx: 2 }).ming, '子', '正月寅时命宫在子');
eq(Z.chart({ ...base, month: 1, day: 1, hourIdx: 0 }).shen, '寅', '正月子时身宫在寅');
eq(Z.chart({ ...base, month: 1, day: 1, hourIdx: 2 }).shen, '辰', '正月寅时身宫在辰');
eq(Z.chart({ ...base, month: 12, day: 1, hourIdx: 0 }).ming, '丑', '腊月子时命宫在丑');

console.log("── 五行局：甲子年十一月子时 ──");
{ // 甲子年寅宫为丙寅，子宫为丙子（纳音涧下水）→ 水二局；这里只验证干支与局对应关系
  const c = Z.chart({ lunarYear: 1984, month: 11, leap: false, day: 1, hourIdx: 0, male: true }); // 甲子年十一月子时 命宫在 寅+10 = 子
  eq(c.ming, '子', '甲子年十一月子时命宫子');
  eq(c.palaces[0].stem + c.palaces[0].branch, '丙子', '甲年子宫天干为丙');
  eq(c.nayin, '涧下水', '丙子纳音涧下水');
  eq(c.juName, '水二局', '涧下水 → 水二局');
}

console.log('── 星曜结构 ──');
{
  let bad = 0;
  for (let y = 1984; y < 1996; y++) for (let m = 1; m <= 12; m++) for (let d = 1; d <= 30; d += 3) for (let h = 0; h < 12; h++) {
    const c = Z.chart({ lunarYear: y, month: m, leap: false, day: d, hourIdx: h, male: y % 2 === 0 });
    const names = c.palaces.flatMap((p) => p.stars.map((s) => s.name));
    if (names.length !== 18 || new Set(names).size !== 18) bad++;
    // 天府与紫微以寅申轴对称：地支序和为 4（mod 12）
    const at = (n) => c.palaces.find((p) => p.stars.some((s) => s.name === n)).branchI;
    if ((at('紫微') + at('天府')) % 12 !== 4) bad++;
    // 十二宫各有一个宫名，且命宫在命宫位置
    if (new Set(c.palaces.map((p) => p.role)).size !== 12) bad++;
    if (c.palaces.find((p) => p.role === '命宫').branch !== c.ming) bad++;
    // 四化恰好 4 颗星带化
    const hua = c.palaces.flatMap((p) => p.stars.filter((s) => s.hua));
    if (hua.length !== 4) bad++;
  }
  eq(bad, 0, '18 颗星各出现一次、紫微天府对称、十二宫齐全、四化 4 颗（全组合扫描）');
}
{ // 闰月十六日起按下个月
  const a = Z.chart({ ...base, month: 4, leap: true, day: 20, hourIdx: 0 });
  eq(a.usedMonth, 5, '闰四月二十日按五月');
  const b = Z.chart({ ...base, month: 4, leap: true, day: 10, hourIdx: 0 });
  eq(b.usedMonth, 4, '闰四月初十按四月');
}
{ // 大限：阳男顺行，起岁等于局数
  const c = Z.chart({ lunarYear: 2000, month: 1, leap: false, day: 5, hourIdx: 0, male: true }); // 庚辰年，阳男
  const ming = c.palaces.find((p) => p.role === '命宫');
  eq(ming.daxian[0], c.ju, '命宫大限起岁为局数');
  eq(c.forward, true, '阳男顺行');
  const f = Z.chart({ lunarYear: 2000, month: 1, leap: false, day: 5, hourIdx: 0, male: false });
  eq(f.forward, false, '阳女逆行');
}
console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exitCode = fail ? 1 : 0;
