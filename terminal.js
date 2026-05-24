/**
 * CyberOps Terminal Engine & Shell Command Sandbox
 * Executes virtual Linux-style and security commands inside an in-memory VFS.
 */

import { store } from './state.js';
import { sfx } from './audio.js';

class TerminalShell {
    constructor() {
        this.history = [];
        this.historyIdx = -1;
        this.currentEditorFile = null;
        
        // Subscribe to active state variables
        store.subscribe((state) => {
            this.username = state.username;
            this.vfs = state.activeVFS || {};
            this.currentDir = state.activeDirectory || '/';
            this.activeMission = state.activeMission;
            this.objectives = state.activeObjectives || [];
        });
    }

    /**
     * Parse and run commands inputted by the operator
     */
    execute(cmdString) {
        cmdString = cmdString.trim();
        if (!cmdString) return '';

        // Add to history
        this.history.push(cmdString);
        this.historyIdx = this.history.length;

        // Split args by whitespace
        const parts = cmdString.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        // Verify if command is unlocked or available
        const state = store.state;
        if (!state.unlockedTools.includes(command) && ['nmap', 'sqlmap', 'nikto', 'hydra', 'hashcat'].includes(command)) {
            sfx.playError();
            return `bash: ${command}: command not found. (Tool locked or unavailable on this rank level.)`;
        }

        // Mechanical keypress enter noise
        sfx.playEnter();

        // Router command switchboard
        switch (command) {
            case 'help':
                return this.cmdHelp();
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
            default:
                sfx.playError();
                return `bash: ${command}: command not found. Type "help" for list of operational tools.`;
        }
    }

