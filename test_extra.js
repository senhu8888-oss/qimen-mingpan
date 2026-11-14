// 梅花易数与四柱补充的单元测试。运行：node test_extra.js
const M = require('./src/meihua.js');
const B = require('./src/bazi-extra.js');
let pass = 0, fail = 0;
const eq = (a, b, msg) => { if (a === b) pass++; else { fail++; console.log(`  ✗ ${msg}：得到 ${a}，期望 ${b}`); } };

console.log('── 1. 六十四卦表 ──');
// 上卦 × 下卦 的 64 个组合必须正好覆盖 1..64 各一次
{
  const seen = new Set();
  for (let u = 1; u <= 8; u++) for (let l = 1; l <= 8; l++) seen.add(M.KW[u][l]);
  eq(seen.size, 64, '64 个组合互不相同');
  eq([...seen].every((n) => n >= 1 && n <= 64), true, '编号都在 1..64');
}
// 经典卦名校验（上卦 · 下卦）
const hex = (u, l) => M.NAMES[M.KW[u][l]];
eq(hex(1, 1), '乾', '乾为乾');
eq(hex(8, 8), '坤', '坤为坤');
eq(hex(6, 6), '坎', '坎为坎');
eq(hex(3, 3), '离', '离为离');
eq(hex(1, 8), '否', '乾上坤下为否（天地否）');
eq(hex(8, 1), '泰', '坤上乾下为泰（地天泰）');
eq(hex(1, 2), '履', '乾上兑下为履（天泽履）');
eq(hex(2, 1), '夬', '兑上乾下为夬（泽天夬）');
eq(hex(2, 3), '革', '兑上离下为革（泽火革）');
eq(hex(3, 2), '睽', '离上兑下为睽（火泽睽）');
eq(hex(7, 3), '贲', '艮上离下为贲（山火贲）');
eq(hex(3, 7), '旅', '离上艮下为旅（火山旅）');
eq(hex(3, 6), '未济', '离上坎下为未济（火在水上）');
eq(hex(6, 3), '既济', '坎上离下为既济（水在火上）');
eq(hex(4, 5), '恒', '震上巽下为恒');
eq(hex(5, 4), '益', '巽上震下为益');
// 文王卦序的首尾与几个标志性位置
eq(M.NAMES.length - 1, 64, '卦名共 64 个');
eq(M.NAMES[63], '既济', '第 63 卦为既济');
eq(M.NAMES[64], '未济', '第 64 卦为未济');

console.log('── 2. 本卦、变卦、互卦 ──');
{
  // 乾为天：六爻全阳；动爻 mv=1 时变卦应为天风姤（乾上巽下，姤 44）
  const r = M.build(1, 1, 1);
  eq(r.ben.name, '乾', '本卦为乾');
  eq(r.bian.name, '姤', '初爻动，变卦为姤');
  eq(r.hu.name, '乾', '乾的互卦仍为乾');
  eq(r.yao, '初九', '初爻为阳，称初九');
}
{
  // 既济互卦为未济，未济互卦为既济（教科书常见结论）
  eq(M.build(6, 3, 1).hu.name, '未济', '既济的互卦为未济');
  eq(M.build(3, 6, 1).hu.name, '既济', '未济的互卦为既济');
}
{
  // 动爻翻转且只翻转一爻：本卦与变卦的爻差恰好一位
  let bad = 0;
  for (let u = 1; u <= 8; u++) for (let l = 1; l <= 8; l++) for (let mv = 1; mv <= 6; mv++) {
    const r = M.build(u, l, mv);
    const diff = r.ben.lines.filter((x, i) => x !== r.bian.lines[i]).length;
    if (diff !== 1) bad++;
  }
  eq(bad, 0, '任意动爻，变卦只改变一爻（8×8×6 种情况）');
}

console.log('── 3. 数字起卦 ──');
{
  const r = M.fromNumbers(8, 8); // 上数 8、下数 8 → 上卦 8（坤）、下卦 8（坤）、动爻 16 mod 6 = 4
  eq(r.ben.name, '坤', '数 8、8 起坤卦');
  eq(r.mv, 4, '动爻为 16 mod 6 = 4');
  const r2 = M.fromNumbers(9, 6); // 上卦 1（乾）、下卦 6（坎）、动爻 15 mod 6 = 3
  eq(r2.ben.upper.name, '乾', '上数 9 起上卦乾');
  eq(r2.ben.lower.name, '坎', '下数 6 起下卦坎');
  eq(r2.mv, 3, '动爻 = 15 mod 6 = 3');
}

