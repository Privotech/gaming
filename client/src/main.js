import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Physics, Vehicle } from './vehicles.js';
import { sounds, radio } from './audio.js';
import { HousingManager } from './housing.js';
import { GameplayManager } from './gameplay.js';
import { UIManager } from './ui.js';
import { PedestrianManager } from './pedestrians.js';
import { TrafficManager } from './traffic.js';
import { StreetLifeManager } from './streetLife.js';
import { PoliceManager } from './police.js';
import './style.css';

// ============================================================
// CITYVERSE NG  |  Ibadan open-world simulation
// ============================================================

// Debug toggles in the URL, e.g. localhost:3000/?lamps=0&vehicles=1&shadows=0
const P = new URLSearchParams(location.search);

// ---------- CONFIG ----------
const CENTER = { lat: 7.3962, lon: 3.8968 }; // Dugbe / Cocoa House area
const RADIUS = 450;                          // metres around CENTER to load
const LAMP_URL = '/assets/models/street-lamp/street_lamp_01.glb';
const LAMP_SCALE = 2;
const LAMP_MAX = Number(P.get('lamps') ?? 8);
const PLAYER_MODEL_URL = '/assets/models/characters/player.glb';
const PLAYER_HEIGHT = 1.75;
const WALK_SPEED = 2.2, WALK_ANIM_SPEED = 1.58;
const RUN_SPEED = 5.0, RUN_ANIM_SPEED = 4.1;
const USE_JUMP_CLIP = true;
const ANIM_DIR = '/assets/models/characters/anims/';

// ---------- Local projection (lat/lon -> metres) ----------
const M_LON = 111320, M_LAT = 110540;
const cosLat = Math.cos((CENTER.lat * Math.PI) / 180);
const project = (lat, lon) => [(lon - CENTER.lon) * M_LON * cosLat, -(lat - CENTER.lat) * M_LAT]; // [x, z]
const dLat = RADIUS / M_LAT;
const dLon = RADIUS / (M_LON * cosLat);

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Add ?low to the URL (e.g. localhost:5173/?low) to test with cheaper graphics
const LOW = new URLSearchParams(location.search).has('low');

// ---------- HUD ----------
const hud = document.createElement('div');
hud.style.cssText = 'position:fixed;top:10px;left:10px;z-index:10;font:12px/1.4 monospace;color:#fff;background:rgba(0,0,0,.45);padding:8px 10px;border-radius:6px;pointer-events:none;white-space:pre';
document.body.appendChild(hud);
const status = document.createElement('div');
status.style.cssText = 'position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:#1b1410;color:#f1e3d0;font:18px sans-serif;text-align:center;padding:24px';
status.textContent = 'Loading Ibadan...';
document.body.appendChild(status);
const setStatus = (msg) => { status.textContent = msg; };
const hideStatus = () => status.remove();

// ---------- Renderer / scene / camera ----------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc7cfd6, 150, 800);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 6000);

const renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(LOW ? 1 : Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.45;
const SHADOWS = !LOW && P.get('shadows') !== '0';
renderer.shadowMap.enabled = SHADOWS;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- Sky + lighting ----------
const sky = new Sky();
sky.scale.setScalar(5000);
scene.add(sky);
const su = sky.material.uniforms;
su.turbidity.value = 9;
su.rayleigh.value = 2;
su.mieCoefficient.value = 0.006;
su.mieDirectionalG.value = 0.85;

const sunDir = new THREE.Vector3().setFromSphericalCoords(
  1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(150)
);
su.sunPosition.value.copy(sunDir);

// Image-based lighting generated from the sky: gives metal roofs and skin real reflections/ambient light
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(sky);
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.environmentIntensity = 0.2;
  scene.add(sky);
}
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x8a5a3c, 0.25));
const sun = new THREE.DirectionalLight(0xfff1dc, 4);
sun.castShadow = SHADOWS;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.5;
scene.add(sun, sun.target);

// ---------- Procedural textures (replace with Poly Haven / ambientCG PBR later) ----------
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = LOW ? 1 : 4;
  if (repeat) tex.repeat.set(repeat, repeat);
  return tex;
}
const noiseRand = mulberry32(7);

// High-resolution "Brown Roofs of Ibadan" Rusted Corrugated Zinc
const zincTex = canvasTex(512, (g, s) => {
  // Base oxidized galvanized metal / dark rust undertone
  g.fillStyle = '#5c331f'; g.fillRect(0, 0, s, s);

  // Realistic Corrugation sine wave simulation
  const waveW = 16;
  for (let x = 0; x < s; x += waveW) {
    // Ridge highlight (metallic sheen where sunlight strikes the peak)
    const crestGrad = g.createLinearGradient(x, 0, x + waveW, 0);
    crestGrad.addColorStop(0, 'rgba(40,20,10,0.5)');
    crestGrad.addColorStop(0.3, 'rgba(160,95,50,0.35)');
    crestGrad.addColorStop(0.5, 'rgba(230,170,120,0.45)'); // bright ridge peak
    crestGrad.addColorStop(0.7, 'rgba(120,65,30,0.3)');
    crestGrad.addColorStop(1, 'rgba(30,15,8,0.55)');      // shadow trough
    g.fillStyle = crestGrad;
    g.fillRect(x, 0, waveW, s);
  }

  // Multi-toned rust patches (Burnt umber, raw sienna, vibrant orange-red rust)
  for (let i = 0; i < 1800; i++) {
    const rx = noiseRand() * s, ry = noiseRand() * s;
    const rw = 4 + noiseRand() * 32, rh = 6 + noiseRand() * 50;
    const rType = noiseRand();
    let col = 'rgba(110,45,18,0.25)';
    if (rType < 0.4) col = `rgba(${130 + noiseRand() * 80},${45 + noiseRand() * 35},15,${0.2 + noiseRand() * 0.35})`; // rich orange rust
    else if (rType < 0.7) col = `rgba(${70 + noiseRand() * 40},${30 + noiseRand() * 20},10,${0.3 + noiseRand() * 0.35})`; // dark crusty rust
    else col = `rgba(${110 + noiseRand() * 40},${115 + noiseRand() * 40},${120 + noiseRand() * 40},${0.15 + noiseRand() * 0.25})`; // weathered zinc sheen
    g.fillStyle = col;
    g.fillRect(rx, ry, rw, rh);
  }

  // Rainwater rust streaks bleeding down the corrugation channels
  for (let x = 0; x < s; x += 32) {
    if (noiseRand() > 0.4) {
      const bleedGrad = g.createLinearGradient(0, 0, 0, s);
      bleedGrad.addColorStop(0, 'rgba(70,25,10,0.6)');
      bleedGrad.addColorStop(0.6, 'rgba(120,50,20,0.3)');
      bleedGrad.addColorStop(1, 'rgba(40,15,5,0.1)');
      g.fillStyle = bleedGrad;
      g.fillRect(x + 2, 0, 5, s);
    }
  }
}, 0.35);

// Realistic Tropical Plaster / Stucco Wall with block joints and water stains
const wallTex = canvasTex(512, (g, s) => {
  // Base weathered plaster
  g.fillStyle = '#ded5c5'; g.fillRect(0, 0, s, s);

  // Subtle horizontal concrete block coursing lines (every 32px)
  g.strokeStyle = 'rgba(80,65,50,0.18)';
  g.lineWidth = 2;
  for (let y = 0; y < s; y += 32) {
    g.beginPath();
    g.moveTo(0, y); g.lineTo(s, y);
    g.stroke();
    // Vertical mortar joints staggered
    const offset = (y / 32) % 2 === 0 ? 0 : 32;
    for (let x = offset; x < s; x += 64) {
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x, y + 32);
      g.stroke();
    }
  }

  // Plaster stipple texture & weathering grain
  for (let i = 0; i < 4000; i++) {
    const v = 80 + noiseRand() * 60;
    g.fillStyle = `rgba(${v},${v * 0.92},${v * 0.8},${0.08 + noiseRand() * 0.16})`;
    g.fillRect(noiseRand() * s, noiseRand() * s, 1 + noiseRand() * 4, 1 + noiseRand() * 4);
  }

  // Vertical water drip wash stains (rain runoff from roof eaves)
  for (let x = 8; x < s; x += 24) {
    if (noiseRand() > 0.45) {
      const grad = g.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, 'rgba(70,55,40,0.35)');
      grad.addColorStop(0.4, 'rgba(90,75,60,0.18)');
      grad.addColorStop(1, 'rgba(60,50,40,0.02)');
      g.fillStyle = grad;
      g.fillRect(x, 0, 8 + noiseRand() * 12, s);
    }
  }

  // Ground dampness / mold plinth band at base
  const baseGrad = g.createLinearGradient(0, s - 60, 0, s);
  baseGrad.addColorStop(0, 'rgba(60,50,40,0)');
  baseGrad.addColorStop(1, 'rgba(50,40,30,0.45)');
  g.fillStyle = baseGrad;
  g.fillRect(0, s - 60, s, 60);
}, 0.2);

