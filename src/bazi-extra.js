/* 四柱八字补充：十神、纳音、大运起运。
 * 输入均为索引：天干 0..9（甲=0），地支 0..11（子=0），干支序 0..59（甲子=0）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QimenBazi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TG = '甲乙丙丁戊己庚辛壬癸'.split('');
  var DZ = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var STEM_EL = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
  var GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }; // 我生
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };  // 我克

  // 纳音：六十甲子两两一组，共 30 个
  var NAYIN = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水', '砂石金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];

  function gz60(stemI, branchI) {
    for (var i = stemI; i < 60; i += 10) if (i % 12 === branchI) return i;
    return -1;
  }
  function gzName(idx60) { return TG[idx60 % 10] + DZ[idx60 % 12]; }

  // 十神：dayI 为日干索引，sI 为要判断的天干索引
  function shishen(dayI, sI) {
    var de = STEM_EL[dayI], se = STEM_EL[sI];
    var idx = (dayI % 2) === (sI % 2) ? 0 : 1; // 同阴阳取前一个，异阴阳取后一个
    if (de === se) return ['比肩', '劫财'][idx];
    if (GEN[de] === se) return ['食神', '伤官'][idx];
    if (KE[de] === se) return ['偏财', '正财'][idx];
    if (KE[se] === de) return ['七杀', '正官'][idx];
    return ['偏印', '正印'][idx]; // 生我
  }

  function nayin(stemI, branchI) {
    var idx = gz60(stemI, branchI);
    return NAYIN[Math.floor(idx / 2)];
  }

  // 大运：o.yearStemI 年干索引，o.monthIdx60 月柱干支序，o.male 是否男命，
  // o.days 到“顺排用下一个节、逆排用上一个节”的天数（由调用方按天文节气算好）
  function daYun(o) {
    var yang = o.yearStemI % 2 === 0;
    var forward = yang === !!o.male;      // 阳年男、阴年女顺排；其余逆排
    var years = Math.floor(o.days / 3);   // 三天折一年
    var rem = o.days - years * 3;                      // 不足三天的余数
    var mAll = rem * 4;                                // 一天折四个月
    var months = Math.floor(mAll);
    var dd = Math.floor((mAll - months) * 30);         // 不足一月的部分按每月 30 天折成天
    var list = [];
    for (var k = 1; k <= 8; k++) {
      var idx = (((o.monthIdx60 + (forward ? k : -k)) % 60) + 60) % 60;
      list.push({ gz: gzName(idx), startAge: years + (k - 1) * 10, startMonths: months, startDays: dd });
    }
    return { forward: forward, years: years, months: months, days: dd, list: list };
  }

  return { TG: TG, DZ: DZ, STEM_EL: STEM_EL, gz60: gz60, gzName: gzName, shishen: shishen, nayin: nayin, daYun: daYun };
});
