/**
 * shop.js — ショップとアイテム管理
 */

'use strict';

const SHOP_ITEMS = [
  {
    id: 'jump_up',
    name: 'ジャンプ力アップ',
    desc: '飛び出す時、２段ジャンプする時、着地してはねる時のジャンプ力が上がる',
    price: 150
  },
  {
    id: 'double_jump',
    name: '２段ジャンプ',
    desc: '空中で「とぶ！」ボタンを押すことで一度だけ空中ジャンプできる',
    price: 300
  },
  {
    id: 'super_ball',
    name: 'スーパーボール',
    desc: '着地した時にはねるようになる。飛んだ最高高度が高いほど高くバウンドする',
    price: 500
  },
  {
    id: 'ice',
    name: 'こおり',
    desc: '床が滑るようになる。着地してもすぐ止まらず横方向の勢いで滑る',
    price: 250
  },
  {
    id: 'ice_shoes',
    name: 'アイスシューズ',
    desc: '氷の上でさらに激しく滑る。ただし落下速度が速すぎると着地に失敗して滑らない',
    price: 400
  },
  {
    id: 'paraglider',
    name: 'パラグライダー',
    desc: '飛んでいる最中に「こぐ！」ボタンを長押しすると、落下が緩やかになり空中を横に滑空する',
    price: 600
  },
  {
    id: 'pump_up',
    name: 'こぎ名人',
    desc: 'ブランコを漕ぐときの加速力が大幅に上がり、すぐに勢いがつく',
    price: 350
  },
  {
    id: 'light_weight',
    name: 'フェザーボディ',
    desc: '体重が飛躍的に軽くなり、空中でふんわりと落ちにくく遠くまで飛べる',
    price: 500
  },
  {
    id: 'heavy_weight',
    name: 'ヘビーボディ',
    desc: '体重が重くなる。上方向へは飛びにくくなるが、横方向へ強力な勢いをつけて発射される',
    price: 500
  },
  {
    id: 'choro_9',
    name: 'チョロ9',
    desc: 'マイナス（左）方向へ飛んで着地した時、蓄積されたパワーで倍の勢いになって大きく右へ転がっていく',
    price: 600
  },
  {
    id: 'barrel',
    name: 'バレル',
    desc: '漕ぎ出す前にブランコ周りの砲台をドラッグして発射角度を決められる。「とぶ！」でタイミングに関わらずその方向へ射出される。ただし勢いは 0.8 倍になる',
    price: 450
  }
];

class ShopUI {
  constructor(saveManager) {
    this.save = saveManager;
    
    this.modal = document.getElementById('shopModal');
    this.btnClose = document.getElementById('btnCloseShop');
    this.coinCountLabel = document.getElementById('shopCoinCount');
    this.equipCountLabel = document.getElementById('equipCount');
    this.itemListContainer = document.getElementById('shopItemList');
    
    this.onCloseCb = null;

    this._bindEvents();
    this.render();
  }

  _bindEvents() {
    this.btnClose.addEventListener('click', () => {
      this.close();
    });
  }

  open(onCloseCallback) {
    this.onCloseCb = onCloseCallback;
    this.render();
    this.modal.classList.remove('hidden');
  }

  close() {
    this.modal.classList.add('hidden');
    if (this.onCloseCb) this.onCloseCb();
  }

  render() {
    // Top HUD
    this.coinCountLabel.textContent = this.save.coins.toLocaleString();
    this.equipCountLabel.textContent = this.save.equippedItems.length;

    // Items list
    this.itemListContainer.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
      const isOwned = this.save.ownedItems.includes(item.id);
      const isEquipped = this.save.equippedItems.includes(item.id);

      const el = document.createElement('div');
      el.className = 'shop-item';
      if (isEquipped) el.classList.add('equipped');

      el.innerHTML = `
        <div class="item-info">
          <div>
            <div class="item-name">${item.name}</div>
            <div class="item-desc">${item.desc}</div>
          </div>
          <div class="item-price">${isOwned ? '✓ 所持' : `C ${item.price}`}</div>
        </div>
        <div class="item-actions"></div>
      `;

      const actionsDiv = el.querySelector('.item-actions');

      if (!isOwned) {
        // 買うボタン
        const btnBuy = document.createElement('button');
        btnBuy.className = 'shop-action-btn btn-buy';
        btnBuy.textContent = '購入';
        if (this.save.coins < item.price) {
          btnBuy.classList.add('btn-disabled');
        } else {
          btnBuy.addEventListener('click', () => {
            if (this.save.buyItem(item.id, item.price)) {
              this.render(); // 再描画
            }
          });
        }
        actionsDiv.appendChild(btnBuy);
      } else {
        // 装備/外すボタン
        const btnEquip = document.createElement('button');
        if (isEquipped) {
          btnEquip.className = 'shop-action-btn btn-unequip';
          btnEquip.textContent = '装備を外す';
        } else {
          btnEquip.className = 'shop-action-btn btn-equip';
          btnEquip.textContent = '装備する';
          if (this.save.equippedItems.length >= 3) {
            btnEquip.classList.add('btn-disabled');
          }
        }

        btnEquip.addEventListener('click', () => {
          this.save.toggleEquip(item.id);
          this.render(); // 再描画
        });

        actionsDiv.appendChild(btnEquip);
      }

      this.itemListContainer.appendChild(el);
    });
  }
}
