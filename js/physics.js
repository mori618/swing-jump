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
    const targetLength = this.legExtended
      ? this.baseLength + 40
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
   * 参考コード準拠: vx = cos(θ) * ω * L, vy = -sin(θ) * ω * L - |ω| * boostFactor
   * @param {number} boostFactor 上方向ブースト係数（デフォルト14）
   * @returns {{vx: number, vy: number}}
   */
  getVelocity(boostFactor = 14) {
    const speed = this.angularVelocity * this.length;
    // 接線方向の速度 + 上方向ブースト
    const vx = Math.cos(this.angle) * speed;
    const vy = -Math.sin(this.angle) * speed - Math.abs(this.angularVelocity) * boostFactor;
    return { vx, vy };
  }
}

/**
 * キャラクターが飛んでいるときの放物線物理状態を管理するクラス
 * 参考コードに合わせて回転・空気抵抗フィールドを追加
 */
class Projectile {
  /**
   * @param {number} x  初期X座標
   * @param {number} y  初期Y座標
   * @param {number} vx 初速X成分
   * @param {number} vy 初速Y成分（上向き負）
   * @param {number} gravity 重力加速度（px/s²）
   * @param {number} initialAngle 飛び出し時の振り子角度（回転初期値に使用）
   */
  constructor(x, y, vx, vy, gravity, initialAngle = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.gravity = gravity;
    this.startX = x;  // 飛び出し開始X（距離計算用）

    // 空中回転
    this.rotation = -initialAngle;  // 初期回転（振り子の角度から）
    this.vrot = 0;                  // 回転角速度（rad/s で更新）

    // 空気抵抗（参考コードの friction 相当、dt版）
    this.airFriction = 0.35; // 毎秒の減衰率（exp(-airFriction*dt)を掛ける）
  }

  /**
   * 放物線運動を1ステップ進める
   * @param {number} dt タイムステップ（秒）
   */
  update(dt) {
    // 空気抵抗
    const decay = Math.exp(-this.airFriction * dt);
    this.vx *= decay;

    this.vy += this.gravity * dt; // 重力加速
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 空中回転を更新
    this.rotation += this.vrot * dt;
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
