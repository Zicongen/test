/**
 * CyberOps Synthesizer Audio Engine
 * Uses the Web Audio API for highly immersive procedural sound effects.
 */

import { store } from './state.js';

class SynthesizerEngine {
    constructor() {
        this.ctx = null;
        this.humSource = null;
        this.humGain = null;
        this.lastEnterTime = 0;
        
        // Listen to state settings to dynamically manage volumes and channels
        store.subscribe((state) => {
            this.volume = state.audioVolume;
            this.muted = state.audioMuted;
            this.keyboardEnabled = state.audioKeyboardEnabled !== undefined ? state.audioKeyboardEnabled : true;
            this.clicksEnabled = state.audioClickEnabled !== undefined ? state.audioClickEnabled : true;
            this.alertsEnabled = state.audioAlertsEnabled !== undefined ? state.audioAlertsEnabled : true;
            this.humEnabled = state.audioHumEnabled !== undefined ? state.audioHumEnabled : true;
            this.keyboardProfile = state.audioKeyboardProfile || 'cherry-blue';
            this.clickProfile = state.audioClickProfile || 'tactile';
            
            // Dynamic master hum adjustment
            if (this.humGain) {
                this.humGain.gain.setValueAtTime(
                    (this.muted || !this.humEnabled) ? 0 : this.volume * 0.05, 
                    this.ctx ? this.ctx.currentTime : 0
                );
            }
            
            // Reactive hum starter/stopper
            if (this.ctx) {
                if (this.humEnabled && !this.muted && !this.humSource) {
                    this.startServerHum();
                } else if ((!this.humEnabled || this.muted) && this.humSource) {
                    this.stopServerHum();
                }
            }
        });
    }

    /**
     * Lazy initialize standard audio context on first interactive gesture.
     */
    initContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Sleek macOS-style UI click sound for button ticks and general interactions
     */
    playClick() {
        this.initContext();
        if (this.muted || !this.clicksEnabled) return;
        const now = this.ctx.currentTime;

        if (this.clickProfile === 'retro-digital') {
            // Retro 8-bit digital tick sound
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1400, now);
            
            oscGain.gain.setValueAtTime(this.volume * 0.06, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.02);
            return;
        }

        // Default: Tactile woody macOS-style click
        // Stage 1: Ultra-short high-frequency click transient (5ms)
        const clickBufferSize = this.ctx.sampleRate * 0.005;
        const clickBuffer = this.ctx.createBuffer(1, clickBufferSize, this.ctx.sampleRate);
        const clickData = clickBuffer.getChannelData(0);
        for (let i = 0; i < clickBufferSize; i++) {
            clickData[i] = Math.random() * 2 - 1;
        }
        const clickSource = this.ctx.createBufferSource();
        clickSource.buffer = clickBuffer;

        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        clickFilter.frequency.setValueAtTime(5000, now);
        clickFilter.Q.setValueAtTime(8, now);

        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(this.volume * 0.06, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);

        clickSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickSource.start(now);

        // Stage 2: Woody, clean sine wave pop body (15ms decay)
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(780 + (Math.random() * 40 - 20), now);

        oscGain.gain.setValueAtTime(this.volume * 0.12, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
    }

