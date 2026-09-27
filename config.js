// サイト設定
window.SG_CONFIG = {
  // Googleフォーム連携（Apps Scriptのウェブアプリ）のURL。設置後に貼り替えます。
  API_URL: 'https://script.google.com/macros/s/AKfycbwnoJeDmK1X-JAPrI7TZnfGQgHiKFT8x3TbGHXHUA1Nmk_rVJhGARF8VbuipCLpQL-X/exec',

  // フォームにまだ何も入っていないとき・読み込めないときに表示する内容
  fallback: {
    exhibitions: [
      {
        title: '黒眼鏡の旦那と帰国後・戦後の友人たち',
        start: '2026-10-02',
        end: '2026-10-31',
        hours: '',
        closed: '',
        description: '',
        artists: '',
        events: '',
        caption: '',
        images: ['images/current.jpg'],
      },
    ],
    notices: [],
  },

  // Wix時代の過去の展覧会（手入力の記録。period はそのまま表示されます）
  archive: [
    { period: '2026. 8. 20 – 9. 18', title: '萩谷 巌展 ＋1920年代巴里写真' },
    { period: '2022. 11. 9 – 11. 19', title: '1930年欧州の日本人画家たち' },
    { period: '2022. 2 – 3', title: 'エコール・ド・パリから100年展' },
    { period: '2020. 7. 3 – 7. 26', title: '銀座「画廊宮坂」の35年　小品の魅力 3号 150点展' },
    { period: '2020. 3 –', title: '内田九一の江戸城新発見写真' },
    { period: '2019. 9. 20 – 9. 29', title: 'アンドレア・テルセロス「Impermanence / Mujō - 無常」展' },
    { period: '2019. 6', title: 'T-SAKU展　〜中学教師から流木を使った創作家具へ〜' },
  ],
};
