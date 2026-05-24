/**
 * CyberOps Seeded Procedural Mission Generator
 * Dynamically constructs 1,000 fully playable hacking missions (Easy, Medium, Hard).
 * Every mission gets a reproducible virtual file system, domains, targets, objectives, and flags.
 */

// Simple Linear Congruential Generator (LCG) for reproducible pseudo-randomness based on a seed
class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }
    // Returns number between 0 and 1
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
    // Returns int between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    // Returns randomly selected array element
    choice(arr) {
        const idx = this.nextInt(0, arr.length - 1);
        return arr[idx];
    }
}

// Global word banks for procedural name generation
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
export function getRealWorldDomain(server, missionId) {
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

/**
 * Procedural Mission Generator
 */
export function generateMission(missionId) {
    const seed = missionId * 3421; // Seed multiplier for variety
    const rand = new SeededRandom(seed);

    const server = SERVERS_DATABASE[(missionId - 1) % 50];
    const difficulty = server.security;

    // 1. Determine difficulty tier
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

    // 2. Formulate corporate entity names & domains
    const company = server.name;
    const baseDomain = getRealWorldDomain(server, missionId);
    const hostName = server.name.toLowerCase().replace(/[^a-z0-9]/g, '') + "-" + missionId;
    
    // Choose environment subdomains/targets
    let domains = [];
    if (difficulty === 'easy') {
        domains = [baseDomain, `backup.${baseDomain}`];
    } else if (difficulty === 'medium') {
        domains = [baseDomain, `api.${baseDomain}`, `auth.${baseDomain}`, `cdn.${baseDomain}`];
    } else {
        domains = [baseDomain, `auth.${baseDomain}`, `secure.${baseDomain}`, `transaction.${baseDomain}`, `backup.${baseDomain}`];
    }

    // Generate IP address based on difficulty block
    const ipParts = server.ip.split('.');
    ipParts[3] = rand.nextInt(2, 254).toString();
    const ip = ipParts.join('.');

    // Generate dynamic hash or credentials
    const passPin = rand.nextInt(1000, 9999);
    const passWord = `adminPass_${rand.choice(['core', 'node', 'sec', 'net'])}${passPin}`;
    const mockHash = md5Sim(passWord);
    const secretFlag = `FLAG{C_OPS_M_${missionId}_${rand.nextInt(100000, 999999)}`;

    // 3. Assemble target sandboxed Virtual File System (VFS)
    const vfs = generateVirtualFileSystem(difficulty, hostName, baseDomain, passWord, mockHash, secretFlag, rand);

    // 4. Formulate interactive objective criteria checklist
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

    // 5. Complete description generators
    const descriptions = [
        `Operational intelligence reports high vulnerability in target node ${hostName}. The company ${company} has improperly locked security ports. Audit their configuration, extract credential flags, and verify security protocols.`,
        `The secure backup server at ${baseDomain} is leaking active metadata. Your cyber operations task is to map out subdomains, locate target configurations folders, and retrieve root system validation parameters.`,
        `An internal vulnerability audit has revealed critical misconfigurations in the ${company} servers. Connect your terminal node shell directly, sweep open port channels, examine log entries, and flag flaws.`
    ];
    const descriptionText = rand.choice(descriptions);

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
        description: descriptionText,
        vfs: vfs,
        objectives: objectives,
        secretFlag: secretFlag,
        cleartextPass: passWord,
        adminHash: mockHash
    };
}

/**
 * Generate 1,000 mission cards list summaries (without VFS load for performance)
 */
export function generateAllMissions() {
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

/**
 * Helper to construct a localized custom virtual directory files structure
 */
function generateVirtualFileSystem(difficulty, host, domain, pass, hash, flag, rand) {
    // Baseline Linux structures
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
            content: `user www-data;\nworker_processes auto;\n\nhttp {\n    server {\n        listen 80;\n        server_name ${domain};\n        \n        location /admin_backdoor {\n            allow 127.0.0.1;\n            # ADMIN SECRET ENDPOINT: Enable auth bypass validation in development\n        }\n    }\n}`
        },

        '/var': { type: 'dir', children: ['www', 'log'] },
        '/var/www': { type: 'dir', children: ['index.html', 'config.inc'] },
        '/var/www/index.html': { 
            type: 'file', 
            content: `<!DOCTYPE html><html><body><h1>CyberOps Target Node Site Default</h1></body></html>` 
        },
        '/var/www/config.inc': { 
            type: 'file', 
            content: `# CYBEROPS SECURE CREDENTIAL FILE\n# DO NOT DISTRIBUTE IN PRODUCTION ENVIRONMENT\n\nDB_HOST="localhost"\nDB_USER="cyberops_auditor"\nDB_HASH="${hash}"\n\n# Key note: Decrypt the cleartext hash or locate database credentials.\n# DATABASE FLAG: ${difficulty === 'medium' ? flag : 'RESTRICTED_ACCESS_ROLE_9'}` 
        },

        '/var/log': { type: 'dir', children: ['auth.log', 'syslog'] },
        '/var/log/auth.log': {
            type: 'file',
            content: `May 22 18:23:41 sshd[102]: Server listening on port 22.\nMay 22 18:25:01 sshd[104]: Attempted guest login from 10.0.0.15\nMay 22 18:28:10 sshd[109]: Connection closed by authentic client.`
        },
        '/var/log/syslog': {
            type: 'file',
            content: `May 22 18:20:00 kernel: Initializing kernel modules...\nMay 22 18:20:05 systemd[1]: Activated simulated CPU cores.\nMay 22 18:21:12 network[11]: Static IP bounds set.`
        },

        '/root': { type: 'dir', children: ['vault'] },
        '/root/vault': { type: 'dir', children: ['flag.txt', 'secrets.json'] },
        '/root/vault/flag.txt': {
            type: 'file',
            content: `SYSTEM COMPLIANCE VERIFICATION COMPLETE.\nROOT INFILTRATION VALIDATED.\n\nFLAG VALUE: ${flag}\n\nCyberOps Simulator Ethical Hacking operations team congrats.`
        },
        '/root/vault/secrets.json': {
            type: 'file',
            content: `{\n  "admin_root_bypass": "${pass}",\n  "api_token": "bearer_cyberops_sec_token_098721_node_bypass",\n  "status": "fully_audited"\n}`
        }
    };

    // Medium or Hard missions get extra sub-folders to explore
    if (difficulty !== 'easy') {
        root['/home/operator'].children.push('credentials.db');
        root['/home/operator/credentials.db'] = {
            type: 'file',
            content: `OPERATOR SQLITE DATABASE BACKUP:\n\nTABLE: admin_users\nROW 1: root_admin | ${hash} | SuperUser\nROW 2: guest_auditor | d8578edf8458ce06fbc5bb76a58c5ca4 | Reader\n\n# Crack the root_admin hash using your hashcat/hydra terminal interface tools.`
        };
    }

    return root;
}

/**
 * Super lightweight simulated MD5 helper to generate unique hashes
 */
function md5Sim(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Return mock md5 format (32 characters hex)
    const hex = Math.abs(hash).toString(16).padEnd(8, 'f') + 
                Math.abs(hash * 31).toString(16).padEnd(8, 'a') + 
                Math.abs(hash * 17).toString(16).padEnd(8, '2') + 
                Math.abs(hash * 7).toString(16).padEnd(8, 'e');
    return hex.substring(0, 32);
}
