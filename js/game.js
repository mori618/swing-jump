/**
 * game.js — ゲームループ・ステート管理
 * ゲームの状態遷移とメインループを管理する
 */

'use strict';

/**
 * ゲームステートの定数
 */
const STATE = {
  SWINGING: 'SWINGING', // ブランコ漕ぎ中
  FLYING: 'FLYING',     // 飛行中
  RESULT: 'RESULT',     // 結果表示中
};

/**
 * ゲーム全体を管理するクラス
 */
class Game {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // --- ゲームパラメータ ---
    this.GRAVITY = 980;           // 重力加速度（px/s²）
    this.PIXELS_PER_METER = 60;   // 1メートルあたりのピクセル数（距離換算用）

    // --- サイズ設定 ---
    this._resize();

    // --- 支点座標（画面上部中央） ---
    this.pivotX = this.canvas.width / 2;
    this.pivotY = 60;

    // --- 地面のY座標 ---
    this.groundY = this.canvas.height - 80;

    // --- 背景スクロール ---
    this.cameraX = 0;             // カメラX（飛行中にスクロール）
    this.targetCameraX = 0;

    // --- 各モジュールの初期化 ---
    this.pendulum = new Pendulum(120, this.GRAVITY); // ロープ長120px
    this.character = new Character(this.ctx);
    this.save = new SaveManager();         // セーブ管理
    this.ui = new GameUI(this.save);       // UIにセーブマネージャーを渡す
    this.ui.resetGuide();

    // --- ゲームステート ---
    this.state = STATE.SWINGING;
    this.projectile = null;

    // --- 入力状態 ---
    this.isLegExtended = false;   // 脚を伸ばしているか

    // --- アニメーションフレーム管理 ---
    this.lastTime = null;
    this.animId = null;

    // --- 背景要素（雲・木など）をランダム生成 ---
    this._generateBackground();

