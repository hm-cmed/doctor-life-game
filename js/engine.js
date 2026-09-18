/**
 * engine.js
 * ------------------------------------------------------------------
 * 医師版「人生ゲーム」マルチプレイヤー・ゲーム進行エンジン。
 * ルール、ターン進行、STOPマス判定、給料受給、保険、お宝、
 * 家族ピン管理、リタイア精算を統括します。
 * ------------------------------------------------------------------
 */

import {
  BOARD_TILES,
  TREASURE_CARDS,
  SPECIALTY_CARDS,
  GOAL_REWARDS,
  FAMILY_PIN_VALUE,
  HOUSE_VALUE
} from '../data/boardData.js';

export class DoctorLifeEngine {
  constructor() {
    this.tiles = BOARD_TILES;
    this.treasures = [...TREASURE_CARDS];
    this.specialties = [...SPECIALTY_CARDS];
    this.players = [];
    this.activePlayerIndex = 0;
    this.roundCount = 1;
    this.retiredCount = 0;
    this.isGameOver = false;
    this.log = [];
  }

  // ゲームの新規初期化
  setupGame(playerConfigs) {
    // playerConfigs: [{ name, carColor, isCpu }]
    this.treasures = [...TREASURE_CARDS].sort(() => Math.random() - 0.5);
    this.specialties = [...SPECIALTY_CARDS].sort(() => Math.random() - 0.5);

    this.players = playerConfigs.map((cfg, idx) => ({
      id: idx,
      name: cfg.name || `Dr. プレイヤー${idx + 1}`,
      carColor: cfg.carColor || ['#e53935', '#1e88e5', '#43a047', '#fbc02d'][idx % 4],
      isCpu: !!cfg.isCpu,
      position: 0,
      cash: 2000000, // 初期資金200万円
      salary: 3000000, // 医学生〜研修医基本給
      debt: 0,
      hasHouse: false,
      insurance: {
        malpractice: false, // 医師賠償責任保険
        life: false          // 生命・医療保険
      },
      specialty: null, // 専門医資格
      careerBranch: null, // 開業 / 教授 / ベンチャー
      treasures: [],   // 保有お宝カード
      spouse: false,   // 配偶者ピン
      children: 0,     // 子どもピン（0〜2）
      retired: false,  // ゴール到達フラグ
      arrivalRank: null, // 到着順位（1〜4）
      history: [
        { age: 18, text: "医学部に入学し、医師としての人生をスタート！" }
      ]
    }));

    this.activePlayerIndex = 0;
    this.roundCount = 1;
    this.retiredCount = 0;
    this.isGameOver = false;
    this.log = [`医師人生ゲームがスタートしました！（参加者: ${this.players.length}名）`];
  }

  getCurrentPlayer() {
    return this.players[this.activePlayerIndex];
  }

  // ルーレットの出目に応じて移動先を算出（途中のSTOPマスや給料日を検出）
  calculateMove(roll) {
    const player = this.getCurrentPlayer();
    if (player.retired) return null;

    const startPos = player.position;
    const maxPos = this.tiles.length - 1;
    let targetPos = Math.min(startPos + roll, maxPos);
    let stoppedBy = null;
    const passedSalaries = [];

    // 途中のマスを検査
    for (let p = startPos + 1; p <= targetPos; p++) {
      const tile = this.tiles[p];

      // 給料日マスの通過チェック
      if (tile.type === 'green' && p < targetPos) {
        passedSalaries.push(p);
      }

      // STOPマスに引っかかった場合、そこで強制停止！
      if (tile.type === 'stop') {
        targetPos = p;
        stoppedBy = tile;
        break;
      }

      // GOALマスに到達した場合
      if (tile.type === 'goal') {
        targetPos = p;
        break;
      }
    }

    return {
      startPos,
      targetPos,
      stoppedBy,
      passedSalaries,
      finalTile: this.tiles[targetPos]
    };
  }

  // 通過した給料日の処理
  collectPassedSalaries(player, salaryTiles) {
    let totalPaid = 0;
    salaryTiles.forEach(tileIndex => {
      const tile = this.tiles[tileIndex];
      const payout = player.salary + (tile.effect.money || 0);
      player.cash += payout;
      totalPaid += payout;
      if (tile.effect.salaryBonus) {
        player.salary += tile.effect.salaryBonus;
      }
      this.addLog(`【給料日】${player.name} が ${tile.title} を通過し、給料 ¥${payout.toLocaleString()} を受取！`);
    });
    return totalPaid;
  }

