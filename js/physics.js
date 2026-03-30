/**
 * physics.js — 物理エンジン
 * 振り子運動（ブランコ）と放物線飛行の計算を担当する
 */

'use strict';

/**
 * 物理パラメータの設定（定数）
 */
const PHYSICS_CONFIG = {
  gravity: 0.22,
  friction: 0.9985,
  pushImpulse: 0.026,
  releaseImpulse: 0.014,
  shoeGravity: 0.15,
  humanGravity: 0.18,
  meterScale: 0.02
};

/**
 * 振り子（ブランコ）の物理状態を管理するクラス
 */
class Pendulum {
  /**
   * @param {number} length  基本ロープ長（ピクセル）
   */
  constructor(length) {
    this.length = length;       // アームの長さ（ピクセル）
    this.angle = 0.4;           // 初期角度（ラジアン）
    this.angularVelocity = 0;   // 角速度

    // ブースト（こぐ）関連
    this.canPushBoost = true;
    this.canReleaseBoost = true;
  }

  getNormalizedAngle() {
    let a = this.angle % (Math.PI * 2);
    if (a > Math.PI) a -= Math.PI * 2;
    if (a < -Math.PI) a += Math.PI * 2;
    if (a <= -Math.PI) a += Math.PI * 2;
    return a;
  }

  /**
   * 物理を1フレーム進める（参考コードはフレームベース駆動）
   */
  update() {
    let angularAcceleration = -(PHYSICS_CONFIG.gravity / this.length) * Math.sin(this.angle);

    // パッシブ効果：左半分で加速、右半分で減速
    const ang = this.getNormalizedAngle(); // -PI to PI
    if (this.angularVelocity > 0) { // 左回転(CCW)
      if (ang < 0) {
        angularAcceleration += 0.0015; // 左半分で加速
      } else {
        angularAcceleration -= 0.0015; // 右半分で減速
      }
    } else if (this.angularVelocity < 0) { // 右回転(CW)
      if (ang > 0) {
        angularAcceleration -= 0.0015; // 右半分で加速 (CWではマイナス方向が加速)
      } else {
        angularAcceleration += 0.0015; // 左半分で減速
      }
    }

    this.angularVelocity += angularAcceleration;
    this.angularVelocity *= PHYSICS_CONFIG.friction;
    this.angle += this.angularVelocity;
  }

  /**
   * 指定された角度領域に応じてブースト（加速・減速）を適用する
   * @param {boolean} isPush こいでいるかどうか
   * @param {number} boostMultiplier ショップアイテム等による加速力倍率
   */
  applyBoost(isPush, boostMultiplier = 1.0) {
    const ang = this.getNormalizedAngle();
    const isCCW = this.angularVelocity >= 0;

    const TINY = 0.008;
    const SMALL = 0.015;
    const NORMAL = 0.022;
    const HUGE = 0.038;

    let impulse = 0;

    if (isCCW) {
      if (isPush) {
        if (ang >= -2 * Math.PI / 3 && ang < -Math.PI / 2) impulse = SMALL;
        else if (ang >= -Math.PI / 2 && ang < -Math.PI / 3) impulse = NORMAL;
        else if (ang >= -Math.PI / 3 && ang < -Math.PI / 6) impulse = HUGE;
        else if (ang >= -Math.PI / 6 && ang < 0) impulse = NORMAL;
        else if (ang >= 0 && ang < Math.PI / 2) impulse = SMALL;
        else impulse = TINY;

        if (this.canPushBoost) {
          const actualImpulse = impulse > 0 ? impulse * boostMultiplier : impulse;
          this.angularVelocity += actualImpulse;
          this.canPushBoost = false;
        }
      } else {
        if (ang >= -2 * Math.PI / 3 && ang < 0) impulse = -SMALL;
        else if (ang >= 0 && ang < Math.PI / 2) impulse = -NORMAL;
        else if (ang >= Math.PI / 2 && ang < 5 * Math.PI / 6) impulse = -NORMAL * 1.5;
        else if (ang >= 5 * Math.PI / 6 && ang <= Math.PI) impulse = -TINY;
        else impulse = -NORMAL;

        if (this.canReleaseBoost) {
          let actualImpulse = impulse > 0 ? impulse * boostMultiplier : impulse;
          actualImpulse *= 0.95; // 減速力をさらに5%落とす
          this.angularVelocity += actualImpulse;
          this.canReleaseBoost = false;
        }
      }
    } else { // CW
      if (!isPush) {
        if (ang <= 2 * Math.PI / 3 && ang > Math.PI / 2) impulse = -SMALL;
        else if (ang <= Math.PI / 2 && ang > Math.PI / 3) impulse = -NORMAL;
        else if (ang <= Math.PI / 3 && ang > Math.PI / 6) impulse = -HUGE;
        else if (ang <= Math.PI / 6 && ang > 0) impulse = -NORMAL;
        else if (ang <= 0 && ang > -Math.PI / 2) impulse = -SMALL;
        else impulse = -TINY;

        if (this.canReleaseBoost) {
          const actualImpulse = impulse < 0 ? impulse * boostMultiplier : impulse;
          this.angularVelocity += actualImpulse;
          this.canReleaseBoost = false;
        }
      } else {
        if (ang <= -Math.PI / 2 && ang > -5 * Math.PI / 6) impulse = NORMAL * 1.5;
        else if (ang <= -5 * Math.PI / 6 && ang > -Math.PI - 0.01) impulse = TINY;
        else if (ang <= Math.PI && ang > 2 * Math.PI / 3) impulse = NORMAL;
        else if (ang <= 2 * Math.PI / 3 && ang > 0) impulse = SMALL;
        else impulse = NORMAL;

        if (this.canPushBoost) {
          let actualImpulse = impulse < 0 ? impulse * boostMultiplier : impulse;
          actualImpulse *= 0.95; // 減速力をさらに5%落とす
          this.angularVelocity += actualImpulse;
          this.canPushBoost = false;
        }
      }
    }
  }

