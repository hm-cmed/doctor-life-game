/**
 * boardData.js
 * ------------------------------------------------------------------
 * 医師版「人生ゲーム」のゲーム盤データ
 * - マス目（タイル）の配置・イベント
 * - 職業・専門医カード
 * - お宝カード
 * - 保険・証券データ
 * ------------------------------------------------------------------
 */

// お宝カード定義
export const TREASURE_CARDS = [
  {
    id: "nejm_paper",
    name: "NEJM筆頭著者論文",
    category: "学術的栄誉",
    value: 15000000,
    icon: "📜",
    desc: "世界最高峰の医学誌「New England Journal of Medicine」に掲載された歴史的論文。"
  },
  {
    id: "davinci_robot",
    name: "手術支援ロボット「ダビンチ」",
    category: "医療資産",
    value: 20000000,
    icon: "🤖",
    desc: "最先端の高精度3D内視鏡手術システム。自院の誇る最高級設備。"
  },
  {
    id: "karuizawa_villa",
    name: "軽井沢のドクターズ別荘",
    category: "不動産",
    value: 12000000,
    icon: "🏡",
    desc: "多忙な医療現場を離れて深呼吸できる、木立に囲まれた贅沢な癒しの空間。"
  },
  {
    id: "drug_patent",
    name: "画期的抗体医薬の特許権",
    category: "知的財産",
    value: 25000000,
    icon: "💡",
    desc: "世界中の難病患者を救う新薬の基本特許。巨額のライセンス収入を生む。"
  },
  {
    id: "jma_medal",
    name: "日本医師会 最高栄誉メダル",
    category: "栄誉",
    value: 10000000,
    icon: "🎖️",
    desc: "地域医療と公衆衛生に多大な貢献を果たした医師にのみ授与される至高の賞。"
  },
  {
    id: "vintage_porsche",
    name: "往診用ヴィンテージカー",
    category: "趣味・愛車",
    value: 8000000,
    icon: "🏎️",
    desc: "「往診にも車へのこだわりを忘れない」粋な名医のシンボル。"
  },
  {
    id: "honorary_director",
    name: "地域中核病院の名誉院長ポスト",
    category: "社会的地位",
    value: 18000000,
    icon: "🏥",
    desc: "退任後も生涯にわたり厚い信望と特別手当を約束される最高ポスト。"
  },
  {
    id: "bestseller_book",
    name: "一般向け健康新書ベストセラー",
    category: "著作・文化",
    value: 7000000,
    icon: "📚",
    desc: "100万部を突破し社会現象となった健康書。テレビ出演依頼も殺到。"
  }
];

// 専門医・キャリアカード
export const SPECIALTY_CARDS = [
  { id: "general", name: "総合診療科・家庭医", salaryBonus: 1500000, icon: "🩺", desc: "地域医療の要。どんな主訴も見逃さない全人医療のスペシャリスト。" },
  { id: "surgery", name: "消化器・一般外科", salaryBonus: 3000000, icon: "🔪", desc: "メス一本で命を救う。高い技術と強靭な体力が求められる花形診療科。" },
  { id: "pediatrics", name: "小児科専門医", salaryBonus: 1800000, icon: "🧸", desc: "未来ある子どもたちの守護神。保護者からの信頼も厚い。" },
  { id: "neurosurgery", name: "脳神経外科専門医", salaryBonus: 3500000, icon: "🧠", desc: "ミクロの世界でミリ単位の精密手術に挑むゴッドハンド。" },
  { id: "dermatology", name: "皮膚科・美容皮膚科", salaryBonus: 3200000, icon: "✨", desc: "保険診療から最新の自由診療まで、幅広いニーズで高収入も狙える。" },
  { id: "emergency", name: "救急科専門医", salaryBonus: 2800000, icon: "🚑", desc: "24時間365日、一刻を争う救命の最前線に立ち続ける熱血ドクター。" },
  { id: "cardiology", name: "循環器内科専門医", salaryBonus: 3000000, icon: "❤️", desc: "心臓カテーテル治療のエキスパート。急変時にも迅速に対応。" },
  { id: "anesthesiology", name: "麻酔科専門医", salaryBonus: 2500000, icon: "💤", desc: "手術室の司令塔。患者の全身管理を司り、引っ張りだこの専門医。" }
];

/**
 * マスの種類（Tile Types）：
 * - start: スタート
 * - blue: 好調・プラスイベント
 * - red: 出費・トラブル・当直
 * - pink: 家族・結婚・子ども
 * - green: 給料日（通過時にも給料支給！）
 * - yellow: お宝・資格・チャンス
 * - stop: 強制ストップマス（人生の重大分岐）
 * - goal: リタイアメント（ゴール）
 */
