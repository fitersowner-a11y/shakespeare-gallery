// サイト設定
window.SG_CONFIG = {
  // サイトの公開URL（独自ドメインにしたらここを書き換えます。最後の / を忘れずに）
  SITE_URL: 'https://fitersowner-a11y.github.io/shakespeare-gallery/',

  // Googleフォーム連携（Apps Scriptのウェブアプリ）のURL
  API_URL: 'https://script.google.com/macros/s/AKfycbwnoJeDmK1X-JAPrI7TZnfGQgHiKFT8x3TbGHXHUA1Nmk_rVJhGARF8VbuipCLpQL-X/exec',

  // フォームにまだ展覧会が入っていないときに表示する内容
  fallback: {
    exhibitions: [
      {
        id: '20261002-kurome',
        title: '黒眼鏡の旦那と帰国後・戦後の友人たち',
        start: '2026-10-02',
        end: '2026-10-31',
        images: ['current.jpg'],
        captions: [''],
      },
    ],
  },

  // 「本の街」欄（フォームで最新号が送られるまでの表示）
  book: {
    issue: '神田・お茶の水・神保町の月刊フリーマガジン',
    text: '1980年創刊、2025年に復刊した街の月刊誌「本の街」。古書店や喫茶店、街の人々の話題を毎月お届けしています。',
    url: 'https://note.com/shin_honnomachi',
    image: '',
  },

  // アクセス：最寄り駅（書き足すと表示されます）
  // 例：{ line: 'JR中央線・総武線', station: '御茶ノ水駅', exit: '御茶ノ水橋口', walk: '徒歩5分' },
  stations: [],

  // 地図の検索語
  mapQuery: '東京都千代田区神田駿河台1-5-6',
};