  /**
   * 支点座標をもとに、ブランコ座席（キャラクター位置）のXY座標を返す
   * @param {number} pivotX 支点X
   * @param {number} pivotY 支点Y
   * @returns {{x: number, y: number}}
   */
  getSeatPosition(pivotX, pivotY) {
    return {
      x: pivotX + Math.sin(this.angle) * this.length,
      y: pivotY + Math.cos(this.angle) * this.length,
    };
  }

  /**
   * 現在の速度ベクトル（飛行開始時の初速）を取得する
   * @returns {{vx: number, vy: number}}
   */
  getVelocity() {
    const vx = Math.cos(this.angle) * this.angularVelocity * this.length;
    // 上方向の初速ボーナスを追加
    const vy = -Math.sin(this.angle) * this.angularVelocity * this.length - Math.abs(this.angularVelocity) * 14;
    return { vx, vy };
  }
}

/**
 * 飛んでいるオブジェクト（靴・人間）の放物線物理状態を管理するクラス
 */
class Projectile {
  /**
   * @param {string} type 'shoe' か 'human'
   * @param {number} x  初期X座標
   * @param {number} y  初期Y座標
   * @param {number} vx 初速X成分
   * @param {number} vy 初速Y成分
   * @param {number} initialAngle 飛び出し時の振り子角度
   * @param {number} angularVelocity 飛び出し時の角速度（回転スピード用）
   * @param {Array<string>} equippedItems 装備中のアイテムIDリスト
   */
  constructor(type, x, y, vx, vy, initialAngle, angularVelocity, equippedItems = []) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.startX = x;

    this.landed = false;
    this.dist = 0;

    // タイプごとの物理パラメータ
    this.gravity = type === 'shoe' ? PHYSICS_CONFIG.shoeGravity : PHYSICS_CONFIG.humanGravity;
    this.friction = type === 'shoe' ? 0.996 : 0.998;

    // 空中回転
    this.rotation = type === 'shoe' ? 0 : -initialAngle;
    this.vrot = angularVelocity * (type === 'shoe' ? 2 : 1.2);

    // ショップアイテム関連の初期化
    this.equippedItems = equippedItems;
    this.maxAltitude = -y; // -y は高度(画面上がy=0のため)
    this.hasDoubleJumped = false;
    this.sliding = false;
    this.needResultTrigger = false;
    this.bounceCount = 0; // バウンド回数の記録

    // 「ジャンプ力アップ」アイテム
    if (type === 'human' && this.equippedItems.includes('jump_up')) {
      this.vy -= 15; // 飛び出し時の初速を上方向に強化
    }

    // 「体重が軽くなる」アイテム
    if (type === 'human' && this.equippedItems.includes('light_weight')) {
      this.gravity *= 0.70; // 飛行中の重力を30%軽減して落ちにくくする
    }

    // 「体重が重くなる」アイテム
    if (type === 'human' && this.equippedItems.includes('heavy_weight')) {
      this.gravity *= 1.60; // 重力を大幅に増やして「重さ」を強調
      this.vy *= 0.40;      // 上方向の勢いをさらに削ぐ
      this.vx *= 2.20;      // 横方向の初速をもっともっと引き上げる
    }

