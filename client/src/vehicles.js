import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';

// ============================================================
// CITYVERSE NG  |  vehicles.js
// High-fidelity Nigerian vehicle models + Rapier physics:
// - Authentic Nigerian Danfo Bus (VW T3 / HiAce) with yellow/black stripes,
//   grille, interior, roof luggage rack, and mudflaps
// - Realistic Saloon Sedan (Toyota Corolla/Camry) with aerodynamic body,
//   projector headlights, alloy rims, disc brakes, and interior
// - Suzuki Carry ("Korope") microvan
// - Realistic wheels with tread, rims, and brake calipers
// - Dynamic forward headlights and reactive LED brake lights
// ============================================================

export const VEHICLE_TYPES = {
  car: {
    name: 'Toyota Saloon Sedan',
    hw: 0.92, hh: 0.46, hl: 2.2, mass: 1250,
    wheelR: 0.35, wheelW: 0.23, rest: 0.35, stiff: 32, slip: 2.3,
    engine: 2300, maxKmh: 115, steerMax: 0.55,
    settle: 0.28,
    modelUrl: null,
    modelHasWheels: false,
    wheelType: 'alloy',
  },
  carry: {
    name: 'Suzuki Carry (Korope)',
    hw: 0.82, hh: 0.68, hl: 1.76, mass: 880,
    wheelR: 0.27, wheelW: 0.24, rest: 0.3, stiff: 28, slip: 2.4,
    engine: 1750, maxKmh: 95, steerMax: 0.6,
    settle: 0.22,
    wheelX: 0.62, wheelZFront: 0.96, wheelZRear: -0.94,
    modelUrl: '/assets/models/vehicles/suzuki-carry.glb',
    modelWheelCenterY: 0.16,
    fallback: 'carry',
    wheelType: 'steel',
  },
  danfo: {
    name: 'Danfo Commercial Bus',
    hw: 1.05, hh: 0.88, hl: 2.65, mass: 2300,
    wheelR: 0.39, wheelW: 0.26, rest: 0.4, stiff: 35, slip: 2.1,
    engine: 3400, maxKmh: 80, steerMax: 0.52,
    settle: 0.34,
    modelUrl: null,
    modelHasWheels: false,
    wheelType: 'steel',
  },
};

const STEP = 1 / 60;

// ---------- Physics world ----------
export class Physics {
  static async create() {
    await RAPIER.init();
    return new Physics();
  }

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = STEP;
    this.vehicles = [];
    this.acc = 0;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(1500, 0.5, 1500).setTranslation(0, -0.5, 0).setFriction(1)
    );
  }

  addBuildings(footprints) {
    let n = 0;
    for (const f of footprints) {
      const v = new Float32Array(f.pts.length * 6);
      f.pts.forEach(([x, z], i) => {
        v.set([x, 0, z], i * 6);
        v.set([x, f.h, z], i * 6 + 3);
      });
      const desc = RAPIER.ColliderDesc.convexHull(v);
      if (!desc) continue;
      this.world.createCollider(desc.setFriction(0.4));
      n++;
    }
    return n;
  }

  step(dt) {
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 3) {
      for (const v of this.vehicles) v.ctrl.updateVehicle(STEP);
      this.world.step();
      this.acc -= STEP;
      steps++;
    }
    if (this.acc > STEP) this.acc = 0;
  }
}

// ---------- Material helpers ----------
const pbrMat = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.3, ...o });
const carPaint = (col) => new THREE.MeshStandardMaterial({
  color: col,
  roughness: 0.25,
  metalness: 0.65,
});
const chromeMat = () => new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.1, metalness: 0.95 });
const darkPlastic = () => new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.85, metalness: 0.1 });
const darkGlass = () => new THREE.MeshStandardMaterial({ color: 0x091016, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 });

