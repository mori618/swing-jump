/**
 * main.js — エントリーポイント
 * ゲームの初期化・ボタンのイベント登録を行う
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const btnLeg = document.getElementById('btnLeg');
  const btnLaunch = document.getElementById('btnLaunch');

  // ゲームインスタンスを生成する
  let game = new Game(canvas);

  // ===== ウィンドウリサイズ対応 =====
  window.addEventListener('resize', () => {
    game._resize();
  });

  // ===== 「脚を伸ばす」ボタン =====
  // タッチデバイス対応（touchstart/touchend でレスポンスよく）
  const onLegStart = (e) => {
    e.preventDefault();
    game.startLegExtend();
    btnLeg.classList.add('active');
  };
  const onLegEnd = (e) => {
    e.preventDefault();
    game.stopLegExtend();
    btnLeg.classList.remove('active');
  };

  btnLeg.addEventListener('touchstart', onLegStart, { passive: false });
  btnLeg.addEventListener('touchend', onLegEnd, { passive: false });
  btnLeg.addEventListener('touchcancel', onLegEnd, { passive: false });
  // PCデバッグ用にマウスイベントも対応
  btnLeg.addEventListener('mousedown', onLegStart);
  btnLeg.addEventListener('mouseup', onLegEnd);
  btnLeg.addEventListener('mouseleave', onLegEnd);

  // ===== 「飛んでいく」ボタン =====
  const onLaunch = (e) => {
    e.preventDefault();
    game.launch();
    btnLaunch.classList.add('pressed');
    setTimeout(() => btnLaunch.classList.remove('pressed'), 200);
  };

  btnLaunch.addEventListener('touchstart', onLaunch, { passive: false });
  btnLaunch.addEventListener('mousedown', onLaunch);

  // ===== 結果画面でタップするとリトライ =====
  canvas.addEventListener('touchstart', (e) => {
    if (game.state === 'RESULT') {
      game.reset();
    }
  }, { passive: true });
  canvas.addEventListener('mousedown', () => {
    if (game.state === 'RESULT') {
      game.reset();
    }
  });
});
