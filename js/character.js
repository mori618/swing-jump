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
   * @param {boolean} hasShoe 靴を履いているか
   */
  drawOnSwing(seatX, seatY, angle, pivotX, pivotY, hasShoe = true) {
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
    // 表情なし

    // -- 腕（左右に広げる） --
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    // 左腕（ロープをつかんでいる）
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-28, -18);
    ctx.stroke();
    // 右腕（ロープをつかんでいる）
    ctx.beginPath();
    ctx.moveTo(10, -30);
    ctx.lineTo(28, -18);
    ctx.stroke();

    // -- 脚（参考コード仕様: 膝関節あり） --
    const kneeDx = 14;
    const kneeDy = 8;
    const footDx = this.legExtended ? 38 : 6;
    const footDy = this.legExtended ? 2 : 30;
    const shoeAngle = this.legExtended ? -0.2 : 0;

    ctx.strokeStyle = '#2E5EA8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    // 左脚
    ctx.beginPath();
    ctx.moveTo(-6, -12); // 股関節
    ctx.lineTo(-6 + kneeDx, -12 + kneeDy); // 膝
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6 + kneeDx, -12 + kneeDy);
    ctx.lineTo(-6 + footDx, -12 + footDy); // 足首
    ctx.stroke();

    // 右脚
    ctx.beginPath();
    ctx.moveTo(6, -12); // 股関節
    ctx.lineTo(6 + kneeDx, -12 + kneeDy); // 膝
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 + kneeDx, -12 + kneeDy);
    ctx.lineTo(6 + footDx, -12 + footDy); // 足首
    ctx.stroke();

    // 足（靴）
    if (hasShoe) {
      ctx.save();
      ctx.translate(-6 + footDx + 2, -12 + footDy + 2);
      ctx.rotate(shoeAngle);
      this.drawShoe(0, 0, 0, 0.7);
      ctx.restore();

      ctx.save();
      ctx.translate(6 + footDx + 2, -12 + footDy + 2);
      ctx.rotate(shoeAngle);
      this.drawShoe(0, 0, 0, 0.7);
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * 飛行中のキャラクターを描画する（スイング時と同じポーズ・空中回転対応）
   * @param {number} x        X座標
   * @param {number} y        Y座標
   * @param {number} vx       X速度（未使用）
   * @param {number} vy       Y速度（未使用）
   * @param {number} rotation 累積回転角（ラジアン）
   * @param {boolean} hasShoe 靴を履いているか
   */
  drawFlying(x, y, vx, vy, rotation = null, hasShoe = true) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // 累積回転を適用
    if (rotation !== null) {
      ctx.rotate(rotation);
    }

    ctx.scale(1.3, 1.3);

    // -- 体幹 (胴体) -- スイング時と同一
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.roundRect(-10, -40, 20, 28, 5);
    ctx.fill();

    // -- 頭 -- 表情なし
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(0, -50, 13, 0, Math.PI * 2);
    ctx.fill();

    // -- 腕（両腕を上に伸ばしてロープをつかんでいるような姿勢） --
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -30);
    ctx.lineTo(-28, -18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -30);
    ctx.lineTo(28, -18);
    ctx.stroke();

    // -- 脚（飛行中も同じ脚の動き） --
    const kneeDx = 14;
    const kneeDy = 8;
    const footDx = this.legExtended ? 38 : 6;
    const footDy = this.legExtended ? 2 : 30;
    const shoeAngle = this.legExtended ? -0.2 : 0;

    ctx.strokeStyle = '#2E5EA8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';

    // 左脚
    ctx.beginPath();
    ctx.moveTo(-6, -12); // 股関節
    ctx.lineTo(-6 + kneeDx, -12 + kneeDy); // 膝
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6 + kneeDx, -12 + kneeDy);
    ctx.lineTo(-6 + footDx, -12 + footDy); // 足首
    ctx.stroke();

    // 右脚
    ctx.beginPath();
    ctx.moveTo(6, -12); // 股関節
    ctx.lineTo(6 + kneeDx, -12 + kneeDy); // 膝
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6 + kneeDx, -12 + kneeDy);
    ctx.lineTo(6 + footDx, -12 + footDy); // 足首
    ctx.stroke();

    // 足（靴）
    if (hasShoe) {
      ctx.save();
      ctx.translate(-6 + footDx + 2, -12 + footDy + 2);
      ctx.rotate(shoeAngle);
      this.drawShoe(0, 0, 0, 0.7);
      ctx.restore();

      ctx.save();
      ctx.translate(6 + footDx + 2, -12 + footDy + 2);
      ctx.rotate(shoeAngle);
      this.drawShoe(0, 0, 0, 0.7);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 単独の靴を描画する
   */
  drawShoe(x, y, rotation, scale = 1.3) {
    const ctx = this.ctx;
    ctx.save();
    if (x !== 0 || y !== 0) {
      ctx.translate(x, y);
      ctx.rotate(rotation);
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-8, -4, 18, 10, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /**
   * 着地後のキャラクターを描画する（大の字で転がった状態）
   * @param {number} x X座標
   * @param {number} y Y座標
   */
  drawLanded(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // 地面に横たわった状態（π/2回転＝水平）
    ctx.rotate(Math.PI / 2);
    ctx.scale(1.3, 1.3);

    // 胴体
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.roundRect(-14, -10, 28, 20, 5);
    ctx.fill();

    // 頭（表情なし）
    ctx.fillStyle = '#FFDAB9';
    ctx.beginPath();
    ctx.arc(-20, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    // 腕（投げ出した）
    ctx.strokeStyle = '#FFDAB9';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(10, -8);
    ctx.lineTo(30, -20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, 8);
    ctx.lineTo(30, 22);
    ctx.stroke();

    // 脚（投げ出した）
    ctx.strokeStyle = '#2E5EA8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-26, -22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-26, 22);
    ctx.stroke();

    ctx.restore();
  }
}