function createBox(w, h, l, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Canvas License Plate helper
function makeLicensePlate(text, state = 'OYO STATE') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#1b5e20'; // Green band
  ctx.fillRect(0, 0, 256, 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state, 128, 9);
  ctx.fillStyle = '#004d40';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(text, 128, 45);
  ctx.strokeStyle = '#1b5e20';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 60);

  const tex = new THREE.CanvasTexture(c);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.15), new THREE.MeshBasicMaterial({ map: tex }));
  return mesh;
}

// ---------- 1. REALISTIC DANFO BUS (Volkswagen T3 / HiAce) ----------
function buildDanfoBody(T) {
  const g = new THREE.Group();
  const hw = T.hw, hh = T.hh, hl = T.hl;

  const yellowPaint = carPaint(0xf5b300); // Signature Nigerian Danfo Yellow
  const blackStripe = darkPlastic();
  const whiteRoof = carPaint(0xefede8);
  const glass = darkGlass();
  const chrome = chromeMat();
  const plastic = darkPlastic();

  // 1. Main Lower Body (Yellow with rounded curves)
  const lowerH = hh * 1.15;
  g.add(createBox(hw * 2, lowerH, hl * 2, yellowPaint, 0, -hh + lowerH / 2, 0));

  // 2. Signature Double Black Racing Stripes across both sides and front!
  const stripe1 = createBox(hw * 2.02, 0.12, hl * 2.01, blackStripe, 0, -0.08, 0);
  const stripe2 = createBox(hw * 2.02, 0.12, hl * 2.01, blackStripe, 0, 0.12, 0);
  g.add(stripe1, stripe2);

  // 3. Passenger Cabin Upper Structure
  const cabinH = hh * 0.9;
  const cabinW = hw * 1.94;
  const cabinL = hl * 1.92;
  g.add(createBox(cabinW, cabinH, cabinL, yellowPaint, 0, lowerH - hh + cabinH / 2, -0.05));

  // 4. Large Wrap-around Windows with Black Rubber Frames
  // Windscreen (Front raked glass)
  const windscreen = createBox(cabinW * 0.95, 0.65, 0.04, glass, 0, 0.45, hl - 0.05);
  windscreen.rotation.x = -0.22;
  // Side Windows (Left & Right)
  const sideGlassL = createBox(0.04, 0.55, cabinL * 0.88, glass, hw * 0.98, 0.48, -0.08);
  const sideGlassR = createBox(0.04, 0.55, cabinL * 0.88, glass, -hw * 0.98, 0.48, -0.08);
  // Rear Window
  const rearGlass = createBox(cabinW * 0.88, 0.55, 0.04, glass, 0, 0.48, -hl + 0.06);
  g.add(windscreen, sideGlassL, sideGlassR, rearGlass);

  // Window pillars (A, B, C, D pillars)
  [-hl * 0.45, 0, hl * 0.45].forEach((pz) => {
    [-hw * 0.99, hw * 0.99].forEach((px) => {
      g.add(createBox(0.06, 0.6, 0.12, yellowPaint, px, 0.48, pz));
    });
  });

  // 5. White Roof with longitudinal stamped strengthening ribs
  const roof = createBox(cabinW * 1.02, 0.12, cabinL * 1.02, whiteRoof, 0, hh + 0.15, -0.05);
  g.add(roof);
  [-0.6, -0.2, 0.2, 0.6].forEach((rx) => {
    g.add(createBox(0.04, 0.03, cabinL * 0.9, darkPlastic(), rx, hh + 0.22, -0.05));
  });

  // 6. Heavy-duty Steel Roof Luggage Rack (Traditional Danfo feature)
  const rack = new THREE.Group();
  rack.position.set(0, hh + 0.28, -0.3);
  const rackFrame = createBox(hw * 1.7, 0.04, hl * 1.2, chrome);
  [-hw * 0.8, 0, hw * 0.8].forEach((lx) => {
    [-hl * 0.55, 0, hl * 0.55].forEach((lz) => {
      rack.add(createBox(0.03, 0.12, 0.03, chrome, lx, -0.06, lz));
    });
  });
  rack.add(rackFrame);
  g.add(rack);

  // 7. Front Fascia: Radiator Grille & Twin Round Headlights
  const grille = createBox(hw * 1.4, 0.35, 0.06, plastic, 0, -0.15, hl + 0.01);
  // VW / Danfo Chrome Center Emblem
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16), chrome);
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, -0.15, hl + 0.05);
  g.add(grille, emblem);

  // Twin Headlights with glass lens & chrome rim
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff9e6,
    emissiveIntensity: 1.8,
    roughness: 0.1,
  });
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xff9800,
    emissive: 0xff9800,
    emissiveIntensity: 1.0,
  });

  [-hw * 0.68, hw * 0.68].forEach((lx) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 16), chrome);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(lx, -0.15, hl + 0.04);
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 16), lampMat);
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(lx, -0.15, hl + 0.05);
    g.add(bezel, bulb);

    // Amber corner indicator lights
    const ind = createBox(0.18, 0.16, 0.06, indicatorMat, lx + (lx > 0 ? 0.28 : -0.28), -0.15, hl + 0.02);
    g.add(ind);
  });

  // 8. Front Heavy Bumper & Nigerian License Plate
  const frontBumper = createBox(hw * 2.06, 0.25, 0.2, plastic, 0, -hh + 0.25, hl + 0.08);
  const plateFront = makeLicensePlate('BD 452 KJA', 'OYO STATE');
  plateFront.position.set(0, -hh + 0.25, hl + 0.19);
  g.add(frontBumper, plateFront);

  // 9. Side Mirrors (Driver & Conductor sides)
  [-hw - 0.12, hw + 0.12].forEach((mx) => {
    const stalk = createBox(0.12, 0.03, 0.03, plastic, mx * 0.95, 0.45, hl * 0.65);
    const mirrorCase = createBox(0.04, 0.32, 0.18, plastic, mx, 0.48, hl * 0.65);
    const mirrorGlass = createBox(0.01, 0.28, 0.14, chrome, mx - (mx > 0 ? 0.02 : -0.02), 0.48, hl * 0.65);
    g.add(stalk, mirrorCase, mirrorGlass);
  });

  // 10. Rear Tailgate, Vertical Tri-Color Taillights & Rear Bumper
  const rearBumper = createBox(hw * 2.06, 0.25, 0.2, plastic, 0, -hh + 0.25, -hl - 0.08);
  const plateRear = makeLicensePlate('BD 452 KJA', 'LAGOS/IBADAN');
  plateRear.rotation.y = Math.PI;
  plateRear.position.set(0, -hh + 0.25, -hl - 0.19);
  g.add(rearBumper, plateRear);

  // Rear Motto Slogan ("NO FOOD FOR LAZY MAN")
  const sloganCanvas = document.createElement('canvas');
  sloganCanvas.width = 256; sloganCanvas.height = 48;
  const sctx = sloganCanvas.getContext('2d');
  sctx.fillStyle = '#111111'; sctx.fillRect(0, 0, 256, 48);
  sctx.fillStyle = '#ffeb3b'; sctx.font = 'bold 18px sans-serif'; sctx.textAlign = 'center';
  sctx.fillText('NO FOOD FOR LAZY MAN', 128, 30);
  const sloganMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.18),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sloganCanvas) })
  );
  sloganMesh.rotation.y = Math.PI;
  sloganMesh.position.set(0, 0.12, -hl - 0.06);
  g.add(sloganMesh);

  // Vertical Taillights (Amber top, Red brake middle, White reverse bottom)
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xd50000,
    emissive: 0x990000,
    emissiveIntensity: 0.8,
  });
  [-hw * 0.82, hw * 0.82].forEach((tx) => {
    const cluster = createBox(0.14, 0.46, 0.05, plastic, tx, -0.1, -hl - 0.03);
    const indLight = createBox(0.12, 0.12, 0.03, indicatorMat, tx, 0.05, -hl - 0.05);
    const brkLight = createBox(0.12, 0.16, 0.03, brakeMat, tx, -0.08, -hl - 0.05);
    const revLight = createBox(0.12, 0.1, 0.03, chrome, tx, -0.21, -hl - 0.05);
    g.add(cluster, indLight, brkLight, revLight);
  });
  g.userData.brakeMat = brakeMat;

  // 11. Mud flaps with white reflectors
  [-hw * 0.82, hw * 0.82].forEach((mx) => {
    const flap = createBox(0.28, 0.28, 0.02, plastic, mx, -hh + 0.05, -hl - 0.15);
    const refl = createBox(0.06, 0.06, 0.01, chrome, mx, -hh + 0.08, -hl - 0.17);
    g.add(flap, refl);
  });

  // 12. Interior Cabin Silhouettes
  const dash = createBox(cabinW * 0.85, 0.25, 0.45, plastic, 0, 0.15, hl * 0.65);
  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 16), chrome);
  steer.rotation.x = 0.5;
  steer.position.set(-0.45, 0.32, hl * 0.58);
  g.add(dash, steer);

  return g;
}

