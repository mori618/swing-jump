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
   */
  applyBoost(isPush) {
    const ang = this.getNormalizedAngle();
    const isCCW = this.angularVelocity >= 0;

    const TINY = 0.010;
    const SMALL = 0.018;
    const NORMAL = 0.026;
    const HUGE = 0.045;

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
          this.angularVelocity += impulse;
          this.canPushBoost = false;
        }
      } else {
        if (ang >= -2 * Math.PI / 3 && ang < 0) impulse = -SMALL;
        else if (ang >= 0 && ang < Math.PI / 2) impulse = -NORMAL;
        else if (ang >= Math.PI / 2 && ang < 5 * Math.PI / 6) impulse = -NORMAL * 1.5;
        else if (ang >= 5 * Math.PI / 6 && ang <= Math.PI) impulse = -TINY;
        else impulse = -NORMAL;

        if (this.canReleaseBoost) {
           this.angularVelocity += impulse;
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
          this.angularVelocity += impulse;
          this.canReleaseBoost = false;
        }
      } else {
        if (ang <= -Math.PI / 2 && ang > -5 * Math.PI / 6) impulse = NORMAL * 1.5;
        else if (ang <= -5 * Math.PI / 6 && ang > -Math.PI - 0.01) impulse = TINY;
        else if (ang <= Math.PI && ang > 2 * Math.PI / 3) impulse = NORMAL;
        else if (ang <= 2 * Math.PI / 3 && ang > 0) impulse = SMALL;
        else impulse = NORMAL;

        if (this.canPushBoost) {
          this.angularVelocity += impulse;
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
   */
  constructor(type, x, y, vx, vy, initialAngle, angularVelocity) {
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
  }

  /**
   * 放物線運動を1フレーム進める
   */
  update() {
    if (this.landed) return;
    
    this.vx *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vrot;
  }

  /**
   * 着地判定を行い、着地していれば物理状態を更新する
   * @param {number} groundY 地面のY座標
   * @param {number} pivotX 支点X座標（距離計算用）
   * @returns {boolean} 着地したかどうか（今回初めて着地した場合true）
   */
  checkLanding(groundY, pivotX) {
    if (!this.landed && this.y > groundY) {
      this.y = groundY;
      this.landed = true;
      this.dist = (this.x - pivotX) * PHYSICS_CONFIG.meterScale;
      return true;
    }
    return false;
  }
}