export const BOARD_TILES = [
  // === 0〜10: 医学部〜医師国家試験編 ===
  {
    id: 0,
    title: "スタート：医学部入学",
    type: "start",
    zone: "med_school",
    desc: "難関を突破して医学生に！白衣の人生ゲームがここから始まります。",
    effect: { text: "初期資金 ¥2,000,000、給料 ¥3,000,000 でスタート！" }
  },
  {
    id: 1,
    title: "解剖学実習の洗礼",
    type: "blue",
    zone: "med_school",
    desc: "夜遅くまでスケッチと解剖に没頭。医学の重みと尊さを学ぶ。",
    effect: { money: 500000, text: "実習奨学金を獲得！ +¥500,000" }
  },
  {
    id: 2,
    title: "医学書・聴診器を爆買い",
    type: "red",
    zone: "med_school",
    desc: "リットマンの高級聴診器と分厚い医学成書を揃えて形から入る。",
    effect: { money: -300000, text: "教科書・器具代の出費！ -¥300,000" }
  },
  {
    id: 3,
    title: "ポリクリ（臨床実習）の褒め言葉",
    type: "blue",
    zone: "med_school",
    desc: "回診で教授の鋭い質問に即答！周囲のドクターから一目置かれる。",
    effect: { money: 1000000, text: "教授からお小遣い・図書カード！ +¥1,000,000" }
  },
  {
    id: 4,
    title: "当直バイト初体験",
    type: "blue",
    zone: "med_school",
    desc: "救急外来の見学で先輩から当直夜食の差し入れをもらい、闘志が湧く。",
    effect: { money: 800000, text: "学生支援金支給！ +¥800,000" }
  },
  {
    id: 5,
    title: "CBT・OSCE試験突破！",
    type: "yellow",
    zone: "med_school",
    desc: "全国共用試験を優秀な成績で一発クリア！臨床実習資格をゲット。",
    effect: { money: 1500000, text: "成績優秀者表彰！ +¥1,500,000" }
  },
  {
    id: 6,
    title: "医大祭でバンド演奏",
    type: "pink",
    zone: "med_school",
    desc: "医大祭のステージで大熱狂！看護学生や他大学の仲間と絆が深まる。",
    effect: { money: 500000, text: "友情と人気を獲得！ +¥500,000" }
  },
  {
    id: 7,
    title: "進級判定の胃痛クライシス",
    type: "red",
    zone: "med_school",
    desc: "生理学の再試通知に震える…徹夜で過去問を丸暗記してギリギリセーフ！",
    effect: { money: -500000, text: "徹夜のエナドリ＆補習代！ -¥500,000" }
  },
  {
    id: 8,
    title: "国試対策予備校の猛特訓",
    type: "blue",
    zone: "med_school",
    desc: "回数別・QBを解きまくり模試で全国A判定を獲得！",
    effect: { money: 1000000, text: "合格祈願の仕送り受領！ +¥1,000,000" }
  },
  {
    id: 9,
    title: "【STOP】医師国家試験！",
    type: "stop",
    stopType: "kokushi",
    zone: "med_school",
    desc: "運命の医師国家試験！全員必ずここでストップし、医師免許を取得します！",
    effect: {
      text: "合格おめでとう！医師免許を取得！給料が ¥5,000,000 に昇給！全員から合格祝い ¥1,000,000 受給！",
      salary: 5000000,
      money: 1000000
    }
  },

  // === 10〜19: 初期研修医・専門医への道編 ===
  {
    id: 10,
    title: "初期研修医スタート（給料日）",
    type: "green",
    zone: "residency",
    desc: "胸に「研修医」の名札。初めての給料袋を手にして身が引き締まる。",
    effect: { isSalary: true, text: "給料日！初任給を受け取りました！" }
  },
  {
    id: 11,
    title: "救急車受け入れの修羅場",
    type: "red",
    zone: "residency",
    desc: "ウォークインと救急搬送が重なり怒涛の当直！朝日で目がチカチカ。",
    effect: { money: -400000, text: "当直明けのストレス買い！ -¥400,000" }
  },
  {
    id: 12,
    title: "ルート確保を一発成功！",
    type: "blue",
    zone: "residency",
    desc: "難しい血管の点滴を一発で留置！病棟看護師長から絶賛される。",
    effect: { money: 1200000, text: "臨時研修インセンティブ！ +¥1,200,000" }
  },
  {
    id: 13,
    title: "医師賠償責任保険への加入チャンス",
    type: "yellow",
    specialAction: "insurance_malpractice",
    zone: "residency",
    desc: "万一の医療事故・訴訟に備え、医師賠償責任保険に加入できます（年掛金 ¥500,000）。",
    effect: { text: "加入すると、後の高額訴訟イベントを完全無効化できます！" }
  },
  {
    id: 14,
    title: "初めての症例報告・学会発表",
    type: "blue",
    zone: "residency",
    desc: "地方学会で緊張のスライド発表！質疑応答も見事に乗り切った！",
    effect: { money: 1500000, text: "若手奨励賞を受賞！ +¥1,500,000" }
  },
  {
    id: 15,
    title: "初期研修修了記念（給料日）",
    type: "green",
    zone: "residency",
    desc: "2年間の初期研修を無事修了！一人前の医師として給料が大幅アップ！",
    effect: { isSalary: true, salaryBonus: 2000000, text: "給料日＆基本給が +¥2,000,000 昇給！" }
  },
  {
    id: 16,
    title: "当直代行を依頼！",
    type: "red",
    specialAction: "duty_exchange",
    zone: "residency",
    desc: "どうしても外せない用事が発生！他のプレイヤー1名に当直代行を依頼し謝礼を払う！",
    effect: { text: "他のプレイヤー1名を選んで ¥1,000,000 を支払い、相手はそのお金を獲得！" }
  },
  {
    id: 17,
    title: "生命・医療保険の加入チャンス",
    type: "yellow",
    specialAction: "insurance_life",
    zone: "residency",
    desc: "過酷な当直生活に備え、手厚い医療保険に加入できます（掛金 ¥500,000）。",
    effect: { text: "加入すると、病気や過労入院のペナルティを保険金でカバー！" }
  },
  {
    id: 18,
    title: "【STOP】基本領域専門医の選択！",
    type: "stop",
    stopType: "specialty_choice",
    zone: "residency",
    desc: "あなたの進む道を決める運命のストップマス！専門医カードを1枚引いて専門分野を決定！",
    effect: { text: "専門医カードを獲得！専門医手当で給料が大幅にアップします！" }
  },

  // === 19〜30: 人生の転機・結婚・生活編 ===
  {
    id: 19,
    title: "専攻医としての新生活（給料日）",
    type: "green",
    zone: "specialist",
    desc: "専門領域の第一線でフル回転。当直バイトも解禁されて収入増！",
    effect: { isSalary: true, text: "給料日！専門医としての給与が振り込まれました。" }
  },
  {
    id: 20,
    title: "運命の出会い！",
    type: "pink",
    zone: "specialist",
    desc: "学会後の懇親会、または同僚との食事会で素敵なパートナーと出会う！",
    effect: { money: 1000000, text: "恋愛運急上昇！ +¥1,000,000" }
  },
  {
    id: 21,
    title: "他科との合同カンファレンス成功",
    type: "blue",
    zone: "specialist",
    desc: "診断困難な症例を他科と連携して見事に解明！院内で信頼爆発。",
    effect: { money: 2000000, text: "特別手当支給！ +¥2,000,000" }
  },
  {
    id: 22,
    title: "【STOP】華燭の典！ドクターウェディング！",
    type: "stop",
    stopType: "marriage",
    zone: "specialist",
    desc: "盛大な結婚式！あなたの車にパートナー（ピンク/水色ピン）が乗車します！",
    effect: {
      isMarriage: true,
      text: "結婚おめでとう！車にパートナーが乗車！他の全プレイヤーからご祝儀 ¥2,000,000 ずつ受取！"
    }
  },
  {
    id: 23,
    title: "新婚旅行でヨーロッパへ！",
    type: "pink",
    zone: "specialist",
    desc: "国際学会にかこつけてパリとスイスへ！最高の思い出と引き換えに出費も豪快。",
    effect: { money: -1500000, text: "新婚旅行の豪華出費！ -¥1,500,000" }
  },
  {
    id: 24,
    title: "マイホーム購入のチャンス！",
    type: "yellow",
    specialAction: "buy_house",
    zone: "specialist",
    desc: "病院近くの瀟洒なタワーマンションまたは一戸建てを購入可能（¥10,000,000）。",
    effect: { text: "ゴール時に資産評価 ¥18,000,000 として総資産に加算されます！" }
  },
  {
    id: 25,
    title: "地方病院への応援勤務（給料日）",
    type: "green",
    zone: "specialist",
    desc: "医師不足の地域へ出張応援。患者さんに感謝され、地域手当も上乗せ！",
    effect: { isSalary: true, money: 1000000, text: "給料日＆出張応援ボーナス +¥1,000,000！" }
  },
  {
    id: 26,
    title: "お宝カード獲得チャンス！",
    type: "yellow",
    specialAction: "draw_treasure",
    zone: "specialist",
    desc: "これまでの医学的研鑽が実を結び、貴重なお宝カードを1枚獲得！",
    effect: { text: "お宝カードを引きました！ゴール時に高額資産として換金されます！" }
  },
  {
    id: 27,
    title: "祝！第一子誕生！",
    type: "pink",
    specialAction: "add_child",
    zone: "specialist",
    desc: "待望の赤ちゃんが誕生！車に子どもピンが1本追加されます！",
    effect: { text: "車に子どもピン追加！他のプレイヤー全員から出産祝金 ¥1,000,000 を獲得！" }
  },
  {
    id: 28,
    title: "過労によるダウン危機",
    type: "red",
    zone: "specialist",
    desc: "連続当直と外来続きで発熱ダウン！点滴を打ちながらベッドで反省。",
    effect: {
      money: -800000,
      requiresInsurance: "life",
      text: "休診損失 -¥800,000（医療保険があれば保険金で全額カバー！）"
    }
  },
  {
    id: 29,
    title: "専門医更新＆指導医取得",
    type: "blue",
    zone: "specialist",
    desc: "後輩たちの教育を任される立場に。学会発表と論文実績で指導医へ昇格！",
    effect: { salaryBonus: 1500000, text: "指導医手当で給料が +¥1,500,000 昇給！" }
  },

  // === 30〜42: キャリアの大分岐（開業 vs 教授選 vs ベンチャー） ===
  {
    id: 30,
    title: "【STOP】キャリアの大分岐！進路選択",
    type: "stop",
    stopType: "career_branch",
    zone: "career_fork",
    desc: "医師人生最大の選択路！あなたはどの道を進みますか？",
    choices: [
      { id: "clinic", label: "A：クリニック開業コース（ハイリスク・ハイリターン）", desc: "高額借入で自院オープン！給料大幅アップ！" },
      { id: "professor", label: "B：大学病院・アカデミア教授選コース（名誉・論文）", desc: "名誉とお宝論文を狙う伝統の王道ルート！" },
      { id: "global", label: "C：国際医療・医療ベンチャーコース（イノベーション）", desc: "海外留学・医療DXで一攫千金を狙う！" }
    ],
    effect: { text: "選んだコースに応じて特別なボーナスとイベントが発生！" }
  },

  // 分岐エリア（順不同で合流する共通マス構成）
  {
    id: 31,
    title: "自院開院 or 准教授昇進（給料日）",
    type: "green",
    zone: "career_fork",
    desc: "それぞれの道でトップランナーへ！給与が大幅に引き上げられる。",
    effect: { isSalary: true, salaryBonus: 3000000, text: "給料日！役職昇進で基本給が +¥3,000,000 アップ！" }
  },
  {
    id: 32,
    title: "祝！第二子誕生！",
    type: "pink",
    specialAction: "add_child",
    zone: "career_fork",
    desc: "賑やかな笑い声！車に2人目の子どもピンが追加されます！",
    effect: { text: "車に2人目の子どもピン追加！全プレイヤーからお祝い金 ¥1,000,000 受給！" }
  },
  {
    id: 33,
    title: "医療機器の最新鋭化",
    type: "blue",
    zone: "career_fork",
    desc: "最新鋭の超音波診断装置と電子カルテを導入。診療効率が倍増！",
    effect: { money: 2500000, text: "診療報酬アップで臨時収入！ +¥2,500,000" }
  },
  {
    id: 34,
    title: "お宝カード獲得チャンス！",
    type: "yellow",
    specialAction: "draw_treasure",
    zone: "career_fork",
    desc: "業界を揺るがす画期的な業績により、最高のお宝カードをゲット！",
    effect: { text: "お宝カードを1枚獲得しました！" }
  },
  {
    id: 35,
    title: "私立中学・医学部受験費用",
    type: "red",
    zone: "career_fork",
    desc: "子どもたちの塾代と受験費用、学費がズラリと請求される！",
    effect: { money: -2000000, text: "教育資金の支払い！ -¥2,000,000" }
  },
  {
    id: 36,
    title: "共同研究の大成功！",
    type: "blue",
    specialAction: "collab_research",
    zone: "career_fork",
    desc: "他のプレイヤーと共同で臨床試験を実施！双方に巨額のグラント助成金！",
    effect: { text: "自分と他の全プレイヤーに研究奨励金 ¥2,000,000 ずつ支給！" }
  },
  {
    id: 37,
    title: "【STOP】医療過誤訴訟の大危機！",
    type: "stop",
    stopType: "malpractice_trial",
    zone: "crisis",
    desc: "難治性疾患の手術で予期せぬ合併症が発生し、巨額損害賠償を請求される危機！",
    effect: {
      text: "医師賠償責任保険があれば保険会社が全額支払いで無傷！未加入の場合は ¥10,000,000 の大損害！"
    }
  },
  {
    id: 38,
    title: "危機克服と信頼回復（給料日）",
    type: "green",
    zone: "crisis",
    desc: "真摯な対応で患者家族とも和解。より強固な信頼関係を築き上げた。",
    effect: { isSalary: true, text: "給料日！安定した診療を継続しています。" }
  },
  {
    id: 39,
    title: "テレビ健康番組のコメンテーター出演",
    type: "yellow",
    zone: "crisis",
    desc: "「名医が教える健康寿命の伸ばし方」で分かりやすい解説が大好評！",
    effect: { money: 3000000, text: "出演料とクリニック大繁盛！ +¥3,000,000" }
  },
  {
    id: 40,
    title: "電子カルテのシステム障害",
    type: "red",
    zone: "crisis",
    desc: "朝一番でサーバーダウン！紙カルテと手書き処方箋で現場は大混乱。",
    effect: { money: -1000000, text: "復旧エンジニア緊急派遣費用！ -¥1,000,000" }
  },
  {
    id: 41,
    title: "家族との温泉旅行",
    type: "pink",
    zone: "crisis",
    desc: "まとまった有給を取り、家族全員で露天風呂付き旅館へ。至福の時間。",
    effect: { money: -800000, happinessBonus: 30, text: "思い出旅行で家族円満！ -¥800,000" }
  },

  // === 42〜50: 円熟期・栄光のフィナーレ・リタイア編 ===
  {
    id: 42,
    title: "病院長・教授就任（最高給料日）",
    type: "green",
    zone: "master",
    desc: "医療界の頂点に登りつめ、最高峰の給与と役員報酬を受け取る！",
    effect: { isSalary: true, salaryBonus: 5000000, text: "給料日！最高役職報酬で基本給 +¥5,000,000 アップ！" }
  },
  {
    id: 43,
    title: "ラストチャンス！お宝カード獲得",
    type: "yellow",
    specialAction: "draw_treasure",
    zone: "master",
    desc: "生涯の功績を称えられ、記念のお宝カードを授与される！",
    effect: { text: "最後のお宝カードを1枚獲得！" }
  },
  {
    id: 44,
    title: "後進育成のための医学奨学金設立",
    type: "blue",
    zone: "master",
    desc: "志ある若き医学生たちのために自らの名を冠した基金を設立。",
    effect: { money: -1500000, text: "慈善寄付。医学界から絶大な尊敬を獲得！ -¥1,500,000" }
  },
  {
    id: 45,
    title: "生涯臨床経験10万人達成",
    type: "blue",
    zone: "master",
    desc: "診察した患者総数が10万人を突破！地域住民から感謝の盾が贈られる。",
    effect: { money: 5000000, text: "地域振興功労金！ +¥5,000,000" }
  },
  {
    id: 46,
    title: "健康診断でオールA判定！",
    type: "pink",
    zone: "master",
    desc: "長年の節制と適度な運動が実を結び、高齢になっても元気ハツラツ！",
    effect: { money: 2000000, text: "健康長寿ボーナス！ +¥2,000,000" }
  },
  {
    id: 47,
    title: "最後の給料日（有終の美）",
    type: "green",
    zone: "master",
    desc: "現役最後のボーナスと退職慰労金を受け取り、いよいよ栄光のゴールへ！",
    effect: { isSalary: true, money: 5000000, text: "給料受給 ＆ 退職特別功労金 +¥5,000,000！" }
  },
  {
    id: 48,
    title: "【GOAL】栄光のリタイアメント山！",
    type: "goal",
    zone: "master",
    desc: "お疲れ様でした！医師としての誇り高き人生を完走しました！",
    effect: { text: "到着順位ボーナスとお宝・家族換金を獲得して最終結果発表へ！" }
  }
];

// ゴール到着順位ボーナス
export const GOAL_REWARDS = [
  30000000, // 1位: 3000万円
  20000000, // 2位: 2000万円
  10000000, // 3位: 1000万円
  5000000   // 4位: 500万円
];

// 家族ピン換金ボーナス
export const FAMILY_PIN_VALUE = 5000000; // パートナー/子供1人につき 500万円

// マイホーム換金価値
export const HOUSE_VALUE = 18000000;