// ---------- 2. REALISTIC SALOON CAR (Toyota Sedan) ----------
function buildCarBody(T) {
  const g = new THREE.Group();
  const hw = T.hw, hh = T.hh, hl = T.hl;

  const bodyPaint = carPaint(0x1a365d); // Deep metallic royal blue
  const plastic = darkPlastic();
  const chrome = chromeMat();
  const glass = darkGlass();

  // 1. Sleek Aerodynamic Lower Body
  const lowerH = 0.46;
  const lower = createBox(hw * 2, lowerH, hl * 2, bodyPaint, 0, -0.05, 0);
  g.add(lower);

  // 2. Sculpted Front Hood (sloping forward toward nose)
  const hood = createBox(hw * 1.88, 0.16, hl * 0.72, bodyPaint, 0, 0.14, hl * 0.55);
  hood.rotation.x = -0.08;
  g.add(hood);

  // 3. Passenger Cabin: Sloping windshield, curved roof, raked rear window
  const cabinW = hw * 1.74;
  const cabinL = hl * 1.05;
  const cabinH = 0.52;
  const cabin = createBox(cabinW, cabinH, cabinL, bodyPaint, 0, 0.46, -0.15);
  g.add(cabin);

  // Windscreen
  const frontGlass = createBox(cabinW * 0.94, 0.52, 0.03, glass, 0, 0.44, hl * 0.32);
  frontGlass.rotation.x = -0.45;
  // Rear Window
  const rearGlass = createBox(cabinW * 0.94, 0.48, 0.03, glass, 0, 0.46, -hl * 0.62);
  rearGlass.rotation.x = 0.42;
  // Side Windows
  const sideGlassL = createBox(0.03, 0.38, cabinL * 0.92, glass, hw * 0.88, 0.46, -0.15);
  const sideGlassR = createBox(0.03, 0.38, cabinL * 0.92, glass, -hw * 0.88, 0.46, -0.15);
  g.add(frontGlass, rearGlass, sideGlassL, sideGlassR);

  // Roof panel
  const roof = createBox(cabinW * 0.92, 0.06, cabinL * 0.7, bodyPaint, 0, 0.71, -0.15);
  g.add(roof);

  // 4. Rear Trunk Lid with Subtle Integrated Spoiler
  const trunk = createBox(hw * 1.84, 0.22, hl * 0.58, bodyPaint, 0, 0.18, -hl * 0.68);
  const spoiler = createBox(hw * 1.7, 0.05, 0.12, bodyPaint, 0, 0.31, -hl * 0.92);
  g.add(trunk, spoiler);

  // 5. Front Facia: Honeycomb / Horizontal Grille & Chrome Badge
  const grille = createBox(hw * 1.2, 0.22, 0.04, plastic, 0, 0.02, hl + 0.01);
  const emblem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), chrome);
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, 0.02, hl + 0.03);
  g.add(grille, emblem);

  // Modern Angular Projector Headlights
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfffbe6,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  [-hw * 0.68, hw * 0.68].forEach((lx) => {
    const lamp = createBox(0.32, 0.16, 0.06, headlightMat, lx, 0.04, hl + 0.02);
    lamp.rotation.y = lx > 0 ? -0.15 : 0.15;
    g.add(lamp);
  });

  // Front Bumper, Lower Lip & Nigerian Plate
  const frontBumper = createBox(hw * 1.98, 0.24, 0.18, bodyPaint, 0, -0.16, hl + 0.04);
  const lowerLip = createBox(hw * 1.94, 0.06, 0.14, plastic, 0, -0.27, hl + 0.06);
  const plateFront = makeLicensePlate('DGB 742 AA', 'OYO STATE');
  plateFront.position.set(0, -0.16, hl + 0.14);
  g.add(frontBumper, lowerLip, plateFront);

  // 6. Aerodynamic Side Mirrors
  [-hw - 0.08, hw + 0.08].forEach((mx) => {
    const mirror = createBox(0.14, 0.12, 0.22, bodyPaint, mx, 0.38, hl * 0.26);
    const mirrorRefl = createBox(0.01, 0.1, 0.18, chrome, mx - (mx > 0 ? 0.07 : -0.07), 0.38, hl * 0.26);
    g.add(mirror, mirrorRefl);
  });

  // 7. Rear LED Taillight Strip & License Plate
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xd50000,
    emissive: 0x990000,
    emissiveIntensity: 0.8,
  });
  [-hw * 0.65, hw * 0.65].forEach((tx) => {
    const tail = createBox(0.34, 0.15, 0.05, brakeMat, tx, 0.16, -hl - 0.01);
    g.add(tail);
  });
  g.userData.brakeMat = brakeMat;

  // Rear Bumper & Dual Chrome Exhaust Tips
  const rearBumper = createBox(hw * 1.98, 0.26, 0.18, bodyPaint, 0, -0.14, -hl - 0.04);
  const plateRear = makeLicensePlate('DGB 742 AA', 'OYO STATE');
  plateRear.rotation.y = Math.PI;
  plateRear.position.set(0, -0.12, -hl - 0.14);
  g.add(rearBumper, plateRear);

  [-0.55, 0.55].forEach((ex) => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12), chrome);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(ex, -0.22, -hl - 0.08);
    g.add(tip);
  });

  // 8. Interior Dashboard & Steering Wheel
  const dash = createBox(cabinW * 0.8, 0.2, 0.4, plastic, 0, 0.18, hl * 0.18);
  const steer = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 8, 16), chrome);
  steer.rotation.x = 0.45;
  steer.position.set(-0.35, 0.32, hl * 0.12);
  g.add(dash, steer);

  return g;
}

