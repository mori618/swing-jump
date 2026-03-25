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
      if (game.state === 'RESULT') {
        game.reset();
        return;
      }
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
      if (game.state === 'RESULT') {
        game.reset();
        return;
      }
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
      if (game.state === 'RESULT') {
        game.reset();
        return;
      }
      game.launch('human');
      btnLaunchHuman.classList.add('pressed');
      setTimeout(() => btnLaunchHuman.classList.remove('pressed'), 200);
    };
    btnLaunchHuman.addEventListener('touchstart', onLaunchHuman, { passive: false });
    btnLaunchHuman.addEventListener('mousedown', onLaunchHuman);
  }

  // ===== 結果画面でタップするとリトライ =====
  const onReset = () => {
    if (game.state === 'RESULT') {
      game.reset();
    }
  };

  canvas.addEventListener('touchstart', onReset, { passive: true });
  canvas.addEventListener('mousedown', onReset);

  const resultModal = document.getElementById('resultModal');
  if (resultModal) {
    resultModal.addEventListener('touchstart', onReset, { passive: true });
    resultModal.addEventListener('mousedown', onReset);
  }

  // ===== バレルスライダー連動 =====
  const barrelControl = document.getElementById('barrelControl');
  const barrelSlider  = document.getElementById('barrelSlider');
  const barrelDegLbl  = document.getElementById('barrelDegLabel');

  /**
   * スライダー値（0〜359°）を barrelAngle（ラジアン）に変換してゲームに反映する
   * 角度は「0°=右、90°=下、180°=左、270°=上」のキャンバス座標系
   */
  const onSliderInput = () => {
    const deg = parseInt(barrelSlider.value, 10);
    game.barrelAngle = (deg * Math.PI) / 180;
    if (barrelDegLbl) barrelDegLbl.textContent = `${deg}°`;
  };

  if (barrelSlider) {
    // スライダーの touch-action を none にしてスクロール競合を防ぐ
    barrelSlider.style.touchAction = 'none';
    barrelSlider.addEventListener('input', onSliderInput);
    barrelSlider.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  }

  /**
   * バレル装備状態に合わせてスライダーUIを表示/非表示する
   * ゲームループ(rAF)に紐づけず、一定間隔でポーリングする
   */
  const updateBarrelUI = () => {
    if (!barrelControl) return;
    const hasBarrel = game.save.equippedItems.includes('barrel');
    if (hasBarrel) {
      barrelControl.classList.remove('hidden');
      // ゲーム側の角度をスライダーに反映（外部から角度が変わった場合に同期）
      const deg = Math.round(((game.barrelAngle * 180 / Math.PI) % 360 + 360) % 360);
      if (barrelSlider) barrelSlider.value = deg;
      if (barrelDegLbl) barrelDegLbl.textContent = `${deg}°`;
    } else {
      barrelControl.classList.add('hidden');
    }
  };
  setInterval(updateBarrelUI, 300); // 0.3秒ごとに装備状態をチェック

  // ===== データ初期化処理 =====
  const btnResetData = document.getElementById('btnResetData');
  const confirmModal = document.getElementById('confirmModal');
  const btnConfirmReset = document.getElementById('btnConfirmReset');
  const btnCancelReset  = document.getElementById('btnCancelReset');

  if (btnResetData && confirmModal) {
    // ショップ内の「データ初期化」ボタン
    btnResetData.addEventListener('click', () => {
      confirmModal.classList.remove('hidden');
    });

    // 確認モーダルの「キャンセル」
    btnCancelReset.addEventListener('click', () => {
      confirmModal.classList.add('hidden');
    });

    // 確認モーダルの「初期化する」
    btnConfirmReset.addEventListener('click', () => {
      game.save.reset();
      // 完全に初期化するため、ページをリロードする
      window.location.reload();
    });
  }
});
