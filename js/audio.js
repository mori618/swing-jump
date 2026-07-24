/**
 * audio.js — 音声シンセエンジン
 * Web Audio APIを使用して、外部アセット不要で8bit風のBGMや効果音を動的に合成・再生します。
 */

'use strict';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.bgmNode = null;
    this.bgmSequenceId = null;

    // ミュート状態をlocalStorageからロード
    try {
      const savedMute = localStorage.getItem('swing_jump_muted');
      this.isMuted = savedMute === 'true';
    } catch (e) {
      this.isMuted = false;
    }

    // 初回操作でオーディオコンテキストを初期化するためのイベントリスナー
    const initAudio = () => {
      this._init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
  }

  _init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3; // 基本音量
      this.masterGain.connect(this.ctx.destination);

      // BGMの開始
      this.startBGM();
    } catch (e) {
      console.warn('Web Audio API is not supported on this browser.', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('swing_jump_muted', this.isMuted ? 'true' : 'false');
    } catch (e) {}

    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * 単一の矩形波/三角波/サイン波などを鳴らすヘルパー
   */
  _playTone(freqs, duration, type = 'square', volume = 0.5, slide = false) {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(this.masterGain);

    if (Array.isArray(freqs)) {
      if (freqs.length === 1) {
        osc.frequency.setValueAtTime(freqs[0], now);
      } else if (slide) {
        // 周波数スライド
        osc.frequency.setValueAtTime(freqs[0], now);
        osc.frequency.exponentialRampToValueAtTime(freqs[1], now + duration);
      } else {
        // アルペジオ
        const noteLen = duration / freqs.length;
        freqs.forEach((f, idx) => {
          osc.frequency.setValueAtTime(f, now + idx * noteLen);
        });
      }
    } else {
      osc.frequency.setValueAtTime(freqs, now);
    }

    // 音量エンベロープ
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  /**
   * ノイズ（爆発、ダッシュ、滑る音など）を鳴らすヘルパー
   */
  _playNoise(duration, volume = 0.5, bandpassFreq = 1000, decay = true) {
    if (!this.ctx || this.isMuted) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // ホワイトノイズ生成
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // バンドパスフィルターでファミコン風ノイズに寄せる
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = bandpassFreq;

    const gain = this.ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(volume, now);
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    } else {
      gain.gain.linearRampToValueAtTime(0.001, now + duration);
    }

    noise.start(now);
    noise.stop(now + duration + 0.1);
  }

  // ===== 効果音 (SFX) 一覧 =====

  /** 漕ぐ音 */
  playPump() {
    this._playTone([120, 260], 0.15, 'triangle', 0.6, true);
  }

  /** タイミングPerfect漕ぎ音 */
  playPerfect() {
    // 綺麗な高音アルペジオ
    this._playTone([523.25, 659.25, 783.99, 1046.50], 0.25, 'sine', 0.8);
  }

  /** 飛び出し/大砲発射音 */
  playLaunch(isShoe = false) {
    if (isShoe) {
      // 靴：シュッと飛ぶ音
      this._playTone([300, 900], 0.25, 'triangle', 0.6, true);
    } else {
      // 人間：ドン！と打ち上がる音
      this._playNoise(0.4, 0.9, 400);
      this._playTone([100, 50], 0.3, 'sawtooth', 0.7, true);
    }
  }

  /** ２段ジャンプ音 */
  playDoubleJump() {
    this._playTone([200, 600], 0.18, 'triangle', 0.7, true);
  }

  /** コイン獲得音 */
  playCoin() {
    if (!this.ctx) return;
    this._playTone([987.77, 1318.51], 0.2, 'sine', 0.7);
  }

  /** スーパーボールバウンド音 */
  playBounce() {
    this._playTone([300, 150, 400], 0.25, 'triangle', 0.8, false);
  }

  /** 氷の上で滑っている音 */
  playSlide(duration = 0.1) {
    this._playNoise(duration, 0.25, 3000, false);
  }

  /** 地面に叩きつけられる/気絶音 */
  playCrash() {
    this._playNoise(0.6, 0.9, 150);
    this._playTone([180, 60], 0.5, 'sawtooth', 0.6, true);
  }

  /** 着地成功ファンファーレ */
  playSuccess() {
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    notes.forEach((f, idx) => {
      setTimeout(() => {
        this._playTone(f, idx === notes.length - 1 ? 0.6 : 0.15, 'square', 0.6);
      }, idx * 120);
    });
  }

  /** 着地失敗メロディ */
  playFail() {
    const notes = [392.00, 369.99, 349.23, 293.66];
    if (!this.ctx) return;
    notes.forEach((f, idx) => {
      setTimeout(() => {
        this._playTone(f, idx === notes.length - 1 ? 0.6 : 0.2, 'triangle', 0.6);
      }, idx * 180);
    });
  }

  // ===== BGM管理 =====

  startBGM() {
    if (this.bgmSequenceId) return; // 既に再生中
    if (!this.ctx || this.isMuted) return;

    // 簡単なチップチューンBGMを自動生成ループ
    // 循環コード進行: C - G - Am - F
    const chords = [
      [261.63, 329.63, 392.00], // C
      [196.00, 246.94, 293.66], // G
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63]  // F
    ];

    let chordIdx = 0;
    let step = 0;

    const playStep = () => {
      if (this.isMuted || !this.ctx) return;

      const tempo = 0.25;

      // ベースライン（ルート音）- 三角波で優しく鳴らす
      if (step === 0 || step === 4) {
        this._playTone(currentChord[0] / 2, tempo * 2, 'triangle', 0.25);
      }

      // アルペジオメロディ（矩形波）- 8分音符で演奏
      const currentChord = chords[chordIdx];
      let note = currentChord[step % currentChord.length];
      if (step % 2 === 0) {
        note *= 2; // 1オクターブ上げる
      }
      if (step === 7) {
        note = currentChord[1] * 2;
      }

      this._playTone(note, tempo * 0.9, 'square', 0.08);

      step = (step + 1) % 8;
      if (step === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }

      this.bgmSequenceId = setTimeout(playStep, tempo * 1000);
    };

    playStep();
  }

  stopBGM() {
    if (this.bgmSequenceId) {
      clearTimeout(this.bgmSequenceId);
      this.bgmSequenceId = null;
    }
  }
}

// グローバルインスタンスを作成
const audio = new SoundEngine();
window.soundEngine = audio;