// ---------- 3. REALISTIC SUZUKI CARRY ("KOROPE") ----------
function buildCarryBody(T) {
  const g = new THREE.Group();
  const hw = T.hw, hh = T.hh, hl = T.hl;

  const whitePaint = carPaint(0xeeeeee);
  const darkMat = darkPlastic();
  const glass = darkGlass();
  const chrome = chromeMat();

  // Forward Cab
  const cabL = hl * 0.9;
  const cab = createBox(hw * 1.95, hh * 1.8, cabL, whitePaint, 0, 0.1, hl * 0.5);
  // High Windscreen
  const win = createBox(hw * 1.8, 0.65, 0.04, glass, 0, 0.5, hl + 0.01);
  win.rotation.x = -0.12;
  // Side windows
  const winL = createBox(0.04, 0.5, cabL * 0.7, glass, hw * 0.98, 0.5, hl * 0.5);
  const winR = createBox(0.04, 0.5, cabL * 0.7, glass, -hw * 0.98, 0.5, hl * 0.5);
  g.add(cab, win, winL, winR);

  // Cargo Bed / Back Canopy with Ribbed sides
  const bedL = hl * 1.1;
  const bed = createBox(hw * 1.98, hh * 1.4, bedL, carPaint(0x1565c0), 0, -0.05, -hl * 0.45);
  g.add(bed);

  // Front bumper, headlights & plate
  const frontBumper = createBox(hw * 2, 0.22, 0.18, darkMat, 0, -hh + 0.2, hl + 0.06);
  const plate = makeLicensePlate('KRP 318 YB', 'OYO STATE');
  plate.position.set(0, -hh + 0.2, hl + 0.16);
  g.add(frontBumper, plate);

  // Headlights
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff9e6,
    emissiveIntensity: 2.0,
  });
  [-hw * 0.65, hw * 0.65].forEach((lx) => {
    g.add(createBox(0.24, 0.18, 0.06, lampMat, lx, -0.05, hl + 0.04));
  });

  // Taillights
  const brakeMat = new THREE.MeshStandardMaterial({
    color: 0xd50000,
    emissive: 0x990000,
    emissiveIntensity: 0.8,
  });
  [-hw * 0.75, hw * 0.75].forEach((tx) => {
    g.add(createBox(0.18, 0.12, 0.05, brakeMat, tx, -0.15, -hl - 0.02));
  });
  g.userData.brakeMat = brakeMat;

  return g;
}

