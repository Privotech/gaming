// ============================================================
// CITYVERSE NG  |  streetLife.js
// Street Life & Nigerian Interactions:
// 1. Roadside Traffic Hawkers (Gala & La Casera, Roasted Corn & Pear, Pure Water)
// 2. Dugbe Petrol Filling Station (Canopy, Fuel pumps, Price board, Refueling)
// 3. Police / VIO Roadside Checkpoint (Barricade, Officers, Inspection banter)
// ============================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

function box(w, h, l, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

export class StreetLifeManager {
  constructor(scene, gameplay, ui) {
    this.scene = scene;
    this.gameplay = gameplay;
    this.ui = ui;
    this.hawkers = [];
    this.fillingStation = null;
    this.checkpoint = null;
  }

  init(roadPts) {
    this.setupHawkers(roadPts);
    this.setupFillingStation(roadPts);
    this.setupPoliceCheckpoint(roadPts);
  }

  // ---------- 1. ROADSIDE HAWKERS ----------
  setupHawkers(roadPts) {
    const hawkerTypes = [
      {
        id: 'gala',
        name: 'Gala & Chilled La Casera Hawker',
        item: 'Gala Sausage & Apple La Casera',
        cost: 400,
        energy: 25,
        quote: '"Hot Gala and cold La Casera dey o!"',
        color: 0xd32f2f,
      },
      {
        id: 'corn',
        name: 'Roasted Corn & Pear Seller',
        item: 'Roasted Corn & African Pear (Ube)',
        cost: 350,
        energy: 22,
        quote: '"Soft corn and sweet pear fresh from charcoal!"',
        color: 0xfbc02d,
      },
      {
        id: 'water',
        name: 'Cold Pure Water Seller',
        item: 'Icy Pure Water Sachet',
        cost: 50,
        energy: 12,
        quote: '"Pure water, ice water, ₦50!"',
        color: 0x1976d2,
      },
    ];

    // Place hawkers at busy roadside corners
    for (let i = 0; i < hawkerTypes.length && i < roadPts.length; i++) {
      const hType = hawkerTypes[i];
      const pt = roadPts[i * 7 % roadPts.length];
      const [rx, rz, dx, dz] = pt;
      const nx = -dz, nz = dx;
      const hx = rx + nx * 5.2;
      const hz = rz + nz * 5.2;

      const group = new THREE.Group();
      group.position.set(hx, 0, hz);

      // Character body
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a });
      const clothesMat = new THREE.MeshStandardMaterial({ color: hType.color });
      const body = box(0.36, 0.52, 0.22, clothesMat, 0, 1.05, 0);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
      head.position.y = 1.5;

      // Goods Tray / Container
      if (hType.id === 'gala') {
        // Transparent clear glass display box on wooden stand
        const glassBox = box(0.65, 0.35, 0.45, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), 0, 0.95, 0.35);
        const stand = box(0.06, 0.8, 0.06, new THREE.MeshStandardMaterial({ color: 0x5d4037 }), 0, 0.4, 0.35);
        group.add(glassBox, stand);
      } else if (hType.id === 'corn') {
        // Charcoal grill stand with glowing red coals & roasting cobs
        const grill = box(0.6, 0.45, 0.5, new THREE.MeshStandardMaterial({ color: 0x212121 }), 0, 0.7, 0.35);
        const coals = box(0.5, 0.06, 0.4, new THREE.MeshStandardMaterial({ color: 0xd84315, emissive: 0xff3d00, emissiveIntensity: 1.2 }), 0, 0.95, 0.35);
        group.add(grill, coals);
      } else {
        // Blue plastic basin of pure water sachets
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.25, 0.32, 16), new THREE.MeshStandardMaterial({ color: 0x0277bd }));
        basin.position.set(0, 0.85, 0.35);
        group.add(basin);
      }

      // Interactive ring on ground
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.1, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd54f, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      group.add(body, head, ring);
      this.scene.add(group);

      this.hawkers.push({
        ...hType,
        pos: new THREE.Vector3(hx, 0, hz),
        mesh: group,
      });
    }
  }

  // ---------- 2. DUGBE PETROL FILLING STATION ----------
  setupFillingStation(roadPts) {
    if (!roadPts || !roadPts.length) return;
    const pt = roadPts[Math.min(10, roadPts.length - 1)];
    const [rx, rz, dx, dz] = pt;
    const angle = Math.atan2(dx, dz);
    const nx = -dz, nz = dx;
    const sx = rx + nx * 14.0;
    const sz = rz + nz * 14.0;

    const g = new THREE.Group();
    g.position.set(sx, 0, sz);
    g.rotation.y = angle;

    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x1565c0, roughness: 0.3 }); // NNPC Royal Blue
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xbcbec0, roughness: 0.9 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.4 });

    // Paved Forecourt Slab
    const forecourt = box(22, 0.12, 16, concreteMat, 0, 0.06, 0);

    // Large Illuminated Overhead Canopy Roof
    const canopyRoof = box(18, 0.85, 12, canopyMat, 0, 5.2, 0);
    // Yellow/White brand fascia band
    const fascia = box(18.2, 0.35, 12.2, yellowMat, 0, 5.2, 0);
    g.add(forecourt, canopyRoof, fascia);

    // 4 Heavy Structural Support Columns
    [-6, 6].forEach((cx) => {
      [-3.5, 3.5].forEach((cz) => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 16), whiteMat);
        col.position.set(cx, 2.6, cz);
        col.castShadow = true;
        g.add(col);
      });
    });

    // 2 Fuel Dispenser Pump Islands
    [-3.8, 3.8].forEach((px) => {
      const island = box(1.8, 0.22, 5.5, concreteMat, px, 0.18, 0);
      const pump = box(0.95, 1.8, 0.85, whiteMat, px, 1.1, 0);
      // Digital meter screen
      const screen = box(0.65, 0.45, 0.88, new THREE.MeshBasicMaterial({ color: 0x00e676 }), px, 1.45, 0);
      // Nozzles & Hoses
      const hoseL = box(0.08, 0.9, 0.08, yellowMat, px + 0.52, 0.9, 0);
      const hoseR = box(0.08, 0.9, 0.08, yellowMat, px - 0.52, 0.9, 0);
      g.add(island, pump, screen, hoseL, hoseR);
    });

    // Tall Price Totem Signboard ("PMS ₦750/L")
    const signPost = box(0.2, 6.5, 0.2, whiteMat, -9.5, 3.25, 6.5);
    const signBoard = box(2.6, 2.8, 0.25, canopyMat, -9.5, 5.2, 6.5);

    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d47a1'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('DUGBE PETROL', 128, 48);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px sans-serif';
    ctx.fillText('PMS FUEL', 128, 95);
    ctx.fillStyle = '#00e676'; ctx.font = 'bold 36px monospace';
    ctx.fillText('₦750.00', 128, 145);
    ctx.fillStyle = '#bbdefb'; ctx.font = '14px sans-serif';
    ctx.fillText('DIESEL: ₦1,150.00', 128, 195);
    ctx.fillText('[E] REFUEL HERE', 128, 230);

    const pricePlate = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.5),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) })
    );
    pricePlate.position.set(-9.5, 5.2, 6.64);
    g.add(signPost, signBoard, pricePlate);

    // Canopy under-lighting (Pointlights for bright forecourt at night)
    [-3.8, 3.8].forEach((lx) => {
      const light = new THREE.PointLight(0xfff8e7, 2.2, 18);
      light.position.set(lx, 4.8, 0);
      g.add(light);
    });

    this.scene.add(g);

    this.fillingStation = {
      pos: new THREE.Vector3(sx, 0, sz),
      name: 'Dugbe Petrol Filling Station',
    };
  }

  // ---------- 3. POLICE / VIO CHECKPOINT ----------
  setupPoliceCheckpoint(roadPts) {
    if (!roadPts || !roadPts.length) return;
    const pt = roadPts[Math.min(18, roadPts.length - 1)];
    const [rx, rz, dx, dz] = pt;
    const angle = Math.atan2(dx, dz);
    const nx = -dz, nz = dx;
    const cx = rx + nx * 3.5;
    const cz = rz + nz * 3.5;

    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = angle;

    const stripedBarMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.4 });

    // Roadside Striped Traffic Barrier
    const barrier = box(3.4, 0.25, 0.08, stripedBarMat, 0, 0.75, 0);
    // Reflective white stripes on barrier
    [-1.2, -0.4, 0.4, 1.2].forEach((sx) => {
      barrier.add(box(0.25, 0.26, 0.09, whiteMat, sx, 0, 0));
    });
    // Two tripod support legs
    [-1.5, 1.5].forEach((px) => {
      const legL = box(0.06, 0.9, 0.06, blackMat, px, 0.45, -0.25);
      legL.rotation.x = -0.3;
      const legR = box(0.06, 0.9, 0.06, blackMat, px, 0.45, 0.25);
      legR.rotation.x = 0.3;
      g.add(legL, legR);
    });
    g.add(barrier);

    // "STOP - POLICE / VIO CHECKPOINT" Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 384; signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#b71c1c'; sctx.fillRect(0, 0, 384, 128);
    sctx.fillStyle = '#ffffff'; sctx.font = 'bold 34px sans-serif'; sctx.textAlign = 'center';
    sctx.fillText('STOP • POLICE', 192, 50);
    sctx.fillStyle = '#ffeb3b'; sctx.font = 'bold 22px sans-serif';
    sctx.fillText('VIO ROAD SAFETY CHECK', 192, 92);
    sctx.strokeStyle = '#ffffff'; sctx.lineWidth = 4;
    sctx.strokeRect(4, 4, 376, 120);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.85),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signMesh.position.set(0, 1.45, 0.06);
    g.add(signMesh);

    // Two Police / VIO Officers in Uniform (Dark blue/black + reflective yellow vest)
    [-1.2, 1.2].forEach((ox) => {
      const officer = new THREE.Group();
      officer.position.set(ox, 0, -1.1);

      const offTorso = box(0.38, 0.52, 0.22, blackMat, 0, 1.05, 0);
      // High-visibility yellow safety vest
      const vest = box(0.39, 0.44, 0.23, yellowMat, 0, 1.05, 0);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
      head.position.y = 1.48;
      // Police Beret cap
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), blackMat);
      beret.position.set(0, 1.58, 0);
      beret.rotation.z = -0.15;

      officer.add(offTorso, vest, head, beret);
      g.add(officer);
    });

    this.scene.add(g);

    this.checkpoint = {
      pos: new THREE.Vector3(cx, 0, cz),
      name: 'Police / VIO Roadside Checkpoint',
      cleared: false,
    };
  }

  getNearbyHawker(pos, radius = 3.8) {
    for (const h of this.hawkers) {
      if (pos.distanceTo(h.pos) < radius) return h;
    }
    return null;
  }

  getNearbyFillingStation(pos, radius = 10.0) {
    if (!this.fillingStation) return null;
    return pos.distanceTo(this.fillingStation.pos) < radius ? this.fillingStation : null;
  }

  getNearbyCheckpoint(pos, radius = 8.5) {
    if (!this.checkpoint) return null;
    return pos.distanceTo(this.checkpoint.pos) < radius ? this.checkpoint : null;
  }

  // Handle Hawker Purchase
  buyFromHawker(hawker) {
    if (this.gameplay.money < hawker.cost) {
      return { success: false, msg: `Not enough cash! You need ₦${hawker.cost}` };
    }
    this.gameplay.money -= hawker.cost;
    this.gameplay.stamina = Math.min(100, this.gameplay.stamina + hawker.energy);
    sounds.playEat();
    return {
      success: true,
      msg: `Bought ${hawker.item}! +${hawker.energy}% Energy`,
    };
  }

  // Handle Refueling at Filling Station
  refuelVehicle(vehicle) {
    const cost = 3500;
    if (this.gameplay.money < cost) {
      return { success: false, msg: `Not enough cash to refuel! Need ₦${cost}` };
    }
    this.gameplay.money -= cost;
    sounds.playCash();
    return {
      success: true,
      msg: `Vehicle fully refueled at Dugbe Station! (₦${cost})`,
    };
  }

  // Handle Police & VIO Checkpoint Interactions
  inspectCheckpoint(action) {
    if (action === 'particulars') {
      sounds.playPoliceWhistle();
      return {
        success: true,
        officer: 'Inspector Adeleke',
        title: 'Vehicle Papers Verified! 📄',
        reply: '"Ehen! Everything complete: Driver\'s License, Insurance, Roadworthiness valid! Na correct citizen be this. Oya carry go, safe journey oga!"',
        cost: 0,
      };
    }

    if (action === 'settle') {
      const bribe = 500;
      if (this.gameplay.money < bribe) {
        return {
          success: false,
          officer: 'Corporal Friday',
          title: 'Settlement Failed! ❌',
          reply: '"You no even get ₦500 for pure water and you dey negotiate? Oya park one side!"',
          cost: 0,
        };
      }
      this.gameplay.money -= bribe;
      sounds.playCash();
      return {
        success: true,
        officer: 'Corporal Friday',
        title: 'Settled! 🤝',
        reply: '"Hahaha! God bless your hustle my brother! You understand the road. Oya match throttle, clear the road for others!"',
        cost: bribe,
      };
    }

    if (action === 'banter') {
      const pass = Math.random() < 0.72;
      if (pass) {
        sounds.playPoliceWhistle();
        return {
          success: true,
          officer: 'Inspector Adeleke',
          title: 'Charisma Passed! 😂',
          reply: '"Ah! Your wife dey labour ward for UCH Ibadan? Why you no talk since! Oya rush go meet her quick before twins land! Free road!"',
          cost: 0,
        };
      } else {
        const fine = 1000;
        this.gameplay.money = Math.max(0, this.gameplay.money - fine);
        return {
          success: false,
          officer: 'Sergeant Musa',
          title: 'Lie Detected! 👮',
          reply: '"Story story! Last week na the same lie you tell my colleague for Challenge! Oya pay ₦1,000 spot obstruction fine now!"',
          cost: fine,
        };
      }
    }

    if (action === 'zoom') {
      sounds.playPoliceSiren();
      sounds.playPoliceWhistle();
      return {
        success: false,
        officer: 'Dugbe Highway Patrol',
        title: 'SIREN BLARING! 🚨',
        reply: '"Halt! Stop that vehicle! Ole! You zoomed past the checkpoint without clearance! Drive carefully before VIO spikes catch you!"',
        cost: 0,
      };
    }

    return { success: true, reply: '"Clear road!"' };
  }
}
