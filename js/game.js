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
    // 飛行物理用の scaled重力（視覚的な重力。PIXELs_PER_METERに合わせてスケール）
    this.FLY_GRAVITY = 200;       // 飛行中の重力（px/s²）
    // ブースト係数（参考コード: |ω| * 14 のボクセル変換）
    this.BOOST_FACTOR = 8;

    // --- サイズ設定 ---
    this._resize();

    // --- 各モジュールの初期化 ---
    this.pendulum = new Pendulum(180);
    this.character = new Character(this.ctx);
    this.save = new SaveManager();
    this.ui = new GameUI(this.save);
    this.ui.resetGuide();

    // --- ゲームステート ---
    this.state = STATE.SWINGING;
    this.projectiles = [];
    this.launchType = '';
    this.displayRotations = 0;
    this.lastVelSign = 0;

    // --- カメラ ---
    this.cam = {
      x: 0,          // カメラX（ワールド座標系。スクロール量）
      y: 0,          // カメラY（スクロール量）
      targetX: 0,
      targetY: 0,
      zoom: 1,       // ズーム倍率（飛行中は縮小）
      followSpeed: 0.08,
    };

    // --- 入力状態 ---
    this.isPushing = false;

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

    // 支点を画面中央やや上に下げる（回転時に見切れないように 28% -> 45%）
    this.pivotX = this.canvas.width / 2;
    this.pivotY = this.canvas.height * 0.45;
    
    // pendulum が存在する場合はロープ長も更新
    const ropeLen = Math.min(this.canvas.width, this.canvas.height) * 0.28;
    
    // 地面はロープ長 ＋ キャラクター沈み込み分 ＋ 余白
    this.groundY = this.pivotY + ropeLen + 80;
    
    if (this.pendulum) {
      this.pendulum.baseLength = ropeLen;
    }
  }

  // ===== 背景オブジェクト生成 =====
  _generateBackground() {
    // 雲（広い範囲に）
    this.clouds = Array.from({ length: 12 }, (_, i) => ({
      x: i * 500 - 1000 + Math.random() * 200,
      y: 60 + Math.random() * 120,
      r: 35 + Math.random() * 30,
    }));
    // 木（遠くまで）
    this.trees = Array.from({ length: 30 }, (_, i) => ({
      x: i * 300 - 600 + Math.random() * 100,
      y: 0,
      height: 60 + Math.random() * 50,
    }));
    // 地面装飾（草）
    this.grasses = Array.from({ length: 60 }, (_, i) => ({
      x: i * 200 - 1200,
      size: 8 + Math.random() * 6,
    }));
  }

  // ===== ゲームリセット =====
  reset() {
    const ropeLen = Math.min(this.canvas.width, this.canvas.height) * 0.28;
    this.pendulum = new Pendulum(ropeLen);
    this.state = STATE.SWINGING;
    this.projectiles = [];
    this.launchType = '';
    this.displayRotations = 0;
    this.isPushing = false;
    this.character.legExtended = false;
    this.character.flyPose = false;
    this.cam.x = 0;
    this.cam.y = 0;
    this.cam.targetX = 0;
    this.cam.targetY = 0;
    this.cam.zoom = 1;
    this.cam.followSpeed = 0.08;
    this.ui.hideResult();
    this.ui.setDistance(0);
    this.ui.resetGuide();
  }

  // ===== こぐボタンのアクション =====
  startPump() {
    if (this.state === STATE.RESULT || this.launchType === 'human') return;
    this.isPushing = true;
    this.ui.guideTimer = 0;
    
    if (this.pendulum.angularVelocity > 0 && this.pendulum.canPushBoost) {
      this.pendulum.angularVelocity += PHYSICS_CONFIG.pushImpulse;
      this.pendulum.canPushBoost = false;
    }
  }

  stopPump() {
    if (this.state === STATE.RESULT || !this.isPushing) return;
    this.isPushing = false;
    
    if (this.pendulum.angularVelocity < 0 && this.pendulum.canReleaseBoost) {
      this.pendulum.angularVelocity -= PHYSICS_CONFIG.releaseImpulse;
      this.pendulum.canReleaseBoost = false;
    }
  }

  // ===== 飛ばすボタンのアクション =====
  launch(type) {
    if (this.state === STATE.RESULT || this.launchType === 'human') return;
    if (type === 'shoe' && this.projectiles.some(p => p.type === 'shoe')) return;

    const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);
    const vel = this.pendulum.getVelocity();

    const p = new Projectile(
      type,
      seat.x,
      seat.y - 30,  // キャラクターの重心
      vel.vx,
      vel.vy,
      this.pendulum.angle,
      this.pendulum.angularVelocity
    );

    this.projectiles.push(p);
    this.launchType = type;
    this.cam.followSpeed = 0.25;

    // type === 'human' の場合は飛行状態へ完全移行
    if (type === 'human') {
      this.state = STATE.FLYING;
      this.character.flyPose = true;
      this.isPushing = false;
    } else if (type === 'shoe') {
      // type === 'shoe' だけならブランコはまだ漕げる
      this.state = STATE.FLYING; // ただしゲーム進行は投射物追尾へ
    }
  }

  // ===== メインゲームループ =====
  _loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // 最大50ms
    this.lastTime = timestamp;
    this._lastDt = dt;

    this._update(dt);
    this._draw();

    this.animId = requestAnimationFrame(this._loop);
  }

  // ===== 状態更新 =====
  _update(dt) {
    // 振り子の更新（humanが飛んでいない場合のみ）
    if (this.launchType !== 'human') {
      const oldRotPhase = Math.floor((this.pendulum.angle + Math.PI) / (Math.PI * 2));
      
      this.pendulum.update();
      
      const newRotPhase = Math.floor((this.pendulum.angle + Math.PI) / (Math.PI * 2));

      if (oldRotPhase !== newRotPhase) {
        this.displayRotations++;
        this.pendulum.canPushBoost = true;
        this.pendulum.canReleaseBoost = true;
      }

      const currentVelSign = Math.sign(this.pendulum.angularVelocity);
      if (currentVelSign !== this.lastVelSign && currentVelSign !== 0) {
        this.pendulum.canPushBoost = true;
        this.pendulum.canReleaseBoost = true;
        this.lastVelSign = currentVelSign;
      }

      const maxSpeed = 0.4;
      this.ui.setPower(Math.abs(this.pendulum.angularVelocity) / maxSpeed);
    } else {
      this.ui.setPower(0);
    }

    if (this.state === STATE.FLYING || this.state === STATE.RESULT) {
      let primaryTarget = null;
      this.projectiles.forEach(p => {
        if (!p.landed) {
          p.update();
          if (p.checkLanding(this.groundY, this.pivotX)) {
            if (p.type === 'human' || this.launchType === 'shoe') {
              this.state = STATE.RESULT;
              this.ui.showResultScreen(p.dist, p.type);
            }
          }
        }
        if (p.type === 'human') primaryTarget = p;
        else if (!primaryTarget) primaryTarget = p; // shoe falls back
      });

      if (primaryTarget) {
        const screenCenterX = this.canvas.width / 2;
        const screenCenterY = this.canvas.height / 2;

        this.cam.targetX = Math.max(0, primaryTarget.x - screenCenterX * 0.4);
        this.cam.targetY = Math.max(0, primaryTarget.y - screenCenterY * 0.6);

        const xDiff = Math.abs(primaryTarget.x - this.pivotX);
        this.cam.zoom = Math.max(0.25, 1 - xDiff * 0.00012);

        this.ui.setDistance((primaryTarget.x - this.pivotX) * PHYSICS_CONFIG.meterScale);
      }
    }

    // カメラの追従
    if (this.state === STATE.RESULT) {
      this.cam.followSpeed = 0.04;
    }
    this.cam.x += (this.cam.targetX - this.cam.x) * this.cam.followSpeed;
    this.cam.y += (this.cam.targetY - this.cam.y) * this.cam.followSpeed;
  }

  // ===== 描画 =====
  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // ===== 空背景（グラデーション） =====
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, '#5BA8E5');
    skyGrad.addColorStop(0.5, '#87CEEB');
    skyGrad.addColorStop(0.85, '#E0F4FF');
    skyGrad.addColorStop(1, '#B8E4C9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ===== カメラ変換（ズーム＋スクロール） =====
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-W / 2 - this.cam.x, -H / 2 - this.cam.y);

    // ===== 雲 =====
    this.clouds.forEach(cloud => {
      // 画面外になったら右に再配置（無限スクロール）
      const screenLeft = this.cam.x - W;
      if (cloud.x + cloud.r * 3 < screenLeft) {
        cloud.x += 6000;
      }
      this._drawCloud(ctx, cloud.x, cloud.y, cloud.r);
    });

    // ===== 木 =====
    this.trees.forEach(tree => {
      const screenLeft = this.cam.x - W;
      if (tree.x + 60 < screenLeft) {
        tree.x += 9000;
      }
      this._drawTree(ctx, tree.x, this.groundY, tree.height);
    });

    // ===== 地面 =====
    // 広い地面帯（参考コード: cameraX-200000 〜 +400000）
    ctx.fillStyle = '#5D9E4B';
    ctx.fillRect(this.cam.x - 200000, this.groundY, 400000, 5000);
    ctx.fillStyle = '#4A8038';
    ctx.fillRect(this.cam.x - 200000, this.groundY, 400000, 14);

    // ブランコ真下の特別な踏み台
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(this.pivotX - 200, this.groundY, 400, 12);

    // ===== 距離マーカー =====
    if (this.state !== STATE.SWINGING) {
      this._drawDistanceMarkers(ctx);
    }

    // ===== ブランコの支柱 =====
    this._drawSwingFrame(ctx);

    // ===== ロープ =====
    if (this.launchType !== 'human') {
      const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.pivotX, this.pivotY);
      ctx.lineTo(seat.x, seat.y);
      ctx.stroke();

      this.character.legExtended = this.isPushing;
      const hasShoe = !this.projectiles.some(p => p.type === 'shoe');
      this.character.drawOnSwing(seat.x, seat.y, this.pendulum.angle, this.pivotX, this.pivotY, hasShoe);
    }

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 10, 0, Math.PI * 2);
    ctx.fill();

    // ===== 飛行中・着地後のキャラクターと靴 =====
    this.projectiles.forEach(p => {
      if (p.type === 'human') {
        if (!p.landed) {
          this.character.drawFlying(p.x, p.y, p.vx, p.vy, p.rotation, false);
        } else {
          this.character.drawLanded(p.x, p.y);
          this._drawMarker(ctx, p);
        }
      } else if (p.type === 'shoe') {
        this.character.drawShoe(p.x, p.y, p.rotation, 1.3);
        if (p.landed && this.launchType === 'shoe') {
          this._drawMarker(ctx, p);
        }
      }
    });

    ctx.restore(); // カメラ変換終了

    this.ui.draw(ctx, W, H, this.state, this._lastDt);
  }
  
  _drawMarker(ctx, p) {
    if (p.dist === 0) return;
    ctx.save();
    ctx.fillStyle = '#FF6D00';
    ctx.font = 'bold 18px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(`📍 ${p.dist.toFixed(1)}m`, p.x, this.groundY - 16);
    ctx.restore();
  }

  // ===== ブランコ支柱の描画（A字型） =====
  _drawSwingFrame(ctx) {
    const px = this.pivotX;
    const py = this.pivotY;
    const baseHalf = 130;

    // 左柱
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px - baseHalf, this.groundY + 100);
    ctx.lineTo(px, py);
    ctx.stroke();

    // 右柱
    ctx.beginPath();
    ctx.moveTo(px + baseHalf, this.groundY + 100);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // ===== 雲の描画 =====
  _drawCloud(ctx, x, y, r) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.9, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x + r * 1.6, y, r * 0.6, 0, Math.PI * 2);
    ctx.arc(x - r * 0.6, y + r * 0.1, r * 0.65, 0, Math.PI * 2);
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

  // ===== 距離マーカーの描画（参考コード準拠の広域版） =====
  _drawDistanceMarkers(ctx) {
    const startX = this.pivotX; // ブランコの起点X（飛び出し地点）
    const ppm = this.PIXELS_PER_METER;

    // 可視範囲を計算してマーカーの描画範囲を制限（パフォーマンス）
    const visLeft = this.cam.x - this.canvas.width;
    const visRight = this.cam.x + this.canvas.width * 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';

    // 20m間隔のメインマーカー
    for (let m = -20; m <= 40000; m += 20) {
      const mx = startX + m * ppm;
      if (mx < visLeft || mx > visRight) continue;

      // 縦棒
      ctx.fillRect(mx, this.groundY, 3, 30);

      // 100m 毎に大きなラベル
      if (m % 100 === 0) {
        ctx.font = 'bold 30px "Nunito", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${m}m`, mx + 8, this.groundY + 44);
      }
    }

    ctx.restore();
  }
}
