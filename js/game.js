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

    this.startPivotX = this.pivotX;
    this.swingJumps = 0;

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
    this.canvas.height = window.innerHeight * (2 / 3);

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
    this.pivotX = this.startPivotX;
    this.swingJumps = 0;
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
    if (this.state === STATE.RESULT) return;
    this.isPushing = true;
    
    if (this.launchType !== 'human') {
      this.ui.guideTimer = 0;
      const boostMultiplier = this.save.equippedItems.includes('pump_up') ? 2.5 : 1.0;
      this.pendulum.applyBoost(true, boostMultiplier);
    }
  }

  stopPump() {
    if (this.state === STATE.RESULT || !this.isPushing) return;
    this.isPushing = false;
    
    if (this.launchType !== 'human') {
      const boostMultiplier = this.save.equippedItems.includes('pump_up') ? 2.5 : 1.0;
      this.pendulum.applyBoost(false, boostMultiplier);
    }
  }

  // ===== 飛ばすボタンのアクション =====
  launch(type) {
    if (this.state === STATE.FLYING && type === 'human') {
      this.doubleJump();
      return;
    }
    if (this.state === STATE.RESULT || this.launchType === 'human') return;
    if (type === 'shoe' && this.projectiles.some(p => p.type === 'shoe')) return;

    const seat = this.pendulum.getSeatPosition(this.pivotX, this.pivotY);
    const vel = this.pendulum.getVelocity();

    let vx = vel.vx;
    let vy = vel.vy;

    // 「どこでもブランコ」1回目のジャンプ処理（初速半減し、swingJumpsを1に）
    if (type === 'human' && this.save.equippedItems.includes('swing_item') && this.swingJumps === 0) {
      this.swingJumps = 1;
      vx *= 0.5;
      vy *= 0.5;
    } else if (type === 'human' && this.swingJumps === 1) {
      // 2回目のジャンプ
      this.swingJumps = 2;
    }

    const p = new Projectile(
      type,
      seat.x,
      seat.y - 30,  // キャラクターの重心
      vx,
      vy,
      this.pendulum.angle,
      this.pendulum.angularVelocity,
      this.save.equippedItems
    );

    this.projectiles.push(p);
    this.launchType = type;
    this.cam.followSpeed = 0.25;

    // type === 'human' の場合は飛行状態へ完全移行
    if (type === 'human') {
      this.state = STATE.FLYING;
      this.character.flyPose = true;
      // 飛行中もこぐボタンでパラグライダーを使えるため、isPushingはリセットしないか、そのままにする
    } else if (type === 'shoe') {
      // type === 'shoe' だけならブランコはまだ漕げる
      this.state = STATE.FLYING; // ただしゲーム進行は投射物追尾へ
    }
  }

  // ===== 空中での２段ジャンプ処理 =====
  doubleJump() {
    if (!this.save.equippedItems.includes('double_jump')) return;
    
    // 対象となる human を探す
    const human = this.projectiles.find(p => p.type === 'human');
    if (!human || human.landed || human.hasDoubleJumped) return;

    human.hasDoubleJumped = true;
    
    // ジャンプ力の計算
    let jumpPower = -9;
    if (this.save.equippedItems.includes('jump_up')) {
      jumpPower = -14;
    }
    human.vy = jumpPower;
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
    // ===== タイミング円不要のため削除 =====
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
            ctx.fillText(`${m}${TEXTS.UI_M}`, mx + 8, this.groundY + 45);
            ctx.font = "bold 24px sans-serif";
        }
    }

    // ===== ブランコの支柱 =====
    let drawPoles = true;
    if (this.state === STATE.FLYING && this.launchType === 'human' && this.swingJumps === 1) {
      drawPoles = false; // 1度目はブランコも一緒に飛んでいるので元の位置には描画しない
    }

    if (drawPoles) {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.pivotX - 120, this.groundY + 100);
      ctx.lineTo(this.pivotX, this.pivotY);
      ctx.lineTo(this.pivotX + 120, this.groundY + 100);
      ctx.stroke();
    }

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
          const isParagliding = p.equippedItems.includes('paraglider') && this.isPushing;
          this.character.drawFlying(p.x, p.y, p.vx, p.vy, p.rotation, false, this.pendulum.length, isParagliding);
          
          if (this.swingJumps === 1) {
            // ブランコごと飛んでいるエフェクト（簡易描画）
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(-20, 0, 40, 5); // 座席
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-15, 0); ctx.lineTo(-60, -this.pendulum.length);
            ctx.moveTo(15, 0);  ctx.lineTo(60, -this.pendulum.length);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-60, -this.pendulum.length); ctx.lineTo(-120, -this.pendulum.length + 100);
            ctx.moveTo(-60, -this.pendulum.length); ctx.lineTo(0, -this.pendulum.length + 100);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          this.character.drawLanded(p.x, p.y, p.rotation, this.pendulum.length);
          if (this.launchType === 'human' && this.swingJumps !== 1) this._drawMarker(ctx, p);
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

  _drawClockGuide(ctx) {
    if (this.state !== STATE.SWINGING && this.launchType !== 'shoe') return;
    
    const r = this.pendulum.length;
    
    ctx.save();
    ctx.translate(this.pivotX, this.pivotY);
    
    // 背景円盤（常に左回転時の色に固定）
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)'; 
    ctx.fill();

    // 補助円
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const drawSegment = (startA, endA, color, outerR, innerR) => {
      ctx.beginPath();
      const canvasStart = Math.PI / 2 - startA;
      const canvasEnd = Math.PI / 2 - endA;
      ctx.arc(0, 0, outerR, canvasEnd, canvasStart, false);
      ctx.arc(0, 0, innerR, canvasStart, canvasEnd, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const colors = {
      tinyAccel: 'rgba(56, 189, 248, 0.15)',
      smallAccel: 'rgba(14, 165, 233, 0.3)',
      normalAccel: 'rgba(37, 99, 235, 0.45)',
      hugeAccel: 'rgba(79, 70, 229, 0.6)',
      tinyBrake: 'rgba(253, 224, 71, 0.15)',
      smallBrake: 'rgba(251, 146, 60, 0.3)',
      normalBrake: 'rgba(239, 68, 68, 0.45)',
      hugeBrake: 'rgba(185, 28, 28, 0.6)'
    };

    // 常に左回転時（CCW）のメーターを表示する
    // Push: outer ring
    const p_o = r * 1.15, p_i = r * 1.0;
    drawSegment(-2*Math.PI/3, -Math.PI/2, colors.smallAccel, p_o, p_i);
    drawSegment(-Math.PI/2, -Math.PI/3, colors.normalAccel, p_o, p_i);
    drawSegment(-Math.PI/3, -Math.PI/6, colors.hugeAccel, p_o, p_i);
    drawSegment(-Math.PI/6, 0, colors.normalAccel, p_o, p_i);
    drawSegment(0, Math.PI/2, colors.smallAccel, p_o, p_i);
    drawSegment(Math.PI/2, Math.PI, colors.tinyAccel, p_o, p_i);
    drawSegment(-Math.PI, -2*Math.PI/3, colors.tinyAccel, p_o, p_i);

    // Release: inner ring
    const r_o = r * 0.9, r_i = r * 0.75;
    drawSegment(-2*Math.PI/3, 0, colors.smallBrake, r_o, r_i);
    drawSegment(0, Math.PI/2, colors.normalBrake, r_o, r_i);
    drawSegment(Math.PI/2, 5*Math.PI/6, colors.hugeBrake, r_o, r_i);
    drawSegment(5*Math.PI/6, Math.PI, colors.tinyBrake, r_o, r_i);
    drawSegment(-Math.PI, -2*Math.PI/3, colors.normalBrake, r_o, r_i);

    // 時計の文字盤（時間）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 16px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      let hourA;
      if (i === 12) hourA = Math.PI;
      else if (i <= 6) hourA = Math.PI - i * (Math.PI / 6);
      else hourA = - (i - 6) * (Math.PI / 6);
      
      const hX = Math.sin(hourA) * r * 1.25;
      const hY = Math.cos(hourA) * r * 1.25;
      ctx.fillText(i.toString(), hX, hY);
    }

    // ラベル
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 12px "Nunito", sans-serif';
    ctx.fillText(TEXTS.GAME_PUSH, 0, -r * 1.05);
    ctx.fillText(TEXTS.GAME_RELEASE, 0, -r * 0.82);

    ctx.restore();
  }

  _drawMarker(ctx, p) {
    if (p.dist === 0) return;
    ctx.save();
    ctx.fillStyle = '#FF6D00';
    ctx.font = 'bold 18px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText(`${TEXTS.GAME_MARKER}${p.dist.toFixed(1)}${TEXTS.UI_M}`, p.x, this.groundY - 16);
    ctx.restore();
  }

  // 距離マーカーや背景描画の個別メソッドは _draw 内に統合したため削除
}
