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
    this.legExtended = false;  // 脚を伸ばしているか (isPushing)
    this.flyPose = false;      // 飛行ポーズか
  }

  /**
   * ブランコ状態のキャラクターを描画する（座席含む）
   * @param {number} seatX  座席X座標
   * @param {number} seatY  座席Y座標
   * @param {number} angle  振り子の角度（ラジアン）
   * @param {number} pivotX 支点X
   * @param {number} pivotY 支点Y
   * @param {boolean} hasShoe 靴を履いているか
   * @param {number} armLength ブランコアームの長さ
   */
  drawOnSwing(seatX, seatY, angle, pivotX, pivotY, hasShoe, armLength) {
    const ctx = this.ctx;
    ctx.save();
    
    // スケール計算（参考コードは armLength / 200 が基準）
    const s = armLength / 200;
    
    // 回転の基点は座席位置（seatX, seatY）
    ctx.translate(seatX, seatY);
    // 参考コードでは -angle
    ctx.rotate(-angle); 

    // 板（座席）
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-22 * s, 0, 44 * s, 8 * s);

    // 胴体
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0); 
    ctx.lineTo(-5 * s, -45 * s); 
    ctx.stroke();

    // 頭
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(-8 * s, -62 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();

    // 脚
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10 * s;
    const kneeX = 22 * s;
    const kneeY = 4 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    // 脚を伸ばす（isPushing）かどうかに応じて足首の位置を変える
    const footX = this.legExtended ? 45 * s : 15 * s;
    const footY = this.legExtended ? 2 * s : 25 * s;
    ctx.lineTo(footX, footY);
    ctx.stroke();

    if (hasShoe) {
      ctx.save();
      ctx.translate(footX, footY);
      this.drawShoe(0, 0, 0, s);
      ctx.restore();
    }

    // 腕（ロープを掴む）
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.moveTo(-5 * s, -40 * s); 
    ctx.lineTo(15 * s, -15 * s); 
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 飛行中のキャラクターを描画する
   */
  drawFlying(x, y, vx, vy, rotation, hasShoe, armLength, isParagliding = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const s = armLength / 200;

    // パラグライダーの描画
    if (isParagliding) {
      // 紐の描画
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-10 * s, -110 * s);
      ctx.moveTo(0, 0); ctx.lineTo(50 * s, -70 * s);
      ctx.moveTo(0, 0); ctx.lineTo(-70 * s, -70 * s);
      ctx.stroke();

      // 三角形のパラグライダー（キャノピー）
      ctx.fillStyle = '#f59e0b'; // オレンジ色
      ctx.beginPath();
      ctx.moveTo(-10 * s, -110 * s); // 頂点
      ctx.lineTo(50 * s, -70 * s);   // 前の下
      ctx.lineTo(-70 * s, -70 * s);  // 後ろの下
      ctx.closePath();
      ctx.fill();
    }

    // 胴体
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0); 
    ctx.lineTo(-30 * s, -15 * s); 
    ctx.stroke();

    // 頭
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(-45 * s, -20 * s, 14 * s, 0, Math.PI * 2);
    ctx.fill();

    // 脚
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(35 * s, 5 * s);
    ctx.stroke();

    // 腕
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.moveTo(-15 * s, -5 * s);
    ctx.lineTo(25 * s, -30 * s);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 着地後のキャラクター（参考コードに独自のものがないためFlyingを地面で描画）
   */
  drawLanded(x, y, rotation, armLength) {
    // 飛行中のポーズのまま回転０（地面にべたっとする角度ならMath.PI/2など）で描画
    this.drawFlying(x, y, 0, 0, Math.PI * 0.4, false, armLength);
  }

  /**
   * 単独の靴を描画する
   */
  drawShoe(x, y, rotation, s) {
    const ctx = this.ctx;
    ctx.save();
    if (x !== 0 || y !== 0) {
      ctx.translate(x, y);
      ctx.rotate(rotation);
    }
    ctx.fillStyle = "white";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();

    ctx.roundRect(-8 * s, -4 * s, 18 * s, 10 * s, 4 * s);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
