/**
 * engine.js
 * ------------------------------------------------------------------
 * ゲーム進行を管理するステートマシン。
 * data/stages.js の STAGES 配列を順番に読み進め、選択・ランダム
 * イベントの結果に応じて state.stats / state.flags を更新する。
 *
 * 描画（DOM操作）は一切行わない。UIは js/main.js が担当する。
 * ------------------------------------------------------------------
 */

class GameEngine {
  constructor(stages, endingArchetypes) {
    this.stages = stages;
    this.endingArchetypes = endingArchetypes;
    this._pendingNext = null;
    this._pendingEndGame = null;
    this._activeRandomEvent = null;
    this.reset();
  }

  reset() {
    this.state = {
      age: 0,
      stageIndex: 0,
      loopIndex: 0,
      stats: Object.assign({}, INITIAL_STATS),
      flags: {},
      history: [],
      gameOver: false,
      endingId: null,
    };
    this._pendingNext = null;
    this._pendingEndGame = null;
    this._activeRandomEvent = null;
    this._skipToValidStage();
  }

  loadState(savedState) {
    this.state = savedState;
    this._pendingNext = null;
    this._pendingEndGame = null;
    this._activeRandomEvent = null;
  }

  // 現在の stageIndex が skipIf 条件に合致する間、先へ進める。
  _skipToValidStage() {
    while (this.state.stageIndex < this.stages.length) {
      const stage = this.stages[this.state.stageIndex];
      if (stage.skipIf && stage.skipIf(this.state)) {
        this.state.stageIndex++;
        this.state.loopIndex = 0;
        continue;
      }
      break;
    }
    if (this.state.stageIndex >= this.stages.length) {
      this._finish();
      return;
    }
    const stage = this.stages[this.state.stageIndex];
    if (stage.ageRange) {
      this.state.age = stage.ageRange[0] + (stage.loopable ? this.state.loopIndex * (stage.ageStep || 0) : 0);
    }
  }

  getCurrentStage() {
    if (this.state.gameOver) return null;
    return this.stages[this.state.stageIndex] || null;
  }

  getIntroText() {
    const stage = this.getCurrentStage();
    if (!stage) return "";
    return typeof stage.intro === "function" ? stage.intro(this.state) : stage.intro || "";
  }

  getAvailableChoices() {
    const stage = this.getCurrentStage();
    if (!stage || stage.type !== "choice") return [];
    const self = this;
    return stage.choices.filter(function (c) { return !c.condition || c.condition(self.state); });
  }

  applyEffects(effects) {
    if (!effects) return;
    for (const key in effects) {
      if (!Object.prototype.hasOwnProperty.call(effects, key)) continue;
      const delta = effects[key];
      this.state.stats[key] = (this.state.stats[key] || 0) + delta;
      if (key !== "money") {
        this.state.stats[key] = Math.max(0, Math.min(100, this.state.stats[key]));
      }
    }
  }

  applyFlags(flags) {
    if (!flags) return;
    Object.assign(this.state.flags, flags);
  }

  // 出生ステージなど type:"form" の確定処理
  submitForm(answers) {
    const stage = this.getCurrentStage();
    const result = stage.resolve(answers);
    return this._applyResult(result, { stageTitle: stage.title, label: "人生のはじまり" });
  }

  // 選択肢の決定
  chooseOption(choiceId) {
    const stage = this.getCurrentStage();
    const choice = stage.choices.find(function (c) { return c.id === choiceId; });
    const result = choice.resolve(this.state);
    return this._applyResult(result, { stageTitle: stage.title, label: choice.label });
  }

  _applyResult(result, meta) {
    this.applyEffects(result.effects);
    this.applyFlags(result.flags);
    this.state.history.push({
      age: this.state.age,
      stageTitle: meta.stageTitle,
      label: meta.label,
      message: result.message || "",
      effects: result.effects || {},
    });
    this._pendingNext = result.next || null;
    this._pendingEndGame = result.endGame || null;
    return { message: result.message || "", effects: result.effects || {} };
  }