    /**
     * Tactical keypress sound synthesizer offering 6 diverse cyberpunk profiles
     */
    playKeyClack(key = '') {
        this.initContext();
        if (this.muted || !this.keyboardEnabled) return;
        const now = this.ctx.currentTime;

        // Double-click protection (80ms cooldown) for Enter key
        if (key === 'Enter') {
            if (now - this.lastEnterTime < 0.08) return;
            this.lastEnterTime = now;
        }

        // SWITCH 1: Retro 8-bit digital beeps
        if (this.keyboardProfile === 'retro-beep') {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sine';
            let freq = 880;
            if (key === 'Enter') freq = 587.33; // D5
            else if (key === 'Backspace') freq = 440; // A4
            else if (key === ' ') freq = 293.66; // D4
            
            osc.frequency.setValueAtTime(freq + (Math.random() * 20 - 10), now);
            
            oscGain.gain.setValueAtTime(this.volume * 0.08, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
            return;
        }

        // SWITCH 2: Bubble Wrap Popping Cyber Toy
        if (this.keyboardProfile === 'bubble-wrap') {
            const click1 = this.ctx.createOscillator();
            const click2 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            const gain2 = this.ctx.createGain();
            
            // Pop 1: Sharp woodpop
            click1.type = 'sine';
            click1.frequency.setValueAtTime(1300 + Math.random() * 300, now);
            gain1.gain.setValueAtTime(this.volume * 0.16, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.014);
            click1.connect(gain1);
            gain1.connect(this.ctx.destination);
            click1.start(now);
            click1.stop(now + 0.02);
            
            // Pop 2 (delayed by 8ms): Tiny high-pitched release snap
            click2.type = 'sine';
            click2.frequency.setValueAtTime(2300 + Math.random() * 400, now + 0.008);
            gain2.gain.setValueAtTime(this.volume * 0.08, now + 0.008);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.020);
            click2.connect(gain2);
            gain2.connect(this.ctx.destination);
            click2.start(now + 0.008);
            click2.stop(now + 0.03);
            return;
        }

        // SWITCH 3: Sci-Fi Arcade Laser Blaster Sweeps
        if (this.keyboardProfile === 'laser-blaster') {
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'sawtooth';
            
            let startFreq = 1600;
            let endFreq = 400;
            let dur = 0.05;
            
            if (key === 'Enter') {
                startFreq = 1100;
                endFreq = 150;
                dur = 0.12;
            } else if (key === 'Backspace') {
                startFreq = 500;
                endFreq = 1100;
                dur = 0.07;
            } else if (key === ' ') {
                startFreq = 1000;
                endFreq = 300;
                dur = 0.06;
            }
            
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
            
            oscGain.gain.setValueAtTime(this.volume * 0.06, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            
            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.02);
            return;
        }

        // MECHANICAL SWITCH BASES (Cherry Blue, Cherry Brown, Alps Blue)
        // Actuation Transient Click Configuration
        const clickBufferSize = this.ctx.sampleRate * 0.015;
        const clickBuffer = this.ctx.createBuffer(1, clickBufferSize, this.ctx.sampleRate);
        const clickData = clickBuffer.getChannelData(0);
        for (let i = 0; i < clickBufferSize; i++) {
            clickData[i] = Math.random() * 2 - 1;
        }
        const clickSource = this.ctx.createBufferSource();
        clickSource.buffer = clickBuffer;

        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'bandpass';
        
        let clickFreq = 3400 + (Math.random() * 800 - 400);
        let clickVol = this.volume * 0.22;
        let clickDuration = 0.010;

        if (this.keyboardProfile === 'cherry-brown') {
            // Quieter tactile transient pop
            clickFreq = 2600 + (Math.random() * 400 - 200);
            clickVol = this.volume * 0.12;
            clickDuration = 0.008;
        } else if (this.keyboardProfile === 'alps-blue') {
            // Louder clunky vintage metal bar click
            clickFreq = 1800 + (Math.random() * 600 - 300);
            clickVol = this.volume * 0.35;
            clickDuration = 0.015;
        }

        if (key === ' ') {
            clickFreq = clickFreq * 0.65;
            clickVol = clickVol * 0.75;
            clickDuration = clickDuration * 1.2;
        } else if (key === 'Backspace') {
            clickFreq = clickFreq * 0.85;
            clickVol = clickVol * 0.85;
        } else if (key === 'Enter') {
            clickFreq = clickFreq * 0.60;
            clickVol = clickVol * 1.10;
            clickDuration = clickDuration * 1.4;
        }

        clickFilter.frequency.setValueAtTime(clickFreq, now);
        clickFilter.Q.setValueAtTime(this.keyboardProfile === 'cherry-brown' ? 8 : 15, now);

        const clickGain = this.ctx.createGain();
        clickGain.gain.setValueAtTime(clickVol, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + clickDuration);

        clickSource.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.ctx.destination);
        clickSource.start(now);

        // Plastic bottom-out keycap thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        let baseFreq = 230;
        let capVol = this.volume * 0.14;
        let capDuration = 0.038;
        let oscType = 'triangle';

        if (this.keyboardProfile === 'cherry-brown') {
            // Soft rubbery thud
            baseFreq = 190;
            capVol = this.volume * 0.12;
            capDuration = 0.030;
            oscType = 'sine';
        } else if (this.keyboardProfile === 'alps-blue') {
            // Deeper hollow metallic bottom-out
            baseFreq = 150;
            capVol = this.volume * 0.26;
            capDuration = 0.055;
            oscType = 'triangle';
        }

        if (key === ' ') {
            baseFreq = baseFreq * 0.55;
            capVol = capVol * 1.4;
            capDuration = capDuration * 1.5;
        } else if (key === 'Backspace') {
            baseFreq = baseFreq * 0.78;
            capVol = capVol * 1.15;
            capDuration = capDuration * 1.25;
        } else if (key === 'Enter') {
            baseFreq = baseFreq * 0.68;
            capVol = capVol * 1.70;
            capDuration = capDuration * 1.60;
        }

        const pitchVariance = 1 + (Math.random() * 0.24 - 0.12);
        osc.frequency.setValueAtTime(baseFreq * pitchVariance, now);
        osc.type = oscType;

        oscGain.gain.setValueAtTime(capVol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + capDuration);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + capDuration + 0.05);
    }

    playEnter() {
        this.playKeyClack('Enter');
    }

    playSuccess() {
        this.initContext();
        if (this.muted || !this.alertsEnabled) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        notes.forEach((freq, idx) => {
            const time = now + (idx * 0.08);
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(this.volume * 0.15, time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(time);
            osc.stop(time + 0.4);
        });
    }

    playError() {
        this.initContext();
        if (this.muted || !this.alertsEnabled) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(130, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(135, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(this.volume * 0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    }

    startServerHum() {
        this.initContext();
        if (!this.humEnabled || this.muted) return;
        if (this.humSource) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65.41, now);

        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(0.4, now);
        
        const modulatorGain = this.ctx.createGain();
        modulatorGain.gain.setValueAtTime(2.0, now);

        this.humGain = this.ctx.createGain();
        this.humGain.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.05, now);

        modulator.connect(modulatorGain);
        modulatorGain.connect(osc.frequency);
        osc.connect(this.humGain);
        this.humGain.connect(this.ctx.destination);

        modulator.start(now);
        osc.start(now);
        this.humSource = { osc, modulator, modulatorGain };
    }

    stopServerHum() {
        if (this.humSource) {
            try {
                this.humSource.osc.stop();
                this.humSource.modulator.stop();
            } catch(e){}
            this.humSource = null;
            this.humGain = null;
        }
    }
}

export const sfx = new SynthesizerEngine();