// Rich African Red Laterite Soil Ground Texture
const groundTex = canvasTex(512, (g, s) => {
  // Rich red clay / laterite earth base
  g.fillStyle = '#8f462a'; g.fillRect(0, 0, s, s);

  // Varied earth tonal patches (ochre to deep terracotta)
  for (let i = 0; i < 200; i++) {
    const rx = noiseRand() * s, ry = noiseRand() * s, r = 20 + noiseRand() * 70;
    const col = noiseRand() > 0.5 ? 'rgba(165,75,40,0.22)' : 'rgba(105,45,25,0.25)';
    g.fillStyle = col;
    g.beginPath();
    g.arc(rx, ry, r, 0, Math.PI * 2);
    g.fill();
  }

  // Soil pebbles, gravel, and dry dirt specks
  for (let i = 0; i < 7000; i++) {
    const v = noiseRand();
    let col = `rgba(${120 + v * 90},${50 + v * 40},${25 + v * 20},${0.15 + v * 0.35})`;
    if (v < 0.15) col = `rgba(50,30,20,0.5)`; // dark pebble
    else if (v > 0.85) col = `rgba(210,140,90,0.4)`; // dry sand grain
    g.fillStyle = col;
    g.fillRect(noiseRand() * s, noiseRand() * s, 1 + noiseRand() * 3, 1 + noiseRand() * 3);
  }
}, 1);
groundTex.repeat.set(160, 160);

// Bituminous Asphalt Road Texture with aggregate grain and tire wear
const asphaltTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#323438'; g.fillRect(0, 0, s, s);

  // Longitudinal tire tracks wear lines
  for (let y = 0; y < s; y += 4) {
    const w = 35 + noiseRand() * 30;
    g.fillStyle = `rgba(${w},${w},${w + 4},0.2)`;
    g.fillRect(0, y, s, 2);
  }

  // Stone aggregate grain
  for (let i = 0; i < 8000; i++) {
    const v = 45 + noiseRand() * 65;
    g.fillStyle = `rgba(${v},${v + 2},${v + 6},${0.12 + noiseRand() * 0.32})`;
    g.fillRect(noiseRand() * s, noiseRand() * s, 1 + noiseRand() * 2, 1 + noiseRand() * 2);
  }

  // Subtle tar cracks
  g.strokeStyle = 'rgba(20,20,22,0.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    let cx = noiseRand() * s, cy = noiseRand() * s;
    g.beginPath();
    g.moveTo(cx, cy);
    for (let k = 0; k < 6; k++) {
      cx += (noiseRand() - 0.5) * 40;
      cy += (noiseRand() - 0.5) * 40;
      g.lineTo(cx, cy);
    }
    g.stroke();
  }
}, 0.25);

const texLoader = new THREE.TextureLoader();
function applyPBR(mat, dir, tile, uvSize = 1) {
  const load = (file, srgb, assign) =>
    texLoader.load(`/assets/textures/${dir}/${file}`, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(uvSize / tile, uvSize / tile);
      t.anisotropy = LOW ? 1 : 4;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      assign(t);
      mat.needsUpdate = true;
    }, undefined, () => {});
  load('color.jpg', true, (t) => { mat.map = t; });
  load('normal.jpg', false, (t) => { mat.normalMap = t; });
  load('roughness.jpg', false, (t) => { mat.roughnessMap = t; mat.roughness = 1; });
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(3000, 3000),
  new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.95, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
applyPBR(ground.material, 'ground', 3, 3000);

// ---------- OSM loading ----------
// Order: 1) local file public/data/district.json (fast, reliable)  2) live Overpass (often busy)
async function loadOSM() {
  setStatus('Loading map data...');
  try {
    const r = await fetch('/data/district.json');
    if ((r.headers.get('content-type') || '').includes('json')) return await r.json();
  } catch (_) {}

  const key = `cv-osm-v1-${CENTER.lat}-${CENTER.lon}-${RADIUS}`;
  try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch (_) {}

  const s = CENTER.lat - dLat, n = CENTER.lat + dLat, w = CENTER.lon - dLon, e = CENTER.lon + dLon;
  const q = `[out:json][timeout:60];(way["building"](${s},${w},${n},${e});way["highway"](${s},${w},${n},${e}););out geom;`;

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      setStatus(`Downloading map data (try ${attempt}/3)... For reliability, run: node scripts/fetch-osm.mjs`);
      const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      try { localStorage.setItem(key, JSON.stringify(json)); } catch (_) {}
      return json;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
  throw lastErr;
}

// ---------- Buildings ----------
const footprints = [];            // for collision
const CELL = 50;
const grid = new Map();
const cellKey = (x, z) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

function inPoly(x, z, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function blockedPoint(x, z) {
  const list = grid.get(cellKey(x, z));
  if (!list) return false;
  for (const f of list) {
    if (x < f.minX || x > f.maxX || z < f.minZ || z > f.maxZ) continue;
    if (inPoly(x, z, f.pts)) return true;
  }
  return false;
}
function isBlockedByVehicle(x, z) {
  // 1. Check parked/idle player vehicles
  if (vehicles && vehicles.length) {
    for (const v of vehicles) {
      if (driving === v) continue;
      const vp = v.position;
      const dx = x - vp.x, dz = z - vp.z;
      const distSq = dx * dx + dz * dz;
      const vR = (v.T?.hl || 2.4) + PR;
      if (distSq < vR * vR) {
        const cos = Math.cos(v.heading), sin = Math.sin(v.heading);
        const lx = Math.abs(dx * cos - dz * sin);
        const lz = Math.abs(dx * sin + dz * cos);
        if (lx < (v.T?.hw || 1.0) + PR && lz < (v.T?.hl || 2.0) + PR) {
          return true;
        }
      }
    }
  }

  // 2. Check moving or stopped traffic vehicles
  if (traffic && traffic.vehicles && traffic.vehicles.length) {
    for (const tv of traffic.vehicles) {
      if (!tv.mesh) continue;
      const tp = tv.mesh.position;
      const dx = x - tp.x, dz = z - tp.z;
      const distSq = dx * dx + dz * dz;
      const tLen = (tv.vehLength || 3.0) / 2 + PR;
      const tWid = 1.05 + PR;
      if (distSq < (tLen + 0.6) * (tLen + 0.6)) {
        const cos = Math.cos(tv.mesh.rotation.y), sin = Math.sin(tv.mesh.rotation.y);
        const lx = Math.abs(dx * cos - dz * sin);
        const lz = Math.abs(dx * sin + dz * cos);
        if (lx < tWid && lz < tLen) {
          return true;
        }
      }
    }
  }

  return false;
}

const PR = 0.45; // player radius
const blocked = (x, z) =>
  isBlockedByVehicle(x, z) ||
  blockedPoint(x, z) || blockedPoint(x + PR, z) || blockedPoint(x - PR, z) ||
  blockedPoint(x, z + PR) || blockedPoint(x, z - PR);

function sliceGroup(geo, g, tint) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = geo.attributes[name];
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(g.start * a.itemSize, (g.start + g.count) * a.itemSize), a.itemSize));
  }
  const n = g.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = tint.r; col[i * 3 + 1] = tint.g; col[i * 3 + 2] = tint.b; }
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// ---------- Pitched (gable) roofs ----------
const polyArea = (pts) => {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return a / 2;
};

function pushTri(pos, uv, p, q, r, uvp, uvq, uvr, want) {
  const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2];
  const vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  if (nx * want[0] + ny * want[1] + nz * want[2] < 0) { [q, r] = [r, q]; [uvq, uvr] = [uvr, uvq]; }
  pos.push(...p, ...q, ...r);
  uv.push(...uvp, ...uvq, ...uvr);
}

