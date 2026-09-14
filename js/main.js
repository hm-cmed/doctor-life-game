/**
 * main.js
 * ------------------------------------------------------------------
 * 画面描画とユーザー操作のハンドリング。ゲームの進行ロジックは
 * すべて js/engine.js（GameEngine）に委ねる。
 * ------------------------------------------------------------------
 */

(function () {
  const SAVE_KEY = "doctorLifeGame_save_v1";

  const engine = new GameEngine(STAGES, ENDING_ARCHETYPES);

  const el = {
    resumeBanner: document.getElementById("resume-banner"),
    resumeYes: document.getElementById("resume-yes"),
    resumeNo: document.getElementById("resume-no"),
    ageValue: document.getElementById("age-value"),
    stageTitle: document.getElementById("stage-title"),
    statsList: document.getElementById("stats-list"),
    happinessValue: document.getElementById("happiness-value"),
    introText: document.getElementById("intro-text"),
    choicesArea: document.getElementById("choices-area"),
    resultArea: document.getElementById("result-area"),
    logList: document.getElementById("log-list"),
    endingScreen: document.getElementById("ending-screen"),
    gameScreen: document.getElementById("game-screen"),
    restartButton: document.getElementById("restart-button"),
  };

  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(engine.state));
    } catch (e) {
      /* localStorageが使えない環境でも進行自体は継続する */
    }
  }

  function loadSavedState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* noop */ }
  }

  function formatMoney(n) {
    const sign = n < 0 ? "-" : "";
    return sign + "¥" + Math.abs(Math.round(n)).toLocaleString("ja-JP");
  }

  function renderStats() {
    el.statsList.innerHTML = "";
    PARAMS_CONFIG.forEach(function (p) {
      const value = engine.state.stats[p.key] || 0;
      const row = document.createElement("div");
      row.className = "stat-row";
      if (p.type === "money") {
        row.innerHTML =
          '<span class="stat-label">' + p.label + '</span>' +
          '<span class="stat-money">' + formatMoney(value) + "</span>";
      } else {
        const pct = Math.max(0, Math.min(100, value));
        row.innerHTML =
          '<span class="stat-label">' + p.label + '</span>' +
          '<div class="stat-bar"><div class="stat-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="stat-value">' + Math.round(value) + "</span>";
      }
      el.statsList.appendChild(row);
    });
    el.happinessValue.textContent = engine.getHappiness();
  }

  function renderLog() {
    el.logList.innerHTML = "";
    const items = engine.state.history.slice().reverse();
    items.forEach(function (h) {
      const li = document.createElement("li");
      const parts = [];
      if (h.message) parts.push(h.message);
      else parts.push(h.label);
      li.innerHTML =
        '<span class="log-age">' + h.age + "歳</span> " +
        '<span class="log-text">' + parts.join(" ") + "</span>";
      el.logList.appendChild(li);
    });
  }

  function buildFieldInput(field) {
    const wrap = document.createElement("label");
    wrap.className = "field";
    const labelSpan = document.createElement("span");
    labelSpan.className = "field-label";
    labelSpan.textContent = field.label;
    wrap.appendChild(labelSpan);

    const select = document.createElement("select");
    select.dataset.key = field.key;
    let options = field.options;
    if (field.optionsFrom === "PREFECTURES") {
      options = PREFECTURES.map(function (pref) { return { value: pref, label: pref }; });
    }
    options.forEach(function (opt) {
      const o = document.createElement("option");
      o.value = opt.value;
      o.textContent = opt.label;
      select.appendChild(o);
    });
    wrap.appendChild(select);
    return wrap;
  }

  function renderStage() {
    if (engine.state.gameOver) {
      renderEnding();
      return;
    }
    el.gameScreen.hidden = false;
    el.endingScreen.hidden = true;

    const stage = engine.getCurrentStage();
    el.ageValue.textContent = engine.state.age;
    el.stageTitle.textContent = stage.title;
    el.introText.textContent = engine.getIntroText();
    el.resultArea.hidden = true;
    el.resultArea.innerHTML = "";
    el.choicesArea.innerHTML = "";
    el.choicesArea.hidden = false;

    if (stage.type === "form") {
      const form = document.createElement("div");
      form.className = "form-fields";
      stage.fields.forEach(function (f) { form.appendChild(buildFieldInput(f)); });
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = "決める";
      btn.addEventListener("click", function () {
        const answers = {};
        form.querySelectorAll("select").forEach(function (s) { answers[s.dataset.key] = s.value; });
        const result = engine.submitForm(answers);
        showResult(result);
      });
      el.choicesArea.appendChild(form);
      el.choicesArea.appendChild(btn);
      return;
    }

    const choices = engine.getAvailableChoices();
    choices.forEach(function (choice) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", function () {
        const result = engine.chooseOption(choice.id);
        showResult(result);
      });
      el.choicesArea.appendChild(btn);
    });
  }

  function effectsSummary(effects) {
    const labelMap = {};
    PARAMS_CONFIG.forEach(function (p) { labelMap[p.key] = p.label; });
    const parts = [];
    for (const key in effects) {
      if (!Object.prototype.hasOwnProperty.call(effects, key)) continue;
      const v = effects[key];
      if (!v) continue;
      const label = labelMap[key] || key;
      if (key === "money") {
        parts.push(label + (v > 0 ? " +" : " ") + formatMoney(v));
      } else {
        parts.push(label + (v > 0 ? " +" : " ") + Math.round(v));
      }
    }
    return parts.join(" / ");
  }

  function showResult(result) {
    renderStats();
    el.choicesArea.hidden = true;
    el.resultArea.hidden = false;
    el.resultArea.innerHTML = "";

    const msg = document.createElement("p");
    msg.className = "result-message";
    msg.textContent = result.message;
    el.resultArea.appendChild(msg);

    const eff = effectsSummary(result.effects);
    if (eff) {
      const effEl = document.createElement("p");
      effEl.className = "result-effects";
      effEl.textContent = eff;
      el.resultArea.appendChild(effEl);
    }

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn btn-primary";
    nextBtn.textContent = "つづける";
    nextBtn.addEventListener("click", function () {
      const event = engine.rollRandomEvent();
      if (event) {
        showRandomEvent(event);
      } else {
        advanceAndRender();
      }
    });
    el.resultArea.appendChild(nextBtn);
    renderLog();
  }

  function showRandomEvent(event) {
    el.resultArea.innerHTML = "";
    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = "◆ " + event.title;
    const text = document.createElement("p");
    text.className = "event-text";
    text.textContent = event.text;
    el.resultArea.appendChild(title);
    el.resultArea.appendChild(text);

    const btnWrap = document.createElement("div");
    btnWrap.className = "event-choices";
    event.choices.forEach(function (choice, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", function () {
        const applied = engine.resolveRandomEvent(idx);
        renderStats();
        renderLog();
        btnWrap.innerHTML = "";
        const eff = effectsSummary(applied.effects);
        if (eff) {
          const effEl = document.createElement("p");
          effEl.className = "result-effects";
          effEl.textContent = eff;
          el.resultArea.appendChild(effEl);
        }
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "btn btn-primary";
        nextBtn.textContent = "つづける";
        nextBtn.addEventListener("click", advanceAndRender);
        el.resultArea.appendChild(nextBtn);
      });
      btnWrap.appendChild(btn);
    });
    el.resultArea.appendChild(btnWrap);
  }

  function advanceAndRender() {
    engine.advance();
    saveGame();
    renderStage();
  }

  function renderEnding() {
    el.gameScreen.hidden = true;
    el.endingScreen.hidden = false;
    clearSave();

    const ending = engine.getEnding();
    el.endingScreen.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = ending ? ending.label : "人生の幕が下りた";
    const desc = document.createElement("p");
    desc.className = "ending-desc";
    desc.textContent = ending ? ending.desc : "";

    const statsBlock = document.createElement("div");
    statsBlock.className = "ending-stats";
    PARAMS_CONFIG.forEach(function (p) {
      const v = engine.state.stats[p.key] || 0;
      const row = document.createElement("div");
      row.className = "stat-row";
      row.innerHTML =
        '<span class="stat-label">' + p.label + "</span>" +
        '<span class="stat-value">' + (p.type === "money" ? formatMoney(v) : Math.round(v)) + "</span>";
      statsBlock.appendChild(row);
    });
    const happinessRow = document.createElement("div");
    happinessRow.className = "stat-row";
    happinessRow.innerHTML = '<span class="stat-label">幸福度（複合指標）</span><span class="stat-value">' + engine.getHappiness() + "</span>";
    statsBlock.appendChild(happinessRow);

    const historyTitle = document.createElement("h3");
    historyTitle.textContent = "あなたの人生を形づくった選択";
    const historyList = document.createElement("ol");
    historyList.className = "ending-history";
    engine.state.history.forEach(function (h) {
      const li = document.createElement("li");
      li.textContent = h.age + "歳 - " + (h.message || h.label);
      historyList.appendChild(li);
    });

    const restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "btn btn-primary";
    restartBtn.textContent = "もう一度プレイする";
    restartBtn.addEventListener("click", function () {
      engine.reset();
      renderStage();
      renderStats();
      renderLog();
    });

    el.endingScreen.appendChild(h2);
    el.endingScreen.appendChild(desc);
    el.endingScreen.appendChild(statsBlock);
    el.endingScreen.appendChild(historyTitle);
    el.endingScreen.appendChild(historyList);
    el.endingScreen.appendChild(restartBtn);
  }

  function start() {
    const saved = loadSavedState();
    if (saved && !saved.gameOver) {
      el.resumeBanner.hidden = false;
      el.resumeYes.addEventListener("click", function () {
        engine.loadState(saved);
        el.resumeBanner.hidden = true;
        renderStats();
        renderLog();
        renderStage();
      });
      el.resumeNo.addEventListener("click", function () {
        clearSave();
        engine.reset();
        el.resumeBanner.hidden = true;
        renderStats();
        renderLog();
        renderStage();
      });
    } else {
      renderStats();
      renderLog();
      renderStage();
    }
  }

  el.restartButton.addEventListener("click", function () {
    if (!confirm("最初からやり直しますか？ 現在の進行状況は失われます。")) return;
    clearSave();
    engine.reset();
    renderStats();
    renderLog();
    renderStage();
  });

  start();
})();
