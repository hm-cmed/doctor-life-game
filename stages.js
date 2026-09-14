/**
 * stages.js
 * ------------------------------------------------------------------
 * ライフステージごとの分岐データ。設計資料「05 ライフステージ別
 * 分岐構造一覧」「06 データ構造設計」に対応するコンテンツ本体。
 *
 * ここは通常の .js ファイル（JSONではない）なので、効果計算に普通の
 * 関数を書ける。エンジン（engine.js）はこのファイルの STAGES 配列を
 * 順番に読み進めるだけで、内容の追加・修正はこのファイルの編集だけで
 * 完結する。
 *
 * ── ステージ共通の形（すべて任意項目、必要なものだけ使う）───────
 * {
 *   id: "stage_id",                 // 一意なID
 *   ageRange: [開始年齢, 終了年齢],  // 表示・ageStep計算に使用
 *   title: "ステージ名",
 *   type: "form" | "choice",        // form=複数項目入力（出生のみ）
 *   intro: "説明文" | function(state){ return "説明文"; },
 *   skipIf: function(state){ return true/false; }, // trueなら丸ごとスキップ
 *   loopable: true,                 // 複数回繰り返すステージ（キャリア分岐）
 *   loopMax: 5,                     // 繰り返す回数
 *   ageStep: 5,                     // 1周ごとに加算する年齢
 *   fields: [...],                  // type:"form" のときの入力項目
 *   resolve(answers): {...},        // type:"form" の確定処理
 *   choices: [
 *     {
 *       id, label,
 *       condition(state) -> bool,   // 選択肢の表示条件（省略可）
 *       resolve(state) -> {
 *         effects: { statKey: 増減値, ... },
 *         flags: { flagKey: 値, ... },   // state.flags にマージ
 *         message: "結果テキスト",
 *         next: "stage_id",              // 省略時は通常どおり次のステージへ
 *         endGame: "ending_id",          // 指定時は強制的にそのIDで即終了
 *       }
 *     }, ...
 *   ],
 *   randomEvents: [
 *     {
 *       id, title, text,
 *       chance: 数値 | function(state) -> 数値,  // 0〜1の発生確率
 *       choices: [ { label, effects: {...}, flagsSet: {...} }, ... ]
 *     }, ...
 *   ],
 *   isFinal: true,  // これが最後のステージ（クリア後にエンディング判定）
 * }
 * ------------------------------------------------------------------
 */

// 医学部時代の「過ごし方」共通処理：留年・放校の判定をまとめる小さなヘルパー。
// ryuunenChance = 留年する確率の目安（0〜1）。その中のごく一部が放校になる。
function resolveMedSchoolStyle(effects, ryuunenChance, styleMessage) {
  const roll = Math.random();
  if (roll < ryuunenChance * 0.12) {
    return {
      effects: Object.assign({}, effects, { careerFulfillment: -20, familyBond: -6 }),
      endGame: "medical_school_dropout",
      message: styleMessage + " しかし成績不振と素行の問題が重なり、放校処分となった。",
    };
  }
  if (roll < ryuunenChance) {
    return {
      effects: Object.assign({}, effects, { money: -800000, health: -8 }),
      message: styleMessage + " ただし進級試験に一度失敗し、留年を経験した。",
    };
  }
  return {
    effects: effects,
    message: styleMessage + " 6年間を終え、無事に卒業試験に合格した。",
  };
}

