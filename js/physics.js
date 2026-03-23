/**
 * physics.js — 物理エンジン
 * 振り子運動（ブランコ）と放物線飛行の計算を担当する
 */

'use strict';

/**
 * 振り子（ブランコ）の物理状態を管理するクラス
 */
class Pendulum {
  /**
   * @param {number} length  基本ロープ長（ピクセル）
   * @param {number} gravity 重力加速度（px/s²）
   */
  constructor(length, gravity) {
    this.baseLength = length;   // 基本ロープ長
    this.length = length;       // 現在の実効ロープ長（脚伸ばしで変化）
    this.gravity = gravity;     // 重力加速度

    this.angle = Math.PI * 0.5; // 初期角度（ラジアン）: 真横 90°
    this.angularVelocity = 0;   // 角速度（rad/s）
    this.damping = 0.999;       // 空気抵抗による減衰係数

    // 脚伸ばし関連
    this.legExtended = false;   // 脚を伸ばしているか
    this.legLength = 30;        // 脚の長さ（描画用）
    this.extendedLegLength = 55; // 伸ばした脚の長さ（描画用）
  }

  /**
   * Runge-Kutta 4次法で物理を1ステップ進める
   * @param {number} dt  タイムステップ（秒）
   */
  update(dt) {
    // 脚の伸ばしによるエネルギーポンピング（実効ロープ長の変化）
    // 振り子が最下点付近かつ脚を伸ばすと有効長が増加 → その後縮めると位置エネルギー増加
    const targetLength = this.legExtended
      ? this.baseLength + 40  // 脚を伸ばすと重心が下がりロープ実効長増加
      : this.baseLength;

    // 実効長を滑らかに変化させる
    this.length += (targetLength - this.length) * 0.15;

    // RK4 で角度・角速度を更新
    const g = this.gravity;
    const L = this.length;

    const f = (angle, angVel) => -(g / L) * Math.sin(angle);

    const k1_v = f(this.angle, this.angularVelocity);
    const k1_a = this.angularVelocity;

    const k2_v = f(this.angle + k1_a * dt / 2, this.angularVelocity + k1_v * dt / 2);
    const k2_a = this.angularVelocity + k1_v * dt / 2;

    const k3_v = f(this.angle + k2_a * dt / 2, this.angularVelocity + k2_v * dt / 2);
    const k3_a = this.angularVelocity + k2_v * dt / 2;

    const k4_v = f(this.angle + k3_a * dt, this.angularVelocity + k3_v * dt);
    const k4_a = this.angularVelocity + k3_v * dt;

    this.angularVelocity += (dt / 6) * (k1_v + 2 * k2_v + 2 * k3_v + k4_v);
    this.angle += (dt / 6) * (k1_a + 2 * k2_a + 2 * k3_a + k4_a);

    // 減衰（空気抵抗）
    this.angularVelocity *= this.damping;
  }

  /**
   * 支点座標をもとに、ブランコ座席（キャラクター位置）のXY座標を返す
   * @param {number} pivotX 支点X
   * @param {number} pivotY 支点Y
   * @returns {{x: number, y: number}}
   */
  getSeatPosition(pivotX, pivotY) {
    return {
      x: pivotX + this.length * Math.sin(this.angle),
      y: pivotY + this.length * Math.cos(this.angle),
    };
  }

  /**
   * 現在の速度ベクトル（飛行開始時の初速）を取得する
   * @param {number} pivotX 支点X
   * @param {number} pivotY 支点Y
   * @returns {{vx: number, vy: number}}
   */
  getVelocity(pivotX, pivotY) {
    // 座席は円弧上を動く → 速度は接線方向
    // 接線方向 = (-cos(θ), sin(θ)) に角速度×長さ をかける
    const speed = this.angularVelocity * this.length;
    return {
      vx: speed * (-Math.cos(this.angle)),  // X成分
      vy: speed * Math.sin(this.angle),     // Y成分（上方向が負）
    };
  }
}

/**
 * キャラクターが飛んでいるときの放物線物理状態を管理するクラス
 */
class Projectile {
  /**
   * @param {number} x  初期X座標
   * @param {number} y  初期Y座標
   * @param {number} vx 初速X成分
   * @param {number} vy 初速Y成分（上向き負）
   * @param {number} gravity 重力加速度（px/s²）
   */
  constructor(x, y, vx, vy, gravity) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.gravity = gravity;
    this.startX = x;  // 飛び出し開始X（距離計算用）
  }

  /**
   * 放物線運動を1ステップ進める
   * @param {number} dt タイムステップ（秒）
   */
  update(dt) {
    this.vy += this.gravity * dt; // 重力加速
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  /**
   * 地面に着地したか判定する
   * @param {number} groundY 地面のY座標
   * @returns {boolean}
   */
  hasLanded(groundY) {
    return this.y >= groundY;
  }

  /**
   * 開始位置からの飛行距離（メートル換算）を返す
   * @param {number} pixelsPerMeter 1mあたりのピクセル数
   * @returns {number}
   */
  getDistance(pixelsPerMeter) {
    return Math.max(0, (this.x - this.startX) / pixelsPerMeter);
  }
}
