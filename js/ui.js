/**
 * ui.js — UI表示
 * スコア・距離・インジケーションなどのUI要素を管理する
 */

'use strict';

/**
 * ゲームUIの描画と管理を担当するクラス
 */
class GameUI {
  constructor() {
    // ベストスコアをlocalStorageから読み込む
    this.bestDistance = parseFloat(localStorage.getItem('swingBestDistance') || '0');
    this.currentDistance = 0;
    this.powerLevel = 0;       // 現在の振り子勢い（0〜1）
    this.showResult = false;   // 結果画面表示フラグ
    this.resultDistance = 0;   // 最終結果距離

    // 結果アニメーション用
    this.resultAlpha = 0;
    this.isNewRecord = false;

    // パワーゲージのアニメーション値
    this.displayPower = 0;
  }

  /**
   * 飛行距離を更新する
   * @param {number} dist メートル
   */
  setDistance(dist) {
    this.currentDistance = dist;
  }

  /**
   * 振り子の勢い（パワーレベル 0〜1）を設定する
   * @param {number} power
   */
  setPower(power) {
    this.powerLevel = Math.min(1, Math.abs(power));
  }

  /**
   * 結果を表示する
   * @param {number} dist 飛行距離（メートル）
   */
  showResultScreen(dist) {
    this.resultDistance = dist;
    this.showResult = true;
    this.resultAlpha = 0;
    this.isNewRecord = dist > this.bestDistance;
    if (this.isNewRecord) {
      this.bestDistance = dist;
      localStorage.setItem('swingBestDistance', dist.toFixed(2));
    }
  }

  /** 結果を非表示にする */
  hideResult() {
    this.showResult = false;
  }

  /**
   * Canvasの上部オーバーレイUI（パワーゲージ・スコア）を描画する
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {string} state ゲームステート
   */
  draw(ctx, canvasWidth, canvasHeight, state) {
    // パワーゲージのアニメーション
    this.displayPower += (this.powerLevel - this.displayPower) * 0.1;

    // === パワーゲージ ===
    const gaugeX = 16;
    const gaugeY = 16;
    const gaugeW = canvasWidth - 32;
    const gaugeH = 18;

    // 背景
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 9);
    ctx.fill();

    // バー（グラデーション）
    const gradient = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
    gradient.addColorStop(0, '#00E5FF');
    gradient.addColorStop(0.6, '#00C853');
    gradient.addColorStop(1, '#FF6D00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, gaugeW * this.displayPower, gaugeH, 9);
    ctx.fill();

    // 枠線
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 9);
    ctx.stroke();

    // ラベル
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText('POWER', canvasWidth / 2, gaugeY + 13);
    ctx.restore();

    // === ベストスコア ===
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(12, 44, 140, 34, 8);
    ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText('🏆 BEST', 22, 58);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px "Nunito", sans-serif';
    ctx.fillText(`${this.bestDistance.toFixed(1)} m`, 22, 73);
    ctx.restore();

    // === 飛行中の距離リアルタイム表示 ===
    if (state === 'FLYING') {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(canvasWidth / 2 - 70, canvasHeight - 80, 140, 50, 10);
      ctx.fill();
      ctx.fillStyle = '#00E5FF';
      ctx.font = 'bold 11px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('飛行距離', canvasWidth / 2, canvasHeight - 58);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 22px "Nunito", sans-serif';
      ctx.fillText(`${this.currentDistance.toFixed(1)} m`, canvasWidth / 2, canvasHeight - 40);
      ctx.restore();
    }

    // === 結果画面 ===
    if (this.showResult) {
      this.resultAlpha = Math.min(1, this.resultAlpha + 0.04);
      ctx.save();
      ctx.globalAlpha = this.resultAlpha;

      // 半透明オーバーレイ
      ctx.fillStyle = 'rgba(0,0,30,0.75)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // カード
      const cardW = Math.min(300, canvasWidth - 40);
      const cardX = (canvasWidth - cardW) / 2;
      const cardY = canvasHeight / 2 - 120;

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, 230, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // タイトル
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 22px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 結果発表 🎉', canvasWidth / 2, cardY + 42);

      // 距離
      ctx.fillStyle = 'white';
      ctx.font = 'bold 52px "Nunito", sans-serif';
      ctx.fillText(`${this.resultDistance.toFixed(1)}`, canvasWidth / 2, cardY + 110);
      ctx.font = 'bold 20px "Nunito", sans-serif';
      ctx.fillText('メートル', canvasWidth / 2, cardY + 135);

      // 新記録
      if (this.isNewRecord) {
        ctx.fillStyle = '#FF6D00';
        ctx.font = 'bold 18px "Nunito", sans-serif';
        ctx.fillText('🌟 新記録！', canvasWidth / 2, cardY + 162);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '14px "Nunito", sans-serif';
        ctx.fillText(`ベスト: ${this.bestDistance.toFixed(1)} m`, canvasWidth / 2, cardY + 162);
      }

      // もう一度ボタンの説明
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '13px "Nunito", sans-serif';
      ctx.fillText('タップしてもう一度', canvasWidth / 2, cardY + 200);

      ctx.restore();
    }

    // === ブランコ中の操作ガイド（最初の2秒程度） ===
    if (state === 'SWINGING' && this.guideTimer > 0) {
      this.guideTimer -= 0.016;
      const alpha = Math.min(1, this.guideTimer / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.roundRect(canvasWidth / 2 - 110, canvasHeight / 2 + 60, 220, 50, 10);
      ctx.fill();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'white';
      ctx.font = '13px "Nunito", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👇 脚を伸ばしてパワー', canvasWidth / 2, canvasHeight / 2 + 82);
      ctx.fillText('を溜めよう！', canvasWidth / 2, canvasHeight / 2 + 100);
      ctx.restore();
    }
  }

  /** ガイド表示タイマーをリセットする */
  resetGuide() {
    this.guideTimer = 4.0;
  }
}
