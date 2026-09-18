/**
 * roulette.js
 * ------------------------------------------------------------------
 * 人生ゲームの象徴である「1〜10の回転ルーレット」コンポーネント。
 * Canvasによる高精細レンダリング、物理減速アニメーション、
 * 針のクリック振動とサウンド演出を完全再現。
 * ------------------------------------------------------------------
 */

import { sound } from './audio.js';

export class RouletteWheel {
  constructor(canvasElement, onResultCallback) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.onResult = onResultCallback;

    this.isSpinning = false;
    this.currentAngle = 0; // ラジアン
    this.targetNumber = 1;
    this.pegCount = 10;
    this.colors = [
      '#e53935', // 1: 赤
      '#fb8c00', // 2: 橙
      '#fdd835', // 3: 黄
      '#43a047', // 4: 緑
      '#00acc1', // 5: シアン
      '#1e88e5', // 6: 青
      '#5e35b1', // 7: 紫
      '#d81b60', // 8: マゼンタ
      '#00897b', // 9: エメラルド
      '#f4511e'  // 10: 朱色
    ];

    this.lastPegIndex = -1;
    this.needleOffset = 0;

    this.resize();
    this.draw();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width || 280, rect.height || 280);
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);
    this.displaySize = size;
  }

  // 1〜10のルーレットをスピンさせる
  spin(forceNumber = null) {
    if (this.isSpinning) return Promise.reject("Already spinning");

    this.isSpinning = true;
    const target = forceNumber !== null ? forceNumber : Math.floor(Math.random() * 10) + 1;
    this.targetNumber = target;

    // 針は上部（-PI/2）を指す
    // 数字 i (1..10) のセグメントの中心角：
    // segmentAngle = 2 * PI / 10
    // 数字 target の角度 = (target - 1) * segmentAngle + segmentAngle / 2
    // 針 (-PI/2) にその数字が来るための盤面回転角 = -PI/2 - (targetの角度) + 2*PI*k
    const segAngle = (2 * Math.PI) / 10;
    const wedgeCenter = (target - 1) * segAngle + segAngle / 2;

    // ランダムに少し中央から散らす（よりリアルに）
    const jitter = (Math.random() - 0.5) * (segAngle * 0.5);
    const stopAngle = (1.5 * Math.PI - wedgeCenter + jitter) % (2 * Math.PI);

    // 5〜7回転余計に回す
    const extraRotations = 6 * 2 * Math.PI;
    const currentNorm = this.currentAngle % (2 * Math.PI);
    let delta = stopAngle - currentNorm;
    while (delta < 0) delta += 2 * Math.PI;
    const totalRotation = delta + extraRotations;

    const startAngle = this.currentAngle;
    const duration = 3200; // 3.2秒間
    const startTime = performance.now();

    return new Promise((resolve) => {
      const animate = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // 自然なイージング（cubic out / quint out）
        const easeOut = 1 - Math.pow(1 - progress, 4);
        this.currentAngle = startAngle + totalRotation * easeOut;

        // ペグ通過チェックで針を振動＆音再生
        const normalizedAngle = (this.currentAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const currentPeg = Math.floor((normalizedAngle / (2 * Math.PI)) * 10);
        if (currentPeg !== this.lastPegIndex) {
          this.lastPegIndex = currentPeg;
          this.needleOffset = 0.25; // 針を弾く
          sound.playTick();
        } else {
          this.needleOffset *= 0.85; // 針の減衰
        }

        this.draw();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isSpinning = false;
          this.needleOffset = 0;
          this.draw();
          sound.playWheelStop();
          if (this.onResult) this.onResult(this.targetNumber);
          resolve(this.targetNumber);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  draw() {
    const ctx = this.ctx;
    const size = this.displaySize;
    const cx = size / 2;
    const cy = size / 2;
    const r = size * 0.44;

    ctx.clearRect(0, 0, size, size);

    // 外枠シャドウ
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    // 外枠リング（ゴールド）
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#b8860b';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#f6d365';
    ctx.fill();

    // ルーレット本体の回転
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.currentAngle);

    const segAngle = (2 * Math.PI) / 10;

    // 10個の扇形を描画
    for (let i = 0; i < 10; i++) {
      const startA = i * segAngle;
      const endA = startA + segAngle;
      const num = i + 1;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = this.colors[i];
      ctx.fill();

      // 境界線（ホワイト）
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // ペグ（仕切り突起）
      const pegX = (r - 8) * Math.cos(startA);
      const pegY = (r - 8) * Math.sin(startA);
      ctx.beginPath();
      ctx.arc(pegX, pegY, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff8e7';
      ctx.fill();
      ctx.strokeStyle = '#6d4c41';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 数字を描画
      ctx.save();
      const midA = startA + segAngle / 2;
      ctx.rotate(midA);
      ctx.translate(r * 0.68, 0);
      ctx.rotate(Math.PI / 2);

      // 白フチ付きの文字
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(r * 0.22)}px 'Zen Kaku Gothic New', sans-serif`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#222222';
      ctx.strokeText(`${num}`, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${num}`, 0, 0);

      ctx.restore();
    }

    // 中央の立体マウンテン・ノブ（白＋シルバーグラデーション）
    const grad = ctx.createRadialGradient(-r * 0.08, -r * 0.08, 2, 0, 0, r * 0.35);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#e0e0e0');
    grad.addColorStop(0.9, '#9e9e9e');
    grad.addColorStop(1, '#616161');

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.36, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 中央ロゴ / 聴診器アイコン
    ctx.font = `${Math.round(r * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🩺', 0, 0);

    ctx.restore();

    // 固定された上部の針（Pointer / Ticker）
    ctx.save();
    ctx.translate(cx, cy - r - 4);
    ctx.rotate(this.needleOffset); // カチカチと揺れる

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.moveTo(0, 16); // 針先がルーレットへ突入
    ctx.lineTo(-8, -10);
    ctx.lineTo(8, -10);
    ctx.closePath();
    ctx.fillStyle = '#d32f2f'; // 鮮やかな赤針
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 針の軸ピン
    ctx.beginPath();
    ctx.arc(0, -10, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();

    ctx.restore();
  }
}
