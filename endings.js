/**
 * endings.js
 * ------------------------------------------------------------------
 * エンディングの定義。設計資料「04 エンディング設計」に対応。
 *
 * 通常のエンディングは、最終ステータスと各アーキタイプの target を
 * 比較し、最も距離が近いものが採用される（engine.js の
 * computeEnding() を参照）。
 *
 * forcedOnly のエンディングは距離計算の対象にならず、ステージ側で
 * endGame: "id" が指定されたときにだけ到達する特殊エンディング
 * （多浪の末の進路変更、医学部放校など）。
 * ------------------------------------------------------------------
 */

const ENDING_ARCHETYPES = [
  {
    id: "community_doctor",
    label: "地域医療の名医",
    desc: "地域に根ざし、家族にも恵まれた医師人生。派手さはないが、確かな信頼を積み上げた。",
    target: { clinicalSkill: 65, reputation: 80, health: 60, familyBond: 80, network: 55, careerFulfillment: 75, moneyIndex: 45 },
  },
  {
    id: "international_researcher",
    label: "国際的研究者",
    desc: "国境を越えて研究と人脈を広げ、専門性を極めた医師人生。",
    target: { clinicalSkill: 90, reputation: 70, health: 50, familyBond: 45, network: 80, careerFulfillment: 75, moneyIndex: 55 },
  },
  {
    id: "hospital_owner",
    label: "病院・診療所経営者",
    desc: "経営者としての手腕を発揮し、資産と評判を築いた医師人生。",
    target: { clinicalSkill: 55, reputation: 75, health: 45, familyBond: 55, network: 70, careerFulfillment: 65, moneyIndex: 85 },
  },
  {
    id: "work_life_balance",
    label: "ワークライフバランス重視医師",
    desc: "健康と家族との時間を大切にしながら、無理のないペースで歩んだ医師人生。",
    target: { clinicalSkill: 55, reputation: 50, health: 80, familyBond: 85, network: 50, careerFulfillment: 65, moneyIndex: 50 },
  },
  {
    id: "generalist_switch",
    label: "総合診療医への転身",
    desc: "専門を究めたのち、あえて幅広く診る道を選び直した医師人生。",
    target: { clinicalSkill: 60, reputation: 60, health: 65, familyBond: 70, network: 75, careerFulfillment: 80, moneyIndex: 45 },
  },
  {
    id: "burnout",
    label: "燃え尽き症候群（警鐘エンド）",
    desc: "実績を積み上げた一方で、心身と家族との関係を犠牲にしてしまった医師人生。",
    target: { clinicalSkill: 75, reputation: 60, health: 25, familyBond: 25, network: 40, careerFulfillment: 30, moneyIndex: 60 },
  },
  {
    id: "overseas_doctor",
    label: "海外移住医師",
    desc: "海外での経験を経て、そのまま現地に根を下ろした医師人生。",
    target: { clinicalSkill: 85, reputation: 55, health: 60, familyBond: 40, network: 85, careerFulfillment: 70, moneyIndex: 65 },
  },
  {
    id: "lifelong_town_doctor",
    label: "生涯現役の町医者",
    desc: "定年を越えてなお、地域の診療所に立ち続けた医師人生。",
    target: { clinicalSkill: 60, reputation: 70, health: 70, familyBond: 80, network: 60, careerFulfillment: 80, moneyIndex: 40 },
  },

  // ── 強制エンディング（距離計算の対象外） ─────────────────────
  {
    id: "other_medical_profession",
    label: "医師以外の医療専門職としての人生",
    desc: "医学部合格には至らなかったが、医療に関わる別の専門職としてのキャリアを築いた。",
    forcedOnly: true,
  },
  {
    id: "medical_school_dropout",
    label: "医学部を去った道",
    desc: "医学部生活の途中で道を外れ、まったく別の人生を歩むことになった。",
    forcedOnly: true,
  },
];
