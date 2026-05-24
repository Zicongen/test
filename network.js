/**
 * CyberOps Interactive Network Topology Map
 * Renders target network structure nodes, active firewalls, and flows packet pulses.
 */

import { store } from './state.js';
import { sfx } from './audio.js';

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
        
        // Listen to state changes to update topology nodes matching active mission
        store.subscribe((state) => {
            if (state.activeMissionId !== this.activeMissionId) {
                this.activeMissionId = state.activeMissionId;
                this.buildActiveTopology(state.activeMission);
            }
        });
    }

    /**
     * Bind canvas viewport and start the render loop
     */
    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.setupEventListeners();

        // Start drawing frame sequence
        this.animate();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    /**
     * Assemble nodes layout based on active deployed target difficulty
     */
    buildActiveTopology(mission) {
        this.nodes = [];
        this.links = [];
        this.packets = [];

        // Dynamic viewport/canvas dimensions centering
        const w = this.canvas ? this.canvas.width : 800;
        const h = this.canvas ? this.canvas.height : 500;
        
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

            return {
                id: server.id.toString(),
                label: server.name,
                ip: isActiveTarget ? mission.targetIP : server.ip,
                type: type,
                status: status,
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

    /**
     * Draw frame graphics loop
     */
    animate() {
        if (!this.canvas || !this.ctx) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Dynamic theme-wide color retrieval
        const themeColor = getComputedStyle(document.body).getPropertyValue('--color-green').trim() || '#00FF66';

        // Clean frame
        this.ctx.fillStyle = '#070707';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Zoom & Pan transformation
        this.ctx.translate(this.pan.x + this.canvas.width / 2, this.pan.y + this.canvas.height / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);

        // Draw Links (cables)
        this.ctx.lineWidth = 1.5;
        this.links.forEach(link => {
            const s = this.nodes.find(n => n.id === link.source);
            const t = this.nodes.find(n => n.id === link.target);
            if (!s || !t) return;

            this.ctx.beginPath();
            this.ctx.strokeStyle = '#222';
            this.ctx.moveTo(s.x, s.y);
            this.ctx.lineTo(t.x, t.y);
            this.ctx.stroke();

            // Inject animated data flow packets procedurally (1% chance per frame)
            if (Math.random() < 0.015 && this.packets.length < 30) {
                this.packets.push({
                    s: s,
                    t: t,
                    pct: 0,
                    speed: 0.005 + Math.random() * 0.008
                });
            }
        });

        // Draw moving packet dots
        this.ctx.fillStyle = themeColor;
        this.packets.forEach((p, idx) => {
            p.pct += p.speed;
            if (p.pct >= 1) {
                // Drop packet
                this.packets.splice(idx, 1);
                return;
            }

            const x = p.s.x + (p.t.x - p.s.x) * p.pct;
            const y = p.s.y + (p.t.y - p.s.y) * p.pct;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = themeColor;
            this.ctx.fill();
            this.ctx.shadowBlur = 0; // Reset shadow
        });

        // Draw Nodes
        this.nodes.forEach(node => {
            const isHover = this.hoverNode === node;
            const isActive = this.activeNode === node;
            let glowColor = themeColor;
            if (node.status === 'scanning') glowColor = '#FF6A00';
            if (node.status === 'compromised') glowColor = '#00C2FF';

            // Draw larger, prominent outer ring (diameter 32px)
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
            this.ctx.strokeStyle = isHover ? glowColor : '#2A2A2A';
            this.ctx.lineWidth = isActive ? 2.5 : 1.5;
            this.ctx.stroke();

            this.ctx.fillStyle = '#111';
            this.ctx.fill();

            // Draw center node core (diameter 10px)
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
            this.ctx.fillStyle = glowColor;
            this.ctx.shadowBlur = isHover ? 12 : 4;
            this.ctx.shadowColor = glowColor;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;

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

            // 2. Render highly professional floating information badge for hovered/active/scanning/compromised nodes
            if (shouldDrawLabel) {
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
                this.ctx.strokeStyle = isHover || isActive ? glowColor : 'rgba(255, 255, 255, 0.15)';
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
                this.ctx.fillStyle = isHover || isActive ? glowColor : '#888';
                this.ctx.font = "9px 'IBM Plex Mono'";
                this.ctx.fillText(ipText, node.x, rectY + 26);
                
                this.ctx.restore();
            }
        });

        this.ctx.restore();
    }

    /**
     * Map canvas actions event bindings
     */
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
            }
        });

        // Zoom button binds
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

    /**
     * Map target coordinates to raw viewport coordinates
     */
    screenToWorld(sx, sy) {
        if (!this.canvas) return { x: sx, y: sy };
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        const x = (sx - this.pan.x - w / 2) / this.zoom + w / 2;
        const y = (sy - this.pan.y - h / 2) / this.zoom + h / 2;
        return { x, y };
    }

    /**
     * Render node diagnostic values into HUD panel
     */
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
            case 'router':
                return "Network interface routing traffic. Swaps diagnostic packets and routes internal connections.";
            case 'firewall':
                return "WAF Active Firewall. Audits incoming REST requests. Locks unauthorized ports and alerts SIEM collectors.";
            case 'web':
                return "Simulated client web host server. Runs Nginx web applications. Prone to outdated configuration folder exposure.";
            case 'db':
                return "Central database SQL server. Holds hashed operator files and client records hashes. Vulnerable to structural auditing SQL injections.";
            default:
                return "System nodes cluster backup configuration component.";
        }
    }
}

export const network = new NetworkTopology();
