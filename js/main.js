/**
 * main.js
 * ------------------------------------------------------------------
 * 医師版「人生ゲーム」メインUIコントローラー
 * - ルーレットとゲーム盤の同期
 * - マルチプレイヤー（1〜4人：人間＆CPU）のターン制御
 * - モーダル表示（イベントカード、選択肢、最終表彰式）
 * ------------------------------------------------------------------
 */

import { DoctorLifeEngine } from './engine.js';
import { BoardRenderer } from './board.js';
import { RouletteWheel } from './roulette.js';
import { sound } from './audio.js';

(function () {
  // DOM要素の参照
  const dom = {
    // Top Bar
    roundBadge: document.getElementById('round-badge'),
    turnBanner: document.getElementById('turn-banner'),
    muteBtn: document.getElementById('mute-btn'),
    fitBoardBtn: document.getElementById('fit-board-btn'),
    restartBtn: document.getElementById('restart-btn'),

    // Canvas
    boardCanvas: document.getElementById('board-canvas'),
    rouletteCanvas: document.getElementById('roulette-canvas'),

    // Control Area
    spinBtn: document.getElementById('spin-btn'),
    spinStatus: document.getElementById('spin-status'),
    lastRollBadge: document.getElementById('last-roll-badge'),
    playersList: document.getElementById('players-list'),
    logList: document.getElementById('log-list'),

    // Modals
    setupModal: document.getElementById('setup-modal'),
    playerCountSelect: document.getElementById('player-count-select'),
    playerConfigsContainer: document.getElementById('player-configs-container'),
    startGameBtn: document.getElementById('start-game-btn'),
    presetSoloBtn: document.getElementById('preset-solo-btn'),
    presetMultiBtn: document.getElementById('preset-multi-btn'),

    eventModal: document.getElementById('event-modal'),
    eventCard: document.getElementById('event-card'),
    eventCategory: document.getElementById('event-category'),
    eventIcon: document.getElementById('event-icon'),
    eventTitle: document.getElementById('event-title'),
    eventStory: document.getElementById('event-story'),
    eventEffect: document.getElementById('event-effect'),
    eventChoices: document.getElementById('event-choices'),
    eventOkBtn: document.getElementById('event-ok-btn'),

    gameoverModal: document.getElementById('gameover-modal'),
    podiumContainer: document.getElementById('podium-container'),
    resultsTableBody: document.getElementById('results-table-body'),
    rematchBtn: document.getElementById('rematch-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),

    tileInspectBox: document.getElementById('tile-inspect-box')
  };

  // モーダル表示・非表示の確実な制御
  function showModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = false;
    modalEl.style.display = 'flex';
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.hidden = true;
    modalEl.style.display = 'none';
  }

  // エンジンとコンポーネントのインスタンス
  const engine = new DoctorLifeEngine();
  let board = null;
  let roulette = null;
  let isProcessingTurn = false;
  let lastPlayerConfigs = null;

  // 初期設定
  function init() {
    board = new BoardRenderer(dom.boardCanvas);
    roulette = new RouletteWheel(dom.rouletteCanvas, onRouletteResult);

    board.onTileSelected = (tile) => {
      showTileInspect(tile);
    };

    window.addEventListener('resize', () => {
      board.resize();
      roulette.resize();
    });

    bindEvents();
    renderSetupPlayers(4); // デフォルト4人
    hideModal(dom.eventModal);
    hideModal(dom.gameoverModal);
    showModal(dom.setupModal);
  }

  function bindEvents() {
    // ミュート切り替え
    dom.muteBtn.addEventListener('click', () => {
      const muted = sound.toggleMute();
      dom.muteBtn.textContent = muted ? '🔇 消音中' : '🔊 サウンドON';
      dom.muteBtn.classList.toggle('btn-muted', muted);
    });

    // 盤面フィット
    dom.fitBoardBtn.addEventListener('click', () => {
      board.fitToScreen();
    });

    // はじめからやり直す
    dom.restartBtn.addEventListener('click', () => {
      if (confirm('ゲームを初期状態に戻して新しく始めますか？')) {
        isProcessingTurn = false;
        hideModal(dom.eventModal);
        hideModal(dom.gameoverModal);
        showModal(dom.setupModal);
      }
    });

    // プレイヤー人数変更
    dom.playerCountSelect.addEventListener('change', (e) => {
      renderSetupPlayers(parseInt(e.target.value, 10));
    });

    // プリセットボタン
    dom.presetSoloBtn.addEventListener('click', () => {
      dom.playerCountSelect.value = "4";
      renderSetupPlayers(4, true); // 1人+3CPU
    });

    dom.presetMultiBtn.addEventListener('click', () => {
      dom.playerCountSelect.value = "4";
      renderSetupPlayers(4, false); // 4人とも人間
    });

    // ゲーム開始ボタン
    dom.startGameBtn.addEventListener('click', () => {
      startNewGame();
    });

    // ルーレットスピンボタン
    dom.spinBtn.addEventListener('click', () => {
      handleSpin();
    });

    // 同じメンバーですぐ再戦ボタン
    if (dom.rematchBtn) {
      dom.rematchBtn.addEventListener('click', () => {
        hideModal(dom.gameoverModal);
        hideModal(dom.eventModal);
        startNewGame(lastPlayerConfigs);
      });
    }

    // 参加者・設定を変更して再戦ボタン
    if (dom.playAgainBtn) {
      dom.playAgainBtn.addEventListener('click', () => {
        isProcessingTurn = false;
        hideModal(dom.gameoverModal);
        hideModal(dom.eventModal);
        showModal(dom.setupModal);
      });
    }
  }

  // 人数に応じたプレイヤー設定フォームの生成
  function renderSetupPlayers(count, soloPreset = false) {
    dom.playerConfigsContainer.innerHTML = '';
    const defaultNames = ['Dr. 田中', 'Dr. 鈴木', 'Dr. 佐藤', 'Dr. 山田'];
    const carColors = ['#e53935', '#1e88e5', '#43a047', '#fbc02d'];

    for (let i = 0; i < count; i++) {
      const isCpu = soloPreset ? (i > 0) : false;
      const row = document.createElement('div');
      row.className = 'player-setup-row';
      row.innerHTML = `
        <div class="player-setup-header">
          <span class="player-badge" style="background:${carColors[i]}">P${i + 1}</span>
          <input type="text" class="player-name-input" data-idx="${i}" value="${defaultNames[i]}" maxlength="10">
          <label class="cpu-checkbox-label">
            <input type="checkbox" class="player-cpu-check" data-idx="${i}" ${isCpu ? 'checked' : ''}>
            CPU
          </label>
        </div>
      `;
      dom.playerConfigsContainer.appendChild(row);
    }
  }

  // 新規ゲーム開始
  function startNewGame(customConfigs = null) {
    let configs = customConfigs;
    if (!configs) {
      const count = parseInt(dom.playerCountSelect.value, 10);
      configs = [];
      const carColors = ['#e53935', '#1e88e5', '#43a047', '#fbc02d'];

      const nameInputs = dom.playerConfigsContainer.querySelectorAll('.player-name-input');
      const cpuChecks = dom.playerConfigsContainer.querySelectorAll('.player-cpu-check');

      for (let i = 0; i < count; i++) {
        configs.push({
          name: nameInputs[i] ? (nameInputs[i].value.trim() || `Dr. P${i + 1}`) : `Dr. P${i + 1}`,
          carColor: carColors[i % carColors.length],
          isCpu: cpuChecks[i] ? cpuChecks[i].checked : false
        });
      }
    }
    lastPlayerConfigs = configs;

    isProcessingTurn = false;
    engine.setupGame(configs);
    board.setPlayers(engine.players, 0);
    hideModal(dom.setupModal);
    hideModal(dom.eventModal);
    hideModal(dom.gameoverModal);
    sound.playFanfare();

    updateUI();
    board.focusPlayer(0);
    checkTurnStart();
  }

  // ターンの開始判定（CPUなら自動スピン）
  function checkTurnStart() {
    if (engine.isGameOver) {
      showGameOver();
      return;
    }

    const current = engine.getCurrentPlayer();
    if (!current) return;

    updateUI();
    board.focusPlayer(engine.activePlayerIndex);

    if (current.isCpu) {
      dom.spinBtn.disabled = true;
      dom.spinStatus.textContent = `🤖 ${current.name} (CPU) の思考中...`;
      setTimeout(() => {
        if (!isProcessingTurn) handleSpin();
      }, 1200);
    } else {
      dom.spinBtn.disabled = false;
      dom.spinStatus.textContent = `🎲 ${current.name} のターン！ルーレットを回してください`;
    }
  }

  // ルーレットを回転
  async function handleSpin() {
    if (isProcessingTurn) return;
    isProcessingTurn = true;
    dom.spinBtn.disabled = true;
    dom.spinStatus.textContent = 'ルーレット回転中…！';

    try {
      await roulette.spin();
    } catch (e) {
      isProcessingTurn = false;
    }
  }

  // ルーレット停止後の移動処理
  async function onRouletteResult(rollNumber) {
    dom.lastRollBadge.textContent = `${rollNumber}`;
    dom.lastRollBadge.classList.remove('pop-anim');
    void dom.lastRollBadge.offsetWidth;
    dom.lastRollBadge.classList.add('pop-anim');

    const current = engine.getCurrentPlayer();
    dom.spinStatus.textContent = `${current.name} は 【${rollNumber}】 を出しました！`;

    // 移動先の計算
    const moveInfo = engine.calculateMove(rollNumber);
    if (!moveInfo) {
      isProcessingTurn = false;
      return;
    }

    // コマを一歩ずつ進める
    await board.animateMoveCar(engine.activePlayerIndex, moveInfo.targetPos);

    // 通過給料日の処理
    if (moveInfo.passedSalaries.length > 0) {
      engine.collectPassedSalaries(current, moveInfo.passedSalaries);
      sound.playMoney();
      updateUI();
      await new Promise(r => setTimeout(r, 600));
    }

    // 着地マスの効果適用
    if (moveInfo.finalTile.type === 'goal') {
      sound.playFanfare();
      engine.handlePlayerGoal(current);
      updateUI();
      await showEventModal({
        title: "👑 栄光のリタイア山に登頂！",
        category: "ゴール",
        icon: "🏆",
        story: `${current.name} は栄光の医学界殿堂に第${current.arrivalRank}着でゴールイン！`,
        effectText: `着順ボーナス ¥${(current.cash - (current.finalCash || current.cash)).toLocaleString()} を受取！`
      });
      finishTurn();
    } else {
      const outcome = engine.applyTileLanding(current, moveInfo.finalTile);
      updateUI();
      await handleTileOutcome(current, outcome);
    }
  }

  // 着地イベントモーダルの表示とプレイヤー入力
  async function handleTileOutcome(player, outcome) {
    const tile = outcome.tile;

    // 音声演出
    if (outcome.moneyChange > 0) {
      sound.playMoney();
    } else if (outcome.moneyChange < 0) {
      sound.playAlert();
    } else if (outcome.isMarriage || outcome.childAdded) {
      sound.playFanfare();
    }

    // 選択肢が必要な場合（保険・マイホーム・キャリア分岐）
    if (outcome.promptType || outcome.needsBranchChoice) {
      return new Promise((resolve) => {
        showChoiceModal(player, outcome, (decision) => {
          const resultMsg = engine.confirmPlayerDecision(player, outcome.promptType || 'career_branch', decision);
          updateUI();
          finishTurn();
          resolve();
        });
      });
    }

    // 通常のイベントカード表示
    await showEventModal({
      title: tile.title,
      category: getCategoryName(tile.type),
      icon: getCategoryIcon(tile.type),
      story: outcome.message || tile.desc,
      effectText: formatOutcomeEffect(outcome)
    });

    finishTurn();
  }

  // ターン終了と次プレイヤーへの引継ぎ
  function finishTurn() {
    isProcessingTurn = false;
    updateUI();

    if (engine.isGameOver) {
      showGameOver();
      return;
    }

    const next = engine.nextTurn();
    if (!next) {
      showGameOver();
    } else {
      board.activePlayerIndex = engine.activePlayerIndex;
      checkTurnStart();
    }
  }

  // 選択肢モーダルの表示
  function showChoiceModal(player, outcome, callback) {
    showModal(dom.eventModal);
    dom.eventChoices.innerHTML = '';
    dom.eventOkBtn.hidden = true;

    dom.eventTitle.textContent = outcome.tile.title;
    dom.eventCategory.textContent = '人生の決断';
    dom.eventIcon.textContent = '⚖️';
    dom.eventStory.textContent = outcome.message;
    dom.eventEffect.textContent = '';

    // CPUの場合は自動選択
    if (player.isCpu) {
      dom.eventStory.textContent += ' (CPUが選択中...)';
      setTimeout(() => {
        hideModal(dom.eventModal);
        if (outcome.promptType === 'insurance_malpractice') {
          callback(true); // CPUは賠償保険に加入
        } else if (outcome.promptType === 'insurance_life') {
          callback(true);
        } else if (outcome.promptType === 'buy_house') {
          callback(player.cash >= 12000000); // 余裕があれば購入
        } else if (outcome.needsBranchChoice) {
          const branches = ['clinic', 'professor', 'global'];
          callback(branches[Math.floor(Math.random() * branches.length)]);
        }
      }, 1600);
      return;
    }

    // 人間プレイヤーの選択ボタン生成
    if (outcome.promptType) {
      const yesBtn = document.createElement('button');
      yesBtn.className = 'btn btn-primary';
      yesBtn.textContent = `加入・購入する (¥${(outcome.cost || 0).toLocaleString()})`;
      yesBtn.onclick = () => {
        hideModal(dom.eventModal);
        callback(true);
      };

      const noBtn = document.createElement('button');
      noBtn.className = 'btn btn-secondary';
      noBtn.textContent = '見送る';
      noBtn.onclick = () => {
        hideModal(dom.eventModal);
        callback(false);
      };

      dom.eventChoices.appendChild(yesBtn);
      dom.eventChoices.appendChild(noBtn);
    } else if (outcome.needsBranchChoice) {
      const choices = outcome.tile.choices || [];
      choices.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-choice';
        btn.innerHTML = `<strong>${ch.label}</strong><br><small>${ch.desc}</small>`;
        btn.onclick = () => {
          hideModal(dom.eventModal);
          callback(ch.id);
        };
        dom.eventChoices.appendChild(btn);
      });
    }
  }

  // イベントカードの表示
  function showEventModal(data) {
    return new Promise((resolve) => {
      showModal(dom.eventModal);
      dom.eventChoices.innerHTML = '';
      dom.eventOkBtn.hidden = false;

      dom.eventTitle.textContent = data.title;
      dom.eventCategory.textContent = data.category;
      dom.eventIcon.textContent = data.icon;
      dom.eventStory.textContent = data.story;
      dom.eventEffect.textContent = data.effectText || '';

      const current = engine.getCurrentPlayer();
      if (current.isCpu) {
        // CPU時は自動スキップ
        setTimeout(() => {
          hideModal(dom.eventModal);
          resolve();
        }, 2400);
      } else {
        dom.eventOkBtn.onclick = () => {
          hideModal(dom.eventModal);
          resolve();
        };
      }
    });
  }

  // 最終結果表彰式の表示
  function showGameOver() {
    hideModal(dom.eventModal);
    showModal(dom.gameoverModal);
    sound.playFanfare();

    dom.podiumContainer.innerHTML = '';
    dom.resultsTableBody.innerHTML = '';

    const standings = engine.standings || [];

    // ポディウム（表彰台）
    standings.slice(0, 3).forEach((p, idx) => {
      const pod = document.createElement('div');
      pod.className = `podium-rank rank-${idx + 1}`;
      pod.innerHTML = `
        <div class="podium-medal">${['🥇', '🥈', '🥉'][idx]}</div>
        <div class="podium-name">${p.name}</div>
        <div class="podium-score">¥${(p.totalNetWorth || 0).toLocaleString()}</div>
        <div class="podium-car" style="background:${p.carColor}"></div>
      `;
      dom.podiumContainer.appendChild(pod);
    });

    // 詳細リザルト表
    standings.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${p.finalRank}</strong></td>
        <td>
          <span class="player-dot" style="background:${p.carColor}"></span>
          ${p.name} ${p.isCpu ? '(CPU)' : ''}
          <div class="doctor-title-badge">${p.doctorTitle}</div>
        </td>
        <td>¥${(p.finalCash || 0).toLocaleString()}</td>
        <td>${p.hasHouse ? '🏡 1800万' : '-'}</td>
        <td>👨‍👩‍👧‍👦 ${((p.spouse ? 1 : 0) + p.children)}人 (¥${(p.familyValue || 0).toLocaleString()})</td>
        <td>🎁 ${p.treasures.length}個 (¥${(p.treasureValue || 0).toLocaleString()})</td>
        <td><strong class="highlight-networth">¥${(p.totalNetWorth || 0).toLocaleString()}</strong></td>
      `;
      dom.resultsTableBody.appendChild(tr);
    });
  }

  // UI表示全体の更新
  function updateUI() {
    // ラウンドとターン
    dom.roundBadge.textContent = `第 ${engine.roundCount} ターン`;
    const current = engine.getCurrentPlayer();
    if (current) {
      dom.turnBanner.innerHTML = `
        <span class="player-dot" style="background:${current.carColor}"></span>
        <strong>${current.name}</strong> の番 ${current.isCpu ? '(CPU)' : ''}
      `;
    }

    // プレイヤー一覧サイドバー
    renderPlayerCards();

    // ログリスト
    dom.logList.innerHTML = '';
    engine.log.slice(0, 15).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      dom.logList.appendChild(li);
    });

    // 盤面再描画
    board.draw();
  }

  // プレイヤーカード一覧の更新
  function renderPlayerCards() {
    dom.playersList.innerHTML = '';

    engine.players.forEach((p, idx) => {
      const isActive = idx === engine.activePlayerIndex;
      const card = document.createElement('div');
      card.className = `player-card ${isActive ? 'active-card' : ''} ${p.retired ? 'retired-card' : ''}`;

      // 自動車とピンのビジュアル
      let pinHtml = `
        <div class="mini-car-box" style="border-color:${p.carColor}">
          <span class="car-body" style="background:${p.carColor}"></span>
          <div class="car-pins-grid">
            <span class="pin-badge" title="本人 (白衣)">👨‍⚕️</span>
            ${p.spouse ? '<span class="pin-badge pin-spouse" title="配偶者">💍</span>' : '<span class="pin-empty"></span>'}
            ${p.children >= 1 ? '<span class="pin-badge pin-child" title="子ども1">👶</span>' : '<span class="pin-empty"></span>'}
            ${p.children >= 2 ? '<span class="pin-badge pin-child" title="子ども2">👶</span>' : '<span class="pin-empty"></span>'}
          </div>
        </div>
      `;

      card.innerHTML = `
        <div class="player-card-header">
          <div class="name-box">
            <span class="player-dot" style="background:${p.carColor}"></span>
            <strong>${p.name}</strong> ${p.isCpu ? '<small class="cpu-tag">CPU</small>' : ''}
          </div>
          ${p.retired ? '<span class="status-retired">👑 GOAL!</span>' : `<span class="pos-badge">${p.position}マス目</span>`}
        </div>

        <div class="player-card-middle">
          ${pinHtml}
          <div class="player-assets">
            <div class="asset-line">
              <span class="asset-label">所持金:</span>
              <span class="asset-value money-bold">¥${p.cash.toLocaleString()}</span>
            </div>
            <div class="asset-line">
              <span class="asset-label">給料:</span>
              <span class="asset-value">¥${p.salary.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div class="player-badges-row">
          ${p.specialty ? `<span class="spec-pill" title="${p.specialty.desc}">${p.specialty.icon} ${p.specialty.name}</span>` : '<span class="spec-pill empty">研修医</span>'}
          ${p.insurance.malpractice ? '<span class="badge-tag tag-shield" title="医師賠償責任保険 加入済">🛡️賠償保険</span>' : ''}
          ${p.insurance.life ? '<span class="badge-tag tag-life" title="生命・医療保険 加入済">💊医療保険</span>' : ''}
          ${p.hasHouse ? '<span class="badge-tag tag-house" title="マイホーム購入済">🏡タワマン</span>' : ''}
          ${p.treasures.length > 0 ? `<span class="badge-tag tag-treasure" title="${p.treasures.map(t=>t.name).join(' / ')}">🎁お宝×${p.treasures.length}</span>` : ''}
        </div>
      `;

      dom.playersList.appendChild(card);
    });
  }

  // マス詳細インスペクター表示
  function showTileInspect(tile) {
    if (!dom.tileInspectBox) return;
    dom.tileInspectBox.hidden = false;
    dom.tileInspectBox.innerHTML = `
      <div class="inspect-header">
        <span>#${tile.id} ${tile.title}</span>
        <button type="button" class="close-inspect" onclick="this.parentElement.parentElement.hidden=true">×</button>
      </div>
      <p class="inspect-desc">${tile.desc}</p>
      <div class="inspect-effect">${tile.effect ? tile.effect.text || '' : ''}</div>
    `;
  }

  function getCategoryName(type) {
    switch (type) {
      case 'start': return 'スタート';
      case 'blue': return '好調・ステップアップ';
      case 'red': return '当直・試練・出費';
      case 'pink': return '愛と家族・プライベート';
      case 'green': return '給料日';
      case 'yellow': return 'チャンス・お宝・保険';
      case 'stop': return '人生のSTOP決断';
      case 'goal': return 'リタイアメント';
      default: return 'イベント';
    }
  }

  function getCategoryIcon(type) {
    switch (type) {
      case 'start': return '🏁';
      case 'blue': return '🔷';
      case 'red': return '🔻';
      case 'pink': return '💖';
      case 'green': return '💴';
      case 'yellow': return '⭐';
      case 'stop': return '🛑';
      case 'goal': return '👑';
      default: return '🎲';
    }
  }

  function formatOutcomeEffect(outcome) {
    const parts = [];
    if (outcome.moneyChange) {
      parts.push(`所持金 ${outcome.moneyChange >= 0 ? '+' : ''}¥${outcome.moneyChange.toLocaleString()}`);
    }
    if (outcome.salaryChange) {
      parts.push(`給料 +¥${outcome.salaryChange.toLocaleString()}`);
    }
    if (outcome.specialty) {
      parts.push(`専門医：${outcome.specialty.name}`);
    }
    if (outcome.treasureDrawn) {
      parts.push(`お宝：${outcome.treasureDrawn.name} (¥${outcome.treasureDrawn.value.toLocaleString()})`);
    }
    return parts.join(' / ');
  }

  // アプリ起動
  window.addEventListener('DOMContentLoaded', init);
})();
