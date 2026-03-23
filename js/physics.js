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

  /**
   * 物理を1フレーム進める（参考コードはフレームベース駆動）
   */
  update() {
    let angularAcceleration = -(PHYSICS_CONFIG.gravity / this.length) * Math.sin(this.angle);
    this.angularVelocity += angularAcceleration;
    this.angularVelocity *= PHYSICS_CONFIG.friction;
    this.angle += this.angularVelocity;
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
