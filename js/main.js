/**
 * main.js — エントリーポイント
 * ゲームの初期化・ボタンのイベント登録を行う
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ===== HTMLテキスト初期化 =====
  document.title = TEXTS.HTML_TITLE;
  const loadingH1 = document.querySelector('#loading h1');
  if (loadingH1) loadingH1.textContent = TEXTS.HTML_LOADING_TITLE;
  const loadingP = document.querySelector('#loading p');
  if (loadingP) loadingP.textContent = TEXTS.HTML_LOADING_TEXT;
  const pumpLabel = document.querySelector('#btnPump .btn-label');
  if (pumpLabel) pumpLabel.textContent = TEXTS.HTML_BTN_PUMP;
  const launchLabel = document.querySelector('#btnLaunchHuman .btn-label');
  if (launchLabel) launchLabel.textContent = TEXTS.HTML_BTN_LAUNCH;
  const warningText = document.querySelector('.warning-text');
  if (warningText) warningText.textContent = TEXTS.HTML_WARNING;

  const canvas = document.getElementById('gameCanvas');
  const btnLeg = document.getElementById('btnLeg');
  const btnLaunch = document.getElementById('btnLaunch');

  // ゲームインスタンスを生成する
  let game = new Game(canvas);

  // ショップUI初期化
  let shop = new ShopUI(game.save);

  // ショップ開くボタン
  const btnOpenShop = document.getElementById('btnOpenShop');
  if (btnOpenShop) {
    btnOpenShop.addEventListener('click', () => {
      // ショップを閉じた時にリザルトやHUDを最新のコイン等で更新するために game.ui.draw が呼ばれるが、ここでは特にコールバック処理は不要と想定
      shop.open(() => {
        // 閉じた後の処理が必要であればここに書く
      });
    });
  }

  // ===== ウィンドウリサイズ対応 =====
  window.addEventListener('resize', () => {
    game._resize();
  });

  // レスポンス改善用共通関数
  const preventScl = (e) => e.preventDefault();

  // ===== 「こぐ！」ボタン =====
  const btnPump = document.getElementById('btnPump');
  if (btnPump) {
    const onPumpStart = (e) => {
      e.preventDefault();
      game.startPump();
      btnPump.classList.add('active');
    };
    const onPumpEnd = (e) => {
      e.preventDefault();
      game.stopPump();
      btnPump.classList.remove('active');
    };
    btnPump.addEventListener('touchstart', onPumpStart, { passive: false });
    btnPump.addEventListener('touchend', onPumpEnd, { passive: false });
    btnPump.addEventListener('touchcancel', onPumpEnd, { passive: false });
    btnPump.addEventListener('mousedown', onPumpStart);
    btnPump.addEventListener('mouseup', onPumpEnd);
    btnPump.addEventListener('mouseleave', onPumpEnd);
  }

  // ===== 「とばす！」ボタン（靴） =====
  const btnLaunchShoe = document.getElementById('btnLaunchShoe');
  if (btnLaunchShoe) {
    const onLaunchShoe = (e) => {
      e.preventDefault();
      game.launch('shoe');
      btnLaunchShoe.classList.add('pressed');
      setTimeout(() => btnLaunchShoe.classList.remove('pressed'), 200);
    };
    btnLaunchShoe.addEventListener('touchstart', onLaunchShoe, { passive: false });
    btnLaunchShoe.addEventListener('mousedown', onLaunchShoe);
  }

  // ===== 「とぶ！」ボタン（人間） =====
  const btnLaunchHuman = document.getElementById('btnLaunchHuman');
  if (btnLaunchHuman) {
    const onLaunchHuman = (e) => {
      e.preventDefault();
      game.launch('human');
      btnLaunchHuman.classList.add('pressed');
      setTimeout(() => btnLaunchHuman.classList.remove('pressed'), 200);
    };
    btnLaunchHuman.addEventListener('touchstart', onLaunchHuman, { passive: false });
    btnLaunchHuman.addEventListener('mousedown', onLaunchHuman);
  }

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
