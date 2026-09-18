/**
 * board.js
 * ------------------------------------------------------------------
 * 医師版「人生ゲーム」のゲーム盤レンダラー。
 * - 曲がりくねったマス目（タイル）コースのレイアウト生成
 * - タイルの描画（色・アイコン・番号・ストップ表示）
 * - 自動車コマ（4色オープンカー）と乗員ピン（本人・配偶者・子ども）の描画
 * - スムーズなステップ移動アニメーション
 * ------------------------------------------------------------------
 */

import { BOARD_TILES } from '../data/boardData.js';
import { sound } from './audio.js';

export class BoardRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.tiles = BOARD_TILES;
    this.tileCoords = [];
    this.players = [];
    this.activePlayerIndex = 0;
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.isAnimatingMove = false;
    this.selectedTile = null;

    this.computeTilePositions();
    this.setupInteractions();
    this.resize();
  }

  // 49マスの曲がりくねったコース座標（幅2200 x 高さ1400の仮想キャンバス）を算出
  computeTilePositions() {
    this.worldWidth = 2200;
    this.worldHeight = 1400;
    this.tileCoords = [];

    // S字とループを組み合わせた壮大なボードゲームコース
    // 0..9 (医学部): 左下から右上へ上昇
    // 10..18 (研修医): 右上から中央上部へ
    // 19..29 (専門医・結婚): 中央から右中段へ
    // 30..41 (キャリア分岐・開業/教授): 右中段から左中段へ大きく蛇行
    // 42..48 (円熟期・リタイア山): 左中段から中央の頂上ゴールへ！

    const rawWaypoints = [
      // 0..9: 医学部
      { x: 120, y: 1250 },
      { x: 260, y: 1220 },
      { x: 400, y: 1260 },
      { x: 540, y: 1230 },
      { x: 680, y: 1160 },
      { x: 800, y: 1060 },
      { x: 740, y: 940 },
      { x: 600, y: 900 },
      { x: 460, y: 920 },
      { x: 340, y: 840 }, // 9: 国試STOP

      // 10..18: 初期研修・専門医
      { x: 280, y: 710 }, // 10: 研修医給料
      { x: 380, y: 620 },
      { x: 520, y: 600 },
      { x: 660, y: 590 },
      { x: 800, y: 560 },
      { x: 940, y: 530 }, // 15: 修了給料
      { x: 1080, y: 510 },
      { x: 1220, y: 480 },
      { x: 1360, y: 440 }, // 18: 専門医STOP

      // 19..29: 人生の転機・結婚
      { x: 1500, y: 410 }, // 19: 給料日
      { x: 1640, y: 430 },
      { x: 1780, y: 470 },
      { x: 1920, y: 550 }, // 22: 結婚STOP
      { x: 1960, y: 690 },
      { x: 1880, y: 810 },
      { x: 1740, y: 870 }, // 25: 給料日
      { x: 1600, y: 900 },
      { x: 1460, y: 940 }, // 27: 第一子誕生
      { x: 1320, y: 970 },
      { x: 1180, y: 1010 },

      // 30..41: キャリア大分岐・波乱万丈
      { x: 1040, y: 1070 }, // 30: キャリア分岐STOP
      { x: 920, y: 1180 },  // 31: 給料日
      { x: 1060, y: 1260 }, // 32: 第二子誕生
      { x: 1220, y: 1250 },
      { x: 1380, y: 1240 },
      { x: 1540, y: 1200 },
      { x: 1700, y: 1130 },
      { x: 1840, y: 1020 }, // 37: 医療事故STOP
      { x: 1950, y: 920 },  // 38: 給料日
      { x: 2020, y: 780 },
      { x: 1980, y: 640 },
      { x: 1840, y: 580 },

      // 42..48: 円熟期〜リタイア山
      { x: 1680, y: 550 }, // 42: 給料日
      { x: 1540, y: 520 },
      { x: 1400, y: 540 },
      { x: 1280, y: 580 },
      { x: 1160, y: 630 },
      { x: 1040, y: 690 }, // 47: 最終給料日
      { x: 920, y: 760 }   // 48: GOAL山頂！
    ];

    this.tileCoords = rawWaypoints;
  }

  setupInteractions() {
    let startX = 0, startY = 0;

    const onPointerDown = (e) => {
      this.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;
      this.panX += dx;
      this.panY += dy;
      this.clampPan();
      this.draw();
    };

    const onPointerUp = (e) => {
      this.isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.4), 1.8);

      // マウス位置を中心にズーム
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
      this.scale = newScale;
      this.clampPan();
      this.draw();
    };

    this.canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });

    // タッチ対応
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      this.panX += dx;
      this.panY += dy;
      this.clampPan();
      this.draw();
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // クリックでマス情報確認
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - this.panX) / this.scale;
      const clickY = (e.clientY - rect.top - this.panY) / this.scale;

      let found = null;
      for (let i = 0; i < this.tileCoords.length; i++) {
        const c = this.tileCoords[i];
        const dist = Math.hypot(clickX - c.x, clickY - c.y);
        if (dist < 50) {
          found = this.tiles[i];
          break;
        }
      }
      this.selectedTile = found;
      if (this.onTileSelected && found) {
        this.onTileSelected(found);
      }
      this.draw();
    });
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // 初期フィット
    if (this.scale === 1 && this.panX === 0) {
      this.fitToScreen();
    } else {
      this.draw();
    }
  }

  fitToScreen() {
    const scaleX = this.width / this.worldWidth;
    const scaleY = this.height / this.worldHeight;
    this.scale = Math.min(scaleX, scaleY) * 0.95;
    this.panX = (this.width - this.worldWidth * this.scale) / 2;
    this.panY = (this.height - this.worldHeight * this.scale) / 2;
    this.draw();
  }

  focusPlayer(playerIndex, smooth = true) {
    const player = this.players[playerIndex];
    if (!player) return;
    const coord = this.tileCoords[player.position] || this.tileCoords[0];
    const targetScale = Math.max(this.scale, 0.85);

    const targetPanX = this.width / 2 - coord.x * targetScale;
    const targetPanY = this.height / 2 - coord.y * targetScale;

    if (!smooth) {
      this.scale = targetScale;
      this.panX = targetPanX;
      this.panY = targetPanY;
      this.draw();
      return;
    }

    const startPanX = this.panX;
    const startPanY = this.panY;
    const startScale = this.scale;
    const startTime = performance.now();
    const duration = 500;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.panX = startPanX + (targetPanX - startPanX) * ease;
      this.panY = startPanY + (targetPanY - startPanY) * ease;
      this.scale = startScale + (targetScale - startScale) * ease;
      this.draw();

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  clampPan() {
    // 余裕を持たせたパンリミット
    const pad = 400 * this.scale;
    const minX = this.width - this.worldWidth * this.scale - pad;
    const maxX = pad;
    const minY = this.height - this.worldHeight * this.scale - pad;
    const maxY = pad;

    this.panX = Math.min(Math.max(this.panX, minX), maxX);
    this.panY = Math.min(Math.max(this.panY, minY), maxY);
  }

  setPlayers(players, activeIndex = 0) {
    this.players = players;
    this.activePlayerIndex = activeIndex;
    this.draw();
  }

  // 指定のマスへ1歩ずつ車を進めるアニメーション
  async animateMoveCar(playerIndex, targetTileIndex) {
    this.isAnimatingMove = true;
    const player = this.players[playerIndex];
    const current = player.position;

    if (current === targetTileIndex) {
      this.isAnimatingMove = false;
      return;
    }

    const stepDir = targetTileIndex > current ? 1 : -1;
    let pos = current;

    while (pos !== targetTileIndex) {
      pos += stepDir;
      player.position = pos;
      sound.playCarMove();

      // カメラ追従
      const coord = this.tileCoords[pos];
      this.panX = this.width / 2 - coord.x * this.scale;
      this.panY = this.height / 2 - coord.y * this.scale;
      this.clampPan();
      this.draw();

      await new Promise(r => setTimeout(r, 260));
    }

    this.isAnimatingMove = false;
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // 背景（ボードゲーム盤面：高級フェルトグリーン/木目調）
    ctx.fillStyle = '#e8f0ec';
    ctx.fillRect(0, 0, this.width, this.height);

    // カメラ適用
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // 盤面エリアの外枠＆シャドウ
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = '#faf8f2';
    ctx.beginPath();
    ctx.roundRect(40, 40, this.worldWidth - 80, this.worldHeight - 80, 24);
    ctx.fill();
    ctx.strokeStyle = '#c8bfae';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // ゾーンごとの装飾背景ラベル
    this.drawZoneBackgrounds(ctx);

    // コースの道（トラック下敷き）
    this.drawTrackPath(ctx);

    // 各タイル（マス目）
    this.drawTiles(ctx);

    // プレイヤーの車コマと乗員ピン
    this.drawCars(ctx);

    ctx.restore();
  }

  drawZoneBackgrounds(ctx) {
    // 各ゾーンのテーマ看板
    const zones = [
      { text: "🎓 医学部〜医師国家試験編", x: 260, y: 1330, color: "#1976d2" },
      { text: "🩺 初期研修医〜基本領域専門医編", x: 800, y: 440, color: "#00897b" },
      { text: "💍 人生の転機・結婚・マイホーム編", x: 1800, y: 360, color: "#d81b60" },
      { text: "🏥 キャリア大分岐・開業 vs 教授選編", x: 1400, y: 1330, color: "#f57c00" },
      { text: "🏆 栄光の医学界殿堂（リタイア山）", x: 920, y: 830, color: "#b8860b" }
    ];

    zones.forEach(z => {
      ctx.save();
      ctx.font = "bold 20px 'Shippori Mincho', serif";
      ctx.fillStyle = z.color;
      ctx.textAlign = "center";
      ctx.fillText(z.text, z.x, z.y);
      ctx.restore();
    });
  }

  drawTrackPath(ctx) {
    if (this.tileCoords.length < 2) return;

    // 太い道路下敷き
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.tileCoords[0].x, this.tileCoords[0].y);

    for (let i = 1; i < this.tileCoords.length; i++) {
      const p0 = this.tileCoords[i - 1];
      const p1 = this.tileCoords[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    const last = this.tileCoords[this.tileCoords.length - 1];
    ctx.lineTo(last.x, last.y);

    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 64;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // センター破線
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 16]);
    ctx.stroke();
    ctx.restore();
  }

  drawTiles(ctx) {
    this.tileCoords.forEach((coord, i) => {
      const tile = this.tiles[i];
      if (!tile) return;

      const isSelected = this.selectedTile && this.selectedTile.id === tile.id;
      const isStop = tile.type === 'stop';
      const isGoal = tile.type === 'goal';
      const isStart = tile.type === 'start';

      const radius = isGoal ? 54 : (isStop || isStart ? 46 : 38);

      // タイル色マッピング
      let bg = '#ffffff';
      let border = '#9e9e9e';
      let icon = '⚪';

      switch (tile.type) {
        case 'start':
          bg = '#3f51b5';
          border = '#1a237e';
          icon = '🏁';
          break;
        case 'blue':
          bg = '#42a5f5';
          border = '#1565c0';
          icon = '🔷';
          break;
        case 'red':
          bg = '#ef5350';
          border = '#c62828';
          icon = '🔻';
          break;
        case 'pink':
          bg = '#ec407a';
          border = '#ad1457';
          icon = '💖';
          break;
        case 'green':
          bg = '#66bb6a';
          border = '#2e7d32';
          icon = '💴';
          break;
        case 'yellow':
          bg = '#ffca28';
          border = '#f57f17';
          icon = '⭐';
          break;
        case 'stop':
          bg = '#d32f2f';
          border = '#7f0000';
          icon = '🛑';
          break;
        case 'goal':
          bg = '#ffd700';
          border = '#b8860b';
          icon = '👑';
          break;
      }

      ctx.save();
      // マス目シャドウ
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = isSelected ? 16 : 8;
      ctx.shadowOffsetY = 3;

      // タイル円形または角丸四角形
      ctx.beginPath();
      if (isStop) {
        // STOPマスは八角形
        const aStep = Math.PI / 4;
        for (let a = 0; a < 8; a++) {
          const px = coord.x + radius * Math.cos(a * aStep + aStep / 2);
          const py = coord.y + radius * Math.sin(a * aStep + aStep / 2);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(coord.x, coord.y, radius, 0, 2 * Math.PI);
      }

      ctx.fillStyle = bg;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ff1744' : border;
      ctx.lineWidth = isSelected ? 5 : 3.5;
      ctx.stroke();
      ctx.restore();

      // 内側の白いリング（立体感）
      ctx.beginPath();
      ctx.arc(coord.x, coord.y, radius - 4, 0, 2 * Math.PI);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // マス番号バッジ
      ctx.save();
      ctx.beginPath();
      ctx.arc(coord.x - radius * 0.6, coord.y - radius * 0.6, 12, 0, 2 * Math.PI);
      ctx.fillStyle = '#37474f';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i}`, coord.x - radius * 0.6, coord.y - radius * 0.6);
      ctx.restore();

      // タイルテキスト & アイコン
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isStop) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px sans-serif';
        ctx.fillText('STOP', coord.x, coord.y - 6);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(tile.title.replace('【STOP】', '').slice(0, 7), coord.x, coord.y + 12);
      } else if (isGoal) {
        ctx.fillStyle = '#37474f';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('👑 GOAL', coord.x, coord.y - 8);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('栄光のリタイア山', coord.x, coord.y + 12);
      } else if (isStart) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('START', coord.x, coord.y - 6);
        ctx.font = '10px sans-serif';
        ctx.fillText('医学部入学', coord.x, coord.y + 10);
      } else if (tile.type === 'green') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('給料日', coord.x, coord.y - 6);
        ctx.font = '13px sans-serif';
        ctx.fillText('💴', coord.x, coord.y + 12);
      } else {
        // 短縮タイトル
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        const label = tile.title.slice(0, 6);
        ctx.fillText(icon, coord.x, coord.y - 8);
        ctx.fillText(label, coord.x, coord.y + 10);
      }
      ctx.restore();
    });
  }

  // プレイヤーごとの車コマと乗員ピンを描画
  drawCars(ctx) {
    if (!this.players || this.players.length === 0) return;

    // 同じマスにいる車が重ならないようにオフセット配置
    const tileOccupants = {};
    this.players.forEach((p, idx) => {
      const pos = p.position || 0;
      if (!tileOccupants[pos]) tileOccupants[pos] = [];
      tileOccupants[pos].push({ player: p, index: idx });
    });

    Object.keys(tileOccupants).forEach(tileIndex => {
      const list = tileOccupants[tileIndex];
      const coord = this.tileCoords[tileIndex] || this.tileCoords[0];

      list.forEach((item, slotIndex) => {
        const total = list.length;
        // 分散オフセット
        let ox = 0, oy = 0;
        if (total === 2) {
          ox = (slotIndex === 0 ? -18 : 18);
          oy = (slotIndex === 0 ? -12 : 12);
        } else if (total === 3) {
          const angles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
          ox = 22 * Math.cos(angles[slotIndex]);
          oy = 22 * Math.sin(angles[slotIndex]);
        } else if (total >= 4) {
          const offsets = [
            { x: -18, y: -16 },
            { x: 18, y: -16 },
            { x: -18, y: 16 },
            { x: 18, y: 16 }
          ];
          ox = offsets[slotIndex % 4].x;
          oy = offsets[slotIndex % 4].y;
        }

        const isCurrentTurn = item.index === this.activePlayerIndex;
        this.renderSingleCar(ctx, coord.x + ox, coord.y + oy, item.player, isCurrentTurn);
      });
    });
  }

  // 1台のオープンカーコマと人物ピンの描画
  renderSingleCar(ctx, cx, cy, player, isActive) {
    ctx.save();
    ctx.translate(cx, cy);

    // アクティブプレイヤーのハイライト光彩
    if (isActive) {
      ctx.save();
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.35)';
      ctx.fill();
      ctx.restore();

      // 頭上に「YOU」または名前マーカー
      ctx.save();
      ctx.fillStyle = '#d32f2f';
      ctx.beginPath();
      ctx.roundRect(-24, -38, 48, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.name.slice(0, 5), 0, -30);
      ctx.restore();
    }

    // 車のカラー
    const carColor = player.carColor || '#e53935';

    // 車の影
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 20, 11, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // 車体（クラシック・オープンカーのトップビュー）
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-16, -10, 32, 20, 6);
    ctx.fillStyle = carColor;
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // ボンネットライン
    ctx.beginPath();
    ctx.arc(10, 0, 4, -Math.PI / 2, Math.PI / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // 車室内（シートエリア・ダークグレー）
    ctx.beginPath();
    ctx.roundRect(-12, -7, 20, 14, 4);
    ctx.fillStyle = '#37474f';
    ctx.fill();

    // タイヤ（4隅）
    const wheels = [
      { x: -12, y: -12 },
      { x: 8, y: -12 },
      { x: -12, y: 10 },
      { x: 8, y: 10 }
    ];
    wheels.forEach(w => {
      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.roundRect(w.x, w.y, 6, 3, 1);
      ctx.fill();
    });

    // === 人物ピン（Person Pins）の描画 ===
    // 穴1: 運転手（プレイヤー本人・白衣ピン）
    this.drawPin(ctx, 0, -3, '#ffffff', '#e0e0e0', '👨‍⚕️');

    // 穴2: 助手席（配偶者ピン・ピンク/水色）
    if (player.spouse) {
      this.drawPin(ctx, 0, 3, '#ff4081', '#f50057', '💍');
    } else {
      this.drawEmptyHole(ctx, 0, 3);
    }

    // 穴3: 後部座席1（子どもピン1・イエロー）
    if (player.children >= 1) {
      this.drawPin(ctx, -8, -3, '#ffeb3b', '#fbc02d', '👶');
    } else {
      this.drawEmptyHole(ctx, -8, -3);
    }

    // 穴4: 後部座席2（子どもピン2・パープル）
    if (player.children >= 2) {
      this.drawPin(ctx, -8, 3, '#ba68c8', '#8e24aa', '👶');
    } else {
      this.drawEmptyHole(ctx, -8, 3);
    }

    ctx.restore();
    ctx.restore();
  }

  // 人物ピン
  drawPin(ctx, x, y, color, shadowColor, emoji) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // ピンの頭ハイライト
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
    ctx.restore();
  }

  // 空のピン挿し穴
  drawEmptyHole(ctx, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e2528';
    ctx.fill();
    ctx.restore();
  }
}