    // 「パラグライダー」のデメリット（装備しているだけで少し重くなる）
    if (type === 'human' && this.equippedItems.includes('paraglider')) {
      this.gravity *= 1.5; // 25%重くする（少し重たいデメリット）
    }
  }

  /**
   * 放物線運動を1フレーム進める
   * @param {boolean} isPushing こぐボタンが押されているかどうか
   */
  update(isPushing = false) {
    if (this.landed && !this.sliding) return;

    if (this.sliding) {
      // 「こおり」「アイスシューズ」「チョロ9」の滑り・転がり処理
      let baseFriction = this.equippedItems.includes('ice_shoes') ? 0.998 : 0.99;
      // 速度が速いほど摩擦を軽減（よく滑るように）する
      // vxが大きくなるほど friction が 1.0 に近づく
      const vFactor = Math.abs(this.vx) * 0.0002;
      const friction = Math.min(0.9999, baseFriction + vFactor);
      this.vx *= friction;
      this.x += this.vx;

      // チョロ9の場合は横滑りするだけでなく、ゴロゴロと回転しながら転がる
      if (this.equippedItems.includes('choro_9')) {
        this.rotation += this.vx * 0.05;
      }

      if (Math.abs(this.vx) < 0.1) {
        this.vx = 0;
        this.sliding = false;
      }
      return;
    }

    // パラグライダー処理
    if (this.type === 'human' && this.equippedItems.includes('paraglider') && isPushing) {
      // 重力を軽減し、落下速度に制限をかける
      this.vy += this.gravity * 0.15;
      // 速度制限を少し緩めて落下を早める（滑空の角度を下げる）
      if (this.vy > 3.2) this.vy *= 0.92;

      // 前進する力(横方向の加速)を少し弱める
      this.vx += 0.12;
      this.vx *= 0.998;

      this.x += this.vx;
      this.y += this.vy;

      // パラグライダーを開いている時は、少し下向きの角度（0.2ラジアン程度）へ近づける
      this.rotation += (0.2 - this.rotation) * 0.1;
      this.vrot *= 0.5; // 回転慣性も殺す
    } else {
      // 通常の放物線運動
      this.vx *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.vrot;
    }

    // 最高高度の記録（「スーパーボール」用）
    if (this.type === 'human') {
      const currentAlt = -this.y;
      if (currentAlt > this.maxAltitude) {
        this.maxAltitude = currentAlt;
      }
    }
  }

  checkLanding(groundY, pivotX) {
    if (!this.landed && this.y > groundY) {
      this.y = groundY;

      // 「スーパーボール」バウンド処理
      // 最大3回までバウンドするように制限
      if (this.type === 'human' && this.equippedItems.includes('super_ball') && this.bounceCount < 3) {
        const dropHeight = this.maxAltitude + groundY;

        // 落下距離からバウンド力を計算。回数(bounceCount)を重ねるごとに係数を減らして高さを小さくする
        const baseFactor = 0.40;
        const decay = Math.pow(0.75, this.bounceCount);
        let bounceVy = -Math.sqrt(Math.max(0, dropHeight)) * baseFactor * decay;

        if (this.equippedItems.includes('jump_up')) {
          bounceVy *= 1.35; // ジャンプ力アップでも跳ねる
        }

        // 一定以上のバウンド力があれば跳ね続ける
        if (bounceVy < -1.5) {
          this.bounceCount++;
          this.vy = bounceVy;
          this.vx *= 0.92; // 横方向の勢いはあまり殺さず前進させる
          this.y = groundY - 1; // 地面に埋まらないように上げる
          this.maxAltitude = -this.y; // 新しい頂点計測用
          // 回転も再生成
          this.vrot += (Math.random() - 0.5) * 0.2;
          return false;
        }
      }

      this.landed = true;

      // 「チョロ9」着地時の爆発ダッシュ処理
      if (this.type === 'human' && this.equippedItems.includes('choro_9') && this.vx < 0) {
        // マイナス方向への着地速度を反転してさらに強力に加速（2倍→4倍）
        this.vx = Math.abs(this.vx) * 4.0;

        // もし支点(pivotX)より左に着地していれば、引っ張った距離(チョロQ効果)としてさらに加速ボーナス
        if (this.x < pivotX) {
          const pullbackDist = pivotX - this.x;
          this.vx += pullbackDist * 0.07; // 引っ張った距離に応じて猛ダッシュ（0.03→0.07）
        }

        this.sliding = true;
        this.needResultTrigger = true;
        return false; // ダッシュ中はまだリザルトに行かない
      }

      // 「こおり」着地後の滑り処理
      if (this.type === 'human' && this.equippedItems.includes('ice') && Math.abs(this.vx) > 1.0) {
        // 「アイスシューズ」ペナルティ：落下速度が速すぎると着地失敗（制限を少し緩和 14->16, 0.3->0.5）
        if (this.equippedItems.includes('ice_shoes') && this.vy > 16) {
          this.vx *= 0.5; // ズザザッと減速
        }

        this.sliding = true;
        this.needResultTrigger = true;
        return false; // まだゲームは終わらない
      }

      this.dist = (this.x - pivotX) * PHYSICS_CONFIG.meterScale;
      return true; // RESULTへ移行
    }

    // 滑った後に止まった場合
    if (this.landed && !this.sliding && this.needResultTrigger) {
      this.needResultTrigger = false;
      this.dist = (this.x - pivotX) * PHYSICS_CONFIG.meterScale;
      return true; // ここでRESULTへ移行
    }

    return false;
  }
}
