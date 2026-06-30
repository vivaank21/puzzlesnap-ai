/**
 * audio.js
 * --------
 * All PuzzleSnap AI sound effects are synthesized on the fly with the
 * Web Audio API instead of shipping binary sound files. This keeps the
 * app lightweight and avoids licensing concerns for stock SFX, while
 * still hitting every cue in the spec (shutter, beep, snap, victory...).
 */
(function () {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function enabled() {
    return localStorage.getItem('ps_sound') !== 'off';
  }

  function tone({ freq = 440, type = 'sine', duration = 0.15, gain = 0.18, delay = 0, glideTo = null }) {
    if (!enabled()) return;
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + delay + duration);
    g.gain.setValueAtTime(0.0001, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + delay + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + duration);
    osc.connect(g).connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + duration + 0.05);
  }

  function noiseBurst({ duration = 0.08, gain = 0.25, delay = 0 } = {}) {
    if (!enabled()) return;
    const c = getCtx();
    const bufferSize = c.sampleRate * duration;
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime + delay);
    src.connect(g).connect(c.destination);
    src.start(c.currentTime + delay);
  }

  const PSAudio = {
    unlock() { getCtx(); },

    beep() { tone({ freq: 880, type: 'sine', duration: 0.12, gain: 0.16 }); },

    shutter() {
      noiseBurst({ duration: 0.05, gain: 0.3 });
      tone({ freq: 1800, type: 'square', duration: 0.04, gain: 0.08, delay: 0.02 });
    },

    snap() { tone({ freq: 520, type: 'triangle', duration: 0.09, gain: 0.16 }); },

    correct() {
      tone({ freq: 660, type: 'sine', duration: 0.1, gain: 0.16 });
      tone({ freq: 880, type: 'sine', duration: 0.12, gain: 0.14, delay: 0.08 });
    },

    hover() { tone({ freq: 1200, type: 'sine', duration: 0.05, gain: 0.05 }); },

    notify() { tone({ freq: 740, type: 'sine', duration: 0.1, gain: 0.12 }); tone({ freq: 980, type: 'sine', duration: 0.12, gain: 0.1, delay: 0.1 }); },

    victory() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.35, gain: 0.18, delay: i * 0.13 }));
    },

    countdownTick() { tone({ freq: 440, type: 'sine', duration: 0.1, gain: 0.14 }); },
    countdownGo() { tone({ freq: 880, type: 'sine', duration: 0.25, gain: 0.2, glideTo: 1320 }); },
  };

  window.PSAudio = PSAudio;
})();