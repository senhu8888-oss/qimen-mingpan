/* 奇门命盘 · 排盘引擎
 * 时家转盘 · 拆补法（真拆补：节气取交节精确时刻，元取当日符头地支）
 * 浏览器与 Node 通用。所有输入时间按 UTC 毫秒传入；界面层负责把北京时间转成 UTC。
 * 适用范围：1900–2100 年。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Qimen = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ───────────── 基础常量 ───────────── */
  const TG = '甲乙丙丁戊己庚辛壬癸'.split('');
  const DZ = '子丑寅卯辰巳午未申酉戌亥'.split('');
  const SHENGXIAO = '鼠牛虎兔龙蛇马羊猴鸡狗猪'.split('');
  const WX_STEM = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  const WX_BRANCH = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']; // 地支本气
  const MS_DAY = 86400000;
  const BJ = 8 * 3600000;

  function gzIndex(stem, branch) {
    for (let i = stem; i < 60; i += 10) if (i % 12 === branch) return i;
    return -1;
  }
  function gzOf(idx) {
    return { idx, stem: TG[idx % 10], branch: DZ[idx % 12], gz: TG[idx % 10] + DZ[idx % 12], stemI: idx % 10, branchI: idx % 12 };
  }

  /* ───────────── 天文：太阳视黄经 → 二十四节气 ───────────── */
  const RAD = Math.PI / 180;
  const norm360 = (x) => ((x % 360) + 360) % 360;

  // ΔT（秒），Espenak & Meeus 多项式，1900–2150
  function deltaT(y) {
    let t;
    if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
    if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
    if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
    if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
    if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
    if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y);
  }

  const jdFromMs = (ms) => ms / MS_DAY + 2440587.5;

  // Meeus《Astronomical Algorithms》第25章，并加入行星/月球摄动修正项
  function sunApparentLon(jde, withPerturb) {
    const T = (jde - 2451545.0) / 36525;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * RAD;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
      + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    let lon = L0 + C;
    if (withPerturb) {
      const A = (153.23 + 22518.7541 * T) * RAD;
      const B = (216.57 + 45037.5082 * T) * RAD;
      const Cc = (312.69 + 32964.3577 * T) * RAD;
      const D = (350.74 + 445267.1142 * T - 0.00144 * T * T) * RAD;
      const E = (231.19 + 20.20 * T) * RAD;
      lon += 0.00134 * Math.cos(A) + 0.00154 * Math.cos(B) + 0.00200 * Math.cos(Cc)
        + 0.00179 * Math.sin(D) + 0.00178 * Math.sin(E);
    }
    const omega = (125.04 - 1934.136 * T) * RAD;
    lon = lon - 0.00569 - 0.00478 * Math.sin(omega);
    return norm360(lon);
  }

  /* 高精度：VSOP87D 地球日心黄经（Meeus《Astronomical Algorithms》附录 III 截断表）
   * 视黄经 = 日心黄经+180° + FK5 修正 + 章动 + 光行差。精度优于 1 角秒（≈0.4 分钟时间）。 */
  const VSOP_L = [
    [[175347046, 0, 0], [3341656, 4.6692568, 6283.0758500], [34894, 4.62610, 12566.15170], [3497, 2.7441, 5753.3849],
      [3418, 2.8289, 3.5231], [3136, 3.6277, 77713.7715], [2676, 4.4181, 7860.4194], [2343, 6.1352, 3930.2097],
      [1324, 0.7425, 11506.7698], [1273, 2.0371, 529.6910], [1199, 1.1096, 1577.3435], [990, 5.233, 5884.927],
      [902, 2.045, 26.298], [857, 3.508, 398.149], [780, 1.179, 5223.694], [753, 2.533, 5507.553],
      [505, 4.583, 18849.228], [492, 4.205, 775.523], [357, 2.920, 0.067], [317, 5.849, 11790.629],
      [284, 1.899, 796.298], [271, 0.315, 10977.079], [243, 0.345, 5486.778], [206, 4.806, 2544.314],
      [205, 1.869, 5573.143], [202, 2.458, 6069.777], [156, 0.833, 213.299], [132, 3.411, 2942.463],
      [126, 1.083, 20.775], [115, 0.645, 0.980], [103, 0.636, 4694.003], [102, 0.976, 15720.839],
      [102, 4.267, 7.114], [99, 6.21, 2146.17], [98, 0.68, 155.42], [86, 5.98, 161000.69],
      [85, 1.30, 6275.96], [85, 3.67, 71430.70], [80, 1.81, 17260.15], [79, 3.04, 12036.46],
      [75, 1.76, 5088.63], [74, 3.50, 3154.69], [74, 4.68, 801.82], [70, 0.83, 9437.76],
      [62, 3.98, 8827.39], [61, 1.82, 7084.90], [57, 2.78, 6286.60], [56, 4.39, 14143.50],
      [56, 3.47, 6279.55], [52, 0.19, 12139.55], [52, 1.33, 1748.02], [51, 0.28, 5856.48],
      [49, 0.49, 1194.45], [41, 5.37, 8429.24], [41, 2.40, 19651.05], [39, 6.17, 10447.39],
      [37, 6.04, 10213.29], [37, 2.57, 1059.38], [36, 1.71, 2352.87], [36, 1.78, 6812.77],
      [33, 0.59, 17789.85], [30, 0.44, 83996.85], [30, 2.74, 1349.87], [25, 3.16, 4690.48]],
    [[628331966747, 0, 0], [206059, 2.678235, 6283.075850], [4303, 2.6351, 12566.1517], [425, 1.590, 3.523],
      [119, 5.796, 26.298], [109, 2.966, 1577.344], [93, 2.59, 18849.23], [72, 1.14, 529.69],
      [68, 1.87, 398.15], [67, 4.41, 5507.55], [59, 2.89, 5223.69], [56, 2.17, 155.42],
      [45, 0.40, 796.30], [36, 0.47, 775.52], [29, 2.65, 7.11], [21, 5.34, 0.98],
      [19, 1.85, 5486.78], [19, 4.97, 213.30], [17, 2.99, 6275.96], [16, 0.03, 2544.31],
      [16, 1.43, 2146.17], [15, 1.21, 10977.08], [12, 2.83, 1748.02], [12, 3.26, 5088.63],
      [12, 5.27, 1194.45], [12, 2.08, 4694.00], [11, 0.77, 553.57], [10, 1.30, 6286.60],
      [10, 4.24, 1349.87], [9, 2.70, 242.73], [9, 5.64, 951.72], [8, 5.30, 2352.87],
      [6, 2.65, 9437.76], [6, 4.67, 4690.48]],
    [[52919, 0, 0], [8720, 1.0721, 6283.0758], [309, 0.867, 12566.152], [27, 0.05, 3.52], [16, 5.19, 26.30],
      [16, 3.68, 155.42], [10, 0.76, 18849.23], [9, 2.06, 77713.77], [7, 0.83, 775.52], [5, 4.66, 1577.34],
      [4, 1.03, 7.11], [4, 3.44, 5573.14], [3, 5.14, 796.30], [3, 6.05, 5507.55], [3, 1.19, 242.73],
      [3, 6.12, 529.69], [3, 0.31, 398.15], [3, 2.28, 553.57], [2, 4.38, 5223.69], [2, 3.75, 0.98]],
    [[289, 5.844, 6283.076], [35, 0, 0], [17, 5.49, 12566.15], [3, 5.20, 155.42], [1, 4.72, 3.52],
      [1, 5.30, 18849.23], [1, 5.97, 242.73]],
    [[114, 3.142, 0], [8, 4.13, 6283.08], [1, 3.84, 12566.15]],
    [[1, 3.14, 0]]
  ];
  const VSOP_R = [
    [[100013989, 0, 0], [1670700, 3.0984635, 6283.0758500], [13956, 3.05525, 12566.15170], [3084, 5.1985, 77713.7715],
      [1628, 1.1739, 5753.3849], [1576, 2.8469, 7860.4194], [925, 5.453, 11506.770], [542, 4.564, 3930.210]],
    [[103019, 1.107490, 6283.075850], [1721, 1.0644, 12566.1517]]
  ];
  function vsopSum(tbl, tau) {
    let total = 0;
    for (let k = 0; k < tbl.length; k++) {
      let s = 0;
      for (const [A, B, C] of tbl[k]) s += A * Math.cos(B + C * tau);
      total += s * Math.pow(tau, k);
    }
    return total / 1e8;
  }
  function sunApparentLonVSOP(jde) {
    const tau = (jde - 2451545.0) / 365250;
    const T = tau * 10;
    const Lh = vsopSum(VSOP_L, tau);                       // 日心黄经（弧度）
    const R = vsopSum(VSOP_R, tau);                        // 日地距离（AU）
    let lon = norm360(Lh / RAD + 180);                     // 几何黄经
    lon += -0.09033 / 3600;                                // 转到 FK5
    const Om = (125.04452 - 1934.136261 * T) * RAD;
    const L1 = (280.4665 + 36000.7698 * T) * RAD;
    const Lm = (218.3165 + 481267.8813 * T) * RAD;
    const dpsi = (-17.20 * Math.sin(Om) - 1.32 * Math.sin(2 * L1) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * Om)) / 3600; // 章动（度）
    lon += dpsi - 20.4898 / R / 3600;                      // 章动 + 光行差
    return norm360(lon);
  }

  let MODE = 'vsop';
  function sunLonAtMs(ms) {
    const d = new Date(ms);
    const yf = d.getUTCFullYear() + d.getUTCMonth() / 12;
    const jde = jdFromMs(ms) + deltaT(yf) / 86400;
    return MODE === 'vsop' ? sunApparentLonVSOP(jde) : sunApparentLon(jde, false);
  }

  // 按日历顺序：小寒 … 冬至；jie=true 表示“节”（月令起点），其余为“气”
  const TERMS = [
    { name: '小寒', lon: 285, jie: true }, { name: '大寒', lon: 300 },
    { name: '立春', lon: 315, jie: true }, { name: '雨水', lon: 330 },
    { name: '惊蛰', lon: 345, jie: true }, { name: '春分', lon: 0 },
    { name: '清明', lon: 15, jie: true }, { name: '谷雨', lon: 30 },
    { name: '立夏', lon: 45, jie: true }, { name: '小满', lon: 60 },
    { name: '芒种', lon: 75, jie: true }, { name: '夏至', lon: 90 },
    { name: '小暑', lon: 105, jie: true }, { name: '大暑', lon: 120 },
    { name: '立秋', lon: 135, jie: true }, { name: '处暑', lon: 150 },
    { name: '白露', lon: 165, jie: true }, { name: '秋分', lon: 180 },
    { name: '寒露', lon: 195, jie: true }, { name: '霜降', lon: 210 },
    { name: '立冬', lon: 225, jie: true }, { name: '小雪', lon: 240 },
    { name: '大雪', lon: 255, jie: true }, { name: '冬至', lon: 270 }
  ];

  function solveTerm(year, targetLon) {
    const off = targetLon >= 285 ? targetLon - 360 : targetLon; // 小寒…惊蛰在春分之前
    let ms = Date.UTC(year, 2, 20, 12, 0, 0) + (off / 360) * 365.2422 * MS_DAY;
    for (let i = 0; i < 10; i++) {
      const diff = ((targetLon - sunLonAtMs(ms) + 540) % 360) - 180;
      ms += (diff / 0.98565) * MS_DAY;
      if (Math.abs(diff) < 1e-8) break;
    }
    return ms;
  }

  const termCache = new Map();
  function termsOfYear(y) {
    const key = y + MODE;
    if (!termCache.has(key)) termCache.set(key, TERMS.map((t) => ({ name: t.name, lon: t.lon, jie: !!t.jie, ms: solveTerm(y, t.lon) })));
    return termCache.get(key);
  }

  /* ───────────── 时间工具 ───────────── */
  function jdnCivil(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }
  const utcFromBeijing = (y, mo, d, h, mi, s) => Date.UTC(y, mo - 1, d, h, mi, s || 0) - BJ;
  function beijingParts(ms) {
    const dt = new Date(ms + BJ);
    return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes(), wd: dt.getUTCDay() };
  }
  function termsAround(ms) {
    const y = beijingParts(ms).y;
    return [].concat(termsOfYear(y - 1), termsOfYear(y), termsOfYear(y + 1));
  }
  function termAt(ms) {
    const list = termsAround(ms);
    let idx = 0;
    for (let i = 0; i < list.length; i++) { if (list[i].ms <= ms) idx = i; else break; }
    return { cur: list[idx], prev: list[idx - 1], next: list[idx + 1], list, idx };
  }

  // 均时差（分钟），仅用于可选的真太阳时校正
  function equationOfTimeMin(ms) {
    const d = new Date(ms);
    const N = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / MS_DAY);
    const B = (2 * Math.PI * (N - 81)) / 364;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }
  // lon 为 null → 按北京时间；否则换算为出生地真太阳时
  function clockMs(utMs, lon) {
    if (lon === null) return utMs + BJ;
    return utMs + lon * 4 * 60000 + equationOfTimeMin(utMs) * 60000;
  }

  /* ───────────── 四柱 ───────────── */
  const JIE_ORDER = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

  function pillars(utMs, lon) {
    const cd = new Date(clockMs(utMs, lon));
    const c = { y: cd.getUTCFullYear(), mo: cd.getUTCMonth() + 1, d: cd.getUTCDate(), h: cd.getUTCHours(), mi: cd.getUTCMinutes() };
    // 日柱：23:00 换日（晚子时计入次日）
    let jd = jdnCivil(c.y, c.mo, c.d);
    if (c.h >= 23) jd += 1;
    const dayIdx = (((jd - 2451545 + 54) % 60) + 60) % 60; // 2000-01-01 为戊午日(54)
    // 时柱：五鼠遁
    const hb = Math.floor(((c.h + 1) % 24) / 2);
    const hs = (((dayIdx % 10) % 5) * 2 + hb) % 10;
    const hourIdx = gzIndex(hs, hb);
    // 年柱：以立春交节时刻为界；月柱：以“节”为界，五虎遁
    const ta = termAt(utMs);
    let lichun = null; let jie = null;
    for (let i = ta.idx; i >= 0; i--) {
      if (!lichun && ta.list[i].name === '立春') lichun = ta.list[i];
      if (!jie && ta.list[i].jie) jie = ta.list[i];
      if (lichun && jie) break;
    }
    const yEff = beijingParts(lichun.ms).y;
    const yearIdx = (((yEff - 4) % 60) + 60) % 60;
    const mN = JIE_ORDER.indexOf(jie.name);
    const mStem = (((yearIdx % 10) % 5) * 2 + 2 + mN) % 10;
    const monthIdx = gzIndex(mStem, (2 + mN) % 12);
    return {
      year: gzOf(yearIdx), month: gzOf(monthIdx), day: gzOf(dayIdx), hour: gzOf(hourIdx),
      yEff, clock: c, usedTrueSolar: lon !== null, jieName: jie.name
    };
  }

  /* ───────────── 阴阳遁与局数（拆补法） ───────────── */
  const JU_TABLE = {
    冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 惊蛰: [1, 7, 4],
    春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9],
    夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6],
    秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1]
  };
  const YANG_TERMS = new Set(['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种']);
  const YUAN_NAME = ['上元', '中元', '下元'];

  function computeJu(utMs, dayIdx) {
    const ta = termAt(utMs);
    const termName = ta.cur.name;
    const futouIdx = (((dayIdx - ((dayIdx % 10) % 5)) % 60) + 60) % 60; // 最近的甲/己日
    const fb = futouIdx % 12;
    const yuan = [0, 6, 3, 9].includes(fb) ? 0 : [2, 8, 5, 11].includes(fb) ? 1 : 2;
    return {
      termName, term: ta.cur, nextTerm: ta.next, prevTerm: ta.prev,
      yang: YANG_TERMS.has(termName), ju: JU_TABLE[termName][yuan],
      yuan, yuanName: YUAN_NAME[yuan], futou: gzOf(futouIdx), daysSinceFutou: (dayIdx % 10) % 5, ta
    };
  }

  /* ───────────── 起盘（时家转盘） ───────────── */
  const RING = [1, 8, 3, 4, 9, 2, 7, 6]; // 外圈八宫，顺时针（坎→艮→震→巽→离→坤→兑→乾）
  const PALACE_NAME = { 1: '坎一宫', 2: '坤二宫', 3: '震三宫', 4: '巽四宫', 5: '中五宫', 6: '乾六宫', 7: '兑七宫', 8: '艮八宫', 9: '离九宫' };
  const PALACE_SHORT = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  const PALACE_DIR = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南' };
  const PALACE_EL = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const STAR_HOME = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  const DOOR_HOME = { 1: '休', 2: '死', 3: '伤', 4: '杜', 6: '开', 7: '惊', 8: '生', 9: '景' };
  const EARTH_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];
  const LIUYI = ['戊', '己', '庚', '辛', '壬', '癸']; // 甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸
  const DEITIES = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const BRANCH_PALACE = { 0: 1, 1: 8, 2: 8, 3: 3, 4: 4, 5: 4, 6: 9, 7: 2, 8: 2, 9: 7, 10: 6, 11: 6 };

  function buildPlate({ yang, ju, hourIdx }) {
    const hourStemI = hourIdx % 10;
    const xun = Math.floor(hourIdx / 10) * 10;
    const yi = LIUYI[xun / 10];
    // 地盘：戊落局数宫，阳遁顺（宫数递增）、阴遁逆
    const earth = {};
    for (let i = 0; i < 9; i++) {
      const p = yang ? ((ju - 1 + i) % 9) + 1 : ((((ju - 1 - i) % 9) + 9) % 9) + 1;
      earth[p] = EARTH_ORDER[i];
    }
    const palaceOfEarth = {};
    Object.keys(earth).forEach((p) => { palaceOfEarth[earth[p]] = +p; });
    const H = palaceOfEarth[yi];              // 旬首六仪所在地盘宫
    const Hring = H === 5 ? 2 : H;            // 中五寄坤二
    const hourStem = TG[hourStemI];
    const effStem = hourStem === '甲' ? yi : hourStem; // 甲遁于六仪
    const T0 = palaceOfEarth[effStem];
    const T = T0 === 5 ? 2 : T0;              // 值符星落宫（时干所在地盘宫）
    // 天盘：九星整体转动，使值符星到达 T；各星携带原宫地盘干
    const starShift = (RING.indexOf(T) - RING.indexOf(Hring) + 8) % 8;
    const heaven = {};
    RING.forEach((q, i) => {
      const dest = RING[(i + starShift) % 8];
      heaven[dest] = { star: STAR_HOME[q], stem: earth[q], from: q };
    });
    const qinDest = RING[(RING.indexOf(2) + starShift) % 8]; // 天禽寄坤二，随天芮
    heaven[qinDest].rider = '天禽';
    heaven[qinDest].stem2 = earth[5];
    // 人盘：值使门从旬首宫起，按时辰数阳顺阴逆走九宫定落点，其余七门依序随转
    const steps = hourIdx - xun;
    const Td0 = yang ? ((H - 1 + steps) % 9) + 1 : ((((H - 1 - steps) % 9) + 9) % 9) + 1;
    const Td = Td0 === 5 ? 2 : Td0;
    const doorShift = (RING.indexOf(Td) - RING.indexOf(Hring) + 8) % 8;
    const doors = {};
    RING.forEach((q, i) => { doors[RING[(i + doorShift) % 8]] = DOOR_HOME[q]; });
    // 神盘：值符神随值符星，阳遁顺布、阴遁逆布
    const deities = {};
    const ds = RING.indexOf(T);
    DEITIES.forEach((nm, j) => { deities[RING[yang ? (ds + j) % 8 : (ds - j + 8) % 8]] = nm; });
    // 旬空与驿马
    const xb = xun % 12;
    const kongBranches = [(xb + 10) % 12, (xb + 11) % 12];
    const kong = [...new Set(kongBranches.map((b) => BRANCH_PALACE[b]))];
    const hb = hourIdx % 12;
    const horseBranch = [8, 0, 4].includes(hb) ? 2 : [2, 6, 10].includes(hb) ? 8 : [5, 9, 1].includes(hb) ? 11 : 5;
    return {
      yang, ju, hourIdx, xunIdx: xun, xunName: gzOf(xun).gz, yi, effStem,
      earth, palaceOfEarth, heaven, doors, deities,
      zhifu: { star: H === 5 ? '天禽' : STAR_HOME[H], ringStar: STAR_HOME[Hring], home: H, land: T },
      zhishi: { door: H === 5 ? '死' : DOOR_HOME[H], home: H, land: Td, steps },
      starShift, doorShift,
      fuyin: T === Hring, fanyin: starShift === 4,
      kong, kongBranches: kongBranches.map((b) => DZ[b]), horse: BRANCH_PALACE[horseBranch], horseBranch: DZ[horseBranch]
    };
  }

  /* ───────────── 吉凶规则（透明、可查） ───────────── */
  const DOOR_BASE = { 开: 3, 休: 3, 生: 3, 景: 1, 杜: -1, 伤: -2, 惊: -2, 死: -3 };
  const STAR_BASE = { 天辅: 2, 天禽: 2, 天心: 2, 天任: 1, 天冲: 1, 天英: -1, 天柱: -1, 天蓬: -2, 天芮: -2 };
  const DEITY_BASE = { 值符: 2, 太阴: 2, 六合: 2, 九地: 1, 九天: 1, 螣蛇: -1, 白虎: -2, 玄武: -2 };
  const DOOR_LABEL = { 开: '大吉', 休: '大吉', 生: '大吉', 景: '小吉', 杜: '小凶', 伤: '凶', 惊: '凶', 死: '大凶' };
  const STAR_LABEL = { 天辅: '大吉', 天禽: '大吉', 天心: '大吉', 天任: '小吉', 天冲: '小吉', 天英: '小凶', 天柱: '小凶', 天蓬: '大凶', 天芮: '大凶' };
  const DEITY_LABEL = { 值符: '吉', 太阴: '吉', 六合: '吉', 九地: '吉', 九天: '吉', 螣蛇: '凶', 白虎: '凶', 玄武: '凶' };
  const STAR_EL = { 天蓬: '水', 天芮: '土', 天冲: '木', 天辅: '木', 天禽: '土', 天心: '金', 天柱: '金', 天任: '土', 天英: '火' };
  const DOOR_EL = { 休: '水', 生: '土', 伤: '木', 杜: '木', 景: '火', 死: '土', 惊: '金', 开: '金' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const JIXING = { 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 };

  const STAR_INFO = {
    天蓬: '机变多谋，亦主冒险、失散。', 天芮: '谨慎多虑，主病滞、不顺，宜调养。', 天冲: '果敢急进，行动力强，利速战速决。',
    天辅: '文雅好学，利文教、求学、得贵人。', 天禽: '中正居中，调和稳重，福泽深厚。', 天心: '谋略决策，利医药、管理、定计。',
    天柱: '口才锋利，主口舌、破损，宜守不宜攻。', 天任: '稳重厚道，利置业、积累、踏实推进。', 天英: '热情外放，利名声文书，但易急躁。'
  };
  const DOOR_INFO = {
    休: '休养安泰，利见贵人、谈判、静养。', 生: '生发之门，利求财、经营、成长。', 伤: '主竞争损伤，利追讨、竞技，不利求安。',
    杜: '闭塞隐藏，利隐秘、防守，不利公开推进。', 景: '文书名声，利考试、宣传、展示，易流于虚。', 死: '终结停滞，宜了结旧事，诸事难进。',
    惊: '惊疑口舌，易生变故，宜谨慎沟通。', 开: '开创通达，利事业、求职、出行、开业。'
  };
  const DEITY_INFO = {
    值符: '贵人庇护，居中主事，逢之多得助力。', 螣蛇: '虚惊缠绕，事多反复、疑虑。', 太阴: '暗中相助，利谋划、柔性处理。',
    六合: '和合协作，利合作、人缘、婚恋。', 白虎: '刚猛主争斗，防冲突、伤损。', 玄武: '暗昧不明，防欺瞒、失窃。',
    九地: '沉稳潜藏，利守成、蓄力。', 九天: '高远主动，利进取、扬名、远行。'
  };

  // 天盘干(h) 加 地盘干(e) 的固定格局
  const COMBOS = [
    { h: '戊', e: '丙', name: '青龙返首', s: 3, d: '天盘戊加地盘丙，主财运与行动皆有利。' },
    { h: '丙', e: '戊', name: '飞鸟跌穴', s: 3, d: '天盘丙加地盘戊，主谋事顺遂、有意外之喜。' },
    { h: '乙', e: '辛', name: '青龙逃走', s: -3, d: '天盘乙加地盘辛，主人财两失、事不稳。' },
    { h: '辛', e: '乙', name: '白虎猖狂', s: -3, d: '天盘辛加地盘乙，主争斗伤损、家宅不安。' },
    { h: '癸', e: '丁', name: '螣蛇夭矫', s: -3, d: '天盘癸加地盘丁，主缠绕纠葛、文书口舌。' },
    { h: '丁', e: '癸', name: '朱雀投江', s: -3, d: '天盘丁加地盘癸，主消息落空、文书有失。' },
    { h: '庚', e: '丙', name: '太白入荧', s: -3, d: '天盘庚加地盘丙，主阻力与损耗。' },
    { h: '丙', e: '庚', name: '荧入太白', s: -3, d: '天盘丙加地盘庚，主阻碍、事多折损。' },
    { h: '庚', e: '癸', name: '大格', s: -2, d: '天盘庚加地盘癸，主道路受阻、诸事难行。' },
    { h: '庚', e: '壬', name: '小格', s: -2, d: '天盘庚加地盘壬，主行事反复、易生变动。' },
    { h: '庚', e: '己', name: '刑格', s: -2, d: '天盘庚加地盘己，主官非口舌、受制于人。' },
    { h: '庚', e: '庚', name: '战格', s: -2, d: '天盘庚加地盘庚，主冲突对抗。' }
  ];

  function lvlClass(label) { return label.includes('吉') ? 'good' : label.includes('凶') ? 'bad' : 'mid'; }

  // 校准常数：把各类分数在 2026 全年 4380 个时辰里的中位数对齐到 50（由 calibrate.js 生成）。
  // 目的：让热力图的颜色反映“相对该领域的平常水平好或差”，而不是被规则里的固定加分抬高。
  const CAL = { overall: -0.6, palace: 0, personal: -1, wealth: 2, career: 1, people: 1, study: 0, health: 2, travel: 0.5 };

  function analyze(pl, P) {
    const dI = P.day.idx % 10, hI = P.hour.idx % 10;
    const dayStemEff = dI === 0 ? LIUYI[Math.floor(P.day.idx / 10)] : TG[dI];
    const hourStemEff = pl.effStem;
    const wubuyu = hI === (dI + 6) % 10; // 五不遇时：时干克日干（同性相克）
    const palaces = {};
    const patterns = [];
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) {
      const hv = pl.heaven[p];
      const star = hv.star, door = pl.doors[p], deity = pl.deities[p];
      const hs = hv.stem, es = pl.earth[p];
      const notes = [];
      let raw = DOOR_BASE[door] + STAR_BASE[star] + DEITY_BASE[deity];
      const add = (text, s, kind, name) => { notes.push({ text, s, kind }); raw += s; if (name) patterns.push({ name, p, s, kind, text }); };
      COMBOS.forEach((c) => { if (c.h === hs && c.e === es) add(`${c.name}：${c.d}`, c.s, c.s > 0 ? 'good' : 'bad', c.name); });
      if (hs === '庚' && es === dayStemEff && dayStemEff !== '庚') add('伏干格：天盘庚加地盘日干，主自身受阻。', -3, 'bad', '伏干格');
      if (es === '庚' && hs === dayStemEff && dayStemEff !== '庚') add('飞干格：天盘日干加地盘庚，主行动受制。', -3, 'bad', '飞干格');
      if (hs === '丙' && door === '生' && es === '丁') add('天遁：丙奇、生门、地盘丁奇同宫，利谋划与求财。', 3, 'good', '天遁');
      if (hs === '乙' && door === '开' && es === '己') add('地遁：乙奇、开门、地盘己同宫，利开创与守成。', 3, 'good', '地遁');
      if (hs === '丁' && door === '休' && deity === '太阴') add('人遁：丁奇、休门、太阴同宫，利求贵人与谈判。', 3, 'good', '人遁');
      if (hs === '丙' && door === '生' && deity === '九天') add('神遁：丙奇、生门、九天同宫，利进取与扬名。', 3, 'good', '神遁');
      if (hs === '丁' && door === '杜' && deity === '九地') add('鬼遁：丁奇、杜门、九地同宫，利隐藏与暗中行事。', 2, 'good', '鬼遁');
      if (['乙', '丙', '丁'].includes(hs) && !notes.some((n) => n.s < 0)) add(`三奇临宫（天盘${hs}奇）。`, 1, 'good');
      const dEl = DOOR_EL[door], pEl = PALACE_EL[p];
      if (KE[dEl] === pEl) add(`门迫：${door}门（${dEl}）克${PALACE_SHORT[p]}宫（${pEl}），门力受制。`, -2, 'bad', '门迫');
      else if (SHENG[dEl] === pEl) add(`门生宫：${door}门（${dEl}）生${PALACE_SHORT[p]}宫（${pEl}），门力得助。`, 1, 'good');
      if (JIXING[hs] === p) add(`六仪击刑：天盘${hs}落${PALACE_SHORT[p]}宫。`, -2, 'bad', '击刑');
      if (pl.kong.includes(p)) add('旬空：此宫落空亡，吉凶之力减弱、事难落实。', -2, 'bad', '空亡');
      palaces[p] = {
        p, name: PALACE_NAME[p], dir: PALACE_DIR[p], star, door, deity, heavenStem: hs, heavenStem2: hv.stem2 || null, earthStem: es,
        rider: hv.rider || null, notes, raw,
        starLabel: STAR_LABEL[star], doorLabel: DOOR_LABEL[door], deityLabel: DEITY_LABEL[deity],
        isZhifu: pl.zhifu.land === p, isZhishi: pl.zhishi.land === p, isKong: pl.kong.includes(p), isHorse: pl.horse === p
      };
      palaces[p].pct = toPct(raw, CAL.palace);
    }
    // 中五宫：只展示
    palaces[5] = { p: 5, name: PALACE_NAME[5], dir: '中', star: '天禽', earthStem: pl.earth[5], notes: [], raw: 0, pct: 50, center: true };

    const findPalace = (fn) => { for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) if (fn(palaces[p])) return p; return null; };
    const palaceOfHeavenStem = (st) => findPalace((x) => x.heavenStem === st || x.heavenStem2 === st);
    const hourPalace = palaceOfHeavenStem(hourStemEff);
    const dayPalace = palaceOfHeavenStem(dayStemEff);
    const zf = pl.zhifu.land, zs = pl.zhishi.land;

    const boardAdj = (pl.fuyin ? -1 : 0) + (pl.fanyin ? -2 : 0) + (wubuyu ? -3 : 0);
    const flags = [];
    if (pl.fuyin) flags.push({ name: '伏吟', kind: 'bad', text: '值符星落回本宫，天地盘相同，主停滞、守旧，宜静不宜动。' });
    if (pl.fanyin) flags.push({ name: '反吟', kind: 'bad', text: '值符星落对冲宫，天地盘相反，主反复、变动、事多周折。' });
    if (wubuyu) flags.push({ name: '五不遇时', kind: 'bad', text: '时干克日干，传统视为不宜起事的时辰。' });

    const overallRaw = 0.35 * palaces[zs].raw + 0.25 * palaces[zf].raw
      + 0.2 * (hourPalace ? palaces[hourPalace].raw : palaces[zs].raw)
      + 0.2 * (dayPalace ? palaces[dayPalace].raw : palaces[zf].raw) + boardAdj;
    const overall = toPct(overallRaw, CAL.overall);

    const pick = (fn) => findPalace(fn);
    const doorPalace = (d) => pick((x) => x.door === d);
    const starPalace = (s) => pick((x) => x.star === s);
    const deityPalace = (g) => pick((x) => x.deity === g);
    const domainDefs = [
      { key: 'wealth', name: '财运', basis: '生门所在宫', sel: [doorPalace('生')] },
      { key: 'career', name: '事业', basis: '开门宫 + 值符宫', sel: [doorPalace('开'), zf] },
      { key: 'people', name: '人缘感情', basis: '六合宫 + 太阴宫', sel: [deityPalace('六合'), deityPalace('太阴')] },
      { key: 'study', name: '学业考试', basis: '景门宫 + 天辅宫', sel: [doorPalace('景'), starPalace('天辅')] },
      { key: 'health', name: '健康', basis: '天心宫 + 休门宫', sel: [starPalace('天心'), doorPalace('休')] },
      { key: 'travel', name: '出行', basis: '开门宫 + 驿马宫', sel: [doorPalace('开'), pl.horse] }
    ];
    const domains = domainDefs.map((d) => {
      const ps = d.sel.filter((x) => x && palaces[x]);
      const raw = ps.reduce((a, x) => a + palaces[x].raw, 0) / Math.max(ps.length, 1) + boardAdj;
      return { key: d.key, name: d.name, basis: d.basis, palaces: ps, raw, pct: toPct(raw, CAL[d.key]), best: ps[0] };
    });

    const ranked = [1, 2, 3, 4, 6, 7, 8, 9].slice().sort((a, b) => palaces[b].raw - palaces[a].raw || DOOR_BASE[palaces[b].door] - DOOR_BASE[palaces[a].door]);
    const goodDirs = ranked.slice(0, 2);
    const badDirs = ranked.slice(-1);

    // 判断依据
    const reasons = [];
    const desc = (p) => `${palaces[p].name}（${palaces[p].dir}）`;
    reasons.push(`值使${pl.zhishi.door}门（${DOOR_LABEL[pl.zhishi.door]}）临${desc(zs)}，主事之门，权重最高。`);
    reasons.push(`值符${pl.zhifu.star}（${STAR_LABEL[pl.zhifu.star]}）落${desc(zf)}，同宫神为${palaces[zf].deity}（${palaces[zf].deityLabel}）。`);
    [zs, zf].forEach((p) => palaces[p].notes.forEach((n) => reasons.push(`${PALACE_SHORT[p]}宫：${n.text}`)));
    flags.forEach((f) => reasons.push(`${f.name}：${f.text}`));

    return {
      dayStemEff, hourStemEff, wubuyu, palaces, patterns, flags, boardAdj,
      hourPalace, dayPalace, overallRaw, overall, verdict: verdictOf(overall),
      domains, ranked, goodDirs, badDirs, reasons
    };
  }

  function toPct(raw, mid) { return Math.max(3, Math.min(97, Math.round(50 + (raw - (mid || 0)) * 4.5))); }
  function verdictOf(pct) {
    if (pct >= 68) return { word: '大吉', cls: 'good', advice: '宜主动进取，重要的事择吉方行动。' };
    if (pct >= 58) return { word: '小吉', cls: 'good', advice: '顺势而为，重要事项挑吉时处理。' };
    if (pct >= 43) return { word: '平', cls: 'mid', advice: '稳中求进，不宜冒进。' };
    if (pct >= 33) return { word: '小凶', cls: 'bad', advice: '谨慎行事，少做重大决定。' };
    return { word: '凶', cls: 'bad', advice: '宜静守，避开冲突与冒险。' };
  }

  /* ───────────── 总装：给定时刻起盘 ───────────── */
  function normLon(lon) {
    if (lon === null || lon === undefined || lon === '') return null;
    const v = Number(lon);
    return Number.isFinite(v) ? v : null;
  }

  function chart(utMs, opts) {
    opts = opts || {};
    const lon = normLon(opts.lon);
    const P = pillars(utMs, lon);
    const J = computeJu(utMs, P.day.idx);
    const plate = buildPlate({ yang: J.yang, ju: J.ju, hourIdx: P.hour.idx });
    const an = analyze(plate, P);
    // 与最近节气交接的距离（分钟），用于提示边界风险
    const ta = J.ta;
    const dPrev = (utMs - ta.cur.ms) / 60000;
    const dNext = (ta.next.ms - utMs) / 60000;
    const edge = Math.min(dPrev, dNext) < 15 ? { term: dPrev <= dNext ? ta.cur.name : ta.next.name, minutes: dPrev <= dNext ? Math.round(dPrev) : Math.round(dNext), before: dPrev > dNext } : null;
    const bj = beijingParts(utMs);
    return { utMs, bj, lon, pillars: P, ju: J, plate, analysis: an, edge, sunLon: sunLonAtMs(utMs) };
  }

  // 读盘播报：对应原提示词第 18、19 句，由排盘结果自动生成
  function narrate(c) {
    const b = c.bj; const pl = c.plate; const J = c.ju;
    const hh = String(b.h).padStart(2, '0') + ':' + String(b.mi).padStart(2, '0');
    return `${b.y}年${b.mo}月${b.d}日 ${hh}，${J.termName}，${J.yang ? '阳' : '阴'}遁${J.ju}局，${J.yuanName}。`
      + `值符${pl.zhifu.star}，落${PALACE_NAME[pl.zhifu.land]}；值使${pl.zhishi.door}门，临${PALACE_NAME[pl.zhishi.land]}。`;
  }

  /* ───────────── 一日十二时辰 ───────────── */
  const SHICHEN = [
    { name: '子', range: '23:00–01:00', startH: -1 }, { name: '丑', range: '01:00–03:00', startH: 1 },
    { name: '寅', range: '03:00–05:00', startH: 3 }, { name: '卯', range: '05:00–07:00', startH: 5 },
    { name: '辰', range: '07:00–09:00', startH: 7 }, { name: '巳', range: '09:00–11:00', startH: 9 },
    { name: '午', range: '11:00–13:00', startH: 11 }, { name: '未', range: '13:00–15:00', startH: 13 },
    { name: '申', range: '15:00–17:00', startH: 15 }, { name: '酉', range: '17:00–19:00', startH: 17 },
    { name: '戌', range: '19:00–21:00', startH: 19 }, { name: '亥', range: '21:00–23:00', startH: 21 }
  ];
  // 日柱按 23:00 换日：本日“子时”从前一日 23:00 开始
  function daily(y, mo, d, opts) {
    return SHICHEN.map((s, i) => {
      const startMs = utcFromBeijing(y, mo, d, 0, 0, 0) + s.startH * 3600000;
      const ms = startMs + 5 * 60000; // 取时辰开始后 5 分钟
      const c = chart(ms, opts);
      return { i, ...s, startMs, endMs: startMs + 2 * 3600000, ms, chart: c };
    });
  }
  function shichenIndexOf(ms) {
    const b = beijingParts(ms);
    return Math.floor(((b.h + 1) % 24) / 2);
  }

  /* ───────────── 生辰命盘 ───────────── */
  function digitRoot(n) { while (n > 9) n = String(n).split('').reduce((a, c) => a + +c, 0); return n; }
  // 八宅命卦（风水概念，不是奇门的年命宫，仅作附加信息）：按立春年；中五男寄坤二、女寄艮八
  function mingGua(yEff, gender) {
    const s = digitRoot(yEff);
    let r;
    if (gender === 'M') { r = yEff < 2000 ? 11 - s : 9 - s; } else { r = yEff < 2000 ? s + 4 : s + 6; }
    while (r > 9) r -= 9;
    while (r < 1) r += 9;
    const num = r === 5 ? (gender === 'M' ? 2 : 8) : r;
    return { num, name: PALACE_SHORT[num], group: [1, 3, 4, 9].includes(num) ? '东四命' : '西四命' };
  }
  function wuxingCount(P) {
    const cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    [P.year, P.month, P.day, P.hour].forEach((x) => { cnt[WX_STEM[x.stemI]]++; cnt[WX_BRANCH[x.branchI]]++; });
    return cnt;
  }
  function birthProfile(utMs, opts) {
    opts = opts || {};
    const c = chart(utMs, { lon: opts.lon });
    const P = c.pillars;
    const prof = {
      chart: c, shengxiao: SHENGXIAO[P.year.branchI], wuxing: wuxingCount(P),
      dayMaster: { stem: P.day.stem, el: WX_STEM[P.day.stemI], yin: P.day.stemI % 2 === 1 }
    };
    // 奇门年命宫：以出生年支所在宫为准；日干为“自身”
    prof.mingPalace = BRANCH_PALACE[P.year.branchI];
    prof.mingStemEff = c.analysis.dayStemEff;
    if (opts.gender === 'M' || opts.gender === 'F') { prof.gender = opts.gender; prof.gua = mingGua(P.yEff, opts.gender); }
    return prof;
  }
  // 个人化：以年命宫、日干在“当时盘”中的表现评分（各占一半，再计伏吟/反吟/五不遇时）
  function personalScore(chartNow, prof) {
    if (!prof) return null;
    const an = chartNow.analysis;
    const pMing = prof.mingPalace;
    const stem = prof.mingStemEff;
    let pStem = null;
    for (const p of [1, 2, 3, 4, 6, 7, 8, 9]) { const x = an.palaces[p]; if (x.heavenStem === stem || x.heavenStem2 === stem) { pStem = p; break; } }
    const rawM = an.palaces[pMing].raw;
    const rawS = pStem ? an.palaces[pStem].raw : rawM;
    const raw = 0.5 * rawM + 0.5 * rawS + an.boardAdj;
    const pct = toPct(raw, CAL.personal);
    return { pct, raw, pMing, pStem, verdict: verdictOf(pct) };
  }

  /* ───────────── 对外接口 ───────────── */
  return {
    TG, DZ, GZ60: Array.from({ length: 60 }, (_, i) => TG[i % 10] + DZ[i % 12]),
    TERMS, JU_TABLE, YANG_TERMS, RING, PALACE_NAME, PALACE_SHORT, PALACE_DIR, PALACE_EL, STAR_HOME, DOOR_HOME, EARTH_ORDER, DEITIES,
    STAR_INFO, DOOR_INFO, DEITY_INFO, STAR_LABEL, DOOR_LABEL, DEITY_LABEL, STAR_EL, DOOR_EL, SHICHEN, WX_STEM, WX_BRANCH, SHENGXIAO,
    lvlClass, verdictOf, toPct,
    termsOfYear, termAt, sunLonAtMs, pillars, computeJu, buildPlate, analyze, chart, narrate, daily, shichenIndexOf,
    mingGua, birthProfile, personalScore, utcFromBeijing, beijingParts, jdnCivil, gzOf, gzIndex, BRANCH_PALACE, CAL,
    _setMode(m) { MODE = m; }
  };
});