console.log('── 4. 体用生克 ──');
// 体用规则：用生体大吉，比和吉，体克用小吉，体生用小凶，用克体凶
eq(M.relation('火', '土').kind, '用生体', '火生土为用生体');
eq(M.relation('土', '火').kind, '体生用', '火生土反过来为体生用');
eq(M.relation('土', '木').kind, '体克用', '用土、体木：木克土，体克用');
eq(M.relation('木', '土').kind, '用克体', '用木、体土：木克土，用克体');
eq(M.relation('金', '金').kind, '比和', '同五行为比和');
eq(M.relation('土', '木').level, 'good', '体克用为吉');
eq(M.relation('木', '土').level, 'bad', '用克体为凶');
{
  // 时间起卦：动爻在下卦时，用卦为下卦
  const r = M.fromTime(2026, 11, 14, 4);
  eq(r.mv >= 1 && r.mv <= 6, true, '时间起卦动爻在 1..6');
  eq(r.yong === (r.mv <= 3 ? r.ben.lower : r.ben.upper), true, '动爻在下卦则下卦为用');
}

console.log('── 5. 十神 ──');
// 日主甲（0）
eq(B.shishen(0, 0), '比肩', '甲见甲为比肩');
eq(B.shishen(0, 1), '劫财', '甲见乙为劫财');
eq(B.shishen(0, 2), '食神', '甲见丙为食神');
eq(B.shishen(0, 3), '伤官', '甲见丁为伤官');
eq(B.shishen(0, 4), '偏财', '甲见戊为偏财');
eq(B.shishen(0, 5), '正财', '甲见己为正财');
eq(B.shishen(0, 6), '七杀', '甲见庚为七杀');
eq(B.shishen(0, 7), '正官', '甲见辛为正官');
eq(B.shishen(0, 8), '偏印', '甲见壬为偏印');
eq(B.shishen(0, 9), '正印', '甲见癸为正印');
// 日主丁（3，阴），见乙（1，阴）：乙木生丁火，同为阴，为偏印
eq(B.shishen(3, 1), '偏印', '丁见乙为偏印');
eq(B.shishen(3, 0), '正印', '丁见甲（阳）为正印');

console.log('── 6. 纳音 ──');
eq(B.nayin(0, 0), '海中金', '甲子为海中金');
eq(B.nayin(1, 1), '海中金', '乙丑为海中金');
eq(B.nayin(2, 2), '炉中火', '丙寅为炉中火');
eq(B.nayin(9, 9), '剑锋金', '癸酉与壬申同为剑锋金');
eq(B.nayin(9, 11), '大海水', '癸亥为大海水');
eq(B.nayin(4, 0), '霹雳火', '戊子为霹雳火');
{
  // 六十甲子两两同纳音，共 30 种
  const set = new Set();
  for (let i = 0; i < 60; i++) set.add(B.nayin(i % 10, i % 12));
  eq(set.size, 30, '纳音共 30 种');
}

console.log('── 7. 大运起运 ──');
{
  // 阳年男顺排：从月柱向后推 1..8 步
  const r = B.daYun({ yearStemI: 0, monthIdx60: 0, male: true, days: 9 });
  eq(r.forward, true, '甲年（阳）男命顺排');
  eq(r.years, 3, '9 天折 3 年');
  eq(r.list[0].gz, '乙丑', '顺排第一步为月柱后一位');
  eq(r.list[0].startAge, 3, '第一步起运 3 岁');
  eq(r.list[1].startAge, 13, '第二步起运 13 岁');
}
{
  // 阳年女逆排
  const r = B.daYun({ yearStemI: 0, monthIdx60: 5, male: false, days: 6 });
  eq(r.forward, false, '甲年（阳）女命逆排');
  eq(r.list[0].gz, B.gzName(4), '逆排第一步为月柱前一位');
  eq(r.years, 2, '6 天折 2 年');
}
{
  // 起运年龄随天数单调不减，大运数恒为 8
  let ok = true;
  for (let d = 0; d < 15; d++) {
    const r = B.daYun({ yearStemI: 1, monthIdx60: 10, male: true, days: d });
    if (r.list.length !== 8) ok = false;
  }
  eq(ok, true, '大运始终排出 8 步');
}

console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exitCode = fail ? 1 : 0;
