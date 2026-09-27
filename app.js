(function () {
  'use strict';
  var CFG = window.SG_CONFIG || {};
  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function todayJST() {
    var d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function parse(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3], dow: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() } : null;
  }
  function norm(s) {
    var p = parse(s);
    return p ? p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : '';
  }
  function periodText(start, end) {
    var a = parse(start), b = parse(end);
    if (!a) return '';
    var s = a.y + '. ' + a.m + '. ' + a.d;
    if (!b) return s + ' –';
    return s + ' – ' + (b.y !== a.y ? b.y + '. ' : '') + b.m + '. ' + b.d;
  }

  /* ---------- 表示 ---------- */

  function renderNotices(list) {
    var box = $('notices');
    box.textContent = '';
    (list || []).forEach(function (n) {
      if (!n.text) return;
      var p = el('p');
      p.appendChild(el('strong', null, 'お知らせ'));
      p.appendChild(document.createTextNode(n.text));
      box.appendChild(p);
    });
    box.hidden = !box.childNodes.length;
  }

  function renderDates(target, start, end) {
    target.textContent = '';
    var a = parse(start), b = parse(end);
    if (!a) return;
    function part(p, withYear) {
      target.appendChild(el('span', null, (withYear ? p.y + '. ' : '') + p.m + '. ' + p.d));
      target.appendChild(el('span', 'dow', DOW[p.dow]));
    }
    part(a, true);
    if (b) {
      target.appendChild(el('span', 'dash', '—'));
      part(b, b.y !== a.y);
    }
  }

  function infoRow(dl, label, value) {
    if (!value) return;
    var row = el('div');
    row.appendChild(el('dt', null, label));
    row.appendChild(el('dd', null, value));
    dl.appendChild(row);
  }

  function renderFeatured(ex, today) {
    var label = $('ex-label'), title = $('ex-title'), info = $('ex-info');
    var fig = $('ex-figure'), statement = $('statement');
    info.textContent = '';

    if (!ex) {
      label.textContent = 'EXHIBITION';
      title.textContent = '次回の展覧会は準備中です';
      $('ex-dates').textContent = '';
      infoRow(info, 'ご案内', '最新情報は公式LINE・Instagramでお知らせします');
      fig.hidden = true;
      statement.hidden = true;
      $('ex-more').hidden = true;
      return;
    }

    label.textContent = norm(ex.start) <= today ? 'NOW ON VIEW' : 'NEXT EXHIBITION';
    title.textContent = ex.title;
    renderDates($('ex-dates'), ex.start, ex.end);
    infoRow(info, '開廊時間', ex.hours);
    infoRow(info, '休廊日', ex.closed);
    infoRow(info, '入場', '予約制（お電話またはLINEにて）');

    var img = (ex.images || [])[0];
    if (img) {
      $('ex-image').src = img;
      $('ex-image').alt = ex.caption ? '出品作品：' + ex.caption : '出品作品より';
      $('ex-caption').textContent = ex.caption || '';
      fig.hidden = false;
    } else {
      fig.hidden = true;
    }

    $('st-description').textContent = ex.description || '';
    $('st-description').hidden = !ex.description;
    $('st-artists').textContent = ex.artists || '';
    $('st-artists-wrap').hidden = !ex.artists;
    $('st-events').textContent = ex.events || '';
    $('st-events-wrap').hidden = !ex.events;
    var hasStatement = !!(ex.description || ex.artists || ex.events);
    statement.hidden = !hasStatement;
    $('ex-more').hidden = !hasStatement;

    document.title = ex.title + '｜シェイクスピアギャラリー';
  }

  function lineItem(period, title) {
    var li = el('li');
    li.appendChild(el('span', 'period', period));
    li.appendChild(el('span', 't', title));
    return li;
  }

  function render(data) {
    var today = todayJST();
    var exs = (data.exhibitions || []).filter(function (x) { return x && x.title && parse(x.start); });

    var current = exs.filter(function (x) { return norm(x.start) <= today && (!x.end || norm(x.end) >= today); })
      .sort(function (a, b) { return norm(b.start) < norm(a.start) ? -1 : 1; });
    var future = exs.filter(function (x) { return norm(x.start) > today; })
      .sort(function (a, b) { return norm(a.start) < norm(b.start) ? -1 : 1; });
    var past = exs.filter(function (x) { return x.end && norm(x.end) < today; })
      .sort(function (a, b) { return norm(a.start) < norm(b.start) ? 1 : -1; });

    var featured = current[0] || future[0] || null;
    renderFeatured(featured, today);
    renderNotices(data.notices);

    // 今後の予定（目玉以外）
    var rest = current.slice(1).concat(future).filter(function (x) { return x !== featured; });
    var up = $('upcoming-list');
    up.textContent = '';
    rest.forEach(function (x) { up.appendChild(lineItem(periodText(x.start, x.end), x.title)); });
    $('upcoming').hidden = !rest.length;

    // 過去の展覧会
    var list = $('archive-list');
    list.textContent = '';
    var seen = {};
    past.forEach(function (x) {
      seen[x.title.replace(/\s+/g, '')] = true;
      list.appendChild(lineItem(periodText(x.start, x.end), x.title));
    });
    (CFG.archive || []).forEach(function (x) {
      if (seen[x.title.replace(/\s+/g, '')]) return;
      list.appendChild(lineItem(x.period, x.title));
    });
  }

  /* ---------- データ読み込み ---------- */

  function load() {
    var fallback = CFG.fallback || { exhibitions: [], notices: [] };
    render(fallback);
    if (!CFG.API_URL) return;
    fetch(CFG.API_URL, { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !Array.isArray(data.exhibitions)) return;
        if (!data.exhibitions.length) data.exhibitions = fallback.exhibitions;
        render(data);
      })
      .catch(function (err) { console.warn('展示情報を読み込めませんでした', err); });
  }

  /* ---------- メニュー ---------- */

  function menu() {
    var btn = document.querySelector('.menu-btn');
    var nav = $('gnav');
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') set(false); });
  }

  $('year').textContent = todayJST().slice(0, 4);
  menu();
  load();
})();