const STAGES = [
  // ── 0. 出生・家庭環境 ─────────────────────────────
  {
    id: "birth",
    ageRange: [0, 0],
    title: "出生・家庭環境",
    type: "form",
    intro: "あなたの物語がここから始まる。生まれた家庭と土地は、この先ずっと物語の土台になる。",
    fields: [
      {
        key: "parentIsMedical",
        label: "親は医療系の仕事をしていますか？",
        type: "select",
        options: [
          { value: "yes", label: "はい、医療系の仕事をしている" },
          { value: "no", label: "いいえ、医療系ではない" },
        ],
      },
      {
        key: "hometown",
        label: "出身都道府県は？",
        type: "select",
        optionsFrom: "PREFECTURES",
      },
    ],
    resolve(answers) {
      const isMedical = answers.parentIsMedical === "yes";
      const isUrban = URBAN_PREFECTURES.indexOf(answers.hometown) !== -1;
      const effects = {};
      if (isMedical) {
        effects.network = 8;
        effects.clinicalSkill = 5;
        effects.money = 300000;
      } else {
        effects.familyBond = 4;
      }
      if (isUrban) {
        effects.network = (effects.network || 0) + 4;
        effects.money = (effects.money || 0) + 200000;
      } else {
        effects.familyBond = (effects.familyBond || 0) + 6;
        effects.health = (effects.health || 0) + 4;
      }
      return {
        effects: effects,
        flags: { parentIsMedical: isMedical, hometown: answers.hometown },
        message: isMedical
          ? answers.hometown + "の、医療者の家庭に生まれた。白衣が身近にある子ども時代を過ごすことになる。"
          : answers.hometown + "の、医療とは縁のない家庭に生まれた。",
      };
    },
  },

  // ── 1. 中学受験期 ─────────────────────────────
  {
    id: "chugaku_juken",
    ageRange: [10, 12],
    title: "中学受験期",
    type: "choice",
    intro: "小学校高学年になった。周りには中学受験の準備を始める友人もいる。",
    choices: [
      {
        id: "juken_yes",
        label: "中学受験をする",
        resolve(state) {
          const chance = 0.45 + state.stats.clinicalSkill / 300 + (state.flags.parentIsMedical ? 0.05 : 0);
          const pass = Math.random() < chance;
          return pass
            ? {
                effects: { clinicalSkill: 10, familyBond: -2, money: -800000 },
                flags: { juniorHighType: "chuko_ikkan" },
                message: "猛勉強の末、中高一貫校に合格した。",
              }
            : {
                effects: { clinicalSkill: 4, health: -6, money: -500000 },
                flags: { juniorHighType: "public" },
                message: "不合格。悔しさを胸に、地元の公立中学へ進んだ。",
              };
        },
      },
      {
        id: "juken_no",
        label: "受験はせず、公立中学へ進む",
        resolve() {
          return {
            effects: { familyBond: 4, health: 3 },
            flags: { juniorHighType: "public" },
            message: "受験はせず、友人や部活と過ごす時間を選んだ。",
          };
        },
      },
    ],
    randomEvents: [
      {
        id: "juku_burnout",
        chance(state) { return state.stats.health < 50 ? 0.4 : 0.15; },
        title: "塾通いの疲れ",
        text: "夜遅くまでの塾通いで、疲れが溜まっている。",
        choices: [
          { label: "息抜きする", effects: { health: 6, clinicalSkill: -2 } },
          { label: "休まず勉強を続ける", effects: { health: -6, clinicalSkill: 4 } },
        ],
      },
    ],
  },

  // ── 2. 高校受験期 ─────────────────────────────
  {
    id: "koukou_juken",
    ageRange: [15, 15],
    title: "高校受験期",
    type: "choice",
    skipIf(state) { return state.flags.juniorHighType === "chuko_ikkan"; },
    intro: "中学3年生。中高一貫校でない場合は、進学先を自分で決める時期になる。",
    choices: [
      {
        id: "shingakukou",
        label: "進学校を目指して受験する",
        resolve(state) {
          const pass = Math.random() < 0.5 + state.stats.clinicalSkill / 250;
          return pass
            ? { effects: { clinicalSkill: 8 }, message: "進学校に合格した。" }
            : { effects: { clinicalSkill: 3, health: -4 }, message: "第一志望には届かず、地元の高校に進んだ。" };
        },
      },
      {
        id: "futsuka",
        label: "部活や趣味を優先し、地元の高校へ進む",
        resolve() {
          return { effects: { familyBond: 5, health: 4 }, message: "勉強一辺倒にはならず、高校生活を楽しむ道を選んだ。" };
        },
      },
    ],
    randomEvents: [
      {
        id: "bukatsu_deai",
        chance: 0.3,
        title: "部活での出会い",
        text: "部活動を通じて、気の合う友人ができた。",
        choices: [
          { label: "その友人と将来も付き合いを続ける", effects: { network: 6, familyBond: 3 } },
          { label: "受験勉強を優先し、距離を置く", effects: { clinicalSkill: 3, familyBond: -2 } },
        ],
      },
    ],
  },

  // ── 3. 大学受験・医学部入学 ─────────────────────────────
  {
    id: "daigaku_juken",
    ageRange: [18, 22],
    title: "大学受験・医学部入学",
    type: "choice",
    intro: "高校卒業後、医学部を目指す。現役合格とは限らない――浪人や、社会人を経ての再挑戦もある。",
    choices: [
      {
        id: "genneki",
        label: "現役で医学部を受験する",
        resolve(state) {
          const pass = Math.random() < 0.35 + state.stats.clinicalSkill / 200;
          return pass
            ? { effects: { clinicalSkill: 6 }, message: "現役で医学部に合格した。" }
            : {
                effects: { health: -8 },
                flags: { roninStreak: 1 },
                next: "daigaku_juken",
                message: "不合格。浪人生活が始まる。",
              };
        },
      },
      {
        id: "ronin",
        label: "浪人して、もう一年医学部合格を目指す",
        condition(state) { return (state.flags.roninStreak || 0) > 0; },
        resolve(state) {
          const streak = state.flags.roninStreak || 1;
          const pass = Math.random() < 0.45 + state.stats.clinicalSkill / 180 - streak * 0.05;
          if (pass) {
            return {
              effects: { clinicalSkill: 8, money: -1000000 },
              flags: { roninStreak: 0 },
              message: streak + "浪の末、医学部に合格した。",
            };
          }
          if (streak >= 3) {
            return {
              effects: { clinicalSkill: 4, careerFulfillment: -10, money: -1500000 },
              flags: { routeChanged: true },
              endGame: "other_medical_profession",
              message: "多浪の末、医師以外の医療専門職として歩む道を選んだ。",
            };
          }
          return {
            effects: { health: -10, money: -1000000 },
            flags: { roninStreak: streak + 1 },
            next: "daigaku_juken",
            message: streak + "浪目も不合格。もう一年挑戦することにした。",
          };
        },
      },
      {
        id: "shakaijin",
        label: "社会人経験を経てから医学部を再受験する（学士編入）",
        resolve(state) {
          const pass = Math.random() < 0.5 + state.stats.clinicalSkill / 250 + state.stats.network / 400;
          return pass
            ? {
                effects: { clinicalSkill: 10, network: 8, money: -500000, careerFulfillment: 6 },
                flags: { lateEntry: true },
                message: "社会人経験を積んだのち、学士編入で医学部に合格した。",
              }
            : {
                effects: { careerFulfillment: -8 },
                flags: { routeChanged: true },
                endGame: "other_medical_profession",
                message: "再受験は実らず、それまでの社会人経験を活かした別の道でキャリアを築くことにした。",
              };
        },
      },
    ],
  },

  // ── 4. 医学部生活 ─────────────────────────────
  {
    id: "medical_school",
    ageRange: [18, 24],
    title: "医学部生活（6年間）",
    type: "choice",
    intro: "医学部での6年間、どう過ごすかが、その後の土台になる。",
    choices: [
      {
        id: "benkyou",
        label: "勉強一筋で過ごす",
        resolve() { return resolveMedSchoolStyle({ clinicalSkill: 14, network: -4, health: -6 }, 0.10, "勉強に打ち込む6年間を過ごした。"); },
      },
      {
        id: "bukatsu",
        label: "サークル・部活を重視する",
        resolve() { return resolveMedSchoolStyle({ network: 14, familyBond: 6, clinicalSkill: 4 }, 0.14, "部活動やサークル活動に打ち込んだ。"); },
      },
      {
        id: "kenkyuu",
        label: "研究室に配属され、早期から研究を始める",
        resolve() {
          const r = resolveMedSchoolStyle({ clinicalSkill: 10, reputation: 6, health: -4 }, 0.10, "在学中から研究室に出入りし、早期に研究の世界に触れた。");
          r.flags = Object.assign({ startedResearchEarly: true }, r.flags || {});
          return r;
        },
      },
      {
        id: "baito",
        label: "バイト三昧で過ごす",
        resolve() { return resolveMedSchoolStyle({ money: 1500000, network: 4, clinicalSkill: 2 }, 0.16, "アルバイトに明け暮れる6年間だった。"); },
      },
      {
        id: "asobi",
        label: "遊び三昧で過ごす",
        resolve() { return resolveMedSchoolStyle({ network: 10, familyBond: 4, clinicalSkill: -6, health: 4 }, 0.26, "青春を謳歌する、遊び中心の6年間だった。"); },
      },
    ],
  },

  // ── 5. 卒後臨床研修 ─────────────────────────────
  {
    id: "residency",
    ageRange: [24, 26],
    title: "卒後臨床研修（初期研修）",
    type: "choice",
    intro: "医師国家試験に合格し、いよいよ臨床の現場へ。研修先とスタイルを選ぶ。",
    choices: [
      {
        id: "univ_hospital",
        label: "大学病院で研修する",
        resolve() { return { effects: { network: 10, clinicalSkill: 6, money: -300000 }, message: "大学病院で研修医としてのキャリアを始めた。" }; },
      },
      {
        id: "shichuu_byoin",
        label: "都市部の市中病院で研修する",
        resolve() { return { effects: { clinicalSkill: 10, network: 4, health: -4 }, message: "症例数の多い市中病院で鍛えられる日々を送った。" }; },
      },
      {
        id: "chiiki_byoin",
        label: "地方の病院で研修する",
        resolve() { return { effects: { clinicalSkill: 8, familyBond: 6, health: -2 }, message: "地方の病院で、幅広い症例と地域とのつながりを経験した。" }; },
      },
      {
        id: "chokubi",
        label: "直美（初期研修後すぐ美容医療へ）を目指す",
        resolve() {
          return {
            effects: { money: 800000, reputation: -10, careerFulfillment: 6, clinicalSkill: -4 },
            flags: { earlySpecialization: "cosmetic" },
            message: "一般臨床の研鑽よりも早さを優先し、美容医療の世界に飛び込んだ。",
          };
        },
      },
      {
        id: "chokusan",
        label: "直産（産業医として直行）を目指す",
        resolve() {
          return {
            effects: { health: 8, familyBond: 4, careerFulfillment: -2, clinicalSkill: -4 },
            flags: { earlySpecialization: "occupational" },
            message: "臨床の第一線からは距離を置き、産業医としての道を歩み始めた。",
          };
        },
      },
    ],
    randomEvents: [
      {
        id: "toucho",
        chance(state) { return state.stats.health < 60 ? 0.45 : 0.25; },
        title: "当直中の急変対応",
        text: "当直中に、患者の急変対応にあたることになった。",
        choices: [
          { label: "冷静に対応する", effects: { clinicalSkill: 4, health: -6 } },
          { label: "すぐに上級医を呼ぶ", effects: { network: 3, health: -2 } },
        ],
      },
      {
        id: "mentor",
        chance: 0.3,
        title: "指導医との出会い",
        text: "ある指導医の診療への姿勢に、強く影響を受けた。",
        choices: [
          { label: "その指導医に学び続ける", effects: { clinicalSkill: 6, network: 5 } },
        ],
      },
    ],
  },

  // ── 6. 専門医取得 ─────────────────────────────
  {
    id: "specialty",
    ageRange: [26, 29],
    title: "専門医取得（専攻医）",
    type: "choice",
    skipIf(state) { return !!state.flags.earlySpecialization; },
    intro: "基本領域19分野のうち、専門とする診療科を選ぶ。",
    choices: BASIC_SPECIALTIES.map(function (spec) {
      return {
        id: "spec_" + spec,
        label: spec,
        resolve(state) {
          const pass = Math.random() < 0.6 + state.stats.clinicalSkill / 300;
          return pass
            ? {
                effects: { clinicalSkill: 12, careerFulfillment: 8 },
                flags: { specialty: spec },
                message: "専門医試験に合格し、" + spec + "を専門とする医師になった。",
              }
            : {
                effects: { clinicalSkill: 6, health: -4 },
                flags: { specialty: spec },
                message: "専門医試験には一度不合格だったが、翌年合格して" + spec + "医となった。",
              };
        },
      };
    }),
  },

  // ── 7. サブスペシャルティ・複数専門医 ─────────────────────────────
  {
    id: "subspecialty",
    ageRange: [29, 33],
    title: "サブスペシャルティ・複数専門医",
    type: "choice",
    skipIf(state) { return !!state.flags.earlySpecialization; },
    intro: "専門医としての経験を積み、次のキャリアを考える時期になった。",
    choices: [
      {
        id: "subspe",
        label: "サブスペシャルティ専門医を取得する",
        resolve() { return { effects: { clinicalSkill: 10, reputation: 8 }, flags: { hasSubspecialty: true }, message: "サブスペシャルティ専門医を取得した。" }; },
      },
      {
        id: "second_board",
        label: "2つ目の基本領域専門医を目指す",
        resolve() { return { effects: { clinicalSkill: 14, network: 6, health: -6 }, flags: { hasSecondBoard: true }, message: "異なる領域の専門医資格も取得し、視野が広がった。" }; },
      },
      {
        id: "stay_generalist",
        label: "一つの専門にとらわれず、幅広く診る力を磨く",
        resolve() { return { effects: { network: 8, familyBond: 4 }, flags: { generalistLean: true }, message: "幅広く診療する力を意識的に磨いた。" }; },
      },
    ],
  },

  // ── 8. 大学院・学位・指導医 ─────────────────────────────
  {
    id: "grad_academia",
    ageRange: [30, 38],
    title: "大学院・学位・指導医",
    type: "choice",
    intro: "臨床を続けながら、研究や指導者としての道も見えてくる時期。",
    choices: [
      {
        id: "grad_basic",
        label: "大学院に進学する（基礎医学系）",
        resolve() {
          const pass = Math.random() < 0.6;
          return pass
            ? { effects: { clinicalSkill: 8, reputation: 12, money: -800000 }, flags: { degree: "PhD-basic" }, message: "苦労の末、基礎医学系の学位を取得した。" }
            : { effects: { money: -800000, health: -8 }, message: "学位取得までは至らなかったが、研究の経験は財産になった。" };
        },
      },
      {
        id: "grad_clinical",
        label: "大学院に進学する（臨床系・社会人大学院）",
        resolve() { return { effects: { clinicalSkill: 8, reputation: 10, money: -500000, health: -4 }, flags: { degree: "PhD-clinical" }, message: "臨床を続けながら学位を取得した。" }; },
      },
      {
        id: "no_grad_shidoi",
        label: "大学院には進まず、指導医資格を取得する",
        resolve() { return { effects: { reputation: 8, network: 6 }, flags: { isShidoi: true }, message: "指導医資格を取得し、後進の育成にも関わり始めた。" }; },
      },
      {
        id: "skip_grad",
        label: "今は臨床に専念する",
        resolve() { return { effects: { clinicalSkill: 6, familyBond: 4 }, message: "研究や資格取得よりも、目の前の診療に専念した。" }; },
      },
    ],
  },

  // ── 9. キャリア分岐モジュール（ループ） ─────────────────────────────
  {
    id: "career_module",
    ageRange: [30, 55],
    title: "キャリア分岐",
    type: "choice",
    loopable: true,
    loopMax: 5,
    ageStep: 5,
    intro(state) { return state.age + "歳。医師としてのキャリアをどう歩むか、改めて選択の時が来た。"; },
    choices: [
      {
        id: "academia_promo",
        label: "大学に残り、アカデミアでの昇進を目指す（助教→講師→准教授→教授）",
        resolve(state) {
          const step = (state.flags.academiaSteps || 0) + 1;
          return { effects: { reputation: 10, clinicalSkill: 6, money: 200000, health: -4 }, flags: { academiaSteps: step }, message: "大学でのポジションを一歩進めた。" };
        },
      },
      {
        id: "overseas_study",
        label: "海外留学に出る",
        condition(state) { return !state.flags.overseasDone; },
        resolve() { return { effects: { clinicalSkill: 12, network: 14, familyBond: -6, money: -600000 }, flags: { overseasDone: true }, message: "海外留学を経験し、視野と人脈が大きく広がった。" }; },
      },
      {
        id: "clinical_hospital",
        label: "臨床病院でキャリアを積む",
        resolve() { return { effects: { clinicalSkill: 8, money: 400000, health: -4 }, message: "市中病院の勤務医としてキャリアを積んだ。" }; },
      },
      {
        id: "chiiki_iryou",
        label: "地域病院に勤務する",
        resolve() { return { effects: { familyBond: 8, reputation: 6, money: 100000 }, message: "地域医療を支える立場として働いた。" }; },
      },
      {
        id: "kaigyou",
        label: "開業する",
        condition(state) { return !state.flags.isOwner; },
        resolve(state) {
          const pass = Math.random() < 0.55 + state.stats.reputation / 300 + state.stats.network / 300;
          return pass
            ? { effects: { money: 2000000, careerFulfillment: 12, health: -6 }, flags: { isOwner: true }, message: "診療所を開業した。" }
            : { effects: { money: -1200000, health: -10 }, flags: { isOwner: true }, message: "開業したが、当初は経営に苦戦した。" };
        },
      },
      {
        id: "idou",
        label: "他の地域へ異動する",
        resolve() { return { effects: { network: 6, familyBond: -4 }, message: "新しい土地に移り、環境を変えた。" }; },
      },
      {
        id: "kokunai_ryuugaku",
        label: "国内留学（他施設での研修）に出る",
        resolve() { return { effects: { clinicalSkill: 8, network: 8 }, message: "他施設での研修を通じて技術を磨いた。" }; },
      },
      {
        id: "gakkai_unei",
        label: "学会・研究会の運営に関わる",
        resolve() { return { effects: { reputation: 12, network: 8, health: -3 }, message: "学会や研究会の運営に携わり、名前が知られるようになった。" }; },
      },
      {
        id: "byouin_keiei",
        label: "病院・診療所の運営（経営層）に関わる",
        condition(state) { return !!state.flags.isOwner || state.stats.reputation > 60; },
        resolve() { return { effects: { money: 900000, reputation: 8, health: -8 }, flags: { isManager: true }, message: "経営にも携わる立場になった。" }; },
      },
      {
        id: "career_draft",
        label: "サブスペ専門医から総合診療医へキャリアを転換する",
        condition(state) { return !!state.flags.hasSubspecialty; },
        resolve() { return { effects: { careerFulfillment: 14, network: 8, clinicalSkill: -4 }, flags: { switchedToGeneralist: true }, message: "専門を離れ、総合診療医としての道を選び直した。" }; },
      },
    ],
    randomEvents: [
      {
        id: "kekkon",
        chance(state) { return state.flags.married ? 0 : 0.35; },
        title: "結婚",
        text: "長く付き合ってきた相手と、結婚を考える時期になった。",
        choices: [
          { label: "結婚する", effects: { familyBond: 12, careerFulfillment: 4 }, flagsSet: { married: true } },
          { label: "今は仕事を優先する", effects: { careerFulfillment: 2, familyBond: -2 } },
        ],
      },
      {
        id: "kosodate",
        chance(state) { return state.flags.married && !state.flags.hasChild ? 0.4 : 0; },
        title: "子どもの誕生",
        text: "子どもを授かった。",
        choices: [
          { label: "子育てに積極的に関わる", effects: { familyBond: 10, health: -4 }, flagsSet: { hasChild: true } },
          { label: "仕事を優先し、育児は分担する", effects: { careerFulfillment: 4, familyBond: -4 }, flagsSet: { hasChild: true } },
        ],
      },
      {
        id: "futoukou",
        chance(state) { return state.flags.hasChild ? 0.2 : 0; },
        title: "子どもの不登校",
        text: "子どもが学校に行きたがらなくなった。",
        choices: [
          { label: "仕事を調整し、向き合う時間を作る", effects: { familyBond: 8, careerFulfillment: -6, health: -4 } },
          { label: "専門家に相談しながら見守る", effects: { familyBond: 4, health: -2 } },
          { label: "多忙のため、十分に向き合えないまま時間が過ぎる", effects: { familyBond: -8, careerFulfillment: 3, health: -2 } },
        ],
      },
      {
        id: "rikon_kiki",
        chance(state) { return state.flags.married ? (state.stats.familyBond < 40 ? 0.35 : 0.08) : 0; },
        title: "離婚の危機",
        text: "すれ違いが続き、夫婦関係に危機が訪れた。",
        choices: [
          { label: "時間を作って向き合う", effects: { familyBond: 14, careerFulfillment: -4 } },
          { label: "離婚する", effects: { familyBond: -10, careerFulfillment: -6, money: -500000 }, flagsSet: { married: false, divorced: true } },
        ],
      },
      {
        id: "oya_kaigo",
        chance: 0.3,
        title: "親の介護・死別",
        text: "親の体調が思わしくなくなってきた。",
        choices: [
          { label: "介護に時間を割く", effects: { familyBond: 8, health: -8, careerFulfillment: -4 } },
          { label: "介護サービスを頼りつつ仕事を続ける", effects: { money: -300000, familyBond: -2 } },
          { label: "介護は他の家族に任せ、仕事に専念する", effects: { careerFulfillment: 4, familyBond: -8 } },
        ],
      },
      {
        id: "jyuutaku",
        chance(state) { return state.flags.homeOwner ? 0 : 0.3; },
        title: "住まいの選択",
        text: "そろそろ自分たちの住まいについて考える時期になった。",
        choices: [
          { label: "一戸建てを購入する", effects: { money: -2000000, familyBond: 6 }, flagsSet: { homeOwner: "house" } },
          { label: "マンションを購入する", effects: { money: -1500000, familyBond: 4 }, flagsSet: { homeOwner: "mansion" } },
          { label: "賃貸のまま身軽に過ごす", effects: { money: -200000 }, flagsSet: { homeOwner: "rent" } },
        ],
      },
    ],
  },

  // ── 10. 経営フェーズ ─────────────────────────────
  {
    id: "management_phase",
    ageRange: [45, 65],
    title: "経営フェーズ",
    type: "choice",
    skipIf(state) { return !(state.flags.isOwner || state.flags.isManager); },
    intro: "経営に携わる立場として、厳しい局面を迎えることもある。",
    choices: [
      {
        id: "jinin",
        label: "人員体制を見直す",
        resolve() { return { effects: { money: 700000, reputation: -6, health: -4 }, message: "人員体制を見直し、経営を立て直した。" }; },
      },
      {
        id: "setsubi",
        label: "設備投資に踏み切る",
        resolve() { return { effects: { money: -800000, reputation: 10 }, message: "思い切った設備投資が功を奏した。" }; },
      },
      {
        id: "jigyou_shoukei",
        label: "事業承継の準備を進める",
        resolve() { return { effects: { careerFulfillment: 6, health: 4 }, flags: { successionPlanned: true }, message: "後継者への引き継ぎを見据えて動き始めた。" }; },
      },
    ],
  },

  // ── 11. 定年・再雇用 ─────────────────────────────
  {
    id: "retirement",
    ageRange: [60, 70],
    title: "定年・再雇用",
    type: "choice",
    intro: "長く歩んできた医師人生も、一つの節目を迎える。",
    choices: [
      {
        id: "teinen",
        label: "定年退職する",
        resolve() { return { effects: { health: 8, familyBond: 6, careerFulfillment: -4 }, message: "定年を迎え、勤め先を退いた。" }; },
      },
      {
        id: "saikoyou",
        label: "再雇用で働き続ける",
        resolve() { return { effects: { money: 300000, careerFulfillment: 6, health: -4 }, message: "再雇用の形で、もうしばらく現場に立ち続けた。" }; },
      },
      {
        id: "gensha",
        label: "開業医として生涯現役を貫く",
        condition(state) { return !!state.flags.isOwner; },
        resolve() { return { effects: { careerFulfillment: 12, reputation: 8, health: -6 }, message: "開業医として、地域に立ち続けることを選んだ。" }; },
      },
    ],
  },

  // ── 12. 高齢期 ─────────────────────────────
  {
    id: "elderly",
    ageRange: [65, 90],
    title: "高齢期",
    type: "choice",
    isFinal: true,
    intro: "孫の顔を見に行く日もあれば、自分や連れ合いの体を気遣う日もある。",
    choices: [
      {
        id: "mimamoru",
        label: "子や孫の成長を見守りながら、穏やかに過ごす",
        resolve() { return { effects: { familyBond: 10, health: 4 }, message: "子や孫に囲まれ、穏やかな時間を過ごした。" }; },
      },
      {
        id: "kaigo_jibun",
        label: "自身や配偶者の介護と向き合う",
        resolve() { return { effects: { familyBond: 6, health: -6 }, message: "老いと向き合いながらも、支え合う日々を送った。" }; },
      },
      {
        id: "chiiki_koken",
        label: "できる範囲で地域医療への貢献を続ける",
        condition(state) { return state.stats.health > 50; },
        resolve() { return { effects: { reputation: 8, careerFulfillment: 8, health: -4 }, message: "高齢になっても、できる範囲で地域医療に関わり続けた。" }; },
      },
    ],
  },
];
