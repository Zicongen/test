/**
 * CyberOps Simulator — Consolidated Core Engine
 * Bundled for instant offline execution via standard file:// protocol.
 */

/* ==========================================================================
   PART I. CENTRAL STATE STORE (Persistent local storage)
   ========================================================================== */
class StateStore {
    constructor() {
        this.state = {
            username: 'OPERATOR_101',
            level: 1,
            xp: 0,
            credits: 100,
            reputation: 0,
            rank: 'Noob',
            completedMissions: [],
            usedTools: [],
            unlockedTools: ['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir'],
            activeMissionId: null,
            activeMission: null,
            activeTargetNode: null,
            activeVFS: {},
            activeDirectory: '/',
            activeObjectives: [],
            terminalOutput: '',
            commandHistory: [],
            ping: '28ms',
            audioMuted: false,
            audioVolume: 0.5,
            activeTheme: 'classic-green',
            cursorState: 'underline',
            shellFont: 'fira-code',
            audioKeyboardProfile: 'cherry-blue',
            audioClickProfile: 'tactile',
            audioKeyboardEnabled: true,
            audioClickEnabled: true,
            audioAlertsEnabled: true,
            audioHumEnabled: true,
            visualMatrix: true,
            visualCRT: true
        };
        this.listeners = [];
        this.isSyncingSuspended = false;
        this.loadFromStorage();
    }

