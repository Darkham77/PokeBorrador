import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * AudioStore
 * 
 * Handles 8-bit sound synthesis using Web Audio API.
 * Encapsulates the legacy logic from 17_sounds.js into a modern Vue store.
 */
export const useAudioStore = defineStore('audio', () => {
    const context = ref(null);
    const masterGain = ref(null);
    const isInitialized = ref(false);

    /**
     * Initializes the audio context.
     * Must be triggered by a user interaction (e.g., first click).
     */
    const init = () => {
        if (isInitialized.value) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            context.value = new AudioContext();
            masterGain.value = context.value.createGain();
            masterGain.value.gain.value = 0.15; // Global volume
            masterGain.value.connect(context.value.destination);
            isInitialized.value = true;
            console.log('[Audio] Context initialized');
        } catch (e) {
            console.error('[Audio] Web Audio API not supported', e);
        }
    };

    /**
     * Resumes the context if it was suspended.
     */
    const resume = async () => {
        if (!context.value) init();
        if (context.value && context.value.state === 'suspended') {
            await context.value.resume();
        }
    };

    /**
     * Plays a synthesized 8-bit sound.
     * @param {string} type - 'shiny', 'rival', 'levelUp', 'evolution', 'caught'
     */
    const play = async (type) => {
        if (!isInitialized.value) init();
        await resume();

        const ctx = context.value;
        const mg = masterGain.value;
        if (!ctx || !mg) return;

        switch (type) {
            case 'shiny':
                playShiny(ctx, mg);
                break;
            case 'rival':
                playRivalEncounter(ctx, mg);
                break;
            case 'levelUp':
                playLevelUp(ctx, mg);
                break;
            case 'evolution':
                playEvolution(ctx, mg);
                break;
            case 'caught':
                playCaught(ctx, mg);
                break;
            case 'flee':
                playFlee(ctx, mg);
                break;
            case 'item':
                playItem(ctx, mg);
                break;
            case 'sentMsg':
                playSentMsg(ctx, mg);
                break;
            case 'receivedMsg':
                playReceivedMsg(ctx, mg);
                break;
            case 'notif':
                playNotif(ctx, mg);
                break;
            case 'money':
                playMoney(ctx, mg);
                break;
        }
    };

    // --- Synthesis Methods ---

    const playSentMsg = (ctx, mg) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.05);
    };

    const playReceivedMsg = (ctx, mg) => {
        const now = ctx.currentTime;
        [660, 880].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.1);
        });
    };

    const playNotif = (ctx, mg) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1174.66, now); // D6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.15);
    };

    const playMoney = (ctx, mg) => {
        const now = ctx.currentTime;
        for (let i = 0; i < 3; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1975.53, now + i * 0.06); // B6
            gain.gain.setValueAtTime(0.2, now + i * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.05);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.05);
        }
    };

    const playShiny = (ctx, mg) => {
        const now = ctx.currentTime;
        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1500 + i * 200, now + i * 0.05);
            osc.frequency.exponentialRampToValueAtTime(3000, now + i * 0.05 + 0.1);
            gain.gain.setValueAtTime(0.3, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.15);
        }
    };

    const playRivalEncounter = (ctx, mg) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(55, now + 0.4);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.4);
    };

    const playLevelUp = (ctx, mg) => {
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.2);
        });
    };

    const playEvolution = (ctx, mg) => {
        const now = ctx.currentTime;
        for (let i = 0; i < 12; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440 + i * 50, now + i * 0.08);
            gain.gain.setValueAtTime(0.2, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.01, now + i * 0.08 + 0.1);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.1);
        }
    };

    const playCaught = (ctx, mg) => {
        const now = ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.4, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3);
            osc.connect(gain);
            gain.connect(mg);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.3);
        });
    };

    const playFlee = (ctx, mg) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.3);
    };

    const playItem = (ctx, mg) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.linearRampToValueAtTime(1318.51, now + 0.1); // E6
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(mg);
        osc.start(now);
        osc.stop(now + 0.2);
    };

    return {
        isInitialized,
        init,
        resume,
        play,
        // Shortcuts for easier calling
        shiny: () => play('shiny'),
        rival: () => play('rival'),
        levelUp: () => play('levelUp'),
        evolution: () => play('evolution'),
        caught: () => play('caught'),
        flee: () => play('flee'),
        item: () => play('item'),
        sentMsg: () => play('sentMsg'),
        receivedMsg: () => play('receivedMsg'),
        notif: () => play('notif'),
        money: () => play('money')
    };
});
