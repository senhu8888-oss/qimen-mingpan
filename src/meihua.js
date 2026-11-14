/* 梅花易数：八卦、六十四卦（先天编号 + 文王卦序）、数字起卦、时间起卦、本卦/变卦/互卦、体用生克。
 * 时间起卦这里用公历年支、公历月日代替农历，结果与传统农历起卦可能不同，界面中会注明。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QimenMei = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 八卦：n 为先天数（1 乾 2 兑 3 离 4 震 5 巽 6 坎 7 艮 8 坤）；bits 自下而上，阳爻为 1
  var TRI = [null,
    { n: 1, name: '乾', sym: '天', el: '金', bits: [1, 1, 1] },
    { n: 2, name: '兑', sym: '泽', el: '金', bits: [1, 1, 0] },
    { n: 3, name: '离', sym: '火', el: '火', bits: [1, 0, 1] },
    { n: 4, name: '震', sym: '雷', el: '木', bits: [1, 0, 0] },
    { n: 5, name: '巽', sym: '风', el: '木', bits: [0, 1, 1] },
    { n: 6, name: '坎', sym: '水', el: '水', bits: [0, 1, 0] },
    { n: 7, name: '艮', sym: '山', el: '土', bits: [0, 0, 1] },
    { n: 8, name: '坤', sym: '地', el: '土', bits: [0, 0, 0] }
  ];
  var TRI_BY_KEY = { '111': 1, '110': 2, '101': 3, '100': 4, '011': 5, '010': 6, '001': 7, '000': 8 };

  // KW[上卦 n][下卦 n] = 文王卦序（1..64）
  // 行 = 上卦（乾、兑、离、震、巽、坎、艮、坤），列 = 下卦（同序）。
  // 例：KW[1][8] = 乾上坤下 = 否 12；KW[8][1] = 坤上乾下 = 泰 11；KW[3][6] = 离上坎下 = 既济 63。
  var KW = [null,
    [null, 1, 10, 13, 25, 44, 6, 33, 12],
    [null, 43, 58, 49, 17, 28, 47, 31, 45],
    [null, 14, 38, 30, 21, 50, 64, 56, 35],
    [null, 34, 54, 55, 51, 32, 40, 62, 16],
    [null, 9, 61, 37, 42, 57, 59, 53, 20],
    [null, 5, 60, 63, 3, 48, 29, 39, 8],
    [null, 26, 41, 22, 27, 18, 4, 52, 23],
    [null, 11, 19, 36, 24, 46, 7, 15, 2]
  ];

  var NAMES = ['', '乾', '坤', '屯', '蒙', '需', '讼', '师', '比', '小畜', '履', '泰', '否', '同人', '大有', '谦', '豫', '随', '蛊', '临', '观', '噬嗑', '贲', '剥', '复', '无妄', '大畜', '颐', '大过', '坎', '离', '咸', '恒', '遁', '大壮', '晋', '明夷', '家人', '睽', '蹇', '解', '损', '益', '夬', '姤', '萃', '升', '困', '井', '革', '鼎', '震', '艮', '渐', '归妹', '丰', '旅', '巽', '兑', '涣', '节', '中孚', '小过', '既济', '未济'];

  // 卦义（简述，非卦辞原文）
  var MEAN = ['', '刚健，自强不息', '柔顺，承载包容', '初生艰难，宜待时而动', '启蒙，宜学习求教', '等待，宜守信养力', '争讼，宜和解不宜争', '统众，宜纪律与正道', '亲附，宜相辅相成', '小有积蓄，事未大成', '行路谨慎，循序守礼', '通顺，天地交泰', '闭塞，上下不通', '同心，宜合作', '大有收获，宜谦守', '谦逊，诸事顺遂', '顺势而动，宜预备', '随从，顺应时势', '整治积弊，宜革新', '临近，渐进向上', '观察，宜审视自省', '咬合，宜去除阻碍', '文饰，宜修养形象', '剥落，宜守静待变', '回复，一阳初生', '不妄为，宜守本分', '大有蓄积，宜厚积', '颐养，宜慎言养身', '过度，宜补偏救弊', '险陷，宜慎行守信', '附丽光明，宜依正道', '感应，宜真心相交', '恒久，宜持之以恒', '退隐，宜避让保身', '壮盛，宜戒骄躁', '上进，宜积极进取', '光明受伤，宜韬晦', '家庭，宜内守和睦', '乖离，宜求同存异', '艰难，宜反省求助', '解除，困难将散', '减损，宜克制节省', '增益，宜主动利他', '决断，宜果断但慎行', '相遇，宜慎防邪', '聚集，宜团结同心', '上升，宜循序渐进', '困顿，宜守正待时', '井养不穷，宜修德', '变革，宜顺时革新', '鼎新，宜稳中图新', '震动，宜戒惧自省', '止静，宜适可而止', '循序渐进，宜稳步', '嫁娶，宜守礼不妄', '丰盛，宜防盛极而衰', '旅居，宜谨慎自守', '顺入，宜柔顺渐入', '喜悦，宜和悦沟通', '涣散，宜聚人心', '节制，宜有度有止', '诚信，宜以诚感人', '小有过越，宜谨慎', '事已成，宜防后患', '事未成，宜继续努力'];

  var GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  var KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  var YAO = ['初', '二', '三', '四', '五', '上'];

  function mod(n, m) { var r = n % m; return r === 0 ? m : r; }

  function fromTrigrams(up, low) {
    var num = KW[up][low];
    return {
      num: num, name: NAMES[num], mean: MEAN[num],
      upper: TRI[up], lower: TRI[low], lines: TRI[low].bits.concat(TRI[up].bits)
    };
  }
  function fromLines(lines) {
    var low = TRI_BY_KEY[lines.slice(0, 3).join('')];
    var up = TRI_BY_KEY[lines.slice(3, 6).join('')];
    return fromTrigrams(up, low);
  }

  // 体用：动爻所在的卦为用，另一卦为体
  function relation(yong, ti) {
    if (yong === ti) return { kind: '比和', level: 'good', text: '用体同气，平稳和顺。' };
    if (GEN[yong] === ti) return { kind: '用生体', level: 'good', text: '用生体，大吉。外力相助，事情顺利。' };
    if (GEN[ti] === yong) return { kind: '体生用', level: 'bad', text: '体生用，耗泄。付出多，所得少。' };
    if (KE[ti] === yong) return { kind: '体克用', level: 'good', text: '体克用，小吉。事情可成，但需自己出力。' };
    return { kind: '用克体', level: 'bad', text: '用克体，凶。外界压制自身，宜守不宜进。' };
  }

  // up、low 为 1..8 的卦数，mv 为 1..6 的动爻位（自下而上）
  function build(up, low, mv) {
    var ben = fromTrigrams(up, low);
    var L = ben.lines;
    var moved = L.slice();
    moved[mv - 1] = 1 - moved[mv - 1];
    var bian = fromLines(moved);
    var hu = fromLines([L[1], L[2], L[3], L[2], L[3], L[4]]); // 互卦：下卦取 2-4 爻，上卦取 3-5 爻
    var inLower = mv <= 3;
    var yong = inLower ? ben.lower : ben.upper;
    var ti = inLower ? ben.upper : ben.lower;
    return {
      mv: mv,
      yao: YAO[mv - 1] + (L[mv - 1] ? '九' : '六'),
      ben: ben, bian: bian, hu: hu,
      yong: yong, ti: ti,
      rel: relation(yong.el, ti.el)
    };
  }

  // 数字起卦：上数定上卦，下数定下卦，两数之和定动爻
  function fromNumbers(upNum, lowNum) {
    return build(mod(upNum, 8), mod(lowNum, 8), mod(upNum + lowNum, 6));
  }

  // 时间起卦（公历简化）：年支序（子=1）+ 月 + 日 定上卦；再加时辰序（子=1）定下卦与动爻
  function fromTime(y, m, d, shichenIdx) {
    var yNum = (((y - 4) % 12) + 12) % 12 + 1;
    var up = mod(yNum + m + d, 8);
    var sum = yNum + m + d + (shichenIdx + 1);
    return build(up, mod(sum, 8), mod(sum, 6));
  }

  return { TRI: TRI, KW: KW, NAMES: NAMES, MEAN: MEAN, fromNumbers: fromNumbers, fromTime: fromTime, build: build, fromLines: fromLines, relation: relation, mod: mod };
});
