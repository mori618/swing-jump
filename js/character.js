/**
 * character.js — キャラクター描画
 * Canvasにブランコキャラクターを描画する
 */

'use strict';

/**
 * キャラクターの描画を担当するクラス
 */
class Character {
  /**
   * @param {CanvasRenderingContext2D} ctx Canvas 2Dコンテキスト
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.legExtended = false;  // 脚を伸ばしているか
    this.flyPose = false;      // 飛行ポーズか
  }

  /**
   * ブランコ状態のキャラクターを描画する
   * @param {number} seatX  座席X座標
   * @param {number} seatY  座席Y座標
   * @param {number} angle  振り子の角度（ラジアン）
   * @param {number} pivotX 支点X
   * @param {number} pivotY 支点Y
   */
  drawOnSwing(seatX, seatY, angle, pivotX, pivotY) {
    const ctx = this.ctx;
    ctx.save();

    // ===== ロープを描画 =====
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(seatX, seatY);
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    ctx.stroke();

    // ===== 座席（板）を描画 =====
    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.rotate(angle); // ブランコの傾きに合わせて回転
    ctx.fillStyle = '#6B3A2A';
    ctx.fillRect(-20, -4, 40, 8);
    ctx.restore();

    // ===== キャラクターを描画（座席の上） =====
    ctx.save();
    ctx.translate(seatX, seatY);
    ctx.rotate(angle);
    ctx.scale(1.3, 1.3); // キャラクターサイズを大きくする

    // -- 体幹 (胴体) --
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.roundRect(-10, -40, 20, 28, 5);
    ctx.fill();

    // -- 頭 --
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -50, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E0956A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // -- 目 --
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-4, -51, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -51, 2, 0, Math.PI * 2);
    ctx.fill();

    // -- 笑顔 --
    ctx.beginPath();
    ctx.arc(0, -47, 5, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#E0956A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // -- 腕（左右に広げる） --
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    // 左腕
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-28, -18);
    ctx.stroke();
    // 右腕
    ctx.beginPath();
    ctx.moveTo(10, -30);
    ctx.lineTo(28, -18);
    ctx.stroke();

    // -- 脚（伸ばし状態で前に伸ばす） --
    const legLength = this.legExtended ? 55 : 30;
    const legAngle = this.legExtended ? -0.4 : 0.3; // 伸ばすと前に

    ctx.strokeStyle = '#2E5EA8';
    ctx.lineWidth = 6;
    // 左脚
    ctx.beginPath();
    ctx.moveTo(-6, -12);
    ctx.lineTo(-6 + legLength * Math.sin(legAngle), -12 + legLength * Math.cos(legAngle));
    ctx.stroke();
    // 右脚
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.lineTo(6 + legLength * Math.sin(legAngle), -12 + legLength * Math.cos(legAngle));
    ctx.stroke();

    // 足（靴）
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(
      -6 + legLength * Math.sin(legAngle),
      -12 + legLength * Math.cos(legAngle),
      6, 4, legAngle, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      6 + legLength * Math.sin(legAngle),
      -12 + legLength * Math.cos(legAngle),
      6, 4, legAngle, 0, Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /**
   * 飛行中のキャラクターを描画する
   * @param {number} x  X座標
   * @param {number} y  Y座標
   * @param {number} vx X速度（向き判定用）
   * @param {number} vy Y速度（姿勢傾き用）
   */
  drawFlying(x, y, vx, vy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // 速度方向に体を傾ける
    const tilt = Math.atan2(vy, vx) * 0.4;
    ctx.rotate(tilt);
    ctx.scale(1.3, 1.3); // キャラクターサイズを大きくする

    // -- 胴体 --
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.roundRect(-10, -14, 20, 28, 5);
    ctx.fill();

    // -- 頭 --
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E0956A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // -- 目（興奮した目） --
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-4, -25, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -25, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // -- うれしそうな口 --
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI);
    ctx.fillStyle = '#C0392B';
    ctx.fill();

    // -- 腕（大きく広げる） --
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-35, -20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(35, -20);
    ctx.stroke();

    // -- 脚（大きく広げる） --
    ctx.strokeStyle = '#2E5EA8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, 14);
    ctx.lineTo(-20, 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, 14);
    ctx.lineTo(20, 38);
    ctx.stroke();

    // 足
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(-20, 38, 7, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, 38, 7, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
