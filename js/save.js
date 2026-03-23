/**
 * save.js — セーブ管理
 * コイン数・最大飛行距離を localStorage に保存・読み込みする
 */

'use strict';

/** localStorage のキー定数 */
const SAVE_KEY = {
  COINS: 'swingCoins',
  BEST_DISTANCE: 'swingBestDistance',
  OWNED_ITEMS: 'swingOwnedItems',
  EQUIPPED_ITEMS: 'swingEquippedItems',
};

/**
 * 距離（メートル）からコイン獲得数を計算する
 * @param {number} distance メートル
 * @returns {number} 獲得コイン数
 */
function calcCoins(distance) {
  // 距離帯ごとに獲得レートを段階的に上げる
  let coins = 0;
  if (distance < 0) return Math.floor(distance);
  if (distance === 0) return 0;

  if (distance <= 10) {
    // 0〜10m: 1m ごとに 1コイン
    coins = Math.floor(distance) * 1;
  } else if (distance <= 30) {
    // 10〜30m: 基礎10 + 超過分 1m ごとに 2コイン
    coins = 10 + Math.floor(distance - 10) * 2;
  } else if (distance <= 60) {
    // 30〜60m: 基礎50 + 超過分 1m ごとに 3コイン
    coins = 50 + Math.floor(distance - 30) * 3;
  } else {
    // 60m超: 基礎140 + 超過分 1m ごとに 5コイン
    coins = 140 + Math.floor(distance - 60) * 5;
  }

  return coins;
}

/**
 * セーブデータを管理するクラス
 */
class SaveManager {
  constructor() {
    this._load();
  }

  /** localStorage からデータを読み込む */
  _load() {
    this.coins = parseInt(localStorage.getItem(SAVE_KEY.COINS) || '0', 10);
    this.bestDistance = parseFloat(localStorage.getItem(SAVE_KEY.BEST_DISTANCE) || '0');
    
    try {
      this.ownedItems = JSON.parse(localStorage.getItem(SAVE_KEY.OWNED_ITEMS) || '[]');
      this.equippedItems = JSON.parse(localStorage.getItem(SAVE_KEY.EQUIPPED_ITEMS) || '[]');
    } catch(e) {
      this.ownedItems = [];
      this.equippedItems = [];
    }
  }

  /** localStorage にデータを書き込む */
  _save() {
    localStorage.setItem(SAVE_KEY.COINS, String(this.coins));
    localStorage.setItem(SAVE_KEY.BEST_DISTANCE, this.bestDistance.toFixed(2));
    localStorage.setItem(SAVE_KEY.OWNED_ITEMS, JSON.stringify(this.ownedItems));
    localStorage.setItem(SAVE_KEY.EQUIPPED_ITEMS, JSON.stringify(this.equippedItems));
  }

  /**
   * フライト結果を記録し、コインを加算する
   * @param {number} distance メートル
   * @returns {{ earned: number, isNewRecord: boolean }}
   */
  recordResult(distance) {
    const isNewRecord = distance > this.bestDistance;
    if (isNewRecord) {
      this.bestDistance = distance;
    }

    // 獲得コイン計算（新記録ならボーナス +20）
    const base = calcCoins(distance);
    const bonus = isNewRecord ? 20 : 0;
    const earned = base + bonus;

    this.coins += earned;
    this._save();

    return { earned, isNewRecord, bonusApplied: isNewRecord };
  }

  /** セーブデータをすべてリセットする（デバッグ用） */
  reset() {
    this.coins = 0;
    this.bestDistance = 0;
    this.ownedItems = [];
    this.equippedItems = [];
    this._save();
  }

  // ===== ショップ・アイテム関連 =====

  /**
   * アイテムを購入する
   */
  buyItem(id, price) {
    if (this.coins >= price && !this.ownedItems.includes(id)) {
      this.coins -= price;
      this.ownedItems.push(id);
      this._save();
      return true;
    }
    return false;
  }

  /**
   * アイテムを装備する
   */
  equipItem(id) {
    // 未所持なら装備不可
    if (!this.ownedItems.includes(id)) return false;
    // 既に装備中なら何もしない
    if (this.equippedItems.includes(id)) return true;
    // 装備上限チェック（最大3つ）
    if (this.equippedItems.length >= 3) return false;

    this.equippedItems.push(id);
    this._save();
    return true;
  }

  /**
   * アイテムの装備を外す
   */
  unequipItem(id) {
    const idx = this.equippedItems.indexOf(id);
    if (idx !== -1) {
      this.equippedItems.splice(idx, 1);
      this._save();
    }
  }

  /**
   * 装備状態のトグル
   */
  toggleEquip(id) {
    if (this.equippedItems.includes(id)) {
      this.unequipItem(id);
      return true;
    } else {
      return this.equipItem(id);
    }
  }
}