    subscribe(callback) {
        this.listeners.push(callback);
        callback(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    set(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.saveToStorage();
        this.listeners.forEach(listener => {
            try {
                listener(this.state, prevState);
            } catch (err) {
                console.error("State listener failed:", err);
            }
        });
    }

    saveToStorage() {
        try {
            const storageObj = {
                username: this.state.username,
                level: this.state.level,
                xp: this.state.xp,
                credits: this.state.credits,
                reputation: this.state.reputation,
                rank: this.state.rank,
                completedMissions: this.state.completedMissions,
                unlockedTools: this.state.unlockedTools,
                usedTools: this.state.usedTools,
                audioVolume: this.state.audioVolume,
                audioMuted: this.state.audioMuted,
                activeTheme: this.state.activeTheme,
                cursorState: this.state.cursorState,
                shellFont: this.state.shellFont,
                audioKeyboardProfile: this.state.audioKeyboardProfile,
                audioClickProfile: this.state.audioClickProfile,
                audioKeyboardEnabled: this.state.audioKeyboardEnabled,
                audioClickEnabled: this.state.audioClickEnabled,
                audioAlertsEnabled: this.state.audioAlertsEnabled,
                audioHumEnabled: this.state.audioHumEnabled,
                visualMatrix: this.state.visualMatrix,
                visualCRT: this.state.visualCRT
            };
            localStorage.setItem('cyberops_save_data_1_4', JSON.stringify(storageObj));
            
            // Trigger asynchronous background sync to Cloud Database
            this.syncToSupabase();
        } catch (err) {
            console.warn("localStorage is not available for saving state:", err);
        }
    }

    async syncToSupabase() {
        if (this.isSyncingSuspended) return;
        if (typeof dbClient === 'undefined') return;
        if (!this.state.username || this.state.username === 'OPERATOR_101') return;
        try {
            const updates = {
                level: this.state.level,
                xp: this.state.xp,
                credits: this.state.credits,
                reputation: this.state.reputation,
                rank: this.state.rank,
                completedMissions: this.state.completedMissions,
                unlockedTools: this.state.unlockedTools,
                settings: {
                    activeTheme: this.state.activeTheme,
                    cursorState: this.state.cursorState,
                    shellFont: this.state.shellFont,
                    audioMuted: this.state.audioMuted,
                    audioVolume: this.state.audioVolume
                }
            };
            await dbClient.updateUser(this.state.username, updates);
        } catch (err) {
            console.error(">> [SECURE SYSTEMS] Supabase background sync failed:", err);
        }
    }

    loadFromStorage() {
        try {
            const dataStr = localStorage.getItem('cyberops_save_data_1_4');
            if (dataStr) {
                const parsed = JSON.parse(dataStr);
                Object.keys(parsed).forEach(key => {
                    if (this.state[key] !== undefined) {
                        this.state[key] = parsed[key];
                    }
                });
            }
        } catch (err) {
            console.warn("localStorage is not available for loading state:", err);
        }
    }

    addXP(amount) {
        let newXp = this.state.xp + amount;
        let newLvl = this.state.level;
        let xpNeeded = newLvl * 250;
        
        while (newXp >= xpNeeded) {
            newXp -= xpNeeded;
            newLvl += 1;
            xpNeeded = newLvl * 250;
        }

        let newRank = 'Noob';
        if (newLvl >= 3) newRank = 'Scripter';
        if (newLvl >= 6) newRank = 'Analyst';
        if (newLvl >= 10) newRank = 'PenTester';
        if (newLvl >= 15) newRank = 'Infiltrator';
        if (newLvl >= 20) newRank = 'Cyber Ghost';

        this.set({
            level: newLvl,
            xp: newXp,
            rank: newRank
        });
    }

    resetProgress() {
        localStorage.removeItem('cyberops_save_data_1_4');
        this.set({
            level: 1,
            xp: 0,
            credits: 100,
            reputation: 0,
            rank: 'Noob',
            completedMissions: [],
            usedTools: [],
            activeMissionId: null,
            activeMission: null,
            activeTargetNode: null,
            activeDirectory: '/'
        });
    }
}
const store = new StateStore();

/* ==========================================================================
   PART II. PROCEDURAL AUDIO SYNTHESIZER (Web Audio API)
   ========================================================================== */
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
const sfx = new SynthesizerEngine();

/* ==========================================================================
   PART III. SEEDED PROCEDURAL MISSIONS GENERATOR
   ========================================================================== */
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    choice(arr) {
        return arr[this.nextInt(0, arr.length - 1)];
    }
}

const COMPANY_TYPES = ['Tech', 'Data', 'Secure', 'Cloud', 'Core', 'Net', 'Alpha', 'Logic', 'Web', 'Grid', 'Smart', 'Nexus'];
const INDUSTRY_TYPES = ['Logistics', 'Finance', 'Analytics', 'Defense', 'Retail', 'Energy', 'Media', 'Health', 'Transport', 'Telecom'];
const EASY_TARGETS = ['personal-blog', 'ftp-backup', 'small-notes', 'local-ssh', 'dev-sandbox', 'member-portal'];
const MEDIUM_TARGETS = ['shopcore-api', 'streamgrid-upload', 'media-cdn', 'customer-auth', 'auth-admin'];
const HARD_TARGETS = ['vaultbank-core', 'connecthub-api', 'central-ledger', 'secure-proxy', 'backup-node'];

const SERVERS_DATABASE = [
  // 1. Central Banks & Gov (Hard) - Upper Right: X: [480, 760], Y: [60, 200]
  { id: 0, name: "Swiss National Bank", subnet: "central_gov", security: "hard", ip: "193.5.55.10", x: 480, y: 70 }, // Switzerland
  { id: 1, name: "Federal Reserve Bank", subnet: "central_gov", security: "hard", ip: "12.45.18.20", x: 550, y: 60 }, // USA
  { id: 2, name: "Bank of England", subnet: "central_gov", security: "hard", ip: "194.2.16.30", x: 620, y: 70 }, // UK
  { id: 3, name: "Reserve Bank of India", subnet: "central_gov", security: "hard", ip: "59.160.100.12", x: 690, y: 60 }, // India
  { id: 4, name: "Deutsche Bundesbank", subnet: "central_gov", security: "hard", ip: "193.109.112.5", x: 750, y: 90 }, // Germany
  { id: 5, name: "Bank of Japan", subnet: "central_gov", security: "hard", ip: "210.140.10.45", x: 490, y: 140 }, // Japan
  { id: 6, name: "People's Bank of China", subnet: "central_gov", security: "hard", ip: "202.108.22.9", x: 560, y: 130 }, // China
  { id: 7, name: "Monetary Authority of Singapore", subnet: "central_gov", security: "hard", ip: "202.76.32.18", x: 630, y: 140 }, // Singapore
  { id: 8, name: "Pentagon Mainframe", subnet: "central_gov", security: "hard", ip: "13.52.4.15", x: 700, y: 130 }, // USA
  { id: 9, name: "NSA Crypt-Core", subnet: "central_gov", security: "hard", ip: "12.18.99.1", x: 760, y: 160 }, // USA
  { id: 10, name: "Interpol Threat Database", subnet: "central_gov", security: "hard", ip: "195.154.20.10", x: 530, y: 200 }, // France / Int.
  { id: 11, name: "CERN Grid Node", subnet: "central_gov", security: "hard", ip: "137.138.4.11", x: 600, y: 200 }, // Switzerland
  { id: 12, name: "NASA JPL Propulsion Node", subnet: "central_gov", security: "hard", ip: "128.149.23.45", x: 670, y: 200 }, // USA

  // 2. Commercial Banks (Medium) - Upper Left: X: [80, 360], Y: [60, 180]
  { id: 13, name: "AB Bank", subnet: "commercial_finance", security: "medium", ip: "103.230.104.11", x: 80, y: 70 }, // Bangladesh
  { id: 14, name: "Chase Manhattan", subnet: "commercial_finance", security: "medium", ip: "159.45.10.12", x: 150, y: 60 }, // USA
  { id: 15, name: "Bank of America", subnet: "commercial_finance", security: "medium", ip: "171.161.10.13", x: 220, y: 70 }, // USA
  { id: 16, name: "HSBC Holdings", subnet: "commercial_finance", security: "medium", ip: "203.112.10.14", x: 290, y: 60 }, // UK / Hong Kong
  { id: 17, name: "Barclays Finance", subnet: "commercial_finance", security: "medium", ip: "195.228.11.11", x: 350, y: 90 }, // UK
  { id: 18, name: "Citibank Core", subnet: "commercial_finance", security: "medium", ip: "160.79.11.12", x: 90, y: 130 }, // USA
  { id: 19, name: "Wells Fargo Node", subnet: "commercial_finance", security: "medium", ip: "162.210.11.13", x: 160, y: 120 }, // USA
  { id: 20, name: "Santander Bank", subnet: "commercial_finance", security: "medium", ip: "193.242.12.11", x: 230, y: 130 }, // Spain
  { id: 21, name: "UBS Wealth Gateway", subnet: "commercial_finance", security: "medium", ip: "193.5.12.12", x: 300, y: 120 }, // Switzerland
  { id: 22, name: "BNP Paribas Core", subnet: "commercial_finance", security: "medium", ip: "195.154.12.13", x: 360, y: 150 }, // France
  { id: 23, name: "Goldman Sachs Ledger", subnet: "commercial_finance", security: "medium", ip: "162.198.13.11", x: 130, y: 180 }, // USA
  { id: 24, name: "Deutsche Bank Gateway", subnet: "commercial_finance", security: "medium", ip: "193.109.13.12", x: 200, y: 180 }, // Germany
  { id: 25, name: "Standard Chartered Node", subnet: "commercial_finance", security: "medium", ip: "195.228.13.13", x: 270, y: 180 }, // UK / Int.

  // 3. Tech Giants & Retail (Medium) - Lower Right: X: [480, 760], Y: [280, 410]
  { id: 26, name: "Google Auth Mainframe", subnet: "tech_commerce", security: "medium", ip: "8.8.8.8", x: 480, y: 290 }, // USA
  { id: 27, name: "Amazon AWS-Core", subnet: "tech_commerce", security: "medium", ip: "54.239.50.20", x: 550, y: 280 }, // USA
  { id: 28, name: "Microsoft Cloud Proxy", subnet: "tech_commerce", security: "medium", ip: "40.112.50.30", x: 620, y: 290 }, // USA
  { id: 29, name: "Apple iCloud Storage", subnet: "tech_commerce", security: "medium", ip: "17.142.51.10", x: 690, y: 280 }, // USA
  { id: 30, name: "Meta Data Collector", subnet: "tech_commerce", security: "medium", ip: "31.13.51.20", x: 750, y: 310 }, // USA
  { id: 31, name: "Netflix Stream Hub", subnet: "tech_commerce", security: "medium", ip: "45.57.51.30", x: 490, y: 350 }, // USA
  { id: 32, name: "Steam Game Server", subnet: "tech_commerce", security: "medium", ip: "162.254.52.10", x: 560, y: 340 }, // USA
  { id: 33, name: "Walmart Logistics", subnet: "tech_commerce", security: "medium", ip: "161.168.52.20", x: 630, y: 350 }, // USA
  { id: 34, name: "Target Retail API", subnet: "tech_commerce", security: "medium", ip: "162.168.52.30", x: 700, y: 340 }, // USA
  { id: 35, name: "eBay Transaction Node", subnet: "tech_commerce", security: "medium", ip: "66.135.53.10", x: 760, y: 370 }, // USA
  { id: 36, name: "PayPal Payment Ledger", subnet: "tech_commerce", security: "medium", ip: "173.0.53.20", x: 530, y: 410 }, // USA
  { id: 37, name: "Stripe Gateway Route", subnet: "tech_commerce", security: "medium", ip: "3.18.53.30", x: 600, y: 410 }, // USA
  { id: 38, name: "Tesla Supercharger Core", subnet: "tech_commerce", security: "medium", ip: "205.178.54.10", x: 670, y: 410 }, // USA

  // 4. Personal & IoT (Easy) - Lower Left: X: [80, 350], Y: [280, 410]
  { id: 39, name: "Alex Shop", subnet: "personal_iot", security: "easy", ip: "98.10.10.11", x: 80, y: 290 }, // USA
  { id: 40, name: "Bob Personal Server", subnet: "personal_iot", security: "easy", ip: "82.15.10.12", x: 150, y: 280 }, // UK
  { id: 41, name: "Alice Smart Fridge", subnet: "personal_iot", security: "easy", ip: "87.10.10.13", x: 220, y: 290 }, // Germany
  { id: 42, name: "Smart Coffee Maker", subnet: "personal_iot", security: "easy", ip: "122.0.10.14", x: 290, y: 280 }, // Japan
  { id: 43, name: "Local Gym Database", subnet: "personal_iot", security: "easy", ip: "98.11.11.11", x: 350, y: 310 }, // USA
  { id: 44, name: "Bakery POS Terminal", subnet: "personal_iot", security: "easy", ip: "198.10.11.12", x: 90, y: 350 }, // Canada
  { id: 45, name: "Cafe Wi-Fi Router", subnet: "personal_iot", security: "easy", ip: "150.10.11.13", x: 160, y: 340 }, // Australia
  { id: 46, name: "Personal Backup Rig", subnet: "personal_iot", security: "easy", ip: "80.0.12.11", x: 230, y: 350 }, // Netherlands
  { id: 47, name: "Smart Camera Hub", subnet: "personal_iot", security: "easy", ip: "98.12.12.12", x: 300, y: 340 }, // USA
  { id: 48, name: "Home Assistant Server", subnet: "personal_iot", security: "easy", ip: "98.12.12.13", x: 130, y: 410 }, // USA
  { id: 49, name: "Community Forum Host", subnet: "personal_iot", security: "easy", ip: "82.0.13.11", x: 200, y: 410 } // France
];

function md5Sim(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padEnd(8, 'f') + 
                Math.abs(hash * 31).toString(16).padEnd(8, 'a') + 
                Math.abs(hash * 17).toString(16).padEnd(8, '2') + 
                Math.abs(hash * 7).toString(16).padEnd(8, 'e');
    return hex.substring(0, 32);
}

function generateVirtualFileSystem(difficulty, host, domain, pass, hash, flag, rand) {
    const root = {
        '/': { type: 'dir', children: ['home', 'etc', 'var', 'root'] },
        '/home': { type: 'dir', children: ['guest', 'operator'] },
        '/home/guest': { type: 'dir', children: ['notes.txt', 'welcome.txt'] },
        '/home/guest/welcome.txt': { 
            type: 'file', 
            content: `Welcome to CyberOps simulated terminal workstation on node: ${host}.\nYou are currently logged in as a guest auditor.\nExplore the environment to audit active configurations.` 
        },
        '/home/guest/notes.txt': { 
            type: 'file', 
            content: `TASK MEMO:\nWe need to patch nginx.conf config. Also, verify that configuration folders have correct security permissions.\nThe verification credential hash is stored in /var/www/config.inc for review.` 
        },
        '/home/operator': { type: 'dir', children: ['session.log'] },
        '/home/operator/session.log': {
            type: 'file',
            content: `OPERATIONAL RUN LOG:\nSession started: SSH shell connection established.\nAttempting credentials swap...\nAuthentication validated for administrator user.\nSystem clean and active.\nFLAG SYNC: ${difficulty === 'easy' ? flag : 'REDACTED_ACCESS_DENIED'}`
        },
        '/etc': { type: 'dir', children: ['hosts', 'resolv.conf', 'nginx'] },
        '/etc/hosts': { 
            type: 'file', 
            content: `127.0.0.1 localhost\n127.0.1.1 ${host}\n\n# Node subdomains\n10.0.1.5 gateway.local\n192.168.1.5 db-backup.local` 
        },
        '/etc/resolv.conf': { 
            type: 'file', 
            content: `nameserver 8.8.8.8\nnameserver 1.1.1.1` 
        },
        '/etc/nginx': { type: 'dir', children: ['nginx.conf'] },
        '/etc/nginx/nginx.conf': {
            type: 'file',
            content: `user www-data;\nworker_processes auto;\n\nhttp {\n    server {\n        listen 80;\n        server_name ${domain};\n        \n        location /admin_backdoor {\n            allow 127.0.0.1;\n        }\n    }\n}`
        },
        '/var': { type: 'dir', children: ['www', 'log'] },
        '/var/www': { type: 'dir', children: ['index.html', 'config.inc'] },
        '/var/www/index.html': { 
            type: 'file', 
            content: `<!DOCTYPE html><html><body><h1>CyberOps Target Node Site Default</h1></body></html>` 
        },
        '/var/www/config.inc': { 
            type: 'file', 
            content: `# CYBEROPS SECURE CREDENTIAL FILE\n# DO NOT DISTRIBUTE IN PRODUCTION ENVIRONMENT\n\nDB_HOST="localhost"\nDB_USER="cyberops_auditor"\nDB_HASH="${hash}"\n\n# DATABASE FLAG: ${difficulty === 'medium' ? flag : 'RESTRICTED_ACCESS_ROLE_9'}` 
        },
        '/var/log': { type: 'dir', children: ['auth.log', 'syslog'] },
        '/var/log/auth.log': {
            type: 'file',
            content: `May 22 18:23:41 sshd[102]: Server listening on port 22.\nMay 22 18:25:01 sshd[104]: Attempted guest login from 10.0.0.15`
        },
        '/var/log/syslog': {
            type: 'file',
            content: `May 22 18:20:00 kernel: Initializing kernel modules...\nMay 22 18:21:12 network[11]: Static IP bounds set.`
        },
        '/root': { type: 'dir', children: ['vault'] },
        '/root/vault': { type: 'dir', children: ['flag.txt', 'secrets.json'] },
        '/root/vault/flag.txt': {
            type: 'file',
            content: `SYSTEM COMPLIANCE VERIFICATION COMPLETE.\nROOT INFILTRATION VALIDATED.\n\nFLAG VALUE: ${flag}`
        },
        '/root/vault/secrets.json': {
            type: 'file',
            content: `{\n  "admin_root_bypass": "${pass}",\n  "api_token": "bearer_cyberops_sec_token_098721_node_bypass",\n  "status": "fully_audited"\n}`
        }
    };

    if (difficulty !== 'easy') {
        root['/home/operator'].children.push('credentials.db');
        root['/home/operator/credentials.db'] = {
            type: 'file',
            content: `OPERATOR SQLITE DATABASE BACKUP:\n\nTABLE: admin_users\nROW 1: root_admin | ${hash} | SuperUser\nROW 2: guest_auditor | d8578edf8458ce06fbc5bb76a58c5ca4 | Reader`
        };
    }
    return root;
}

function getRealWorldDomain(server, missionId) {
    const cleanName = server.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let tld = 'com';
    let base = cleanName;
    
    if (server.subnet === 'central_gov') {
        const tlds = {
            'Swiss National Bank': 'ch',
            'Federal Reserve Bank': 'gov',
            'Bank of England': 'co.uk',
            'Reserve Bank of India': 'org.in',
            'Deutsche Bundesbank': 'de',
            'Bank of Japan': 'go.jp',
            'People\'s Bank of China': 'gov.cn',
            'Monetary Authority of Singapore': 'gov.sg',
            'Pentagon Mainframe': 'mil',
            'NSA Crypt-Core': 'gov',
            'Interpol Threat Database': 'int',
            'CERN Grid Node': 'ch',
            'NASA JPL Propulsion Node': 'nasa.gov'
        };
        tld = tlds[server.name] || 'gov';
    } else if (server.subnet === 'commercial_finance') {
        const tlds = {
            'AB Bank': 'com.bd',
            'Chase Manhattan': 'com',
            'Bank of America': 'com',
            'HSBC Holdings': 'com',
            'Barclays Finance': 'co.uk',
            'Citibank Core': 'com',
            'Wells Fargo Node': 'com',
            'Santander Bank': 'es',
            'UBS Wealth Gateway': 'ch',
            'BNP Paribas Core': 'fr',
            'Goldman Sachs Ledger': 'com',
            'Deutsche Bank Gateway': 'de',
            'Standard Chartered Node': 'com'
        };
        tld = tlds[server.name] || 'bank';
    } else if (server.subnet === 'tech_commerce') {
        const tlds = {
            'Google Auth Mainframe': 'com',
            'Amazon AWS-Core': 'com',
            'Microsoft Cloud Proxy': 'net',
            'Apple iCloud Storage': 'com',
            'Meta Data Collector': 'com',
            'Netflix Stream Hub': 'com',
            'Steam Game Server': 'com',
            'Walmart Logistics': 'com',
            'Target Retail API': 'com',
            'eBay Transaction Node': 'com',
            'PayPal Payment Ledger': 'com',
            'Stripe Gateway Route': 'network',
            'Tesla Supercharger Core': 'com'
        };
        tld = tlds[server.name] || 'com';
    } else if (server.subnet === 'personal_iot') {
        const tlds = {
            'Alex Shop': 'shop',
            'Bob Personal Server': 'me',
            'Alice Smart Fridge': 'io',
            'Smart Coffee Maker': 'coffee',
            'Local Gym Database': 'fit',
            'Bakery POS Terminal': 'shop',
            'Cafe Wi-Fi Router': 'net',
            'Personal Backup Rig': 'tech',
            'Smart Camera Hub': 'io',
            'Home Assistant Server': 'io',
            'Community Forum Host': 'org'
        };
        tld = tlds[server.name] || 'net';
    }

    const baseNames = {
        'Swiss National Bank': 'swissnationalbank',
        'Federal Reserve Bank': 'federalreserve',
        'Bank of England': 'bankofengland',
        'Reserve Bank of India': 'rbi',
        'Deutsche Bundesbank': 'bundesbank',
        'Bank of Japan': 'bankofjapan',
        'People\'s Bank of China': 'pbc',
        'Monetary Authority of Singapore': 'mas',
        'Pentagon Mainframe': 'pentagon',
        'NSA Crypt-Core': 'nsa',
        'Interpol Threat Database': 'interpol',
        'CERN Grid Node': 'cern',
        'NASA JPL Propulsion Node': 'jpl.nasa',
        'AB Bank': 'abbank',
        'Chase Manhattan': 'chase',
        'Bank of America': 'bankofamerica',
        'HSBC Holdings': 'hsbc',
        'Barclays Finance': 'barclays',
        'Citibank Core': 'citibank',
        'Wells Fargo Node': 'wellsfargo',
        'Santander Bank': 'santander',
        'UBS Wealth Gateway': 'ubs',
        'BNP Paribas Core': 'bnpparibas',
        'Goldman Sachs Ledger': 'goldmansachs',
        'Deutsche Bank Gateway': 'deutschebank',
        'Standard Chartered Node': 'standardchartered',
        'Google Auth Mainframe': 'google',
        'Amazon AWS-Core': 'amazon',
        'Microsoft Cloud Proxy': 'microsoft',
        'Apple iCloud Storage': 'apple',
        'Meta Data Collector': 'meta',
        'Netflix Stream Hub': 'netflix',
        'Steam Game Server': 'steam',
        'Walmart Logistics': 'walmart',
        'Target Retail API': 'target',
        'eBay Transaction Node': 'ebay',
        'PayPal Payment Ledger': 'paypal',
        'Stripe Gateway Route': 'stripe',
        'Tesla Supercharger Core': 'tesla',
        'Alex Shop': 'alexshop',
        'Bob Personal Server': 'bobserver',
        'Alice Smart Fridge': 'alicefridge',
        'Smart Coffee Maker': 'smartcoffee',
        'Local Gym Database': 'localgym',
        'Bakery POS Terminal': 'bakerypos',
        'Cafe Wi-Fi Router': 'cafewifi',
        'Personal Backup Rig': 'personalbackup',
        'Smart Camera Hub': 'smartcamera',
        'Home Assistant Server': 'homeassistant',
        'Community Forum Host': 'communityforum'
    };

    base = baseNames[server.name] || cleanName;
    return `${base}-node${missionId}.${tld}`;
}

function generateMission(missionId) {
    const seed = missionId * 3421;
    const rand = new SeededRandom(seed);

    const server = SERVERS_DATABASE[(missionId - 1) % 50];
    const difficulty = server.security;

    let minLvl = 1;
    let xpReward = 100;
    let creditReward = 50;
    let repReward = 10;
    let duration = '5-10 mins';

    if (difficulty === 'medium') {
        minLvl = 3;
        xpReward = 250;
        creditReward = 120;
        repReward = 30;
        duration = '15-20 mins';
    } else if (difficulty === 'hard') {
        minLvl = 8;
        xpReward = 500;
        creditReward = 300;
        repReward = 80;
        duration = '30-40 mins';
    }

    const company = server.name;
    const baseDomain = getRealWorldDomain(server, missionId);
    const hostName = server.name.toLowerCase().replace(/[^a-z0-9]/g, '') + "-" + missionId;

    let domains = [];
    if (difficulty === 'easy') {
        domains = [baseDomain, `backup.${baseDomain}`];
    } else if (difficulty === 'medium') {
        domains = [baseDomain, `api.${baseDomain}`, `auth.${baseDomain}`];
    } else {
        domains = [baseDomain, `auth.${baseDomain}`, `secure.${baseDomain}`, `backup.${baseDomain}`];
    }

    // Procedural IP derived from server base IP
    const ipParts = server.ip.split('.');
    ipParts[3] = rand.nextInt(2, 254).toString();
    const ip = ipParts.join('.');

    const passPin = rand.nextInt(1000, 9999);
    const passWord = `adminPass_${rand.choice(['core', 'node', 'sec', 'net'])}${passPin}`;
    const mockHash = md5Sim(passWord);
    const secretFlag = `FLAG{C_OPS_M_${missionId}_${rand.nextInt(100000, 999999)}`;

    const vfs = generateVirtualFileSystem(difficulty, hostName, baseDomain, passWord, mockHash, secretFlag, rand);

    const subtype = missionId % 4;
    const objectives = [];
    if (difficulty === 'easy') {
        if (subtype === 0) {
            // Subtype 0: Basic CLI & File Audit
            objectives.push({
                id: 'visit_terminal',
                text: 'Switch clearance view to terminal (Workstation) tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'terminal'
            });
            objectives.push({
                id: 'explore_system',
                text: 'Navigate VFS directory and read guest notes.txt using cat',
                completed: false,
                checkType: 'file_read',
                targetFile: '/home/guest/notes.txt'
            });
            objectives.push({
                id: 'find_password',
                text: 'Discover db credential file config.inc',
                completed: false,
                checkType: 'file_read',
                targetFile: '/var/www/config.inc'
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit retrieved operator verification flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 1) {
            // Subtype 1: Network Recon
            objectives.push({
                id: 'visit_network',
                text: 'Navigate clearance view to network (Infrastructure Map) tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'network'
            });
            objectives.push({
                id: 'ping_host',
                text: `Execute terminal command: ping ${ip}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `ping ${ip}`
            });
            objectives.push({
                id: 'dig_host',
                text: `Query system DNS resolver records: dig ${baseDomain}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `dig ${baseDomain}`
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit captured host network flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 2) {
            // Subtype 2: Settings & File Creation
            objectives.push({
                id: 'visit_settings',
                text: 'Navigate clearance view to settings (Configurations) tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'settings'
            });
            objectives.push({
                id: 'calibrate_settings',
                text: 'Calibrate shell configurations layout theme or CRT effects',
                completed: false,
                checkType: 'settings_change'
            });
            objectives.push({
                id: 'create_directory',
                text: 'Create a backup directory under operator VFS home using mkdir',
                completed: false,
                checkType: 'command_run',
                commandPrefix: 'mkdir'
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit captured backup compliance flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else {
            // Subtype 3: Burp Proxy Basics
            objectives.push({
                id: 'visit_burp',
                text: 'Navigate clearance view to BURP PROXY tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'burp'
            });
            objectives.push({
                id: 'toggle_intercept',
                text: 'Calibrate proxy intercept toggles to ACTIVE state',
                completed: false,
                checkType: 'burp_intercept'
            });
            objectives.push({
                id: 'curl_target',
                text: `Fetch target Web UI logs: curl http://${domains[0]}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `curl http://${domains[0]}`
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit intercepted diagnostic flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        }
    } else if (difficulty === 'medium') {
        if (subtype === 0) {
            // Subtype 0: Port Scan & Hash Cracking
            objectives.push({
                id: 'nmap_ports',
                text: `Execute port scan (nmap) on the target IP: ${ip}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `nmap ${ip}`
            });
            objectives.push({
                id: 'nikto_scan',
                text: `Audit target directories: nikto http://${domains[0]}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `nikto http://${domains[0]}`
            });
            objectives.push({
                id: 'inspect_tool',
                text: 'Audit nikto utility documentation in inventory-tools tab',
                completed: false,
                checkType: 'tool_inspect',
                targetTool: 'nikto'
            });
            objectives.push({
                id: 'crack_hash',
                text: 'Crack root_admin SQLite credentials password hash',
                completed: false,
                checkType: 'hash_crack',
                targetHash: mockHash,
                correctCleartext: passWord
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit core administrative database flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 1) {
            // Subtype 1: Burp Proxy Packet Manipulation
            objectives.push({
                id: 'visit_burp',
                text: 'Navigate clearance view to BURP PROXY tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'burp'
            });
            objectives.push({
                id: 'toggle_intercept',
                text: 'Toggle Burp proxy interceptor mode to ACTIVE',
                completed: false,
                checkType: 'burp_intercept'
            });
            objectives.push({
                id: 'forward_packet',
                text: 'Select and FORWARD an intercepted HTTP packet',
                completed: false,
                checkType: 'burp_forward'
            });
            objectives.push({
                id: 'replay_packet',
                text: 'Select and REPLAY/audit an intercepted HTTP packet',
                completed: false,
                checkType: 'burp_replay'
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit the captured network proxy payload flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 2) {
            // Subtype 2: Net Audit & Map Inspection
            objectives.push({
                id: 'visit_achievements',
                text: 'Navigate to achievements tab to audit unlocked rank milestones',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'achievements'
            });
            objectives.push({
                id: 'netstat_scan',
                text: 'Run terminal netstat command to analyze active connection relays',
                completed: false,
                checkType: 'command_run',
                commandPrefix: 'netstat'
            });
            objectives.push({
                id: 'inspect_map_node',
                text: `Locate, click and inspect target server node #${server.id} on Map`,
                completed: false,
                checkType: 'map_inspect',
                targetNode: server.id
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit completed infrastructure audit flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else {
            // Subtype 3: Host Diagnostics & Resolvers
            objectives.push({
                id: 'visit_leaderboard',
                text: 'Navigate to scoreboard (Leaderboard) tab to review standings',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'leaderboard'
            });
            objectives.push({
                id: 'systemctl_audit',
                text: 'Audit remote service systemd units using systemctl',
                completed: false,
                checkType: 'command_run',
                commandPrefix: 'systemctl'
            });
            objectives.push({
                id: 'nslookup_resolve',
                text: `Verify target DNS namespace details: nslookup ${baseDomain}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `nslookup ${baseDomain}`
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit the system diagnostic compliance flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        }
    } else {
        if (subtype === 0) {
            // Subtype 0: SQL Injection & SSH Brute-force
            objectives.push({
                id: 'nmap_os',
                text: `Execute advanced OS and service sweep: nmap -sV ${ip}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `nmap -sV ${ip}`
            });
            objectives.push({
                id: 'sqlmap_dbs',
                text: `Execute SQL injection dump on authentication API: sqlmap http://auth.${baseDomain}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `sqlmap http://auth.${baseDomain}`
            });
            objectives.push({
                id: 'hydra_ssh',
                text: `Brute force administrative credentials on remote SSH: hydra ssh://${domains[0]}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `hydra ssh://${domains[0]}`
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit the captured enterprise root vault flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 1) {
            // Subtype 1: Burp Proxy Attack Pivot
            objectives.push({
                id: 'inspect_map_node',
                text: `Locate, click and inspect target server node #${server.id} on Map`,
                completed: false,
                checkType: 'map_inspect',
                targetNode: server.id
            });
            objectives.push({
                id: 'visit_burp',
                text: 'Switch operative terminal workspace view to BURP PROXY tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'burp'
            });
            objectives.push({
                id: 'toggle_intercept',
                text: 'Activate Burp proxy packet interceptor',
                completed: false,
                checkType: 'burp_intercept'
            });
            objectives.push({
                id: 'forward_exploit',
                text: 'Forward an intercepted HTTP packet to execute administrative pivot',
                completed: false,
                checkType: 'burp_forward'
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Infiltrate root backups directory to submit final security flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else if (subtype === 2) {
            // Subtype 2: Containers & Orchestrator Audits
            objectives.push({
                id: 'docker_containers',
                text: 'Audit remote container deployments using docker',
                completed: false,
                checkType: 'command_run',
                commandPrefix: 'docker'
            });
            objectives.push({
                id: 'kubectl_pods',
                text: 'Inspect orchestrator state: kubectl get pods',
                completed: false,
                checkType: 'command_run',
                commandPrefix: 'kubectl'
            });
            objectives.push({
                id: 'inspect_docker_tool',
                text: 'Inspect the docker container tool binary in inventory-tools tab',
                completed: false,
                checkType: 'tool_inspect',
                targetTool: 'docker'
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit the container virtualization compliance flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        } else {
            // Subtype 3: Ultimate Cyber Operations Chain
            objectives.push({
                id: 'visit_settings',
                text: 'Switch clearance view to Configurations settings tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'settings'
            });
            objectives.push({
                id: 'visit_achievements',
                text: 'Verify clearance ranks in achievements logs tab',
                completed: false,
                checkType: 'tab_visit',
                targetTab: 'achievements'
            });
            objectives.push({
                id: 'inspect_map_node',
                text: `Locate, click and inspect target server node #${server.id} on Map`,
                completed: false,
                checkType: 'map_inspect',
                targetNode: server.id
            });
            objectives.push({
                id: 'exploit_command',
                text: `Exploit remote web node vulnerability: sqlmap http://auth.${baseDomain}`,
                completed: false,
                checkType: 'command_run',
                commandPrefix: `sqlmap http://auth.${baseDomain}`
            });
            objectives.push({
                id: 'retrieve_flag',
                text: 'Submit the root administrative compliance flag key',
                completed: false,
                checkType: 'flag_submit',
                targetFlag: secretFlag
            });
        }
    }

    const descriptions = [
        `Operational intelligence reports high vulnerability in target node ${hostName}. Audit their configuration, extract credential flags, and verify security protocols.`,
        `The secure backup server at ${baseDomain} is leaking active metadata. Your cyber operations task is to map out subdomains, locate target configurations folders, and retrieve root system validation parameters.`,
        `An internal vulnerability audit has revealed critical misconfigurations in the ${company} servers. Connect your terminal node shell directly, sweep open port channels, examine log entries, and flag flaws.`
    ];

    return {
        id: missionId,
        name: `Operation ${server.name} (${missionId})`,
        difficulty: difficulty,
        minLevel: minLvl,
        company: company,
        baseDomain: baseDomain,
        targetIP: ip,
        hostName: hostName,
        domains: domains,
        rewards: { xp: xpReward, credits: creditReward, reputation: repReward },
        duration: duration,
        description: rand.choice(descriptions),
        vfs: vfs,
        objectives: objectives,
        secretFlag: secretFlag,
        cleartextPass: passWord,
        adminHash: mockHash
    };
}

function generateAllMissions() {
    const list = [];
    for (let i = 1; i <= 1000; i++) {
        const server = SERVERS_DATABASE[(i - 1) % 50];
        const difficulty = server.security;
        const company = server.name;
        const baseDomain = getRealWorldDomain(server, i);
        const xp = difficulty === 'easy' ? 100 : (difficulty === 'medium' ? 250 : 500);
        const credits = difficulty === 'easy' ? 50 : (difficulty === 'medium' ? 120 : 300);

        list.push({
            id: i,
            name: `Operation ${server.name} (${i})`,
            difficulty: difficulty,
            company: company,
            baseDomain: baseDomain,
            xp: xp,
            credits: credits
        });
    }
    return list;
}

/* ==========================================================================
   PART IV. SANDBOXED TERMINAL ENGINE (Virtual CLI Parser)
   ========================================================================== */
class TerminalShell {
    constructor() {
        this.history = [];
        this.historyIdx = -1;
        this.currentEditorFile = null;
        store.subscribe((state) => {
            this.username = state.username;
            this.vfs = state.activeVFS || {};
            this.currentDir = state.activeDirectory || '/';
            this.activeMission = state.activeMission;
            this.objectives = state.activeObjectives || [];
        });
    }

    execute(cmdString) {
        cmdString = cmdString.trim();
        if (!cmdString) return '';
        this.history.push(cmdString);
        this.historyIdx = this.history.length;

        const parts = cmdString.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        const state = store.state;
        const levelRestrictions = {
            'sqlmap': 3,
            'hydra': 5,
            'hashcat': 3,
            'kubectl': 8,
            'kubeview': 8,
            'docker': 8,
            'docker-audit': 8
        };

        if (levelRestrictions[command] && state.level < levelRestrictions[command]) {
            sfx.playError();
            return `bash: ${command}: command not found. (Security clearance rank too low! Requires Level ${levelRestrictions[command]}.)`;
        }

        // Track used tools
        const validTools = ['help', 'clear', 'pwd', 'ls', 'cd', 'cat', 'mkdir', 'grep', 'find', 'nano', 'ping', 'whois', 'traceroute', 'dig', 'curl', 'nmap', 'sqlmap', 'nikto', 'hydra', 'hashcat', 'submit', 'nslookup', 'netstat', 'ipcalc', 'wget', 'gobuster', 'dirb', 'dirhunt', 'whoami', 'ifconfig', 'ip', 'arp', 'arpwatch', 'route', 'routeview', 'ps', 'top', 'htop', 'systemctl', 'journalctl', 'docker', 'docker-view', 'docker-audit', 'kubectl', 'kubeview'];
        if (validTools.includes(command)) {
            const currentUsed = state.usedTools || [];
            if (!currentUsed.includes(command)) {
                store.set({ usedTools: [...currentUsed, command] });
            }
        }

        sfx.playEnter();

        switch (command) {
            case 'help':
                return this.cmdHelp(args);
            case 'clear':
                return 'CLEAR_SCREEN';
            case 'pwd':
                return this.cmdPwd();
            case 'ls':
                return this.cmdLs(args);
            case 'cd':
                return this.cmdCd(args);
            case 'cat':
                return this.cmdCat(args);
            case 'mkdir':
                return this.cmdMkdir(args);
            case 'grep':
                return this.cmdGrep(args);
            case 'find':
                return this.cmdFind(args);
            case 'nano':
                return this.cmdNano(args);
            case 'ping':
                return this.cmdPing(args);
            case 'whois':
                return this.cmdWhois(args);
            case 'traceroute':
                return this.cmdTraceroute(args);
            case 'dig':
                return this.cmdDig(args);
            case 'curl':
                return this.cmdCurl(args);
            case 'nmap':
                return this.cmdNmap(args);
            case 'sqlmap':
                return this.cmdSqlmap(args);
            case 'nikto':
                return this.cmdNikto(args);
            case 'hydra':
                return this.cmdHydra(args);
            case 'hashcat':
                return this.cmdHashcat(args);
            case 'submit':
                return this.cmdSubmit(args);
            case 'nslookup':
                return this.cmdNslookup(args);
            case 'netstat':
                return this.cmdNetstat(args);
            case 'ipcalc':
                return this.cmdIpcalc(args);
            case 'wget':
                return this.cmdWget(args);
            case 'gobuster':
            case 'dirb':
            case 'dirhunt':
                return this.cmdGobuster(args);
            case 'whoami':
                return this.cmdWhoami();
            case 'ifconfig':
            case 'ip':
                return this.cmdIfconfig(args);
            case 'arp':
            case 'arpwatch':
                return this.cmdArp();
            case 'route':
            case 'routeview':
                return this.cmdRoute();
            case 'ps':
                return this.cmdPs();
            case 'top':
            case 'htop':
                return this.cmdTop();
            case 'systemctl':
                return this.cmdSystemctl();
            case 'journalctl':
                return this.cmdJournalctl();
            case 'docker':
            case 'docker-view':
            case 'docker-audit':
                return this.cmdDocker(args);
            case 'kubectl':
            case 'kubeview':
                return this.cmdKubectl(args);
            default:
                sfx.playError();
                return `bash: ${command}: command not found. Type "help" for list of operational tools.`;
        }
    }

    checkObjectiveFulfillment(type, value, extra = '') {
        if (!this.activeMission) return;
        let updated = false;
        const nextObjs = this.objectives.map(obj => {
            if (obj.completed) return obj;
            let isDone = false;
            if (obj.checkType === 'command_run' && type === 'command') {
                if (value.toLowerCase().startsWith(obj.commandPrefix.toLowerCase())) {
                    isDone = true;
                }
            } else if (obj.checkType === 'file_read' && type === 'file_read') {
                if (obj.targetFile === value) {
                    isDone = true;
                }
            } else if (obj.checkType === 'hash_crack' && type === 'hash_crack') {
                if (obj.targetHash === value && extra === obj.correctCleartext) {
                    isDone = true;
                }
            } else if (obj.checkType === 'flag_submit' && type === 'flag_submit') {
                if (obj.targetFlag === value) {
                    isDone = true;
                }
            } else if (obj.checkType === 'tab_visit' && type === 'tab_visit') {
                if (obj.targetTab === value) {
                    isDone = true;
                }
            } else if (obj.checkType === 'burp_intercept' && type === 'burp_intercept') {
                isDone = true;
            } else if (obj.checkType === 'burp_forward' && type === 'burp_forward') {
                isDone = true;
            } else if (obj.checkType === 'burp_replay' && type === 'burp_replay') {
                isDone = true;
            } else if (obj.checkType === 'settings_change' && type === 'settings_change') {
                isDone = true;
            } else if (obj.checkType === 'map_inspect' && type === 'map_inspect') {
                if (obj.targetNode === value || obj.targetNode === 'any') {
                    isDone = true;
                }
            } else if (obj.checkType === 'tool_inspect' && type === 'tool_inspect') {
                if (obj.targetTool === value || obj.targetTool === 'any') {
                    isDone = true;
                }
            }

            if (isDone) {
                updated = true;
                sfx.playSuccess();
                return { ...obj, completed: true };
            }
            return obj;
        });

        if (updated) {
            store.set({ activeObjectives: nextObjs });
            const allDone = nextObjs.every(o => o.completed);
            if (allDone) {
                this.completeActiveMission();
            }
        }
    }

    completeActiveMission() {
        const mission = this.activeMission;
        if (!mission) return;
        if (store.state.completedMissions.includes(mission.id)) return;

        const rewards = mission.rewards;
        const compList = [...store.state.completedMissions, mission.id];
        store.set({
            completedMissions: compList,
            credits: store.state.credits + rewards.credits,
            reputation: store.state.reputation + rewards.reputation
        });
        store.addXP(rewards.xp);

        setTimeout(() => { sfx.playSuccess(); }, 300);
        setTimeout(() => {
            const successText = `\n=======================================================\n[ACCESS COMPLIANCE VALIDATED - DEPLOYMENT COMPLETED]\n=======================================================\nMISSION SECURED: ${mission.name}\nREWARDS ACQUIRED:\n  - XP: +${rewards.xp}\n  - CREDITS: +${rewards.credits} c\n  - REPUTATION: +${rewards.reputation} rep\n\nProfile credentials synchronized successfully with secure node!\n=======================================================\n`;
            const termScreen = document.getElementById('terminal-output-container');
            if (termScreen) {
                termScreen.innerHTML += successText;
                const scrollEl = document.getElementById('terminal-screen-element');
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
            }
        }, 1200);
    }

    cmdHelp(args) {
        return `CYBEROPS OS TERMINAL v1.4.0 — INTEGRATED SECURITY TOOLS CATALOG
=================================================================================
1. Core Linux:  ls, cd, pwd, cat, mkdir, grep, find, nano, ps, top, whoami, ifconfig
2. Network:     ping, traceroute, whois, dig, nslookup, netstat, ipcalc, arp, route
3. Web Audit:   curl, wget, gobuster, dirb, dirhunt, nikto
4. DB Audit:    sqlmap (LVL 3)
5. Secrets:     hashcat (LVL 3), hydra (LVL 5)
6. Enterprise:  docker (LVL 8), kubectl (LVL 8), kubeview (LVL 8)

Type any command followed by '--help' or '-h' for real-world manual pages!
Type 'submit [flag]' to verify and complete active operational missions.
=================================================================================`;
    }

    cmdPwd() { return this.currentDir; }

    cmdLs(args) {
        const path = args[0] || '';
        const targetPath = this.resolvePath(path);
        const node = this.vfs[targetPath];
        if (!node) return `ls: cannot access '${path}': No such file or directory`;
        if (node.type === 'file') return path;

        if (args.includes('-la') || args.includes('-la')) {
            return node.children.map(name => {
                const childPath = targetPath === '/' ? `/${name}` : `${targetPath}/${name}`;
                const childNode = this.vfs[childPath];
                const typeChar = childNode.type === 'dir' ? 'd' : '-';
                return `${typeChar}rwxr-xr-x 1 www-data operator 4096 May 22 18:00 ${name}`;
            }).join('\n');
        }
        return node.children.join('    ');
    }

    cmdCd(args) {
        const path = args[0] || '/';
        const targetPath = this.resolvePath(path);
        const node = this.vfs[targetPath];
        if (!node) return `cd: no such file or directory: ${path}`;
        if (node.type === 'file') return `cd: not a directory: ${path}`;
        store.set({ activeDirectory: targetPath });
        return '';
    }

    cmdCat(args) {
        const filename = args[0];
        if (!filename) return `cat: missing file operand`;
        const path = this.resolvePath(filename);
        const node = this.vfs[path];
        if (!node) return `cat: ${filename}: No such file or directory`;
        if (node.type === 'dir') return `cat: ${filename}: Is a directory`;
        this.checkObjectiveFulfillment('file_read', path);
        return node.content;
    }

    cmdMkdir(args) {
        const name = args[0];
        if (!name) return `mkdir: missing operand`;
        const path = this.resolvePath(name);
        if (this.vfs[path]) return `mkdir: cannot create directory '${name}': File exists`;

        const lastSlash = path.lastIndexOf('/');
        const parentPath = lastSlash === 0 ? '/' : path.substring(0, lastSlash);
        const folderName = path.substring(lastSlash + 1);

        const parentNode = this.vfs[parentPath];
        if (!parentNode || parentNode.type !== 'dir') return `mkdir: parent path directory missing`;

        const updatedVFS = { ...this.vfs };
        updatedVFS[parentPath] = {
            ...parentNode,
            children: [...parentNode.children, folderName]
        };
        updatedVFS[path] = { type: 'dir', children: [] };
        store.set({ activeVFS: updatedVFS });
        return '';
    }

    cmdGrep(args) {
        const pattern = args[0];
        const filename = args[1];
        if (!pattern || !filename) return `usage: grep [pattern] [filename]`;
        const path = this.resolvePath(filename);
        const node = this.vfs[path];
        if (!node) return `grep: ${filename}: No such file or directory`;
        if (node.type === 'dir') return `grep: ${filename}: Is a directory`;

        const lines = node.content.split('\n');
        const matches = lines.filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
        return matches.join('\n');
    }

    cmdFind(args) {
        const pattern = args[0] || '';
        const results = [];
        Object.keys(this.vfs).forEach(path => {
            const basename = path.substring(path.lastIndexOf('/') + 1);
            if (basename.toLowerCase().includes(pattern.toLowerCase())) {
                results.push(path);
            }
        });
        return results.join('\n');
    }

    cmdNano(args) {
        const filename = args[0];
        if (!filename) return `nano: missing file name.`;
        const path = this.resolvePath(filename);
        const node = this.vfs[path];
        if (node && node.type === 'dir') {
            sfx.playError();
            return `nano: cannot open directory '${filename}' for editing.`;
        }
        this.currentEditorFile = path;
        const editorTextarea = document.getElementById('nano-editor-textarea');
        const editorLabel = document.getElementById('nano-file-editing-label');
        const editorPanel = document.getElementById('nano-editor-panel');
        if (editorTextarea && editorLabel && editorPanel) {
            editorLabel.textContent = `Editing VFS File: ${path}`;
            editorTextarea.value = node ? node.content : '';
            editorPanel.style.display = 'flex';
            editorTextarea.focus();
        }
        return 'OPEN_EDITOR_TRIGGERED';
    }

    saveNanoContent(text) {
        if (!this.currentEditorFile) return;
        const path = this.currentEditorFile;
        const lastSlash = path.lastIndexOf('/');
        const parentPath = lastSlash === 0 ? '/' : path.substring(0, lastSlash);
        const folderName = path.substring(lastSlash + 1);

        const updatedVFS = { ...this.vfs };
        if (!updatedVFS[path]) {
            const parent = updatedVFS[parentPath];
            if (parent && parent.type === 'dir') {
                updatedVFS[parentPath] = {
                    ...parent,
                    children: [...parent.children, folderName]
                };
            }
        }
        updatedVFS[path] = { type: 'file', content: text };
        store.set({ activeVFS: updatedVFS });
        this.currentEditorFile = null;
    }

    cmdPing(args) {
        const target = args[0];
        if (!target) return `ping: missing host target address.`;
        this.checkObjectiveFulfillment('command', `ping ${target}`);
        return `PING ${target} (56 bytes of data).
64 bytes from ${target}: icmp_seq=1 ttl=64 time=24.2 ms
64 bytes from ${target}: icmp_seq=2 ttl=64 time=26.8 ms
64 bytes from ${target}: icmp_seq=3 ttl=64 time=24.0 ms`;
    }

    cmdWhois(args) {
        const target = args[0];
        if (!target) return `whois: missing domain.`;
        this.checkObjectiveFulfillment('command', `whois ${target}`);
        return `Domain Name: ${target}\nRegistrar: CyberOps Registrar Security Group\nCreation Date: 2024-05-10T12:00:00Z`;
    }

    cmdTraceroute(args) {
        const target = args[0];
        if (!target) return `traceroute: missing address.`;
        this.checkObjectiveFulfillment('command', `traceroute ${target}`);
        return `traceroute to ${target} (30 hops max, 60 byte packets)
 1  gateway.local (10.0.0.1)  1.23 ms\n 2  core-router.cyberops.local (10.0.10.1)  8.40 ms\n 3  ${target}  24.12 ms`;
    }

    cmdDig(args) {
        const target = args[0];
        if (!target) return `dig: missing domain query parameter.`;
        this.checkObjectiveFulfillment('command', `dig ${target}`);
        return `; <<>> DiG 9.18 <<>> ${target}\n;; ANSWER SECTION:\n${target}.   3600 IN A ${this.activeMission ? this.activeMission.targetIP : '10.0.1.5'}`;
    }

    cmdCurl(args) {
        const url = args[0];
        if (!url) return `curl: missing URL target.`;
        this.checkObjectiveFulfillment('command', `curl ${url}`);
        if (url.includes('api') && this.activeMission) {
            return `{\n  "status": "success",\n  "node": "${this.activeMission.hostName}",\n  "auditing_hash": "${this.activeMission.adminHash}"\n}`;
        }
        return `HTTP/1.1 200 OK\nServer: Nginx/1.24.0\n\n<!DOCTYPE html><html><body><h1>CyberOps Default Node</h1></body></html>`;
    }

    cmdNmap(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `Nmap 7.92 ( https://nmap.org )
Usage: nmap [Scan Type(s)] [Options] {target specification}
OPTIONS:
  -sV: Probe open ports to determine service info
  -sS: TCP SYN stealth port scan
  -O: Enable OS detection
  -A: Enable OS detection, version detection, script scanning, and traceroute`;
        }
        const target = args.find(a => !a.startsWith('-')) || (this.activeMission ? this.activeMission.targetIP : '');
        if (!target) return `nmap: missing scan target address.`;
        this.checkObjectiveFulfillment('command', `nmap ${target}`);
        if (!this.activeMission) {
            return `Nmap scan report for local-gateway.local (10.0.1.1)\nHost is up (0.015s latency).\nAll 1000 scanned ports are: closed`;
        }
        const isHard = this.activeMission.difficulty === 'hard';
        const isMed = this.activeMission.difficulty === 'medium';
        return `Starting Nmap 7.92 ( https://nmap.org ) at 2026-05-22 18:30
Nmap scan report for ${this.activeMission.baseDomain} (${this.activeMission.targetIP})
Host is up (0.024s latency).
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http  Nginx/1.24.0
${isMed || isHard ? '3306/tcp open  mysql\n8080/tcp open  http-proxy  Node.js API' : ''}
${isHard ? '443/tcp  open  https\n6379/tcp open  redis  v6.2.6\n9000/tcp open  waf-diagnostic' : ''}`;
    }

    cmdSqlmap(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `sqlmap 1.7.2 - automatic SQL injection tool
Usage: sqlmap [options]
OPTIONS:
  -u URL, --url=URL   Target URL (e.g. "http://www.site.com/vuln.php?id=1")
  --dbs               Detect/dump active database engines
  --tables            Detect/dump tables in target database`;
        }
        const target = args.find(a => !a.startsWith('-')) || (this.activeMission ? `http://${this.activeMission.baseDomain}` : '');
        if (!target) return `sqlmap: missing URL parameter.`;
        this.checkObjectiveFulfillment('command', `sqlmap ${target}`);
        if (!this.activeMission) {
            return `sqlmap v1.7.2 - automatic SQL injection tool\n[!] ERROR: no vulnerable query parameters found.`;
        }
        return `sqlmap/1.7.2-dev - automatic SQL injection tool
[INFO] checking database engine type: SQLite
[INFO] confirming vulnerability: injection parameter 'id' is exploitable
Database: cyberops_target\nTable: users\n[2 entries]
+----+-------------+----------------------------------+-----------+
| id | username    | password_hash                    | role      |
+----+-------------+----------------------------------+-----------+
| 1  | root_admin  | ${this.activeMission.adminHash} | SuperUser |
| 2  | auditor     | d8578edf8458ce06fbc5bb76a58c5ca4 | Reader    |
+----+-------------+----------------------------------+-----------+`;
    }

    cmdNikto(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `Nikto v2.1.6
Usage: nikto -h [host] [options]`;
        }
        const target = args.find(a => !a.startsWith('-')) || (this.activeMission ? `http://${this.activeMission.baseDomain}` : '');
        if (!target) return `nikto: missing host parameter.`;
        this.checkObjectiveFulfillment('command', `nikto ${target}`);
        if (!this.activeMission) return `- Nikto v2.1.6\n+ No misconfigurations identified.`;
        return `- Nikto v2.1.6
+ Target IP:          ${this.activeMission.targetIP}
+ Server: Nginx/1.24.0
+ [VULNERABILITY] Exposed dev config backup found: http://${this.activeMission.baseDomain}/var/www/config.inc
+ [INFO] Found administrative entry point: http://${this.activeMission.baseDomain}/admin_backdoor`;
    }

    cmdHydra(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `Hydra v9.3-dev
Usage: hydra [[[-l login|-L file] [-p pass|-P file]] | [-C file]] [-e nsr] [-o file] [-t tasks] service://server[:port][/receiver]`;
        }
        const target = args.find(a => !a.startsWith('-')) || (this.activeMission ? `ssh://${this.activeMission.targetIP}` : '');
        if (!target) return `hydra: missing target configuration. (e.g. hydra ssh://10.0.1.5)`;
        this.checkObjectiveFulfillment('command', `hydra ${target}`);
        if (!this.activeMission) return `Hydra v9.3\n[ERROR] target connection failed.`;
        return `Hydra v9.3-dev (c) 2026 by CyberOps Labs
[SSH] BINGO! Found valid credentials for ${this.activeMission.targetIP}:
  login: root_admin
  password: ${this.activeMission.cleartextPass}`;
    }

    cmdHashcat(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `hashcat v6.2.5
Usage: hashcat [options]... hash|hashfile|hcdevice [dictionary|mask|directory]...
OPTIONS:
  -m, --hash-type=NUM           Hash type (MD5 is 0)
  -a, --attack-mode=NUM         Attack mode (Straight is 0)`;
        }
        const hash = args.find(a => !a.startsWith('-')) || (this.activeMission ? this.activeMission.adminHash : '');
        if (!hash) return `hashcat: missing target md5 hash parameter.`;
        if (!this.activeMission) return `Hashcat v6.2.5\n[!] Hash load error.`;
        return `CRACK_SIMULATION:${hash}`;
    }

    cmdSubmit(args) {
        const flag = args[0];
        if (!flag) return `submit: missing flag key parameters.`;
        if (!this.activeMission) {
            sfx.playError();
            return `submit: no active operations connection. Deploy a mission first.`;
        }
        if (flag === this.activeMission.secretFlag) {
            this.checkObjectiveFulfillment('flag_submit', flag);
            return `[SUCCESS] Verification flag accepted! Database credentials and operations compliance fully validated.`;
        } else {
            sfx.playError();
            return `[ACCESS DENIED] flag verification key is invalid. Examine configurations logs more closely.`;
        }
    }

    cmdWhoami() {
        return this.activeMission ? "root_admin" : "guest_auditor";
    }

    cmdIfconfig(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: ifconfig [interface] [options] | ip a";
        }
        const ip = this.activeMission ? this.activeMission.targetIP : "127.0.0.1";
        return `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${ip}  netmask 255.255.255.0  broadcast ${ip.substring(0, ip.lastIndexOf('.')) + '.255'}
        ether 52:54:00:12:34:56  txqueuelen 1000  (Ethernet)
        RX packets 1042  bytes 124501
        TX packets 854  bytes 98412

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        loopback  txqueuelen 1000  (Local Loopback)`;
    }

    cmdNslookup(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: nslookup [domain] [dns-server]";
        }
        const target = args[0];
        if (!target) return "nslookup: missing domain parameter";
        const ip = this.activeMission ? this.activeMission.targetIP : "10.0.1.5";
        return `Server:         8.8.8.8
Address:        8.8.8.8#53

Non-authoritative answer:
Name:   ${target}
Address: ${ip}`;
    }

    cmdNetstat(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: netstat [-a] [-t] [-u] [-n]";
        }
        const ip = this.activeMission ? this.activeMission.targetIP : "10.0.1.5";
        return `Active Internet connections (w/o servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 127.0.0.1:3306          127.0.0.1:48212         ESTABLISHED
tcp        0      0 ${ip}:22                172.16.80.12:52110      ESTABLISHED
tcp        0      0 ${ip}:80                192.168.1.15:44312      TIME_WAIT`;
    }

    cmdIpcalc(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: ipcalc [address]/[prefix]";
        }
        const target = args[0] || "192.168.1.0/24";
        return `Address:   192.168.1.0          11000000.10101000.00000001. 00000000
Netmask:   255.255.255.0 = 24   11111111.11111111.11111111. 00000000
Wildcard:  0.0.0.255            00000000.00000000.00000000. 11111111
=>
Network:   192.168.1.0/24       11000000.10101000.00000001. 00000000
HostMin:   192.168.1.1          11000000.10101000.00000001. 00000001
HostMax:   192.168.1.254        11000000.10101000.00000001. 11111110
Broadcast: 192.168.1.255        11000000.10101000.00000001. 11111111
Hosts/Net: 254                  Class C Subnet`;
    }

    cmdArp() {
        return `Address                  HWtype  HWaddress           Flags Mask            Iface
10.0.0.1                 ether   52:54:00:12:34:56   C                     eth0
192.168.1.1              ether   52:54:00:98:76:54   C                     eth0`;
    }

    cmdRoute() {
        return `Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         10.0.0.1        0.0.0.0         UG    100    0        0 eth0
10.0.0.0        0.0.0.0         255.255.255.0   U     100    0        0 eth0`;
    }

    cmdWget(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: wget [options]... [URL]...";
        }
        const url = args[0];
        if (!url) return "wget: missing URL parameter";
        return `--2026-05-23 13:30:00--  http://${url}/
Resolving ${url}... 192.168.1.42
Connecting to ${url}|192.168.1.42|:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 4096 (4K) [text/html]
Saving to: 'index.html'

index.html          100%[===================>]   4.00K  --.-KB/s    in 0.05s   

2026-05-23 13:30:00 (80.0 KB/s) - 'index.html' saved [4096/4096]`;
    }

    cmdGobuster(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return `Usage: gobuster [mode] [options]\nAvailable Modes:\n  dir     Brute force directories\n  dns     Brute force subdomains`;
        }
        if (args.length === 0) {
            return `Usage: gobuster dir -u [url] -w [wordlist]\nTry "gobuster dir -u http://abbank.local -w common.txt" to audit target directories.`;
        }
        const urlArg = args.find(a => a.startsWith('http')) || (this.activeMission ? `http://${this.activeMission.baseDomain}` : "http://localhost");
        return `===============================================================
Gobuster v3.5 - Web Directory Auditer
===============================================================
[+] Url:                     ${urlArg}
[+] Method:                  GET
[+] Threads:                 10
[+] Wordlist:                /usr/share/wordlists/dirb/common.txt
===============================================================
/index.html           (Status: 200) [Size: 521]
/assets               (Status: 301) [Size: 154]
/admin_backdoor       (Status: 200) [Size: 1024]
/var/www/config.inc   (Status: 200) [Size: 342]
/robots.txt           (Status: 200) [Size: 125]
===============================================================`;
    }

    cmdPs() {
        return `PID TTY          TIME CMD
  1 pts/0    00:00:00 init
102 pts/0    00:00:01 sshd
242 pts/0    00:00:00 bash
512 pts/0    00:00:00 ps`;
    }

    cmdTop() {
        return `top - 13:30:42 up  2:04,  1 user,  load average: 0.02, 0.05, 0.08
Tasks: 42 total,   1 running,  41 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.2 us,  0.4 sy,  0.0 ni, 98.4 id,  0.0 wa,  0.0 hi,  0.0 si
MiB Mem :  16384.0 total,   8192.0 free,   4096.0 used,   4096.0 buff/cache

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  102 www-data  20   0  712412  32412  21412 S   0.7   0.2   0:01.42 sshd
    1 root      20   0    8412   1241    912 S   0.0   0.0   0:00.05 init
  242 operator  20   0   14124   4212   3102 S   0.0   0.0   0:00.08 bash`;
    }

    cmdSystemctl() {
        return `UNIT                 LOAD   ACTIVE SUB     DESCRIPTION
ssh.service          loaded active running OpenSSH Daemon
nginx.service        loaded active running Nginx HTTP Server
mysql.service        loaded active running MySQL Database Server
firewall.service     loaded active running WAF Edge Protection`;
    }

    cmdJournalctl() {
        return `May 23 11:20:00 kernel: Initializing kernel VFS stack modules...
May 23 11:20:04 systemd[1]: Started OpenSSH Daemon.
May 23 11:20:12 nginx[142]: Started Nginx Web Proxy Server.
May 23 11:21:44 sshd[102]: Accepted root_admin credentials from 192.168.10.15 port 42104.
May 23 11:21:46 systemd[1]: Started User Manager for UID 1000.`;
    }

    cmdDocker(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: docker ps | docker exec | docker audit";
        }
        if (args.includes('ps')) {
            return `CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                  NAMES
a8f102c4b8e2   nginx:alpine   "/docker-entrypoint.…"   2 hours ago     Up 2 hours     0.0.0.0:80->80/tcp     web-proxy
d9c12b4e8e19   mysql:8.0      "docker-entrypoint.s…"   2 hours ago     Up 2 hours     3306/tcp               mysql-db`;
        }
        return `Usage: docker ps | docker exec | docker audit\nInspect running target containers.`;
    }

    cmdKubectl(args) {
        if (args.includes('--help') || args.includes('-h')) {
            return "Usage: kubectl [command] [options]";
        }
        return `NAME                            READY   STATUS    RESTARTS   AGE
pod/auth-deployment-84f98       1/1     Running   0          42m
pod/db-cluster-node-0           1/1     Running   0          42m
service/kubernetes              1/1     ClusterIP 0          2h`;
    }

    resolvePath(path) {
        if (!path) return this.currentDir;
        if (path.startsWith('/')) return this.normalizePath(path);
        const base = this.currentDir === '/' ? '' : this.currentDir;
        return this.normalizePath(`${base}/${path}`);
    }

    normalizePath(path) {
        const parts = path.split('/');
        const stack = [];
        for (const part of parts) {
            if (part === '' || part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return '/' + stack.join('/');
    }
}
const shell = new TerminalShell();

/* ==========================================================================
   PART V. INTERACTIVE TOPOLOGY GRAPH (2D Canvas mapping)
   ========================================================================== */
class NetworkTopology {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.nodes = [];
        this.links = [];
        this.packets = [];
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.dragNode = null;
        this.hoverNode = null;
        this.activeNode = null;
        this.isDragging = false;
        
        store.subscribe((state) => {
            if (state.activeMissionId !== this.activeMissionId) {
                this.activeMissionId = state.activeMissionId;
                this.buildActiveTopology(state.activeMission);
            }
        });
    }

    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        const parent = this.canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.width = rect.width || 800;
        this.height = rect.height || 500;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
    }

    spawnPacket(sourceIp, destIp) {
        const s = this.nodes.find(n => n.ip === sourceIp);
        const t = this.nodes.find(n => n.ip === destIp);
        if (s && t) {
            this.packets.push({ s: s, t: t, pct: 0, speed: 0.005 + Math.random() * 0.008 });
        }
    }

    buildActiveTopology(mission) {
        this.nodes = [];
        this.links = [];
        this.packets = [];

        // Dynamic viewport/canvas dimensions centering
        const w = this.width || 800;
        const h = this.height || 500;
        
        // Spaced centers further towards screen edges to expand layout area
        const centers = {
            central_gov: { x: w * 0.72, y: h * 0.25 },
            commercial_finance: { x: w * 0.28, y: h * 0.25 },
            tech_commerce: { x: w * 0.72, y: h * 0.75 },
            personal_iot: { x: w * 0.28, y: h * 0.75 }
        };

        // Increased orbital radius to spread nodes widely across quadrants
        const radius = Math.min(w, h) * 0.18;

        // Group servers by subnet to calculate perfect orbital spacing angles
        const groups = {
            central_gov: SERVERS_DATABASE.filter(s => s.subnet === 'central_gov'),
            commercial_finance: SERVERS_DATABASE.filter(s => s.subnet === 'commercial_finance'),
            tech_commerce: SERVERS_DATABASE.filter(s => s.subnet === 'tech_commerce'),
            personal_iot: SERVERS_DATABASE.filter(s => s.subnet === 'personal_iot')
        };

        const coords = {};
        Object.keys(groups).forEach(subnet => {
            const list = groups[subnet];
            const center = centers[subnet];
            list.forEach((server, index) => {
                const angle = (index / list.length) * 2 * Math.PI;
                coords[server.id] = {
                    x: center.x + radius * Math.cos(angle),
                    y: center.y + radius * Math.sin(angle),
                    angle: angle // Store the orbital angle
                };
            });
        });

        // Build all 50 global coordinate nodes
        this.nodes = SERVERS_DATABASE.map(server => {
            let type = 'web';
            if (server.subnet === 'central_gov') type = 'firewall';
            else if (server.subnet === 'commercial_finance') type = 'db';
            else if (server.subnet === 'personal_iot') type = 'router';

            let status = 'safe';
            const isActiveTarget = mission && ((mission.id - 1) % 50 === server.id);
            const isCompromised = store.state.completedMissions.some(mId => (mId - 1) % 50 === server.id);

            if (isActiveTarget) {
                status = 'scanning';
            } else if (isCompromised) {
                status = 'compromised';
            }

            const pos = coords[server.id] || { x: server.x, y: server.y, angle: 0 };

            // Determine type-specific glowing core color
            let nodeColor = '#FFFFFF'; // default web
            if (type === 'firewall') nodeColor = '#FF3C38';
            else if (type === 'db') nodeColor = '#B026FF';
            else if (type === 'router') nodeColor = '#00FFFF';

            return {
                id: server.id.toString(),
                label: server.name,
                ip: isActiveTarget ? mission.targetIP : server.ip,
                type: type,
                subnet: server.subnet,
                status: status,
                color: nodeColor,
                x: pos.x,
                y: pos.y,
                angle: pos.angle
            };
        });

        // Setup organic interconnected grid topology links
        const addLink = (sourceId, targetId) => {
            const s = sourceId.toString();
            const t = targetId.toString();
            const exists = this.links.some(l => (l.source === s && l.target === t) || (l.source === t && l.target === s));
            if (!exists) {
                this.links.push({ source: s, target: t });
            }
        };

        // 1. Intra-subnet rings and structural wiring meshes
        // Central Gov Subnet A (0 to 12)
        for (let i = 0; i < 13; i++) {
            addLink(i, (i + 1) % 13);
        }
        addLink(1, 6);
        addLink(3, 8);
        addLink(5, 10);

        // Commercial Finance Subnet B (13 to 25)
        for (let i = 13; i < 26; i++) {
            const nextIdx = 13 + ((i - 13 + 1) % 13);
            addLink(i, nextIdx);
        }
        addLink(14, 20);
        addLink(16, 22);
        addLink(18, 24);

        // Tech Giants Subnet C (26 to 38)
        for (let i = 26; i < 39; i++) {
            const nextIdx = 26 + ((i - 26 + 1) % 13);
            addLink(i, nextIdx);
        }
        addLink(27, 33);
        addLink(29, 35);
        addLink(31, 37);

        // Personal & IoT Subnet D (39 to 49)
        for (let i = 39; i < 50; i++) {
            const nextIdx = 39 + ((i - 39 + 1) % 11);
            addLink(i, nextIdx);
        }
        addLink(40, 45);
        addLink(42, 47);

        // 2. Cross-subnet router gateway links forming cohesive global cyber mesh
        addLink(1, 14);  // Federal Reserve to Chase
        addLink(9, 26);  // NSA to Google Auth
        addLink(23, 27); // Goldman Sachs to Amazon AWS
        addLink(19, 39); // Wells Fargo to Alex Shop
        addLink(37, 49); // Stripe Gateway to Community Forum
    }

    animate() {
        if (!this.canvas || !this.ctx) return;
        requestAnimationFrame(() => this.animate());
        
        // Self-healing canvas resize and coordinate rebuild on element size change
        const parent = this.canvas.parentElement;
        const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (rect.width > 0 && rect.height > 0 && (this.width !== rect.width || this.height !== rect.height)) {
            this.resize();
            this.buildActiveTopology(store.state.activeMission);
        }

        // Apply High-DPI physical scale multiplier
        this.ctx.save();
        this.ctx.scale(dpr, dpr);

        this.ctx.fillStyle = '#070707';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();
        this.ctx.translate(this.pan.x + this.width / 2, this.pan.y + this.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.width / 2, -this.height / 2);

        this.links.forEach(link => {
            const s = this.nodes.find(n => n.id === link.source);
            const t = this.nodes.find(n => n.id === link.target);
            if (!s || !t) return;

            this.ctx.beginPath();
            if (s.subnet !== t.subnet) {
                // Public Traffic (cross-subnet gateway relays) -> Dashed Cyan lines
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
                this.ctx.setLineDash([4, 4]);
            } else {
                // Internal Network (intra-subnet links) -> Solid Gray lines
                this.ctx.strokeStyle = '#2E2E2E';
                this.ctx.setLineDash([]);
            }
            this.ctx.lineWidth = 1.25;
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(t.x, t.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash pattern

            if (Math.random() < 0.015 && this.packets.length < 30) {
                this.packets.push({ s: s, t: t, pct: 0, speed: 0.005 + Math.random() * 0.008 });
            }
        });

        this.packets.forEach((p, idx) => {
            p.pct += p.speed;
            if (p.pct >= 1) {
                // If Burp Suite Intercept is ACTIVE, capture this exact packet in real-time!
                if (window.isBurpIntercepting) {
                    const pool = MOCK_INFO_POOLS[Math.floor(Math.random() * MOCK_INFO_POOLS.length)];
                    let proto = pool.proto;
                    if (p.s.type === 'db' || p.t.type === 'db') proto = 'SQL';
                    else if (p.s.type === 'firewall' || p.t.type === 'firewall') proto = 'TCP';

                    const newPkt = {
                        id: `P_${generatedPacketIndex++}`,
                        protocol: proto,
                        source: p.s.ip,
                        destination: p.t.ip,
                        length: `${Math.floor(Math.random() * 380) + 50} B`,
                        info: pool.info,
                        hexDecompilation: pool.hex
                    };

                    BURP_PACKETS_DATABASE.unshift(newPkt);
                    if (BURP_PACKETS_DATABASE.length > 12) {
                        BURP_PACKETS_DATABASE.pop();
                    }

                    if (typeof window.renderBurpPacketTable === 'function') {
                        window.renderBurpPacketTable();
                    }
                }
                this.packets.splice(idx, 1);
                return;
            }

            // Dynamic packet color matching active scanning/compromised status
            let packetColor = '#00FF66'; // default green active
            if (p.s.status === 'scanning' || p.t.status === 'scanning') {
                packetColor = '#FF6A00'; // Active scan Orange
            } else if (p.s.status === 'compromised' || p.t.status === 'compromised') {
                packetColor = '#00C2FF'; // Compromised network Blue
            }

            const x = p.s.x + (p.t.x - p.s.x) * p.pct;
            const y = p.s.y + (p.t.y - p.s.y) * p.pct;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = packetColor;
            this.ctx.fillStyle = packetColor;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

        // Pass 1: Render all node base bodies, rings, and static/faint labels
        this.nodes.forEach(node => {
            const isHover = this.hoverNode === node;
            const isActive = this.activeNode === node;
            
            // Dynamic mission status indicator color
            let statusColor = '#00FF66';
            if (node.status === 'scanning') statusColor = '#FF6A00';
            else if (node.status === 'compromised') statusColor = '#00C2FF';

            // Draw pulsing outer glow ring for active scanning / compromised nodes
            if (node.status === 'scanning' || node.status === 'compromised') {
                const time = Date.now();
                const pulseRadius = 16 + 3.5 * Math.sin(time / 180);
                this.ctx.beginPath();
                this.ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
                this.ctx.strokeStyle = node.status === 'scanning'
                    ? `rgba(255, 106, 0, ${0.35 + 0.15 * Math.sin(time / 180)})`
                    : `rgba(0, 194, 255, ${0.35 + 0.15 * Math.sin(time / 180)})`;
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }

            // Draw larger, prominent outer ring (diameter 32px)
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
            
            let ringColor = '#2A2A2A';
            if (node.status === 'scanning') ringColor = '#FF6A00';
            else if (node.status === 'compromised') ringColor = '#00C2FF';
            else if (isHover || isActive) ringColor = '#00FF66';
            
            this.ctx.strokeStyle = ringColor;
            this.ctx.lineWidth = isActive ? 2.5 : 1.5;
            this.ctx.stroke();

            this.ctx.fillStyle = '#111';
            this.ctx.fill();

            // Draw center node core as a glowing vector logo in its type-specific color
            this.ctx.save();
            this.ctx.strokeStyle = node.color;
            this.ctx.lineWidth = 1.25;
            this.ctx.shadowBlur = isHover ? 10 : 3;
            this.ctx.shadowColor = node.color;
            
            const cx = node.x;
            const cy = node.y;

            if (node.type === 'db') {
                // DB icon: Stacked Cylinders (matching Crop 3)
                // Top ellipse
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy - 3, 5, 2, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Top cylinder bottom arc and vertical lines
                this.ctx.beginPath();
                this.ctx.moveTo(cx - 5, cy - 3);
                this.ctx.lineTo(cx - 5, cy + 1);
                this.ctx.moveTo(cx + 5, cy - 3);
                this.ctx.lineTo(cx + 5, cy + 1);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy + 1, 5, 2, 0, 0, Math.PI, false);
                this.ctx.stroke();
                
                // Bottom cylinder bottom arc and vertical lines
                this.ctx.beginPath();
                this.ctx.moveTo(cx - 5, cy + 1);
                this.ctx.lineTo(cx - 5, cy + 5);
                this.ctx.moveTo(cx + 5, cy + 1);
                this.ctx.lineTo(cx + 5, cy + 5);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy + 5, 5, 2, 0, 0, Math.PI, false);
                this.ctx.stroke();
            } else if (node.type === 'router' || node.type === 'firewall') {
                // Network / Globe icon: Circle with lat/long grids (matching Crop 2)
                // Outer ring
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 7, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Longitude vertical grid ellipse
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy, 2.5, 7, 0, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Latitude horizontal line
                this.ctx.beginPath();
                this.ctx.moveTo(cx - 7, cy);
                this.ctx.lineTo(cx + 7, cy);
                this.ctx.stroke();
            } else {
                // Web Server icon: Two horizontal stacked blocks with detail slot lines (matching Crop 1 exactly)
                // Top block box outline
                this.ctx.beginPath();
                this.ctx.rect(cx - 6, cy - 5, 12, 4);
                this.ctx.stroke();
                
                // Bottom block box outline
                this.ctx.beginPath();
                this.ctx.rect(cx - 6, cy + 1, 12, 4);
                this.ctx.stroke();
                
                // LED indicator dots on left side
                this.ctx.beginPath();
                this.ctx.arc(cx - 3.5, cy - 3, 0.65, 0, Math.PI * 2);
                this.ctx.arc(cx - 3.5, cy + 3, 0.65, 0, Math.PI * 2);
                this.ctx.fillStyle = node.color;
                this.ctx.fill();

                // Slot detail lines on right side
                this.ctx.beginPath();
                this.ctx.moveTo(cx - 1.5, cy - 3);
                this.ctx.lineTo(cx + 3.5, cy - 3);
                this.ctx.moveTo(cx - 1.5, cy + 3);
                this.ctx.lineTo(cx + 3.5, cy + 3);
                this.ctx.stroke();
            }
            this.ctx.restore();

            const shouldDrawLabel = isHover || isActive || node.status === 'scanning' || node.status === 'compromised';

            // 1. Draw static faint label showing the FULL server name positioned radially outward to prevent overlaps
            if (!shouldDrawLabel) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(224, 224, 224, 0.45)';
                this.ctx.font = "9px 'Share Tech Mono'";
                
                const cos = Math.cos(node.angle || 0);
                
                let offsetX = 0;
                let offsetY = 3;
                
                // Strict hemispheric split: right side flows right (left align), left side flows left (right align)
                if (cos >= 0) {
                    this.ctx.textAlign = 'left';
                    offsetX = 22;
                } else {
                    this.ctx.textAlign = 'right';
                    offsetX = -22;
                }
                
                this.ctx.fillText(node.label, node.x + offsetX, node.y + offsetY);
                this.ctx.restore();
            }
        });

        // Pass 2: Render all prominent active/hovered/scanning/compromised information badges on top of everything
        this.nodes.forEach(node => {
            const isHover = this.hoverNode === node;
            const isActive = this.activeNode === node;
            const shouldDrawLabel = isHover || isActive || node.status === 'scanning' || node.status === 'compromised';

            if (shouldDrawLabel) {
                let statusColor = '#00FF66';
                if (node.status === 'scanning') statusColor = '#FF6A00';
                else if (node.status === 'compromised') statusColor = '#00C2FF';

                this.ctx.save();
                this.ctx.font = "bold 11px 'Share Tech Mono'";
                this.ctx.textAlign = 'center';
                
                const labelText = node.label.toUpperCase();
                const ipText = node.ip;
                const textWidth = Math.max(this.ctx.measureText(labelText).width, this.ctx.measureText(ipText).width);
                const rectW = textWidth + 16;
                const rectH = 32;
                const rectX = node.x - rectW / 2;
                const rectY = node.y - 47;

                // Glassmorphic dark badge background
                this.ctx.fillStyle = 'rgba(7, 7, 7, 0.88)';
                
                let badgeColor = 'rgba(255, 255, 255, 0.15)';
                if (isHover || isActive) {
                    badgeColor = statusColor;
                }
                this.ctx.strokeStyle = badgeColor;
                this.ctx.lineWidth = 1;
                
                // Draw rounded rectangle badge
                this.ctx.beginPath();
                if (typeof this.ctx.roundRect === 'function') {
                    this.ctx.roundRect(rectX, rectY, rectW, rectH, 4);
                } else {
                    const r = 4;
                    this.ctx.moveTo(rectX + r, rectY);
                    this.ctx.arcTo(rectX + rectW, rectY, rectX + rectW, rectY + rectH, r);
                    this.ctx.arcTo(rectX + rectW, rectY + rectH, rectX, rectY + rectH, r);
                    this.ctx.arcTo(rectX, rectY + rectH, rectX, rectY, r);
                    this.ctx.arcTo(rectX, rectY, rectX + rectW, rectY, r);
                }
                this.ctx.fill();
                this.ctx.stroke();

                // Draw Text Label
                this.ctx.fillStyle = '#FFF';
                this.ctx.fillText(labelText, node.x, rectY + 13);

                // Draw IP Address
                this.ctx.fillStyle = isHover || isActive ? badgeColor : '#888';
                this.ctx.font = "9px 'IBM Plex Mono'";
                this.ctx.fillText(ipText, node.x, rectY + 26);
                
                this.ctx.restore();
            }
        });

        this.ctx.restore(); // restore logical translate/zoom context
        this.ctx.restore(); // restore physical dpr scale context
    }

    setupEventListeners() {
        if (!this.canvas) return;

        let isPanning = false;
        let startPan = { x: 0, y: 0 };

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldCoords = this.screenToWorld(mouseX, mouseY);
            
            // Check if we clicked a node
            let clickedNode = false;
            for (const node of this.nodes) {
                const dist = Math.hypot(worldCoords.x - node.x, worldCoords.y - node.y);
                if (dist <= 18) { // Hitbox increased to 18px matching new 16px node radius
                    clickedNode = true;
                    break;
                }
            }

            if (!clickedNode) {
                isPanning = true;
                this.canvas.style.cursor = 'grabbing';
                startPan = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            if (isPanning) {
                this.pan.x = e.clientX - startPan.x;
                this.pan.y = e.clientY - startPan.y;
                return;
            }

            const worldCoords = this.screenToWorld(mouseX, mouseY);
            this.hoverNode = null;
            this.canvas.style.cursor = 'grab';

            for (const node of this.nodes) {
                const dist = Math.hypot(worldCoords.x - node.x, worldCoords.y - node.y);
                if (dist <= 18) {
                    this.hoverNode = node;
                    this.canvas.style.cursor = 'pointer';
                    break;
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                this.canvas.style.cursor = 'grab';
            }
        });

        // Hold CTRL + Scroll to zoom in/out smoothly!
        this.canvas.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
                const newZoom = Math.max(0.4, Math.min(2.5, this.zoom * zoomFactor));
                if (newZoom !== this.zoom) {
                    this.zoom = newZoom;
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('click', () => {
            if (this.hoverNode) {
                this.activeNode = this.hoverNode;
                sfx.playClick();
                this.updateHUDDiagnostics(this.activeNode);
                
                // Trigger map node inspection objective
                shell.checkObjectiveFulfillment('map_inspect', this.activeNode.id);
            }
        });

        document.getElementById('net-btn-zoom-in')?.addEventListener('click', () => {
            sfx.playClick();
            this.zoom = Math.min(this.zoom + 0.15, 2.5);
        });
        document.getElementById('net-btn-zoom-out')?.addEventListener('click', () => {
            sfx.playClick();
            this.zoom = Math.max(this.zoom - 0.15, 0.4);
        });
        document.getElementById('net-btn-reset')?.addEventListener('click', () => {
            sfx.playClick();
            this.zoom = 1;
            this.pan = { x: 0, y: 0 };
            this.activeNode = null;
            this.hoverNode = null;
            this.buildActiveTopology(store.state.activeMission);
        });
    }

    screenToWorld(sx, sy) {
        if (!this.canvas) return { x: sx, y: sy };
        const w = this.width || 800;
        const h = this.height || 500;
        const x = (sx - this.pan.x - w / 2) / this.zoom + w / 2;
        const y = (sy - this.pan.y - h / 2) / this.zoom + h / 2;
        return { x, y };
    }

    updateHUDDiagnostics(node) {
        const hudBody = document.getElementById('net-hud-body');
        if (!hudBody) return;
        let statusClass = 'color: var(--color-green);';
        if (node.status === 'scanning') statusClass = 'color: var(--color-orange);';
        
        hudBody.innerHTML = `
            <div style="margin-bottom: 12px; font-weight: bold; font-size: 1rem; color: #FFF;">
                ${node.label.toUpperCase()}
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color:#888;">IPv4 Address:</span>
                <span style="color:#FFF; font-family: var(--font-mono);">${node.ip}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color:#888;">Component Type:</span>
                <span style="color:#FFF; text-transform: uppercase;">${node.type}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color:#888;">Defense Status:</span>
                <span style="${statusClass} font-weight: bold; text-transform: uppercase;">${node.status}</span>
            </div>
            <div style="border-top: 1px solid var(--color-border); padding-top: 10px; font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.4;">
                ${this.getNodeDescription(node)}
            </div>
        `;
    }

    getNodeDescription(node) {
        switch (node.type) {
            case 'router': return "Network interface routing traffic. Swaps diagnostic packets.";
            case 'firewall': return "WAF Active Firewall. Audits REST requests. Locks unauthorized ports.";
            case 'web': return "Simulated web server. Runs Nginx web apps. Prone to config exposures.";
            case 'db': return "Central database SQL server. Holds hashed profiles. Vulnerable to SQLi.";
            default: return "System nodes cluster backup configuration component.";
        }
    }
}
const network = new NetworkTopology();

/* ==========================================================================
   VISUAL MATRIX DIGITAL RAIN SYSTEM
   ========================================================================== */
class MatrixRain {
    constructor(canvasId, opacity = 0.08, speed = 33) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        try {
            this.ctx = this.canvas.getContext('2d');
        } catch (e) {
            console.warn("Canvas 2D context not supported or not implemented:", e.message);
            return;
        }
        if (!this.ctx) return;
        
        this.opacity = opacity;
        this.speed = speed;
        this.intervalId = null;
        this.chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'.split('');
        this.fontSize = 14;
        
        this.resizeListener = this.resize.bind(this);
        window.addEventListener('resize', this.resizeListener);
        this.resize();
        this.start();
    }
    
    resize() {
        if (!this.canvas || !this.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        this.width = this.canvas.offsetWidth || this.canvas.width || 300;
        this.height = this.canvas.offsetHeight || this.canvas.height || 600;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        
        const newCols = Math.floor(this.width / this.fontSize) + 1;
        if (!this.yPositions) {
            this.yPositions = Array(newCols).fill(0).map(() => Math.floor(Math.random() * -this.height / this.fontSize));
        } else {
            while (this.yPositions.length < newCols) {
                this.yPositions.push(Math.floor(Math.random() * -this.height / this.fontSize));
            }
        }
    }
    
    getThemeColor() {
        const activeTheme = store.state.activeTheme || 'classic-green';
        const colors = {
            'classic-green': '#00FF66',
            'cyberpunk-amber': '#FFB000',
            'deep-cyan': '#00C2FF',
            'obsidian-red': '#FF3C38',
            'sunset-purple': '#D800FF',
            'glitch-ice-blue': '#8CE9FF',
            'radioactive-yellow': '#CCFF00'
        };
        return colors[activeTheme] || '#00FF66';
    }
    
    start() {
        if (this.intervalId) clearInterval(this.intervalId);
        
        const draw = () => {
            if (!this.canvas || !this.ctx) return;
            
            this.ctx.fillStyle = `rgba(4, 8, 18, ${this.opacity})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = this.getThemeColor();
            this.ctx.font = `bold ${this.fontSize}px monospace`;
            
            for (let i = 0; i < this.yPositions.length; i++) {
                const char = this.chars[Math.floor(Math.random() * this.chars.length)];
                const x = i * this.fontSize;
                const y = this.yPositions[i] * this.fontSize;
                
                this.ctx.fillText(char, x, y);
                
                if (y > this.height && Math.random() > 0.98) {
                    this.yPositions[i] = 0;
                } else {
                    this.yPositions[i]++;
                }
            }
        };
        
        this.intervalId = setInterval(draw, this.speed);
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        window.removeEventListener('resize', this.resizeListener);
    }
}

let globalMatrixRainInstance = null;
let sidebarMatrixRainInstance = null;

function initSidebarMatrixRain() {
    if (sidebarMatrixRainInstance) sidebarMatrixRainInstance.stop();
    sidebarMatrixRainInstance = new MatrixRain('auth-sidebar-canvas', 0.12, 33);
}

function initGlobalMatrixRain() {
    if (globalMatrixRainInstance) globalMatrixRainInstance.stop();
    globalMatrixRainInstance = new MatrixRain('matrix-canvas', 0.05, 45);
}

/* ==========================================================================
   PART VI. BOOTSTRAP APPS ORCHESTRATION LAYOUTS
   ========================================================================== */
let missionsList = [];
let currentFilter = 'all';
let visibleMissionsCount = 30;
let matrixInterval = null;
let authMatrixInterval = null;
let bootSessionUser = null; // Stores verified auto-login operative profile returned by the database race check


const ASCII_LOGO = `
    ██████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗ ██████╗ ███████╗
   ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔═══██╗██╔══██╗██╔════╝
   ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║   ██║██████╔╝███████╗
   ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║   ██║██╔═══╝ ╚════██║
   ╚██████╗   ██║   ██████╔╝███████╗██║  ██║╚██████╔╝██║     ███████║
    ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚════██║
`;

function safeCreateIcons() {
    try {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn("Lucide icons library not loaded. Vector icons will fallback to text styling.");
        }
    } catch (e) {
        console.error("Lucide icons rendering failed:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    missionsList = generateAllMissions();
    safeCreateIcons();
    setupMechanicalKeyboardTyping();
    initGlobalMatrixRain();
    startBootSequence();
});

async function startBootSequence() {
    // Fast-boot bypass on browser/tab refreshes (survives refreshes but resets on browser restart/tab close)
    const hasBooted = sessionStorage.getItem('cyberops_booted') === 'true';
    
    if (hasBooted) {
        // Skip boot sequence: hide boot screen instantly and recover session in background
        document.getElementById('boot-screen').style.display = 'none';
        
        // Wait for database client initialization
        if (typeof dbClient !== 'undefined' && dbClient.initPromise) {
            await dbClient.initPromise;
        }
        
        // Recover user session silently if credential signature exists in local storage keystore
        const cacheStr = localStorage.getItem('cyberops_cache_memory');
        let cachedUser = null;
        if (cacheStr) {
            try {
                cachedUser = JSON.parse(cacheStr);
                const dbUser = await dbClient.getUser(cachedUser.username);
                if (dbUser && dbUser.passwordHash === cachedUser.passwordHash) {
                    bootSessionUser = dbUser;
                } else {
                    localStorage.removeItem('cyberops_cache_memory');
                }
            } catch (e) {
                localStorage.removeItem('cyberops_cache_memory');
            }
        }
        
        sfx.startServerHum();
        
        if (bootSessionUser) {
            console.log(">> [SECURE SYSTEMS] Fast-track session restore: Clearance granted.");
            loadUserDataIntoStore(bootSessionUser);
            bootstrapMainDashboard();
        } else {
            // Direct to auth portal
            document.getElementById('auth-screen').style.display = 'flex';
            initSidebarMatrixRain();
            setupSecurityAuthSystem();
        }
        return;
    }
    
    // Otherwise, first visit in this tab/browser session
    sessionStorage.setItem('cyberops_booted', 'true');

    const warningEl = document.getElementById('js-diagnostic-warning');
    if (warningEl) warningEl.style.display = 'none';

    const logEl = document.getElementById('boot-log');
    const fillEl = document.getElementById('boot-progress');
    
    const writeLog = (text, status = 'OK') => {
        const color = status === 'WARN' ? 'var(--color-orange)' : (status === 'ERR' ? 'var(--color-red)' : '#888');
        logEl.innerHTML += `<div><span style="color:${color}; font-weight:bold;">[${status}]</span> ${text}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    };

    // Stage 1: Initial simulated parameters (0% - 30%)
    const initLogs = [
        'Initializing CyberOps OS Kernel v4.19.0-26-amd64...',
        'Checking hardware parameters... CPU: Intel Xeon Simulated Core x8 (Virtual)... OK',
        'RAM detection: 16384 MB (Allocated VFS Stack)... OK',
        'Mounting in-memory sandboxed virtual filesystem (VFS)... OK',
        'Loading network modules... local0 loopback bound.'
    ];

    let pct = 0;
    for (let i = 0; i < initLogs.length; i++) {
        writeLog(initLogs[i]);
        pct += 6;
        fillEl.style.width = `${pct}%`;
        await new Promise(r => setTimeout(r, 80));
    }

    // Stage 2: Real Database Client Initialization (30% - 55%)
    writeLog('Contacting secure cloud database services...');
    await new Promise(r => setTimeout(r, 100));
    
    // Wait for the actual database initialization promise to complete
    if (typeof dbClient !== 'undefined' && dbClient.initPromise) {
        await dbClient.initPromise;
    }
    
    const dbStatusText = dbClient.isMock 
        ? 'Offline (LocalStorage Mock Database active)' 
        : `Synced (Live Supabase Cloud endpoint at ${dbClient.supabase ? dbClient.supabase.supabaseUrl : 'relay'})`;
    writeLog(`Database connection status: ${dbStatusText}`, dbClient.isMock ? 'WARN' : 'OK');
    
    pct = 55;
    fillEl.style.width = `${pct}%`;
    await new Promise(r => setTimeout(r, 120));

    // Stage 3: Real Keystore cache check (55% - 80%)
    writeLog('Checking local credentials keystore cache memory...');
    await new Promise(r => setTimeout(r, 100));
    
    const cacheStr = localStorage.getItem('cyberops_cache_memory');
    let cachedUser = null;
    if (cacheStr) {
        try {
            cachedUser = JSON.parse(cacheStr);
            writeLog(`Cached session signature located for moniker [${cachedUser.username.toUpperCase()}]`);
        } catch (e) {
            writeLog('Keystore cache parse error. Purging signature.', 'WARN');
            localStorage.removeItem('cyberops_cache_memory');
        }
    } else {
        writeLog('Keystore cache: Empty. Manual verification required.', 'WARN');
    }
    
    pct = 80;
    fillEl.style.width = `${pct}%`;
    await new Promise(r => setTimeout(r, 120));

    // Stage 4: Real Credentials DB Verification (80% - 95%)
    if (cachedUser) {
        writeLog(`Querying database for credentials matching moniker [${cachedUser.username.toUpperCase()}]...`);
        await new Promise(r => setTimeout(r, 180));
        
        try {
            const dbUser = await dbClient.getUser(cachedUser.username);
            if (dbUser && dbUser.passwordHash === cachedUser.passwordHash) {
                writeLog('Verifying clearance signatures... Valid! Clearance Granted.');
                bootSessionUser = dbUser;
            } else {
                writeLog('Verifying clearance signatures... Token mismatch or revoked.', 'ERR');
                localStorage.removeItem('cyberops_cache_memory');
            }
        } catch (err) {
            writeLog('Database clearance query failure. Offline timeout.', 'ERR');
        }
    } else {
        writeLog('Bypassing automatic token validation... Directing to portal.');
    }
    
    pct = 95;
    fillEl.style.width = `${pct}%`;
    await new Promise(r => setTimeout(r, 100));

    // Stage 5: Finalization (95% - 100%)
    writeLog('Activating Matrix digital code particle backdrops...');
    writeLog('Mounting gain sound synthesis controls... Synthesizer Ready.');
    writeLog('System online. Starting secure user shell authentication portal...');
    
    pct = 100;
    fillEl.style.width = `${pct}%`;
    await new Promise(r => setTimeout(r, 200));

    // Show ASCII logo and finished notice
    logEl.innerHTML += `<pre style="color: var(--color-green); font-size: 8px; font-family: monospace; font-weight: bold; line-height: 1.2;">${ASCII_LOGO}</pre>`;
    logEl.innerHTML += `<div style="text-align: center; margin-top: 15px; font-weight: bold; color: #FFF;">CYBEROPS OS INITIALIZED SUCCESSFULLY. PRESS ANY KEY.</div>`;
    logEl.scrollTop = logEl.scrollHeight;

    window.addEventListener('keydown', onBootFinished);
    window.addEventListener('click', onBootFinished);
}

function loadUserDataIntoStore(dbUser) {
    if (!dbUser) return;
    
    // Temporarily suspend cloud database syncing during state load sequence
    store.isSyncingSuspended = true;
    
    store.set({
        username: dbUser.username.toUpperCase(),
        level: dbUser.level !== undefined ? Number(dbUser.level) : 1,
        xp: dbUser.xp !== undefined ? Number(dbUser.xp) : 0,
        credits: dbUser.credits !== undefined ? Number(dbUser.credits) : 100,
        reputation: dbUser.reputation !== undefined ? Number(dbUser.reputation) : 0,
        rank: dbUser.rank || 'Noob',
        completedMissions: dbUser.completedMissions || [],
        unlockedTools: dbUser.unlockedTools || ['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir'],
        activeTheme: dbUser.settings?.activeTheme || 'classic-green',
        cursorState: dbUser.settings?.cursorState || 'underline',
        shellFont: dbUser.settings?.shellFont || 'fira-code',
        audioMuted: dbUser.settings?.audioMuted ?? false,
        audioVolume: dbUser.settings?.audioVolume ?? 0.5
    });
    
    store.isSyncingSuspended = false;
    console.log(">> [SECURE SYSTEMS] Game progress parameters loaded successfully for operator:", dbUser.username);
}

function onBootFinished() {
    window.removeEventListener('keydown', onBootFinished);
    window.removeEventListener('click', onBootFinished);
    sfx.playSuccess();
    sfx.startServerHum();

    document.getElementById('boot-screen').style.opacity = 0;
    setTimeout(async () => {
        document.getElementById('boot-screen').style.display = 'none';

        if (bootSessionUser) {
            console.log(">> [SECURE SYSTEMS] Real background boot login successful. Clearance granted.");
            loadUserDataIntoStore(bootSessionUser);
            bootstrapMainDashboard();
            return;
        }

        // Standard routing to Auth Screen
        document.getElementById('auth-screen').style.display = 'flex';
        initSidebarMatrixRain();
        setupSecurityAuthSystem();
    }, 400);
}

/* ==========================================================================
   SUPABASE BACKEND & LOCAL STORAGE DB ADAPTER
   ========================================================================== */
class DatabaseClient {
    constructor() {
        this.supabase = null;
        this.isMock = true;
        this.initPromise = this.init();
    }

    async init() {
        try {
            // First check fallback to ensure live connectivity even on file://
            let cleanUrl = "https://vmcrgvlhwprvzjbgmkmr.supabase.co";
            let supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtY3Jndmxod3BydnpqYmdta21yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTAyNzcsImV4cCI6MjA5NTE2NjI3N30.50J-KrrTFKiFll9IHNBlFbVxHY68ULPYsXsgeB3P5LQ";
            
            // Try fetching .env to see if there are custom override credentials
            try {
                const response = await fetch('.env');
                if (response.ok) {
                    const text = await response.text();
                    const env = {};
                    text.split('\n').forEach(line => {
                        const cleanLine = line.trim();
                        if (cleanLine && !cleanLine.startsWith('#')) {
                            const parts = cleanLine.split('=');
                            if (parts.length >= 2) {
                                const key = parts[0].trim();
                                let val = parts.slice(1).join('=').trim();
                                if (val.startsWith('"') && val.endsWith('"')) {
                                    val = val.substring(1, val.length - 1);
                                }
                                env[key] = val;
                            }
                        }
                    });

                    if (env['NEXT_PUBLIC_SUPABASE_URL']) cleanUrl = env['NEXT_PUBLIC_SUPABASE_URL'].trim();
                    if (env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'].trim();
                }
            } catch (envErr) {
                console.warn(">> [SECURE SYSTEMS] .env fetch blocked (running on file:// or CORS locked). Utilizing hardcoded secure API relays.", envErr.message);
            }

            // Cloud deployment environment overrides (Vercel, Netlify, Cloudflare, etc. runtime injections)
            if (typeof window !== 'undefined') {
                const wEnv = window.env || window.ENV || {};
                const procEnv = (window.process && window.process.env) || {};
                
                const cloudUrl = window.NEXT_PUBLIC_SUPABASE_URL || wEnv.NEXT_PUBLIC_SUPABASE_URL || procEnv.NEXT_PUBLIC_SUPABASE_URL;
                const cloudKey = window.NEXT_PUBLIC_SUPABASE_ANON_KEY || wEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || procEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                
                if (cloudUrl) cleanUrl = cloudUrl.trim();
                if (cloudKey) supabaseKey = cloudKey.trim();
            }

            if (cleanUrl.endsWith('/rest/v1/')) {
                cleanUrl = cleanUrl.substring(0, cleanUrl.length - 9);
            } else if (cleanUrl.endsWith('/rest/v1')) {
                cleanUrl = cleanUrl.substring(0, cleanUrl.length - 8);
            }

            if (cleanUrl && !cleanUrl.includes('cyberops.local') && supabaseKey && typeof supabase !== 'undefined') {
                this.supabase = supabase.createClient(cleanUrl, supabaseKey);
                this.isMock = false;
                console.log(">> [SECURE SYSTEMS] Live Supabase backend client successfully initialized.", cleanUrl);
                return;
            }
        } catch (e) {
            console.warn(">> [SECURE SYSTEMS] Live Supabase backend initialization failed. Fallback to LocalStorage Sandbox Database.", e);
        }
        console.log(">> [SECURE SYSTEMS] Running on LocalStorage Sandbox database simulation.");
    }

    getMockDB() {
        const data = localStorage.getItem('cyberops_database_users');
        return data ? JSON.parse(data) : {};
    }

    saveMockDB(db) {
        localStorage.setItem('cyberops_database_users', JSON.stringify(db));
    }

    async checkUsername(username) {
        const cleanUsername = username.toUpperCase().trim();
        if (!cleanUsername) return false;
        if (!this.isMock && this.supabase) {
            try {
                const queryPromise = this.supabase.from('profiles').select('username').eq('username', cleanUsername);
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 1500));
                const res = await Promise.race([queryPromise, timeoutPromise]);
                
                if (res && !res.timeout && !res.error && res.data && res.data.length > 0) {
                    return true;
                }
            } catch (e) {
                console.error("Supabase query failure", e);
            }
        }
        const db = this.getMockDB();
        return db[cleanUsername] !== undefined;
    }

    async checkEmail(email) {
        const cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail) return false;
        if (!this.isMock && this.supabase) {
            try {
                const queryPromise = this.supabase.from('profiles').select('email').eq('email', cleanEmail);
                const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 1500));
                const res = await Promise.race([queryPromise, timeoutPromise]);
                
                if (res && !res.timeout && !res.error && res.data && res.data.length > 0) {
                    return true;
                }
            } catch (e) {
                console.error("Supabase query failure", e);
            }
        }
        const db = this.getMockDB();
        return Object.values(db).some(user => user.email === cleanEmail);
    }


    async registerUser(user) {
        const cleanUsername = user.username.toUpperCase().trim();
        const cleanEmail = user.email.toLowerCase().trim();
        const userData = {
            username: cleanUsername,
            email: cleanEmail,
            timezone: user.timezone,
            ip_address: user.ipAddress,
            password_hash: user.passwordHash,
            
            // Core Hacking Simulator Default Progression Parameters
            level: 1,
            xp: 0,
            credits: 100,
            reputation: 0,
            rank: 'Noob',
            completed_missions: JSON.stringify([]),
            unlocked_tools: JSON.stringify(['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir']),
            settings: JSON.stringify({
                activeTheme: 'classic-green',
                cursorState: 'underline',
                shellFont: 'fira-code',
                audioMuted: false,
                audioVolume: 0.5
            })
        };

        if (!this.isMock && this.supabase) {
            try {
                const { error } = await this.supabase.from('profiles').insert([userData]);
                if (!error) return true;
                console.error("Supabase insertion error:", error);
            } catch (e) {
                console.error("Supabase execution error:", e);
            }
        }
        const db = this.getMockDB();
        db[cleanUsername] = {
            username: cleanUsername,
            email: cleanEmail,
            timezone: user.timezone,
            ipAddress: user.ipAddress,
            passwordHash: user.passwordHash,
            
            // Mock progression properties
            level: 1,
            xp: 0,
            credits: 100,
            reputation: 0,
            rank: 'Noob',
            completedMissions: [],
            unlockedTools: ['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir'],
            settings: {
                activeTheme: 'classic-green',
                cursorState: 'underline',
                shellFont: 'fira-code',
                audioMuted: false,
                audioVolume: 0.5
            }
        };
        this.saveMockDB(db);
        return true;
    }

    async getUser(username) {
        const cleanUsername = username.toUpperCase().trim();
        if (!cleanUsername) return null;
        if (!this.isMock && this.supabase) {
            try {
                const { data, error } = await this.supabase.from('profiles').select('*').eq('username', cleanUsername);
                if (!error && data && data.length > 0) {
                    const u = data[0];
                    return {
                        username: u.username,
                        email: u.email,
                        timezone: u.timezone,
                        ipAddress: u.ip_address,
                        passwordHash: u.password_hash,
                        
                        // Parse loaded cloud progression database fields
                        level: u.level !== undefined ? Number(u.level) : 1,
                        xp: u.xp !== undefined ? Number(u.xp) : 0,
                        credits: u.credits !== undefined ? Number(u.credits) : 100,
                        reputation: u.reputation !== undefined ? Number(u.reputation) : 0,
                        rank: u.rank || 'Noob',
                        completedMissions: u.completed_missions ? (typeof u.completed_missions === 'string' ? JSON.parse(u.completed_missions) : u.completed_missions) : [],
                        unlockedTools: u.unlocked_tools ? (typeof u.unlocked_tools === 'string' ? JSON.parse(u.unlocked_tools) : u.unlocked_tools) : ['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir'],
                        settings: u.settings ? (typeof u.settings === 'string' ? JSON.parse(u.settings) : u.settings) : {}
                    };
                }
            } catch (e) {
                console.error("Supabase query failure", e);
            }
        }
        const db = this.getMockDB();
        return db[cleanUsername] || null;
    }

    async updateUser(username, updates) {
        const cleanUsername = username.toUpperCase().trim();
        const dbUpdates = {};
        if (updates.email) dbUpdates.email = updates.email.toLowerCase().trim();
        if (updates.timezone) dbUpdates.timezone = updates.timezone;
        if (updates.ipAddress) dbUpdates.ip_address = updates.ipAddress;
        if (updates.passwordHash) dbUpdates.password_hash = updates.passwordHash;
        
        // Progress parameters database mappings
        if (updates.level !== undefined) dbUpdates.level = updates.level;
        if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
        if (updates.credits !== undefined) dbUpdates.credits = updates.credits;
        if (updates.reputation !== undefined) dbUpdates.reputation = updates.reputation;
        if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
        if (updates.completedMissions !== undefined) dbUpdates.completed_missions = JSON.stringify(updates.completedMissions);
        if (updates.unlockedTools !== undefined) dbUpdates.unlocked_tools = JSON.stringify(updates.unlockedTools);
        if (updates.settings !== undefined) dbUpdates.settings = JSON.stringify(updates.settings);

        if (!this.isMock && this.supabase) {
            try {
                const { error } = await this.supabase.from('profiles').update(dbUpdates).eq('username', cleanUsername);
                if (!error) return true;
                console.error("Supabase update error:", error);
            } catch (e) {
                console.error("Supabase execution error:", e);
            }
        }
        const db = this.getMockDB();
        if (db[cleanUsername]) {
            if (updates.email) db[cleanUsername].email = updates.email.toLowerCase().trim();
            if (updates.timezone) db[cleanUsername].timezone = updates.timezone;
            if (updates.ipAddress) db[cleanUsername].ipAddress = updates.ipAddress;
            if (updates.passwordHash) db[cleanUsername].passwordHash = updates.passwordHash;
            
            // Sync fallback progress parameters
            if (updates.level !== undefined) db[cleanUsername].level = updates.level;
            if (updates.xp !== undefined) db[cleanUsername].xp = updates.xp;
            if (updates.credits !== undefined) db[cleanUsername].credits = updates.credits;
            if (updates.reputation !== undefined) db[cleanUsername].reputation = updates.reputation;
            if (updates.rank !== undefined) db[cleanUsername].rank = updates.rank;
            if (updates.completedMissions !== undefined) db[cleanUsername].completedMissions = updates.completedMissions;
            if (updates.unlockedTools !== undefined) db[cleanUsername].unlockedTools = updates.unlockedTools;
            if (updates.settings !== undefined) db[cleanUsername].settings = updates.settings;
            
            this.saveMockDB(db);
            return true;
        }
        return false;
    }

    async deleteUser(username) {
        const cleanUsername = username.toUpperCase().trim();
        if (!this.isMock && this.supabase) {
            try {
                const { error } = await this.supabase.from('profiles').delete().eq('username', cleanUsername);
                if (!error) return true;
                console.error("Supabase delete error:", error);
            } catch (e) {
                console.error("Supabase execution error:", e);
            }
        }
        const db = this.getMockDB();
        if (db[cleanUsername]) {
            delete db[cleanUsername];
            this.saveMockDB(db);
            return true;
        }
        return false;
    }
}
const dbClient = new DatabaseClient();

function getMockCurrentIP() {
    let cachedIP = localStorage.getItem('cyberops_device_ip');
    if (!cachedIP) {
        const octets = [172, Math.floor(Math.random() * 40 + 30), Math.floor(Math.random() * 200 + 10), Math.floor(Math.random() * 253 + 2)];
        cachedIP = octets.join('.');
        localStorage.setItem('cyberops_device_ip', cachedIP);
    }
    return cachedIP;
}

let activeAuthMode = 'login';
let usernameIsValid = false;
let emailIsValid = false;
let otpIsValid = false;
let generatedOTP = '';
let registrationTempCache = null;

let authInitialized = false;
let activeLoginUser = null;

function setupSecurityAuthSystem() {
    if (authInitialized) {
        const modeBtnLogin = document.getElementById('mode-btn-login');
        if (modeBtnLogin) {
            activeAuthMode = '';
            modeBtnLogin.click();
        }
        return;
    }
    authInitialized = true;
    const modeBtnLogin = document.getElementById('mode-btn-login');
    const modeBtnRegister = document.getElementById('mode-btn-register');
    const authTitleText = document.getElementById('auth-title-text');
    const authSubtitleText = document.getElementById('auth-subtitle-text');
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('auth-username');
    const usernameBadge = document.getElementById('username-validation-badge');
    const emailGroup = document.getElementById('email-group');
    const emailInput = document.getElementById('auth-email');
    const emailBadge = document.getElementById('email-validation-badge');
    const otpGroup = document.getElementById('otp-group');
    const otpInput = document.getElementById('auth-otp');
    const otpBadge = document.getElementById('otp-validation-badge');
    const otpLog = document.getElementById('otp-terminal-log');
    const fingerprintZone = document.getElementById('fingerprint-zone');
    const biometricsHeader = document.getElementById('biometrics-header-title');
    const biometricsStatus = document.getElementById('biometrics-status');
    const fingerprintTip = document.getElementById('fingerprint-tip-text');
    const submitBtn = document.getElementById('auth-submit-btn');
    const footerNote = document.getElementById('auth-footer-note');

    const resetAuthState = () => {
        usernameInput.value = '';
        usernameInput.disabled = false;
        usernameBadge.className = 'validation-status-badge';
        usernameBadge.innerHTML = '';
        usernameIsValid = false;

        emailInput.value = '';
        emailInput.disabled = false;
        emailBadge.className = 'validation-status-badge';
        emailBadge.innerHTML = '';
        emailGroup.style.display = 'none';
        emailIsValid = false;

        otpInput.value = '';
        otpInput.disabled = false;
        otpBadge.className = 'validation-status-badge';
        otpBadge.innerHTML = '';
        otpGroup.style.display = 'none';
        otpLog.style.display = 'none';
        otpLog.innerHTML = '';
        otpIsValid = false;
        generatedOTP = '';

        fingerprintZone.className = 'fingerprint-scanner-zone';
        biometricsHeader.textContent = 'SIMULATED BIOMETRICS VERIFICATION';
        biometricsStatus.textContent = 'PENDING_SCAN';
        biometricsStatus.className = 'status-pending';
        fingerprintTip.textContent = 'Tap scanner to record biometric footprint.';

        submitBtn.disabled = true;
        submitBtn.className = 'btn-neon btn-handshake';
        submitBtn.innerHTML = `
            <span class="btn-icon-wrapper" style="margin-right: 10px; display: inline-flex; align-items: center; vertical-align: middle;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </span>
            INITIATE CLEARANCE HANDSHAKE
        `;
        registrationTempCache = null;
    };

    modeBtnLogin.addEventListener('click', () => {
        if (activeAuthMode === 'login') return;
        sfx.playClick();
        activeAuthMode = 'login';
        modeBtnLogin.className = 'auth-mode-btn active';
        modeBtnRegister.className = 'auth-mode-btn';
        authTitleText.textContent = 'OPERATIVE VERIFICATION';
        authSubtitleText.textContent = 'Authorize operational clearance keys to unlock security portals.';
        footerNote.innerHTML = `New to the CyberOps framework? <span class="registry-highlight" id="btn-toggle-registry" style="cursor: pointer; color: var(--color-green);">Biotic Operative Registry Mode</span>`;
        bindRegistryMonikerToggle();
        resetAuthState();
    });

    modeBtnRegister.addEventListener('click', () => {
        if (activeAuthMode === 'register') return;
        sfx.playClick();
        activeAuthMode = 'register';
        modeBtnRegister.className = 'auth-mode-btn active';
        modeBtnLogin.className = 'auth-mode-btn';
        authTitleText.textContent = 'OPERATIVE REGISTRATION';
        authSubtitleText.textContent = 'Establish credentials compliance keys and backup recovery mail.';
        footerNote.innerHTML = `Already registered? <span class="registry-highlight" id="btn-toggle-login" style="cursor: pointer; color: var(--color-blue);">Access Operative Gateway</span>`;
        
        const toggleLoginBtn = document.getElementById('btn-toggle-login');
        if (toggleLoginBtn) {
            toggleLoginBtn.addEventListener('click', () => modeBtnLogin.click());
        }
        resetAuthState();
    });

    let usernameDebounceTimer;
    usernameInput.addEventListener('input', () => {
        clearTimeout(usernameDebounceTimer);
        const nameVal = usernameInput.value.trim();

        if (fingerprintZone.classList.contains('scanning') || fingerprintZone.classList.contains('verified')) {
            fingerprintZone.className = 'fingerprint-scanner-zone';
            biometricsStatus.textContent = 'PENDING_SCAN';
            biometricsStatus.className = 'status-pending';
            submitBtn.disabled = true;
            submitBtn.classList.remove('btn-handshake-active');
            fingerprintTip.textContent = 'Username modified. Tap scanner to re-verify.';
        }

        if (nameVal.length < 3) {
            usernameBadge.className = 'validation-status-badge';
            usernameBadge.innerHTML = '';
            usernameIsValid = false;
            return;
        }

        usernameBadge.className = 'validation-status-badge pending';
        usernameBadge.innerHTML = `
            <svg class="badge-icon badge-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="rgba(0, 194, 255, 0.15)"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
        `;

        usernameDebounceTimer = setTimeout(async () => {
            const exists = await dbClient.checkUsername(nameVal);
            if (activeAuthMode === 'register') {
                if (exists) {
                    usernameBadge.className = 'validation-status-badge error';
                    usernameBadge.innerHTML = `
                        <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    `;
                    fingerprintTip.textContent = 'Moniker already registered. Choose another.';
                    usernameIsValid = false;
                } else {
                    usernameBadge.className = 'validation-status-badge success';
                    usernameBadge.innerHTML = `
                        <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    fingerprintTip.textContent = 'Moniker is unique. Tap scanner to record biometric blueprint.';
                    usernameIsValid = true;
                }
            } else {
                if (exists) {
                    usernameBadge.className = 'validation-status-badge success';
                    usernameBadge.innerHTML = `
                        <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    fingerprintTip.textContent = 'Moniker recognized. Tap scanner to authenticate.';
                    usernameIsValid = true;
                } else {
                    usernameBadge.className = 'validation-status-badge error';
                    usernameBadge.innerHTML = `
                        <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    `;
                    fingerprintTip.textContent = 'Moniker not recognized. Registrations required.';
                    usernameIsValid = false;
                }
            }
        }, 500);
    });

    fingerprintZone.addEventListener('click', async () => {
        if (fingerprintZone.classList.contains('scanning') || fingerprintZone.classList.contains('verified')) return;

        const usernameVal = usernameInput.value.trim();
        if (!usernameVal || !usernameIsValid) {
            sfx.playError();
            usernameInput.classList.add('shake-input');
            setTimeout(() => usernameInput.classList.remove('shake-input'), 500);
            fingerprintTip.textContent = 'Please enter a valid, verified moniker first.';
            return;
        }

        usernameInput.disabled = true;
        fingerprintZone.classList.add('scanning');
        biometricsStatus.textContent = 'SCANNING...';
        biometricsStatus.className = 'status-scanning';
        fingerprintTip.textContent = 'Scanning biometric patterns... Clearances broadcast...';

        let clicks = 0;
        const soundInterval = setInterval(() => {
            if (clicks < 8) {
                sfx.playClick();
                clicks++;
            } else {
                clearInterval(soundInterval);
            }
        }, 220);

        setTimeout(async () => {
            fingerprintZone.classList.remove('scanning');

            if (activeAuthMode === 'register') {
                fingerprintZone.classList.add('verified');
                biometricsStatus.textContent = 'RECORDED';
                biometricsStatus.className = 'status-verified';
                biometricsHeader.textContent = 'BIOMETRIC FOOTPRINT RECORDED';
                fingerprintTip.textContent = 'Biometric captured. Specify recovery email addresses.';
                sfx.playSuccess();

                emailGroup.style.display = 'block';
                emailInput.focus();
            } else {
                const dbUser = await dbClient.getUser(usernameVal);
                if (!dbUser) {
                    fingerprintZone.className = 'fingerprint-scanner-zone';
                    biometricsStatus.textContent = 'ERROR';
                    biometricsStatus.className = 'status-pending';
                    fingerprintTip.textContent = 'Profile data lookup mismatch. Restart boot.';
                    usernameInput.disabled = false;
                    sfx.playError();
                    return;
                }

                const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const currentIP = getMockCurrentIP();
                const ipMismatchDemo = localStorage.getItem('cyberops_force_ip_mismatch') === 'true';

                if (dbUser.timezone === currentTZ && dbUser.ipAddress === currentIP && !ipMismatchDemo) {
                    fingerprintZone.classList.add('verified');
                    biometricsStatus.textContent = 'VERIFIED';
                    biometricsStatus.className = 'status-verified';
                    fingerprintTip.textContent = 'Acoustic credentials match. Ready for handshake.';
                    sfx.playSuccess();

                    submitBtn.disabled = false;
                    submitBtn.classList.add('btn-handshake-active');
                    submitBtn.innerHTML = `
                        <span class="btn-icon-wrapper" style="margin-right: 10px; display: inline-flex; align-items: center; vertical-align: middle;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </span>
                        INITIATE CLEARANCE HANDSHAKE
                    `;
                } else {
                    localStorage.removeItem('cyberops_force_ip_mismatch');
                    activeLoginUser = dbUser;
                    biometricsStatus.textContent = 'SEC_WARN';
                    biometricsStatus.className = 'status-scanning';
                    fingerprintTip.textContent = 'Location or IP mismatch detected. Generating OTP backup...';
                    sfx.playError();

                    otpGroup.style.display = 'block';
                    otpInput.focus();

                    generatedOTP = Math.floor(Math.random() * 899999 + 100000).toString();
                    otpLog.style.display = 'block';
                    otpLog.innerHTML = `
                        <div>>> SECURE ROUTING GATEWAY WARNING</div>
                        <div>>> Profile time/IP mismatch: [${dbUser.timezone} / ${dbUser.ipAddress}] vs [${currentTZ} / ${currentIP}]</div>
                        <div>>> TRANSMITTING OTP SIGNALS TO: ${dbUser.email.substring(0, 3)}***@***.net ...</div>
                    `;

                    if (!dbClient.isMock && dbClient.supabase) {
                        try {
                            otpLog.innerHTML += `<div>>> DISPATCHING SMTP REQUEST TO SUPABASE AUTH SERVICES...</div>`;
                            const { error } = await dbClient.supabase.auth.signInWithOtp({ email: dbUser.email });
                            if (error) {
                                console.error("Supabase login OTP send error:", error);
                                otpLog.innerHTML += `<div style="color: var(--color-orange);">>> [SUPABASE SMTP ERROR]: ${error.message}</div>`;
                            } else {
                                otpLog.innerHTML += `<div style="color: var(--color-green); font-weight: bold; margin-top: 5px;">>> [SUPABASE SMTP]: Real OTP successfully dispatched to ${dbUser.email} via Supabase SMTP. Please check your mailbox!</div>`;
                            }
                        } catch (e) {
                            console.error("Supabase login OTP send exception:", e);
                            otpLog.innerHTML += `<div style="color: var(--color-orange);">>> [SUPABASE SMTP EXCEPTION]: ${e.message}</div>`;
                        }
                    }

                    setTimeout(() => {
                        otpLog.innerHTML += `
                            <div style="color: var(--color-green); font-weight: bold; margin-top: 5px;">>> [SMTP DECRYPTED TRACE OTP KEY]: ${generatedOTP}</div>
                        `;
                        sfx.playSuccess();
                    }, 1200);
                }
            }
        }, 2000);


    });



    let emailDebounceTimer;
    emailInput.addEventListener('input', () => {
        clearTimeout(emailDebounceTimer);
        const emailVal = emailInput.value.trim();

        otpGroup.style.display = 'none';
        otpInput.value = '';
        otpBadge.className = 'validation-status-badge';
        otpBadge.innerHTML = '';
        otpLog.style.display = 'none';
        otpLog.innerHTML = '';
        otpIsValid = false;
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-handshake-active');

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailVal)) {
            emailBadge.className = 'validation-status-badge';
            emailBadge.innerHTML = '';
            emailIsValid = false;
            return;
        }

        emailBadge.className = 'validation-status-badge pending';
        emailBadge.innerHTML = `
            <svg class="badge-icon badge-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="rgba(0, 194, 255, 0.15)"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
        `;

        emailDebounceTimer = setTimeout(async () => {
            const exists = await dbClient.checkEmail(emailVal);
            if (exists) {
                emailBadge.className = 'validation-status-badge error';
                emailBadge.innerHTML = `
                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `;
                fingerprintTip.textContent = 'Recovery address already registered.';
                emailIsValid = false;
            } else {
                emailBadge.className = 'validation-status-badge success';
                emailBadge.innerHTML = `
                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                fingerprintTip.textContent = 'Recovery address unique. Dispersing secure OTP key...';
                emailIsValid = true;
                sfx.playSuccess();

                otpGroup.style.display = 'block';
                otpInput.focus();

                generatedOTP = Math.floor(Math.random() * 899999 + 100000).toString();
                otpLog.style.display = 'block';
                otpLog.innerHTML = `
                    <div>>> SECURE RELAY CLIENT LINK ACTIVE</div>
                    <div>>> BROADCASTING COMPLIANCE HANDSHAKE SIGNALS...</div>
                `;

                if (!dbClient.isMock && dbClient.supabase) {
                    try {
                        otpLog.innerHTML += `<div>>> DISPATCHING SMTP REQUEST TO SUPABASE AUTH SERVICES...</div>`;
                        const { error } = await dbClient.supabase.auth.signInWithOtp({ email: emailVal });
                        if (error) {
                            console.error("Supabase registration OTP send error:", error);
                            otpLog.innerHTML += `<div style="color: var(--color-orange);">>> [SUPABASE SMTP ERROR]: ${error.message}</div>`;
                        } else {
                            otpLog.innerHTML += `<div style="color: var(--color-green); font-weight: bold; margin-top: 5px;">>> [SUPABASE SMTP]: Real OTP successfully dispatched to ${emailVal} via Supabase SMTP. Please check your mailbox!</div>`;
                        }
                    } catch (e) {
                        console.error("Supabase registration OTP send exception:", e);
                        otpLog.innerHTML += `<div style="color: var(--color-orange);">>> [SUPABASE SMTP EXCEPTION]: ${e.message}</div>`;
                    }
                }

                setTimeout(() => {
                    otpLog.innerHTML += `
                        <div style="color: var(--color-green); font-weight: bold; margin-top: 5px;">>> [SMTP DECRYPTED TRACE OTP KEY]: ${generatedOTP}</div>
                    `;
                    sfx.playSuccess();
                }, 1200);
            }
        }, 500);
    });

    otpInput.addEventListener('input', async () => {
        const otpVal = otpInput.value.trim();

        if (otpVal.length < 6) {
            otpBadge.className = 'validation-status-badge';
            otpBadge.innerHTML = '';
            otpIsValid = false;
            return;
        }

        let isCorrectOTP = (otpVal === generatedOTP);

        if (!isCorrectOTP && !dbClient.isMock && dbClient.supabase) {
            let emailVal = '';
            if (activeAuthMode === 'register') {
                emailVal = emailInput.value.trim();
            } else if (activeLoginUser) {
                emailVal = activeLoginUser.email;
            }

            if (emailVal) {
                try {
                    otpBadge.className = 'validation-status-badge pending';
                    otpBadge.innerHTML = `
                        <svg class="badge-icon badge-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10" stroke="rgba(0, 194, 255, 0.15)"></circle>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
                        </svg>
                    `;

                    let { data, error } = await dbClient.supabase.auth.verifyOtp({
                        email: emailVal,
                        token: otpVal,
                        type: 'email'
                    });

                    if (error) {
                        const { data: data2, error: error2 } = await dbClient.supabase.auth.verifyOtp({
                            email: emailVal,
                            token: otpVal,
                            type: 'signup'
                        });
                        if (!error2 && data2 && (data2.session || data2.user)) {
                            data = data2;
                            error = null;
                        }
                    }

                    if (error) {
                        const { data: data3, error: error3 } = await dbClient.supabase.auth.verifyOtp({
                            email: emailVal,
                            token: otpVal,
                            type: 'magiclink'
                        });
                        if (!error3 && data3 && (data3.session || data3.user)) {
                            data = data3;
                            error = null;
                        }
                    }

                    if (!error && data && (data.session || data.user)) {
                        isCorrectOTP = true;
                    }
                } catch (err) {
                    console.error("Supabase OTP verification exception:", err);
                }
            }
        }

        if (isCorrectOTP) {
            otpBadge.className = 'validation-status-badge success';
            otpBadge.innerHTML = `
                <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            `;
            otpIsValid = true;
            sfx.playSuccess();
            otpInput.disabled = true;

            if (activeAuthMode === 'register') {
                const randPass = Math.random().toString(36).substring(2, 10) + '_' + Math.floor(Math.random() * 900 + 100);
                const passwordHash = md5Sim(randPass);

                registrationTempCache = {
                    username: usernameInput.value.trim(),
                    email: emailInput.value.trim(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    ipAddress: getMockCurrentIP(),
                    passwordHash: passwordHash
                };

                submitBtn.disabled = false;
                submitBtn.classList.add('btn-handshake-active');
                fingerprintTip.textContent = 'Encryption keys generated. Initiate clearance handshake.';
            } else {
                fingerprintZone.className = 'fingerprint-scanner-zone verified';
                biometricsStatus.textContent = 'VERIFIED';
                biometricsStatus.className = 'status-verified';
                fingerprintTip.textContent = 'Secure OTP handshake completed successfully.';

                submitBtn.disabled = false;
                submitBtn.classList.add('btn-handshake-active');
            }
        } else {
            otpBadge.className = 'validation-status-badge error';
            otpBadge.innerHTML = `
                <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            otpIsValid = false;
            sfx.playError();
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        sfx.playEnter();

        const usernameVal = usernameInput.value.trim().toUpperCase();

        if (activeAuthMode === 'register') {
            if (!registrationTempCache) return;

            submitBtn.textContent = 'ACCESS GRANTED. REGISTERING SECURE SECTOR KEYS...';
            submitBtn.style.color = '#00FF66';
            submitBtn.style.borderColor = '#00FF66';
            sfx.playSuccess();

            await dbClient.registerUser(registrationTempCache);
            localStorage.setItem('cyberops_cache_memory', JSON.stringify(registrationTempCache));
            
            const dbUser = await dbClient.getUser(registrationTempCache.username);
            loadUserDataIntoStore(dbUser);

            setTimeout(() => {
                document.getElementById('auth-screen').style.display = 'none';
                if (authMatrixInterval) {
                    clearInterval(authMatrixInterval);
                    authMatrixInterval = null;
                }
                bootstrapMainDashboard();
            }, 1200);
        } else {
            submitBtn.textContent = 'ACCESS GRANTED. DEPLOYING SHIELD RELAYS...';
            submitBtn.style.color = '#00FF66';
            submitBtn.style.borderColor = '#00FF66';
            sfx.playSuccess();

            const dbUser = await dbClient.getUser(usernameVal);
            const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const currentIP = getMockCurrentIP();

            if (otpIsValid) {
                const updatedFields = {
                    timezone: currentTZ,
                    ipAddress: currentIP
                };
                await dbClient.updateUser(dbUser.username, updatedFields);

                const newCacheData = {
                    username: dbUser.username,
                    email: dbUser.email,
                    timezone: currentTZ,
                    ipAddress: currentIP,
                    passwordHash: dbUser.passwordHash
                };
                localStorage.setItem('cyberops_cache_memory', JSON.stringify(newCacheData));
                console.log(">> [SECURE SYSTEMS] Profile records and cached credentials updated successfully.");
            } else {
                const cacheData = {
                    username: dbUser.username,
                    email: dbUser.email,
                    timezone: dbUser.timezone,
                    ipAddress: dbUser.ipAddress,
                    passwordHash: dbUser.passwordHash
                };
                localStorage.setItem('cyberops_cache_memory', JSON.stringify(cacheData));
            }

            const reloadedDbUser = await dbClient.getUser(usernameVal);
            loadUserDataIntoStore(reloadedDbUser);

            setTimeout(() => {
                document.getElementById('auth-screen').style.display = 'none';
                if (authMatrixInterval) {
                    clearInterval(authMatrixInterval);
                    authMatrixInterval = null;
                }
                bootstrapMainDashboard();
            }, 1200);
        }
    });

    const bindRegistryMonikerToggle = () => {
        const btnToggleRegistry = document.getElementById('btn-toggle-registry');
        if (btnToggleRegistry) {
            btnToggleRegistry.addEventListener('click', () => {
                sfx.playClick();
                modeBtnRegister.click();
            });
        }
    };
    bindRegistryMonikerToggle();
    resetAuthState();
}

let dashboardInitialized = false;

function bootstrapMainDashboard() {
    document.getElementById('app-layout').style.display = 'flex';
    
    if (dashboardInitialized) {
        store.set({ username: store.state.username });
        return;
    }
    dashboardInitialized = true;
    store.subscribe((state) => {
        document.getElementById('stat-username').textContent = state.username;
        document.getElementById('stat-rank').textContent = state.rank;
        document.getElementById('stat-level').textContent = state.level;
        document.getElementById('stat-credits').textContent = state.credits;
        document.getElementById('stat-rep').textContent = state.reputation;
        const xpNeeded = state.level * 250;
        const xpPct = (state.xp / xpNeeded) * 100;
        document.getElementById('stat-xp-fill').style.width = `${xpPct}%`;

        // Sync Quick Start Mission Box counters reactively
        const completedCount = state.completedMissions ? state.completedMissions.length : 0;
        const toolsUsedCount = state.usedTools ? state.usedTools.length : 0;
        const compCountEl = document.getElementById('quick-start-completed-count');
        const toolsCountEl = document.getElementById('quick-start-tools-count');
        if (compCountEl) compCountEl.textContent = completedCount;
        if (toolsCountEl) toolsCountEl.textContent = toolsUsedCount;

        const soundBtn = document.getElementById('header-sound-btn');
        if (soundBtn) {
            soundBtn.innerHTML = `<i data-lucide="${state.audioMuted ? 'volume-x' : 'volume-2'}" style="width: 16px; height: 16px;"></i>`;
            safeCreateIcons();
        }

        document.body.className = document.body.className.replace(/\btheme-\S+/g, '').trim();
        document.body.classList.add(`theme-${state.activeTheme || 'classic-green'}`);

        const termScreen = document.getElementById('terminal-screen-element');
        if (termScreen) {
            termScreen.className = termScreen.className.replace(/\bfont-\S+/g, '').replace(/\bcursor-\S+/g, '').trim();
            termScreen.classList.add(`font-${state.shellFont || 'fira-code'}`);
            termScreen.classList.add(`cursor-${state.cursorState || 'underline'}`);
        }

        const volSwitch = document.getElementById('settings-audio-effects');
        if (volSwitch) {
            volSwitch.checked = !state.audioMuted;
        }

        // Sync Active Mission Widget on Dashboard
        const activeMissionCard = document.getElementById('dashboard-active-mission-card');
        const activeMissionNameEl = document.getElementById('dashboard-active-mission-name');
        const activeMissionBodyEl = document.getElementById('dashboard-active-mission-body');
        const activeMissionDiffEl = document.getElementById('active-mission-difficulty-hud');
        const activeMissionGoBtn = document.getElementById('dashboard-active-mission-go-btn');

        if (activeMissionCard && activeMissionNameEl && activeMissionBodyEl && activeMissionDiffEl && activeMissionGoBtn) {
            const detailed = state.activeMission;
            if (detailed) {
                const isCompleted = state.completedMissions.includes(detailed.id);
                if (isCompleted) {
                    activeMissionCard.style.borderTopColor = 'var(--color-green)';
                    activeMissionCard.style.boxShadow = '0 0 15px rgba(0, 255, 102, 0.15), inset 0 0 10px rgba(0, 255, 102, 0.02)';
                    activeMissionNameEl.innerHTML = detailed.name + ' <span style="color: var(--color-green); font-size: 0.95rem; font-family: var(--font-mono); font-weight: bold; text-shadow: 0 0 5px var(--color-green-glow); margin-left: 10px;">[✓ SECURED]</span>';
                    activeMissionGoBtn.textContent = 'RE-DEPLOY WORKSTATION';
                } else {
                    activeMissionCard.style.borderTopColor = 'var(--color-orange)';
                    activeMissionCard.style.boxShadow = 'none';
                    activeMissionNameEl.innerHTML = detailed.name + ' <span style="color: var(--color-orange); font-size: 0.95rem; font-family: var(--font-mono); font-weight: bold; text-shadow: 0 0 5px var(--color-orange-glow); margin-left: 10px;">[ACTIVE]</span>';
                    activeMissionGoBtn.textContent = 'DEPLOY WORKSTATION';
                }
                activeMissionBodyEl.textContent = detailed.description;
                activeMissionDiffEl.textContent = detailed.difficulty.toUpperCase();
                activeMissionDiffEl.className = `mission-difficulty difficulty-${detailed.difficulty}`;
            } else {
                activeMissionCard.style.borderTopColor = 'var(--color-orange)';
                activeMissionCard.style.boxShadow = 'none';
                activeMissionNameEl.textContent = 'No Mission Loaded';
                activeMissionBodyEl.textContent = 'Browse the Operations Feed, filter by difficulty matching your operational skill, and deploy an isolated sandbox server environment to start hacking.';
                activeMissionDiffEl.textContent = 'EASY';
                activeMissionDiffEl.className = 'mission-difficulty difficulty-easy';
                activeMissionGoBtn.textContent = 'DEPLOY WORKSTATION';
            }
        }
    });

    setupSPAPageRouter();
    setupNetworkTrafficGraph();
    startDynamicHUD();
    startDynamicNetworkGraph();
    startGlobalThreatFeed();
    renderMissionsFeedList();
    setupMechanicalKeyboardTyping();
    setupTerminalInputController();
    
    const netCanvas = document.getElementById('network-canvas');
    if (netCanvas) network.init(netCanvas);
    
    setupConfigurationsAdjusters();
    setupAchievementsScoreboards();
    setupBurpProxyViewport();
    setupInventoryToolsView();
    setupDangerZoneControlPanel();
    setupQuickStartMissionBox();
}

function setupQuickStartMissionBox() {
    const btn = document.getElementById('quick-start-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.playClick();
        const completed = store.state.completedMissions || [];
        
        if (completed.length >= 1000) {
            alert("Congratulations! You have completed all 1000 simulated ethical hacking operations clearance levels!");
            return;
        }

        let nextMissionId = 1;
        for (let i = 1; i <= 1000; i++) {
            if (!completed.includes(i)) {
                nextMissionId = i;
                break;
            }
        }
        
        deployMissionWorkstation(nextMissionId);
    });
}

function setupDangerZoneControlPanel() {
    const emailInput = document.getElementById('danger-email-input');
    const emailBadge = document.getElementById('danger-email-badge');
    const updateBtn = document.getElementById('danger-btn-update-email');
    const deleteBtn = document.getElementById('danger-btn-delete-account');

    if (!emailInput) return;

    let emailDebounce;
    emailInput.addEventListener('input', () => {
        clearTimeout(emailDebounce);
        const newEmail = emailInput.value.trim();
        updateBtn.disabled = true;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            emailBadge.className = 'validation-status-badge';
            emailBadge.innerHTML = '';
            return;
        }

        emailBadge.className = 'validation-status-badge pending';
        emailBadge.innerHTML = `
            <svg class="badge-icon badge-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" stroke="rgba(0, 194, 255, 0.15)"></circle>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path>
            </svg>
        `;

        emailDebounce = setTimeout(async () => {
            const exists = await dbClient.checkEmail(newEmail);
            if (exists) {
                emailBadge.className = 'validation-status-badge error';
                emailBadge.innerHTML = `
                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `;
            } else {
                emailBadge.className = 'validation-status-badge success';
                emailBadge.innerHTML = `
                    <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;
                updateBtn.disabled = false;
            }
        }, 500);
    });

    updateBtn.addEventListener('click', async () => {
        sfx.playClick();
        const newEmail = emailInput.value.trim();
        const activeUser = store.state.username;

        if (newEmail && activeUser) {
            updateBtn.textContent = 'UPDATING...';
            updateBtn.disabled = true;
            await dbClient.updateUser(activeUser, { email: newEmail });

            const cacheStr = localStorage.getItem('cyberops_cache_memory');
            if (cacheStr) {
                const cacheData = JSON.parse(cacheStr);
                cacheData.email = newEmail;
                localStorage.setItem('cyberops_cache_memory', JSON.stringify(cacheData));
            }

            sfx.playSuccess();
            updateBtn.textContent = 'UPDATED';
            emailInput.value = '';
            emailBadge.className = 'validation-status-badge';
            emailBadge.innerHTML = '';

            setTimeout(() => {
                updateBtn.textContent = 'UPDATE';
            }, 2000);
        }
    });

    deleteBtn.addEventListener('click', async () => {
        sfx.playClick();
        const confirmPurge = confirm("WARNING: Permament deployment purge will shred your database security profile records, delete all session credentials, and trigger a secure terminal shut down.\n\nAre you sure you wish to shred this account?");
        if (confirmPurge) {
            const activeUser = store.state.username;
            sfx.playError();
            
            if (activeUser) {
                await dbClient.deleteUser(activeUser);
            }

            localStorage.removeItem('cyberops_cache_memory');
            localStorage.removeItem('cyberops_save_data_1_4');

            document.getElementById('app-layout').style.display = 'none';
            document.getElementById('boot-screen').style.display = 'flex';
            document.getElementById('boot-screen').style.opacity = 1;
            document.getElementById('boot-log').innerHTML = '';
            
            setTimeout(() => {
                startBootSequence();
            }, 800);
        }
    });
}

function setupSPAPageRouter() {
    const menuItems = document.querySelectorAll('.sidebar-item');
    const viewPorts = document.querySelectorAll('.view-port');
    const viewTitle = document.getElementById('view-title');

    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sfx.playClick();
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sfx.playClick();
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
        });
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            sfx.playClick();
            const targetTab = item.getAttribute('data-tab');
            
            // Check mission objectives
            shell.checkObjectiveFulfillment('tab_visit', targetTab);
            
            // Cache current active tab in sessionStorage so it persists across refreshes
            sessionStorage.setItem('cyberops_active_tab', targetTab);
            
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            viewPorts.forEach(v => v.classList.remove('active'));
            const targetViewport = document.getElementById(`view-${targetTab}`);
            if (targetViewport) targetViewport.classList.add('active');
            viewTitle.textContent = item.textContent.trim();

            if (sidebar && sidebar.classList.contains('mobile-open')) {
                sidebar.classList.remove('mobile-open');
            }
            if (overlay && overlay.classList.contains('active')) {
                overlay.classList.remove('active');
            }

            if (targetTab === 'inventory-tools') {
                const listPanel = document.getElementById('tools-inventory-list');
                const detailPanel = document.getElementById('tools-inventory-detail');
                if (listPanel && detailPanel) {
                    listPanel.style.display = 'block';
                    detailPanel.style.display = 'none';
                }
            }

            if (targetTab === 'terminal') {
                setTimeout(() => {
                    const input = document.getElementById('terminal-shell-input');
                    if (input) input.focus();
                }, 100);
            }

            if (targetTab === 'network') {
                setTimeout(() => {
                    network.resize();
                    network.buildActiveTopology(store.state.activeMission);
                }, 50);
            }

            if (targetTab === 'burp') {
                setTimeout(() => {
                    const input = document.getElementById('burp-chat-input');
                    if (input) input.focus();
                    const chatHistory = document.getElementById('burp-chat-history');
                    if (chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
                }, 100);
            } else {
                if (window.burpPacketStreamTimer) {
                    clearInterval(window.burpPacketStreamTimer);
                    window.burpPacketStreamTimer = null;
                }
                const pill = document.getElementById('burp-status-pill');
                if (pill) {
                    pill.classList.remove('intercept-active');
                    pill.innerHTML = `<span class="status-dot"></span> PROXY INTERCEPT: IDLE`;
                }
                window.isBurpIntercepting = false;
            }
        });
    });

    // Restore last active tab on page refresh
    const savedActiveTab = sessionStorage.getItem('cyberops_active_tab');
    if (savedActiveTab) {
        const itemToClick = Array.from(menuItems).find(item => item.getAttribute('data-tab') === savedActiveTab);
        if (itemToClick) {
            // Temporarily suppress the mechanical click audio effect during initialization click
            const playClickBackup = sfx.playClick;
            sfx.playClick = () => {};
            itemToClick.click();
            sfx.playClick = playClickBackup;
        }
    }

    document.getElementById('dashboard-active-mission-go-btn').addEventListener('click', () => {
        sfx.playClick();
        if (store.state.activeMissionId) {
            const termTabItem = document.querySelector('[data-tab="terminal"]');
            if (termTabItem) termTabItem.click();
        } else {
            const missionTabItem = document.querySelector('[data-tab="missions"]');
            if (missionTabItem) missionTabItem.click();
        }
    });

    document.getElementById('header-sound-btn').addEventListener('click', () => {
        sfx.initContext();
        const currentMute = store.state.audioMuted;
        store.set({ audioMuted: !currentMute });
        if (currentMute) {
            sfx.playClick();
        }
    });

    document.getElementById('header-logout-btn').addEventListener('click', () => {
        sfx.playClick();
        sfx.stopServerHum();
        sfx.playError();
        
        // Clear cached credentials to prevent auto-login on page refresh/reload
        localStorage.removeItem('cyberops_cache_memory');
        
        // Clear cached tab index to start fresh on the default Command Hub tab upon next login
        sessionStorage.removeItem('cyberops_active_tab');
        
        // Reset the active session user in memory
        bootSessionUser = null;
        
        // Clear active session states in the store to prevent leakage across sessions
        store.set({
            activeMissionId: null,
            activeMission: null,
            activeTargetNode: null,
            activeVFS: {},
            activeDirectory: '/',
            activeObjectives: [],
            terminalOutput: '',
            commandHistory: []
        });
        
        document.getElementById('app-layout').style.display = 'none';
        document.getElementById('auth-screen').style.display = 'flex';
        
        initSidebarMatrixRain();
        
        activeAuthMode = '';
        const modeBtnLogin = document.getElementById('mode-btn-login');
        if (modeBtnLogin) {
            modeBtnLogin.click();
        }
    });
}

function setupNetworkTrafficGraph() {
    const container = document.getElementById('traffic-bars-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 22; i++) {
        const bar = document.createElement('div');
        bar.className = 'traffic-bar';
        const h1 = Math.floor(Math.random() * 50 + 10);
        const h2 = Math.floor(Math.random() * 40 + 50);
        bar.style.setProperty('--h1', `${h1}%`);
        bar.style.setProperty('--h2', `${h2}%`);
        bar.style.animationDelay = `${i * 0.08}s`;
        container.appendChild(bar);
    }
}

function startDynamicHUD() {
    const pingEl = document.getElementById('hud-ping');
    const encryptEl = document.getElementById('hud-encrypt');
    if (!pingEl) return;

    setInterval(() => {
        const basePing = 24;
        const diff = Math.floor(Math.random() * 19) - 8; // -8 to +10
        const currentPing = Math.max(10, basePing + diff);
        pingEl.textContent = `${currentPing}ms`;
    }, 2000);

    if (encryptEl) {
        const ciphers = ['AES-GCM', 'AES-256', 'ChaCha20', 'ECC-384', 'SYS-DH', 'RSA-4096'];
        setInterval(() => {
            if (Math.random() < 0.25) {
                const randomCipher = ciphers[Math.floor(Math.random() * ciphers.length)];
                encryptEl.textContent = randomCipher;
            } else {
                encryptEl.textContent = 'AES-GCM';
            }
        }, 4000);
    }
}

function startDynamicNetworkGraph() {
    const container = document.getElementById('traffic-bars-container');
    const bandwidthEl = document.getElementById('hud-bandwidth');
    if (!container) return;

    setInterval(() => {
        const bars = container.querySelectorAll('.traffic-bar');
        if (bars.length === 0) return;

        const count = Math.floor(Math.random() * 4) + 3; // 3 to 6 bars at a time
        for (let i = 0; i < count; i++) {
            const index = Math.floor(Math.random() * bars.length);
            const bar = bars[index];
            const h1 = Math.floor(Math.random() * 50 + 10);
            const h2 = Math.floor(Math.random() * 40 + 50);
            bar.style.setProperty('--h1', `${h1}%`);
            bar.style.setProperty('--h2', `${h2}%`);
        }
    }, 400);

    if (bandwidthEl) {
        let baseVal = 4.8;
        setInterval(() => {
            const diff = (Math.random() * 1.6) - 0.8; // -0.8 to +0.8
            baseVal = Math.max(2.4, Math.min(8.5, baseVal + diff));
            bandwidthEl.textContent = `ACTIVE BANDWIDTH: ${baseVal.toFixed(1)} GBPS`;
        }, 1500);
    }
}

function startGlobalThreatFeed() {
    const container = document.getElementById('threat-feed-container');
    if (!container) return;

    const threatAttacks = [
        { msg: 'DDoS traffic detected targeting subnet 10.0.1.0/24', type: 'warning' },
        { msg: 'Banking core ledger API backup sync breach attempt', type: 'alert' },
        { msg: 'Malware binary compiled successfully', type: 'safe' },
        { msg: 'SSL Handshake breach logged in server logs', type: 'warning' },
        { msg: 'Intrusion Detection System (IDS) alerts active on edge proxy', type: 'alert' },
        { msg: 'CDN cache flush completed successfully', type: 'safe' }
    ];

    const addThreatLog = () => {
        const now = new Date().toLocaleTimeString();
        const randAttack = threatAttacks[Math.floor(Math.random() * threatAttacks.length)];
        const item = document.createElement('div');
        item.className = 'threat-item';
        item.innerHTML = `
            <span class="threat-time">[${now}]</span>
            <span class="threat-status ${randAttack.type}">${randAttack.type.toUpperCase()}</span>
            <span class="threat-msg">${randAttack.msg}</span>
        `;
        container.insertBefore(item, container.firstChild);
        if (container.children.length > 15) {
            container.removeChild(container.lastChild);
        }
    };
    for (let i = 0; i < 6; i++) { addThreatLog(); }
    setInterval(addThreatLog, 6000);
}

function renderMissionsFeedList() {
    const container = document.getElementById('missions-cards-container');
    if (!container) return;
    container.innerHTML = '';
    
    const searchWrapper = document.createElement('div');
    searchWrapper.style.gridColumn = '1 / -1';
    searchWrapper.style.display = 'flex';
    searchWrapper.style.gap = '15px';
    searchWrapper.style.marginBottom = '15px';
    searchWrapper.innerHTML = `
        <input class="form-input" type="text" id="mission-search-bar" placeholder="Search by Target Company or Domain..." style="flex-grow:1; font-size: 0.95rem;">
        <input class="form-input" type="number" id="mission-jump-id" placeholder="Jump directly to Mission ID (1-1000)" min="1" max="1000" style="width: 250px; font-size: 0.95rem;">
    `;
    container.appendChild(searchWrapper);

    const filterMissions = () => {
        const query = document.getElementById('mission-search-bar').value.toLowerCase();
        const jumpIdVal = parseInt(document.getElementById('mission-jump-id').value);
        return missionsList.filter(m => {
            const matchesTier = currentFilter === 'all' || m.difficulty === currentFilter;
            const matchesQuery = m.name.toLowerCase().includes(query) || m.baseDomain.toLowerCase().includes(query);
            const matchesJumpId = isNaN(jumpIdVal) || m.id === jumpIdVal;
            return matchesTier && matchesQuery && matchesJumpId;
        });
    };

    const drawCards = () => {
        const existingCards = container.querySelectorAll('.mission-card, .btn-neon');
        existingCards.forEach(c => c.remove());

        const matched = filterMissions();
        const slice = matched.slice(0, visibleMissionsCount);

        if (slice.length === 0) {
            const empty = document.createElement('div');
            empty.style.gridColumn = '1 / -1';
            empty.style.textAlign = 'center';
            empty.style.color = 'var(--color-text-muted)';
            empty.style.padding = '30px';
            empty.textContent = 'No simulated security targets matched active filtration query.';
            container.appendChild(empty);
            return;
        }

        slice.forEach(m => {
            const card = document.createElement('div');
            const isCompleted = store.state.completedMissions.includes(m.id);
            card.className = `mission-card${isCompleted ? ' completed' : ''}`;
            
            const statusLabel = isCompleted ? `
                <span class="status-badge-completed">
                    <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle; color: var(--color-green); filter: drop-shadow(0 0 2px var(--color-green-glow));">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span style="color: var(--color-green); font-weight: bold; text-shadow: 0 0 8px var(--color-green-glow); font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.5px;">ROOTED</span>
                </span>
            ` : `
                <span class="status-badge-pending">
                    <svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle; color: var(--color-text-muted); opacity: 0.6;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span style="color: var(--color-text-muted); font-family: var(--font-mono); font-size: 0.75rem; letter-spacing: 0.5px; opacity: 0.7;">AVAILABLE</span>
                </span>
            `;
            
            card.innerHTML = `
                <div class="mission-header">
                    <span class="mission-difficulty difficulty-${m.difficulty}">${m.difficulty}</span>
                    <span style="font-family: var(--font-mono); font-size: 0.8rem;">${statusLabel}</span>
                </div>
                <div class="mission-name">${m.name}</div>
                <div class="mission-desc">Deploy isolated virtual sandbox for target domain: ${m.baseDomain}. Conduct security audit diagnostics.</div>
                <div class="mission-footer">
                    <div class="mission-rewards">
                        CRD: <span class="reward-highlight">+${m.credits}</span> | XP: <span class="reward-highlight">+${m.xp}</span>
                    </div>
                    <button class="btn-neon" style="padding: 6px 12px; font-size: 0.85rem;" data-mission-id="${m.id}">
                        ${isCompleted ? 'RE-DEPLOY' : 'ACCEPT DEPLOY'}
                    </button>
                </div>
            `;
            card.querySelector('button').addEventListener('click', () => {
                sfx.playClick();
                deployMissionWorkstation(m.id);
            });
            container.appendChild(card);
        });

        if (matched.length > visibleMissionsCount) {
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'btn-neon';
            loadMoreBtn.style.gridColumn = '1 / -1';
            loadMoreBtn.style.margin = '20px auto';
            loadMoreBtn.textContent = 'LOAD MORE DISCOVERED TARGETS...';
            loadMoreBtn.addEventListener('click', () => {
                sfx.playClick();
                visibleMissionsCount += 30;
                drawCards();
            });
            container.appendChild(loadMoreBtn);
        }
    };

    const filters = document.querySelectorAll('.filter-btn');
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            sfx.playClick();
            filters.forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            visibleMissionsCount = 30;
            drawCards();
        });
    });

    document.getElementById('mission-search-bar').addEventListener('input', drawCards);
    document.getElementById('mission-jump-id').addEventListener('input', drawCards);
    
    // Subscribe reactively to redraw when completion lists update
    store.subscribe((state, prevState) => {
        if (!prevState || (state.completedMissions && prevState.completedMissions && state.completedMissions.length !== prevState.completedMissions.length)) {
            drawCards();
        }
    });
}

function deployMissionWorkstation(missionId) {
    const detailedMission = generateMission(missionId);
    store.set({
        activeMissionId: missionId,
        activeMission: detailedMission,
        activeTargetNode: detailedMission.targetIP,
        activeVFS: detailedMission.vfs,
        activeDirectory: '/',
        activeObjectives: detailedMission.objectives
    });

    document.getElementById('term-meta-domain').textContent = detailedMission.baseDomain;
    document.getElementById('term-meta-ip').textContent = detailedMission.targetIP;
    document.getElementById('term-meta-ports').textContent = detailedMission.difficulty === 'easy' ? '22, 80' : '22, 80, 3306, 8080';
    document.getElementById('term-meta-os').textContent = detailedMission.difficulty === 'hard' ? 'Ubuntu 22.04 LTS (WAF Enabled)' : 'Debian GNU/Linux 11';
    document.getElementById('terminal-session-status').textContent = `ACTIVE TARGET: ${detailedMission.baseDomain.toUpperCase()}`;
    document.getElementById('active-mission-difficulty-hud').textContent = detailedMission.difficulty.toUpperCase();
    document.getElementById('active-mission-difficulty-hud').className = `mission-difficulty difficulty-${detailedMission.difficulty}`;

    renderObjectivesInspectorList();

    const outputContainer = document.getElementById('terminal-output-container');
    const user = (store.state.username || 'guest').toLowerCase();
    const termPrompt = document.getElementById('terminal-prompt-string');
    if (termPrompt) termPrompt.textContent = `${user}@cyberops:~$`;
    
    const bannerLog = `
Establishing SSH secure tunnel link to target gateway: ${detailedMission.targetIP}...
Access established over RSA-4096 relay node channels.
Authorized guest login session initiated for operator: ${store.state.username}

[CONNECTED TO SIMULATED TARGET INFRASTRUCTURE]
Type "help" to review simulated cybersecurity toolkit.
`;
    outputContainer.innerHTML = bannerLog;
    shell.history = [];
    shell.historyIdx = -1;

    document.getElementById('dashboard-active-mission-name').textContent = detailedMission.name;
    document.getElementById('dashboard-active-mission-body').textContent = detailedMission.description;
    document.getElementById('dashboard-active-mission-go-btn').textContent = 'DEPLOY WORKSTATION';

    const workstationTab = document.querySelector('[data-tab="terminal"]');
    if (workstationTab) workstationTab.click();
}

function renderObjectivesInspectorList() {
    const container = document.getElementById('terminal-objectives-container');
    if (!container) return;
    container.innerHTML = '';
    const state = store.state;

    if (!state.activeObjectives || state.activeObjectives.length === 0) {
        container.innerHTML = `<div style="color: var(--color-text-muted); font-size: 0.9rem;">No active objectives loaded. Accept target mission.</div>`;
        return;
    }

    const allDone = state.activeObjectives.every(obj => obj.completed);
    if (allDone) {
        const statusBanner = document.createElement('div');
        statusBanner.className = 'mission-completion-banner';
        statusBanner.innerHTML = `
            <div style="background: rgba(0, 255, 102, 0.06); border: 1px solid var(--color-green); border-radius: 4px; padding: 10px; margin-bottom: 15px; font-family: var(--font-mono); font-size: 0.85rem; text-align: center; color: var(--color-green); box-shadow: 0 0 10px rgba(0, 255, 102, 0.1); filter: drop-shadow(0 0 2px rgba(0, 255, 102, 0.1));">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 6px; display: inline-block; vertical-align: middle;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span style="font-weight: bold; letter-spacing: 0.5px; vertical-align: middle; text-shadow: 0 0 5px var(--color-green-glow);">SYSTEM ROOTED SECURELY</span>
            </div>
        `;
        container.appendChild(statusBanner);
    }

    state.activeObjectives.forEach(obj => {
        const item = document.createElement('div');
        item.className = `objective-item ${obj.completed ? 'completed' : ''}`;
        item.innerHTML = `
            <div class="objective-checkbox"></div>
            <div class="objective-text">${obj.text}</div>
        `;
        container.appendChild(item);
    });
}

store.subscribe((state) => {
    renderObjectivesInspectorList();
});

function setupTerminalInputController() {
    const input = document.getElementById('terminal-shell-input');
    const outputContainer = document.getElementById('terminal-output-container');
    const scrollEl = document.getElementById('terminal-screen-element');
    if (!input || !outputContainer) return;

    // Custom simulated terminal cursor caret sync
    const syncTerminalCaretGhost = () => {
        const ghostBefore = document.getElementById('terminal-input-ghost-before');
        const ghostAfter = document.getElementById('terminal-input-ghost-after');
        if (!ghostBefore || !ghostAfter) return;

        const val = input.value;
        const pos = input.selectionStart || 0;
        ghostBefore.textContent = val.substring(0, pos);
        ghostAfter.textContent = val.substring(pos);
    };

    // Bind keyboard, selection, and focus events to capture user input interactively
    input.addEventListener('input', syncTerminalCaretGhost);
    input.addEventListener('keyup', syncTerminalCaretGhost);
    input.addEventListener('keydown', (e) => {
        setTimeout(syncTerminalCaretGhost, 0);
    });
    input.addEventListener('click', syncTerminalCaretGhost);
    input.addEventListener('focus', syncTerminalCaretGhost);
    input.addEventListener('blur', syncTerminalCaretGhost);

    // Continuous robust background synchronizer to catch tab autocompletes, program clears, etc.
    setInterval(syncTerminalCaretGhost, 35);

    store.subscribe((state) => {
        const promptEl = document.getElementById('terminal-prompt-string');
        const sessionStatusEl = document.getElementById('terminal-session-status');
        const detailed = state.activeMission;
        if (detailed) {
            const isCompleted = state.completedMissions.includes(detailed.id);
            if (sessionStatusEl) {
                sessionStatusEl.innerHTML = `ACTIVE TARGET: ${detailed.baseDomain.toUpperCase()} ${isCompleted ? '<span style="color: var(--color-green); font-family: var(--font-mono); font-size: 0.75rem; border: 1px solid var(--color-green); padding: 1px 6px; margin-left: 10px; background: rgba(0, 255, 102, 0.05); text-shadow: 0 0 5px var(--color-green-glow);">[✓ SECURED]</span>' : '<span style="color: var(--color-orange); font-family: var(--font-mono); font-size: 0.75rem; border: 1px solid var(--color-orange); padding: 1px 6px; margin-left: 10px; background: rgba(255, 106, 0, 0.05); text-shadow: 0 0 5px var(--color-orange-glow);">[ACTIVE]</span>'}`;
            }
            if (promptEl) {
                promptEl.textContent = `root_admin@${detailed.hostName.split('-')[0]}:${state.activeDirectory === '/' ? '/' : state.activeDirectory.substring(state.activeDirectory.lastIndexOf('/'))}$ `;
            }
        } else {
            if (sessionStatusEl) sessionStatusEl.textContent = 'OFFLINE (NO TARGET ACQUIRED)';
            if (promptEl) {
                const user = (state.username || 'guest').toLowerCase();
                promptEl.textContent = `${user}@cyberops:~$ `;
            }
        }
    });

    input.addEventListener('keydown', (e) => {
        const cmdVal = input.value;
        if (e.key === 'Tab') {
            e.preventDefault();
            handleTabAutocomplete(cmdVal);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (shell.history.length > 0) {
                shell.historyIdx = Math.max(0, shell.historyIdx - 1);
                input.value = shell.history[shell.historyIdx] || '';
            }
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (shell.history.length > 0) {
                shell.historyIdx = Math.min(shell.history.length, shell.historyIdx + 1);
                input.value = shell.history[shell.historyIdx] || '';
            }
            return;
        }

        if (e.key === 'Enter') {
            const rawCmd = cmdVal.trim();
            input.value = '';
            if (!rawCmd) return;

            const activePrompt = document.getElementById('terminal-prompt-string').textContent;
            outputContainer.innerHTML += `\n${activePrompt}${rawCmd}`;

            if (rawCmd.toLowerCase() === 'clear') {
                outputContainer.innerHTML = '';
                return;
            }

            const result = shell.execute(rawCmd);
            if (result === 'OPEN_EDITOR_TRIGGERED') return;

            if (result && result.startsWith('CRACK_SIMULATION:')) {
                const targetHash = result.split(':')[1];
                runHashcatCrackSimulation(targetHash, outputContainer, scrollEl);
                return;
            }

            if (result) {
                outputContainer.innerHTML += `\n${result}`;
            }
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    });

    scrollEl.addEventListener('click', (e) => {
        const editor = document.getElementById('nano-editor-panel');
        if (editor && editor.style.display === 'flex') return;
        
        // Prevent stealing focus and wiping out active user text highlights/selection
        if (window.getSelection() && window.getSelection().toString() !== '') return;
        
        input.focus();
    });
}

function handleTabAutocomplete(inputStr) {
    const inputEl = document.getElementById('terminal-shell-input');
    if (!inputEl) return;
    const parts = inputStr.trim().split(/\s+/);
    const cmd = parts[0];
    const arg = parts.slice(1).join(' ');

    if (parts.length === 1) {
        const commandSet = [...store.state.unlockedTools, 'help', 'clear', 'submit'];
        const matches = commandSet.filter(c => c.startsWith(cmd));
        if (matches.length === 1) {
            inputEl.value = `${matches[0]} `;
        }
    } else {
        const currentPath = store.state.activeDirectory;
        const node = store.state.activeVFS[currentPath];
        if (node && node.type === 'dir') {
            const matches = node.children.filter(name => name.startsWith(arg));
            if (matches.length === 1) {
                inputEl.value = `${cmd} ${matches[0]}`;
            }
        }
    }
}

function runHashcatCrackSimulation(targetHash, outputContainer, scrollEl) {
    const inputLine = document.querySelector('.terminal-input-line');
    if (inputLine) inputLine.style.display = 'none';

    outputContainer.innerHTML += `\nStarting hashcat v6.2.5 on GPU simulated nodes...\nAnalyzing target MD5 hashes dictionary algorithms...`;
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;

    let progress = 0;
    const progressSpan = document.createElement('div');
    progressSpan.style.fontFamily = "var(--font-mono)";
    progressSpan.style.color = "var(--color-orange)";
    outputContainer.appendChild(progressSpan);

    const crackInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 8 + 5);
        if (progress >= 100) {
            progress = 100;
            clearInterval(crackInterval);
            const correctPass = store.state.activeMission ? store.state.activeMission.cleartextPass : 'DecryptedAdmin123';
            progressSpan.innerHTML = `[GPU SWEEP STATUS: 100%] — SIMULATED AUDIT MATCH FOUND!\n\nMD5 HASH CRACKED:\n  Target Hash:  ${targetHash}\n  Plaintext:    <span style="color: var(--color-green); font-weight: bold; text-shadow: 0 0 5px var(--color-green);">${correctPass}</span>\n`;
            if (inputLine) inputLine.style.display = 'flex';
            shell.checkObjectiveFulfillment('hash_crack', targetHash, correctPass);
            sfx.playSuccess();
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
        } else {
            progressSpan.textContent = `[GPU AUDIT SCAN: ${progress}%...] CRACKING ENCRYPTED DIRECTORIES...`;
            sfx.playClick();
            if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
        }
    }, 150);
}

const nanoTextarea = document.getElementById('nano-editor-textarea');
const nanoPanel = document.getElementById('nano-editor-panel');
if (nanoTextarea && nanoPanel) {
    nanoTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'o') {
            e.preventDefault();
            shell.saveNanoContent(nanoTextarea.value);
            sfx.playSuccess();
            const out = document.getElementById('terminal-output-container');
            if (out) out.innerHTML += `\n[nano] File updated and saved successfully inside VFS directory.`;
        }
        if (e.ctrlKey && e.key === 'x') {
            e.preventDefault();
            nanoPanel.style.display = 'none';
            sfx.playClick();
            const shellInput = document.getElementById('terminal-shell-input');
            if (shellInput) shellInput.focus();
        }
    });
}

function setupMechanicalKeyboardTyping() {
    // Prevent duplicate global keyboard event listeners across page routing or boot bootstrap calls
    if (window.hasMechanicalKeyboardListener) return;
    window.hasMechanicalKeyboardListener = true;

    // Global Keydown Keyboard sound handler
    window.addEventListener('keydown', (e) => {
        // 1. Ignore modifier/control keys to keep keyboard typing natural and satisfying
        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        
        // 2. Ignore browser command shortcuts (like Ctrl+C, Ctrl+V, Alt+Tab, Cmd+R, etc.)
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        // 3. Play highly satisfying mechanical Cherry MX Blue switch click & body thud sound
        sfx.playKeyClack(e.key);
    }, { capture: true }); // Use capture to play sound even if inner elements stopPropagation

    // Workstation global typing focus redirector
    window.addEventListener('keydown', (e) => {
        // Only redirect single alphanumeric or symbolic character typing keys
        if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;

        const terminalInput = document.getElementById('terminal-shell-input');
        if (!terminalInput) return;

        // Verify that we are active on the main workstation view tab
        const activeTab = document.querySelector('.sidebar-item.active');
        if (!activeTab || activeTab.getAttribute('data-page') !== 'workstation') return;

        // If the user is already typing inside a valid form input or editor textarea, do not steal focus!
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

        // Automatically shift focus to terminal input fluidly!
        terminalInput.focus();
    }, { capture: true });
}

function setupConfigurationsAdjusters() {
    // 1. Reactive State subscription for settings panel selectors and inputs
    store.subscribe((state) => {
        // Audio master elements
        const volSlider = document.getElementById('settings-audio-volume');
        if (volSlider) volSlider.value = state.audioVolume;

        const volSwitch = document.getElementById('settings-audio-effects');
        if (volSwitch) volSwitch.checked = !state.audioMuted;

        // Granular switches
        const kbdSwitch = document.getElementById('settings-audio-keyboard');
        if (kbdSwitch) kbdSwitch.checked = state.audioKeyboardEnabled !== undefined ? state.audioKeyboardEnabled : true;

        const clkSwitch = document.getElementById('settings-audio-clicks');
        if (clkSwitch) clkSwitch.checked = state.audioClickEnabled !== undefined ? state.audioClickEnabled : true;

        const altSwitch = document.getElementById('settings-audio-alerts');
        if (altSwitch) altSwitch.checked = state.audioAlertsEnabled !== undefined ? state.audioAlertsEnabled : true;

        const humSwitch = document.getElementById('settings-audio-hum');
        if (humSwitch) humSwitch.checked = state.audioHumEnabled !== undefined ? state.audioHumEnabled : true;

        // Visual Matrix
        const matrixSwitch = document.getElementById('settings-visual-matrix');
        if (matrixSwitch) matrixSwitch.checked = state.visualMatrix;

        // Active modifiers styling: Cursor Toggles
        document.querySelectorAll('#cursor-state-buttons .btn-appearance-select').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === state.cursorState);
        });

        // Active modifiers styling: Monospace Font Toggles
        document.querySelectorAll('#shell-font-buttons .btn-appearance-select').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === state.shellFont);
        });

        // Active modifiers styling: Theme Cards
        document.querySelectorAll('#theme-picker-container .theme-card').forEach(card => {
            card.classList.toggle('active', card.getAttribute('data-theme') === state.activeTheme);
        });

        // Active modifiers styling: Keyboard sound profile
        document.querySelectorAll('#keyboard-profile-buttons .btn-appearance-select').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === state.audioKeyboardProfile);
        });

        // Active modifiers styling: Click sound profile
        document.querySelectorAll('#click-profile-buttons .btn-appearance-select').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-value') === state.audioClickProfile);
        });
    });

    // 2. Setup active click event listeners to dispatch updates to StateStore
    // Master Gain Slider
    const volSlider = document.getElementById('settings-audio-volume');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            store.set({ audioVolume: parseFloat(e.target.value) });
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    }

    // Master Sound Switch
    const volSwitch = document.getElementById('settings-audio-effects');
    if (volSwitch) {
        volSwitch.addEventListener('change', (e) => {
            store.set({ audioMuted: !e.target.checked });
            sfx.playClick();
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    }

    // Granular audio switches
    document.getElementById('settings-audio-keyboard')?.addEventListener('change', (e) => {
        store.set({ audioKeyboardEnabled: e.target.checked });
        sfx.playClick();
        shell.checkObjectiveFulfillment('settings_change', 'changed');
    });

    document.getElementById('settings-audio-clicks')?.addEventListener('change', (e) => {
        store.set({ audioClickEnabled: e.target.checked });
        sfx.playClick();
        shell.checkObjectiveFulfillment('settings_change', 'changed');
    });

    document.getElementById('settings-audio-alerts')?.addEventListener('change', (e) => {
        store.set({ audioAlertsEnabled: e.target.checked });
        sfx.playClick();
        shell.checkObjectiveFulfillment('settings_change', 'changed');
    });

    document.getElementById('settings-audio-hum')?.addEventListener('change', (e) => {
        store.set({ audioHumEnabled: e.target.checked });
        sfx.playClick();
        shell.checkObjectiveFulfillment('settings_change', 'changed');
    });

    // Matrix Rain Switch
    const matrixSwitch = document.getElementById('settings-visual-matrix');
    if (matrixSwitch) {
        matrixSwitch.addEventListener('change', (e) => {
            store.set({ visualMatrix: e.target.checked });
            sfx.playClick();
            const canvas = document.getElementById('matrix-canvas');
            if (canvas) canvas.style.display = e.target.checked ? 'block' : 'none';
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    }

    // Cursor shape toggles click
    document.querySelectorAll('#cursor-state-buttons .btn-appearance-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-value');
            store.set({ cursorState: val });
            sfx.playClick();
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    });

    // Monospace font family buttons click
    document.querySelectorAll('#shell-font-buttons .btn-appearance-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-value');
            store.set({ shellFont: val });
            sfx.playClick();
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    });

    // Cyberpunk color theme cards click
    document.querySelectorAll('#theme-picker-container .theme-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const targetCard = e.currentTarget;
            const val = targetCard.getAttribute('data-theme');
            store.set({ activeTheme: val });
            sfx.playClick();
            shell.checkObjectiveFulfillment('settings_change', 'changed');
        });
    });

    // Keyboard Typist Profile buttons click
    document.querySelectorAll('#keyboard-profile-buttons .btn-appearance-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-value');
            store.set({ audioKeyboardProfile: val });
            sfx.playClick();
        });
    });

    // UI Click Profile buttons click
    document.querySelectorAll('#click-profile-buttons .btn-appearance-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = e.target.getAttribute('data-value');
            store.set({ audioClickProfile: val });
            sfx.playClick();
        });
    });

    // Flush Progress WIPE button click
    document.getElementById('settings-btn-reset-data')?.addEventListener('click', () => {
        if (confirm("Are you sure you want to wipe all operator credentials, level stats, and custom achievements?")) {
            sfx.playError();
            store.resetProgress();
            window.location.reload();
        }
    });
}

function setupAchievementsScoreboards() {
    const achievementsContainer = document.getElementById('achievements-cards-container');
    const leaderboardContainer = document.getElementById('leaderboard-scores-container');
    if (!achievementsContainer || !leaderboardContainer) return;

    const getMissionDifficulty = (missionId) => {
        const idx = (missionId - 1) % 50;
        if (idx >= 39 && idx <= 49) return 'easy';
        if (idx >= 13 && idx <= 38) return 'medium';
        return 'hard';
    };

    const achievementsSet = [
        { 
            id: 'linux_apprentice', 
            title: 'LINUX APPRENTICE', 
            desc: 'Successfully finished the basic system Navigation mission.', 
            unlockCheck: (state) => state.completedMissions.some(id => getMissionDifficulty(id) === 'easy') 
        },
        { 
            id: 'port_specialist', 
            title: 'PORT SPECIALIST', 
            desc: 'Audit remote port layouts utilizing active scan telemetry.', 
            unlockCheck: (state) => state.completedMissions.some(id => getMissionDifficulty(id) === 'medium') 
        },
        { 
            id: 'sql_breaker', 
            title: 'SQL BREAKER', 
            desc: 'Exploit structural software APIs using automated tools.', 
            unlockCheck: (state) => state.level >= 3 
        },
        { 
            id: 'sec_ops_elite', 
            title: 'SEC OPS ELITE', 
            desc: 'Root administrative vaults under critical lock settings.', 
            unlockCheck: (state) => state.completedMissions.some(id => getMissionDifficulty(id) === 'hard') 
        },
        { 
            id: 'ai_synchronized', 
            title: 'AI SYNCHRONIZED SPECIALIST', 
            desc: 'Query the OS Co-Pilot advisor for cyber guidance.', 
            unlockCheck: (state) => state.level >= 5 
        }
    ];

    const scoreboardRun = [
        { alias: 'ZERO_COOL', rep: 2980, lvl: 25 },
        { alias: 'ACID_BURN', rep: 2450, lvl: 21 },
        { alias: 'LORD_NIKON', rep: 1890, lvl: 16 },
        { alias: 'CEREB_PHREAK', rep: 1250, lvl: 12 },
        { alias: 'OPERATOR_101', rep: 0, lvl: 1, isUserPlaceholder: true }
    ];

    store.subscribe((state) => {
        achievementsContainer.innerHTML = '';
        achievementsSet.forEach(ac => {
            const unlocked = ac.unlockCheck(state);
            const card = document.createElement('div');
            card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
            card.innerHTML = `
                <div class="ach-card-icon-box">
                    <i data-lucide="${unlocked ? 'shield-check' : 'lock'}"></i>
                </div>
                <div class="achievement-details">
                    <div class="achievement-title">${ac.title}</div>
                    <div class="achievement-desc">${ac.desc}</div>
                </div>
            `;
            achievementsContainer.appendChild(card);
        });

        // Update Dynamic Stats in the top row
        const completed = state.completedMissions.length;
        let milestone = 4;
        if (completed >= 4) milestone = 10;
        if (completed >= 10) milestone = 50;
        if (completed >= 50) milestone = 100;

        let deckRank = "APPRENTICE CADET";
        if (state.level >= 3) deckRank = "SCRIPT ANALYST";
        if (state.level >= 6) deckRank = "OPERATIVE SPECIALIST";
        if (state.level >= 10) deckRank = "PENETRATION OPERATIVE";
        if (state.level >= 15) deckRank = "INFILTRATOR CORE";
        if (state.level >= 20) deckRank = "CYBER GHOST ARCHIVE";

        const unlockedCount = achievementsSet.filter(ac => ac.unlockCheck(state)).length;

        const deckEl = document.getElementById('ach-stat-deck');
        const contractsEl = document.getElementById('ach-stat-contracts');
        const badgesEl = document.getElementById('ach-stat-badges');

        if (deckEl) deckEl.textContent = deckRank;
        if (contractsEl) contractsEl.textContent = `${completed} of ${milestone} CONTRACTS`;
        if (badgesEl) badgesEl.textContent = `${unlockedCount} of 5 BADGES`;

        // Render newly added lucide icons safely
        safeCreateIcons();

        leaderboardContainer.innerHTML = '';
        const sorted = scoreboardRun.map(plyr => {
            if (plyr.isUserPlaceholder) {
                return { alias: state.username, rep: state.reputation, lvl: state.level, isUserPlaceholder: true };
            }
            return plyr;
        }).sort((a, b) => b.rep - a.rep);

        sorted.forEach((plyr, idx) => {
            const row = document.createElement('div');
            row.className = `leaderboard-row ${plyr.isUserPlaceholder ? 'current-user' : ''}`;
            row.innerHTML = `
                <div>
                    <span class="leaderboard-rank">#${idx + 1}</span>
                    <span style="color:#FFF;">${plyr.alias}</span>
                </div>
                <div style="font-family: var(--font-mono); color: var(--color-text-muted);">
                    LVL: <span style="color:#FFF;">${plyr.lvl}</span> | <span style="color: var(--color-green); font-weight:bold;">${plyr.rep} rep</span>
                </div>
            `;
            leaderboardContainer.appendChild(row);
        });
    });
}

/* ==========================================================================
   PART VII. BURP PROXY & WIRESHARK INTERCEPTOR ENGINE
   ========================================================================== */
const BURP_PACKETS_DATABASE = [
    {
        id: "P_1",
        protocol: "SQL",
        source: "193.5.55.10", // Swiss National Bank (central_gov)
        destination: "159.45.10.12", // Chase Manhattan (commercial_finance)
        length: "133 B",
        info: "PORT GRAB: Banner requests on port 80",
        hexDecompilation: `PORT GRAB: Banner requests on port 80\nConnection: close\nRequest: GET / HTTP/1.0\n\n--- HEX STREAM ANALYSIS ---\n0000  50 4f 52 54 20 47 52 41  42 3a 20 42 61 6e 6e 65  PORT GRAB: Banne\n0010  72 20 72 65 71 75 65 73  74 73 20 6f 6e 20 70 6f  r requests on po\n0020  72 74 20 38 30                                    rt 80`
    },
    {
        id: "P_2",
        protocol: "HTTP",
        source: "8.8.8.8", // Google Auth Mainframe (tech_commerce)
        destination: "162.210.11.13", // Wells Fargo (commercial_finance)
        length: "242 B",
        info: "GET /index.html HTTP/1.1",
        hexDecompilation: `Host: blog-alpha.local\nUser-Agent: Mozilla/5.0-Nmap\nConnection: keep-alive\nAccept: text/html,application/xhtml+xml\nAccept-Language: en-US,en;q=0.5\n\n--- HEX STREAM ANALYSIS ---\n0000  47 45 54 20 2f 69 6e 64  65 78 2e 68 74 6d 6c 20  GET /index.html \n0010  48 54 54 50 2f 31 2e 31  0d 0a 48 6f 73 74 3a 20  HTTP/1.1..Host: \n0020  62 6c 6f 67 2d 61 6c 70  68 61 2e 6c 6f 63 61 6c  blog-alpha.local\n0030  0d 0a 55 73 65 72 2d 41  67 65 6e 74 3a 20 4d 6f  ..User-Agent: Mo\n0040  7a 69 6c 6c 61 2f 35 2e  30 2d 4e 6d 61 70        zilla/5.0-Nmap`
    },
    {
        id: "P_3",
        protocol: "SQL",
        source: "59.160.100.12", // Reserve Bank of India (central_gov)
        destination: "162.198.13.11", // Goldman Sachs Ledger (commercial_finance)
        length: "341 B",
        info: "SELECT * FROM products WHERE search ...",
        hexDecompilation: `Host: database-master.local\nQuery: SELECT * FROM products WHERE search = 'books' UNION SELECT username, password FROM users --\nDatabase: shopcore_db\n\n--- HEX STREAM ANALYSIS ---\n0000  53 45 4c 45 43 54 20 2a  20 46 52 4f 4d 20 70 72  SELECT * FROM pr\n0010  6f 64 75 63 74 73 20 57  48 45 52 20 73 65 61 72  oducts WHERE sea\n0020  72 63 68 20 3d 20 27 62  6f 6f 6b 73 27 20 55 4e  rch = 'books' UN\n0030  49 4f 4e 20 53 45 4c 45  43 54 20 75 73 65 72 6e  ION SELECT usern\n0040  61 6d 65 2c 20 70 61 73  73 77 6f 72 64 20        ame, password `
    },
    {
        id: "P_4",
        protocol: "TCP",
        source: "210.140.10.45", // Bank of Japan (central_gov)
        destination: "17.142.51.10", // Apple iCloud Storage (tech_commerce)
        length: "64 B",
        info: "8000 -> 22 [SYN] Seq=0 Win=64240",
        hexDecompilation: `Source Port: 8000\nDestination Port: 22 (SSH)\nSequence Number: 0\nAcknowledgment Number: 0\nHeader Length: 40 bytes\nFlags: 0x002 (SYN)\nWindow Size: 64240\n\n--- HEX STREAM ANALYSIS ---\n0000  1f 40 00 16 00 00 00 00  00 00 00 00 a0 02 fa f0  .@............\n0010  6b a0 00 00 02 04 05 b4  04 02 08 0a 38 a1 f3 15  k...........8...\n0020  00 00 00 00 01 03 03 07                           ........`
    },
    {
        id: "P_5",
        protocol: "DNS",
        source: "12.18.99.1", // NSA Crypt-Core (central_gov)
        destination: "54.239.50.20", // Amazon AWS-Core (tech_commerce)
        length: "128 B",
        info: "Standard query A blog-alpha.local",
        hexDecompilation: `Transaction ID: 0x2a3f\nFlags: 0x0100 Standard query\nQuestions: 1\nAnswer RRs: 0\nAuthority RRs: 0\nQueries:\n  Name: blog-alpha.local\n  Type: A (Host Address)\n  Class: IN (Internet)\n\n--- HEX STREAM ANALYSIS ---\n0000  2a 3f 01 00 00 01 00 00  00 00 00 00 0a 62 6c 6f  *?...........blo\n0010  67 2d 61 6c 70 68 61 05  6c 6f 63 61 6c 00 00 01  g-alpha.local...\n0020  00 01                                             ..`
    }
];

const MOCK_INFO_POOLS = [
    { proto: "HTTP", info: "GET /admin_backdoor HTTP/1.1", hex: "GET /admin_backdoor HTTP/1.1\nHost: target-gate.local\nUser-Agent: curl/7.81.0\nAccept: */*\n\n--- HEX STREAM ANALYSIS ---\n0000  47 45 54 20 2f 61 64 6d  69 6e 5f 62 61 63 6b 64  GET /admin_backd\n0010  6f 6f 72 20 48 54 54 50  2f 31 2e 31 0d 0a 48 6f  oor HTTP/1.1..Ho\n0020  73 74 3a 20 74 61 72 67  65 74 2d 67 61 74 65 2e  st: target-gate." },
    { proto: "SQL", info: "SELECT * FROM config WHERE name='db_pass'", hex: "Query: SELECT * FROM config WHERE name='db_pass'\nDatabase: main_ledger\n\n--- HEX STREAM ANALYSIS ---\n0000  53 45 4c 45 43 54 20 2a  20 46 52 4f 4d 20 63 6f  SELECT * FROM co\n0010  6e 66 69 67 20 57 48 45  52 45 20 6e 61 6d 65 3d  nfig WHERE name=\n0020  27 64 62 5f 70 61 73 73  27                       'db_pass'" },
    { proto: "TCP", info: "42100 -> 3306 [SYN] Seq=0 Win=65535", hex: "Source Port: 42100\nDestination Port: 3306 (MySQL)\nFlags: 0x002 (SYN)\nWindow: 65535\n\n--- HEX STREAM ANALYSIS ---\n0000  a4 74 0c ea 00 00 00 00  00 00 00 00 a0 02 ff 3f  .t.............?\n0010  d4 f1 00 00 02 04 05 b4                           ........" },
    { proto: "DNS", info: "Standard query A db-backup.local", hex: "DNS query transaction: 0x8b12\nFlags: 0x0100 Standard query\nQuery: db-backup.local\n\n--- HEX STREAM ANALYSIS ---\n0000  8b 12 01 00 00 01 00 00  00 00 00 00 09 64 62 2d  .............db-\n0010  62 61 63 6b 75 70 05 6c  6f 63 61 6c 00 00 01 00  backup.local...." }
];

let generatedPacketIndex = 6;
let activePacketId = "P_2";
window.isBurpIntercepting = false;
window.burpPacketStreamTimer = null;

function generateProceduralPacket() {
    const pool = MOCK_INFO_POOLS[Math.floor(Math.random() * MOCK_INFO_POOLS.length)];
    const mission = store.state.activeMission;
    const servers = SERVERS_DATABASE;
    
    // Select destination IP from our real topology database
    let destServer = servers[Math.floor(Math.random() * servers.length)];
    let dest = destServer.ip;
    
    // With high probability (60%), target the active mission scanning IP so it aligns perfectly with interception narrative
    const activeTargetIndex = mission ? (mission.id - 1) % 50 : -1;
    const activeTargetServer = activeTargetIndex >= 0 ? servers[activeTargetIndex] : null;
    
    if (activeTargetServer && Math.random() < 0.6) {
        dest = mission.targetIP;
    }
    
    // Select source IP from another topology database server (not equal to destination)
    let srcServer = servers[Math.floor(Math.random() * servers.length)];
    let source = srcServer.ip;
    if (source === dest) {
        source = servers[(srcServer.id + 1) % servers.length].ip;
    }
    
    const pktId = `P_${generatedPacketIndex++}`;
    
    // Dynamically spawn the packet animation on the Infrastructure Map!
    if (typeof network !== 'undefined' && typeof network.spawnPacket === 'function') {
        network.spawnPacket(source, dest);
    }
    
    return {
        id: pktId,
        protocol: pool.proto,
        source: source,
        destination: dest,
        length: `${Math.floor(Math.random() * 380) + 50} B`,
        info: pool.info,
        hexDecompilation: pool.hex
    };
}

const initialChatSeeds = [
    { sender: "shadow_00", badge: "elite", time: "17:48", msg: "Yo, has anyone cracked the VaultBank ledger path yet? My Hydra attacks are timing out." },
    { sender: "root_specialist", badge: "command", time: "17:49", msg: "You need to scan 172.16.80.12 first to check the firewall settings. Try credentials dictionary list." },
    { sender: "subnet_phantom", badge: "cyberspace", time: "17:50", msg: "Just completed Shopcore SQL Injection! The developer SSH password was printed in the DB schema dumps." }
];

function setupBurpProxyViewport() {
    const packetListContainer = document.getElementById('burp-packet-list');
    const decompTitle = document.getElementById('burp-decomp-title');
    const decompSource = document.getElementById('burp-decomp-source');
    const decompText = document.getElementById('burp-decomp-text');
    const chatHistory = document.getElementById('burp-chat-history');
    const chatInput = document.getElementById('burp-chat-input');
    const chatSend = document.getElementById('burp-chat-send');
    const statusPill = document.getElementById('burp-status-pill');

    if (!packetListContainer || !chatHistory) return;

    // Helper: Render table lists dynamically
    const renderPacketTableList = () => {
        packetListContainer.innerHTML = '';
        BURP_PACKETS_DATABASE.forEach((pkt) => {
            const row = document.createElement('tr');
            row.setAttribute('data-id', pkt.id);
            if (pkt.id === activePacketId) {
                row.className = 'active-row'; // Persist selection class highlight
            }
            
            row.innerHTML = `
                <td><span class="proto-badge proto-${pkt.protocol.toLowerCase()}">${pkt.protocol}</span></td>
                <td>${pkt.source}</td>
                <td>${pkt.destination}</td>
                <td>${pkt.length}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pkt.info}</td>
            `;
            
            row.addEventListener('click', () => {
                sfx.playClick();
                activePacketId = pkt.id;
                
                // Toggle selection state class highlights
                const rows = packetListContainer.querySelectorAll('tr');
                rows.forEach(r => r.classList.remove('active-row'));
                row.classList.add('active-row');
                
                // Update Hex Viewbox content
                decompTitle.textContent = `HEX STREAMING DECOMPILATION: PACKET #${pkt.id}`;
                decompSource.textContent = `PROTOCOL SOURCE: ${pkt.protocol}`;
                decompText.textContent = pkt.hexDecompilation;
            });
            
            packetListContainer.appendChild(row);
        });
    };

    window.renderBurpPacketTable = renderPacketTableList;

    // 1. Initial Packet Render
    renderPacketTableList();

    // Default decompilation block load
    decompTitle.textContent = `HEX STREAMING DECOMPILATION: PACKET #P_2`;
    decompSource.textContent = `PROTOCOL SOURCE: HTTP`;
    decompText.textContent = BURP_PACKETS_DATABASE[1].hexDecompilation;

    // 2. Interactive Intercept Pill toggle
    if (statusPill) {
        statusPill.addEventListener('click', () => {
            sfx.playClick();
            window.isBurpIntercepting = !window.isBurpIntercepting;
            
            if (window.isBurpIntercepting) {
                statusPill.classList.add('intercept-active');
                statusPill.innerHTML = `<span class="status-dot"></span> PROXY INTERCEPT: ACTIVE`;
                sfx.playSuccess();
                
                // Trigger Burp Intercept Objective
                shell.checkObjectiveFulfillment('burp_intercept', 'active');
                
                // Capture new network packets procedurally every 2.5 seconds
                window.burpPacketStreamTimer = setInterval(() => {
                    const newPkt = generateProceduralPacket();
                    BURP_PACKETS_DATABASE.unshift(newPkt);
                    if (BURP_PACKETS_DATABASE.length > 12) {
                        BURP_PACKETS_DATABASE.pop(); // Limit sizing logs
                    }
                    renderPacketTableList();
                }, 2500);
            } else {
                statusPill.classList.remove('intercept-active');
                statusPill.innerHTML = `<span class="status-dot"></span> PROXY INTERCEPT: IDLE`;
                
                if (window.burpPacketStreamTimer) {
                    clearInterval(window.burpPacketStreamTimer);
                    window.burpPacketStreamTimer = null;
                }
            }
        });
    }

    // 3. Hex Action Buttons: FORWARD and REPLAY
    document.getElementById('burp-btn-forward')?.addEventListener('click', () => {
        sfx.playSuccess();
        const activeRow = packetListContainer.querySelector('.active-row');
        if (!activeRow) return;
        const pktId = activeRow.getAttribute('data-id');
        const pkt = BURP_PACKETS_DATABASE.find(p => p.id === pktId);
        if (!pkt) return;
        
        // Trigger Burp Forward Objective
        shell.checkObjectiveFulfillment('burp_forward', 'forwarded');
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[FORWARDED SYSTEM PACKET] -> Data payload relayed over local subnets successfully!\n[TIME LOG] -> ${timestamp}\n[GATEWAY ROUTING] -> Connection State Verified (PAYLOAD_RELAY_OK)\n\n`;
        decompText.textContent = prefix + pkt.hexDecompilation;
    });

    document.getElementById('burp-btn-replay')?.addEventListener('click', () => {
        sfx.playClick();
        const activeRow = packetListContainer.querySelector('.active-row');
        if (!activeRow) return;
        const pktId = activeRow.getAttribute('data-id');
        const pkt = BURP_PACKETS_DATABASE.find(p => p.id === pktId);
        if (!pkt) return;
        
        // Trigger Burp Replay Objective
        shell.checkObjectiveFulfillment('burp_replay', 'replayed');
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `--- [REPLAY COMMAND INITIATED] ---\nHTTP/1.1 200 OK\nServer: CyberOps Security Gateway/v1.4\nContent-Type: application/octet-stream\nX-Forwarded-For: 127.0.0.1\nStatus: PAYLOAD_ACK\n[TIME LOG] -> ${timestamp}\n\n`;
        decompText.textContent = prefix + pkt.hexDecompilation;
    });

    // 4. Pre-seed hacker stream chat logs
    chatHistory.innerHTML = '';
    initialChatSeeds.forEach(msg => {
        appendBurpChatMessage(msg.sender, msg.badge, msg.msg, false, msg.time);
    });

    // 5. Register Chat Form Submit action
    const handleChatSubmit = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = '';
        chatInput.focus();
        
        sfx.playClick();
        
        const sender = store.state.username || "OPERATOR";
        appendBurpChatMessage(sender, "user", text, true);
        
        // Trigger a cool procedural dialogue response after a delay
        setTimeout(() => {
            triggerProceduralHackerResponse(text);
        }, 1500 + Math.random() * 2000);
    };

    chatSend.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatSubmit();
        }
    });

    // Redirect typing focus inside the chat input when on Burp tab
    window.addEventListener('keydown', (e) => {
        if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) return;
        const activeTab = document.querySelector('.sidebar-item.active');
        if (!activeTab || activeTab.getAttribute('data-tab') !== 'burp') return;
        
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
        
        chatInput.focus();
    }, { capture: true });

    // Start background chat simulation
    startBurpChatSimulator();
}

function appendBurpChatMessage(sender, badge, message, isUser = false, forcedTime = null) {
    const chatHistory = document.getElementById('burp-chat-history');
    if (!chatHistory) return;

    const time = forcedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgNode = document.createElement('div');
    msgNode.className = 'chat-msg-node';

    msgNode.innerHTML = `
        <div class="chat-msg-meta">
            <span class="chat-msg-sender">
                ${sender}
                <span class="sender-badge badge-${badge}">${badge === 'user' ? (store.state.rank || 'noob') : badge}</span>
            </span>
            <span class="chat-msg-time">${time}</span>
        </div>
        <div class="chat-msg-body">${message}</div>
    `;

    chatHistory.appendChild(msgNode);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Play standard key click thud representing dynamic socket incoming message
    if (!isUser) {
        sfx.playKeyClack(' ');
    }
}

function triggerProceduralHackerResponse(userText) {
    const hackerHandles = [
        { sender: "shadow_00", badge: "elite" },
        { sender: "root_specialist", badge: "command" },
        { sender: "subnet_phantom", badge: "cyberspace" }
    ];
    const pool = [
        "That payload is interesting. Have you tested it on an active government target yet?",
        "Copy that. I am monitoring the server logs on Alex Shop. They haven't detected our subnets yet.",
        "Exactly. Make sure you clear your workstation /var/log/auth.log before disconnecting from rooted gateways.",
        "Yo, try running nmap OS sweep on the target node. That usually reveals if custom firewalls are filtering port 22.",
        "Has anyone cracked the credentials.db on Goldman Sachs ledger? I am currently trying a wordlist audit.",
        "I just rooted Alice's Smart Fridge. It is currently acting as a pivot proxy for our network scan!",
        "Agreed. Use nano to edit nginx.conf configurations on routed nodes. That allows backdoor entry routes."
    ];
    
    // Choose a random hacker and message
    const hacker = hackerHandles[Math.floor(Math.random() * hackerHandles.length)];
    const msg = pool[Math.floor(Math.random() * pool.length)];
    
    appendBurpChatMessage(hacker.sender, hacker.badge, msg, false);
}

let burpChatTimer = null;
function startBurpChatSimulator() {
    if (burpChatTimer) return;
    
    const conversationReplies = [
        { sender: "shadow_00", badge: "elite", msg: "Yo, has anyone checked out the new Burp Interceptor? It's scanning local target data packets flawlessly." },
        { sender: "root_specialist", badge: "command", msg: "Yes, I am analyzing port grab headers. The HTTP row reveals standard Nmap sweeps on local subnets." },
        { sender: "subnet_phantom", badge: "cyberspace", msg: "Nice! I just mapped the whole personal IoT subnet. Bakery POS terminals are incredibly simple to audit." },
        { sender: "shadow_00", badge: "elite", msg: "Make sure to synchronization levels XP. Higher level credentials unlock premium tools like sqlmap." },
        { sender: "root_specialist", badge: "command", msg: "Absolutely. I am pivoting traffic through AB Bank commercial servers to bypass government firewalls." }
    ];
    
    let chatIndex = 0;
    burpChatTimer = setInterval(() => {
        const viewBurp = document.getElementById('view-burp');
        if (!viewBurp || !viewBurp.classList.contains('active')) return;
        
        const payload = conversationReplies[chatIndex % conversationReplies.length];
        chatIndex++;
        
        appendBurpChatMessage(payload.sender, payload.badge, payload.msg, false);
    }, 22000); // Stream new message every 22 seconds
}

function setupInventoryToolsView() {
    const gridContainer = document.getElementById('tools-grid-container');
    const listPanel = document.getElementById('tools-inventory-list');
    const detailPanel = document.getElementById('tools-inventory-detail');
    const detailContent = document.getElementById('tool-detail-content');
    const backBtn = document.getElementById('btn-back-to-inventory');

    if (!gridContainer || !listPanel || !detailPanel || !detailContent || !backBtn) return;

    // Rich tools data list
    const toolsData = [
        {
            name: "CD",
            cmd: "cd",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Standard filesystem navigation utility.",
            desc: "Changes the current working directory in the virtual sandboxed environment. Essential for navigating VFS subfolders.",
            syntax: "cd [directory_path]",
            examples: [
                { cli: "cd /", desc: "Navigate to the root directory." },
                { cli: "cd var/www", desc: "Navigate to the webserver directory." },
                { cli: "cd ..", desc: "Navigate to the parent directory." }
            ]
        },
        {
            name: "LS",
            cmd: "ls",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "List active directories and configuration files.",
            desc: "Retrieves contents of a directory, showing folders and files in the virtual sandbox. Supports verbose switches.",
            syntax: "ls [switches] [directory_path]",
            examples: [
                { cli: "ls", desc: "List files in the current folder." },
                { cli: "ls -la", desc: "List all files with detailed metadata (permissions, owner, size)." },
                { cli: "ls /etc", desc: "List contents of the target /etc directory." }
            ]
        },
        {
            name: "PWD",
            cmd: "pwd",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Print active working directory path.",
            desc: "Outputs the absolute, fully-resolved path of the operator's current location within the sandbox VFS.",
            syntax: "pwd",
            examples: [
                { cli: "pwd", desc: "Print the current folder path." }
            ]
        },
        {
            name: "CAT",
            cmd: "cat",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Read and stream contents of virtual files.",
            desc: "Opens text/configuration files in read-only mode to display their content on the screen. Used to extract flag credentials.",
            syntax: "cat [file_name]",
            examples: [
                { cli: "cat flag.txt", desc: "Read the contents of flag.txt in the current directory." },
                { cli: "cat /var/www/config.inc", desc: "View web configuration settings." }
            ]
        },
        {
            name: "MKDIR",
            cmd: "mkdir",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Create new folders within the VFS.",
            desc: "Creates an empty directory under the specified VFS path. Useful for organizing files or preparing operations.",
            syntax: "mkdir [directory_name]",
            examples: [
                { cli: "mkdir backups", desc: "Create a directory named backups." },
                { cli: "mkdir /tmp/payloads", desc: "Create a payloads folder in /tmp." }
            ]
        },
        {
            name: "GREP",
            cmd: "grep",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "4.1.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Search file contents for patterns.",
            desc: "Searches the target file for a specific query string or regular expression, returning matching lines.",
            syntax: "grep [pattern] [filename]",
            examples: [
                { cli: "grep flag flag.txt", desc: "Search for the word 'flag' in flag.txt." },
                { cli: "grep password config.inc", desc: "Search for 'password' in config.inc." }
            ]
        },
        {
            name: "NANO",
            cmd: "nano",
            category: "FILESYSTEM UTILITY",
            categoryClass: "fs",
            version: "5.0.9",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Simulated mechanical command line text editor.",
            desc: "Launches the UW PICO text editor simulation inside the shell terminal screen, allowing full file edits and writing.",
            syntax: "nano [filename]",
            examples: [
                { cli: "nano script.py", desc: "Open or create script.py in editor." }
            ]
        },
        {
            name: "PING",
            cmd: "ping",
            category: "AUXILIARY COMMUNICATIONS",
            categoryClass: "comms",
            version: "2.0.1",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Auxiliary network communications protocol.",
            desc: "Sends ICMP echo request packets to verify network connectivity and active status of simulated hosts.",
            syntax: "ping [ip_or_host]",
            examples: [
                { cli: "ping 10.0.1.5", desc: "Ping target IP address." },
                { cli: "ping blog-alpha.local", desc: "Ping target domain name." }
            ]
        },
        {
            name: "WHOIS",
            cmd: "whois",
            category: "AUXILIARY COMMUNICATIONS",
            categoryClass: "comms",
            version: "1.8.4",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Query domain ownership registry metadata.",
            desc: "Retrieves public registrar information, domain status, creation date, and registration data for the target domain.",
            syntax: "whois [domain]",
            examples: [
                { cli: "whois target.local", desc: "Retrieve domain metadata for target.local." }
            ]
        },
        {
            name: "TRACEROUTE",
            cmd: "traceroute",
            category: "AUXILIARY COMMUNICATIONS",
            categoryClass: "comms",
            version: "1.4.3",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Trace network hops and routing delays.",
            desc: "Traces the packet delivery path across simulated network router gateways to locate active nodes.",
            syntax: "traceroute [ip_or_host]",
            examples: [
                { cli: "traceroute 192.168.1.15", desc: "Trace route to the target IP." }
            ]
        },
        {
            name: "DNSLOOKUP",
            cmd: "dig",
            category: "AUXILIARY COMMUNICATIONS",
            categoryClass: "comms",
            version: "9.18.2",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Inspect DNS namespace resolution records.",
            desc: "Performs low-level DNS lookups, querying A/AAAA/MX/TXT records to identify target servers.",
            syntax: "dig [domain]",
            examples: [
                { cli: "dig target.local", desc: "Query DNS A records for target.local." }
            ]
        },
        {
            name: "CURL",
            cmd: "curl",
            category: "AUXILIARY COMMUNICATIONS",
            categoryClass: "comms",
            version: "8.2.1",
            status: "STABLE",
            statusClass: "stable",
            usecase: "Interact with web and subdomain APIs.",
            desc: "Executes HTTP/HTTPS requests to retrieve headers, endpoints data, or test simulated API services.",
            syntax: "curl [url]",
            examples: [
                { cli: "curl http://api.target.local", desc: "Query the API endpoint." },
                { cli: "curl http://target.local/index.html", desc: "Fetch the home page." }
            ]
        },
        {
            name: "NMAP",
            cmd: "nmap",
            category: "SECURITY AUDIT TOOL",
            categoryClass: "restricted",
            version: "7.9.2",
            status: "RESTRICTED",
            statusClass: "restricted",
            usecase: "Network security sweep auditing toolkit.",
            desc: "Performs network exploration and port scanning. Discovers open ports, running services, and active host operating systems.",
            syntax: "nmap [ip_or_host]",
            examples: [
                { cli: "nmap 10.0.1.5", desc: "Scan the target IP for open ports." },
                { cli: "nmap target.local", desc: "Scan the target domain name." }
            ]
        },
        {
            name: "SQLMAP",
            cmd: "sqlmap",
            category: "SECURITY AUDIT TOOL",
            categoryClass: "restricted",
            version: "1.7.2",
            status: "RESTRICTED",
            statusClass: "restricted",
            usecase: "Audit SQL injection database vulnerabilities.",
            desc: "Automates detecting and exploiting SQL injection flaws on vulnerable parameters, allowing VFS database extractions.",
            syntax: "sqlmap [url]",
            examples: [
                { cli: "sqlmap http://api.target.local/users?id=1", desc: "Test and exploit SQL injection." }
            ]
        },
        {
            name: "NIKTO",
            cmd: "nikto",
            category: "SECURITY AUDIT TOOL",
            categoryClass: "restricted",
            version: "2.1.6",
            status: "RESTRICTED",
            statusClass: "restricted",
            usecase: "Sweep web configurations for vulnerabilities.",
            desc: "Scans web servers for dangerous files, outdated software packages, and misconfigured directories.",
            syntax: "nikto [url]",
            examples: [
                { cli: "nikto http://target.local", desc: "Scan the webserver for exposures." }
            ]
        },
        {
            name: "HYDRA",
            cmd: "hydra",
            category: "SECURITY AUDIT TOOL",
            categoryClass: "restricted",
            version: "9.3.0",
            status: "RESTRICTED",
            statusClass: "restricted",
            usecase: "Brute-force SSH authentication credentials.",
            desc: "Launches high-speed dictionary brute-force attacks against SSH services using simulated security wordlists.",
            syntax: "hydra ssh://[ip_or_host]",
            examples: [
                { cli: "hydra ssh://10.0.1.5", desc: "Attack SSH service credentials on the target host." }
            ]
        },
        {
            name: "HASHCAT",
            cmd: "hashcat",
            category: "SECURITY AUDIT TOOL",
            categoryClass: "restricted",
            version: "6.2.5",
            status: "RESTRICTED",
            statusClass: "restricted",
            usecase: "GPU-simulated MD5 hash brute-cracking.",
            desc: "Launches high-performance multi-threaded cracking processes against cryptographic passwords hashes.",
            syntax: "hashcat [hash]",
            examples: [
                { cli: "hashcat 8d969eef6ecad3c29a3a629280e686cf", desc: "Crack target MD5 password hash." }
            ]
        }
    ];

    const drawGrid = () => {
        gridContainer.innerHTML = '';
        
        toolsData.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            
            // Set dynamic category class
            let catSpanClass = 'tool-card-category';
            if (tool.categoryClass === 'restricted') catSpanClass += ' restricted';
            if (tool.categoryClass === 'comms') catSpanClass += ' comms';

            let statusSpanClass = 'tool-card-status';
            if (tool.statusClass === 'restricted') statusSpanClass += ' restricted';
            else statusSpanClass += ' stable';
            
            card.innerHTML = `
                <div>
                    <div class="${catSpanClass}">${tool.category}</div>
                    <div class="tool-card-name">${tool.name}</div>
                    <div class="tool-card-desc">${tool.usecase}</div>
                </div>
                <div class="tool-card-footer">
                    <div>STATUS: <span class="${statusSpanClass}">${tool.status}</span></div>
                    <div class="tool-card-version">VER: ${tool.version}</div>
                </div>
            `;
            
            card.addEventListener('click', () => {
                sfx.playClick();
                showDetail(tool);
                
                // Trigger tool inspection objective
                shell.checkObjectiveFulfillment('tool_inspect', tool.cmd);
            });
            
            gridContainer.appendChild(card);
        });
    };

    const showDetail = (tool) => {
        let catBadgeClass = 'tool-meta-badge category';
        if (tool.categoryClass === 'restricted') catBadgeClass += ' restricted';
        if (tool.categoryClass === 'comms') catBadgeClass += ' comms';

        let sectionTitleClass = 'tool-detail-section-title';
        if (tool.categoryClass === 'restricted') sectionTitleClass += ' restricted';
        if (tool.categoryClass === 'comms') sectionTitleClass += ' comms';

        let codeTextClass = 'tool-example-code';
        if (tool.categoryClass === 'restricted') codeTextClass += ' restricted';
        if (tool.categoryClass === 'comms') codeTextClass += ' comms';

        let copyBtnClass = 'btn-copy-code';
        if (tool.categoryClass === 'restricted') copyBtnClass += ' restricted';
        if (tool.categoryClass === 'comms') copyBtnClass += ' comms';

        let examplesHTML = '';
        tool.examples.forEach(ex => {
            examplesHTML += `
                <div class="tool-example-item">
                    <div class="tool-example-desc">${ex.desc}</div>
                    <div class="tool-example-code-wrapper">
                        <div class="${codeTextClass}">${ex.cli}</div>
                        <button class="${copyBtnClass}">COPY</button>
                    </div>
                </div>
            `;
        });

        detailContent.innerHTML = `
            <div class="tool-detail-header">
                <div class="tool-detail-meta">
                    <span class="${catBadgeClass}">${tool.category}</span>
                    <span class="tool-meta-badge">STATUS: ${tool.status}</span>
                    <span class="tool-meta-badge">VERSION: ${tool.version}</span>
                </div>
                <div class="tool-detail-title">${tool.name}</div>
            </div>
            
            <div class="tool-detail-section">
                <div class="${sectionTitleClass}">Description</div>
                <div class="tool-detail-body">${tool.desc}</div>
            </div>
            
            <div class="tool-detail-section">
                <div class="${sectionTitleClass}">Command Line Syntax</div>
                <div class="tool-cli-box">$ ${tool.syntax}</div>
            </div>
            
            <div class="tool-detail-section">
                <div class="${sectionTitleClass}">Usage Examples</div>
                <div class="tool-example-list">
                    ${examplesHTML}
                </div>
            </div>
        `;

        // Bind copy click listeners
        const exampleItems = detailContent.querySelectorAll('.tool-example-item');
        exampleItems.forEach((item) => {
            const btn = item.querySelector('.btn-copy-code');
            const code = item.querySelector('.tool-example-code').textContent;
            btn.addEventListener('click', () => {
                navigator.clipboard.writeText(code);
                sfx.playSuccess();
                btn.textContent = 'COPIED';
                setTimeout(() => { btn.textContent = 'COPY'; }, 1500);
            });
        });
        
        listPanel.style.display = 'none';
        detailPanel.style.display = 'block';
    };

    backBtn.addEventListener('click', () => {
        sfx.playClick();
        detailPanel.style.display = 'none';
        listPanel.style.display = 'block';
    });

    drawGrid();
}
