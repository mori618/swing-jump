const fs = require('fs');

const file = fs.readFileSync('/Users/mori/Desktop/メモ/swing/js/game.js', 'utf8');

let newFile = file.replace(
/this\.pendulum = new Pendulum\(180, this\.GRAVITY\);[\s\S]*?this\.isLegExtended = false;/m,
`this.pendulum = new Pendulum(180);
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
    this.isPushing = false;`
);

newFile = newFile.replace(
/this\.pendulum = new Pendulum\(ropeLen, this\.GRAVITY\);[\s\S]*?this\.ui\.resetGuide\(\);/m,
`this.pendulum = new Pendulum(ropeLen);
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
    this.ui.resetGuide();`
);

newFile = newFile.replace(
/\/\/ ===== 脚を伸ばすボタンのアクション =====[\s\S]*?\/\/ ===== メインゲームループ =====/m,
`// ===== こぐボタンのアクション =====
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

  // ===== メインゲームループ =====`
);


newFile = newFile.replace(
/\/\/ ===== 状態更新 =====[\s\S]*?\/\/ ===== 描画 =====/m,
`// ===== 状態更新 =====
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

  // ===== 描画 =====`
);

newFile = newFile.replace(
/\/\/ ===== ロープ =====[\s\S]*?\/\/ ==== 描画 ====\/\/\/\/===== 描画メソッド内=====/m,
`// NOTE: Need to replace just the lower part of draw.`
);

// We replace from "// ===== ロープ =====" until the end of _draw method
newFile = newFile.replace(
/\/\/ ===== ロープ =====[\s\S]*?this\.ui\.draw\(ctx, W, H, this\.state, this\._lastDt\);\n  }/m,
`// ===== ロープ =====
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
    ctx.fillText(\`📍 \${p.dist.toFixed(1)}m\`, p.x, this.groundY - 16);
    ctx.restore();
  }`
);


fs.writeFileSync('/Users/mori/Desktop/メモ/swing/js/game.js', newFile);
