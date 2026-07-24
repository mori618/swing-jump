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

    // 表情（目と口）の追加
    const headCX = -8 * s;
    const headCY = -62 * s;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';

    if (this.legExtended) {
      // 踏ん張り顔 ( > < )
      // 左目 >
      ctx.beginPath();
      ctx.moveTo(headCX - 7 * s, headCY - 4 * s);
      ctx.lineTo(headCX - 3 * s, headCY - 2 * s);
      ctx.lineTo(headCX - 7 * s, headCY);
      ctx.stroke();
      // 右目 <
      ctx.beginPath();
      ctx.moveTo(headCX - 1 * s, headCY - 4 * s);
      ctx.lineTo(headCX - 5 * s, headCY - 2 * s);
      ctx.lineTo(headCX - 1 * s, headCY);
      ctx.stroke();
      // 口（への字）
      ctx.beginPath();
      ctx.moveTo(headCX - 6 * s, headCY + 6 * s);
      ctx.lineTo(headCX - 4 * s, headCY + 4 * s);
      ctx.lineTo(headCX - 2 * s, headCY + 6 * s);
      ctx.stroke();
    } else {
      // 通常顔 (・ ・) または驚き顔 (o o)
      const isExtremeAngle = Math.abs(angle) > 1.0;
      if (isExtremeAngle) {
        // 驚き目 (O O)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(headCX - 6 * s, headCY - 2 * s, 2 * s, 0, Math.PI * 2);
        ctx.arc(headCX - 1 * s, headCY - 2 * s, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        // 口（あ口）
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.arc(headCX - 3.5 * s, headCY + 4 * s, 2.5 * s, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 普通の目 (・ ・)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(headCX - 6 * s, headCY - 2 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.arc(headCX - 1.5 * s, headCY - 2 * s, 1.5 * s, 0, Math.PI * 2);
        ctx.fill();
        // 口（微笑み）
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.arc(headCX - 3.5 * s, headCY + 1 * s, 3 * s, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
      }
    }

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
  drawFlying(x, y, vx, vy, rotation, hasShoe, armLength, isParagliding = false, faceType = 'flying') {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const s = armLength / 200;

    // パラグライダーの描画
    if (isParagliding) {
      // 1. キャノピー（傘）を少し上に描く
      ctx.save();
      ctx.translate(0, -50 * s);
      ctx.fillStyle = '#f59e0b'; // オレンジ色
      ctx.beginPath();
      // 楕円を上半分描画
      ctx.ellipse(0, 0, 45 * s, 15 * s, 0, Math.PI, 0, true);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      
      // 傘のストライプ
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2 * s;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10 * s, -10 * s);
        ctx.quadraticCurveTo(i * 8 * s, 0, i * 6 * s, 10 * s);
        ctx.stroke();
      }
      ctx.restore();

      // 2. 吊り索（ライン）
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(-40 * s, -50 * s);
      ctx.lineTo(-10 * s, -15 * s);
      ctx.moveTo(0, -35 * s);
      ctx.lineTo(-10 * s, -15 * s);
      ctx.moveTo(40 * s, -50 * s);
      ctx.lineTo(-10 * s, -15 * s);
      ctx.stroke();

      // 3. ぶら下がっているキャラクター本体
      // 胴体
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 12 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10 * s, -15 * s); 
      ctx.lineTo(-15 * s, 15 * s); 
      ctx.stroke();

      // 頭
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(-18 * s, -28 * s, 10 * s, 0, Math.PI * 2);
      ctx.fill();
      
      // 顔の描画 (笑顔)
      const fCX = -18 * s;
      const fCY = -28 * s;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(fCX - 3 * s, fCY - 1 * s, 1 * s, 0, Math.PI * 2);
      ctx.arc(fCX + 1 * s, fCY - 1 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fCX - 1 * s, fCY + 2 * s, 2 * s, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // 脚（だらんと下がっている）
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 8 * s;
      ctx.beginPath();
      ctx.moveTo(-15 * s, 15 * s);
      ctx.lineTo(-5 * s, 35 * s);
      ctx.stroke();

      // 腕（吊り索を掴んでいる）
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, -10 * s);
      ctx.lineTo(-10 * s, -15 * s);
      ctx.stroke();
    } else {
      // 通常飛行ポーズ
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

      // 表情描画
      const headCX = -45 * s;
      const headCY = -20 * s;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2 * s;
      ctx.lineCap = 'round';

      if (faceType === 'crash') {
        // 気絶顔 (x x)
        // 左目 x
        ctx.beginPath();
        ctx.moveTo(headCX - 6 * s, headCY - 4 * s);
        ctx.lineTo(headCX - 2 * s, headCY);
        ctx.moveTo(headCX - 2 * s, headCY - 4 * s);
        ctx.lineTo(headCX - 6 * s, headCY);
        ctx.stroke();
        // 右目 x
        ctx.beginPath();
        ctx.moveTo(headCX + 1 * s, headCY - 4 * s);
        ctx.lineTo(headCX + 5 * s, headCY);
        ctx.moveTo(headCX + 5 * s, headCY - 4 * s);
        ctx.lineTo(headCX + 1 * s, headCY);
        ctx.stroke();
        // 口 (波線)
        ctx.beginPath();
        ctx.moveTo(headCX - 5 * s, headCY + 5 * s);
        ctx.lineTo(headCX - 3 * s, headCY + 3 * s);
        ctx.lineTo(headCX - 1 * s, headCY + 5 * s);
        ctx.stroke();
      } else if (faceType === 'success') {
        // 大喜び ( * ^ _ ^ * )
        // 左目 (アーチ)
        ctx.beginPath();
        ctx.arc(headCX - 5 * s, headCY - 1 * s, 2 * s, Math.PI, 0);
        ctx.stroke();
        // 右目 (アーチ)
        ctx.beginPath();
        ctx.arc(headCX + 1 * s, headCY - 1 * s, 2 * s, Math.PI, 0);
        ctx.stroke();
        // 口 (大笑い)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(headCX - 2 * s, headCY + 4 * s, 4 * s, 0, Math.PI);
        ctx.fill();
      } else {
        // 通常飛行中: 上昇中は笑顔、落下中は焦り顔
        const isFalling = vy > 2.0;
        if (isFalling) {
          // 焦り顔 (・_・;)
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(headCX - 6 * s, headCY - 2 * s, 1.5 * s, 0, Math.PI * 2);
          ctx.arc(headCX - 1 * s, headCY - 2 * s, 1.5 * s, 0, Math.PI * 2);
          ctx.fill();
          // 口 (横棒)
          ctx.beginPath();
          ctx.moveTo(headCX - 6 * s, headCY + 4 * s);
          ctx.lineTo(headCX - 1 * s, headCY + 4 * s);
          ctx.stroke();
          // 汗マーク
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.moveTo(headCX - 13 * s, headCY - 8 * s);
          ctx.lineTo(headCX - 11 * s, headCY - 2 * s);
          ctx.stroke();
        } else {
          // 笑顔 (^ ^)
          ctx.beginPath();
          ctx.arc(headCX - 5 * s, headCY - 1 * s, 2 * s, Math.PI, 0);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(headCX + 1 * s, headCY - 1 * s, 2 * s, Math.PI, 0);
          ctx.stroke();
          // 口 (微笑み)
          ctx.beginPath();
          ctx.arc(headCX - 2 * s, headCY + 2 * s, 3 * s, 0.1 * Math.PI, 0.9 * Math.PI);
          ctx.stroke();
        }
      }

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
    }

    ctx.restore();
  }

  /**
   * 着地後のキャラクター
   */
  drawLanded(x, y, rotation, armLength, isCrash = false) {
    this.drawFlying(x, y, 0, 0, rotation, false, armLength, false, isCrash ? 'crash' : 'success');
  }

  /**
   * 大砲（バレル）を描画する
   */
  drawBarrel(pivotX, pivotY, angle, armLength) {
    const ctx = this.ctx;
    const s = armLength / 200;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(angle);

    // 砲身（筒）の描画
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.roundRect(0, -18 * s, 56 * s, 36 * s, 6 * s);
    ctx.fill();
    ctx.stroke();

    // 砲身の金属バンド（装飾）
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(15 * s, -19 * s, 6 * s, 38 * s);
    ctx.fillRect(35 * s, -19 * s, 6 * s, 38 * s);

    // 砲口の内部（黒）
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(48 * s, -15 * s, 8 * s, 30 * s);

    ctx.restore();

    // 砲台の土台（半円）
    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 22 * s, 0, Math.PI, true);
    ctx.fill();

    // 回転軸（ボルト）
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(0, 0, 8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