function geoFrom(pos, uv, tint) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const col = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) { col[i] = tint.r; col[i + 1] = tint.g; col[i + 2] = tint.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// Returns { roof, gable } geometries, or null if the footprint is not roughly rectangular
function gableRoof(pts, h, roofTint, wallTint) {
  const n = pts.length;
  let best = 0, ang = 0;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % n];
    const l = Math.hypot(x1 - x0, z1 - z0);
    if (l > best) { best = l; ang = Math.atan2(z1 - z0, x1 - x0); }
  }
  const c = Math.cos(ang), s = Math.sin(ang);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, z] of pts) {
    const u = x * c + z * s, v = -x * s + z * c;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const du = u1 - u0, dv = v1 - v0;
  const area = Math.abs(polyArea(pts));
  if (area < 14 || area > 500 || area / (du * dv) < 0.78) return null;

  // ridge runs along the longer side
  let ea, eb, a0, a1, b0, b1;
  if (du >= dv) { ea = [c, s]; eb = [-s, c]; a0 = u0; a1 = u1; b0 = v0; b1 = v1; }
  else { ea = [-s, c]; eb = [c, s]; a0 = v0; a1 = v1; b0 = u0; b1 = u1; }
  const P = (a, b, y) => [ea[0] * a + eb[0] * b, y, ea[1] * a + eb[1] * b];

  const o = 0.3;                                   // eave overhang
  const A0 = a0 - o, A1 = a1 + o, B0 = b0 - o, B1 = b1 + o, bm = (b0 + b1) / 2;
  const rise = THREE.MathUtils.clamp((b1 - b0) * 0.25, 0.7, 2.2);
  const slope = Math.hypot((B1 - B0) / 2, rise);
  const up = [0, 1, 0];

  const rp = [], ru = [];
  // two roof slopes (uv: along ridge, down the slope -> corrugation runs downhill)
  for (const Bedge of [B0, B1]) {
    const e0 = P(A0, Bedge, h), e1 = P(A1, Bedge, h), r1 = P(A1, bm, h + rise), r0 = P(A0, bm, h + rise);
    pushTri(rp, ru, e0, e1, r1, [A0, 0], [A1, 0], [A1, slope], up);
    pushTri(rp, ru, e0, r1, r0, [A0, 0], [A1, slope], [A0, slope], up);
  }
  // gable end triangles (wall material)
  const gp = [], gu = [];
  for (const [a, sgn] of [[a0, -1], [a1, 1]]) {
    pushTri(gp, gu, P(a, b0, h), P(a, b1, h), P(a, bm, h + rise), [b0, h], [b1, h], [bm, h + rise], [sgn * ea[0], 0, sgn * ea[1]]);
  }

  // 3D Overhanging Eave Fascia Boards & Ridge Cap
  const fp = [], fu = [];
  for (const Bedge of [B0, B1]) {
    const e0 = P(A0, Bedge, h), e1 = P(A1, Bedge, h);
    const f0 = P(A0, Bedge, h - 0.22), f1 = P(A1, Bedge, h - 0.22);
    pushTri(fp, fu, e0, e1, f1, [0, 0], [1, 0], [1, 1], up);
    pushTri(fp, fu, e0, f1, f0, [0, 0], [1, 1], [0, 1], up);
  }
  // Ridge Cap along peak
  const rcap0 = P(A0, bm, h + rise + 0.08), rcap1 = P(A1, bm, h + rise + 0.08);
  const rcapL0 = P(A0, bm - 0.18, h + rise - 0.05), rcapL1 = P(A1, bm - 0.18, h + rise - 0.05);
  const rcapR0 = P(A0, bm + 0.18, h + rise - 0.05), rcapR1 = P(A1, bm + 0.18, h + rise - 0.05);
  pushTri(rp, ru, rcapL0, rcapL1, rcap1, [0, 0], [1, 0], [1, 0.2], up);
  pushTri(rp, ru, rcapL0, rcap1, rcap0, [0, 0], [1, 0.2], [0, 0.2], up);
  pushTri(rp, ru, rcap0, rcap1, rcapR1, [0, 0], [1, 0], [1, 0.2], up);
  pushTri(rp, ru, rcap0, rcapR1, rcapR0, [0, 0], [1, 0.2], [0, 0.2], up);

  return {
    roof: geoFrom(rp, ru, roofTint),
    gable: geoFrom(gp, gu, wallTint),
    fascia: fp.length ? geoFrom(fp, fu, wallTint) : null,
  };
}