  // 止まったマスの効果を適用
  applyTileLanding(player, tile) {
    const outcome = {
      tile,
      moneyChange: 0,
      salaryChange: 0,
      specialEvent: null,
      message: ""
    };

    // 1. 給料日マスに直接着地
    if (tile.type === 'green') {
      const payout = player.salary + (tile.effect.money || 0);
      player.cash += payout;
      outcome.moneyChange += payout;
      if (tile.effect.salaryBonus) {
        player.salary += tile.effect.salaryBonus;
        outcome.salaryChange += tile.effect.salaryBonus;
      }
      outcome.message = `給料日！給料 ¥${payout.toLocaleString()} を受け取りました！`;
      this.addLog(`${player.name} が給料日マスに止まり、¥${payout.toLocaleString()} を受取！`);
      return outcome;
    }

    // 2. STOPマス処理
    if (tile.type === 'stop') {
      return this.resolveStopTile(player, tile);
    }

    // 3. 特殊アクションマス処理
    if (tile.specialAction) {
      return this.resolveSpecialAction(player, tile);
    }

    // 4. 一般効果（money増減、保険適用チェック）
    if (tile.effect && tile.effect.money !== undefined) {
      let delta = tile.effect.money;

      // 保険による免責チェック
      if (tile.effect.requiresInsurance === 'life') {
        if (player.insurance.life) {
          delta = 0;
          outcome.message = `${tile.desc} しかし、手厚い医療保険に加入していたため保険金で全額カバー！自己負担¥0で済みました！`;
          this.addLog(`【保険適用】${player.name} は医療保険により出費を完全ガード！`);
          return outcome;
        }
      }

      player.cash += delta;
      outcome.moneyChange = delta;
      outcome.message = `${tile.desc} (${delta >= 0 ? '+' : ''}¥${delta.toLocaleString()})`;
      this.addLog(`${player.name}：${tile.title} (${delta >= 0 ? '+' : ''}¥${delta.toLocaleString()})`);
    } else {
      outcome.message = tile.desc;
    }

    // 昇給効果
    if (tile.effect && tile.effect.salaryBonus) {
      player.salary += tile.effect.salaryBonus;
      outcome.salaryChange += tile.effect.salaryBonus;
    }

    return outcome;
  }

  // STOPマスの個別処理
  resolveStopTile(player, tile) {
    const outcome = { tile, isStop: true, message: "" };

    switch (tile.stopType) {
      case 'kokushi': // 医師国家試験
        player.salary = 5000000;
        player.cash += 1000000;
        outcome.moneyChange = 1000000;
        outcome.salaryChange = 2000000;
        outcome.message = "祝！医師国家試験に合格！医師免許を取得しました！初任給¥5,000,000に昇給し、合格祝い金¥1,000,000を受取！";
        this.addLog(`🎓【医師免許取得】${player.name} が国家試験に合格！医師としての第一歩を踏み出しました！`);
        break;

      case 'specialty_choice': // 基本領域専門医決定
        if (this.specialties.length > 0) {
          const spec = this.specialties.pop();
          player.specialty = spec;
          player.salary += spec.salaryBonus;
          outcome.specialty = spec;
          outcome.salaryChange = spec.salaryBonus;
          outcome.message = `専門医資格を取得！『${spec.name}』の専門医となりました！専門医手当により給料が +¥${spec.salaryBonus.toLocaleString()} 昇給！`;
          this.addLog(`🩺【専門医取得】${player.name} は「${spec.name}」の専門医資格を取得！`);
        }
        break;

      case 'marriage': // 結婚
        player.spouse = true;
        let totalGifts = 0;
        this.players.forEach(other => {
          if (other.id !== player.id) {
            const gift = 2000000;
            other.cash -= gift;
            totalGifts += gift;
          }
        });
        player.cash += totalGifts;
        outcome.isMarriage = true;
        outcome.moneyChange = totalGifts;
        outcome.message = `華燭の典！パートナーと結婚し、車にピンクの人物ピンが乗車！他のプレイヤーからご祝儀合計 ¥${totalGifts.toLocaleString()} を受取！`;
        this.addLog(`💍【結婚】${player.name} が結婚！愛車にパートナーピンが乗車しました！`);
        break;

      case 'malpractice_trial': // 医療過誤訴訟危機
        if (player.insurance.malpractice) {
          outcome.message = "医療事故の訴訟請求を受けましたが、加入していた「医師賠償責任保険」により全額保険金で解決！自己負担は¥0で無傷でした！";
          this.addLog(`🛡️【保険発動】${player.name} は医師賠償責任保険により¥10,000,000の損害賠償を完全回避！`);
        } else {
          const damage = -10000000;
          player.cash += damage;
          outcome.moneyChange = damage;
          outcome.message = "医療事故訴訟に発展！医師賠償責任保険に未加入だったため、示談金と弁護士費用で ¥10,000,000 の巨額損失！";
          this.addLog(`⚠️【訴訟損害】${player.name} は賠償保険未加入のため ¥10,000,000 を支払いました…`);
        }
        break;

      case 'career_branch': // キャリア大分岐
        outcome.needsBranchChoice = true;
        outcome.message = "人生の重大岐路！進むべき道を選択してください。";
        break;

      default:
        outcome.message = tile.desc;
    }

    return outcome;
  }

