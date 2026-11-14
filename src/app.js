(function () {
  'use strict';
  var Q = window.Qimen;
  var DAY = 86400000;
  var S = {
    tab: 'today', ms: Math.floor(Date.now() / 60000) * 60000, layer: 'all', palace: null,
    calY: 0, calM: 0,
    bDate: '1990-06-01', bTime: '12:00', bLon: '', bGender: 'M', vDate: '',
    meiMode: 'num', meiUp: 3, meiLow: 5
  };
  var WD = ['日', '一', '二', '三', '四', '五', '六'];
  var CLS = { '大吉': 'c-g2', '小吉': 'c-g1', '吉': 'c-g1', '平': 'c-m', '小凶': 'c-b1', '凶': 'c-b2', '大凶': 'c-b2' };
  var WXCOL = { '木': '#8fbf7f', '火': '#d9482f', '土': '#c9a25a', '金': '#e8e1cf', '水': '#6aa9d8' };
  var POS = { 4: [0, 0], 9: [1, 0], 2: [2, 0], 3: [0, 1], 5: [1, 1], 7: [2, 1], 8: [0, 2], 1: [1, 2], 6: [2, 2] };
  var LAYER = [['all', '全部'], ['earth', '地盘'], ['heaven', '天盘'], ['door', '八门'], ['deity', '八神']];
  var LAYER_CAP = {
    all: '全部层级同时显示。点任一宫，可查看它的星、门、神与吉凶依据。',
    earth: '地盘：三奇六仪，固定在九宫不动。',
    heaven: '天盘：九星随值符星转动，每宫带着天盘干。',
    door: '八门：值使门从旬首宫起，按时辰数走宫位。',
    deity: '八神：值符神随值符星转动，阳遁顺布、阴遁逆布。'
  };
  var app = document.getElementById('app');

  /* ───── 工具 ───── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function bj(ms) { return Q.beijingParts(ms); }
  function dayOf(ms) { var b = bj(ms); return b.y + '-' + pad(b.mo) + '-' + pad(b.d); }
  function hmOf(ms) { var b = bj(ms); return pad(b.h) + ':' + pad(b.mi); }
  function toMs(d, t) {
    var a = d.split('-').map(Number), h = t.split(':').map(Number);
    return Q.utcFromBeijing(a[0], a[1], a[2], h[0], h[1], 0);
  }
  function okDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var y = +s.slice(0, 4);
    return y >= 1900 && y <= 2100 && !isNaN(new Date(s).getTime());
  }
  function okTime(s) { return /^\d{2}:\d{2}$/.test(s); }
  function vOf(pct) { return Q.verdictOf(pct); }
  function cls(label) { return CLS[label] || 'c-m'; }
  function PN(p) { return Q.PALACE_NAME[p]; }
  function nowMin() { return Math.floor(Date.now() / 60000) * 60000; }
  function tagClass(c) { return c === 'good' ? 'g' : c === 'bad' ? 'b' : ''; }
  function vColor(c) { return c === 'good' ? 'var(--good-text)' : c === 'bad' ? 'var(--bad-text)' : 'var(--muted)'; }

  // 一天十二时辰，每个时辰取其中点起盘（子时中点即当日 00:00）
  function daySlots(y, mo, d) {
    return Q.SHICHEN.map(function (s, i) {
      var ms = Q.utcFromBeijing(y, mo, d, 0, 0, 0) + (s.startH + 1) * 3600000;
      var c = Q.chart(ms);
      return { i: i, name: s.name, range: s.range.replace(/:00/g, ''), ms: ms, c: c, pct: c.analysis.overall };
    });
  }
  function dayAvg(y, mo, d) {
    var s = daySlots(y, mo, d);
    return Math.round(s.reduce(function (a, x) { return a + x.pct; }, 0) / 12);
  }

  /* ───── 盘面 SVG ───── */
  function plateSVG(c) {
    var an = c.analysis, out = [];
    Object.keys(POS).forEach(function (k) {
      var p = +k, x = POS[p][0] * 104, y = POS[p][1] * 104, pa = an.palaces[p];
      var center = p === 5;
      var fill = center ? 'rgba(226,187,104,0.05)'
        : pa.pct >= 58 ? 'rgba(226,187,104,0.12)'
        : pa.pct <= 42 ? 'rgba(217,72,47,0.13)' : 'rgba(140,196,230,0.05)';
      var extra = pa.isZhifu ? ' style="stroke:var(--gold);stroke-width:2.6"'
        : pa.isZhishi ? ' style="stroke:var(--cinnabar);stroke-width:2.6;stroke-dasharray:5 3"' : '';
      out.push('<g class="cell' + (S.palace === p ? ' sel' : '') + '" data-p="' + p + '" tabindex="0" role="button" aria-label="' + esc(pa.name + (pa.star ? '，' + pa.star : '') + (pa.door ? '，' + pa.door + '门' : '')) + '">');
      out.push('<rect class="cellbg" x="' + x + '" y="' + y + '" width="100" height="100" rx="6" fill="' + fill + '"' + extra + '/>');
      out.push('<text class="t-dim" x="' + (x + 7) + '" y="' + (y + 15) + '" font-size="11">' + esc(pa.name) + '</text>');
      if (pa.isZhifu || pa.isZhishi) {
        var tags = '';
        if (pa.isZhifu) tags += '<tspan style="fill:var(--gold)">值符</tspan>';
        if (pa.isZhishi) tags += '<tspan style="fill:var(--cinnabar)"> 值使</tspan>';
        out.push('<text x="' + (x + 7) + '" y="' + (y + 28) + '" font-size="10">' + tags + '</text>');
      }
      if (!center) {
        out.push('<text class="l-deity c-m" x="' + (x + 93) + '" y="' + (y + 15) + '" text-anchor="end" font-size="11">' + esc(pa.deity) + '</text>');
        out.push('<text class="l-star kai ' + cls(pa.starLabel) + '" x="' + (x + 50) + '" y="' + (y + 50) + '" text-anchor="middle" font-size="16">' + esc(pa.star) + '</text>');
        if (pa.rider) out.push('<text class="t-dim" x="' + (x + 88) + '" y="' + (y + 50) + '" text-anchor="middle" font-size="10">+禽</text>');
        out.push('<text class="t-stem kai" x="' + (x + 22) + '" y="' + (y + 72) + '" text-anchor="middle" font-size="18">' + esc(pa.heavenStem) + '</text>');
        out.push('<text class="l-earth t-earth kai" x="' + (x + 78) + '" y="' + (y + 72) + '" text-anchor="middle" font-size="16">' + esc(pa.earthStem) + '</text>');
        out.push('<text class="l-door kai ' + cls(pa.doorLabel) + '" x="' + (x + 50) + '" y="' + (y + 93) + '" text-anchor="middle" font-size="15">' + esc(pa.door) + '门</text>');
      } else {
        out.push('<text class="l-earth t-earth kai" x="' + (x + 50) + '" y="' + (y + 58) + '" text-anchor="middle" font-size="18">' + esc(pa.earthStem) + '</text>');
        out.push('<text class="t-dim" x="' + (x + 50) + '" y="' + (y + 90) + '" text-anchor="middle" font-size="11">中宫 寄坤二</text>');
      }
      out.push('</g>');
    });
    return '<svg viewBox="-2 -2 312 312" data-layer="' + S.layer + '" role="group" aria-label="奇门盘">' + out.join('') + '</svg>';
  }

  /* ───── 读盘面板 ───── */
  function dirTag(an, p, good) {
    return '<span class="tag ' + (good ? 'g' : 'b') + '">' + Q.PALACE_DIR[p] + '（' + Q.PALACE_SHORT[p] + '宫 · ' + an.palaces[p].door + '门）</span>';
  }
  function readingHTML(c) {
    var an = c.analysis, pl = c.plate, J = c.ju, v = an.verdict;
    var zf = an.palaces[pl.zhifu.land];
    var doms = an.domains.map(function (d) {
      var vv = vOf(d.pct);
      return '<span class="tag ' + tagClass(vv.cls) + '" title="' + esc(d.basis) + '">' + d.name + ' · ' + vv.word + '</span>';
    }).join('');
    var flags = an.flags.length ? '<div class="flags">' + an.flags.map(function (f) {
      return '<div class="flag"><b>' + f.name + '</b>' + esc(f.text) + '</div>';
    }).join('') + '</div>' : '';
    var edge = '';
    if (c.edge) {
      edge = '<div class="flag edge"><b>交节临界</b>' + (c.edge.before
        ? '距「' + c.edge.term + '」交节还有 ' + c.edge.minutes + ' 分钟'
        : '「' + c.edge.term + '」交节刚过 ' + c.edge.minutes + ' 分钟') + '，节气按精确交节时刻划分。</div>';
    }
    var trio = '<div class="trio">' +
      '<div class="row"><span class="k">值符</span><b>' + pl.zhifu.star + '</b><span>' + PN(pl.zhifu.land) + ' · ' + esc(zf.deity) + '</span><span class="d">' + Q.STAR_INFO[pl.zhifu.star] + '</span></div>' +
      '<div class="row"><span class="k">值使</span><b>' + pl.zhishi.door + '门</b><span>' + PN(pl.zhishi.land) + ' · ' + Q.DOOR_LABEL[pl.zhishi.door] + '</span><span class="d">' + Q.DOOR_INFO[pl.zhishi.door] + '</span></div>' +
      '<div class="row"><span class="k">时干</span><b>' + pl.effStem + '</b><span>' + (an.hourPalace ? PN(an.hourPalace) : '—') + '</span></div>' +
      '</div>';
    var dirs = '<div class="dirs">' +
      '<div><span class="k">较吉</span>' + an.goodDirs.map(function (p) { return dirTag(an, p, true); }).join('') + '</div>' +
      '<div><span class="k">较凶</span>' + an.badDirs.map(function (p) { return dirTag(an, p, false); }).join('') + '</div></div>';
    var pd = '';
    if (S.palace && an.palaces[S.palace] && !an.palaces[S.palace].center) {
      var pa = an.palaces[S.palace];
      pd = '<div class="pal"><div class="pal-head"><span class="nm">' + pa.name + '</span><span class="muted">' + pa.dir + '方</span><span class="tag ' + tagClass(vOf(pa.pct).cls) + '">' + vOf(pa.pct).word + '</span></div>' +
        '<div class="trio">' +
        '<div class="row"><span class="k">星</span><b>' + pa.star + '</b><span>' + pa.starLabel + '</span><span class="d">' + Q.STAR_INFO[pa.star] + '</span></div>' +
        '<div class="row"><span class="k">门</span><b>' + pa.door + '门</b><span>' + pa.doorLabel + '</span><span class="d">' + Q.DOOR_INFO[pa.door] + '</span></div>' +
        '<div class="row"><span class="k">神</span><b>' + pa.deity + '</b><span>' + pa.deityLabel + '</span><span class="d">' + Q.DEITY_INFO[pa.deity] + '</span></div>' +
        '<div class="row"><span class="k">干</span><b>' + pa.heavenStem + '</b><span>天盘干</span></div>' +
        '<div class="row"><span class="k">干</span><b>' + pa.earthStem + '</b><span>地盘干</span></div>' +
        '</div>' +
        (pa.notes.length ? '<div class="notes">' + pa.notes.map(function (n) {
          return '<div class="note ' + n.kind + '">' + esc(n.text) + '</div>';
        }).join('') + '</div>' : '<p class="hint">此宫没有额外的格局或刑害。</p>') + '</div>';
    }
    var why = '<details class="why"><summary>判断依据（' + an.reasons.length + ' 条）</summary><ul>' +
      an.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></details>';
    return '<aside class="reading v-' + v.cls + '" aria-label="读盘">' +
      '<div class="rd-top"><div class="big"><span class="vw">' + v.word + '</span><span class="vs">综合 ' + an.overall + ' 分</span></div>' +
      '<div class="meter" role="img" aria-label="综合 ' + an.overall + ' 分"><i style="left:' + an.overall + '%"></i></div>' +
      '<div class="meter-scale"><span>凶</span><span>平</span><span>吉</span></div></div>' +
      '<p class="advice">' + v.advice + '</p>' +
      '<p class="narrate">' + esc(Q.narrate(c)) + '</p>' +
      '<div class="facts"><span class="pill">' + J.termName + '<b>' + (J.yang ? '阳' : '阴') + '遁' + J.ju + '局</b></span>' +
      '<span class="pill">' + J.yuanName + '<b>符头 ' + J.futou.gz + '</b></span></div>' +
      edge + flags +
      '<div><h3>吉凶领域</h3><div>' + doms + '</div></div>' +
      '<div><h3>关键落位</h3>' + trio + '</div>' +
      '<div><h3>方位</h3>' + dirs + '</div>' +
      pd + why +
      '<p class="hint">综合分由本页规则计算（门、星、神的基础分加格局与刑害），不是经典文献的固定评分。奇门遁甲未经科学验证，结果仅供文化研究参考。</p>' +
      '</aside>';
  }

  /* ───── 今日 ───── */
  function viewToday() {
    var ms = S.ms, c = Q.chart(ms), an = c.analysis, b = bj(ms);
    var slots = daySlots(b.y, b.mo, b.d);
    var avg = Math.round(slots.reduce(function (a, s) { return a + s.pct; }, 0) / 12);
    var cur = Q.shichenIndexOf(ms);
    var best = slots.slice().sort(function (x, y) { return y.pct - x.pct; })[0];
    var worst = slots.slice().sort(function (x, y) { return x.pct - y.pct; })[0];
    var P = c.pillars;
    var slotHTML = slots.map(function (s) {
      var vv = vOf(s.pct);
      return '<button type="button" class="slot' + (s.i === cur ? ' now' : '') + '" aria-pressed="' + (s.i === cur) + '" data-ms="' + s.ms + '" title="' + s.name + '时 ' + s.range + '">' +
        '<b>' + s.name + '</b><small>' + s.range + '</small><span class="sc" style="color:' + vColor(vv.cls) + '">' + vv.word + '</span></button>';
    }).join('');
    var layerHTML = '<div class="seg" role="group" aria-label="显示层">' + LAYER.map(function (l) {
      return '<button type="button" data-layer="' + l[0] + '" aria-pressed="' + (S.layer === l[0]) + '">' + l[1] + '</button>';
    }).join('') + '</div>';
    var pill = function (k, v) { return '<span class="pill">' + k + '<b>' + v + '</b></span>'; };
    var bar = '<div class="daybar">' +
      '<div class="datenav"><button type="button" class="btn sq" data-nav="-1" aria-label="前一天">‹</button>' +
      '<input id="dIn" type="date" value="' + dayOf(ms) + '" aria-label="日期">' +
      '<button type="button" class="btn sq" data-nav="1" aria-label="后一天">›</button></div>' +
      '<input id="tIn" type="time" value="' + hmOf(ms) + '" step="60" aria-label="时间">' +
      '<button type="button" class="btn primary" data-nav="now">现在</button>' +
      '<span class="hint">北京时间 · 周' + WD[b.wd] + '</span></div>';
    var pillars = '<div class="pillars">' + pill('年', P.year.gz) + pill('月', P.month.gz) + pill('日', P.day.gz) + pill('时', P.hour.gz) + '</div>';
    var daysum = '<section class="daysum v-' + vOf(avg).cls + '" aria-label="今日概览">' +
      '<div class="big"><span class="vw">' + vOf(avg).word + '</span><span class="vs">当日均分 ' + avg + '</span></div>' +
      '<div class="txt"><div><b>此刻</b>' + an.verdict.word + '，' + an.verdict.advice + '</div>' +
      '<div><b>当日</b>最吉在' + best.name + '时（' + best.range + '），最凶在' + worst.name + '时（' + worst.range + '）。</div></div></section>';
    var stage = '<div class="stage">' +
      '<div class="slots" role="group" aria-label="十二时辰">' + slotHTML + '</div>' +
      '<div class="layerbar">' + layerHTML + '<span class="layercap">' + LAYER_CAP[S.layer] + '</span></div>' +
      '<div class="plate-wrap">' + plateSVG(c) + '</div></div>';
    return bar + pillars + daysum + '<div class="main">' + stage + readingHTML(c) + '</div>';
  }

  /* ───── 生辰 ───── */
  function viewBirth() {
    var form = '<form class="formcard" id="bform" onsubmit="return false">' +
      '<div class="field"><label for="bd">出生日期（北京时间）</label><input id="bd" type="date" data-bind="bDate" value="' + esc(S.bDate) + '"></div>' +
      '<div class="field"><label for="bt">出生时间</label><input id="bt" type="time" data-bind="bTime" value="' + esc(S.bTime) + '" step="60"></div>' +
      '<div class="field"><span class="lb">性别（用于八宅命卦）</span><div class="row">' +
      '<label><input type="radio" name="g" value="M" data-bind="bGender"' + (S.bGender === 'M' ? ' checked' : '') + '>男</label>' +
      '<label><input type="radio" name="g" value="F" data-bind="bGender"' + (S.bGender === 'F' ? ' checked' : '') + '>女</label>' +
      '<label><input type="radio" name="g" value="" data-bind="bGender"' + (S.bGender === '' ? ' checked' : '') + '>不填</label></div></div>' +
      '<div class="field"><label for="bl">出生地经度（可选，用于真太阳时）</label><input id="bl" type="number" step="0.01" min="73" max="135" placeholder="如 112.9" data-bind="bLon" value="' + esc(S.bLon) + '"><span class="hint">不填则按北京时间起盘。</span></div>' +
      '<div class="field"><label for="vd">查看哪一天的个人运势</label><input id="vd" type="date" data-bind="vDate" value="' + esc(S.vDate || dayOf(S.ms)) + '"></div>' +
      '<p class="example">当前为示例生辰（1990-06-01 12:00，男）。请改成你的真实出生信息。</p>' +
      '</form>';
    if (!okDate(S.bDate) || !okTime(S.bTime)) {
      return '<div class="bgrid">' + form + '<div class="bout"><p class="flag">请填写有效的出生日期（1900–2100 年）和时间。</p></div></div>';
    }
    var lonNum = S.bLon !== '' && isFinite(Number(S.bLon)) ? Number(S.bLon) : null;
    var ms = toMs(S.bDate, S.bTime);
    var prof = Q.birthProfile(ms, { lon: lonNum, gender: S.bGender || undefined });
    var bc = prof.chart, P = bc.pillars;
    var names = [['年', P.year], ['月', P.month], ['日', P.day], ['时', P.hour]];
    var pil = '<div class="bpil">' + names.map(function (x, i) {
      var sub = i === 0 ? prof.shengxiao + '年' : i === 2 ? '日主' + prof.dayMaster.stem : '';
      return '<div class="bp' + (i === 2 ? ' me' : '') + '"><span class="cap">' + x[0] + '柱</span><span class="gz">' + x[1].gz + '</span><span class="sub2">' + sub + '</span></div>';
    }).join('') + '</div>';
    var wx = prof.wuxing, mx = Math.max.apply(null, ['木', '火', '土', '金', '水'].map(function (k) { return wx[k]; })) || 1;
    var wxHTML = '<div class="wx">' + ['木', '火', '土', '金', '水'].map(function (k) {
      return '<div class="wxr"><span>' + k + '</span><div class="tr"><i style="width:' + (wx[k] / mx * 100) + '%;background:' + WXCOL[k] + '"></i></div><span class="num">' + wx[k] + '</span></div>';
    }).join('') + '</div>';
    var mingP = bc.analysis.palaces[prof.mingPalace];
    var gua = prof.gua ? '<p>八宅命卦 <b>' + prof.gua.name + '卦</b>（' + prof.gua.group + '），' + (S.bGender === 'M' ? '男' : '女') + '命。<span class="hint">八宅是风水体系，与奇门的年命宫分开展示。</span></p>' : '';
    var info = '<div class="sec"><h2>八字与命卦</h2>' + pil +
      '<p>生肖 <b>' + prof.shengxiao + '</b> · 日主 <b>' + prof.dayMaster.stem + prof.dayMaster.el + '</b>（' + (prof.dayMaster.yin ? '阴' : '阳') + '）· 奇门年命宫 <b>' + PN(prof.mingPalace) + '</b></p>' +
      gua + wxHTML + '</div>';
    var chartSec = '<div class="sec"><h2>生辰命盘</h2><p class="hint">按出生时刻起盘（' + S.bDate + ' ' + S.bTime + '，' + (lonNum === null ? '北京时间' : '真太阳时') + '）。点任一宫查看细节。</p>' +
      '<div class="layerbar">' + LAYER.map(function (l) {
        return '<button type="button" class="btn" data-layer="' + l[0] + '" aria-pressed="' + (S.layer === l[0]) + '">' + l[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="plate-wrap" style="max-width:560px">' + plateSVG(bc) + '</div>' +
      '<p class="muted">年命宫 ' + PN(prof.mingPalace) + ' 在出生时刻的盘中：' + mingP.star + ' · ' + mingP.door + '门 · ' + mingP.deity + '，' + vOf(mingP.pct).word + '。</p></div>';
    var vDate = okDate(S.vDate) ? S.vDate : dayOf(S.ms);
    var vb = bj(toMs(vDate, '12:00'));
    var pers = Q.SHICHEN.map(function (s) {
      var m = Q.utcFromBeijing(vb.y, vb.mo, vb.d, 0, 0, 0) + (s.startH + 1) * 3600000;
      var ps = Q.personalScore(Q.chart(m), prof);
      return { name: s.name, pct: ps.pct, word: ps.verdict.word, cls: ps.verdict.cls };
    });
    var bars = '<div class="pbars" role="img" aria-label="' + vDate + ' 十二时辰个人运势">' + pers.map(function (p) {
      var col = p.cls === 'good' ? 'var(--gold)' : p.cls === 'bad' ? 'var(--cinnabar)' : 'var(--ice)';
      return '<div class="pb" title="' + p.name + '时 ' + p.word + ' ' + p.pct + ' 分"><i style="height:' + p.pct + '%;background:' + col + '"></i></div>';
    }).join('') + '</div>' +
      '<div class="pblab">' + pers.map(function (p) { return '<span>' + p.name + '<br><small style="font:12px var(--f-body);color:var(--muted)">' + p.word + '</small></span>'; }).join('') + '</div>';
    var personal = '<div class="sec"><h2>个人运势 · ' + vDate + '</h2>' +
      '<p class="hint">取出生年命宫与出生日干在当时盘中的落宫表现，与盘面整体分各半计算。这是本页的个人化规则，不是经典固定公式，仅作参考。</p>' +
      bars + '</div>';
    var BZ = window.QimenBazi;
    var dI = P.day.stemI;
    var tenRow = function (lbl, p) {
      return '<div class="row"><span class="k">' + lbl + '</span><b>' + p.gz + '</b><span>' + (p === P.day ? '日主' : BZ.shishen(dI, p.stemI)) + '</span><span class="d">纳音 ' + BZ.nayin(p.stemI, p.branchI) + '</span></div>';
    };
    var forwardDir = (P.year.stemI % 2 === 0) === (S.bGender === 'M');
    var jieDays = (function () {
      var t = Q.termAt(ms), best = null;
      t.list.forEach(function (x) {
        if (!x.jie) return;
        if (forwardDir && x.ms > ms && (best === null || x.ms < best)) best = x.ms;
        if (!forwardDir && x.ms <= ms && (best === null || x.ms > best)) best = x.ms;
      });
      return best === null ? 0 : Math.abs(best - ms) / DAY;
    })();
    var dy = S.bGender ? BZ.daYun({ yearStemI: P.year.stemI, monthIdx60: P.month.idx, male: S.bGender === 'M', days: jieDays }) : null;
    var bazi = '<div class="sec"><h2>八字细看</h2><div class="trio">' +
      tenRow('年干', P.year) + tenRow('月干', P.month) + tenRow('日干', P.day) + tenRow('时干', P.hour) + '</div>' +
      '<p class="hint">十神以日干为准。纳音是六十甲子两两一组的五行意象，只作参考。</p>' +
      (dy ? '<h3>大运</h3><p class="muted">' + (dy.forward ? '顺排' : '逆排') + '，约 ' + dy.years + ' 岁 ' + dy.months + ' 个月起运（按距最近节的天数折算，是近似值）。</p><div class="facts">' +
        dy.list.map(function (d) { return '<span class="pill">' + d.startAge + ' 岁<b>' + d.gz + '</b></span>'; }).join('') + '</div>'
        : '<p class="hint">选择男或女后，这里显示大运排列。</p>') + '</div>';
    return '<div class="bgrid">' + form + '<div class="bout">' + info + bazi + chartSec + personal + '</div></div>';
  }

  /* ───── 月历 ───── */
  function viewCal() {
    if (!S.calY) { var b0 = bj(S.ms); S.calY = b0.y; S.calM = b0.mo; }
    var y = S.calY, m = S.calM;
    var first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    var days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var todayKey = dayOf(nowMin()), selKey = dayOf(S.ms);
    var cells = WD.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('');
    for (var i = 0; i < first; i++) cells += '<div class="pad"></div>';
    for (var d = 1; d <= days; d++) {
      var key = y + '-' + pad(m) + '-' + pad(d);
      var avg = dayAvg(y, m, d), vv = vOf(avg);
      var bg = vv.cls === 'good' ? 'rgba(226,187,104,0.16)' : vv.cls === 'bad' ? 'rgba(217,72,47,0.16)' : 'rgba(140,196,230,0.06)';
      cells += '<button type="button" data-day="' + key + '" class="' + (key === selKey ? 'on' : '') + (key === todayKey ? ' today' : '') +
        '" style="background:' + bg + '" aria-label="' + key + ' ' + vv.word + '，均分 ' + avg + '"><b>' + d + '</b><small style="color:' + vColor(vv.cls) + '">' + vv.word + '</small></button>';
    }
    return '<div class="sec"><div class="datenav"><button type="button" class="btn sq" data-cal="-1" aria-label="上个月">‹</button>' +
      '<span class="pill"><b>' + y + ' 年 ' + m + ' 月</b></span><button type="button" class="btn sq" data-cal="1" aria-label="下个月">›</button></div>' +
      '<div class="cal">' + cells + '</div>' +
      '<p class="hint">每格是当天十二时辰的平均分。点任一天，跳到当天的盘。今日加粗标记。</p></div>';
  }

  /* ───── 梅花易数与易经 ───── */
  function viewMei() {
    var M = window.QimenMei;
    var mode = S.meiMode === 'time' ? 'time' : 'num';
    var up = Math.max(0, Math.floor(+S.meiUp) || 0), low = Math.max(0, Math.floor(+S.meiLow) || 0);
    var r;
    if (mode === 'time') {
      var b = bj(S.ms);
      r = M.fromTime(b.y, b.mo, b.d, Q.shichenIndexOf(S.ms));
    } else {
      r = M.fromNumbers(up, low);
    }
    var hexCard = function (title, h, movePos) {
      var out = '';
      for (var i = 5; i >= 0; i--) {
        out += '<div class="hx-line' + (movePos === i + 1 ? ' mov' : '') + '"><i class="' + (h.lines[i] ? 'yang' : 'yin') + '"></i></div>';
      }
      return '<div class="hxcard"><h3>' + title + '</h3><div class="hx">' + out + '</div>' +
        '<div class="hxname">' + h.name + ' <span class="muted">（' + h.upper.name + '上' + h.lower.name + '下）</span></div>' +
        '<p class="hint">' + h.mean + '</p></div>';
    };
    var form = '<form class="formcard" onsubmit="return false">' +
      '<div class="field"><span class="lb">起卦方式</span><div class="row">' +
      '<label><input type="radio" name="mm" value="num" data-bind="meiMode"' + (mode === 'num' ? ' checked' : '') + '>数字起卦</label>' +
      '<label><input type="radio" name="mm" value="time" data-bind="meiMode"' + (mode === 'time' ? ' checked' : '') + '>用时间起卦</label></div></div>' +
      (mode === 'num'
        ? '<div class="field"><label for="mu">上数（决定上卦）</label><input id="mu" type="number" min="0" data-bind="meiUp" value="' + up + '"></div>' +
          '<div class="field"><label for="ml">下数（决定下卦；上下两数之和决定动爻）</label><input id="ml" type="number" min="0" data-bind="meiLow" value="' + low + '"></div>'
        : '<p class="hint">使用「今日吉凶」里选定的时刻：' + dayOf(S.ms) + ' ' + hmOf(S.ms) + '。时间起卦用公历年支和公历月日代替农历，结果与传统农历起卦可能不同。</p>') +
      '</form>';
    var cards = '<div class="hxrow">' + hexCard('本卦', r.ben, r.mv) + hexCard('变卦', r.bian, r.mv) + hexCard('互卦', r.hu, 0) + '</div>';
    var rel = r.rel;
    var tiyong = '<div class="trio">' +
      '<div class="row"><span class="k">动爻</span><b>' + r.yao + '</b><span>第 ' + r.mv + ' 爻（自下而上）</span></div>' +
      '<div class="row"><span class="k">用卦</span><b>' + r.yong.name + '</b><span>' + r.yong.el + '行</span><span class="d">动爻在' + (r.mv <= 3 ? '下' : '上') + '卦，所以' + r.yong.name + '为用。</span></div>' +
      '<div class="row"><span class="k">体卦</span><b>' + r.ti.name + '</b><span>' + r.ti.el + '行</span><span class="d">另一卦为体，代表问事的人自己。</span></div>' +
      '</div>';
    var verdict = '<div class="sec v-' + (rel.level === 'good' ? 'good' : 'bad') + '"><span class="vw">' + rel.kind + '</span><p class="advice">' + rel.text + '</p></div>';
    var note = '<p class="hint">梅花易数是北宋邵雍传下的起卦法。卦象和体用关系按古法算出；体用生克的判语是常见说法，不构成预测。卦义是本页的简述，不是卦辞原文。</p>';
    return '<div class="bgrid">' + form + '<div class="bout">' + cards + tiyong + verdict + note + '</div></div>';
  }

  /* ───── 说明 ───── */
  function viewRules() {
    return '<div class="rules">' +
      '<section><h2>排盘方法</h2><div class="twocol">' +
      '<div><h3>时间与换日</h3><ul><li>按北京时间起盘，可选填出生地经度换算真太阳时。</li><li>23:00 换日，晚子时计入次日。</li><li>立春交节换年，节（不含气）交节换月。</li></ul></div>' +
      '<div><h3>定局（拆补法）</h3><ul><li>节气取精确的交节时刻，一个节气内不混用别的节气局象。</li><li>元由当日符头地支定：子午卯酉为上元，寅申巳亥为中元，辰戌丑未为下元。</li><li>阳遁自冬至起，阴遁自夏至起；局数查 24 节气三元表。</li></ul></div>' +
      '<div><h3>布盘</h3><ul><li>地盘：戊起局数宫，阳遁顺布、阴遁逆布。</li><li>天盘：九星随值符星整体转动，每宫带地盘干。</li><li>值使门：从旬首宫起，按时辰数走九宫。其余七门随之转动。</li><li>八神：值符神随值符星，阳遁顺、阴遁逆。</li></ul></div>' +
      '</div></section>' +
      '<section><h2>吉凶怎么算</h2><ul>' +
      '<li>每宫：门、星、神各有基础分，再加上天遁、地遁、人遁等格局，以及门迫、击刑、空亡的扣分。</li>' +
      '<li>整盘：值符宫 35%、值使宫 25%、时干宫 20%、日干宫 20%，伏吟、反吟、五不遇时另作扣分。</li>' +
      '<li>领域：财运看生门，事业看开门与值符，人缘看六合与太阴，学业看景门与天辅，健康看天心与休门，出行看开门与驿马。</li>' +
      '<li>分数以当日同类时辰的中位数为 50 分校准，所以颜色表示相对平常的好坏。</li></ul></section>' +
      '<section><h2>其他理论</h2><ul>' +
      '<li>梅花易数：数字起卦用上下两数分别除以八取余，定上卦和下卦；两数之和除以六取余，定动爻。时间起卦用公历年支、月、日代替农历，因此与传统农历起卦可能不同。</li>' +
      '<li>易经六十四卦：按文王卦序排列，卦名与上下卦的对应已逐一核对；卦义是本页简述，不是卦辞原文。</li>' +
      '<li>四柱八字：十神以日干为准；纳音按六十甲子两两一组；大运的起运年龄按距最近节的天数每三天折一年，是近似值。</li>' +
      '<li class="warn">紫微斗数：本版本未实现。它需要精确的农历换算，离线环境下没有可靠的农历数据，不想用手写的农历表冒充精确结果。</li></ul></section>' +
      '<section><h2>验证与局限</h2><ul>' +
      '<li class="ok">节气时刻：与香港天文台 2026 年 12 个中气逐一比对，偏差不超过 0.6 分钟，超过官方一分钟精度的部分只有 0.58 分。</li>' +
      '<li class="ok">盘面结构：全年 4380 个时辰，检查九星、八门、八神各 8 个互异，值符神落在值符星所在宫等不变量，全部通过。</li>' +
      '<li class="warn">版本差异：拆补法在不同门派中细节不完全一致，本页采用一种读法。2026-09-11 08:00 这一例，另一个公开排盘页面给出阴九局，本页给出阴三局中元，两者定局规则不同。</li>' +
      '<li class="warn">阴遁八神的排列，公开资料只确认了阳顺阴逆的方向，具体细节未逐一核到原文。</li>' +
      '<li>奇门遁甲没有经过科学验证。页面展示的吉凶是按上述规则算出的结果，仅供文化研究参考，不要用于重大决策。</li></ul></section>' +
      '</div>';
  }

  /* ───── 渲染与交互 ───── */
  function render() {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.getAttribute('data-tab') === S.tab));
    });
    var html;
    try {
      html = S.tab === 'today' ? viewToday() : S.tab === 'birth' ? viewBirth() : S.tab === 'calendar' ? viewCal() : S.tab === 'mei' ? viewMei() : viewRules();
    } catch (err) {
      console.error(err);
      html = '<p class="flag">排盘出错：' + esc(err.message) + '</p>';
    }
    app.innerHTML = html;
  }
  function go(tab) { S.tab = tab; if (tab !== 'today') S.palace = null; render(); }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-tab]'))) { go(el.getAttribute('data-tab')); return; }
    if ((el = e.target.closest('[data-ms]'))) { S.ms = +el.getAttribute('data-ms'); render(); return; }
    if ((el = e.target.closest('[data-layer]'))) { S.layer = el.getAttribute('data-layer'); render(); return; }
    if ((el = e.target.closest('[data-p]'))) { var p = +el.getAttribute('data-p'); S.palace = S.palace === p ? null : p; render(); return; }
    if ((el = e.target.closest('[data-nav]'))) {
      var n = el.getAttribute('data-nav');
      S.ms = n === 'now' ? nowMin() : S.ms + (+n) * DAY;
      render(); return;
    }
    if ((el = e.target.closest('[data-cal]'))) {
      S.calM += +el.getAttribute('data-cal');
      if (S.calM < 1) { S.calM = 12; S.calY--; }
      if (S.calM > 12) { S.calM = 1; S.calY++; }
      render(); return;
    }
    if ((el = e.target.closest('[data-day]'))) {
      S.ms = toMs(el.getAttribute('data-day'), '12:00');
      S.palace = null; S.tab = 'today'; render();
    }
  });

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'dIn' || t.id === 'tIn') {
      var d = document.getElementById('dIn').value, tt = document.getElementById('tIn').value;
      if (okDate(d) && okTime(tt)) { S.ms = toMs(d, tt); render(); }
      return;
    }
    if (t.hasAttribute('data-bind')) {
      S[t.getAttribute('data-bind')] = t.value;
      render();
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.hasAttribute && e.target.hasAttribute('data-p')) {
      e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  /* 背景星空：静态绘制，不做动画 */
  function drawSky() {
    var cv = document.getElementById('sky');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = window.innerWidth, H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = ctx.createRadialGradient(W * 0.5, H * 0.22, 0, W * 0.5, H * 0.22, Math.max(W, H) * 0.7);
    g.addColorStop(0, '#16243f'); g.addColorStop(0.5, '#0b1326'); g.addColorStop(1, '#070b17');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 260; i++) {
      var x = rnd() * W, y = rnd() * H, r = rnd() * 1.1 + 0.2, a = rnd() * 0.6 + 0.2;
      ctx.fillStyle = 'rgba(241,231,208,' + a.toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  window.addEventListener('resize', drawSky);
  drawSky();
  render();
})();
