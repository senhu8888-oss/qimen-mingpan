// 三种定局方法的测试。运行：node test_methods.js
const Q = require('./engine.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}：得到 ${JSON.stringify(a)}，期望 ${JSON.stringify(b)}`);
const bjms = (y, mo, d, h, mi) => Q.utcFromBeijing(y, mo, d, h || 0, mi || 0, 0);
const pidx = (ms) => Q.pillars(ms, null).day.idx;
const J = (ms, method, params) => Q.computeJu(ms, pidx(ms), { method, params });
const YU = ['上元', '中元', '下元'];

console.log('── 1. 拆补法保持原有结果 ──');
{
  const ms = bjms(2026, 9, 11, 8, 0);
  const a = J(ms, 'chaibu'), c = Q.chart(ms).ju;
  eq([a.termName, a.yang, a.ju, a.yuanName], [c.termName, c.yang, c.ju, c.yuanName], '显式拆补与默认一致');
  eq([a.yang, a.ju, a.yuanName], [false, 3, '中元'], '2026-09-11 08:00 拆补：阴三局中元');
}

console.log('── 2. 置闰法块表结构 ──');
{
  const bl = Q.zhirunBlocks(9, 1880);
  let gap = 0, notFutou = 0, badYuan = 0, badSeq = 0;
  for (let i = 0; i < bl.length; i++) {
    if (i && bl[i].start - bl[i - 1].start !== 5) gap++;
    const g = (((bl[i].start - 2451545 + 54) % 60) + 60) % 60;
    if (g % 5 !== 0) notFutou++;                                   // 每块从甲/己日开始
    const want = [0, 6, 3, 9].includes(g % 12) ? 0 : [2, 8, 5, 11].includes(g % 12) ? 1 : 2;
    if (want !== bl[i].yuan) badYuan++;                            // 块的元必须与符头地支规则一致
    if (i % 3 === 0 && bl[i].yuan !== 0) badSeq++;
  }
  eq([gap, notFutou, badYuan, badSeq], [0, 0, 0, 0], '块连续、每块从符头起、元与符头地支一致');
  // 只在芒种、大雪后置闰；每次闰正好 3 块
  const runTerms = new Set(bl.filter((b) => b.run).map((b) => b.term));
  eq([...runTerms].sort(), ['大雪', '芒种'], '只在芒种、大雪重复');
  const runCount = bl.filter((b) => b.run).length;
  ok(runCount % 3 === 0, '闰期以 3 块（15 天）为单位');
  // 超神天数范围：置闰只能在芒种/大雪做，且真实节气（定气）间隔 14.7–15.7 天不均匀，
  // 所以实际范围比“超神≤9、接气≤5”的理想窗口略宽
  const firsts = bl.filter((b) => !b.run && b.yuan === 0);
  const mn = Math.min(...firsts.map((b) => b.chao)), mx = Math.max(...firsts.map((b) => b.chao));
  ok(mn >= -8 && mx <= 15, `超神/接气范围合理（${mn}..${mx}）`);
  // 平均每 2.9 年闰一次：1990–2040 年之间 15..20 次
  const y = (b) => Q.beijingParts(b.termMs).y;
  const runs = bl.filter((b) => b.run && b.yuan === 0 && y(b) >= 1990 && y(b) < 2040).length;
  ok(runs >= 15 && runs <= 20, `1990–2039 年置闰次数 ${runs}（理论约 17）`);
  // 相邻节气首块相隔 15 天；闰后相隔 30 天
  let bad = 0;
  for (let i = 1; i < firsts.length; i++) {
    const dd = firsts[i].F0 - firsts[i - 1].F0;
    const hasRun = bl.some((b) => b.run && b.term === firsts[i - 1].term && b.termMs === firsts[i - 1].termMs);
    if (dd !== (hasRun ? 30 : 15)) bad++;
  }
  eq(bad, 0, '相邻节气首块间隔 15 天，闰后 30 天');
}

console.log('── 3. 置闰法的超神/接气（教程里的例子）──');
{
  // 2004-02-04 交立春，当天癸丑，符头己酉在 1 月 31 日：符头早于节气 4 天 → 超神 4 天
  const t = Q.termsOfYear(2004).find((x) => x.name === '立春');
  const j = J(t.ms + 3600000, 'zhirun');
  eq([j.chao.kind, j.chao.days], ['超神', 4], '2004 立春超神 4 天');
  eq(j.run, false, '非闰期');
  const c = J(t.ms + 3600000, 'chaibu');
  eq([c.chao.kind, c.chao.days], ['超神', 4], '拆补下的参考超神天数同为 4');
}
{
  // 超神期内，节气未到就已用新节气的局：2004-01-31（己酉日）起已是立春上元
  const j = J(bjms(2004, 1, 31, 12), 'zhirun');
  eq([j.termName, j.yuanName], ['立春', '上元'], '2004-01-31 置闰法已用立春上元（超神）');
  eq(J(bjms(2004, 1, 31, 12), 'chaibu').termName, '大寒', '同一天拆补法仍为大寒');
}
{
  // 闰期标记：找一个已知的闰块，检查芒种/大雪的局数重复
  const bl = Q.zhirunBlocks(9, 1880);
  const r = bl.find((b) => b.run && b.yuan === 0 && Q.beijingParts(b.termMs).y === 2024);
  ok(!!r, '2024 年有闰期');
  const m1 = bl[bl.indexOf(r) - 3];
  eq([m1.term, m1.run], [r.term, false], '闰块前紧挨着同节气的正常三块');
  const d = new Date((r.start - 2440588 + 0.0) * 86400000 + 12 * 3600000);  // 儒略日→UTC
  const msMid = (r.start - 2440587.5 + 0.5) * 86400000 - 8 * 3600000 + 12 * 3600000; // 当日北京中午
  const j = J(msMid, 'zhirun');
  eq([j.run, j.termName, j.yuanName], [true, r.term, '上元'], '闰期第一天：重复该节气上元');
  const ref = J(msMid - 15 * 86400000, 'zhirun');
  eq([ref.ju, ref.yang], [j.ju, j.yang], '闰期与此前 15 天局数相同');
}

console.log('── 4. 茅山法 ──');
{
  const t = Q.termsOfYear(2026).find((x) => x.name === '谷雨');
  const j0 = J(t.ms + 60000, 'maoshan');
  eq([j0.termName, j0.yuanName, j0.ju], ['谷雨', '上元', 5], '交节后 1 分钟：谷雨上元（阳5）');
  eq(j0.yang, true, '谷雨属阳遁');
  const H = 3600000;
  eq(J(t.ms + 119 * H, 'maoshan').yuanName, '上元', '119 小时仍为上元');
  eq(J(t.ms + 121 * H, 'maoshan').yuanName, '中元', '121 小时转中元');
  eq(J(t.ms + 121 * H, 'maoshan').ju, 2, '谷雨中元为 2 局');
  eq(J(t.ms + 241 * H, 'maoshan').yuanName, '下元', '241 小时转下元');
  eq(J(t.ms + 241 * H, 'maoshan').ju, 8, '谷雨下元为 8 局');
  // 下元用满而节气未到：继续用下元（谷雨到立夏约 15.2 天，下元从第 10 天起）
  const nx = Q.termsOfYear(2026).find((x) => x.name === '立夏');
  eq(J(nx.ms - 60000, 'maoshan').yuanName, '下元', '立夏交节前一分钟仍是谷雨下元');
  eq(J(nx.ms + 60000, 'maoshan').termName, '立夏', '立夏交节后换节气');
  eq(J(nx.ms + 60000, 'maoshan').yuanName, '上元', '新节气从上元开始');
  // 阈值可配置：每元 30 个时辰（=2.5 天）
  eq(J(t.ms + 61 * H, 'maoshan', { yuanShichen: 30 }).yuanName, '中元', '参数 yuanShichen=30 时 61 小时转中元');
  eq(J(t.ms + 61 * H, 'maoshan').yuanName, '上元', '默认参数 61 小时仍为上元');
}

console.log('── 5. 阈值可配置、全局切换 ──');
{
  const a = Q.zhirunBlocks(9, 1880), b = Q.zhirunBlocks(12, 1880);
  ok(a.length !== b.length || a.some((x, i) => x.term !== b[i].term || x.run !== b[i].run), 'chaoLimit 改变会得到不同的块表');
  Q.setMethod('maoshan');
  eq(Q.chart(bjms(2026, 4, 25, 12)).ju.method, 'maoshan', 'setMethod 后 chart 使用该方法');
  Q.setMethod('chaibu');
  eq(Q.chart(bjms(2026, 4, 25, 12)).ju.method, 'chaibu', '切回拆补');
  let threw = false; try { Q.setMethod('xxx'); } catch (e) { threw = true; } ok(threw, '未知方法报错');
}

console.log('── 6. 三种方法下盘面都能排出 ──');
{
  let n = 0, bad = 0;
  for (const m of ['chaibu', 'zhirun', 'maoshan']) for (let d = 0; d < 400; d += 7) for (const h of [1, 9, 15, 22]) {
    const ms = bjms(2026, 1, 1, h) + d * 86400000;
    const c = Q.chart(ms, { method: m }); n++;
    if (!c.plate || c.ju.ju < 1 || c.ju.ju > 9 || typeof c.ju.yang !== 'boolean') bad++;
  }
  eq(bad, 0, `${n} 个时刻三种方法都能起盘`);
}
console.log(`\n通过 ${pass}，失败 ${fail}`);
process.exitCode = fail ? 1 : 0;