  // 特殊アクションマスの処理
  resolveSpecialAction(player, tile) {
    const outcome = { tile, message: "" };

    switch (tile.specialAction) {
      case 'insurance_malpractice':
        outcome.promptType = 'insurance_malpractice';
        outcome.cost = 500000;
        outcome.message = "万一の医療事故・訴訟に備え、医師賠償責任保険（掛金 ¥500,000）に加入しますか？";
        break;

      case 'insurance_life':
        outcome.promptType = 'insurance_life';
        outcome.cost = 500000;
        outcome.message = "過酷な当直や体調不良に備え、生命・医療保険（掛金 ¥500,000）に加入しますか？";
        break;

      case 'buy_house':
        outcome.promptType = 'buy_house';
        outcome.cost = 10000000;
        outcome.message = "病院近くの高級タワーマンション（¥10,000,000）を購入しますか？（ゴール時に¥18,000,000で換金）";
        break;

      case 'add_child':
        if (player.children < 2) {
          player.children++;
          let childGifts = 0;
          this.players.forEach(other => {
            if (other.id !== player.id) {
              const gift = 1000000;
              other.cash -= gift;
              childGifts += gift;
            }
          });
          player.cash += childGifts;
          outcome.childAdded = true;
          outcome.moneyChange = childGifts;
          outcome.message = `祝！元気な赤ちゃんが誕生！車に子どもピンが乗車しました！全プレイヤーから出産祝い金合計 ¥${childGifts.toLocaleString()} を受取！`;
          this.addLog(`👶【誕生】${player.name} に子どもが誕生！車に子どもピン追加（計${player.children}人）`);
        } else {
          outcome.message = "家族みんなで楽しく団らん！家族の絆が深まりました。";
        }
        break;

      case 'draw_treasure':
        if (this.treasures.length > 0) {
          const card = this.treasures.pop();
          player.treasures.push(card);
          outcome.treasureDrawn = card;
          outcome.message = `お宝カード獲得！【${card.name}】（評価額: ¥${card.value.toLocaleString()}）を手に入れました！`;
          this.addLog(`✨【お宝獲得】${player.name} がお宝「${card.name}」を獲得！`);
        } else {
          outcome.message = "医学界の名声がさらに高まりました！";
        }
        break;

      case 'duty_exchange':
        // 他のプレイヤーに当直代行を依頼（ランダムまたは選択）
        const candidates = this.players.filter(p => p.id !== player.id && !p.retired);
        if (candidates.length > 0) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const fee = 1000000;
          player.cash -= fee;
          target.cash += fee;
          outcome.dutyExchangedWith = target;
          outcome.message = `急用のため、当直を ${target.name} に代行してもらいました！謝礼として ¥${fee.toLocaleString()} を支払い、${target.name} が受け取りました。`;
          this.addLog(`🌙【当直代行】${player.name} が ${target.name} に当直代行謝礼 ¥${fee.toLocaleString()} を支払い！`);
        } else {
          outcome.message = "同僚の手厚いサポートにより、無事に当直シフトを調整できました！";
        }
        break;

      case 'collab_research':
        const bonus = 2000000;
        this.players.forEach(p => {
          p.cash += bonus;
        });
        outcome.moneyChange = bonus;
        outcome.message = `他施設との共同研究が大成功！医学界への多大な貢献により、参加ドクター全員に研究奨励金 ¥${bonus.toLocaleString()} が支給されました！`;
        this.addLog(`🤝【共同研究】全員に研究奨励金 ¥${bonus.toLocaleString()} が支給されました！`);
        break;

      default:
        outcome.message = tile.desc;
    }

