#!/usr/bin/env python3
"""
シェイクスピアギャラリー 自動ビルド（GitHub Actions から30分ごとに実行）

やること
  1. フォームのデータ（Apps Script）と legacy.json を読む
  2. 写真を media/ に保存（Googleドライブ・Wixが消えても表示されるように）
  3. data.json を書き出す（サイトが最初に読むデータ）
  4. 展覧会ごとのページ ex-<id>.html を作る（シェア用の画像・説明、Google向けのイベント情報）
  5. トップページのシェア用画像を、いまの展覧会の作品にする
  6. sitemap.xml / robots.txt を作る
"""
import datetime
import hashlib
import html
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA = os.path.join(ROOT, 'media')
UA = {'User-Agent': 'Mozilla/5.0 (shakespeare-gallery build)'}


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def write(path, text):
    full = os.path.join(ROOT, path)
    old = None
    if os.path.exists(full):
        with open(full, encoding='utf-8') as f:
            old = f.read()
    if old != text:
        with open(full, 'w', encoding='utf-8') as f:
            f.write(text)
        print('更新:', path)


def config_value(name):
    m = re.search(name + r"\s*:\s*'([^']*)'", read('config.js'))
    return m.group(1) if m else ''


def fetch(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(), r.headers.get('Content-Type', '')


def today_jst():
    return (datetime.datetime.utcnow() + datetime.timedelta(hours=9)).strftime('%Y-%m-%d')


def norm_date(s):
    m = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})', s or '')
    return '%s-%02d-%02d' % (m.group(1), int(m.group(2)), int(m.group(3))) if m else ''


def key(s):
    return re.sub(r'\s+', '', s or '')


# ---------- 写真の保存 ----------
EXT = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif'}


def save_media(url, media_map, used):
    if not url or not url.startswith('http'):
        return
    name_base = hashlib.sha1(url.encode('utf-8')).hexdigest()[:16]
    for ext in EXT.values():
        p = os.path.join(MEDIA, name_base + ext)
        if os.path.exists(p):
            media_map[url] = 'media/' + name_base + ext
            used.add(name_base + ext)
            return
    try:
        body, ctype = fetch(url)
        ext = EXT.get(ctype.split(';')[0].strip())
        if not ext or len(body) < 500:
            print('写真ではないためスキップ:', url, ctype)
            return
        os.makedirs(MEDIA, exist_ok=True)
        with open(os.path.join(MEDIA, name_base + ext), 'wb') as f:
            f.write(body)
        media_map[url] = 'media/' + name_base + ext
        used.add(name_base + ext)
        print('写真を保存:', name_base + ext)
    except Exception as e:  # 1枚失敗しても全体は止めない
        print('写真の取得に失敗:', url, e)