    /**
     * Check if a command execution fulfilled one of our active mission objectives
     */
    checkObjectiveFulfillment(type, value, extra = '') {
        if (!this.activeMission) return;
        let updated = false;

        const nextObjs = this.objectives.map(obj => {
            if (obj.completed) return obj;

            let isDone = false;
            if (obj.checkType === 'command_run' && type === 'command') {
                // Check if command string starts with objective value prefix
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
            
            // Check if all objectives are completed
            const allDone = nextObjs.every(o => o.completed);
            if (allDone) {
                this.completeActiveMission();
            }
        }
    }

    /**
     * Mission Completion reward distribution
     */
    completeActiveMission() {
        const mission = this.activeMission;
        if (!mission) return;

        // Verify if already completed
        if (store.state.completedMissions.includes(mission.id)) {
            return;
        }

        const rewards = mission.rewards;
        const compList = [...store.state.completedMissions, mission.id];
        
        // Distribute rewards
        store.set({
            completedMissions: compList,
            credits: store.state.credits + rewards.credits,
            reputation: store.state.reputation + rewards.reputation
        });
        store.addXP(rewards.xp);

        // Play loud chime arpeggio
        setTimeout(() => {
            sfx.playSuccess();
        }, 300);

        // Inject completion success message back into terminal stream
        setTimeout(() => {
            const successText = `\n=======================================================\n[ACCESS COMPLIANCE VALIDATED - DEPLOYMENT COMPLETED]\n=======================================================\nMISSION SECURED: ${mission.name}\nREWARDS ACQUIRED:\n  - XP: +${rewards.xp}\n  - CREDITS: +${rewards.credits} c\n  - REPUTATION: +${rewards.reputation} rep\n\nProfile credentials synchronized successfully with secure node!\n=======================================================\n`;
            
            // Append success text
            const termScreen = document.getElementById('terminal-output-container');
            if (termScreen) {
                termScreen.innerHTML += successText;
                const scrollEl = document.getElementById('terminal-screen-element');
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
            }
        }, 1200);
    }

    /* ==========================================================================
       COMMAND IMPLEMENTATIONS (Virtual sandboxed logic)
       ========================================================================== */

    cmdHelp() {
        return `CYBEROPS SIMULATOR SYSTEM COMMAND DIRECTORY
-------------------------------------------------------
ls [args]           List active directories and configuration files
cd [path]           Change VFS directory path navigation
pwd                 Print active working directory
cat [file]          Read contents of virtual files
nano [file]         Open in-terminal mechanical text editor
mkdir [dir]         Create directory in virtual VFS
grep [text] [file]  Search file contents for patterns
find [name]         Locate items in subdirectories
clear               Wipes terminal outputs history

 ping [ip/host]     Ping testing node channels
 whois [domain]     Query domain ownership metadata
 traceroute [ip]    Trace network hops delay
 dig [domain]       Inspect DNS namespace resolutions
 curl [url]         Interact with subdomains APIs

 nmap [ip/host]     Sweep open server listening ports
 sqlmap [url]       Audit SQL injection database vulnerabilities
 nikto [url]        Sweep web configurations for vulnerabilities
 hydra [ip]         Brute-force SSH authorization credentials
 hashcat [hash]     GPU-simulated MD5 hash brute-cracking
 submit [flag]      Submit security flag to complete active mission
-------------------------------------------------------`;
    }

    cmdPwd() {
        return this.currentDir;
    }

    cmdLs(args) {
        const path = args[0] || '';
        const targetPath = this.resolvePath(path);
        
        const node = this.vfs[targetPath];
        if (!node) return `ls: cannot access '${path}': No such file or directory`;
        if (node.type === 'file') return path; // Just echo file name

        if (args.includes('-la') || args.includes('-la')) {
            // Show details
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

        // Check if file read met mission objectives
        this.checkObjectiveFulfillment('file_read', path);

        return node.content;
    }

    cmdMkdir(args) {
        const name = args[0];
        if (!name) return `mkdir: missing operand`;

        const path = this.resolvePath(name);
        if (this.vfs[path]) return `mkdir: cannot create directory '${name}': File exists`;

        // Determine parent directory path
        const lastSlash = path.lastIndexOf('/');
        const parentPath = lastSlash === 0 ? '/' : path.substring(0, lastSlash);
        const folderName = path.substring(lastSlash + 1);

        const parentNode = this.vfs[parentPath];
        if (!parentNode || parentNode.type !== 'dir') return `mkdir: parent path directory missing`;

        // Update VFS dictionary in state
        const updatedVFS = { ...this.vfs };
        updatedVFS[parentPath] = {
            ...parentNode,
            children: [...parentNode.children, folderName]
        };
        updatedVFS[path] = {
            type: 'dir',
            children: []
        };

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

        // Open simulated nano overlay panel
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

    // Nano editor save routine
    saveNanoContent(text) {
        if (!this.currentEditorFile) return;

        const path = this.currentEditorFile;
        const lastSlash = path.lastIndexOf('/');
        const parentPath = lastSlash === 0 ? '/' : path.substring(0, lastSlash);
        const folderName = path.substring(lastSlash + 1);

        const updatedVFS = { ...this.vfs };
        
        // If file is new, add to parent children list
        if (!updatedVFS[path]) {
            const parent = updatedVFS[parentPath];
            if (parent && parent.type === 'dir') {
                updatedVFS[parentPath] = {
                    ...parent,
                    children: [...parent.children, folderName]
                };
            }
        }

        // Set file contents
        updatedVFS[path] = {
            type: 'file',
            content: text
        };

        store.set({ activeVFS: updatedVFS });
        this.currentEditorFile = null;
    }

    /* ==========================================================================
       SIMULATED SECURITY TOOLS LOGIC
       ========================================================================== */

    cmdPing(args) {
        const target = args[0];
        if (!target) return `ping: missing host target address.`;

        // Check active objective trigger
        this.checkObjectiveFulfillment('command', `ping ${target}`);

        return `PING ${target} (56 bytes of data).
64 bytes from ${target}: icmp_seq=1 ttl=64 time=24.2 ms
64 bytes from ${target}: icmp_seq=2 ttl=64 time=26.8 ms
64 bytes from ${target}: icmp_seq=3 ttl=64 time=24.0 ms
--- ${target} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2002ms`;
    }

    cmdWhois(args) {
        const target = args[0];
        if (!target) return `whois: missing domain.`;

        this.checkObjectiveFulfillment('command', `whois ${target}`);

        return `Domain Name: ${target}
Registry Domain ID: WHOIS_SIM_M_${Math.floor(Math.random() * 9000 + 1000)}
Creation Date: 2024-05-10T12:00:00Z
Registrar: CyberOps Registrar Security Group
Registrant Organization: Simulated Fictional Corporation LLC
Sponsoring Registrar: Mock Security Labs
Nameservers: ns1.cyberops.local, ns2.cyberops.local`;
    }

    cmdTraceroute(args) {
        const target = args[0];
        if (!target) return `traceroute: missing address.`;

        this.checkObjectiveFulfillment('command', `traceroute ${target}`);

        return `traceroute to ${target} (30 hops max, 60 byte packets)
 1  gateway.local (10.0.0.1)  1.23 ms  1.12 ms  1.05 ms
 2  core-router.cyberops.local (10.0.10.1)  8.40 ms  8.55 ms  8.62 ms
 3  ${target} (${target === '127.0.0.1' ? '127.0.0.1' : '192.168.10.22'})  24.12 ms  24.89 ms  23.95 ms`;
    }

    cmdDig(args) {
        const target = args[0];
        if (!target) return `dig: missing domain query parameter.`;

        this.checkObjectiveFulfillment('command', `dig ${target}`);

        return `; <<>> DiG 9.18 <<>> ${target}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48922
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;${target}.      IN A

;; ANSWER SECTION:
${target}.   3600 IN A ${this.activeMission ? this.activeMission.targetIP : '10.0.1.5'}

;; Query time: 12 msec
;; SERVER: 8.8.8.8#53(8.8.8.8) (UDP)`;
    }

    cmdCurl(args) {
        const url = args[0];
        if (!url) return `curl: missing URL target.`;

        this.checkObjectiveFulfillment('command', `curl ${url}`);

        if (url.includes('api') && this.activeMission) {
            return `{\n  "status": "success",\n  "node": "${this.activeMission.hostName}",\n  "api_version": "v2.0.4-dev",\n  "connection_status": "secured",\n  "auditing_hash": "${this.activeMission.adminHash}"\n}`;
        }

        return `HTTP/1.1 200 OK\nServer: Nginx/1.24.0\nContent-Type: text/html\nContent-Length: 120\n\n<!DOCTYPE html><html><body><h1>CyberOps Default Node Response</h1></body></html>`;
    }

    cmdNmap(args) {
        const target = args[0];
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
Not shown: 995 closed tcp ports
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http  Nginx/1.24.0
${isMed || isHard ? '3306/tcp open  mysql\n8080/tcp open  http-proxy  Node.js API' : ''}
${isHard ? '443/tcp  open  https\n6379/tcp open  redis  v6.2.6\n9000/tcp open  waf-diagnostic' : ''}

Nmap done: 1 IP address (1 host up) scanned in 1.45 seconds`;
    }

    cmdSqlmap(args) {
        const target = args[0];
        if (!target) return `sqlmap: missing URL parameter. (e.g. sqlmap http://api.target.local)`;

        this.checkObjectiveFulfillment('command', `sqlmap ${target}`);

        if (!this.activeMission) {
            return `sqlmap v1.7.2 - automatic SQL injection tool\n[!] ERROR: no vulnerable query parameters found.`;
        }

        const hash = this.activeMission.adminHash;
        
        return `sqlmap/1.7.2-dev - automatic SQL injection tool
[INFO] testing connection to the target URL
[INFO] checking database engine type: SQLite
[INFO] confirming vulnerability: injection parameter 'id' is exploitable
[INFO] fetching database schema data rows:

Database: cyberops_target
Table: users
[2 entries]
+----+-------------+----------------------------------+-----------+
| id | username    | password_hash                    | role      |
+----+-------------+----------------------------------+-----------+
| 1  | root_admin  | ${hash} | SuperUser |
| 2  | auditor     | d8578edf8458ce06fbc5bb76a58c5ca4 | Reader    |
+----+-------------+----------------------------------+-----------+
[INFO] SQL injection dump execution completed successfully.`;
    }

    cmdNikto(args) {
        const target = args[0];
        if (!target) return `nikto: missing host parameter.`;

        this.checkObjectiveFulfillment('command', `nikto ${target}`);

        if (!this.activeMission) {
            return `- Nikto v2.1.6\n+ No misconfigurations identified.`;
        }

        return `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          ${this.activeMission.targetIP}
+ Target Hostname:    ${this.activeMission.baseDomain}
+ Target Port:        80
---------------------------------------------------------------------------
+ Server: Nginx/1.24.0
+ [VULNERABILITY] Exposed dev config backup found: http://${this.activeMission.baseDomain}/var/www/config.inc
+ [INFO] Found administrative entry point: http://${this.activeMission.baseDomain}/admin_backdoor
+ Server allows TRACE method options.`;
    }

    cmdHydra(args) {
        const target = args[0];
        if (!target) return `hydra: missing target configuration. (e.g. hydra ssh://192.168.1.15)`;

        this.checkObjectiveFulfillment('command', `hydra ${target}`);

        if (!this.activeMission) {
            return `Hydra v9.3 - simulated credential cracker\n[ERROR] target connection failed.`;
        }

        const cleartext = this.activeMission.cleartextPass;

        return `Hydra v9.3-dev (c) 2026 by CyberOps Labs
[DATA] attacking service ssh on ${this.activeMission.targetIP}
[STATUS] 100 passwords/s, checking wordlists...
[STATUS] 400 passwords/s, audit match index sweep...
[SSH] BINGO! Found valid credentials:
  login: root_admin
  password: ${cleartext}
[INFO] 1 target successfully cracked in 2.34 seconds.`;
    }

    cmdHashcat(args) {
        const hash = args[0];
        if (!hash) return `hashcat: missing target md5 hash parameter.`;

        if (!this.activeMission) {
            return `Hashcat v6.2.5 - GPU simulated cracker\n[!] Hash load error: invalid format or empty.`;
        }

        // Return a mock payload that the front-end will render dynamically as a crack simulation
        return `CRACK_SIMULATION:${hash}`;
    }

    cmdSubmit(args) {
        const flag = args[0];
        if (!flag) return `submit: missing flag key parameters.`;

        if (!this.activeMission) {
            sfx.playError();
            return `submit: no active operations connection. Deploy a mission first.`;
        }

        // Check if flag matches
        if (flag === this.activeMission.secretFlag) {
            this.checkObjectiveFulfillment('flag_submit', flag);
            return `[SUCCESS] Verification flag accepted! Database credentials and operations compliance fully validated.`;
        } else {
            sfx.playError();
            return `[ACCESS DENIED] flag verification key is invalid. Examine configurations logs more closely.`;
        }
    }

    /* ==========================================================================
       VFS UTILITIES (Path resolvers)
       ========================================================================== */

    /**
     * Resolve cd/cat path arguments against the active directory path
     */
    resolvePath(path) {
        if (!path) return this.currentDir;

        // If path is absolute
        if (path.startsWith('/')) {
            return this.normalizePath(path);
        }

        // Relative path
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

export const shell = new TerminalShell();
