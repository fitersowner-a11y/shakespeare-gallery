(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var CFG = window.SG_CONFIG || {};
  var PAGE = document.body.getAttribute('data-page') || 'home';
  var DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  var state = { built: null, legacy: [], live: null };

  /* ---------- 小道具 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function todayJST() { return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); }
  function parse(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s || '');
    return m ? { y: +m[1], m: +m[2], d: +m[3], dow: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() } : null;
  }
  function norm(s) {
    var p = parse(s);
    return p ? p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0') : '';
  }
  function key(s) { return String(s || '').replace(/\s+/g, ''); }
  function periodText(x) {
    if (x.period) return x.period;
    var a = parse(x.start), b = parse(x.end);
    if (!a) return '';
    var s = a.y + '. ' + a.m + '. ' + a.d;
    if (!b) return s;
    return s + ' – ' + (b.y !== a.y ? b.y + '. ' : '') + b.m + '. ' + b.d;
  }
  function img(src) {
    var map = (state.built && state.built.mediaMap) || {};
    return map[src] || src;
  }
  function exUrl(x) {
    var pages = (state.built && state.built.pages) || [];
    return pages.indexOf(x.id) >= 0 ? 'ex-' + x.id + '.html' : 'exhibition.html?id=' + encodeURIComponent(x.id);
  }
  function setHidden(node, hidden) { if (node) node.hidden = !!hidden; }

  /* ---------- データ ---------- */
  function getJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  function current() {
    var d = state.live || state.built || {};
    var formEx = (d.exhibitions || []).slice();
    if (!formEx.length) formEx = ((CFG.fallback || {}).exhibitions || []).slice();
    var seen = {};
    formEx.forEach(function (x) { seen[key(x.title)] = true; });
    var all = formEx.concat(state.legacy.filter(function (x) { return !seen[key(x.title)]; }))
      .filter(function (x) { return x && x.title && x.id; });
    all.sort(function (a, b) { return norm(a.start) < norm(b.start) ? 1 : -1; });
    return {
      all: all,
      notices: d.notices || [],
      book: d.book || null,
      town: d.town || [],
    };
  }

  function split(all) {
    var t = todayJST();
    var now = all.filter(function (x) { return norm(x.start) <= t && (!x.end || norm(x.end) >= t) && !/^w-/.test(x.id); });
    var future = all.filter(function (x) { return norm(x.start) > t; }).reverse();
    var past = all.filter(function (x) { return now.indexOf(x) < 0 && future.indexOf(x) < 0; });
    return { now: now, future: future, past: past, featured: now[0] || future[0] || null, today: t };
  }

  /* ---------- 共通の表示 ---------- */
  function renderNotices(list) {
    var box = $('notices');
    if (!box) return;
    box.textContent = '';
    list.forEach(function (n) {
      if (!n.text) return;
      var p = el('p');
      p.appendChild(el('strong', null, 'お知らせ'));
      p.appendChild(document.createTextNode(n.text));
      box.appendChild(p);
    });
    box.hidden = !box.childNodes.length;
  }

  function renderDates(target, x) {
    target.textContent = '';
    if (x.period) { target.appendChild(el('span', null, x.period)); return; }
    var a = parse(x.start), b = parse(x.end);
    if (!a) return;
    function part(p, withYear) {
      target.appendChild(el('span', null, (withYear ? p.y + '. ' : '') + p.m + '. ' + p.d));
      target.appendChild(el('span', 'dow', DOW[p.dow]));
    }
    part(a, true);
    if (b) { target.appendChild(el('span', 'dash', '—')); part(b, b.y !== a.y); }
  }

  function infoRows(dl, x, withBooking) {
    dl.textContent = '';
    [['開廊時間', x.hours], ['休廊日', x.closed], ['入場', withBooking ? '予約制（お電話またはLINEにて）' : '']].forEach(function (r) {
      if (!r[1]) return;
      var row = el('div');
      row.appendChild(el('dt', null, r[0]));
      row.appendChild(el('dd', null, r[1]));
      dl.appendChild(row);
    });
    dl.hidden = !dl.childNodes.length;
  }

  function coverNode(title, alt) {
    var ascii = (String(title).match(/[\x20-\x7e]/g) || []).length / Math.max(1, String(title).length);
    var c = el('div', 'cover' + (alt ? ' alt' : '') + (ascii > 0.3 ? ' h' : ''));
    c.appendChild(el('span', null, title));
    return c;
  }

  function imageOr(src, alt, fallbackNode) {
    if (!src) return fallbackNode;
    var i = el('img');
    i.loading = 'lazy';
    i.decoding = 'async';
    i.alt = alt || '';
    i.src = img(src);
    i.addEventListener('error', function () { if (i.parentNode) i.parentNode.replaceChild(fallbackNode, i); });
    return i;
  }

  function exCard(x, i) {
    var a = el('a', 'ex-card reveal');
    a.href = exUrl(x);
    var th = el('div', 'thumb');
    th.appendChild(imageOr((x.images || [])[0], '', coverNode(x.title, i % 2)));
    a.appendChild(th);
    a.appendChild(el('span', 'period', periodText(x)));
    a.appendChild(el('span', 't', x.title));
    return a;
  }

  function worksGrid(container, x) {
    container.textContent = '';
    var imgs = x.images || [];
    imgs.forEach(function (src, i) {
      var cap = (x.captions || [])[i] || '';
      var fig = el('figure', 'work reveal');
      var btn = el('button', 'zoomable');
      btn.type = 'button';
      btn.setAttribute('aria-label', (cap || '作品画像') + 'を拡大');
      var im = imageOr(src, cap || x.title, coverNode(x.title));
      btn.appendChild(im);
      btn.addEventListener('click', function () { openLightbox(x, i); });
      fig.appendChild(btn);
      if (cap) fig.appendChild(el('figcaption', null, cap));
      container.appendChild(fig);
    });
    return imgs.length;
  }

  function eventLD(x) {
    var base = CFG.SITE_URL || location.href;
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'ExhibitionEvent',
      name: x.title,
      startDate: norm(x.start),
      endDate: norm(x.end) || undefined,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      description: x.description || undefined,
      image: (x.images || []).map(function (s) { return new URL(img(s), base).href; }),
      url: new URL(exUrl(x), base).href,
      location: {
        '@type': 'ArtGallery',
        name: 'シェイクスピアギャラリー',
        address: { '@type': 'PostalAddress', postalCode: '101-0062', addressRegion: '東京都', addressLocality: '千代田区', streetAddress: '神田駿河台1-5-6 コトー駿河台 B1F', addressCountry: 'JP' },
      },
      organizer: { '@type': 'Organization', name: 'シェイクスピアギャラリー', url: base },
    };
    var s = document.getElementById('ld-event') || el('script');
    s.id = 'ld-event';
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---------- トップ ---------- */
  function renderHome(d) {
    var s = split(d.all);
    var ex = s.featured;
    renderNotices(d.notices);

    var info = $('ex-info');
    if (!ex) {
      $('ex-label').textContent = 'EXHIBITION';
      $('ex-title').textContent = '次回の展覧会は準備中です';
      $('ex-dates').textContent = '';
      infoRows(info, { hours: '最新情報は公式LINE・Instagramでお知らせします' }, false);
      info.querySelector('dt').textContent = 'ご案内';
      ['ex-figure', 'statement', 'works', 'ex-more'].forEach(function (id) { setHidden($(id), true); });
    } else {
      $('ex-label').textContent = norm(ex.start) <= s.today ? 'NOW ON VIEW' : 'NEXT EXHIBITION';
      $('ex-title').textContent = ex.title;
      renderDates($('ex-dates'), ex);
      infoRows(info, ex, true);
      var first = (ex.images || [])[0];
      if (first) {
        $('ex-image').src = img(first);
        $('ex-image').alt = ((ex.captions || [])[0] ? '出品作品：' + ex.captions[0] : '出品作品より');
        $('ex-caption').textContent = (ex.captions || [])[0] || '';
        $('ex-zoom').onclick = function () { openLightbox(ex, 0); };
      }
      setHidden($('ex-figure'), !first);
      $('st-description').textContent = ex.description || '';
      setHidden($('st-description'), !ex.description);
      $('st-artists').textContent = ex.artists || '';
      setHidden($('st-artists-wrap'), !ex.artists);
      $('st-events').textContent = ex.events || '';
      setHidden($('st-events-wrap'), !ex.events);
      var hasSt = !!(ex.description || ex.artists || ex.events);
      setHidden($('statement'), !hasSt);
      setHidden($('ex-more'), !hasSt);
      var n = (ex.images || []).length > 1 ? worksGrid($('works-grid'), ex) : 0;
      setHidden($('works'), n < 2);
      eventLD(ex);
    }

    // 今後
    var rest = s.now.slice(1).concat(s.future).filter(function (x) { return x !== ex; });
    var up = $('upcoming-list');
    up.textContent = '';
    rest.forEach(function (x) {
      var li = el('li');
      li.appendChild(el('span', 'period', periodText(x)));
      var a = el('a', 't', x.title);
      a.href = exUrl(x);
      li.appendChild(a);
      up.appendChild(li);
    });
    setHidden($('upcoming'), !rest.length);

    // アーカイブ（最新6件）
    var grid = $('archive-grid');
    grid.textContent = '';
    s.past.slice(0, 6).forEach(function (x, i) { grid.appendChild(exCard(x, i)); });

    // 本の街
    var book = d.book || CFG.book || {};
    $('book-issue').textContent = book.issue || '';
    $('book-text').textContent = book.text || '';
    var link = $('book-link');
    if (book.url) { link.href = book.url; link.hidden = false; link.textContent = d.book ? '今月号を読む' : 'noteで読む'; } else { link.hidden = true; }
    if (book.image) {
      var wrap = $('book-cover-wrap');
      var spine = $('book-cover') || state.spine;
      state.spine = spine;
      wrap.textContent = '';
      wrap.appendChild(imageOr(book.image, '「本の街」' + (book.issue || '') + 'の表紙', spine));
    }

    // 神保町案内（3件）
    var tg = $('town-grid');
    tg.textContent = '';
    d.town.slice(0, 3).forEach(function (t) { tg.appendChild(townCard(t)); });
    setHidden($('town'), !d.town.length);

    // アクセス
    var st = $('stations');
    st.textContent = '';
    (CFG.stations || []).forEach(function (x) {
      st.appendChild(el('li', null, [x.line, x.station, x.exit, x.walk].filter(Boolean).join('　')));
    });
    st.hidden = !st.childNodes.length;
    var q = encodeURIComponent(CFG.mapQuery || '東京都千代田区神田駿河台1-5-6');
    var map = $('map');
    if (map && !map.src) map.src = 'https://maps.google.com/maps?q=' + q + '&z=17&output=embed';
    $('map-link').href = 'https://www.google.com/maps/search/?api=1&query=' + q;
  }

  /* ---------- アーカイブ ---------- */
  function renderArchive(d) {
    renderNotices(d.notices);
    var s = split(d.all);
    var list = s.future.concat(s.now).concat(s.past);
    var box = $('archive-years');
    box.textContent = '';
    var byYear = {};
    var years = [];
    list.forEach(function (x) {
      var y = (parse(x.start) || { y: '—' }).y;
      if (!byYear[y]) { byYear[y] = []; years.push(y); }
      byYear[y].push(x);
    });
    years.forEach(function (y) {
      var block = el('section', 'year-block');
      block.appendChild(el('h2', 'year-label', String(y)));
      var grid = el('div', 'card-grid');
      byYear[y].forEach(function (x, i) { grid.appendChild(exCard(x, i)); });
      block.appendChild(grid);
      box.appendChild(block);
    });
  }

  /* ---------- 展覧会ページ ---------- */
  function renderExhibition(d) {
    renderNotices(d.notices);
    var id = document.body.getAttribute('data-id') || new URLSearchParams(location.search).get('id') || '';
    var list = d.all;
    var idx = -1;
    list.forEach(function (x, i) { if (x.id === id) idx = i; });
    var x = list[idx];
    if (!x) {
      if (!state.apiDone && CFG.API_URL) return; // フォームのデータを読み込み中
      $('d-title').textContent = '展覧会が見つかりませんでした';
      $('d-description').textContent = '掲載が終了したか、URLが変わった可能性があります。';
      return;
    }
    var t = todayJST();
    var live = norm(x.start) <= t && (!x.end || norm(x.end) >= t);
    var soon = norm(x.start) > t;
    $('d-label').textContent = live ? 'NOW ON VIEW' : soon ? 'UPCOMING' : 'ARCHIVE';
    $('d-title').textContent = x.title;
    renderDates($('d-dates'), x);
    infoRows($('d-info'), (live || soon) ? x : {}, live || soon);
    $('d-description').textContent = x.description || '';
    $('d-artists').textContent = x.artists || '';
    setHidden($('d-artists-wrap'), !x.artists);
    $('d-events').textContent = x.events || '';
    setHidden($('d-events-wrap'), !x.events);
    worksGrid($('d-gallery'), x);
    document.title = x.title + '｜シェイクスピアギャラリー';

    // 前後（新しい順に並んでいるので、前 = より新しい）
    var newer = list[idx - 1], older = list[idx + 1];
    [['d-prev', older, '← PREVIOUS'], ['d-next', newer, 'NEXT →']].forEach(function (p) {
      var a = $(p[0]);
      if (!p[1]) { a.hidden = true; return; }
      a.textContent = '';
      a.appendChild(el('small', null, p[2]));
      a.appendChild(el('span', null, p[1].title));
      a.href = exUrl(p[1]);
      a.hidden = false;
    });
    eventLD(x);
  }

  /* ---------- 神保町案内 ---------- */
  function townCard(t) {
    var c = el('article', 'town-card reveal');
    if (t.image) {
      var th = el('div', 'thumb');
      th.appendChild(imageOr(t.image, t.name, el('span')));
      c.appendChild(th);
    }
    var b = el('div', 'body');
    b.appendChild(el('span', 'cat', t.category));
    b.appendChild(el('h3', 'name', t.name));
    if (t.text) b.appendChild(el('p', 'txt', t.text));
    var links = el('div', 'links');
    if (t.address) {
      var m = el('a', null, t.address + ' →');
      m.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(t.name + ' ' + t.address);
      links.appendChild(m);
    }
    if (t.url) {
      var w = el('a', null, 'ウェブサイト →');
      w.href = t.url;
      w.rel = 'noopener';
      links.appendChild(w);
    }
    if (links.childNodes.length) b.appendChild(links);
    c.appendChild(b);
    return c;
  }

  var townFilter = 'すべて';
  function renderTown(d) {
    renderNotices(d.notices);
    var cats = ['すべて'];
    d.town.forEach(function (t) { if (cats.indexOf(t.category) < 0) cats.push(t.category); });
    var chips = $('town-filters');
    chips.textContent = '';
    if (cats.length > 2) {
      cats.forEach(function (c) {
        var b = el('button', 'chip', c);
        b.type = 'button';
        b.setAttribute('aria-pressed', c === townFilter ? 'true' : 'false');
        b.addEventListener('click', function () { townFilter = c; renderTown(d); observe(); });
        chips.appendChild(b);
      });
    }
    var list = $('town-list');
    list.textContent = '';
    d.town.filter(function (t) { return townFilter === 'すべて' || t.category === townFilter; })
      .forEach(function (t) { list.appendChild(townCard(t)); });
    setHidden($('town-empty'), d.town.length);
  }

  /* ---------- 拡大表示 ---------- */
  var lb = null, lbItem = null, lbIndex = 0;
  function buildLightbox() {
    lb = el('dialog', 'lightbox');
    lb.setAttribute('aria-label', '作品の拡大表示');
    var count = el('span', 'lb-count');
    var fig = el('figure');
    var im = el('img');
    var cap = el('figcaption');
    fig.appendChild(im);
    fig.appendChild(cap);
    function icon(path) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' + path + '</svg>'; }
    var close = el('button', 'lb-btn lb-close'); close.type = 'button'; close.setAttribute('aria-label', '閉じる'); close.innerHTML = icon('<line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/>');
    var prev = el('button', 'lb-btn lb-prev'); prev.type = 'button'; prev.setAttribute('aria-label', '前の作品'); prev.innerHTML = icon('<polyline points="15 5 8 12 15 19"/>');
    var next = el('button', 'lb-btn lb-next'); next.type = 'button'; next.setAttribute('aria-label', '次の作品'); next.innerHTML = icon('<polyline points="9 5 16 12 9 19"/>');
    [count, fig, close, prev, next].forEach(function (n) { lb.appendChild(n); });
    document.body.appendChild(lb);
    close.addEventListener('click', function () { lb.close(); });
    prev.addEventListener('click', function () { show(lbIndex - 1); });
    next.addEventListener('click', function () { show(lbIndex + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === fig) lb.close(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') show(lbIndex - 1);
      if (e.key === 'ArrowRight') show(lbIndex + 1);
    });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) show(lbIndex + (dx < 0 ? 1 : -1));
      sx = null;
    });
    function show(i) {
      var n = (lbItem.images || []).length;
      lbIndex = (i + n) % n;
      im.src = img(lbItem.images[lbIndex]);
      var c = (lbItem.captions || [])[lbIndex] || '';
      im.alt = c || lbItem.title;
      cap.textContent = c;
      count.textContent = n > 1 ? (lbIndex + 1) + ' / ' + n : '';
      prev.hidden = next.hidden = n < 2;
    }
    lb.show_ = show;
  }
  function openLightbox(x, i) {
    if (!lb) buildLightbox();
    lbItem = x;
    lb.show_(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  }

  /* ---------- ふわっと表示 ---------- */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function observe() {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (n) {
      if (io) io.observe(n); else n.classList.add('in');
    });
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

  /* ---------- 実行 ---------- */
  function render() {
    var d = current();
    document.querySelectorAll('[data-needs="town"]').forEach(function (a) { a.hidden = !d.town.length; });
    if (PAGE === 'home') renderHome(d);
    else if (PAGE === 'archive') renderArchive(d);
    else if (PAGE === 'exhibition') renderExhibition(d);
    else if (PAGE === 'town') renderTown(d);
    observe();
  }

  $('year').textContent = todayJST().slice(0, 4);
  menu();

  Promise.all([
    getJSON('data.json').catch(function () { return null; }),
    getJSON('legacy.json').catch(function () { return { exhibitions: [] }; }),
  ]).then(function (r) {
    state.built = r[0];
    state.legacy = (r[1] && r[1].exhibitions) || [];
    render();
    if (!CFG.API_URL) return;
    return getJSON(CFG.API_URL).then(function (live) {
      state.apiDone = true;
      if (live && Array.isArray(live.exhibitions)) state.live = live;
      render();
    });
  }).catch(function (err) { console.warn('読み込みに失敗しました', err); state.apiDone = true; render(); });
})();
