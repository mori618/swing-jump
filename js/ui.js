/**
 * ui.js — UI表示
 * スコア・距離・コイン・結果画面などのUI要素を管理する
 */

'use strict';

/**
 * ゲームUIの描画と管理を担当するクラス
 */
class GameUI {
  /**
   * @param {SaveManager} saveManager セーブマネージャーのインスタンス
   */
  constructor(saveManager) {
    this.save = saveManager;

    this.currentDistance = 0;
    this.powerLevel = 0;     // 現在の振り子勢い（0〜1）
    this.showResult = false; // 結果画面表示フラグ
    this.resultDistance = 0; // 最終結果距離
    this.earnedCoins = 0;    // 今回の獲得コイン数
    this.isNewRecord = false;
    this.bonusApplied = false;

    // 結果アニメーション用
    this.resultAlpha = 0;

    // パワーゲージのアニメーション値
    this.displayPower = 0;

    // コイン加算アニメーション（HUD用）
    this.displayCoins = this.save.coins; // 表示上のコイン数（アニメーションで増える）
    this.coinAnimTimer = 0; // 0より大きいとき加算中

    // ガイドタイマー
    this.guideTimer = 0;
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
   * 結果を表示する（SaveManagerに記録させてから表示）
   * @param {number} dist 飛行距離（メートル）
   * @param {string} launchType 飛ばしたもの（'human' or 'shoe'）
   */
  showResultScreen(dist, launchType) {
    this.resultDistance = dist;
    this.showResultType = launchType;
    this.showResult = true;
    this.resultAlpha = 0;

    // セーブ＆コイン計算
    const result = this.save.recordResult(dist);
    this.earnedCoins = result.earned;
    this.isNewRecord = result.isNewRecord;
    this.bonusApplied = result.bonusApplied;

    // コインHUDのアニメーション開始
    this.coinAnimTimer = 2.5; // 2.5秒かけて増やす
  }

  /** 結果を非表示にする */
  hideResult() {
    this.showResult = false;
  }

  /**
   * すべてのUIを描画する
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} canvasWidth
   * @param {number} canvasHeight
   * @param {string} state ゲームステート ('SWINGING' | 'FLYING' | 'RESULT')
   * @param {number} dt タイムステップ（秒）
   */
  draw(ctx, canvasWidth, canvasHeight, state, dt = 0.016) {
    // パワーゲージのアニメーション
    this.displayPower += (this.powerLevel - this.displayPower) * 0.1;

    // コインHUDのアニメーション更新
    const targetCoins = this.save.coins;
    if (this.coinAnimTimer > 0) {
      this.coinAnimTimer -= dt;
      // displayCoins を目標値に向けて増やす
      const speed = this.earnedCoins / 2.5; // 2.5秒で全部増える
      this.displayCoins = Math.min(targetCoins, this.displayCoins + speed * dt);
    } else {
      this.displayCoins = targetCoins;
    }

    // ===== パワーゲージ =====
    this._drawPowerGauge(ctx, canvasWidth);

    // ===== HUD（左: BEST距離 / 右: コイン） =====
    this._drawHUD(ctx, canvasWidth);

    // ===== 飛行中の距離リアルタイム表示 =====
    if (state === 'FLYING') {
      this._drawFlyingDistance(ctx, canvasWidth, canvasHeight);
    }

    // ===== 結果画面 =====
    if (this.showResult) {
      this._drawResultScreen(ctx, canvasWidth, canvasHeight);
    }

    // ===== 操作ガイド =====
    if (state === 'SWINGING' && this.guideTimer > 0) {
      this._drawGuide(ctx, canvasWidth, canvasHeight, dt);
    }
  }

  // ===== パワーゲージ描画 =====
  _drawPowerGauge(ctx, W) {
    const gaugeX = 16, gaugeY = 16, gaugeW = W - 32, gaugeH = 18;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 9);
    ctx.fill();

    if (this.displayPower > 0.01) {
      const gradient = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
      gradient.addColorStop(0, '#00E5FF');
      gradient.addColorStop(0.6, '#00C853');
      gradient.addColorStop(1, '#FF6D00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(gaugeX, gaugeY, gaugeW * this.displayPower, gaugeH, 9);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 9);
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(TEXTS.UI_POWER, W / 2, gaugeY + 13);
    ctx.restore();
  }

  // ===== HUD（BEST距離 + コイン）描画 =====
  _drawHUD(ctx, W) {
    ctx.save();

    // --- 左: BEST 距離 ---
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(12, 44, 130, 38, 10);
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(TEXTS.UI_BEST, 22, 58);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 17px "Nunito", sans-serif';
    ctx.fillText(`${this.save.bestDistance.toFixed(1)} ${TEXTS.UI_M}`, 22, 76);

    // --- 右: コイン ---
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(W - 142, 44, 130, 38, 10);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(TEXTS.UI_COINS, W - 22, 58);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 17px "Nunito", sans-serif';
    ctx.fillText(Math.floor(this.displayCoins).toLocaleString(), W - 22, 76);

    ctx.restore();
  }

  // ===== 飛行中リアルタイム距離 =====
  _drawFlyingDistance(ctx, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 70, H - 80, 140, 50, 10);
    ctx.fill();
    ctx.fillStyle = '#00E5FF';
    ctx.font = 'bold 11px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TEXTS.UI_FLIGHT_DIST, W / 2, H - 58);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px "Nunito", sans-serif';
    ctx.fillText(`${this.currentDistance.toFixed(1)} ${TEXTS.UI_M}`, W / 2, H - 40);
    ctx.restore();
  }

  // ===== 結果画面 =====
  _drawResultScreen(ctx, W, H) {
    this.resultAlpha = Math.min(1, this.resultAlpha + 0.04);
    ctx.save();
    ctx.globalAlpha = this.resultAlpha;

    // オーバーレイ
    ctx.fillStyle = 'rgba(0,0,30,0.78)';
    ctx.fillRect(0, 0, W, H);

    // カード（距離に応じてコイン行を入れるため高さを拡張）
    const cardW = Math.min(310, W - 40);
    const cardX = (W - cardW) / 2;
    const cardY = H / 2 - 145;
    const cardH = 280;

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // ランクメッセージの決定
    const dist = this.resultDistance;
    let rankMsg;
    let titleTxt = TEXTS.RESULT_TITLE_HUMAN;

    if (this.showResultType === 'human') {
      if (dist < 0)        rankMsg = TEXTS.RANK_H_BACKWARD;
      else if (dist > 300) rankMsg = TEXTS.RANK_H_LEGEND;
      else if (dist > 150) rankMsg = TEXTS.RANK_H_MASTER;
      else if (dist > 60)  rankMsg = TEXTS.RANK_H_GOOD;
      else                 rankMsg = TEXTS.RANK_H_POOR;
    } else {
      titleTxt = TEXTS.RESULT_TITLE_SHOE;
      if (dist < 0)        rankMsg = TEXTS.RANK_S_BACKWARD;
      else if (dist > 300) rankMsg = TEXTS.RANK_S_LEGEND;
      else if (dist > 150) rankMsg = TEXTS.RANK_S_MASTER;
      else if (dist > 60)  rankMsg = TEXTS.RANK_S_GOOD;
      else                 rankMsg = TEXTS.RANK_S_POOR;
    }

    // タイトル
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(titleTxt, W / 2, cardY + 42);

    // 距離
    ctx.fillStyle = 'white';
    ctx.font = 'bold 54px "Nunito", sans-serif';
    ctx.fillText(`${dist.toFixed(1)}`, W / 2, cardY + 108);
    ctx.font = 'bold 18px "Nunito", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(TEXTS.UI_METER, W / 2, cardY + 130);

    ctx.fillStyle = this.isNewRecord ? '#FF6D00' : 'rgba(255,255,255,0.75)';
    ctx.font = this.isNewRecord ? 'bold 16px "Nunito", sans-serif' : '14px "Nunito", sans-serif';
    ctx.fillText(this.isNewRecord ? TEXTS.RESULT_NEW_RECORD + rankMsg : rankMsg, W / 2, cardY + 158);

    // コイン獲得表示（仕切り線）
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + 20, cardY + 172);
    ctx.lineTo(cardX + cardW - 20, cardY + 172);
    ctx.stroke();

    // 獲得コイン内訳
    const baseCoins = calcCoins(this.resultDistance);
    const bonusCoins = this.bonusApplied ? 20 : 0;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Nunito", sans-serif';
    ctx.fillText(TEXTS.RESULT_EARNED_COINS, W / 2, cardY + 195);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px "Nunito", sans-serif';
    ctx.fillText(`+${this.earnedCoins}`, W / 2, cardY + 230);

    if (this.bonusApplied) {
      ctx.fillStyle = '#FF6D00';
      ctx.font = '12px "Nunito", sans-serif';
      ctx.fillText(TEXTS.RESULT_BONUS_TEXT(baseCoins, bonusCoins), W / 2, cardY + 248);
    }

    // 合計コイン
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px "Nunito", sans-serif';
    ctx.fillText(TEXTS.RESULT_TOTAL_COINS(this.save.coins.toLocaleString()), W / 2, cardY + 265);

    // リトライ
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '13px "Nunito", sans-serif';
    ctx.fillText(TEXTS.RESULT_RETRY, W / 2, cardY + 283);

    ctx.restore();
  }

  // ===== 操作ガイド =====
  _drawGuide(ctx, W, H, dt) {
    this.guideTimer -= dt;
    const alpha = Math.min(1, this.guideTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 110, H / 2 + 60, 220, 50, 10);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'white';
    ctx.font = '13px "Nunito", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(TEXTS.GUIDE_LINE1, W / 2, H / 2 + 82);
    ctx.fillText(TEXTS.GUIDE_LINE2, W / 2, H / 2 + 100);
    ctx.restore();
  }

  /** ガイド表示タイマーをリセットする */
  resetGuide() {
    this.guideTimer = 4.0;
  }
}
