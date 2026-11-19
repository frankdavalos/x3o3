// sound.js - Synthesized sound effects for X³O³ (Web Audio API, no audio files)
//
// Every effect is generated on the fly from oscillators and a little noise, so
// nothing needs to be downloaded or cached and the PWA stays tiny. The
// AudioContext is created lazily on the first user gesture, which is what
// mobile browsers (iOS Safari in particular) require before audio can play.

(function () {
    const STORAGE_KEY = 'x3o3-muted';
    const MASTER_VOLUME = 0.35;

    let ctx = null;
    let master = null;
    let noiseBuffer = null;
    let muted = localStorage.getItem(STORAGE_KEY) === 'true';

    function getContext() {
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            ctx = new AudioCtx();
            master = ctx.createGain();
            master.gain.value = MASTER_VOLUME;
            // Gentle limiter so stacked effects (place + vanish + win) never clip.
            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = -10;
            limiter.ratio.value = 12;
            master.connect(limiter);
            limiter.connect(ctx.destination);
        }
        // 'suspended' before the first gesture, 'interrupted' on iOS after
        // the app was backgrounded. resume() is a no-op when already running.
        if (ctx.state !== 'running') ctx.resume().catch(() => {});
        return ctx;
    }

    function getNoise(ac) {
        if (!noiseBuffer) {
            const length = Math.floor(ac.sampleRate * 0.5);
            noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    // One enveloped oscillator note with an optional pitch glide.
    function tone(ac, { type = 'sine', from, to = from, start, duration, volume = 1, attack = 0.005 }) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(from, start);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    // A burst of filtered noise with a sweeping band-pass.
    function noise(ac, { from, to = from, start, duration, volume = 1, q = 1 }) {
        const src = ac.createBufferSource();
        const filter = ac.createBiquadFilter();
        const gain = ac.createGain();
        src.buffer = getNoise(ac);
        filter.type = 'bandpass';
        filter.Q.value = q;
        filter.frequency.setValueAtTime(from, start);
        if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, start + duration);
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        src.start(start);
        src.stop(start + duration + 0.02);
    }

    const EFFECTS = {
        // X: bright, rising blip.
        X(ac, t) {
            tone(ac, { type: 'square', from: 520, to: 880, start: t, duration: 0.09, volume: 0.4 });
            tone(ac, { type: 'sine', from: 1040, to: 1760, start: t, duration: 0.07, volume: 0.3 });
        },
        // O: rounder, falling pulse.
        O(ac, t) {
            tone(ac, { type: 'triangle', from: 600, to: 330, start: t, duration: 0.14, volume: 0.6 });
            tone(ac, { type: 'sine', from: 300, to: 165, start: t, duration: 0.14, volume: 0.4 });
        },
        // Oldest mark dissolving off the board.
        vanish(ac, t) {
            noise(ac, { from: 3000, to: 300, start: t, duration: 0.22, volume: 1, q: 4 });
            tone(ac, { type: 'sine', from: 700, to: 200, start: t, duration: 0.2, volume: 0.3 });
        },
        // Luck mode: a cell gets locked.
        block(ac, t) {
            tone(ac, { type: 'square', from: 140, to: 70, start: t, duration: 0.25, volume: 0.3 });
            noise(ac, { from: 900, start: t, duration: 0.12, volume: 0.6, q: 8 });
            tone(ac, { type: 'square', from: 110, to: 55, start: t + 0.12, duration: 0.25, volume: 0.25 });
        },
        // Tapping a cell that can't be played.
        invalid(ac, t) {
            tone(ac, { type: 'sawtooth', from: 150, to: 110, start: t, duration: 0.1, volume: 0.35 });
        },
        // Victory arpeggio (C major, up to the octave) with a shimmering tail.
        win(ac, t) {
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                const last = i === 3;
                tone(ac, { type: 'triangle', from: f, start: t + i * 0.09, duration: last ? 0.6 : 0.16, volume: 0.5 });
                tone(ac, { type: 'square', from: f * 2, start: t + i * 0.09, duration: last ? 0.4 : 0.1, volume: 0.06 });
            });
        },
        // Draw: two flat, descending notes.
        draw(ac, t) {
            tone(ac, { type: 'triangle', from: 392, start: t, duration: 0.18, volume: 0.45 });
            tone(ac, { type: 'triangle', from: 311.13, start: t + 0.18, duration: 0.35, volume: 0.45 });
        }
    };

    function play(name, delay = 0) {
        if (muted) return;
        const effect = EFFECTS[name];
        if (!effect) return;
        const ac = getContext();
        if (!ac) return;
        try {
            effect(ac, ac.currentTime + 0.01 + delay);
        } catch (err) {
            console.warn('Sound playback failed:', err);
        }
    }

    // Call from a user gesture so the first real sound isn't swallowed.
    function unlock() {
        if (!muted) getContext();
    }

    function setMuted(value) {
        muted = !!value;
        localStorage.setItem(STORAGE_KEY, String(muted));
        if (!muted) getContext();
    }

    window.X3O3Sound = {
        play,
        unlock,
        setMuted,
        isMuted: () => muted
    };
})();