    return outcome;
  }

  // プレイヤーが選択肢を決めたときの確定処理（保険購入、マイホーム、キャリア分岐など）
  confirmPlayerDecision(player, actionType, choiceValue) {
    if (actionType === 'insurance_malpractice' && choiceValue === true) {
      player.cash -= 500000;
      player.insurance.malpractice = true;
      this.addLog(`🛡️ ${player.name} は「医師賠償責任保険」に加入しました！`);
      return "医師賠償責任保険に加入しました！訴訟リスクから守られます。";
    }

    if (actionType === 'insurance_life' && choiceValue === true) {
      player.cash -= 500000;
      player.insurance.life = true;
      this.addLog(`💊 ${player.name} は「生命・医療保険」に加入しました！`);
      return "生命・医療保険に加入しました！休職・入院リスクから守られます。";
    }

    if (actionType === 'buy_house' && choiceValue === true) {
      player.cash -= 10000000;
      player.hasHouse = true;
      this.addLog(`🏡 ${player.name} はマイホーム（高級タワマン）を購入しました！`);
      return "マイホームを購入しました！ゴール時に¥18,000,000で換金されます。";
    }

    if (actionType === 'career_branch') {
      player.careerBranch = choiceValue; // clinic | professor | global
      if (choiceValue === 'clinic') {
        player.salary += 6000000;
        this.addLog(`🏥【開業】${player.name} は「クリニック開業コース」を選択！給料+¥6,000,000！`);
        return "クリニックを開業！院長として給料が +¥6,000,000 大幅アップ！";
      } else if (choiceValue === 'professor') {
        if (this.treasures.length > 0) {
          const t = this.treasures.pop();
          player.treasures.push(t);
        }
        player.salary += 3000000;
        this.addLog(`🎓【アカデミア】${player.name} は「大学病院・教授選コース」を選択！お宝論文とお宝カード獲得！`);
        return "大学病院の教授選コースへ！給料+¥3,000,000とお宝カードを獲得！";
      } else {
        player.cash += 5000000;
        player.salary += 4000000;
        this.addLog(`🌍【ベンチャー】${player.name} は「国際医療・ベンチャーコース」を選択！資金+¥5,000,000！`);
        return "医療ベンチャーを共同創業！ストックオプションと臨時資金 ¥5,000,000 獲得！";
      }
    }

    return "選択を見送りました。";
  }

  // ゴール到達処理
  handlePlayerGoal(player) {
    if (player.retired) return;

    this.retiredCount++;
    player.retired = true;
    player.arrivalRank = this.retiredCount;

    const reward = GOAL_REWARDS[this.retiredCount - 1] || 5000000;
    player.cash += reward;

    this.addLog(`👑【GOAL!】${player.name} が第${this.retiredCount}着でリタイア山に登頂！着順ボーナス ¥${reward.toLocaleString()} を受取！`);

    // 全員ゴールしたか判定
    if (this.retiredCount >= this.players.length) {
      this.isGameOver = true;
      this.computeFinalScores();
      this.addLog("🎊 全員のドクターが栄光のリタイア山に登頂！最終精算に移ります！");
    }
  }

  // 最終資産・総合スコアの精算
  computeFinalScores() {
    this.players.forEach(p => {
      // 1. 所持現金
      p.finalCash = p.cash;

      // 2. マイホーム換金
      p.houseValue = p.hasHouse ? HOUSE_VALUE : 0;

      // 3. 家族ピン換金（配偶者 500万 + 子ども 500万 x 人数）
      let familyPins = (p.spouse ? 1 : 0) + p.children;
      p.familyValue = familyPins * FAMILY_PIN_VALUE;

      // 4. お宝カード換金
      p.treasureValue = p.treasures.reduce((sum, t) => sum + t.value, 0);

      // 5. 総資産
      p.totalNetWorth = p.finalCash + p.houseValue + p.familyValue + p.treasureValue;

      // キャリア称号の授与
      p.doctorTitle = this.determineDoctorTitle(p);
    });

    // 総資産ランキング順にソート
    this.standings = [...this.players].sort((a, b) => b.totalNetWorth - a.totalNetWorth);
    this.standings.forEach((p, idx) => {
      p.finalRank = idx + 1;
    });
  }

  determineDoctorTitle(p) {
    if (p.totalNetWorth >= 80000000) return "🌟 医療界の伝説・世界的スーパードクター";
    if (p.careerBranch === 'clinic' && p.totalNetWorth >= 50000000) return "🏥 地域を支えたカリスマ名物院長";
    if (p.careerBranch === 'professor') return "🎓 学会を牽引した名誉教授・医学の巨星";
    if (p.careerBranch === 'global') return "🚀 医療の未来を拓いたグローバルイノベーター";
    if (p.treasures.length >= 3) return "🏆 数多の栄誉に輝くノーベル賞級の研究医";
    if (p.familyValue >= 15000000) return "👨‍👩‍👧‍👦 仕事と家庭を完璧に両立した愛されドクター";
    return "🩺 生涯患者に寄り添い続けた心優しき名医";
  }

  // 次のプレイヤーにターンを交代
  nextTurn() {
    if (this.isGameOver) return null;

    let attempts = 0;
    do {
      this.activePlayerIndex = (this.activePlayerIndex + 1) % this.players.length;
      if (this.activePlayerIndex === 0) {
        this.roundCount++;
      }
      attempts++;
    } while (this.getCurrentPlayer().retired && attempts <= this.players.length);

    // 全員リタイアしていた場合
    if (attempts > this.players.length) {
      this.isGameOver = true;
      this.computeFinalScores();
      return null;
    }

    return this.getCurrentPlayer();
  }

  addLog(msg) {
    this.log.unshift(msg);
    if (this.log.length > 50) this.log.pop();
  }
}
