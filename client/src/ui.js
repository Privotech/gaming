// ============================================================
// CITYVERSE NG  |  ui.js
// Modern HUD & Interaction Layer:
// - Top Bar: ₦ Naira Wallet, Stamina bar, Time of Day, Job tracker
// - Minimap Radar GPS (Player, Cocoa House, Safehouse, Bus Stops, Buka)
// - Speedometer gauge when driving
// - Interaction popups (Buka menu, Property inspection, Bedroom sleep)
// - Jobs dispatch menu & Controls helper
// - Mobile touch controls overlay
// ============================================================
import { radio } from './audio.js';

export class UIManager {
  constructor(gameplay, housing, player, vehicles) {
    this.gameplay = gameplay;
    this.housing = housing;
    this.player = player;
    this.vehicles = vehicles;

    this.container = null;
    this.hudTop = null;
    this.promptEl = null;
    this.speedoEl = null;
    this.minimapCanvas = null;
    this.minimapCtx = null;
    this.activeModal = null;
    this.isDriving = false;
    this.activeVehicle = null;

    // GPS Navigation & Performance Optimization
    this.gpsWaypoint = null; // { x, z, name }
    this.roadsCanvas = null;
    this.cachedRoadPts = null;
    this.lastPlayerPos = null;

    // Callbacks to main
    this.onToggleVehicle = null;
    this.onHonk = null;
    this.onSetGPSWaypoint = null;
    this.onFastTravel = null;
    this.onTogglePoliceChase = null;
  }

  init() {
    this.buildHUD();
    this.buildMinimap();
    this.setupKeyListeners();
  }

  buildHUD() {
    // Main HUD wrapper
    this.container = document.createElement('div');
    this.container.id = 'cityverse-ui';
    this.container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;user-select:none';
    document.body.appendChild(this.container);

    // 0. GTA 5 Center Reticle (Crosshair)
    this.crosshairEl = document.createElement('div');
    this.crosshairEl.id = 'cv-crosshair';
    this.crosshairEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:5px;height:5px;background:rgba(255,255,255,0.85);border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.9);pointer-events:none;';
    this.container.appendChild(this.crosshairEl);

    // GPS Navigation Toast Banner (Top Center)
    this.gpsHudEl = document.createElement('div');
    this.gpsHudEl.id = 'cv-gps-hud';
    this.gpsHudEl.style.cssText = 'display:none;position:absolute;top:70px;left:50%;transform:translateX(-50%);background:rgba(15,20,28,0.92);border:1px solid #ffd700;border-radius:24px;padding:6px 18px;color:#fff;font-size:12px;font-weight:800;backdrop-filter:blur(8px);box-shadow:0 6px 20px rgba(0,0,0,0.5);pointer-events:auto;align-items:center;gap:10px;z-index:60;';
    this.gpsHudEl.innerHTML = `
      <span style="font-size:14px;">🎯</span>
      <span id="cv-gps-text" style="color:#ffd700;letter-spacing:0.3px;">GPS: Cocoa House • 120m</span>
      <button id="cv-gps-clear" style="background:rgba(255,255,255,0.1);border:none;color:#ff5252;font-size:12px;font-weight:900;cursor:pointer;padding:2px 7px;border-radius:10px;line-height:1;" title="Clear GPS Route">✕</button>
    `;
    this.container.appendChild(this.gpsHudEl);

    // 1. TOP BAR (Naira wallet, Time of Day, Wanted Stars, Weapon Card, Action Buttons)
    this.hudTop = document.createElement('div');
    this.hudTop.style.cssText = 'position:absolute;top:14px;left:14px;right:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;';
    this.hudTop.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:12px;background:rgba(18,22,28,0.88);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:8px 16px;box-shadow:0 8px 24px rgba(0,0,0,0.4);pointer-events:auto;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;background:#2e7d32;color:#fff;font-weight:800;font-size:13px;padding:3px 7px;border-radius:6px;letter-spacing:0.5px;">₦</span>
            <span id="cv-money" style="font-size:20px;font-weight:900;color:#2ecc71;font-variant-numeric:tabular-nums;font-family:Impact,system-ui,sans-serif;letter-spacing:1px;">₦5,000</span>
          </div>
          <div style="width:1px;height:24px;background:rgba(255,255,255,0.15);"></div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span id="cv-time-icon" style="font-size:16px;">☀️</span>
            <span id="cv-time-text" style="font-size:14px;font-weight:700;color:#fff;">09:00</span>
            <span id="cv-time-phase" style="font-size:11px;font-weight:600;color:#ffa726;text-transform:uppercase;letter-spacing:0.5px;background:rgba(255,167,38,0.15);padding:2px 6px;border-radius:4px;">Morning</span>
          </div>
        </div>

        <!-- Active Mission Banner -->
        <div id="cv-job-banner" style="display:none;background:rgba(13,31,45,0.92);border-left:4px solid #00e5ff;backdrop-filter:blur(8px);border-radius:8px;padding:8px 14px;box-shadow:0 6px 18px rgba(0,0,0,0.4);max-width:380px;">
          <div id="cv-job-title" style="font-size:13px;font-weight:800;color:#00e5ff;text-transform:uppercase;letter-spacing:0.5px;">ALONG DUGBE!</div>
          <div id="cv-job-desc" style="font-size:12px;font-weight:600;color:#fff;margin-top:2px;">Next Stop: Cocoa House (140m)</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-size:11px;color:#aaa;">
            <span id="cv-job-fare" style="color:#81c784;font-weight:700;">Fare: ₦1,200</span>
            <span id="cv-job-timer" style="color:#ffb74d;font-weight:700;">⏱️ 45s</span>
          </div>
        </div>
      </div>

      <!-- Upper Right GTA 5 Style Controls: Wanted Stars, Police Pursuit Banner, Weapon Card, Action Buttons -->
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:auto;">
        <div style="display:flex;align-items:center;gap:10px;">
          <!-- GTA 5 Wanted Stars & Active Pursuit Tracker -->
          <div style="display:flex;flex-direction:column;align-items:flex-end;">
            <div id="cv-wanted-box" style="display:flex;align-items:center;gap:3px;background:rgba(14,18,24,0.9);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:6px 12px;backdrop-filter:blur(8px);box-shadow:0 4px 14px rgba(0,0,0,0.4);cursor:pointer;" title="Click to cycle Wanted Stars & trigger Police Chase">
              <span id="cv-wanted-label" style="font-size:10px;font-weight:900;color:#888;letter-spacing:1px;margin-right:2px;display:none;">POLICE</span>
              <span id="cv-star-1" style="font-size:18px;color:#444;transition:all 0.2s;">★</span>
              <span id="cv-star-2" style="font-size:18px;color:#444;transition:all 0.2s;">★</span>
              <span id="cv-star-3" style="font-size:18px;color:#444;transition:all 0.2s;">★</span>
              <span id="cv-star-4" style="font-size:18px;color:#444;transition:all 0.2s;">★</span>
              <span id="cv-star-5" style="font-size:18px;color:#444;transition:all 0.2s;">★</span>
            </div>

            <div id="cv-pursuit-hud" style="display:none;background:linear-gradient(90deg,rgba(213,0,0,0.92),rgba(41,121,255,0.92));border:1px solid #ff1744;color:#fff;border-radius:8px;padding:4px 10px;font-size:10px;font-weight:900;letter-spacing:0.8px;text-align:center;box-shadow:0 4px 14px rgba(255,23,68,0.5);margin-top:4px;cursor:pointer;" title="Click to clear or toggle Police Chase">
              🚨 <span id="cv-pursuit-text">POLICE PURSUIT IN PROGRESS</span>
            </div>
          </div>

