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

    // 支点を画面中央やや上に下げる（参考コード準拠: 0.35）
    this.pivotX = this.canvas.width / 2;
    this.pivotY = this.canvas.height * 0.35;
    
    // pendulum が存在する場合はロープ長も更新
    const ropeLen = Math.min(this.canvas.width, this.canvas.height) * 0.35;
    
    // 地面はロープ長 ＋ キャラクター沈み込み分 ＋ 余白
    this.groundY = this.pivotY + ropeLen + 65;
    
    if (this.pendulum) {
      this.pendulum.length = ropeLen;
    }
  }

  // ===== 背景オブジェクト生成 =====
  _generateBackground() {
    // 参考コードでは固定ループでクラウドを描画しているため、ランダム生成は不要になりました
  }

  // ===== ゲームリセット =====
  reset() {
    const ropeLen = Math.min(this.canvas.width, this.canvas.height) * 0.35;
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
    skyGrad.addColorStop(0, '#bfdbfe'); // bg-blue-200
    skyGrad.addColorStop(1, '#eff6ff'); // bg-blue-50
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ===== カメラ変換（ズーム＋スクロール） =====
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-W / 2 - this.cam.x, -H / 2 - this.cam.y);

    // ===== 背景装飾（雲のような半透明円形） =====
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    for(let i = -15; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(i * 900 + 400, -600 + Math.sin(i) * 250, 300, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== 地面 =====
    ctx.fillStyle = '#94a3b8'; 
    ctx.fillRect(this.pivotX - 200000, this.groundY, 400000, 5000);
    
    // 踏み台（少し明るめ）
    ctx.fillStyle = '#cbd5e1'; 
    ctx.fillRect(this.pivotX - 200, this.groundY, 400, 10);

    // ===== 距離マーカー =====
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.font = "bold 24px sans-serif";
    for(let m = -1000; m <= 40000; m += 20) {
        const mx = this.pivotX + (m / PHYSICS_CONFIG.meterScale);
        ctx.fillRect(mx, this.groundY, 3, 30);
        if (m % 100 === 0) {
            ctx.font = "bold 32px sans-serif";
            ctx.fillText(`${m}m`, mx + 8, this.groundY + 45);
            ctx.font = "bold 24px sans-serif";
        }
    }

    // ===== ブランコの支柱 =====
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.pivotX - 120, this.groundY + 100);
    ctx.lineTo(this.pivotX, this.pivotY);
    ctx.lineTo(this.pivotX + 120, this.groundY + 100);
    ctx.stroke();

    // ===== ロープとキャラクター（ブランコ乗車中） =====
    if (this.launchType !== 'human') {
      const seatX = this.pivotX + Math.sin(this.pendulum.angle) * this.pendulum.length;
      const seatY = this.pivotY + Math.cos(this.pendulum.angle) * this.pendulum.length;

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.pivotX, this.pivotY);
      ctx.lineTo(seatX, seatY);
      ctx.stroke();

      this.character.legExtended = this.isPushing;
      const hasShoe = !this.projectiles.some(p => p.type === 'shoe');
      this.character.drawOnSwing(seatX, seatY, this.pendulum.angle, this.pivotX, this.pivotY, hasShoe, this.pendulum.length);
    }

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, 10, 0, Math.PI * 2);
    ctx.fill();

    // ===== 飛行中・着地後のキャラクターと靴 =====
    this.projectiles.forEach(p => {
      if (p.type === 'human') {
        if (!p.landed) {
          this.character.drawFlying(p.x, p.y, p.vx, p.vy, p.rotation, false, this.pendulum.length);
        } else {
          this.character.drawLanded(p.x, p.y, p.rotation, this.pendulum.length);
          if (this.launchType === 'human') this._drawMarker(ctx, p);
        }
      } else if (p.type === 'shoe') {
        this.character.drawShoe(p.x, p.y, p.rotation, this.pendulum.length / 200);
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

  // 距離マーカーや背景描画の個別メソッドは _draw 内に統合したため削除
}
