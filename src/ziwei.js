/* 紫微斗数（三合派常见排法）：命宫、身宫、十二宫、五行局、紫微与十四主星、左辅右弼、文昌文曲、四化、大限。
 * 输入农历年月日与时辰，输出各宫落星。四化表中庚干一项各派有差异，页面会注明。
 * 星曜亮度（庙旺）、辅煞杂曜、流年流月都未实现。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bazi-extra.js'));
  else root.QimenZiwei = factory(root.QimenBazi);
})(typeof self !== 'undefined' ? self : this, function (BZ) {
  'use strict';
  var DZ = '子丑寅卯辰巳午未申酉戌亥'.split('');
  var TG = '甲乙丙丁戊己庚辛壬癸'.split('');
  var ROLES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];
  var JU_NAME = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
  var JU_LABEL = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  var mod = function (n, m) { return ((n % m) + m) % m; };

  // 四化：[化禄, 化权, 化科, 化忌]
  var SIHUA = {
    甲: ['廉贞', '破军', '武曲', '太阳'], 乙: ['天机', '天梁', '紫微', '太阴'],
    丙: ['天同', '天机', '文昌', '廉贞'], 丁: ['太阴', '天同', '天机', '巨门'],
    戊: ['贪狼', '太阴', '右弼', '天机'], 己: ['武曲', '贪狼', '天梁', '文曲'],
    庚: ['太阳', '武曲', '太阴', '天同'], 辛: ['巨门', '太阳', '文曲', '文昌'],
    壬: ['天梁', '紫微', '左辅', '武曲'], 癸: ['破军', '巨门', '太阴', '贪狼']
  };
  var SH_NAME = ['禄', '权', '科', '忌'];

  var STAR_MEAN = {
    紫微: '尊贵、统领', 天机: '机智、善变', 太阳: '光明、外放', 武曲: '财星、刚毅', 天同: '福星、温和', 廉贞: '原则、多情',
    天府: '稳重、守成', 太阴: '细腻、内敛', 贪狼: '多才、欲望', 巨门: '口才、是非', 天相: '辅佐、重礼', 天梁: '荫庇、清高',
    七杀: '孤勇、果决', 破军: '开创、耗变', 左辅: '助力', 右弼: '助力', 文昌: '文才', 文曲: '才艺'
  };

  // 紫微星位置：局数 ju，农历日 day（1..30），返回地支序（子=0）
  function ziweiPos(ju, day) {
    var x = 0;
    while ((day + x) % ju !== 0) x++;
    var q = (day + x) / ju;
    var base = 2 + (q - 1);                       // 以寅宫为 1
    return mod(x % 2 === 1 ? base - x : base + x, 12);
  }

  // o: { lunarYear, month(1..12), leap, day, hourIdx(子=0..亥=11), male }
  function chart(o) {
    var ys = mod(o.lunarYear - 4, 10), yb = mod(o.lunarYear - 4, 12);
    var m = o.month;
    if (o.leap && o.day > 15) m = m % 12 + 1;     // 闰月：十五日以后按下个月算
    var h = o.hourIdx;
    var ming = mod(2 + (m - 1) - h, 12), shen = mod(2 + (m - 1) + h, 12);
    // 五虎遁：寅宫天干
    var yin = (mod(ys, 5) * 2 + 2) % 10;
    var stemOf = function (b) { return (yin + mod(b - 2, 12)) % 10; };
    var nay = BZ.nayin(stemOf(ming), ming);
    var el = nay.charAt(nay.length - 1);
    var ju = JU_NAME[el];
    var zw = ziweiPos(ju, o.day);
    var tf = mod(4 - zw, 12);
    var stars = {};   // 地支序 → 星名数组
    var put = function (b, n) { b = mod(b, 12); (stars[b] = stars[b] || []).push(n); };
    // 紫微系（逆行）
    put(zw, '紫微'); put(zw - 1, '天机'); put(zw - 3, '太阳'); put(zw - 4, '武曲'); put(zw - 5, '天同'); put(zw - 8, '廉贞');
    // 天府系（顺行）
    put(tf, '天府'); put(tf + 1, '太阴'); put(tf + 2, '贪狼'); put(tf + 3, '巨门'); put(tf + 4, '天相'); put(tf + 5, '天梁'); put(tf + 6, '七杀'); put(tf + 10, '破军');
    // 左辅右弼（按月）、文昌文曲（按时）
    put(4 + (m - 1), '左辅'); put(10 - (m - 1), '右弼'); put(10 - h, '文昌'); put(4 + h, '文曲');
    // 四化
    var sh = SIHUA[TG[ys]], hua = {};
    sh.forEach(function (st, i) { hua[st] = SH_NAME[i]; });
    // 大限：阳男阴女顺行，阴男阳女逆行
    var forward = (ys % 2 === 0) === !!o.male;
    var palaces = [];
    for (var b = 0; b < 12; b++) {
      var role = ROLES[mod(ming - b, 12)];
      var step = forward ? mod(b - ming, 12) : mod(ming - b, 12);
      palaces.push({
        branch: DZ[b], branchI: b, stem: TG[stemOf(b)], role: role, isShen: b === shen,
        stars: (stars[b] || []).map(function (n) { return { name: n, hua: hua[n] || '', mean: STAR_MEAN[n] }; }),
        daxian: [ju + 10 * step, ju + 10 * step + 9]
      });
    }
    return {
      yearGZ: TG[ys] + DZ[yb], ming: DZ[ming], shen: DZ[shen], ju: ju, juName: JU_LABEL[ju], nayin: nay,
      ziwei: DZ[zw], forward: forward, sihua: sh.map(function (st, i) { return '化' + SH_NAME[i] + '：' + st; }),
      usedMonth: m, palaces: palaces
    };
  }

  return { chart: chart, ziweiPos: ziweiPos, SIHUA: SIHUA, STAR_MEAN: STAR_MEAN, ROLES: ROLES };
});