const BUILDERS = {
  car: buildCarBody,
  danfo: buildDanfoBody,
  carry: buildCarryBody,
};

// ---------- REALISTIC WHEEL BUILDER ----------
function createRealisticWheel(T) {
  const group = new THREE.Group();
  const r = T.wheelR;
  const w = T.wheelW;
  const isAlloy = T.wheelType === 'alloy';

  // 1. Profiled Rubber Tire with Tread Ridges
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    metalness: 0.05,
  });
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 24), tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  group.add(tire);

  // Tread Grooves (darker inner rings)
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 1.0 });
  [-w * 0.25, 0, w * 0.25].forEach((tx) => {
    const groove = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 0.015, 6, 24), treadMat);
    groove.rotation.y = Math.PI / 2;
    groove.position.x = tx;
    group.add(groove);
  });

  // 2. Wheel Rim
  if (isAlloy) {
    // Modern 5-Spoke Sporty Alloy Rim with Brake Disc & Red Caliper!
    const alloyMat = new THREE.MeshStandardMaterial({
      color: 0xd5d5d5,
      roughness: 0.2,
      metalness: 0.85,
    });
    // Outer Rim Lip
    const rimLip = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.7, w * 0.9, 20), alloyMat);
    rimLip.rotation.z = Math.PI / 2;
    // 5 Sculpted Spokes
    const spokeGroup = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, r * 0.65, 0.05), alloyMat);
      spoke.rotation.z = (s * Math.PI * 2) / 5;
      spokeGroup.add(spoke);
    }
    // Center Hub Cap with chrome nuts
    const centerCap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.01, 16), alloyMat);
    centerCap.rotation.z = Math.PI / 2;

    // Brake Disc (Steel rotor) & Red Caliper inside wheel
    const discMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });
    const brakeDisc = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.03, 16), discMat);
    brakeDisc.rotation.z = Math.PI / 2;

    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdd1111, roughness: 0.4 });
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, r * 0.35, 0.12), caliperMat);
    caliper.position.set(0, r * 0.25, 0);

    group.add(rimLip, spokeGroup, centerCap, brakeDisc, caliper);
  } else {
    // Heavy-Duty Deep-Dish Steel Wheel with Circular Holes & Chrome Cap (Danfo/Carry)
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.3 });
    const chrome = chromeMat();

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.65, r * 0.65, w * 0.95, 20), steelMat);
    rim.rotation.z = Math.PI / 2;

    // Center Chrome Dome Hubcap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 12, 12), chrome);
    cap.scale.set(0.6, 1, 1);
    cap.position.x = w * 0.45;

    group.add(rim, cap);
  }

  return group;
}

