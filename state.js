/**
 * CyberOps Global State Manager
 * Centralized, reactive event-driven state store.
 */

class StateStore {
    constructor() {
        // Default initial application state
        this.state = {
            // Operator Profile
            username: 'OPERATOR_101',
            level: 1,
            xp: 0,
            credits: 100,
            reputation: 0,
            rank: 'Noob',
            completedMissions: [], // Array of completed missionId values
            usedTools: [], // Array of unique tools executed by the operator
            unlockedTools: ['ping', 'whois', 'traceroute', 'curl', 'nano', 'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'mkdir'],
            
            // Active Operation
            activeMissionId: null,
            activeMission: null, // Full mission object
            activeTargetNode: null, // Subdomain IP/Domain in focus
            activeVFS: {}, // Virtual File System dictionary
            activeDirectory: '/', // Current terminal path on remote machine
            activeObjectives: [], // Objectives tracker [{ id, text, completed, checkType }]
            
            // Console Terminal State
            terminalOutput: '',
            commandHistory: [],
            
            // HUD & Hardware metrics
            ping: '28ms',
            cpuUsage: 12,
            ramUsage: 45,
            
            // Preferences Configuration
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
        this.loadFromStorage();
    }

    /**
     * Subscribe callback functions to trigger on state change.
     */
    subscribe(callback) {
        this.listeners.push(callback);
        // Immediately trigger with current state to initialize binds
        callback(this.state);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Update state elements and notify active subscribers.
     */
    set(updates) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // Auto persistent saving for profile data
        this.saveToStorage();
        
        // Notify listeners
        this.listeners.forEach(listener => {
            try {
                listener(this.state, prevState);
            } catch (err) {
                console.error("State listener update failure: ", err);
            }
        });
    }

    /**
     * Sync data to Local Storage
     */
    saveToStorage() {
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
    }

    /**
     * Reload profiles from storage
     */
    loadFromStorage() {
        const dataStr = localStorage.getItem('cyberops_save_data_1_4');
        if (dataStr) {
            try {
                const parsed = JSON.parse(dataStr);
                // Keep only valid stored keys
                Object.keys(parsed).forEach(key => {
                    if (this.state[key] !== undefined) {
                        this.state[key] = parsed[key];
                    }
                });
            } catch (err) {
                console.warn("Save profile restoration aborted: data corrupt.", err);
            }
        }
    }

    /**
     * Add XP and recalculate ranks/levels
     */
    addXP(amount) {
        let newXp = this.state.xp + amount;
        let newLvl = this.state.level;
        
        // Formulate quadratic XP target requirements per level
        let xpNeeded = newLvl * 250;
        while (newXp >= xpNeeded) {
            newXp -= xpNeeded;
            newLvl += 1;
            xpNeeded = newLvl * 250;
        }

        // Standard dynamic ranking ranks titles
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

    /**
     * Wipe current Operator statistics
     */
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

// Instantiate global singleton export
export const store = new StateStore();