  // メイン選択のあと、このステージのランダムイベントプールから抽選する。
  // endGame が確定している場合はランダムイベントを挟まない。
  rollRandomEvent() {
    const stage = this.getCurrentStage();
    if (!stage || !stage.randomEvents || this._pendingEndGame || this._pendingNext) return null;
    const state = this.state;
    const fired = stage.randomEvents.filter(function (ev) {
      const chance = typeof ev.chance === "function" ? ev.chance(state) : ev.chance == null ? 0.25 : ev.chance;
      return Math.random() < chance;
    });
    if (fired.length === 0) return null;
    const chosen = fired[Math.floor(Math.random() * fired.length)];
    this._activeRandomEvent = chosen;
    return chosen;
  }

  resolveRandomEvent(choiceIndex) {
    const ev = this._activeRandomEvent;
    if (!ev) return null;
    const choice = ev.choices[choiceIndex];
    this.applyEffects(choice.effects);
    this.applyFlags(choice.flagsSet);
    this.state.history.push({
      age: this.state.age,
      stageTitle: ev.title,
      label: choice.label,
      message: "",
      effects: choice.effects || {},
    });
    this._activeRandomEvent = null;
    return choice;
  }

  // メイン選択（＋ランダムイベント）の処理が終わったあとに呼ぶ。
  advance() {
    if (this._pendingEndGame) {
      const id = this._pendingEndGame;
      this._pendingEndGame = null;
      this._pendingNext = null;
      this._finish(id);
      return;
    }
    if (this._pendingNext) {
      const target = this._pendingNext;
      this._pendingNext = null;
      const idx = this.stages.findIndex(function (s) { return s.id === target; });
      if (idx !== -1) {
        this.state.stageIndex = idx;
        this.state.loopIndex = 0;
      }
      this._skipToValidStage();
      return;
    }
    const stage = this.getCurrentStage();
    if (!stage) return;
    if (stage.isFinal) {
      this._finish();
      return;
    }
    if (stage.loopable) {
      this.state.loopIndex++;
      if (this.state.loopIndex < stage.loopMax) {
        this.state.age = stage.ageRange[0] + this.state.loopIndex * (stage.ageStep || 0);
        return;
      }
      this.state.loopIndex = 0;
    }
    this.state.stageIndex++;
    this._skipToValidStage();
  }

  _finish(forcedEndingId) {
    this.state.gameOver = true;
    this.state.endingId = forcedEndingId || this._computeNearestEnding();
  }

  _computeNearestEnding() {
    const s = this.state.stats;
    const vector = {
      clinicalSkill: s.clinicalSkill,
      reputation: s.reputation,
      health: s.health,
      familyBond: s.familyBond,
      network: s.network,
      careerFulfillment: s.careerFulfillment,
      moneyIndex: moneyIndex(s.money),
    };
    let best = null;
    let bestDist = Infinity;
    this.endingArchetypes.forEach(function (arch) {
      if (arch.forcedOnly) return;
      let sumSq = 0;
      for (const key in vector) {
        const diff = vector[key] - (arch.target[key] || 0);
        sumSq += diff * diff;
      }
      const dist = Math.sqrt(sumSq);
      if (dist < bestDist) {
        bestDist = dist;
        best = arch.id;
      }
    });
    return best;
  }

  getHappiness() {
    const s = this.state.stats;
    const mi = moneyIndex(s.money);
    const w = HAPPINESS_WEIGHTS;
    const val = s.health * w.health + s.familyBond * w.familyBond + s.careerFulfillment * w.careerFulfillment + mi * w.moneyIndex;
    return Math.round(Math.max(0, Math.min(100, val)));
  }

  getEnding() {
    if (!this.state.gameOver) return null;
    const self = this;
    return this.endingArchetypes.find(function (a) { return a.id === self.state.endingId; }) || null;
  }
}