# ---------- ページ生成 ----------
def meta_block(site, title, desc, path, image, extra_ld=None):
    e = html.escape
    lines = [
        '<!--META-->',
        '<title>%s</title>' % e(title),
        '<meta name="description" content="%s">' % e(desc),
        '<link rel="canonical" href="%s">' % e(site + path),
        '<meta property="og:title" content="%s">' % e(title),
        '<meta property="og:description" content="%s">' % e(desc),
        '<meta property="og:image" content="%s">' % e(image),
        '<meta property="og:url" content="%s">' % e(site + path),
        '<meta property="og:type" content="%s">' % ('article' if path.startswith('ex-') else 'website'),
        '<meta property="og:site_name" content="シェイクスピアギャラリー">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if extra_ld:
        lines.append('<script type="application/ld+json">%s</script>' % json.dumps(extra_ld, ensure_ascii=False).replace('</', '<\\/'))
    lines.append('<!--/META-->')
    return '\n'.join(lines)


def replace_meta(src, block):
    return re.sub(r'<!--META-->.*?<!--/META-->', lambda _: block, src, flags=re.S)


def short(text, n=110):
    t = re.sub(r'\s+', ' ', text or '').strip()
    return t if len(t) <= n else t[:n - 1] + '…'


def period(x):
    if x.get('period'):
        return x['period']
    a, b = norm_date(x.get('start')), norm_date(x.get('end'))
    if not a:
        return ''
    fa = '%d年%d月%d日' % tuple(int(v) for v in a.split('-'))
    if not b:
        return fa
    return fa + '〜' + '%d月%d日' % tuple(int(v) for v in b.split('-')[1:])


def event_ld(site, x, image_abs):
    ld = {
        '@context': 'https://schema.org',
        '@type': 'ExhibitionEvent',
        'name': x['title'],
        'startDate': norm_date(x.get('start')),
        'eventStatus': 'https://schema.org/EventScheduled',
        'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
        'url': site + 'ex-%s.html' % x['id'],
        'location': {
            '@type': 'ArtGallery', 'name': 'シェイクスピアギャラリー',
            'address': {'@type': 'PostalAddress', 'postalCode': '101-0062', 'addressRegion': '東京都',
                        'addressLocality': '千代田区', 'streetAddress': '神田駿河台1-5-6 コトー駿河台 B1F', 'addressCountry': 'JP'},
        },
        'organizer': {'@type': 'Organization', 'name': 'シェイクスピアギャラリー', 'url': site},
    }
    if norm_date(x.get('end')):
        ld['endDate'] = norm_date(x['end'])
    if x.get('description'):
        ld['description'] = short(x['description'], 300)
    if image_abs:
        ld['image'] = [image_abs]
    return ld


def main():
    site = config_value('SITE_URL')
    api = config_value('API_URL')
    if not site.endswith('/'):
        site += '/'

    data = {'exhibitions': [], 'notices': [], 'book': None, 'town': []}
    if api:
        try:
            body, _ = fetch(api)
            data = json.loads(body.decode('utf-8'))
        except Exception as e:
            print('フォームのデータを読めませんでした（前回の data.json を使います）:', e)
            try:
                prev = json.loads(read('data.json'))
                data = {k: prev.get(k) for k in ('exhibitions', 'notices', 'book', 'town')}
            except Exception:
                pass
    legacy = json.loads(read('legacy.json')).get('exhibitions', [])

    # 写真
    media_map, used = {}, set()
    urls = []
    for x in (data.get('exhibitions') or []) + legacy:
        urls += x.get('images') or []
    for t in data.get('town') or []:
        urls.append(t.get('image'))
    if data.get('book'):
        urls.append(data['book'].get('image'))
    for u in urls:
        save_media(u, media_map, used)
    # 使われなくなった写真を片付け
    if os.path.isdir(MEDIA):
        for f in os.listdir(MEDIA):
            if f not in used:
                os.remove(os.path.join(MEDIA, f))
                print('写真を削除:', f)

    def local(u):
        return media_map.get(u, u)

    def abs_img(u):
        if not u:
            return site + 'current.jpg'
        u = local(u)
        return u if u.startswith('http') else site + u

    # 展覧会の一覧（フォーム優先）
    seen = {key(x['title']) for x in data.get('exhibitions') or []}
    exhibitions = [x for x in (data.get('exhibitions') or []) if x.get('id')] + \
                  [x for x in legacy if key(x['title']) not in seen]

    # 展覧会ページ
    template = read('exhibition.html')
    pages = []
    for x in exhibitions:
        img = abs_img((x.get('images') or [None])[0])
        title = '%s｜シェイクスピアギャラリー' % x['title']
        desc = short('%s　%s' % (period(x), x.get('description') or '神田駿河台のシェイクスピアギャラリーで開催。'))
        page = replace_meta(template, meta_block(site, title, desc, 'ex-%s.html' % x['id'], img, event_ld(site, x, img)))
        page = page.replace('data-page="exhibition" data-id=""', 'data-page="exhibition" data-id="%s"' % html.escape(x['id']))
        write('ex-%s.html' % x['id'], page)
        pages.append(x['id'])
    for f in os.listdir(ROOT):
        m = re.match(r'ex-(.+)\.html$', f)
        if m and m.group(1) not in pages:
            os.remove(os.path.join(ROOT, f))
            print('ページを削除:', f)

    # トップページのシェア画像・説明
    t = today_jst()
    form_ex = data.get('exhibitions') or []
    now = [x for x in form_ex if norm_date(x['start']) <= t <= (norm_date(x.get('end')) or '9999')]
    future = sorted([x for x in form_ex if norm_date(x['start']) > t], key=lambda x: x['start'])
    featured = (sorted(now, key=lambda x: x['start'], reverse=True) + future + [None])[0]
    home_title = 'シェイクスピアギャラリー｜Shakespeare Gallery 神田駿河台'
    home_desc = '神田駿河台のアートギャラリー。パリ左岸の書店「シェイクスピア・アンド・カンパニー」に敬意を表し、文学・芸術を愛する人々が集う場所として2018年に開廊しました。'
    ld = None
    img = site + 'current.jpg'
    if featured:
        img = abs_img((featured.get('images') or [None])[0])
        home_desc = short('%s「%s」%s。%s' % ('開催中' if featured in now else '次回展覧会', featured['title'], period(featured), home_desc), 150)
        ld = event_ld(site, featured, img)
    write('index.html', replace_meta(read('index.html'), meta_block(site, home_title, home_desc, '', img, ld)))

    # data.json
    out = dict(data)
    out['mediaMap'] = media_map
    out['pages'] = pages
    out['generatedAt'] = datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'
    old = {}
    try:
        old = json.loads(read('data.json'))
    except Exception:
        pass
    if {k: v for k, v in old.items() if k != 'generatedAt'} != {k: v for k, v in out.items() if k != 'generatedAt'}:
        write('data.json', json.dumps(out, ensure_ascii=False, indent=1))

    # sitemap / robots
    urls = ['', 'archive.html'] + (['town.html'] if data.get('town') else []) + ['ex-%s.html' % p for p in pages]
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += ['  <url><loc>%s</loc></url>' % html.escape(site + u) for u in urls]
    sm.append('</urlset>')
    write('sitemap.xml', '\n'.join(sm) + '\n')
    write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n' % site)
    return 0


if __name__ == '__main__':
    sys.exit(main())
