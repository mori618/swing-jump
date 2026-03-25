/**
 * texts.js — 表示テキストの定義
 * ゲーム内で表示されるすべての文字列をここで管理します。
 */

const TEXTS = {
  // HTML表示テキスト
  HTML_TITLE: 'ブランコ 飛距離チャレンジ',
  HTML_LOADING_TITLE: 'ブランコ！',
  HTML_LOADING_TEXT: 'Loading...',
  HTML_BTN_PUMP: 'こぐ！',
  HTML_BTN_LAUNCH: 'とぶ！',
  HTML_WARNING: '! 非常に危険ですので、実際のブランコでは絶対に真似をしないでください。',

  // UI基本
  UI_POWER: 'POWER',
  UI_BEST: 'BEST',
  UI_COINS: 'COINS',
  UI_FLIGHT_DIST: '飛行距離',
  UI_METER: 'メートル',
  UI_M: 'm',

  // ガイド
  GUIDE_LINE1: 'リズムよくこいで、',
  GUIDE_LINE2: 'タイミングよく「とぶ！」',

  // ゲーム内マーカー・ガイド
  GAME_MARKER: '',
  GAME_PUSH: 'PUSH',
  GAME_RELEASE: 'RELEASE',

  // 結果画面：タイトル
  RESULT_TITLE_HUMAN: '着地成功！',
  RESULT_TITLE_SHOE: 'くつ着地！',

  // 結果画面：人間飛びメッセージ
  RANK_H_BACKWARD: '逆噴射！？',
  RANK_H_LEGEND: '伝説の鳥人！星になった...！',
  RANK_H_MASTER: '大空の覇者！素晴らしいジャンプ！',
  RANK_H_GOOD: 'ナイスジャンプ！',
  RANK_H_POOR: 'もっとスイングを極めて高く飛ぼう！',

  // 結果画面：靴とばしメッセージ
  RANK_S_BACKWARD: 'あれっ、逆向きだ！',
  RANK_S_LEGEND: '空の果てまで到達！大気圏突破！',
  RANK_S_MASTER: '超人的な跳躍だ！',
  RANK_S_GOOD: 'お見事！いいキックだ！',
  RANK_S_POOR: 'もっと加速してから飛ぼう！',

  // 結果画面：その他項目
  RESULT_NEW_RECORD: '新記録！ ',
  RESULT_EARNED_COINS: '獲得コイン',
  RESULT_BONUS_TEXT: (base, bonus) => `(基礎 +${base}  新記録ボーナス +${bonus})`,
  RESULT_TOTAL_COINS: (coins) => `合計: ${coins} コイン`,
  RESULT_RETRY: 'タップしてもう一度'
};