          <!-- GTA 5 Weapon / Melee Card -->
          <div id="cv-weapon-card" style="background:rgba(18,22,28,0.88);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:6px 14px;border-radius:10px;display:flex;align-items:center;gap:8px;backdrop-filter:blur(6px);box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <span style="font-size:18px;">👊</span>
            <div style="text-align:left;">
              <div style="font-size:10px;font-weight:900;color:#fbc02d;letter-spacing:1px;">UNARMED</div>
              <div style="font-size:9px;color:#888;">[L-Click / Q] Punch</div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:8px;">
          <!-- All Town Map button -->
          <button id="cv-btn-map" style="background:rgba(18,22,28,0.9);border:1px solid #ffd700;color:#ffd700;padding:7px 12px;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px);box-shadow:0 4px 12px rgba(0,0,0,0.3);" title="Open Ibadan Town Map [M]">
            <span>🗺️</span> <span>Town Map [M]</span>
          </button>
          <!-- Trigger Police Chase button -->
          <button id="cv-btn-police" style="background:rgba(18,22,28,0.9);border:1px solid rgba(255,23,68,0.7);color:#ff5252;padding:7px 10px;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;backdrop-filter:blur(6px);display:flex;align-items:center;gap:5px;" title="Toggle Police Pursuit [P]">
            <span>🚨</span> <span>Police [P]</span>
          </button>
          <button id="cv-btn-jobs" style="background:rgba(18,22,28,0.85);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:7px 12px;border-radius:10px;font-weight:700;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px);box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            <span>🚖</span> <span>Jobs [J]</span>
          </button>
          <button id="cv-btn-cam" style="background:rgba(18,22,28,0.85);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:7px 12px;border-radius:10px;font-weight:700;font-size:11px;cursor:pointer;backdrop-filter:blur(6px);">
            <span>🎥 Cam [V]</span>
          </button>
          <button id="cv-btn-help" style="background:rgba(18,22,28,0.85);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:7px 10px;border-radius:10px;font-weight:700;font-size:11px;cursor:pointer;backdrop-filter:blur(6px);">
            <span>Guide [Tab]</span>
          </button>
        </div>
      </div>
    `;
    this.container.appendChild(this.hudTop);

    // Event listeners for top buttons
    document.getElementById('cv-btn-map')?.addEventListener('click', () => this.openTownMapModal());
    document.getElementById('cv-btn-police')?.addEventListener('click', () => this.togglePoliceWanted());
    document.getElementById('cv-wanted-box')?.addEventListener('click', () => this.cycleWantedStars());
    document.getElementById('cv-pursuit-hud')?.addEventListener('click', () => this.togglePoliceWanted());
    document.getElementById('cv-gps-clear')?.addEventListener('click', () => this.clearGPSWaypoint());

    // 2. BOTTOM INTERACTION PROMPT BANNER
    this.promptEl = document.createElement('div');
    this.promptEl.id = 'cv-prompt';
    this.promptEl.style.cssText = 'position:absolute;bottom:36px;left:50%;transform:translateX(-50%);background:rgba(15,20,26,0.92);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.18);color:#fff;padding:10px 22px;border-radius:30px;font-weight:700;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.5);display:none;pointer-events:none;white-space:nowrap;letter-spacing:0.3px;';
    this.container.appendChild(this.promptEl);
    this.container.appendChild(this.promptEl);

    // 3. GTA 5 VEHICLE ENTRANCE / HIJACK CLASSIFICATION POPUP (Bottom Right)
    this.vehPopupEl = document.createElement('div');
    this.vehPopupEl.id = 'cv-veh-popup';
    this.vehPopupEl.style.cssText = 'position:absolute;bottom:120px;right:24px;background:rgba(12,16,22,0.94);border-left:5px solid #fbc02d;padding:10px 18px;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:none;pointer-events:none;transition:all 0.3s;backdrop-filter:blur(10px);min-width:220px;';
    this.vehPopupEl.innerHTML = `
      <div id="cv-veh-popup-action" style="font-size:10px;font-weight:900;color:#ff1744;letter-spacing:1.5px;text-transform:uppercase;">HIJACKED VEHICLE</div>
      <div id="cv-veh-popup-name" style="font-size:18px;font-weight:900;color:#fff;letter-spacing:0.5px;margin-top:2px;">DANFO COMMERCIAL BUS</div>
      <div id="cv-veh-popup-class" style="font-size:11px;color:#aaa;font-weight:600;margin-top:2px;">Public Passenger Transit • Ibadan</div>
    `;
    this.container.appendChild(this.vehPopupEl);

    // 4. CITIZEN / DRIVER PANIC SHOUT BANNER
    this.shoutEl = document.createElement('div');
    this.shoutEl.id = 'cv-shout-banner';
    this.shoutEl.style.cssText = 'position:absolute;bottom:110px;left:50%;transform:translateX(-50%);background:rgba(15,10,10,0.92);border:2px solid #ff1744;color:#fff;padding:9px 24px;border-radius:24px;display:none;pointer-events:none;font-weight:900;font-size:14px;letter-spacing:0.5px;box-shadow:0 8px 24px rgba(255,23,68,0.3);text-align:center;backdrop-filter:blur(6px);white-space:nowrap;';
    this.container.appendChild(this.shoutEl);

    // 5. SPEEDOMETER & CAR RADIO (Bottom Right when driving)
    this.speedoEl = document.createElement('div');
    this.speedoEl.id = 'cv-speedo';
    this.speedoEl.style.cssText = 'position:absolute;bottom:24px;right:24px;background:rgba(18,22,28,0.92);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:20px;padding:14px 20px;box-shadow:0 12px 28px rgba(0,0,0,0.5);display:none;min-width:180px;text-align:center;pointer-events:auto;';
    this.speedoEl.innerHTML = `
      <div id="cv-speedo-val" style="font-size:38px;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;line-height:1;font-family:Impact,sans-serif;">0</div>
      <div style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">KM/H</div>
      <div id="cv-veh-name" style="font-size:11px;font-weight:700;color:#fbc02d;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">DANFO BUS</div>
      
      <!-- In-Car Radio Cassette Widget -->
      <div id="cv-radio-btn" style="margin-top:10px;background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:6px 10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;transition:all 0.2s;" title="Click or Press [M] to change station">
        <div style="display:flex;align-items:center;gap:6px;text-align:left;">
          <span style="font-size:16px;">📻</span>
          <div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span id="cv-radio-freq" style="font-size:9px;font-weight:800;color:#ff9800;background:rgba(255,152,0,0.25);padding:1px 4px;border-radius:3px;">--.-</span>
              <span id="cv-radio-name" style="font-size:11px;font-weight:800;color:#fff;">Radio Off</span>
            </div>
            <div id="cv-radio-sub" style="font-size:9px;color:#aaa;margin-top:1px;">Press [M] to tune</div>
          </div>
        </div>
        <div id="cv-radio-bars" style="display:none;align-items:flex-end;gap:2px;height:12px;">
          <span style="width:3px;height:10px;background:#00e676;border-radius:1px;animation:pulse 0.4s infinite alternate;"></span>
          <span style="width:3px;height:6px;background:#00e676;border-radius:1px;animation:pulse 0.6s infinite alternate;"></span>
          <span style="width:3px;height:12px;background:#00e676;border-radius:1px;animation:pulse 0.5s infinite alternate;"></span>
        </div>
      </div>

