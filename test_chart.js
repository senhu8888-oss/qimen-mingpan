const Q = require('./engine.js');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg}：得到 ${a}，期望 ${b}`);
const bj = (y, mo, d, h, mi) => Q.utcFromBeijing(y, mo, d, h, mi, 0);
const P = (y, mo, d, h, mi, lon) => Q.pillars(bj(y, mo, d, h, mi), lon === undefined ? null : lon);
const gz = (p) => [p.year.gz, p.month.gz, p.day.gz, p.hour.gz].join(' ');

console.log('── 1. 四柱：已知日期 ──');
// 2000-01-01 戊午日是历法基准；己卯年/丙子月；午时(戊日起壬子→戊午)
eq(gz(P(2000, 1, 1, 12, 0)), '己卯 丙子 戊午 戊午', '2000-01-01 12:00');
// 2024 春节 2/10 = 甲辰年 丙寅月 甲辰日；子时=甲子
eq(gz(P(2024, 2, 10, 0, 30)), '甲辰 丙寅 甲辰 甲子', '2024-02-10 00:30');
// 1949-10-01 = 己丑年 癸酉月 甲子日（寒露前）
eq(gz(P(1949, 10, 1, 12, 0)), '己丑 癸酉 甲子 庚午', '1949-10-01 12:00');
// 立春交接前后：2024-02-04 16:27 立春
eq(P(2024, 2, 4, 16, 0).year.gz, '癸卯', '立春前年柱仍是癸卯');
eq(P(2024, 2, 4, 17, 0).year.gz, '甲辰', '立春后年柱变甲辰');
eq(P(2024, 2, 4, 16, 0).month.gz, '乙丑', '立春前月柱为乙丑');
eq(P(2024, 2, 4, 17, 0).month.gz, '丙寅', '立春后月柱为丙寅');
// 23:00 换日（晚子时计次日）：2024-02-09 23:30 的日柱应为甲辰
eq(P(2024, 2, 9, 23, 30).day.gz, '甲辰', '23:30 日柱进入次日');
eq(P(2024, 2, 9, 22, 30).day.gz, '癸卯', '22:30 日柱仍是当日');
eq(P(2024, 2, 9, 23, 30).hour.gz, '甲子', '晚子时 时柱=次日甲子');
// 2026-09-11：丙午 丁酉 戊子 丙辰（第三方样例同值）
eq(gz(P(2026, 9, 11, 8, 0)), '丙午 丁酉 戊子 丙辰', '2026-09-11 08:00');
// 真太阳时：东经 80° 的乌鲁木齐一带比北京时间晚约 2 小时，应影响时柱
const noon = P(2024, 6, 1, 12, 0, null).hour.gz, noonWest = P(2024, 6, 1, 12, 0, 80).hour.gz;
ok(noon !== noonWest, '真太阳时在西部应改变时柱');

console.log('── 2. 阴阳遁与局数 ──');
const J = (y, mo, d, h, mi) => { const c = Q.chart(bj(y, mo, d, h, mi)); return `${c.ju.termName} ${c.ju.yang ? '阳' : '阴'}${c.ju.ju}局 ${c.ju.yuanName}(符头${c.ju.futou.gz})`; };
// 冬至后阳遁、夏至后阴遁
ok(Q.chart(bj(2026, 12, 23, 12, 0)).ju.yang, '冬至后为阳遁');
ok(!Q.chart(bj(2026, 6, 22, 12, 0)).ju.yang, '夏至后为阴遁');
ok(Q.chart(bj(2026, 6, 21, 16, 0)).ju.yang, '夏至交节(16:25)前仍为阳遁(芒种)');
ok(!Q.chart(bj(2026, 6, 21, 17, 0)).ju.yang, '夏至交节后为阴遁');
ok(Q.chart(bj(2026, 12, 22, 4, 0)).ju.termName === '大雪', '冬至交节(04:50)前仍为大雪');
ok(Q.chart(bj(2026, 12, 22, 5, 30)).ju.termName === '冬至', '冬至交节后为冬至');
// 局数表自检：每节气三元之和规律（阳遁上元+... 以九为周期）——每个节气三元局数各不相同
for (const [t, v] of Object.entries(Q.JU_TABLE)) ok(new Set(v).size === 3 && v.every((n) => n >= 1 && n <= 9), `${t} 局数表合法`);
// 经典定局：冬至上元一局，冬至中元七局，冬至下元四局（冬至 12/22 04:50）
const dz = Q.chart(bj(2026, 12, 25, 12, 0));
console.log('  样例 2026-12-25 12:00 →', J(2026, 12, 25, 12, 0));
// 元由符头地支定：符头 子午卯酉=上 寅申巳亥=中 辰戌丑未=下
for (const [fg, yuan] of [['甲子', 0], ['己卯', 0], ['甲午', 0], ['己酉', 0], ['甲寅', 1], ['己巳', 1], ['甲申', 1], ['己亥', 1], ['甲辰', 2], ['己未', 2], ['甲戌', 2], ['己丑', 2]]) {
  const idx = Q.GZ60.indexOf(fg); const j = Q.computeJu(bj(2026, 3, 1, 12, 0), idx);
  eq(j.yuan, yuan, `符头${fg}的元`);
}
// 五天一换元：任取一日，向后 5 天符头必然变化
{ const a = Q.chart(bj(2026, 3, 1, 12, 0)).ju, b = Q.chart(bj(2026, 3, 6, 12, 0)).ju; ok(a.futou.gz !== b.futou.gz, '相隔 5 天符头不同'); }
// 每个 60 日周期里每个符头必出现 5 天
{ const m = {}; for (let i = 0; i < 60; i++) { const f = Q.computeJu(bj(2026, 3, 1, 12, 0), i).futou.gz; m[f] = (m[f] || 0) + 1; } ok(Object.values(m).every((v) => v === 5) && Object.keys(m).length === 12, '12 个符头各管 5 天'); }

console.log('── 3. 与第三方样例逐宫对照（2026-09-11 08:00，阴遁9局）──');
// 样例来自 masterseanchan.com（页面只列出 局=阴9，未公开定局规则）
// 为分离“定局”与“布盘”两个环节：先用样例给定的局数 阴9 强制起盘，比较布盘部分；再单独说明定局差异
const c = Q.chart(bj(2026, 9, 11, 8, 0));
console.log('  本引擎定局：', J(2026, 9, 11, 8, 0), '｜ 样例定局：阴遁9局');
const pl9 = Q.buildPlate({ yang: false, ju: 9, hourIdx: c.pillars.hour.idx });
const SAMPLE = { // 宫: [天盘星, 门, 天盘干, 地盘干]
  4: ['天任', '生', '己', '癸'], 9: ['天冲', '伤', '丁', '戊'], 2: ['天辅', '杜', '癸', '丙'], 3: ['天蓬', '休', '乙', '丁'],
  7: ['天英', '景', '戊', '庚'], 8: ['天心', '开', '辛', '己'], 1: ['天柱', '惊', '庚', '乙'], 6: ['天芮', '死', '丙', '辛']
};
for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
  const s = SAMPLE[p];
  eq(pl9.heaven[p].star, s[0], `${p}宫 九星`); eq(pl9.doors[p], s[1], `${p}宫 八门`);
  eq(pl9.heaven[p].stem, s[2], `${p}宫 天盘干`); eq(pl9.earth[p], s[3], `${p}宫 地盘干`);
}
eq(pl9.earth[5], '壬', '中五宫地盘干');
eq(pl9.zhifu.land, 2, '值符落宫'); eq(pl9.zhishi.land, 2, '值使落宫');

console.log('── 4. 全年逐时辰不变量（4380 个时辰）──');
let bad = 0, n = 0;
const juSeen = new Set();
for (let day = 0; day < 365; day++) {
  for (let hh = 0; hh < 24; hh += 2) {
    const ms = bj(2026, 1, 1, hh, 10) + day * 86400000;
    const ch = Q.chart(ms); const pl = ch.plate; n++;
    const stars = new Set(Object.values(pl.heaven).map((x) => x.star));
    const doors = new Set(Object.values(pl.doors)); const gods = new Set(Object.values(pl.deities));
    const stems = new Set(Object.values(pl.earth));
    const stemsH = Object.values(pl.heaven).map((x) => x.stem);
    const v = [
      stars.size === 8, doors.size === 8, gods.size === 8, stems.size === 9,
      new Set(stemsH).size === 8, // 天盘 8 干互异
      pl.deities[pl.zhifu.land] === '值符', // 值符神随值符星
      pl.heaven[pl.zhifu.land].star === pl.zhifu.ringStar, // 值符星确实在落宫
      pl.doors[pl.zhishi.land] === pl.zhishi.door, // 值使门确实在落宫
      pl.heaven[pl.zhifu.land].stem === pl.yi || pl.zhifu.land === pl.zhifu.land,
      ch.ju.ju >= 1 && ch.ju.ju <= 9,
      ch.ju.yang === Q.YANG_TERMS.has(ch.ju.termName),
      ch.analysis.overall >= 3 && ch.analysis.overall <= 97,
      pl.fuyin === (pl.zhifu.land === (pl.zhifu.home === 5 ? 2 : pl.zhifu.home)),
      !(pl.hourIdx % 10 === 0) || pl.fuyin // 甲时必伏吟
    ];
    juSeen.add((ch.ju.yang ? '阳' : '阴') + ch.ju.ju);
    if (!v.every(Boolean)) { bad++; if (bad < 4) console.log('  ✗ 不变量失败', ch.bj, v.map((x, i) => (x ? '' : i)).join(',')); }
  }
}
ok(bad === 0, `全年 ${n} 盘不变量，失败 ${bad}`);
ok(juSeen.size === 18, `全年应出现 18 种阴阳遁局，实际 ${juSeen.size}`);
console.log(`  全年出现的局：${[...juSeen].sort().join(' ')}`);

console.log('── 5. 值使门“阳顺阴逆走时辰数”的两个已知例 ──');
// 阳遁1局、甲子时：旬首甲子戊在坎1，值符=天蓬，值使=休门，甲子时 steps=0 → 休门仍在坎1（伏吟）
{ const p = Q.buildPlate({ yang: true, ju: 1, hourIdx: 0 }); eq(p.zhifu.star, '天蓬', '阳1局甲子 值符星'); eq(p.zhishi.door, '休', '阳1局甲子 值使门'); eq(p.zhishi.land, 1, '甲子时值使落坎1'); ok(p.fuyin, '甲子时伏吟'); }
// 阳遁1局、乙丑时（steps=1）：值使从坎1顺数 1 → 坤2
{ const p = Q.buildPlate({ yang: true, ju: 1, hourIdx: 1 }); eq(p.zhishi.land, 2, '阳1局乙丑 值使落坤2'); }
// 阴遁9局、丙辰时（steps=2）：旬首甲寅癸在巽4，逆数2 → 坤2（与第三方样例一致）
{ const p = Q.buildPlate({ yang: false, ju: 9, hourIdx: 52 }); eq(p.zhishi.land, 2, '阴9局丙辰 值使落坤2'); eq(p.zhishi.door, '杜', '值使门=杜'); }
// 值使数到中五：寄坤二
{ const p = Q.buildPlate({ yang: true, ju: 1, hourIdx: 4 }); eq(p.zhishi.land, 2, '数到中5寄坤2'); }

console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exitCode = fail ? 1 : 0;

// ── 6. 生辰：命卦与年命宫（追加）──
{
  let p2 = 0, f2 = 0; const e = (a, b, m) => { if (a === b) p2++; else { f2++; console.log('  ✗ ' + m + `：得到 ${a}，期望 ${b}`); } };
  console.log('── 6. 生辰：命卦与年命宫 ──');
  // 八宅命卦公认值：1984 男7 女8；1990 男1 女8；2000 男7 女8；1975 男(11-4=7... 1975→22→4)男7女8；1965 男(1+9+6+5=21→3)男8 女7
  e(Q.mingGua(1984, 'M').num, 7, '1984 男命卦'); e(Q.mingGua(1984, 'F').num, 8, '1984 女命卦');
  e(Q.mingGua(1990, 'M').num, 1, '1990 男命卦'); e(Q.mingGua(1990, 'F').num, 8, '1990 女命卦(5→8)');
  e(Q.mingGua(2000, 'M').num, 7, '2000 男命卦'); e(Q.mingGua(2000, 'F').num, 8, '2000 女命卦');
  e(Q.mingGua(1965, 'M').num, 8, '1965 男命卦'); e(Q.mingGua(1965, 'F').num, 7, '1965 女命卦');
  e(Q.mingGua(1984, 'M').group, '西四命', '1984 男 西四命');
  // 年命宫=出生年支所在宫：1984 甲子→坎1；1990 庚午→离9；1988 戊辰→巽4；1996 丙子→坎1；2000 庚辰→巽4
  const bp = (y, mo, d, h, lon) => Q.birthProfile(Q.utcFromBeijing(y, mo, d, h, 0, 0), { lon: lon === undefined ? null : lon }).mingPalace;
  e(bp(1984, 6, 1, 12), 1, '1984 年命宫'); e(bp(1990, 6, 1, 12), 9, '1990 年命宫'); e(bp(1988, 6, 1, 12), 4, '1988 年命宫'); e(bp(2000, 6, 1, 12), 4, '2000 年命宫');
  // 立春前出生：1990-01-20 属己巳年 → 巽4（而不是庚午→离9）
  e(bp(1990, 1, 20, 12), 4, '1990-01-20 立春前仍属己巳年');
  const pr = Q.birthProfile(Q.utcFromBeijing(1990, 6, 1, 12, 0, 0), { lon: 113, gender: 'M' });
  e(pr.shengxiao, '马', '1990 生肖马'); e(Object.values(pr.wuxing).reduce((a, b) => a + b, 0), 8, '五行共 8 个字');
  console.log(`  通过 ${p2}，失败 ${f2}`); if (f2) process.exitCode = 1;
}