function buildBuildings(ways) {
  const rand = mulberry32(42);
  const roofs = [], walls = [], trims = [], windowHoods = [];
  const roofTint = new THREE.Color(), wallTint = new THREE.Color();
  const hoodMatCol = new THREE.Color(0x3a2c20);

  // Lists for instanced rooftop details (Antennas, GeePee tanks, Satellite dishes)
  const aerialPositions = [];
  const tankPositions = [];
  const dishPositions = [];

  for (const w of ways) {
    if (!w.tags?.building || !w.geometry || w.geometry.length < 4) continue;
    const pts = w.geometry.map((p) => project(p.lat, p.lon));
    const a = pts[0], b = pts[pts.length - 1];
    if (a[0] === b[0] && a[1] === b[1]) pts.pop();
    if (pts.length < 3) continue;

    const levels = parseFloat(w.tags['building:levels']) || (1 + Math.floor(rand() * 2));
    const h = levels * 3.4;

    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);

    // Rich tropical Ibadan building colors (Faded ochre, aged cream, peach, colonial stone)
    const v = 0.75 + rand() * 0.45;
    roofTint.setRGB(v, v * (0.8 + rand() * 0.25), v * (0.65 + rand() * 0.3));
    const wv = 0.8 + rand() * 0.32;
    const wallPick = rand();
    if (wallPick < 0.3) wallTint.setRGB(wv, wv * 0.94, wv * 0.78);          // warm cream
    else if (wallPick < 0.55) wallTint.setRGB(wv * 0.96, wv * 0.82, wv * 0.65); // tropical peach terracotta
    else if (wallPick < 0.75) wallTint.setRGB(wv * 0.88, wv * 0.92, wv);   // colonial pale blue-grey
    else wallTint.setRGB(wv * 0.88, wv * 0.86, wv * 0.82);                 // weathered render

    const gab = h < 10 ? gableRoof(pts, h, roofTint, wallTint) : null;
    if (gab) {
      roofs.push(gab.roof);
      walls.push(gab.gable);
      if (gab.fascia) trims.push(gab.fascia);
    } else {
      roofs.push(sliceGroup(geo, geo.groups[0], roofTint));
    }
    walls.push(sliceGroup(geo, geo.groups[1], wallTint));
    geo.dispose();

    // Procedural Facade Windows & Cantilevered Tropical Sunshades along walls
    const numPts = pts.length;
    for (let i = 0; i < numPts; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % numPts];
      const segLen = Math.hypot(x1 - x0, z1 - z0);
      if (segLen >= 4.2) {
        const ux = (x1 - x0) / segLen, uz = (z1 - z0) / segLen;
        const nx = -uz, nz = ux; // wall normal facing outside
        const numWindows = Math.floor(segLen / 2.8);
        const spacing = segLen / (numWindows + 1);

        for (let wIdx = 1; wIdx <= numWindows; wIdx++) {
          const wx = x0 + ux * (wIdx * spacing) + nx * 0.12;
          const wz = z0 + uz * (wIdx * spacing) + nz * 0.12;
          for (let fl = 0; fl < levels; fl++) {
            const wy = fl * 3.4 + 1.8;
            // Concrete cantilever window hood & frame
            const hoodGeo = new THREE.BoxGeometry(1.2, 0.12, 0.38);
            hoodGeo.translate(wx, wy + 0.65, wz);
            windowHoods.push(hoodGeo);

            const frameGeo = new THREE.BoxGeometry(1.1, 1.1, 0.08);
            frameGeo.translate(wx, wy, wz);
            windowHoods.push(frameGeo);
          }
        }
      }
    }

    // Rooftop additions (Antennas, GeePee tanks, Dishes)
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;

    const roofFeatureRoll = rand();
    if (roofFeatureRoll < 0.28) {
      aerialPositions.push([midX, h, midZ]);
    } else if (roofFeatureRoll < 0.52) {
      tankPositions.push([midX + (rand() - 0.5) * 3, h, midZ + (rand() - 0.5) * 3]);
    } else if (roofFeatureRoll < 0.72) {
      dishPositions.push([midX + (rand() - 0.5) * 2, h, midZ + (rand() - 0.5) * 2]);
    }

    // collision footprint
    const f = { pts, h, minX, maxX, minZ, maxZ };
    footprints.push(f);
    for (let cx = Math.floor(f.minX / CELL); cx <= Math.floor(f.maxX / CELL); cx++)
      for (let cz = Math.floor(f.minZ / CELL); cz <= Math.floor(f.maxZ / CELL); cz++) {
        const k = `${cx},${cz}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(f);
      }
  }

  if (!roofs.length) return 0;

  // Merged Roofs with High-res Zinc material
  const roofMesh = new THREE.Mesh(
    mergeGeometries(roofs),
    new THREE.MeshStandardMaterial({
      map: zincTex,
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.45,
    })
  );
  // Merged Walls with High-res Plaster material
  const wallMesh = new THREE.Mesh(
    mergeGeometries(walls),
    new THREE.MeshStandardMaterial({
      map: wallTex,
      vertexColors: true,
      roughness: 0.92,
    })
  );

  applyPBR(roofMesh.material, 'zinc', 2);
  applyPBR(wallMesh.material, 'wall', 3);
  for (const m of [roofMesh, wallMesh]) {
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
  }

  // Merged Eave Trims & Fascia Boards
  if (trims.length) {
    const trimMesh = new THREE.Mesh(
      mergeGeometries(trims),
      new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.85 })
    );
    trimMesh.castShadow = true;
    scene.add(trimMesh);
  }

  // Merged Window Hoods & Frames
  if (windowHoods.length) {
    const hoodsMerged = mergeGeometries(windowHoods);
    const hoodsMesh = new THREE.Mesh(
      hoodsMerged,
      new THREE.MeshStandardMaterial({ color: 0x2e2318, roughness: 0.8 })
    );
    hoodsMesh.castShadow = true;
    scene.add(hoodsMesh);
  }

  // Instanced Rooftop TV Aerials (Tall Yagi Masts)
  if (aerialPositions.length) {
    const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 4.2, 6);
    mastGeo.translate(0, 2.1, 0);
    const aerialMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.8, roughness: 0.3 });
    const aerialMesh = new THREE.InstancedMesh(mastGeo, aerialMat, aerialPositions.length);
    const dummy = new THREE.Object3D();
    aerialPositions.forEach(([ax, ay, az], idx) => {
      dummy.position.set(ax, ay, az);
      dummy.updateMatrix();
      aerialMesh.setMatrixAt(idx, dummy.matrix);
    });
    scene.add(aerialMesh);
  }

  // Instanced Black GeePee Water Storage Tanks on rooftops
  if (tankPositions.length) {
    const tankGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.5, 12);
    tankGeo.translate(0, 0.75, 0);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.35 });
    const tankMesh = new THREE.InstancedMesh(tankGeo, tankMat, tankPositions.length);
    const dummy = new THREE.Object3D();
    tankPositions.forEach(([tx, ty, tz], idx) => {
      dummy.position.set(tx, ty, tz);
      dummy.updateMatrix();
      tankMesh.setMatrixAt(idx, dummy.matrix);
    });
    tankMesh.castShadow = true;
    scene.add(tankMesh);
  }

  // Instanced Rooftop Mini Satellite Dishes (DSTV style)
  if (dishPositions.length) {
    const dishGeo = new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI);
    dishGeo.rotateX(Math.PI / 3);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });
    const dishMesh = new THREE.InstancedMesh(dishGeo, dishMat, dishPositions.length);
    const dummy = new THREE.Object3D();
    dishPositions.forEach(([dx, dy, dz], idx) => {
      dummy.position.set(dx, dy + 0.35, dz);
      dummy.updateMatrix();
      dishMesh.setMatrixAt(idx, dummy.matrix);
    });
    scene.add(dishMesh);
  }

  return roofs.length;
}

// ---------- Roads ----------
const ROAD_W = { motorway: 14, trunk: 14, primary: 12, secondary: 10, tertiary: 8, unclassified: 6, residential: 6, living_street: 5, service: 4, track: 3 };
const lampSpots = [];
const roadPts = [];   // sample points used to spawn the player on a road

function ribbon(pts, width, y) {
  const pos = [], idx = [], uvs = [];
  let run = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx;
    pos.push(p[0] + (nx * width) / 2, y, p[1] + (nz * width) / 2, p[0] - (nx * width) / 2, y, p[1] - (nz * width) / 2);
    if (i > 0) run += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    uvs.push(width / 2, run, -width / 2, run);   // metres, so textures keep real scale
    if (i < pts.length - 1) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildRoads(ways) {
  const geoms = [];
  for (const w of ways) {
    const type = w.tags?.highway;
    const width = ROAD_W[type];
    if (!width || !w.geometry || w.geometry.length < 2) continue;
    const pts = w.geometry.map((p) => project(p.lat, p.lon));
    geoms.push(ribbon(pts, width, 0.05));
    if (width >= 6) {                       // [x, z, dirX, dirZ] sample point, used to spawn the player and vehicles
      const m = Math.floor((pts.length - 1) / 2), a = pts[m];
      const nx2 = pts[Math.min(m + 1, pts.length - 1)], pv = pts[Math.max(m - 1, 0)];
      const dx = nx2[0] - pv[0], dz = nx2[1] - pv[1], l = Math.hypot(dx, dz) || 1;
      roadPts.push([a[0], a[1], dx / l, dz / l]);
    }

    if (['primary', 'secondary', 'tertiary', 'trunk'].includes(type)) {   // lamp spots every ~45 m
      let acc = 0, side = 1;
      for (let i = 1; i < pts.length; i++) {
        const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
        const len = Math.hypot(x1 - x0, z1 - z0);
        acc += len;
        if (acc >= 45 && len > 0) {
          acc = 0;
          const nx = -(z1 - z0) / len, nz = (x1 - x0) / len, off = width / 2 + 1.5;
          lampSpots.push([x1 + nx * off * side, z1 + nz * off * side]);
          side *= -1;
        }
      }
    }
  }
  if (!geoms.length) return 0;
  const mesh = new THREE.Mesh(
    mergeGeometries(geoms),
    new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  );
  mesh.receiveShadow = true;
  applyPBR(mesh.material, 'asphalt', 4);
  scene.add(mesh);
  return geoms.length;
}

// ---------- Street furniture: electric poles, wires, trees ----------
function buildStreetFurniture(ways) {
  const rand = mulberry32(99);
  const poles = [], trees = [], wire = [];
  const SPACING = 38;

  for (const w of ways) {
    const width = ROAD_W[w.tags?.highway];
    if (!width || width < 5 || !w.geometry || w.geometry.length < 2) continue;
    const pts = w.geometry.map((p) => project(p.lat, p.lon));
    const side = rand() < 0.5 ? 1 : -1;
    let dist = 0, nextPole = 8 + rand() * 20, nextTree = 6 + rand() * 15, prev = null;

    for (let i = 1; i < pts.length; i++) {
      const [x0, z0] = pts[i - 1], [x1, z1] = pts[i];
      const len = Math.hypot(x1 - x0, z1 - z0);
      if (!len) continue;
      const ux = (x1 - x0) / len, uz = (z1 - z0) / len, nx = -uz, nz = ux;

      while (nextPole <= dist + len || nextTree <= dist + len) {
        if (nextPole <= nextTree) {
          const t = nextPole - dist, off = width / 2 + 1.2;
          const x = x0 + ux * t + nx * off * side, z = z0 + uz * t + nz * off * side;
          if (!blocked(x, z)) {
            poles.push([x, z]);
            if (prev && Math.hypot(prev[0] - x, prev[1] - z) < 60)
              wire.push(prev[0], 7.4, prev[1], x, 7.4, z, prev[0], 7.0, prev[1], x, 7.0, z);
            prev = [x, z];
          } else prev = null;
          nextPole += SPACING;
        } else {
          const t = nextTree - dist, off = width / 2 + 2.5 + rand() * 4, sd = rand() < 0.5 ? 1 : -1;
          const x = x0 + ux * t + nx * off * sd, z = z0 + uz * t + nz * off * sd;
          if (rand() < 0.7 && !blocked(x, z)) trees.push([x, z, rand()]);
          nextTree += 14 + rand() * 22;
        }
      }
      dist += len;
    }
  }

  const dummy = new THREE.Object3D();

  if (poles.length) {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.16, 8, 6); poleGeo.translate(0, 4, 0);
    const armGeo = new THREE.BoxGeometry(1.8, 0.1, 0.1); armGeo.translate(0, 7.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 0.9 });
    const poleMesh = new THREE.InstancedMesh(poleGeo, mat, poles.length);
    const armMesh = new THREE.InstancedMesh(armGeo, mat, poles.length);
    poles.forEach(([x, z], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, rand() * Math.PI, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      poleMesh.setMatrixAt(i, dummy.matrix); armMesh.setMatrixAt(i, dummy.matrix);
    });
    poleMesh.castShadow = armMesh.castShadow = true;
    scene.add(poleMesh, armMesh);
  }

  if (wire.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x15151a })));
  }

  if (trees.length) {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 3, 6); trunkGeo.translate(0, 1.5, 0);
    const crownGeo = new THREE.IcosahedronGeometry(1.6, 1); crownGeo.scale(1, 0.85, 1); crownGeo.translate(0, 4.2, 0);
    const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x5b4330, roughness: 1 }), trees.length);
    const crown = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), trees.length);
    const col = new THREE.Color();
    trees.forEach(([x, z, r], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, r * 6.28, 0); dummy.scale.setScalar(0.8 + r * 0.8); dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix); crown.setMatrixAt(i, dummy.matrix);
      crown.setColorAt(i, col.setHSL(0.25 + r * 0.06, 0.45, 0.22 + r * 0.1));
    });
    trunk.castShadow = crown.castShadow = true;
    scene.add(trunk, crown);
  }
  return { poles: poles.length, trees: trees.length };
}

// ---------- Street lamps (placed along main roads) ----------
function createProceduralLamp() {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x24282c, metalness: 0.8, roughness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8), poleMat);
  pole.position.y = 2.75;
  pole.castShadow = true;
  g.add(pole);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), poleMat);
  arm.rotation.z = Math.PI / 3;
  arm.position.set(0.4, 5.2, 0);
  g.add(arm);

  const bulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.12, 0.25),
    new THREE.MeshStandardMaterial({ color: 0xfff6dd, emissive: 0xffe28a, emissiveIntensity: 1.5 })
  );
  bulb.position.set(0.8, 5.35, 0);
  g.add(bulb);
  return g;
}

function placeLamps() {
  function spawn(template) {
    lampSpots.slice(0, LAMP_MAX).forEach(([x, z]) => {
      const c = template.clone();
      c.position.set(x, 0, z);
      scene.add(c);
    });
  }

  new GLTFLoader().load(
    LAMP_URL,
    (gltf) => {
      gltf.scene.scale.setScalar(LAMP_SCALE);
      gltf.scene.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      spawn(gltf.scene);
    },
    undefined,
    (err) => {
      console.warn('Street lamp GLB load notice:', err);
      spawn(createProceduralLamp());
    }
  );
}

// ---------- Player (third person) ----------
const player = new THREE.Group();
scene.add(player);

function placeholderHuman() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 12), new THREE.MeshStandardMaterial({ color: 0x2f6b4f }));
  body.position.y = 0.85;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0x5a3a28 }));
  head.position.y = 1.6;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.12), new THREE.MeshStandardMaterial({ color: 0x5a3a28 }));
  nose.position.set(0, 1.6, -0.2); // marks the front (-Z)
  [body, head, nose].forEach((m) => (m.castShadow = true));
  g.add(body, head, nose);
  return g;
}
player.add(placeholderHuman());

let mixer = null;
const actions = {};
let current = null;

// Mixamo downloads name their bones mixamorig, mixamorig1, mixamorig4... Normalise so clips from any file fit any character.
const fixName = (n) => n.replace(/mixamorig\d*/g, 'mixamorig');
function fixClip(clip) {
  clip.tracks.forEach((t) => {
    t.name = fixName(t.name);
    // remove forward/sideways root motion on the hips: the game moves the character, the clip only animates it
    if (/mixamorigHips\.position$/.test(t.name)) {
      const v = t.values;
      for (let i = 0; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; }
    }
  });
  return clip;
}
function registerClips(clips) {
  clips.forEach((clip) => {
    const n = clip.name.toLowerCase();
    const k = n.includes('run') ? 'run' : n.includes('walk') ? 'walk' : n.includes('idle') ? 'idle' : n.includes('jump') && USE_JUMP_CLIP ? 'jump' : null;
    if (k && !actions[k]) actions[k] = mixer.clipAction(fixClip(clip));
  });
}
// Animation-only GLBs made by scripts/convert-animations.mjs: anims/idle.glb, walk.glb, run.glb, jump.glb
function loadClipFile(name) {
  new GLTFLoader().load(`${ANIM_DIR}${name}.glb`, (g) => {
    if (g.animations[0] && mixer && !actions[name]) actions[name] = mixer.clipAction(fixClip(g.animations[0]));
  }, undefined, () => {});
}

new GLTFLoader().load(
  PLAYER_MODEL_URL,
  (gltf) => {
    player.clear();
    const model = gltf.scene;
    model.traverse((o) => {
      o.name = fixName(o.name);
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    // scale to a real human height and stand the feet on the ground
    const box = new THREE.Box3().setFromObject(model);
    const k = PLAYER_HEIGHT / (box.getSize(new THREE.Vector3()).y || 1);
    model.scale.multiplyScalar(k);
    box.setFromObject(model);
    model.position.y -= box.min.y;
    const holder = new THREE.Group();
    holder.rotation.y = Math.PI;               // glTF characters face +Z; we walk toward -Z
    holder.add(model);
    player.add(holder);
    mixer = new THREE.AnimationMixer(model);
    registerClips(gltf.animations);
    ['idle', 'walk', 'run'].forEach(loadClipFile);
    if (USE_JUMP_CLIP) loadClipFile('jump');
    console.log('Character loaded. Clips in file:', gltf.animations.map((a) => a.name));
  },
  undefined,
  () => console.info('No player model yet. Drop a GLB at', PLAYER_MODEL_URL)
);
function updateAnimation(moving, running, airborne) {
  if (!mixer) return;
  let name = airborne && actions.jump ? 'jump'
    : !moving ? 'idle'
    : running && actions.run ? 'run' : 'walk';
  if (!actions[name]) name = name === 'idle' ? null : actions.walk ? 'walk' : null;
  if (!name) { if (current) actions[current].timeScale = 0; return; }   // no idle clip yet: freeze the pose
  if (current !== name) {
    const next = actions[name];
    next.reset().fadeIn(0.2).play();
    if (current) actions[current].fadeOut(0.2);
    current = name;
  }
  actions[name].timeScale = name === 'walk' ? WALK_SPEED / WALK_ANIM_SPEED : name === 'run' ? RUN_SPEED / RUN_ANIM_SPEED : 1;
}

// ---------- Input ----------
const keys = {};
let yaw = 0, pitch = 0.35, camDist = 6;
let velY = 0, grounded = true;
let physics = null;
const vehicles = [];
let driving = null;          // the Vehicle the player is in, or null
let lastMouse = 0;

let housing = null;
let gameplay = null;
let ui = null;
let pedestrians = null;
let traffic = null;
let streetLife = null;
let police = null;
let gpsBeaconGroup = null;
let inSafehouseInterior = false;
const outsidePosBeforeInterior = new THREE.Vector3();

function nearestVehicle(maxDist) {
  let best = null, bd = maxDist;
  for (const v of vehicles) {
    const p = v.position, d = Math.hypot(p.x - player.position.x, p.z - player.position.z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// GTA 5 Camera Modes & Carjacking System
let camMode = 1; // 0: Close, 1: Normal, 2: Far, 3: Hood/Bumper
function cycleCamera() {
  camMode = (camMode + 1) % 4;
  if (camMode === 0) camDist = 3.6;
  else if (camMode === 1) camDist = 6.0;
  else if (camMode === 2) camDist = 11.5;
  else if (camMode === 3) camDist = 0.5;
}

function handlePunchMelee() {
  if (driving || inSafehouseInterior) return;
  sounds.playPunch();

  // Subtle physical forward thrust on punch
  if (player) {
    const punchImpulse = new THREE.Vector3(0, 0, -0.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    player.position.add(punchImpulse);
    setTimeout(() => { player.position.sub(punchImpulse); }, 110);
  }

  // 1. Check hitting a nearby pedestrian
  if (pedestrians) {
    const res = pedestrians.punchPedestrian(player.position, 2.4);
    if (res && res.hit) {
      if (res.cash && gameplay) {
        gameplay.money += res.cash;
        sounds.playCash();
      }
      if (gameplay) {
        gameplay.addWantedStars(1);
        ui?.showShout('CRIME COMMITTED: Street assault! Police units alerted!');
      }
      return;
    }
  }

  // 2. Check hitting a vehicle
  const nearV = nearestVehicle(2.8) || traffic?.getNearestVehicle(player.position, 2.8);
  if (nearV) {
    sounds.playDent();
  }
}

function hijackTrafficVehicle(tv) {
  if (!tv || !tv.mesh || !physics) return;
  const p = tv.mesh.position;
  const rotY = tv.mesh.rotation.y;
  const vType = tv.type === 'danfo' ? 'danfo' : tv.type === 'keke' ? 'carry' : tv.type === 'car' ? 'car' : 'carry';
  const vehName = tv.name || 'Commercial Vehicle';

  // Audio: door yank, horn alarm blip
  sounds.playCarDoor();
  sounds.playCarJackAlert();

  // Authentic Nigerian Driver Panic Shout
  const shouts = [
    'WEYREY NI E! OLE! DROP MY MOTOR!',
    'CHAI! ARMED ROBBER DON SEIZE MY DANFO!',
    'EGBA MI O! WEYREY DON HIJACK MY CAR!',
    'LEAVE MY STEERING O! JESUS CHRIST!',
    'THIEF! OLE! POLICE HELP ME O!',
    'BROTHER COMMOT YOUR HAND FOR MY KEY!',
  ];
  const randomShout = shouts[Math.floor(Math.random() * shouts.length)];
  ui?.showShout(randomShout);

  // Eject Driver NPC onto roadside
  if (pedestrians) {
    const ejectX = p.x - Math.cos(rotY) * 1.8;
    const ejectZ = p.z + Math.sin(rotY) * 1.8;
    pedestrians.spawnEjectedDriver(ejectX, ejectZ, rotY);
  }

  // GTA 5 Wanted Level: +1 Star
  gameplay?.addWantedStars(1);

  // Remove vehicle from traffic simulation
  traffic.removeVehicle(tv);

  // Spawn new playable Rapier physics Vehicle at exact position & heading
  const newVeh = new Vehicle(physics, scene, vType, p.x, p.z, rotY);
  vehicles.push(newVeh);

  // Player enters driver seat immediately
  driving = newVeh;
  player.visible = false;
  velY = 0;

  // Rev engine & show GTA 5 vehicle badge
  sounds.updateEngine(true, 18, 1);
  ui?.showVehicleCard('VEHICLE HIJACKED', vehName.toUpperCase(), 'Stolen Vehicle • Oyo State Traffic');
}

function toggleVehicle() {
  if (driving) {
    const p = driving.position, h = driving.heading;
    const lx = Math.cos(h), lz = -Math.sin(h);
    player.position.set(p.x, 0, p.z);
    for (const side of [1, -1]) {
      const x = p.x + lx * 2.4 * side, z = p.z + lz * 2.4 * side;
      if (!blocked(x, z)) { player.position.set(x, 0, z); break; }
    }
    player.rotation.y = h + Math.PI;
    driving = null;
    player.visible = true;
    sounds.updateEngine(false, 0, 0);
    return;
  }

  // Check nearby traffic vehicle for carjacking!
  const tv = traffic?.getNearestVehicle(player.position, 5.5);
  const pv = nearestVehicle(5.2);
  const tvDist = tv ? Math.hypot(tv.mesh.position.x - player.position.x, tv.mesh.position.z - player.position.z) : 999;
  const pvDist = pv ? Math.hypot(pv.position.x - player.position.x, pv.position.z - player.position.z) : 999;

  if (tv && tvDist <= pvDist && tvDist < 5.5) {
    hijackTrafficVehicle(tv);
    return;
  }

  if (pv) {
    driving = pv;
    player.visible = false;
    velY = 0;
    sounds.playCarDoor();
    sounds.updateEngine(true, 10, 1);
    ui?.showVehicleCard('ENTERED VEHICLE', pv.T.name.toUpperCase(), 'Player Vehicle');
  }
}

// Proximity check helpers
function getNearbyBuka(maxDist = 3.8) {
  if (!housing || !housing.bukaStalls) return null;
  return housing.bukaStalls.find((b) => player.position.distanceTo(b.pos) < maxDist);
}

function getNearbyProperty(maxDist = 4.0) {
  if (!gameplay || !gameplay.properties) return null;
  return gameplay.properties.find((p) => player.position.distanceTo(p.pos) < maxDist);
}

function getNearbyBusStop(maxDist = 5.0) {
  if (!gameplay || !gameplay.busStops) return null;
  const pos = driving ? driving.position : player.position;
  return gameplay.busStops.find((b) => pos.distanceTo(b.pos) < maxDist);
}

function handleInteraction() {
  // If in safehouse interior:
  if (inSafehouseInterior && housing) {
    const orig = housing.interiorOrigin;
    const p = player.position;
    // Bed area (x: +3.4, z: 0)
    if (p.distanceTo(new THREE.Vector3(orig.x + 3.4, orig.y, orig.z)) < 2.5) {
      ui?.openSleepModal();
      return;
    }
    // Front door area (z: +3.8)
    if (p.distanceTo(new THREE.Vector3(orig.x, orig.y, orig.z + 3.8)) < 2.5) {
      player.position.copy(outsidePosBeforeInterior);
      inSafehouseInterior = false;
      sounds.playDoor();
      return;
    }
    return;
  }

  // Outside street interactions:
  // 1. Safehouse exterior entrance
  if (housing && housing.safehouses.length) {
    const sh = housing.safehouses[0];
    if (player.position.distanceTo(sh.exteriorPos) < 3.5 && !driving) {
      outsidePosBeforeInterior.copy(player.position);
      player.position.copy(sh.interiorPos);
      inSafehouseInterior = true;
      sounds.playDoor();
      return;
    }
  }

  // 2. Police / VIO Checkpoint
  const nearCheckpoint = streetLife?.getNearbyCheckpoint(player.position);
  if (nearCheckpoint) {
    ui?.openPoliceModal(nearCheckpoint, streetLife);
    return;
  }

  // 3. Dugbe Petrol Filling Station
  const nearStation = streetLife?.getNearbyFillingStation(player.position);
  if (nearStation) {
    ui?.openFuelModal(nearStation, streetLife, driving);
    return;
  }

  // 4. Roadside Hawker
  const nearHawker = streetLife?.getNearbyHawker(player.position);
  if (nearHawker && !driving) {
    ui?.openHawkerModal(nearHawker, streetLife);
    return;
  }

  // 5. Buka Amala stall
  const nearbyBuka = getNearbyBuka();
  if (nearbyBuka && !driving) {
    ui?.openBukaModal(nearbyBuka.name);
    return;
  }

  // 6. Real estate property inspection
  const nearbyProp = getNearbyProperty();
  if (nearbyProp && !driving) {
    ui?.openPropertyModal(nearbyProp);
    return;
  }

  // 7. Bus stop
  const nearbyStop = getNearbyBusStop();
  if (nearbyStop) {
    if (gameplay?.activeJob && gameplay.activeJob.type === 'passenger') {
      const res = gameplay.completePassengerJob();
      if (res) sounds.playCash();
      return;
    } else {
      gameplay?.startPassengerJob(nearbyStop);
      return;
    }
  }

  // 8. Vehicle enter / exit
  toggleVehicle();
}

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space' && grounded && !driving) { velY = 7; grounded = false; }
  if (e.code === 'KeyE') handleInteraction();
  if (e.code === 'KeyF') toggleVehicle(); // Classic GTA vehicle enter / hijack key
  if (e.code === 'KeyV') cycleCamera(); // GTA camera perspective toggle
  if (e.code === 'KeyQ') handlePunchMelee(); // GTA melee punch
  if (e.code === 'KeyH') sounds.playHorn();
  if (e.code === 'KeyM') ui?.openTownMapModal();
  if (e.code === 'KeyP') ui?.togglePoliceWanted();
  if (e.code === 'KeyN') {
    const st = radio.nextStation();
    ui?.updateRadioUI(st);
  }
  if (e.code === 'KeyB' && inSafehouseInterior && housing) {
    // Step onto Dugbe View Balcony
    player.position.copy(housing.safehouses[0].balconyPos);
    inSafehouseInterior = false;
    sounds.playDoor();
  }
  if (e.code === 'KeyR') (driving || nearestVehicle(6))?.resetUpright();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

// Dual-mode Camera Control (Pointer Lock with smooth Drag Fallback for iframes)
let pointerLockAllowed = true;
let isMouseDown = false;
let mouseStartX = 0, mouseStartY = 0;
let dragDist = 0;

// Catch any pointer lock security or invalid state errors globally so they never fail the applet
window.addEventListener('error', (e) => {
  if (e?.message && /pointer lock/i.test(e.message)) {
    e.preventDefault();
    pointerLockAllowed = false;
  }
});

function tryPointerLock() {
  if (!pointerLockAllowed) return;
  // If running in a cross-origin / sandboxed iframe without allow-pointer-lock, don't call it
  if (window.self !== window.top) {
    try {
      if (document.featurePolicy && typeof document.featurePolicy.allowsFeature === 'function') {
        if (!document.featurePolicy.allowsFeature('pointer-lock')) {
          pointerLockAllowed = false;
          return;
        }
      }
    } catch (_) {}
  }

  try {
    if (document.pointerLockElement === renderer.domElement) return;
    const p = renderer.domElement.requestPointerLock?.();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        pointerLockAllowed = false;
      });
    }
  } catch (_) {
    pointerLockAllowed = false;
  }
}
document.addEventListener('pointerlockerror', () => {
  pointerLockAllowed = false;
});

// Canvas Interaction: Pointer Lock + Drag + Punch
renderer.domElement.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  mouseStartX = e.clientX;
  mouseStartY = e.clientY;
  dragDist = 0;

  if (document.pointerLockElement !== renderer.domElement) {
    tryPointerLock();
  }
});

addEventListener('mouseup', (e) => {
  if (isMouseDown && dragDist < 8 && e.button === 0) {
    // Clicked without dragging: trigger punch melee
    handlePunchMelee();
  }
  isMouseDown = false;
});

addEventListener('mousemove', (e) => {
  // 1. If Pointer Lock active: seamless FPS/TPS camera rotation
  if (document.pointerLockElement === renderer.domElement) {
    lastMouse = performance.now();
    yaw -= e.movementX * 0.0025;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * 0.0025, 0.05, 1.2);
    return;
  }

  // 2. Fallback when pointer lock is disallowed in iframe: drag to rotate
  if (isMouseDown) {
    lastMouse = performance.now();
    const dx = e.movementX ?? (e.clientX - mouseStartX);
    const dy = e.movementY ?? (e.clientY - mouseStartY);
    dragDist += Math.hypot(dx, dy);
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;

    yaw -= dx * 0.003;
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.003, 0.05, 1.2);
  }
});

// Touch controls for mobile / tablet preview
let lastTouchX = 0, lastTouchY = 0;
renderer.domElement.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
  }
}, { passive: true });

renderer.domElement.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) {
    lastMouse = performance.now();
    const dx = e.touches[0].clientX - lastTouchX;
    const dy = e.touches[0].clientY - lastTouchY;
    lastTouchX = e.touches[0].clientX;
    lastTouchY = e.touches[0].clientY;
    yaw -= dx * 0.0035;
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.0035, 0.05, 1.2);
  }
}, { passive: true });

// Live look-tuning
addEventListener('keydown', (e) => {
  if (e.code === 'BracketLeft') renderer.toneMappingExposure = Math.max(0.1, renderer.toneMappingExposure - 0.05);
  if (e.code === 'BracketRight') renderer.toneMappingExposure += 0.05;
  if (e.code === 'Minus') scene.environmentIntensity = Math.max(0, scene.environmentIntensity - 0.05);
  if (e.code === 'Equal') scene.environmentIntensity += 0.05;
});
addEventListener('wheel', (e) => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.005, 3, 14); });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function findSpawn() {
  roadPts.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  for (const p of roadPts) if (!blocked(p[0], p[1])) return p;
  for (let r = 0; r < 80; r += 3)
    for (let a = 0; a < 12; a++) {
      const x = Math.cos((a / 12) * Math.PI * 2) * r, z = Math.sin((a / 12) * Math.PI * 2) * r;
      if (!blocked(x, z)) return [x, z];
    }
  return [0, 0];
}

function spawnVehicles(px, pz) {
  const types = ['bmw', 'dodge', 'ferrari', 'porsche', 'lamborghini'].slice(0, Number(P.get('vehicles') ?? 5));
  const placed = [];
  for (const [x, z, dx, dz] of roadPts) {
    if (placed.length >= types.length) break;
    const d = Math.hypot(x - px, z - pz);
    if (d < 12 || d > 160) continue;
    if (placed.some(([qx, qz]) => Math.hypot(x - qx, z - qz) < 30)) continue;
    if (blocked(x, z) || blocked(x + dx * 3, z + dz * 3) || blocked(x - dx * 3, z - dz * 3)) continue;
    vehicles.push(new Vehicle(physics, scene, types[placed.length], x, z, Math.atan2(dx, dz)));
    placed.push([x, z]);
  }
  return placed.length;
}

// ---------- Main loop ----------
const clock = new THREE.Clock();
let acc = 0, frames = 0;
let started = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (started) {
    if (physics) {
      physics.step(dt);
      if (driving) {
        const throttleInput = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
        driving.setInput({
          throttle: throttleInput,
          steer: (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
          handbrake: !!keys.Space,
        });
        sounds.updateEngine(true, driving.kmh, throttleInput);

        // Check if arrived at active job objective destination
        if (gameplay?.activeJob) {
          const targetPos = gameplay.activeJob.type === 'passenger'
            ? gameplay.activeJob.dest.pos
            : gameplay.activeJob.destPos;
          if (driving.position.distanceTo(targetPos) < 7.0) {
            if (gameplay.activeJob.type === 'passenger') {
              gameplay.completePassengerJob();
            } else {
              gameplay.completeCargoJob();
            }
          }
        }
      }
      for (const v of vehicles) {
        if (v !== driving) v.setInput({ throttle: 0, steer: 0, handbrake: true });
        v.update(dt);
      }
    }

    const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
    const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const moving = !driving && (fwd !== 0 || strafe !== 0);
    const speed = keys.ShiftLeft ? RUN_SPEED : WALK_SPEED;

    if (moving) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = -fz, rz = fx;
      let mx = fx * fwd + rx * strafe, mz = fz * fwd + rz * strafe;
      const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      const nx = player.position.x + mx * speed * dt;
      const nz = player.position.z + mz * speed * dt;
      if (!inSafehouseInterior) {
        if (!blocked(nx, player.position.z)) player.position.x = nx;
        if (!blocked(player.position.x, nz)) player.position.z = nz;
      } else {
        // Simple room bounding box in safehouse
        const orig = housing.interiorOrigin;
        if (Math.abs(nx - orig.x) < 4.6) player.position.x = nx;
        if (Math.abs(nz - orig.z) < 3.6) player.position.z = nz;
      }
      const target = Math.atan2(-mx, -mz);
      let d = target - player.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      player.rotation.y += d * Math.min(1, dt * 12);
    }

    if (driving) {
      const p = driving.position;
      player.position.set(p.x, 0, p.z);
      velY = 0;
    } else if (!inSafehouseInterior) {
      velY -= 20 * dt;
      player.position.y += velY * dt;
      if (player.position.y <= 0) { player.position.y = 0; velY = 0; grounded = true; }
    } else {
      player.position.y = housing.interiorOrigin.y;
      velY = 0;
      grounded = true;
    }

    updateAnimation(moving, !!keys.ShiftLeft, !grounded && !driving);
    mixer?.update(dt);

    // Update managers
    housing?.update(dt);
    gameplay?.update(dt, player.position, moving && !!keys.ShiftLeft);
    pedestrians?.update(dt, player.position, driving);
    traffic?.update(dt, player.position, driving, player, gameplay, ui);
    police?.update(dt, player.position, driving, player, blocked);
    if (police && gameplay) {
      gameplay.policePositions = police.getPolicePositions();
    }

    // Speeding through police checkpoint triggers wanted star!
    if (driving && driving.kmh > 32 && streetLife?.getNearbyCheckpoint(player.position)) {
      if (!gameplay._lastSpeedingCheck || performance.now() - gameplay._lastSpeedingCheck > 7000) {
        gameplay._lastSpeedingCheck = performance.now();
        gameplay.addWantedStars(1);
        ui?.showShout('POLICE CHECKPOINT: Vehicle refused stop & search! All units pursue!');
        sounds.playPoliceWhistle();
      }
    }

    // 3D GPS Beacon diamond animation
    if (gpsBeaconGroup && gpsBeaconGroup.visible && gpsBeaconGroup.children[2]) {
      gpsBeaconGroup.children[2].rotation.y += dt * 2.8;
      gpsBeaconGroup.children[1].scale.setScalar(1 + Math.sin(performance.now() * 0.006) * 0.15);
    }

    // Dynamic Interaction Prompt
    if (ui) {
      let promptText = '';
      if (inSafehouseInterior && housing) {
        const orig = housing.interiorOrigin;
        const p = player.position;
        if (p.distanceTo(new THREE.Vector3(orig.x + 3.4, orig.y, orig.z)) < 2.5) {
          promptText = '<b>[E] Sleep on Bed & Change Time of Day</b>';
        } else if (p.distanceTo(new THREE.Vector3(orig.x - 4.5, orig.y, orig.z)) < 2.5) {
          promptText = '<b>[B] Step onto Dugbe View Balcony</b>';
        } else if (p.distanceTo(new THREE.Vector3(orig.x, orig.y, orig.z + 3.8)) < 2.5) {
          promptText = '<b>[E] Exit Safehouse to Dugbe Street</b>';
        }
      } else if (driving) {
        const st = radio.getActiveStation();
        const radioTag = st.id === 'off' ? 'Off' : st.freq;
        const nearCheckpoint = streetLife?.getNearbyCheckpoint(player.position);
        const nearStation = streetLife?.getNearbyFillingStation(player.position);

        const camTag = camMode === 3 ? 'Hood Cam' : camMode === 2 ? 'Far View' : camMode === 0 ? 'Close' : 'Normal';
        if (nearCheckpoint) {
          promptText = `<b>[E] Police / VIO Roadside Checkpoint</b> • [N] Radio (${radioTag}) • [M] Map`;
        } else if (nearStation) {
          promptText = `<b>[E] Refuel Vehicle at Dugbe Petrol Station</b> • [N] Radio (${radioTag}) • [M] Map`;
        } else {
          promptText = `<b>${Math.round(driving.kmh)} km/h</b> • <b>[F / E]</b> Exit • <b>[H]</b> Horn • <b>[Space]</b> Drift • <b>[V]</b> Cam (${camTag}) • <b>[M]</b> Map`;
        }
      } else {
        const nearTraffic = traffic?.getNearestVehicle(player.position, 5.5);
        const nearCheckpoint = streetLife?.getNearbyCheckpoint(player.position);
        const nearStation = streetLife?.getNearbyFillingStation(player.position);
        const nearHawker = streetLife?.getNearbyHawker(player.position);
        const nearV = nearestVehicle(5.2);
        const nearBuka = getNearbyBuka();
        const nearProp = getNearbyProperty();
        const nearStop = getNearbyBusStop();
        const nearSafehouse = housing?.safehouses[0] && player.position.distanceTo(housing.safehouses[0].exteriorPos) < 3.5;

        if (nearTraffic) {
          promptText = `<b>[F] HIJACK ${nearTraffic.name.toUpperCase()}</b> • [E] Enter`;
        } else if (nearCheckpoint) {
          promptText = '<b>[E] Police / VIO Checkpoint</b> (Stop & Search) • [M] Map';
        } else if (nearHawker) {
          promptText = `<b>[E] Buy from ${nearHawker.name}</b> (${nearHawker.item})`;
        } else if (nearStation) {
          promptText = '<b>[E] Dugbe Petrol Station</b> (PMS ₦750/L)';
        } else if (nearSafehouse) {
          promptText = '<b>[E] Enter Cocoa View Apartment (Safehouse)</b>';
        } else if (nearBuka) {
          promptText = `<b>[E] Eat at ${nearBuka.name}</b> (Refill Energy)`;
        } else if (nearProp) {
          promptText = `<b>[E] Inspect ${nearProp.name}</b> (To Let / For Sale)`;
        } else if (nearStop) {
          promptText = gameplay?.activeJob
            ? '<b>[E] Disembark Passengers at Bus Stop</b>'
            : '<b>[E] Board Passengers ("Along Dugbe!")</b>';
        } else if (nearV) {
          promptText = `<b>[F / E] Drive ${nearV.T.name}</b> • [M] Map`;
        }
      }
      ui.setPrompt(promptText);
      ui.update(dt, player.position, player.rotation.y, driving, roadPts, { traffic, streetLife, police });
    }

    // Chase camera (GTA 5 Style)
    if (driving && performance.now() - lastMouse > 1500 && driving.kmh > 3) {
      const target = driving.heading + Math.PI;
      let d = target - yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      yaw += d * Math.min(1, dt * 3);
    }
    if (driving && camMode === 3) {
      // GTA 5 First-person Hood / Bumper camera
      const fwdX = -Math.sin(driving.heading), fwdZ = -Math.cos(driving.heading);
      camera.position.set(
        player.position.x + fwdX * 0.9,
        player.position.y + 1.25,
        player.position.z + fwdZ * 0.9
      );
      camera.lookAt(player.position.x + fwdX * 35, player.position.y + 1.15, player.position.z + fwdZ * 35);
    } else {
      const dist = driving ? camDist + 3.8 : inSafehouseInterior ? 3.5 : camDist;
      const cp = Math.cos(pitch);
      camera.position.set(
        player.position.x + Math.sin(yaw) * cp * dist,
        player.position.y + (driving ? 2.2 : 1.6) + Math.sin(pitch) * dist,
        player.position.z + Math.cos(yaw) * cp * dist
      );
      camera.lookAt(player.position.x, player.position.y + 1.4, player.position.z);
    }

    // Shadows follow the player
    if (!inSafehouseInterior && gameplay?.sunDir) {
      sun.position.copy(player.position).addScaledVector(gameplay.sunDir, 200);
      sun.target.position.copy(player.position);
    }
  }

  renderer.render(scene, camera);

  acc += dt; frames++;
  if (acc >= 0.5) {
    if (P.has('debug')) {
      const i = renderer.info;
      hud.textContent = `FPS ${Math.round(frames / acc)}\nDraw calls ${i.render.calls}\nTriangles ${(i.render.triangles / 1000).toFixed(0)}k\nBuildings ${footprints.length}`;
      hud.style.display = 'block';
    } else {
      hud.style.display = 'none';
    }
    acc = 0; frames = 0;
  }
}
animate();

// ---------- Boot ----------
(async () => {
  try {
    const osm = await loadOSM();
    setStatus('Building Ibadan district...');
    await new Promise((r) => setTimeout(r, 30));
    const nB = buildBuildings(osm.elements);
    const nR = buildRoads(osm.elements);
    const fx = buildStreetFurniture(osm.elements);
    console.log(`Built ${nB} buildings, ${nR} roads, ${fx.poles} poles, ${fx.trees} trees`);
    placeLamps();
    const [sx, sz] = findSpawn();
    player.position.set(sx, 0, sz);
    setStatus('Starting physics & architecture...');
    physics = await Physics.create();

    // Initialize Housing BEFORE physics.addBuildings so Cocoa House, compounds & safehouses get Rapier colliders!
    housing = new HousingManager(scene, physics, player);
    housing.init(roadPts, footprints, grid, CELL);

    const nCol = physics.addBuildings(footprints);
    const nVeh = spawnVehicles(sx, sz);
    console.log(`Physics ready: ${nCol} colliders, ${nVeh} vehicles`);

    gameplay = new GameplayManager(scene, housing, sky, sun, renderer);
    gameplay.init(roadPts);

    ui = new UIManager(gameplay, housing, player, vehicles);
    ui.init();
    ui.onCycleCamera = cycleCamera;

    // 3D Visual GPS Waypoint Beacon Column
    gpsBeaconGroup = new THREE.Group();
    gpsBeaconGroup.visible = false;
    scene.add(gpsBeaconGroup);

    const pillarMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.35 });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 60, 16), pillarMat);
    pillar.position.y = 30;
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00, wireframe: true });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.1, 8, 24), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    const diamondMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 1.5 });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.4, 0), diamondMat);
    diamond.position.y = 5.0;
    gpsBeaconGroup.add(pillar, ring, diamond);

    ui.onSetGPSWaypoint = (wp) => {
      if (!wp) {
        gpsBeaconGroup.visible = false;
      } else {
        gpsBeaconGroup.position.set(wp.x, 0, wp.z);
        gpsBeaconGroup.visible = true;
      }
    };

    ui.onFastTravel = (targetPos) => {
      if (inSafehouseInterior) {
        inSafehouseInterior = false;
      }
      if (driving) {
        driving.position.set(targetPos.x, 0, targetPos.z);
      } else {
        player.position.set(targetPos.x, 0, targetPos.z);
      }
    };

    // GTA 5 WASTED & BUSTED Screen Respawn Callbacks
    gameplay.onWasted = () => {
      police?.dismissAll();
      ui.showWasted(() => {
        const [respawnX, respawnZ] = findSpawn();
        player.position.set(respawnX, 0, respawnZ);
        if (driving) {
          driving = null;
          player.visible = true;
        }
        sounds.updateEngine(false, 0, 0);
        gameplay.respawnPlayer(1000);
      });
    };

    gameplay.onBusted = () => {
      police?.dismissAll();
      ui.showBusted(() => {
        const [respawnX, respawnZ] = findSpawn();
        player.position.set(respawnX + 3.5, 0, respawnZ + 3.5);
        if (driving) {
          driving = null;
          player.visible = true;
        }
        sounds.updateEngine(false, 0, 0);
        gameplay.respawnPlayer(2500);
      });
    };

    pedestrians = new PedestrianManager(scene);
    pedestrians.init(osm.elements, project, ROAD_W);

    streetLife = new StreetLifeManager(scene, gameplay, ui);
    streetLife.init(roadPts);

    traffic = new TrafficManager(scene);
    traffic.init(osm.elements, project, ROAD_W);

    // Initialize Nigeria Police Force (NPF) Active Pursuit System
    police = new PoliceManager(scene, roadPts, gameplay, ui, sounds);
    police.init();

    started = true;
    hideStatus();
  } catch (err) {
    console.error(err);
    setStatus('Error initializing Ibadan district: ' + err.message);
  }
})();