// Load cached GLB models
const modelCache = new Map();
function getModel(url) {
  if (!modelCache.has(url)) {
    modelCache.set(url, new Promise((res, rej) => new GLTFLoader().load(url, res, undefined, rej)));
  }
  return modelCache.get(url);
}

// ---------- Vehicle Class ----------
export class Vehicle {
  constructor(physics, scene, typeKey, x, z, heading = 0) {
    const T = (this.T = VEHICLE_TYPES[typeKey]);
    this.typeKey = typeKey;
    this.physics = physics;
    this.scene = scene;
    const world = physics.world;

    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), heading);
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, 1.5, z)
        .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
        .setCcdEnabled(true)
        .setLinearDamping(0.05)
        .setAngularDamping(0.6)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(T.hw, T.hh, T.hl).setMass(T.mass).setFriction(0.3),
      this.body
    );

    const c = (this.ctrl = world.createVehicleController(this.body));
    c.indexUpAxis = 1;
    c.setIndexForwardAxis = 2;
    const wx = T.wheelX ?? T.hw - 0.1, wy = T.wheelY ?? -T.hh + 0.1;
    const wzF = T.wheelZFront ?? T.hl - 0.65, wzR = T.wheelZRear ?? -(T.hl - 0.65);
    const spots = [[wx, wzF], [-wx, wzF], [wx, wzR], [-wx, wzR]];
    spots.forEach(([sx, sz]) =>
      c.addWheel({ x: sx, y: wy, z: sz }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, T.rest, T.wheelR)
    );
    for (let i = 0; i < 4; i++) {
      c.setWheelSuspensionStiffness(i, T.stiff);
      c.setWheelSuspensionCompression(i, 2.4);
      c.setWheelSuspensionRelaxation(i, 2.8);
      c.setWheelMaxSuspensionTravel(i, 0.3);
      c.setWheelMaxSuspensionForce(i, 100000);
      c.setWheelFrictionSlip(i, T.slip);
      c.setWheelSideFrictionStiffness(i, 1);
    }

    // Visuals
    this.group = new THREE.Group();
    const builder = BUILDERS[T.fallback ?? typeKey] || BUILDERS.car;
    this.bodyVisual = builder(T);
    this.group.add(this.bodyVisual);

    // Realistic Wheels
    this.wheels = [];
    for (let i = 0; i < 4; i++) {
      const w = createRealisticWheel(T);
      w.rotation.order = 'YXZ';
      this.group.add(w);
      this.wheels.push(w);
    }

    // Dynamic Forward Headlight Spotlights
    this.headlights = [];
    [-T.hw * 0.65, T.hw * 0.65].forEach((lx) => {
      const spot = new THREE.SpotLight(0xfff8e7, 1.8, 35, Math.PI / 6, 0.4, 1.5);
      spot.position.set(lx, 0.2, T.hl + 0.2);
      spot.target.position.set(lx, -0.5, T.hl + 18);
      this.group.add(spot, spot.target);
      this.headlights.push(spot);
    });

    scene.add(this.group);
    if (T.modelUrl) this.loadModel(T);

    this.steer = 0;
    this.input = { throttle: 0, steer: 0, handbrake: false };
    physics.vehicles.push(this);
    this.sync();
  }

  loadModel(T) {
    getModel(T.modelUrl).then((gltf) => {
      const m = gltf.scene.clone(true);
      m.traverse((o) => { if (o.isMesh) o.castShadow = true; });

      const wheelNodes = ['wheel_FL', 'wheel_FR', 'wheel_RL', 'wheel_RR'].map((n) => m.getObjectByName(n));
      const hasWheelNodes = wheelNodes.every(Boolean);
      if (hasWheelNodes) wheelNodes.forEach((n) => n.parent.remove(n));

      const b0 = new THREE.Box3().setFromObject(m);
      const s = (T.hl * 2) / (b0.getSize(new THREE.Vector3()).z || 1);
      m.scale.multiplyScalar(s);
      const b = new THREE.Box3().setFromObject(m);
      const centre = b.getCenter(new THREE.Vector3());
      m.position.x -= centre.x;
      m.position.z -= centre.z;

      const wy = T.wheelY ?? -T.hh + 0.1;
      const settle = T.settle ?? T.rest * 0.85;
      const modelWheelY = (T.modelWheelCenterY ?? (b0.min.y + T.wheelR)) * s;
      m.position.y += wy - settle - modelWheelY;

      this.group.remove(this.bodyVisual);
      this.group.add(m);

      if (hasWheelNodes) {
        wheelNodes.forEach((node, i) => {
          this.wheels[i].clear();
          node.position.set(0, 0, 0);
          node.rotation.set(0, 0, 0);
          node.scale.setScalar(s);
          this.wheels[i].add(node);
        });
      }
    }).catch(() => {});
  }

  get position() { const t = this.body.translation(); return new THREE.Vector3(t.x, t.y, t.z); }
  get forward() { return new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion); }
  get heading() { const f = this.forward; return Math.atan2(f.x, f.z); }
  get forwardSpeed() { const v = this.body.linvel(); return v.x * this.forward.x + v.y * this.forward.y + v.z * this.forward.z; }
  get kmh() { return Math.abs(this.forwardSpeed) * 3.6; }

  setInput(i) { Object.assign(this.input, i); }

  update(dt) {
    const T = this.T, c = this.ctrl, inp = this.input;
    const fs = this.forwardSpeed, kmh = Math.abs(fs) * 3.6;
    let engine = 0, brake = 0;

    const isBraking = (inp.throttle < 0 && fs > 1) || (inp.throttle > 0 && fs < -1) || inp.handbrake;

    // Reactive Brake Lights
    if (this.bodyVisual && this.bodyVisual.userData.brakeMat) {
      this.bodyVisual.userData.brakeMat.emissiveIntensity = isBraking ? 2.8 : 0.6;
    }

    if (inp.throttle > 0) {
      if (fs < -1) brake = 25;
      else engine = kmh < T.maxKmh ? T.engine * inp.throttle : 0;
    } else if (inp.throttle < 0) {
      if (fs > 1) brake = 28;
      else engine = kmh < 30 ? T.engine * 0.55 * inp.throttle : 0;
    } else brake = 2.5;

    for (let i = 0; i < 4; i++) {
      c.setWheelEngineForce(i, i >= 2 ? engine : 0);
      c.setWheelBrake(i, brake);
    }
    if (inp.handbrake) {
      c.setWheelBrake(2, 60); c.setWheelBrake(3, 60);
      c.setWheelEngineForce(2, 0); c.setWheelEngineForce(3, 0);
    }

    const target = (-inp.steer * T.steerMax) / (1 + kmh / 40);
    this.steer += (target - this.steer) * Math.min(1, dt * 8);
    c.setWheelSteering(0, this.steer);
    c.setWheelSteering(1, this.steer);

    this.sync();
  }

  sync() {
    const t = this.body.translation(), r = this.body.rotation();
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
    for (let i = 0; i < 4; i++) {
      const cp = this.ctrl.wheelChassisConnectionPointCs(i);
      const len = this.ctrl.wheelSuspensionLength(i) ?? this.T.rest;
      const w = this.wheels[i];
      w.position.set(cp.x, cp.y - len, cp.z);
      w.rotation.set(this.ctrl.wheelRotation(i) ?? 0, i < 2 ? this.steer : 0, 0);
    }
  }

  resetUpright() {
    const t = this.body.translation();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.heading);
    this.body.setTranslation({ x: t.x, y: t.y + 1.5, z: t.z }, true);
    this.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
}