    // --- ループ開始 ---
    this._loop = this._loop.bind(this);
    this.animId = requestAnimationFrame(this._loop);
  }

  // ===== リサイズ処理 =====
  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.groundY = this.canvas.height - 80;
    this.pivotX = this.canvas.width / 2;
    // 支点は地面から220px上（A字型ブランコの適切な高さ）
    this.pivotY = this.groundY - 220;
  }

  // ===== 背景オブジェクト生成 =====
  _generateBackground() {
    // 雲
    this.clouds = Array.from({ length: 6 }, (_, i) => ({
      x: i * 300 - 200 + Math.random() * 100,
      y: 80 + Math.random() * 100,
      r: 30 + Math.random() * 25,
    }));
    // 木
    this.trees = Array.from({ length: 20 }, (_, i) => ({
      x: i * 200 - 500 + Math.random() * 80,
      y: 0,
      height: 60 + Math.random() * 40,
    }));
    // 地面装飾（草）
    this.grasses = Array.from({ length: 40 }, (_, i) => ({
      x: i * 150 - 600,
      size: 8 + Math.random() * 6,
    }));
  }

  // ===== ゲームリセット =====
  reset() {
    this.pendulum = new Pendulum(120, this.GRAVITY); // ロープ長120px
    this.pendulum.angle = Math.PI * 0.5;
    this.pendulum.angularVelocity = 0;
    this.state = STATE.SWINGING;
    this.projectile = null;
    this.isLegExtended = false;
    this.character.legExtended = false;
    this.character.flyPose = false;
    this.cameraX = 0;
    this.targetCameraX = 0;
    this.ui.hideResult();
    this.ui.setDistance(0);
    this.ui.resetGuide();
  }

  // ===== 脚を伸ばすボタンのアクション =====
  startLegExtend() {
    if (this.state === STATE.SWINGING) {
      this.isLegExtended = true;
      this.pendulum.legExtended = true;
      this.character.legExtended = true;
    }
  }

  stopLegExtend() {
    this.isLegExtended = false;
    this.pendulum.legExtended = false;
    this.character.legExtended = false;
  }

  // ===== 飛んでいくボタンのアクション =====
  launch() {
    if (this.state !== STATE.SWINGING) return;

    const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);
    const vel = this.pendulum.getVelocity(this.pivotX, this.pivotY);

    // 飛行オブジェクト生成
    this.projectile = new Projectile(
      seat.x,
      seat.y - 30, // キャラクターの重心（座席より少し上）
      vel.vx,
      vel.vy,
      this.GRAVITY
    );

    this.state = STATE.FLYING;
    this.character.flyPose = true;
    this.isLegExtended = false;
    this.pendulum.legExtended = false;
  }

  // ===== メインゲームループ =====
  _loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 最大50ms
    this.lastTime = timestamp;
    this._lastDt = dt; // UI描画用に保持

    this._update(dt);
    this._draw();

    this.animId = requestAnimationFrame(this._loop);
  }

  // ===== 状態更新 =====
  _update(dt) {
    if (this.state === STATE.SWINGING) {
      this.pendulum.update(dt);
      const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);

      // 振り子の勢いをUIゲージに反映
      const maxSpeed = 12; // rad/s 程度を最大とする
      this.ui.setPower(Math.abs(this.pendulum.angularVelocity) / maxSpeed);

    } else if (this.state === STATE.FLYING) {
      this.projectile.update(dt);

      // カメラを徐々にキャラクターに追従
      this.targetCameraX = Math.max(0, this.projectile.x - this.canvas.width * 0.4);
      this.cameraX += (this.targetCameraX - this.cameraX) * 0.08;

      const dist = this.projectile.getDistance(this.PIXELS_PER_METER);
      this.ui.setDistance(dist);
      this.ui.setPower(0);

      // 着地判定
      if (this.projectile.hasLanded(this.groundY)) {
        this.projectile.y = this.groundY; // 地面にスナップ
        this.state = STATE.RESULT;
        this.ui.showResultScreen(dist);
      }
    }
  }

  // ===== 描画 =====
  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // ===== 空背景（グラデーション） =====
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.7, '#E0F4FF');
    skyGrad.addColorStop(1, '#B8E4C9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ===== カメラオフセット適用 =====
    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // ===== 雲 =====
    this.clouds.forEach(cloud => {
      // 雲を画面外になったら右に再配置（無限スクロール）
      if (cloud.x + cloud.r * 2 < this.cameraX - 100) {
        cloud.x += 1800;
      }
      this._drawCloud(ctx, cloud.x, cloud.y, cloud.r);
    });

    // ===== 木 =====
    this.trees.forEach(tree => {
      if (tree.x + 50 < this.cameraX - 100) {
        tree.x += 4000;
      }
      this._drawTree(ctx, tree.x, this.groundY, tree.height);
    });

    // ===== 地面 =====
    ctx.fillStyle = '#5D9E4B';
    ctx.fillRect(this.cameraX - 50, this.groundY, W + 100, H - this.groundY);
    ctx.fillStyle = '#4A8038';
    ctx.fillRect(this.cameraX - 50, this.groundY, W + 100, 12);

    // 飛距離マーカーライン
    if (this.state !== STATE.SWINGING) {
      this._drawDistanceMarkers(ctx);
    }

    // ===== ブランコの支柱 =====
    if (this.state === STATE.SWINGING) {
      this._drawSwingFrame(ctx);
    }

    // ===== キャラクター描画 =====
    if (this.state === STATE.SWINGING) {
      const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);
      this.character.legExtended = this.isLegExtended;
      this.character.drawOnSwing(seat.x, seat.y, this.pendulum.angle, this.pivotX, this.pivotY);

    } else if (this.state === STATE.FLYING || this.state === STATE.RESULT) {
      const p = this.projectile;
      this.character.drawFlying(p.x, p.y, p.vx, p.vy);

      // 着地後は地面に固定
      if (this.state === STATE.RESULT) {
        const dist = p.getDistance(this.PIXELS_PER_METER);
        // 着地マーカー
        ctx.save();
        ctx.fillStyle = '#FF6D00';
        ctx.font = 'bold 14px "Nunito", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`📍 ${dist.toFixed(1)}m`, p.x, this.groundY - 10);
        ctx.restore();
      }
    }

    ctx.restore(); // カメラオフセット終了

    // ===== UI（カメラの影響を受けない） =====
    this.ui.draw(ctx, W, H, this.state, this._lastDt);
  }

  // ===== ブランコ支柱の描画（A字型） =====
  _drawSwingFrame(ctx) {
    const px = this.pivotX;
    const py = this.pivotY;
    const baseHalf = 120; // 足元の左右幅（山底の半分）

    // 左斥
    ctx.strokeStyle = '#7B4F2E';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - baseHalf, this.groundY);
    ctx.lineTo(px, py);
    ctx.stroke();

    // 右斥
    ctx.beginPath();
    ctx.moveTo(px + baseHalf, this.groundY);
    ctx.lineTo(px, py);
    ctx.stroke();

    // 地面側の横演射（山底を結ぶ）
    ctx.strokeStyle = '#6B3A2A';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(px - baseHalf, this.groundY);
    ctx.lineTo(px + baseHalf, this.groundY);
    ctx.stroke();

    // 頂点（支点）の丸キャップ
    ctx.fillStyle = '#5D2E1A';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== 雲の描画 =====
  _drawCloud(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.5, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x - r * 0.6, y + r * 0.1, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ===== 木の描画 =====
  _drawTree(ctx, x, groundY, h) {
    ctx.save();
    // 幹
    ctx.fillStyle = '#7B5A3A';
    ctx.fillRect(x - 5, groundY - h * 0.35, 10, h * 0.35);
    // 葉（三角形3層）
    ctx.fillStyle = '#3A7D44';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, groundY - h - i * 15);
      ctx.lineTo(x - 28 + i * 6, groundY - h * 0.55 - i * 15);
      ctx.lineTo(x + 28 - i * 6, groundY - h * 0.55 - i * 15);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ===== 距離マーカーの描画 =====
  _drawDistanceMarkers(ctx) {
    const startX = this.pivotX; // ブランコの起点X
    const ppm = this.PIXELS_PER_METER;
    const interval = 5; // 5m ごとにマーカー

    ctx.save();
    for (let m = interval; m <= 200; m += interval) {
      const markerX = startX + m * ppm;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(markerX, this.groundY - 40);
      ctx.lineTo(markerX, this.groundY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${m}m`, markerX, this.groundY - 44);
    }
    ctx.restore();
  }
}
