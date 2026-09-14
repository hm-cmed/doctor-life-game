/**
 * params.js
 * ------------------------------------------------------------------
 * ゲーム全体で使うパラメータの定義と初期値。
 * 設計資料「03 パラメータ設計」に対応。
 *
 * 新しいパラメータを増やしたい場合は PARAMS_CONFIG と INITIAL_STATS の
 * 両方に追記すること。0-100スケールのパラメータは engine.js 側で
 * 自動的に 0〜100 にクランプされる（money は対象外）。
 * ------------------------------------------------------------------
 */

// 表示用のパラメータ定義（順序 = 画面での表示順）
const PARAMS_CONFIG = [
  { key: "money", label: "資産", type: "money" },
  { key: "clinicalSkill", label: "臨床スキル／専門性", type: "scale" },
  { key: "reputation", label: "評判・社会的信用", type: "scale" },
  { key: "health", label: "健康", type: "scale" },
  { key: "familyBond", label: "家族関係", type: "scale" },
  { key: "network", label: "人脈", type: "scale" },
  { key: "careerFulfillment", label: "キャリア充実度", type: "scale" },
];

// 幸福度（複合指標）の加重平均に使う重み。合計は 1.0 にしておくこと。
// health / familyBond / careerFulfillment は 0-100 のスケール値をそのまま使い、
// money だけ moneyIndex() で 0-100 相当に正規化してから加重する。
const HAPPINESS_WEIGHTS = {
  health: 0.3,
  familyBond: 0.3,
  careerFulfillment: 0.25,
  moneyIndex: 0.15,
};

// ゲーム開始時点（0歳）のステータス
const INITIAL_STATS = {
  money: 1000000,
  clinicalSkill: 40,
  reputation: 10,
  health: 80,
  familyBond: 60,
  network: 20,
  careerFulfillment: 50,
};

// 都道府県（47）
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
];

// 「都市部」として扱う都道府県（フレーバー用の簡易分類。自由に調整可）
const URBAN_PREFECTURES = ["東京都", "大阪府", "愛知県", "神奈川県", "福岡県"];

// 基本領域専門医（19分野）
const BASIC_SPECIALTIES = [
  "内科", "外科", "小児科", "産婦人科", "精神科", "皮膚科", "眼科",
  "耳鼻咽喉科", "泌尿器科", "脳神経外科", "整形外科", "形成外科",
  "放射線科", "麻酔科", "病理", "臨床検査", "救急科", "総合診療科",
  "リハビリテーション科",
];

// money（円、負債もあり得る）を 0-100 相当のスケールに正規化する。
// -1,500,000円 で 0、+5,000,000円 で 100 になるよう線形マッピング。
// あくまでエンディング判定用の目安であり、実際の資産表示には使わない。
function moneyIndex(money) {
  const clamped = Math.max(-1500000, Math.min(5000000, money));
  return ((clamped + 1500000) / 6500000) * 100;
}
