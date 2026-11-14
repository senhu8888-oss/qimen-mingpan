/* 农历换算：用天文方法算朔（Meeus《Astronomical Algorithms》第49章，取主要周期项），
 * 配合引擎里的中气时刻，按“无中气置闰、冬至在十一月”的规则定月序与闰月。
 * 适用于 1900–2100 年。朔的精度约 1 分钟；若朔恰好落在北京时间零点前后几分钟，日期可能差一天。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../engine.js'));
  else root.QimenLunar = factory(root.Qimen);
})(typeof self !== 'undefined' ? self : this, function (Q) {
  'use strict';
  var RAD = Math.PI / 180, DAYMS = 86400000, BJ = 8 * 3600000;
  var J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
  var SYN = 29.530588861;

  function sin(d) { return Math.sin(d * RAD); }

  // 第 k 个朔（k=0 为 2000 年 1 月 6 日前后），返回 UT 毫秒
  function newMoonMs(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var jde = 2451550.09766 + SYN * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
    var Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    var F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    var Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
    var c = -0.40720 * sin(Mp) + 0.17241 * E * sin(M) + 0.01608 * sin(2 * Mp) + 0.01039 * sin(2 * F) +
      0.00739 * E * sin(Mp - M) - 0.00514 * E * sin(Mp + M) + 0.00208 * E * E * sin(2 * M) -
      0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) + 0.00056 * E * sin(2 * Mp + M) -
      0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) -
      0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(Om) - 0.00007 * sin(Mp + 2 * M) +
      0.00004 * sin(2 * Mp - 2 * F) + 0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) +
      0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) + 0.00003 * sin(Mp - M + 2 * F) -
      0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    jde += c;
    var year = 2000 + (jde - 2451545) / 365.25;
    return (jde - 2440587.5) * DAYMS - Q.deltaT(year) * 1000;
  }
  function dayIdx(ms) { return Math.floor((ms + BJ) / DAYMS); }          // 北京日序号
  function civilIdx(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAYMS); }

  var zqCache = {};
  function zhongqi(y) {   // 中气（冬至、大寒、雨水……）所在北京日序号，附冬至标记
    if (!zqCache[y]) {
      var out = [];
      for (var yy = y - 1; yy <= y + 1; yy++) {
        Q.termsOfYear(yy).forEach(function (t) { if (!t.jie) out.push({ name: t.name, d: dayIdx(t.ms) }); });
      }
      zqCache[y] = out;
    }
    return zqCache[y];
  }
  function monthStart(k) { return dayIdx(newMoonMs(k)); }
  function hasZQ(k, y) {
    var s = monthStart(k), e = monthStart(k + 1);
    return zhongqi(y).some(function (z) { return z.d >= s && z.d < e; });
  }
  function hasWinter(k, y) {
    var s = monthStart(k), e = monthStart(k + 1);
    return zhongqi(y).some(function (z) { return z.name === '冬至' && z.d >= s && z.d < e; });
  }
  // 以冬至所在月为十一月，逐月数到下一个冬至月；若有 13 个月，第一个无中气的月为闰月
  function monthNo(k, y) {
    var k11 = k;                                  // 找不晚于 k 的最近一个冬至月
    while (!hasWinter(k11, y)) k11--;
    var kn = k11 + 11;                            // 下一个冬至月最早在 12 个月之后
    while (!hasWinter(kn, y)) kn++;
    var leapAt = -1;
    if (kn - k11 === 13) {
      for (var i = k11 + 1; i < kn; i++) if (!hasZQ(i, y)) { leapAt = i; break; }
    }
    var j = k - k11, n, leap = false;
    if (leapAt !== -1 && k === leapAt) { leap = true; n = 11 + j - 1; }
    else if (leapAt !== -1 && k > leapAt) n = 11 + j - 1;
    else n = 11 + j;
    n = ((n - 1) % 12) + 1;
    var s = monthStart(k);
    return { n: n, leap: leap, start: s, len: monthStart(k + 1) - s };
  }

  // 公历（北京日期）→ 农历
  function fromSolar(y, m, d) {
    var t = civilIdx(y, m, d);
    var k = Math.round((t * DAYMS - J2000_MS) / DAYMS / SYN);
    while (dayIdx(newMoonMs(k)) > t) k--;
    while (dayIdx(newMoonMs(k + 1)) <= t) k++;
    var mi = monthNo(k, y);
    var sd = new Date(mi.start * DAYMS);
    var sy = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1;
    var ly = (mi.n >= 11 && sm <= 3) ? sy - 1 : sy;
    return { year: ly, month: mi.n, leap: mi.leap, day: t - mi.start + 1, monthLen: mi.len };
  }

  // 某农历年正月初一的公历日期 [y, m, d]
  function newYearOf(ly) {
    var k = Math.round((civilIdx(ly, 2, 1) * DAYMS - J2000_MS) / DAYMS / SYN) - 2;
    for (var i = 0; i < 6; i++, k++) {
      var mi = monthNo(k, ly);
      if (mi.n === 1 && !mi.leap) { var dt = new Date(mi.start * DAYMS); return [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()]; }
    }
    return null;
  }

  return { newMoonMs: newMoonMs, fromSolar: fromSolar, newYearOf: newYearOf, dayIdx: dayIdx };
});