      <div style="font-size:10px;color:#888;margin-top:6px;">[H] Horn • [M] Radio • [F / E] Exit</div>
    `;
    this.container.appendChild(this.speedoEl);

    // 6. DAMAGE RED FLASH VIGNETTE
    this.damageFlashEl = document.createElement('div');
    this.damageFlashEl.id = 'cv-damage-flash';
    this.damageFlashEl.style.cssText = 'position:fixed;inset:0;background:radial-gradient(circle, transparent 55%, rgba(213,0,0,0.65) 100%);display:none;pointer-events:none;z-index:9000;transition:opacity 0.2s;';
    this.container.appendChild(this.damageFlashEl);

    // 7. GTA 5 WASTED SCREEN OVERLAY
    this.wastedEl = document.createElement('div');
    this.wastedEl.id = 'cv-wasted-screen';
    this.wastedEl.style.cssText = 'position:fixed;inset:0;background:rgba(10,5,5,0.75);backdrop-filter:grayscale(95%) contrast(125%);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:9999;pointer-events:none;';
    this.wastedEl.innerHTML = `
      <div style="font-size:84px;font-weight:900;color:#d50000;letter-spacing:10px;text-shadow:0 0 35px rgba(255,0,0,0.9);font-family:Impact,sans-serif;transform:scale(1);">WASTED</div>
      <div style="font-size:16px;color:#fff;font-weight:700;letter-spacing:3px;margin-top:12px;text-transform:uppercase;background:rgba(0,0,0,0.6);padding:6px 18px;border-radius:4px;">Respawning at Dugbe State Hospital...</div>
    `;
    this.container.appendChild(this.wastedEl);

    // 8. GTA 5 BUSTED SCREEN OVERLAY
    this.bustedEl = document.createElement('div');
    this.bustedEl.id = 'cv-busted-screen';
    this.bustedEl.style.cssText = 'position:fixed;inset:0;background:rgba(5,10,20,0.75);backdrop-filter:grayscale(90%);display:none;align-items:center;justify-content:center;flex-direction:column;z-index:9999;pointer-events:none;';
    this.bustedEl.innerHTML = `
      <div style="font-size:84px;font-weight:900;color:#2979ff;letter-spacing:10px;text-shadow:0 0 35px rgba(41,121,255,0.9);font-family:Impact,sans-serif;">BUSTED</div>
      <div style="font-size:16px;color:#fff;font-weight:700;letter-spacing:3px;margin-top:12px;text-transform:uppercase;background:rgba(0,0,0,0.6);padding:6px 18px;border-radius:4px;">Detained by Oyo State Police Command...</div>
    `;
    this.container.appendChild(this.bustedEl);

    // Click radio widget to cycle stations
    document.getElementById('cv-radio-btn').addEventListener('click', () => {
      const st = radio.nextStation();
      this.updateRadioUI(st);
    });

    // Button event listeners
    document.getElementById('cv-btn-jobs').addEventListener('click', () => this.openJobsModal());
    document.getElementById('cv-btn-help').addEventListener('click', () => this.openHelpModal());
    document.getElementById('cv-btn-cam')?.addEventListener('click', () => {
      if (this.onCycleCamera) this.onCycleCamera();
    });
  }



  updateRadioUI(st) {
    if (!st) st = radio.getActiveStation();
    const freqEl = document.getElementById('cv-radio-freq');
    const nameEl = document.getElementById('cv-radio-name');
    const subEl = document.getElementById('cv-radio-sub');
    const barsEl = document.getElementById('cv-radio-bars');
    if (!nameEl) return;

    if (st.id === 'off') {
      freqEl.textContent = '--.-';
      freqEl.style.background = 'rgba(255,255,255,0.1)';
      freqEl.style.color = '#888';
      nameEl.textContent = 'Radio Off';
      subEl.textContent = 'Press [M] to tune';
      barsEl.style.display = 'none';
    } else {
      freqEl.textContent = st.freq;
      freqEl.style.background = `${st.color}33`;
      freqEl.style.color = st.color;
      nameEl.textContent = st.name;
      subEl.textContent = `${st.tag} • [M] Tune`;
      barsEl.style.display = 'flex';
    }
  }

  // 4. 2D CANVAS MINIMAP RADAR & GTA 5 STATUS BARS (Bottom Left)
  buildMinimap() {
    const mapWrap = document.createElement('div');
    mapWrap.style.cssText = 'position:absolute;bottom:38px;left:20px;width:150px;height:150px;border-radius:50%;overflow:visible;pointer-events:auto;';

    // Town Map Expand Button above radar
    const mapBtn = document.createElement('button');
    mapBtn.id = 'cv-btn-minimap-expand';
    mapBtn.textContent = '🗺️ ALL TOWN MAP [M]';
    mapBtn.style.cssText = 'position:absolute;top:-28px;left:50%;transform:translateX(-50%);background:rgba(18,22,28,0.92);border:1px solid rgba(255,215,0,0.5);color:#ffd700;font-size:10px;font-weight:900;padding:3px 10px;border-radius:12px;cursor:pointer;white-space:nowrap;backdrop-filter:blur(6px);box-shadow:0 4px 12px rgba(0,0,0,0.6);';
    mapBtn.addEventListener('click', () => this.openTownMapModal());
    mapWrap.appendChild(mapBtn);

    const radarCircle = document.createElement('div');
    radarCircle.style.cssText = 'width:150px;height:150px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.25);background:#10171e;box-shadow:0 10px 28px rgba(0,0,0,0.7);position:relative;cursor:pointer;';
    radarCircle.title = 'Click to open Full Town Map [M]';
    radarCircle.addEventListener('click', () => this.openTownMapModal());

    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    radarCircle.appendChild(this.minimapCanvas);

    // North compass marker
    const compass = document.createElement('div');
    compass.textContent = 'N';
    compass.style.cssText = 'position:absolute;top:4px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:900;color:#ff5252;pointer-events:none;';
    radarCircle.appendChild(compass);

    // GTA 5 Status Bars: Health (Green), Armor (Blue), Stamina (Yellow) directly below Minimap
    const barsContainer = document.createElement('div');
    barsContainer.style.cssText = 'position:absolute;bottom:-24px;left:0;width:150px;display:flex;flex-direction:column;gap:3px;';
    barsContainer.innerHTML = `
      <div style="display:flex;gap:4px;width:100%;height:8px;">
        <div style="flex:1;background:rgba(0,0,0,0.75);border-radius:2px;overflow:hidden;border:1px solid rgba(255,255,255,0.18);" title="Health">
          <div id="cv-health-bar" style="width:100%;height:100%;background:#2ecc71;transition:width 0.15s;"></div>
        </div>
        <div style="flex:1;background:rgba(0,0,0,0.75);border-radius:2px;overflow:hidden;border:1px solid rgba(255,255,255,0.18);" title="Armor">
          <div id="cv-armor-bar" style="width:50%;height:100%;background:#3498db;transition:width 0.15s;"></div>
        </div>
      </div>
      <div style="width:100%;height:5px;background:rgba(0,0,0,0.75);border-radius:2px;overflow:hidden;border:1px solid rgba(255,255,255,0.18);" title="Stamina">
        <div id="cv-stamina-mini" style="width:100%;height:100%;background:#f1c40f;transition:width 0.15s;"></div>
      </div>
    `;

    mapWrap.appendChild(radarCircle);
    mapWrap.appendChild(barsContainer);
    this.container.appendChild(mapWrap);
  }

  flashDamage() {
    if (!this.damageFlashEl) return;
    this.damageFlashEl.style.display = 'block';
    this.damageFlashEl.style.opacity = '1';
    setTimeout(() => {
      this.damageFlashEl.style.opacity = '0';
      setTimeout(() => { this.damageFlashEl.style.display = 'none'; }, 200);
    }, 120);
  }

  showVehicleCard(actionText, name, subtitle) {
    if (!this.vehPopupEl) return;
    document.getElementById('cv-veh-popup-action').textContent = actionText;
    document.getElementById('cv-veh-popup-name').textContent = name;
    document.getElementById('cv-veh-popup-class').textContent = subtitle;
    this.vehPopupEl.style.display = 'block';
    this.vehPopupEl.style.transform = 'translateX(0)';
    clearTimeout(this._vehPopupTimer);
    this._vehPopupTimer = setTimeout(() => {
      this.vehPopupEl.style.transform = 'translateX(20px)';
      this.vehPopupEl.style.display = 'none';
    }, 4000);
  }

  showShout(text) {
    if (!this.shoutEl) return;
    this.shoutEl.innerHTML = `<span style="color:#ff1744;">NOTICE: </span><span>${text}</span>`;
    this.shoutEl.style.display = 'block';
    clearTimeout(this._shoutTimer);
    this._shoutTimer = setTimeout(() => {
      this.shoutEl.style.display = 'none';
    }, 3800);
  }

  showWasted(respawnCallback) {
    if (!this.wastedEl) return;
    this.wastedEl.style.display = 'flex';
    setTimeout(() => {
      this.wastedEl.style.display = 'none';
      if (respawnCallback) respawnCallback();
    }, 3200);
  }

  showBusted(respawnCallback) {
    if (!this.bustedEl) return;
    this.bustedEl.style.display = 'flex';
    setTimeout(() => {
      this.bustedEl.style.display = 'none';
      if (respawnCallback) respawnCallback();
    }, 3200);
  }

  setupKeyListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.openTownMapModal();
      }
      if (e.code === 'KeyP') {
        this.togglePoliceWanted();
      }
      if (e.code === 'KeyN') {
        const st = radio.nextStation();
        this.updateRadioUI(st);
      }
      if (e.code === 'KeyJ') {
        this.openJobsModal();
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleHelpModal();
      }
      if (e.code === 'Escape') {
        this.closeModal();
      }
    });
  }

  togglePoliceWanted() {
    if (!this.gameplay) return;
    if (this.gameplay.wantedStars > 0) {
      this.gameplay.clearWanted();
      this.showShout('Police pursuit disengaged. Area clear.');
    } else {
      this.gameplay.addWantedStars(2);
      this.showShout('🚨 CRIME REPORTED: Operation Burst & Police cruisers deployed to your location!');
    }
  }

  cycleWantedStars() {
    if (!this.gameplay) return;
    const current = this.gameplay.wantedStars || 0;
    const next = current >= 5 ? 0 : current + 1;
    if (next === 0) {
      this.gameplay.clearWanted();
      this.showShout('Wanted level cleared.');
    } else {
      this.gameplay.wantedStars = next;
      this.gameplay.wantedTimer = 25.0 + next * 8.0;
      this.showShout(`🚨 Wanted Level: ${next} Star${next > 1 ? 's' : ''}! Police units closing in!`);
    }
  }

  setGPSWaypoint(x, z, name = 'Custom Waypoint') {
    this.gpsWaypoint = { x, z, name };
    if (this.onSetGPSWaypoint) {
      this.onSetGPSWaypoint(this.gpsWaypoint);
    }
    const hud = document.getElementById('cv-gps-hud');
    if (hud) {
      hud.style.display = 'flex';
      const dist = this.lastPlayerPos ? Math.round(Math.hypot(x - this.lastPlayerPos.x, z - this.lastPlayerPos.z)) : 100;
      document.getElementById('cv-gps-text').textContent = `GPS: ${name} • ${dist}m`;
    }
  }

  clearGPSWaypoint() {
    this.gpsWaypoint = null;
    if (this.onSetGPSWaypoint) {
      this.onSetGPSWaypoint(null);
    }
    const hud = document.getElementById('cv-gps-hud');
    if (hud) hud.style.display = 'none';
  }

  setPrompt(text) {
    if (!text) {
      this.promptEl.style.display = 'none';
      return;
    }
    this.promptEl.innerHTML = text;
    this.promptEl.style.display = 'block';
  }

  // Pre-render road network into an offscreen canvas for 60fps performance optimization
  initRoadsCanvas(roadPts) {
    if (!roadPts || !roadPts.length) return;
    const s = 900; // 900m span around center (-450 to +450)
    this.roadsCanvas = document.createElement('canvas');
    this.roadsCanvas.width = s;
    this.roadsCanvas.height = s;
    const ctx = this.roadsCanvas.getContext('2d');

    ctx.fillStyle = '#0f1722';
    ctx.fillRect(0, 0, s, s);

    // Render road base and stripes
    ctx.strokeStyle = '#273544';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    roadPts.forEach(([rx, rz]) => {
      const cx = rx + 450;
      const cz = rz + 450;
      ctx.lineTo(cx, cz);
    });
    ctx.stroke();

    ctx.strokeStyle = '#3a4b5d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    roadPts.forEach(([rx, rz]) => {
      ctx.lineTo(rx + 450, rz + 450);
    });
    ctx.stroke();
  }

  update(dt, playerPos, playerRotationY, drivingVehicle, roadPts, extra = {}) {
    this.lastPlayerPos = playerPos;
    this.cachedRoadPts = roadPts;

    // 1. Update Top Bar
    document.getElementById('cv-money').textContent = `₦${this.gameplay.money.toLocaleString()}`;
    const timeInfo = this.gameplay.getTimeFormatted();
    document.getElementById('cv-time-text').textContent = timeInfo.text;
    document.getElementById('cv-time-phase').textContent = timeInfo.phase;
    document.getElementById('cv-time-icon').textContent =
      timeInfo.hours >= 6 && timeInfo.hours < 18 ? '☀️' : '🌙';

    // GTA 5 Status Bars Update
    const hBar = document.getElementById('cv-health-bar');
    if (hBar) hBar.style.width = `${Math.max(0, this.gameplay.health)}%`;
    const aBar = document.getElementById('cv-armor-bar');
    if (aBar) aBar.style.width = `${Math.max(0, this.gameplay.armor)}%`;
    const sMini = document.getElementById('cv-stamina-mini');
    if (sMini) sMini.style.width = `${Math.max(0, this.gameplay.stamina)}%`;

    // GTA 5 Wanted Stars Update
    const stars = this.gameplay.wantedStars || 0;
    const label = document.getElementById('cv-wanted-label');
    const isBlinking = stars > 0 && Math.floor(Date.now() / 300) % 2 === 0;

    if (label) {
      label.style.display = stars > 0 ? 'inline' : 'none';
      label.style.color = isBlinking ? '#ff1744' : '#2979ff';
    }

    for (let i = 1; i <= 5; i++) {
      const starEl = document.getElementById(`cv-star-${i}`);
      if (starEl) {
        if (i <= stars) {
          starEl.style.color = isBlinking ? '#ff1744' : '#ffea00';
          starEl.style.textShadow = isBlinking ? '0 0 8px #ff1744' : '0 0 8px #ffea00';
          starEl.style.transform = isBlinking ? 'scale(1.2)' : 'scale(1)';
        } else {
          starEl.style.color = '#374151';
          starEl.style.textShadow = 'none';
          starEl.style.transform = 'scale(1)';
        }
      }
    }

    // Active Police Pursuit HUD Tracker
    const pursuitHud = document.getElementById('cv-pursuit-hud');
    if (pursuitHud) {
      if (stars > 0 && extra.police) {
        pursuitHud.style.display = 'block';
        const pInfo = extra.police.getPursuitInfo();
        const dist = Math.round(pInfo.closestDist);
        const distStr = dist < 900 ? `${dist}m` : 'Approaching';
        document.getElementById('cv-pursuit-text').textContent =
          `🚨 PURSUIT: ${pInfo.count} SQUAD CARS • ${distStr} AWAY`;
      } else {
        pursuitHud.style.display = 'none';
      }
    }

    // Active GPS Navigation Update
    if (this.gpsWaypoint) {
      const gDist = Math.round(Math.hypot(this.gpsWaypoint.x - playerPos.x, this.gpsWaypoint.z - playerPos.z));
      if (gDist < 6.0) {
        this.showShout(`🎯 Reached GPS Destination: ${this.gpsWaypoint.name}!`);
        this.clearGPSWaypoint();
      } else {
        const gText = document.getElementById('cv-gps-text');
        if (gText) gText.textContent = `GPS: ${this.gpsWaypoint.name} • ${gDist}m`;
      }
    }

    // Crosshair visibility: only on foot
    if (this.crosshairEl) {
      this.crosshairEl.style.display = drivingVehicle ? 'none' : 'block';
    }

    // 2. Update Active Job Banner
    const jobBanner = document.getElementById('cv-job-banner');
    if (this.gameplay.activeJob) {
      jobBanner.style.display = 'block';
      const job = this.gameplay.activeJob;
      document.getElementById('cv-job-title').textContent = job.title;
      const targetPos = job.type === 'passenger' ? job.dest.pos : job.destPos;
      const dist = Math.round(Math.hypot(targetPos.x - playerPos.x, targetPos.z - playerPos.z));
      const destName = job.type === 'passenger' ? job.dest.name : job.destName;
      document.getElementById('cv-job-desc').textContent = `To: ${destName} (${dist}m)`;
      document.getElementById('cv-job-fare').textContent =
        job.type === 'passenger' ? `Fare: ₦${job.totalFare.toLocaleString()} (${job.passengers} pass)` : `Reward: ₦${job.reward.toLocaleString()}`;
      document.getElementById('cv-job-timer').textContent = `⏱️ ${Math.max(0, Math.ceil(job.timer))}s`;
    } else {
      jobBanner.style.display = 'none';
    }

    // 3. Update Speedometer
    if (drivingVehicle) {
      this.speedoEl.style.display = 'block';
      document.getElementById('cv-speedo-val').textContent = Math.round(drivingVehicle.kmh);
      document.getElementById('cv-veh-name').textContent = drivingVehicle.T.name;
    } else {
      this.speedoEl.style.display = 'none';
    }

    // 4. Render Minimap
    this.renderMinimap(playerPos, playerRotationY, roadPts, extra);
  }

  renderMinimap(playerPos, playerRotationY, roadPts, extra = {}) {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const w = 150, h = 150, cx = w / 2, cy = h / 2;
    const zoom = 0.65; // map scale

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#141c24';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);

    // Draw Roads (Optimized road rendering)
    if (roadPts && roadPts.length) {
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Step by 2 or draw in-range points for 60fps performance
      for (let i = 0; i < roadPts.length; i += 2) {
        const pt = roadPts[i];
        const mx = (pt[0] - playerPos.x) * zoom;
        const my = (pt[1] - playerPos.z) * zoom;
        if (Math.hypot(mx, my) < cx + 12) {
          ctx.lineTo(mx, my);
        }
      }
      ctx.stroke();
    }

    // Draw Cocoa House landmark (golden star)
    if (this.housing.cocoaHousePos) {
      const chx = (this.housing.cocoaHousePos.x - playerPos.x) * zoom;
      const chz = (this.housing.cocoaHousePos.z - playerPos.z) * zoom;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(chx, chz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Safehouse (green dot)
    if (this.housing.safehousePos) {
      const shx = (this.housing.safehousePos.x - playerPos.x) * zoom;
      const shz = (this.housing.safehousePos.z - playerPos.z) * zoom;
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(shx, shz, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Bus Stops (cyan dots)
    if (this.gameplay.busStops) {
      ctx.fillStyle = '#00bcd4';
      this.gameplay.busStops.forEach((b) => {
        const bx = (b.pos.x - playerPos.x) * zoom;
        const bz = (b.pos.z - playerPos.z) * zoom;
        ctx.beginPath();
        ctx.arc(bx, bz, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Buka Food joints (orange dots)
    if (this.housing.bukaStalls) {
      ctx.fillStyle = '#ff9800';
      this.housing.bukaStalls.forEach((bk) => {
        const kx = (bk.pos.x - playerPos.x) * zoom;
        const kz = (bk.pos.z - playerPos.z) * zoom;
        ctx.beginPath();
        ctx.arc(kx, kz, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Petrol Station (green/teal fuel dot)
    if (extra.streetLife?.fillingStation) {
      const fs = extra.streetLife.fillingStation.pos;
      const fx = (fs.x - playerPos.x) * zoom;
      const fz = (fs.z - playerPos.z) * zoom;
      ctx.fillStyle = '#00e676';
      ctx.beginPath();
      ctx.arc(fx, fz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Police / VIO Checkpoint (flashing red/blue beacon)
    if (extra.streetLife?.checkpoint) {
      const cp = extra.streetLife.checkpoint.pos;
      const cpx = (cp.x - playerPos.x) * zoom;
      const cpz = (cp.z - playerPos.z) * zoom;
      const isRed = Math.floor(Date.now() / 350) % 2 === 0;
      ctx.fillStyle = isRed ? '#ff1744' : '#2979ff';
      ctx.beginPath();
      ctx.arc(cpx, cpz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Hawkers (small amber dots)
    if (extra.streetLife?.hawkers) {
      ctx.fillStyle = '#ffb74d';
      extra.streetLife.hawkers.forEach((h) => {
        const hx = (h.pos.x - playerPos.x) * zoom;
        const hz = (h.pos.z - playerPos.z) * zoom;
        ctx.beginPath();
        ctx.arc(hx, hz, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw Moving Traffic AI Vehicles (Keke, Okada, Danfos, Cars)
    if (extra.traffic) {
      const trafVehicles = extra.traffic.getTrafficPositions();
      trafVehicles.forEach((v) => {
        const vx = (v.x - playerPos.x) * zoom;
        const vz = (v.z - playerPos.z) * zoom;
        if (Math.hypot(vx, vz) < cx + 5) {
          ctx.fillStyle = v.type === 'keke' ? '#ffd600' : v.type === 'okada' ? '#00e5ff' : v.type === 'danfo' ? '#ff9100' : '#cfd8dc';
          ctx.beginPath();
          ctx.arc(vx, vz, v.type === 'danfo' ? 3.2 : 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Chasing Police Cruisers (flashing dual red/blue pursuit beacon rings)
    if (extra.police) {
      const cops = extra.police.getPolicePositions();
      const isRed = Math.floor(Date.now() / 150) % 2 === 0;
      cops.forEach((cop) => {
        const cpx = (cop.x - playerPos.x) * zoom;
        const cpz = (cop.z - playerPos.z) * zoom;
        const dist = Math.hypot(cpx, cpz);
        if (dist < cx + 20) {
          // Flashing siren halo
          ctx.strokeStyle = isRed ? '#ff1744' : '#2979ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cpx, cpz, 6 + Math.sin(Date.now() * 0.02) * 2, 0, Math.PI * 2);
          ctx.stroke();

          // Solid cop car center blip
          ctx.fillStyle = isRed ? '#ff1744' : '#2979ff';
          ctx.beginPath();
          ctx.arc(cpx, cpz, 4, 0, Math.PI * 2);
          ctx.fill();

          // Cop car directional pointer
          const pAngle = cop.rotY;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cpx + Math.sin(pAngle) * 5, cpz + Math.cos(pAngle) * 5, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Custom GPS Waypoint & Dotted Navigation Line
    if (this.gpsWaypoint) {
      const gpx = (this.gpsWaypoint.x - playerPos.x) * zoom;
      const gpz = (this.gpsWaypoint.z - playerPos.z) * zoom;

      // Dotted navigation line from player (0,0) to GPS
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gpx, gpz);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsing Gold Waypoint Marker
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(gpx, gpz, 5 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw Objective beacon (pulsing red/yellow)
    if (this.gameplay.activeJob) {
      const targetPos = this.gameplay.activeJob.type === 'passenger'
        ? this.gameplay.activeJob.dest.pos
        : this.gameplay.activeJob.destPos;
      const ox = (targetPos.x - playerPos.x) * zoom;
      const oz = (targetPos.z - playerPos.z) * zoom;
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(ox, oz, 5 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player Arrow at center
    ctx.rotate(-playerRotationY);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Radar grid ring
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.arc(cx, cy, 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 5. INTERACTIVE ALL TOWN MAP MODAL (Full Tactical District View)
  openTownMapModal() {
    if (this.activeModal) {
      this.closeModal();
      return;
    }

    const playerPos = this.lastPlayerPos || { x: 0, z: 0 };
    const roadPts = this.cachedRoadPts || [];

    // Distinct Marked Town Districts & Areas in Ibadan / Dugbe
    const districts = [
      {
        id: 'dugbe_cbd',
        name: 'Dugbe Commercial CBD',
        tagline: 'Central Business District & Banking Hub',
        color: '#ffd700',
        bg: 'rgba(255, 215, 0, 0.12)',
        border: 'rgba(255, 215, 0, 0.7)',
        center: { x: -10, z: 15 },
        w: 190,
        h: 170,
        desc: 'Commercial core of Ibadan: Cocoa House, commercial banks, post office, and business headquarters.',
      },
      {
        id: 'cocoa_house',
        name: 'Cocoa House Complex',
        tagline: 'Historic 26-Storey Skyscraper Landmark (1965)',
        color: '#ffb300',
        bg: 'rgba(255, 179, 0, 0.22)',
        border: '#ffb300',
        center: { x: -15, z: 25 },
        w: 65,
        h: 55,
        desc: 'First skyscraper in Tropical Africa. Heritage site with observation deck, banking hall, and plaza.',
      },
      {
        id: 'ekotedo',
        name: 'Ekotedo Quarters',
        tagline: 'Historic Yoruba Residential Compounds',
        color: '#ff7043',
        bg: 'rgba(255, 112, 67, 0.14)',
        border: 'rgba(255, 112, 67, 0.75)',
        center: { x: 55, z: -35 },
        w: 160,
        h: 140,
        desc: 'Traditional residential neighborhood: family compounds, safehouse apartments, and corner kiosks.',
      },
      {
        id: 'gbagi_market',
        name: 'Gbagi Old Market',
        tagline: 'Textile Wholesale & Trading Bazaar',
        color: '#00e676',
        bg: 'rgba(0, 230, 118, 0.14)',
        border: 'rgba(0, 230, 118, 0.75)',
        center: { x: -95, z: 75 },
        w: 150,
        h: 120,
        desc: 'Famous textile and fabric trade market with busy roadside hawkers and retail stalls.',
      },
      {
        id: 'railway',
        name: 'Ibadan Railway Terminus',
        tagline: 'Historic Western Rail Terminus & Freight Yard',
        color: '#42a5f5',
        bg: 'rgba(66, 165, 245, 0.14)',
        border: 'rgba(66, 165, 245, 0.75)',
        center: { x: -135, z: -60 },
        w: 170,
        h: 110,
        desc: 'Western rail junction connecting passengers and freight across southwestern Nigeria.',
      },
      {
        id: 'police_checkpoint',
        name: 'Oyo State Police HQ & Post',
        tagline: 'Operation Burst & Nigeria Police Security Post',
        color: '#ff1744',
        bg: 'rgba(255, 23, 68, 0.16)',
        border: 'rgba(255, 23, 68, 0.8)',
        center: { x: -45, z: -30 },
        w: 110,
        h: 90,
        desc: 'Joint security patrol base and road checkpoint with tactical cruisers and vehicle inspection gate.',
      },
      {
        id: 'petrol_station',
        name: 'Dugbe NNPC Mega Petrol Station',
        tagline: '24/7 PMS Fuel (₦750/L) & Vehicle Service',
        color: '#00c853',
        bg: 'rgba(0, 200, 83, 0.18)',
        border: 'rgba(0, 200, 83, 0.85)',
        center: { x: 50, z: 60 },
        w: 70,
        h: 60,
        desc: 'High-volume filling station with automated dispensing pumps and convenience store.',
      },
    ];

    // Comprehensive POIs List with world positions & categories
    const pois = [
      { id: 'cocoa', name: 'Cocoa House Skyscraper', cat: 'landmark', icon: '🏛️', district: 'Dugbe CBD', pos: this.housing.cocoaHousePos || { x: -15, z: 25 }, desc: 'Historic 26-storey heritage tower' },
      { id: 'safehouse', name: 'Cocoa View Safehouse', cat: 'safehouse', icon: '🏠', district: 'Ekotedo', pos: this.housing.safehouses?.[0]?.exteriorPos || { x: 28, z: -18 }, desc: 'Player bed, wardrobe & balcony' },
      { id: 'police', name: 'Dugbe Police & VIO Checkpoint', cat: 'police', icon: '🚨', district: 'Police Post', pos: { x: -45, z: -30 }, desc: 'Stop & search gate, patrol units' },
      { id: 'fuel', name: 'Dugbe Petrol Filling Station', cat: 'fuel', icon: '⛽', district: 'Dugbe North', pos: { x: 50, z: 60 }, desc: 'Refuel PMS ₦750/L' },
      { id: 'buka_1', name: 'Ose Olorun Amala Buka', cat: 'food', icon: '🍲', district: 'Ekotedo', pos: { x: 38, z: -25 }, desc: 'Fresh Amala, Ewedu & Gbegiri' },
      { id: 'buka_2', name: 'Mama Bose Canteen', cat: 'food', icon: '🍛', district: 'Dugbe CBD', pos: { x: -25, z: 35 }, desc: 'Jollof rice, dodo & beef' },
      { id: 'stop_0', name: 'Cocoa House Bus Stage', cat: 'transit', icon: '🚌', district: 'Dugbe CBD', pos: { x: -5, z: 15 }, desc: 'Danfo transit stop 1' },
      { id: 'stop_1', name: 'Post Office Junction Halt', cat: 'transit', icon: '🚌', district: 'Dugbe CBD', pos: { x: 25, z: 30 }, desc: 'Danfo transit stop 2' },
      { id: 'stop_2', name: 'Gbagi Market Bus Stop', cat: 'transit', icon: '🚌', district: 'Gbagi Market', pos: { x: -80, z: 65 }, desc: 'Commercial trading terminal' },
      { id: 'stop_3', name: 'Railway Station Transit Stage', cat: 'transit', icon: '🚌', district: 'Railway Terminus', pos: { x: -125, z: -50 }, desc: 'Danfo rail link stop' },
      { id: 'stop_4', name: 'Ekotedo Central Stage', cat: 'transit', icon: '🚌', district: 'Ekotedo', pos: { x: 60, z: -40 }, desc: 'Residential passenger hub' },
      { id: 'prop_1', name: 'Cocoa View Executive Penthouse', cat: 'property', icon: '🏢', district: 'Dugbe CBD', pos: { x: -10, z: 45 }, desc: 'Luxury high-rise apartment' },
      { id: 'prop_2', name: 'Ekotedo Compound Suite', cat: 'property', icon: '🏘️', district: 'Ekotedo', pos: { x: 45, z: -15 }, desc: 'Traditional residential home' },
    ];

    // Compute live distances
    pois.forEach((poi) => {
      poi.dist = Math.round(Math.hypot(poi.pos.x - playerPos.x, poi.pos.z - playerPos.z));
    });
    pois.sort((a, b) => a.dist - b.dist);

    const overlay = document.createElement('div');
    overlay.id = 'cv-town-map-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(8,12,18,0.88);backdrop-filter:blur(14px);z-index:110;display:flex;align-items:center;justify-content:center;pointer-events:auto;';

    const container = document.createElement('div');
    container.style.cssText = 'background:#0f1722;border:1px solid rgba(255,215,0,0.35);border-radius:20px;width:95%;max-width:1120px;height:90vh;max-height:760px;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.85);overflow:hidden;';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:14px 22px;border-bottom:1px solid rgba(255,255,255,0.12);display:flex;justify-content:space-between;align-items:center;background:rgba(20,28,38,0.9);';
    header.innerHTML = `
      <div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:22px;">🗺️</span>
          <span style="font-size:18px;font-weight:900;color:#ffd700;letter-spacing:0.8px;">IBADAN MUNICIPAL TOWN MAP & DISTRICT DIRECTORY</span>
          <span style="background:rgba(255,215,0,0.18);color:#ffd700;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;border:1px solid rgba(255,215,0,0.4);">LIVE GPS</span>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
          Dugbe Commercial CBD • Cocoa House • Ekotedo • Gbagi Market • Railway Terminus • Click map or list to set Waypoint
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <button id="cv-map-quick-police" style="background:rgba(213,0,0,0.2);border:1px solid #ff1744;color:#ff5252;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">
          🚨 Toggle Police Pursuit [P]
        </button>
        <button id="cv-map-close" style="background:none;border:none;color:#aaa;font-size:26px;cursor:pointer;line-height:1;padding:0 8px;">✕</button>
      </div>
    `;

    // Main layout: Sidebar (Left) + Map Canvas (Right)
    const body = document.createElement('div');
    body.style.cssText = 'flex:1;display:flex;overflow:hidden;';

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.style.cssText = 'width:340px;border-right:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;background:#0d141d;';

    // Filter categories tabs
    sidebar.innerHTML = `
      <div style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.08);">
        <div id="cv-map-filters" style="display:flex;flex-wrap:wrap;gap:5px;">
          <button class="cv-map-filter-btn" data-cat="all" style="background:#ffd700;color:#000;border:none;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;">All POIs</button>
          <button class="cv-map-filter-btn" data-cat="landmark" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🏛️ Cocoa House</button>
          <button class="cv-map-filter-btn" data-cat="police" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🚨 Police</button>
          <button class="cv-map-filter-btn" data-cat="safehouse" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🏠 Safehouse</button>
          <button class="cv-map-filter-btn" data-cat="food" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🍲 Buka</button>
          <button class="cv-map-filter-btn" data-cat="fuel" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">⛽ Petrol</button>
          <button class="cv-map-filter-btn" data-cat="transit" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">🚌 Transit</button>
        </div>
      </div>

      <!-- Active GPS Waypoint Banner -->
      <div id="cv-map-active-route" style="padding:10px 14px;background:rgba(255,215,0,0.12);border-bottom:1px solid rgba(255,215,0,0.25);display:${this.gpsWaypoint ? 'flex' : 'none'};justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;font-weight:900;color:#ffd700;letter-spacing:1px;text-transform:uppercase;">ACTIVE GPS ROUTE</div>
          <div id="cv-map-route-name" style="font-size:13px;font-weight:800;color:#fff;">${this.gpsWaypoint ? this.gpsWaypoint.name : ''}</div>
        </div>
        <button id="cv-map-route-clear" style="background:rgba(255,23,68,0.25);border:1px solid #ff1744;color:#ff5252;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;">Clear</button>
      </div>

      <!-- POI List Container -->
      <div id="cv-map-poi-list" style="flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px;"></div>
    `;

    // Map Area (Right)
    const mapArea = document.createElement('div');
    mapArea.style.cssText = 'flex:1;position:relative;background:#0c1117;display:flex;flex-direction:column;';

    const canvas = document.createElement('canvas');
    canvas.id = 'cv-town-map-canvas';
    canvas.style.cssText = 'width:100%;height:100%;display:block;cursor:crosshair;';
    mapArea.appendChild(canvas);

    // Map Legend Footer Bar
    const legend = document.createElement('div');
    legend.style.cssText = 'padding:8px 16px;background:rgba(15,22,32,0.92);border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94a3b8;flex-wrap:wrap;gap:8px;';
    legend.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#ffd700;border-radius:2px;display:inline-block;"></span> Dugbe CBD</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#ff7043;border-radius:2px;display:inline-block;"></span> Ekotedo</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#00e676;border-radius:2px;display:inline-block;"></span> Gbagi Market</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#42a5f5;border-radius:2px;display:inline-block;"></span> Railway Terminus</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;background:#ff1744;border-radius:2px;display:inline-block;"></span> Police Checkpoint</span>
      </div>
      <div style="color:#ffd700;font-weight:700;">
        💡 Click ANYWHERE on map to place a Custom GPS Waypoint
      </div>
    `;
    mapArea.appendChild(legend);

    body.appendChild(sidebar);
    body.appendChild(mapArea);

    container.appendChild(header);
    container.appendChild(body);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Filter logic
    let activeCategory = 'all';
    const renderPOIList = () => {
      const listEl = document.getElementById('cv-map-poi-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const filtered = activeCategory === 'all' ? pois : pois.filter((p) => p.cat === activeCategory);

      filtered.forEach((poi) => {
        const item = document.createElement('div');
        item.style.cssText = 'background:#161f2c;border:1px solid #243242;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:6px;transition:all 0.2s;';
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:18px;">${poi.icon}</span>
              <div>
                <div style="font-size:13px;font-weight:800;color:#fff;">${poi.name}</div>
                <div style="font-size:11px;color:#94a3b8;">${poi.district} • ${poi.desc}</div>
              </div>
            </div>
            <div style="font-size:12px;font-weight:800;color:#38bdf8;white-space:nowrap;">${poi.dist}m</div>
          </div>
          <div style="display:flex;gap:6px;margin-top:2px;">
            <button class="cv-poi-nav-btn" style="flex:1;background:rgba(255,215,0,0.18);border:1px solid #ffd700;color:#ffd700;padding:5px 8px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;">
              📍 Set GPS Waypoint
            </button>
            <button class="cv-poi-travel-btn" style="background:#0284c7;border:none;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer;">
              ⚡ Okada (₦150)
            </button>
          </div>
        `;

        item.querySelector('.cv-poi-nav-btn').addEventListener('click', () => {
          this.setGPSWaypoint(poi.pos.x, poi.pos.z, poi.name);
          const routeBox = document.getElementById('cv-map-active-route');
          const routeName = document.getElementById('cv-map-route-name');
          if (routeBox && routeName) {
            routeBox.style.display = 'flex';
            routeName.textContent = `${poi.name} (${poi.dist}m)`;
          }
          this.showShout(`GPS Waypoint set to ${poi.name}`);
        });

        item.querySelector('.cv-poi-travel-btn').addEventListener('click', () => {
          if (this.gameplay.money < 150) {
            alert('Insufficient funds! Okada ride requires ₦150.');
            return;
          }
          this.gameplay.money -= 150;
          if (this.player) {
            this.player.position.set(poi.pos.x + 1.5, 0, poi.pos.z + 1.5);
          }
          if (this.activeVehicle) {
            this.activeVehicle.position.set(poi.pos.x + 2, 0, poi.pos.z + 2);
          }
          this.closeModal();
          this.showShout(`Rode Okada express to ${poi.name}! ₦150 paid.`);
          radio.sounds?.playCash?.();
        });

        listEl.appendChild(item);
      });
    };

    renderPOIList();

    // Category button click handlers
    document.querySelectorAll('.cv-map-filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cv-map-filter-btn').forEach((b) => {
          b.style.background = '#1e293b';
          b.style.color = '#cbd5e1';
          b.style.border = '1px solid #334155';
        });
        btn.style.background = '#ffd700';
        btn.style.color = '#000';
        btn.style.border = 'none';
        activeCategory = btn.dataset.cat;
        renderPOIList();
      });
    });

    document.getElementById('cv-map-route-clear')?.addEventListener('click', () => {
      this.clearGPSWaypoint();
      const routeBox = document.getElementById('cv-map-active-route');
      if (routeBox) routeBox.style.display = 'none';
    });

    document.getElementById('cv-map-quick-police')?.addEventListener('click', () => {
      this.togglePoliceWanted();
    });

    document.getElementById('cv-map-close')?.addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });

    // Town Map Canvas Renderer
    let mapAnimId = null;
    const mapCtx = canvas.getContext('2d');

    const resizeCanvas = () => {
      const rect = mapArea.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = (rect.height - 40) * dpr;
    };
    resizeCanvas();

    // Coordinate conversion: World (-250m to +250m) to Canvas
    const worldToCanvas = (wx, wz) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.min(cw, ch) / 480; // 480m view span
      const x = cw / 2 + wx * scale;
      const y = ch / 2 + wz * scale;
      return [x, y, scale];
    };

    const canvasToWorld = (cx, cy) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.min(cw, ch) / 480;
      const wx = (cx - cw / 2) / scale;
      const wz = (cy - ch / 2) / scale;
      return [wx, wz];
    };

    // Canvas click: Set custom waypoint
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;
      const [wx, wz] = canvasToWorld(mouseX, mouseY);

      // Find nearest district name
      let locName = 'Custom Marked Location';
      for (const d of districts) {
        if (Math.hypot(d.center.x - wx, d.center.z - wz) < 60) {
          locName = `${d.name} Point`;
          break;
        }
      }

      this.setGPSWaypoint(wx, wz, locName);
      const routeBox = document.getElementById('cv-map-active-route');
      const routeName = document.getElementById('cv-map-route-name');
      if (routeBox && routeName) {
        routeBox.style.display = 'flex';
        const d = Math.round(Math.hypot(wx - playerPos.x, wz - playerPos.z));
        routeName.textContent = `${locName} (${d}m)`;
      }
      this.showShout(`GPS Waypoint placed at ${locName}`);
    });

    const drawMapFrame = () => {
      if (!this.activeModal) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const now = performance.now() * 0.001;

      mapCtx.clearRect(0, 0, cw, ch);
      mapCtx.fillStyle = '#0a0f16';
      mapCtx.fillRect(0, 0, cw, ch);

      // 1. Draw Town District Zones (Shaded Areas with Borders & Labels)
      districts.forEach((d) => {
        const [dx, dy, scale] = worldToCanvas(d.center.x, d.center.z);
        const dw = d.w * scale;
        const dh = d.h * scale;

        // Zone background
        mapCtx.fillStyle = d.bg;
        mapCtx.fillRect(dx - dw / 2, dy - dh / 2, dw, dh);

        // Zone border (dashed neon)
        mapCtx.strokeStyle = d.border;
        mapCtx.lineWidth = 1.5;
        mapCtx.setLineDash([6, 4]);
        mapCtx.strokeRect(dx - dw / 2, dy - dh / 2, dw, dh);
        mapCtx.setLineDash([]);

        // District label
        mapCtx.fillStyle = d.color;
        mapCtx.font = `bold ${Math.max(10, Math.round(13 * (cw / 700)))}px sans-serif`;
        mapCtx.textAlign = 'center';
        mapCtx.fillText(d.name.toUpperCase(), dx, dy - dh / 2 + 16);

        mapCtx.fillStyle = 'rgba(255,255,255,0.6)';
        mapCtx.font = '9px sans-serif';
        mapCtx.fillText(d.tagline, dx, dy - dh / 2 + 28);
      });

      // 2. Draw Road Network
      if (roadPts && roadPts.length) {
        mapCtx.strokeStyle = '#283544';
        mapCtx.lineWidth = 7;
        mapCtx.lineCap = 'round';
        mapCtx.lineJoin = 'round';
        mapCtx.beginPath();
        for (let i = 0; i < roadPts.length; i += 2) {
          const [cx, cy] = worldToCanvas(roadPts[i][0], roadPts[i][1]);
          mapCtx.lineTo(cx, cy);
        }
        mapCtx.stroke();

        mapCtx.strokeStyle = '#3e4f63';
        mapCtx.lineWidth = 4;
        mapCtx.beginPath();
        for (let i = 0; i < roadPts.length; i += 2) {
          const [cx, cy] = worldToCanvas(roadPts[i][0], roadPts[i][1]);
          mapCtx.lineTo(cx, cy);
        }
        mapCtx.stroke();
      }

      // 3. Draw POI Badges
      pois.forEach((poi) => {
        const [px, py] = worldToCanvas(poi.pos.x, poi.pos.z);

        // Icon pin
        mapCtx.fillStyle = poi.cat === 'police' ? '#ff1744' : poi.cat === 'landmark' ? '#ffd700' : poi.cat === 'safehouse' ? '#00e676' : '#38bdf8';
        mapCtx.beginPath();
        mapCtx.arc(px, py, 6, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.fillStyle = '#ffffff';
        mapCtx.font = 'bold 10px sans-serif';
        mapCtx.textAlign = 'center';
        mapCtx.fillText(poi.icon, px, py - 9);
      });

      // 4. Draw Active Police Pursuit Cruisers (Live Chasing)
      const policePositions = this.gameplay?.policePositions || [];
      const isRedPhase = Math.floor(now * 6) % 2 === 0;
      policePositions.forEach((cop) => {
        const [cpx, cpy] = worldToCanvas(cop.x, cop.z);

        // Dual flashing siren ring
        mapCtx.strokeStyle = isRedPhase ? '#ff1744' : '#2979ff';
        mapCtx.lineWidth = 3;
        mapCtx.beginPath();
        mapCtx.arc(cpx, cpy, 10 + Math.sin(now * 12) * 3, 0, Math.PI * 2);
        mapCtx.stroke();

        mapCtx.fillStyle = isRedPhase ? '#ff1744' : '#2979ff';
        mapCtx.beginPath();
        mapCtx.arc(cpx, cpy, 6, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.fillStyle = '#ffffff';
        mapCtx.font = 'bold 11px sans-serif';
        mapCtx.fillText('🚨 POLICE', cpx, cpy + 16);
      });

      // 5. Draw Custom GPS Waypoint & Dotted Navigation Route
      if (this.gpsWaypoint) {
        const [gpx, gpy] = worldToCanvas(this.gpsWaypoint.x, this.gpsWaypoint.z);
        const [plx, ply] = worldToCanvas(playerPos.x, playerPos.z);

        // Navigation line
        mapCtx.strokeStyle = '#ffd700';
        mapCtx.lineWidth = 2.5;
        mapCtx.setLineDash([8, 5]);
        mapCtx.beginPath();
        mapCtx.moveTo(plx, ply);
        mapCtx.lineTo(gpx, gpy);
        mapCtx.stroke();
        mapCtx.setLineDash([]);

        // Pulsing Gold Waypoint Beacon
        mapCtx.fillStyle = '#ffd700';
        mapCtx.beginPath();
        mapCtx.arc(gpx, gpy, 8 + Math.sin(now * 8) * 3, 0, Math.PI * 2);
        mapCtx.fill();

        mapCtx.fillStyle = '#ffffff';
        mapCtx.font = 'bold 12px sans-serif';
        mapCtx.fillText('🎯 ' + this.gpsWaypoint.name, gpx, gpy - 14);
      }

      // 6. Draw Player Live Position & Heading
      const [ppx, ppy] = worldToCanvas(playerPos.x, playerPos.z);
      mapCtx.fillStyle = 'rgba(255,255,255,0.25)';
      mapCtx.beginPath();
      mapCtx.arc(ppx, ppy, 14, 0, Math.PI * 2);
      mapCtx.fill();

      mapCtx.fillStyle = '#ffffff';
      mapCtx.beginPath();
      mapCtx.arc(ppx, ppy, 6, 0, Math.PI * 2);
      mapCtx.fill();
      mapCtx.strokeStyle = '#00e5ff';
      mapCtx.lineWidth = 2;
      mapCtx.stroke();

      mapCtx.fillStyle = '#00e5ff';
      mapCtx.font = 'bold 11px sans-serif';
      mapCtx.fillText('YOU', ppx, ppy + 18);

      mapAnimId = requestAnimationFrame(drawMapFrame);
    };

    mapAnimId = requestAnimationFrame(drawMapFrame);
  }

  // ---------- MODALS ----------
  closeModal() {
    if (this.activeModal) {
      this.activeModal.remove();
      this.activeModal = null;
    }
  }

  createModalBase(title, contentHtml) {
    this.closeModal();
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;pointer-events:auto;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#161d26;border:1px solid rgba(255,255,255,0.14);border-radius:18px;max-width:480px;width:90%;color:#fff;padding:24px;box-shadow:0 16px 40px rgba(0,0,0,0.7);position:relative;max-height:85vh;overflow-y:auto;';

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <h2 style="margin:0;font-size:20px;font-weight:800;color:#fbc02d;letter-spacing:0.3px;">${title}</h2>
        <button id="cv-modal-close" style="background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;line-height:1;padding:4px 8px;">✕</button>
      </div>
      <div>${contentHtml}</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    document.getElementById('cv-modal-close').addEventListener('click', () => this.closeModal());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    return modal;
  }

  // 1. BUKA AMALA FOOD MENU MODAL
  openBukaModal(bukaName) {
    const html = `
      <p style="color:#ccc;font-size:13px;margin-bottom:16px;">Welcome to <b>${bukaName}</b>! Piping hot authentic dishes prepared with rich local spices. Choose your meal to refill your energy:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="cv-buka-item" data-idx="0" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#202934;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:left;">
          <div>
            <div style="font-weight:700;font-size:14px;color:#ffb74d;">🍲 Amala + Ewedu + Gbegiri + Ogunfe</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Special Goat Meat & Abula combo (+50% Energy)</div>
          </div>
          <div style="font-weight:800;color:#81c784;font-size:15px;">₦800</div>
        </button>

        <button class="cv-buka-item" data-idx="1" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#202934;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:left;">
          <div>
            <div style="font-weight:700;font-size:14px;color:#ffb74d;">🍛 Jollof Rice + Dodo (Fried Plantain) + Beef</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Classic party-style smoky Jollof (+40% Energy)</div>
          </div>
          <div style="font-weight:800;color:#81c784;font-size:15px;">₦700</div>
        </button>

        <button class="cv-buka-item" data-idx="2" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#202934;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:left;">
          <div>
            <div style="font-weight:700;font-size:14px;color:#ffb74d;">🍾 Chilled Bottle of Maltina / Minerals</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Ice-cold refreshing beverage (+25% Energy)</div>
          </div>
          <div style="font-weight:800;color:#81c784;font-size:15px;">₦300</div>
        </button>
      </div>
      <div id="cv-buka-res" style="margin-top:12px;font-size:13px;text-align:center;font-weight:700;"></div>
    `;
    this.createModalBase('Iya Moria Amala Buka', html);

    document.querySelectorAll('.cv-buka-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        const res = this.gameplay.eatMeal(idx);
        const msgEl = document.getElementById('cv-buka-res');
        msgEl.textContent = res.msg;
        msgEl.style.color = res.success ? '#81c784' : '#ef5350';
        if (res.success) {
          setTimeout(() => this.closeModal(), 1200);
        }
      });
    });
  }

  // 2. REAL ESTATE INSPECTION MODAL
  openPropertyModal(prop) {
    const html = `
      <div style="background:#0f172a;border-radius:10px;padding:12px;margin-bottom:16px;">
        <div style="font-size:16px;font-weight:800;color:#fff;">${prop.name}</div>
        <div style="font-size:12px;color:#38bdf8;margin-top:2px;text-transform:uppercase;font-weight:700;">${prop.type}</div>
        <p style="font-size:13px;color:#cbd5e1;margin-top:8px;line-height:1.4;">${prop.desc}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div style="background:#1e293b;padding:10px;border-radius:8px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Daily Rent</div>
          <div style="font-size:16px;font-weight:800;color:#fca5a5;margin-top:2px;">₦${prop.rent.toLocaleString()} / day</div>
        </div>
        <div style="background:#1e293b;padding:10px;border-radius:8px;">
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Full Outright Purchase</div>
          <div style="font-size:16px;font-weight:800;color:#86efac;margin-top:2px;">₦${prop.price.toLocaleString()}</div>
        </div>
      </div>

      ${prop.dailyIncome > 0 ? `
        <div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);padding:10px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#86efac;">
          <b>💰 Tenant Return:</b> Owning this property yields <b>₦${prop.dailyIncome.toLocaleString()}</b> every morning in passive rental profit!
        </div>
      ` : ''}

      <div id="cv-prop-action">
        ${prop.owned ? `
          <div style="background:#15803d;color:#fff;text-align:center;padding:12px;border-radius:10px;font-weight:800;">
            ✓ YOU OWN THIS PROPERTY
          </div>
        ` : `
          <button id="cv-btn-buy-prop" style="width:100%;background:#16a34a;color:#fff;border:none;padding:12px;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;">
            Purchase Property for ₦${prop.price.toLocaleString()}
          </button>
        `}
      </div>
      <div id="cv-prop-msg" style="margin-top:10px;text-align:center;font-weight:700;font-size:13px;"></div>
    `;
    this.createModalBase('Real Estate Inspection', html);

    const buyBtn = document.getElementById('cv-btn-buy-prop');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const res = this.gameplay.buyProperty(prop.id);
        const msgEl = document.getElementById('cv-prop-msg');
        msgEl.textContent = res.msg;
        msgEl.style.color = res.success ? '#86efac' : '#f87171';
        if (res.success) {
          setTimeout(() => this.closeModal(), 1500);
        }
      });
    }
  }

  // 3. SAFEHOUSE BEDROOM SLEEP MODAL (Advance Time)
  openSleepModal() {
    const html = `
      <p style="color:#ccc;font-size:13px;margin-bottom:16px;">Rest on your bed to fully recover your stamina (100%), advance the game day, and collect any rental income from your properties.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="cv-sleep-btn" data-time="7" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:center;">
          <div style="font-size:20px;">🌅</div>
          <div style="font-weight:700;font-size:14px;margin-top:4px;">Morning</div>
          <div style="font-size:11px;color:#94a3b8;">07:00 AM</div>
        </button>

        <button class="cv-sleep-btn" data-time="13" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:center;">
          <div style="font-size:20px;">☀️</div>
          <div style="font-weight:700;font-size:14px;margin-top:4px;">Afternoon</div>
          <div style="font-size:11px;color:#94a3b8;">01:00 PM</div>
        </button>

        <button class="cv-sleep-btn" data-time="17.5" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:center;">
          <div style="font-size:20px;">🌇</div>
          <div style="font-weight:700;font-size:14px;margin-top:4px;">Sunset</div>
          <div style="font-size:11px;color:#94a3b8;">05:30 PM</div>
        </button>

        <button class="cv-sleep-btn" data-time="21" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:#fff;cursor:pointer;text-align:center;">
          <div style="font-size:20px;">🌙</div>
          <div style="font-weight:700;font-size:14px;margin-top:4px;">Night</div>
          <div style="font-size:11px;color:#94a3b8;">09:00 PM</div>
        </button>
      </div>
    `;
    this.createModalBase('Safehouse Bedroom - Sleep', html);

    document.querySelectorAll('.cv-sleep-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hour = Number(btn.dataset.time);
        this.gameplay.sleepTo(hour);
        this.closeModal();
      });
    });
  }

  // 4. JOBS SELECTION MODAL
  openJobsModal() {
    const html = `
      <p style="color:#ccc;font-size:13px;margin-bottom:16px;">Earn ₦ Naira by taking on urban transport and commercial supply jobs around Ibadan:</p>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button id="cv-start-passenger" style="background:#1e293b;border:1px solid #00bcd4;border-radius:12px;padding:14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:15px;color:#00e5ff;">🚖 "Along Dugbe!" Passenger Route</div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Pull up to bus stops, pick up waiting passengers, and transport them to their destination before the timer runs out.</div>
          <div style="font-size:11px;color:#81c784;font-weight:700;margin-top:6px;">Reward: ₦300 - ₦700 per passenger</div>
        </button>

        <button id="cv-start-cargo" style="background:#1e293b;border:1px solid #ffa726;border-radius:12px;padding:14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:15px;color:#ffb74d;">📦 Dugbe Market Goods Delivery</div>
          <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Load crates of drinks, yam tubers, or provisions in the Suzuki Carry and deliver them to roadside shops without heavy crashes.</div>
          <div style="font-size:11px;color:#81c784;font-weight:700;margin-top:6px;">Reward: ₦1,800 - ₦3,000 per delivery</div>
        </button>
      </div>
    `;
    this.createModalBase('Dugbe Dispatch - Available Jobs', html);

    document.getElementById('cv-start-passenger').addEventListener('click', () => {
      this.gameplay.startPassengerJob();
      this.closeModal();
    });

    document.getElementById('cv-start-cargo').addEventListener('click', () => {
      this.gameplay.startCargoJob();
      this.closeModal();
    });
  }

  // 5. HELP & CONTROLS MODAL
  toggleHelpModal() {
    if (this.activeModal) this.closeModal();
    else this.openHelpModal();
  }

  openHelpModal() {
    const html = `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
        <div style="background:#1e293b;padding:10px 14px;border-radius:8px;">
          <b style="color:#ffcc00;">Movement:</b> W / A / S / D • Shift to Run • Space to Jump
        </div>
        <div style="background:#1e293b;padding:10px 14px;border-radius:8px;">
          <b style="color:#ffcc00;">Vehicle:</b> E = Enter / Exit • Space = Handbrake • H = Honk Horn • R = Flip Car
        </div>
        <div style="background:#1e293b;padding:10px 14px;border-radius:8px;">
          <b style="color:#ffcc00;">Camera:</b> Mouse Look (Click canvas to lock) • Mouse Wheel = Zoom
        </div>
        <div style="background:#1e293b;padding:10px 14px;border-radius:8px;">
          <b style="color:#ffcc00;">Housing & Living:</b>
          <div style="margin-top:4px;color:#cbd5e1;line-height:1.4;">
            • Walk to <b>Cocoa View Apartments</b> (green radar dot) and press <b>E</b> to enter your rented parlor with spinning fan & balcony.<br>
            • Press <b>E</b> at bed to sleep & choose Morning, Afternoon, Sunset, or Night.<br>
            • Press <b>E</b> at <b>Iya Moria Buka</b> to eat Amala & Ewedu to refill energy.<br>
            • Inspect <b>To Let / For Sale</b> signs on compounds to buy property and earn daily rent.
          </div>
        </div>
      </div>
    `;
    this.createModalBase('CityVerse Guide & Controls', html);
  }

  // 6. POLICE / VIO CHECKPOINT STOP-AND-SEARCH MODAL
  openPoliceModal(checkpoint, streetLife) {
    const html = `
      <div style="background:#0c1a2e;border:1px solid #1e3a8a;border-radius:12px;padding:14px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:26px;">👮‍♂️</span>
          <div>
            <div style="font-weight:900;font-size:15px;color:#60a5fa;letter-spacing:0.5px;">NIGERIA POLICE & VIO PATROL</div>
            <div style="font-size:11px;color:#93c5fd;">Dugbe Central Highway Checkpoint</div>
          </div>
        </div>
        <div style="background:rgba(0,0,0,0.35);border-radius:8px;padding:10px 12px;margin-top:10px;font-size:13px;line-height:1.45;color:#e2e8f0;font-style:italic;">
          "Oga driver! Pull over here! Engine off! Wetin you carry inside motor? Where your driver's license, insurance, roadworthiness, and fire extinguisher?!"
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <button class="cv-police-action" data-action="particulars" style="background:#1e293b;border:1px solid #3b82f6;border-radius:10px;padding:12px 14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:14px;color:#93c5fd;">📄 Present Complete Vehicle Particulars</div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Show valid vehicle registration, insurance & driver's license (Legal & Clean • ₦0)</div>
        </button>

        <button class="cv-police-action" data-action="settle" style="background:#1e293b;border:1px solid #eab308;border-radius:10px;padding:12px 14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:14px;color:#fde047;">💸 Settle Officer With ₦500 ("Weekend Pure Water")</div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">"Officer, weekend something for the boys" (Quick clearance • Cost: ₦500)</div>
        </button>

        <button class="cv-police-action" data-action="banter" style="background:#1e293b;border:1px solid #a855f7;border-radius:10px;padding:12px 14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:14px;color:#d8b4fe;">🗣️ Sweet-Talk / Banter ("Emergency at UCH!")</div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">"Officer, na emergency, my wife dey labour ward for UCH Ibadan!" (75% free pass, 25% fine)</div>
        </button>

        <button class="cv-police-action" data-action="zoom" style="background:#1e293b;border:1px solid #ef4444;border-radius:10px;padding:12px 14px;color:#fff;text-align:left;cursor:pointer;">
          <div style="font-weight:800;font-size:14px;color:#fca5a5;">🚨 Zoom Away Fast! (Run the barrier)</div>
          <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">Step on the gas and dodge the inspection (Police sirens & thrilling escape!)</div>
        </button>
      </div>

      <div id="cv-police-res" style="display:none;margin-top:14px;padding:12px;border-radius:10px;background:#0f172a;border:1px solid #334155;">
        <div id="cv-police-title" style="font-weight:800;font-size:14px;"></div>
        <div id="cv-police-reply" style="font-size:13px;color:#cbd5e1;margin-top:4px;line-height:1.4;"></div>
      </div>
    `;
    this.createModalBase('Police & VIO Checkpoint', html);

    document.querySelectorAll('.cv-police-action').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const res = streetLife.inspectCheckpoint(action);

        const resBox = document.getElementById('cv-police-res');
        const titleEl = document.getElementById('cv-police-title');
        const replyEl = document.getElementById('cv-police-reply');

        resBox.style.display = 'block';
        titleEl.textContent = `${res.officer}: ${res.title}`;
        titleEl.style.color = res.success ? '#4ade80' : '#f87171';
        replyEl.textContent = res.reply;

        // Disable buttons to avoid multiple clicks
        document.querySelectorAll('.cv-police-action').forEach((b) => (b.style.pointerEvents = 'none'));

        setTimeout(() => this.closeModal(), 2800);
      });
    });
  }

  // 7. ROADSIDE HAWKER PURCHASE MODAL
  openHawkerModal(hawker, streetLife) {
    const html = `
      <div style="background:#1e293b;border-radius:10px;padding:14px;margin-bottom:14px;text-align:center;">
        <div style="font-size:28px;">🍢</div>
        <div style="font-size:17px;font-weight:800;color:#ffb74d;margin-top:4px;">${hawker.name}</div>
        <div style="font-size:13px;color:#cbd5e1;margin-top:6px;font-style:italic;">${hawker.quote}</div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;background:#0f172a;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
        <div>
          <div style="font-size:14px;font-weight:800;color:#fff;">${hawker.item}</div>
          <div style="font-size:12px;color:#81c784;margin-top:2px;">+${hawker.energy}% Energy boost</div>
        </div>
        <div style="font-size:18px;font-weight:900;color:#81c784;">₦${hawker.cost}</div>
      </div>

      <button id="cv-btn-buy-hawker" style="width:100%;background:#16a34a;color:#fff;border:none;padding:13px;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;">
        Buy for ₦${hawker.cost}
      </button>
      <div id="cv-hawker-msg" style="margin-top:10px;text-align:center;font-weight:700;font-size:13px;"></div>
    `;
    this.createModalBase('Roadside Hawker', html);

    document.getElementById('cv-btn-buy-hawker').addEventListener('click', () => {
      const res = streetLife.buyFromHawker(hawker);
      const msg = document.getElementById('cv-hawker-msg');
      msg.textContent = res.msg;
      msg.style.color = res.success ? '#86efac' : '#f87171';
      if (res.success) {
        setTimeout(() => this.closeModal(), 1200);
      }
    });
  }

  // 8. PETROL FILLING STATION REFUEL MODAL
  openFuelModal(fillingStation, streetLife, vehicle) {
    const cost = 3500;
    const html = `
      <div style="background:#0d47a1;border-radius:10px;padding:14px;margin-bottom:14px;color:#fff;text-align:center;">
        <div style="font-size:26px;">⛽</div>
        <div style="font-size:18px;font-weight:900;margin-top:4px;">${fillingStation.name}</div>
        <div style="font-size:12px;color:#bbdefb;margin-top:2px;">Premium Motor Spirit (PMS) • Dugbe Forecourt</div>
        <div style="font-size:22px;font-weight:900;color:#00e676;margin-top:8px;">₦750 / Litre</div>
      </div>

      <div style="background:#1e293b;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:13px;color:#cbd5e1;">Fill tank of <b>${vehicle ? vehicle.T.name : 'your vehicle'}</b> to full capacity. Guaranteed zero fuel interruptions.</div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px;">
          <span style="color:#aaa;">Refuel Cost:</span>
          <span style="color:#81c784;font-weight:800;font-size:15px;">₦${cost.toLocaleString()}</span>
        </div>
      </div>

      <button id="cv-btn-refuel" style="width:100%;background:#0284c7;color:#fff;border:none;padding:13px;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;">
        Fill Vehicle Tank (₦${cost.toLocaleString()})
      </button>
      <div id="cv-fuel-msg" style="margin-top:10px;text-align:center;font-weight:700;font-size:13px;"></div>
    `;
    this.createModalBase('Dugbe Petrol Station', html);

    document.getElementById('cv-btn-refuel').addEventListener('click', () => {
      const res = streetLife.refuelVehicle(vehicle);
      const msg = document.getElementById('cv-fuel-msg');
      msg.textContent = res.msg;
      msg.style.color = res.success ? '#86efac' : '#f87171';
      if (res.success) {
        setTimeout(() => this.closeModal(), 1400);
      }
    });
  }
}
