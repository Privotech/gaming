// ============================================================
// CITYVERSE NG  |  housing.js
// Housing & Architecture of Ibadan:
// - Cocoa House 26-storey landmark at Dugbe
// - Traditional Face-Me-I-Face-You compounds (external stairs, balconies,
//   louvres, burglar bars, GeePee water tanks, antennas)
// - Ground-floor shops, barber shops, generator cages, Amala Buka
// - Enterable Safehouse Apartment (living room, spinning ceiling fan,
//   balcony with street view, bed for sleeping/time change)
// ============================================================

import * as THREE from 'three';
import {
  createExternalConcreteStaircase,
  createWoodenBalcony,
  createRealisticGPTank,
} from './faceMeAssets.js';

export class HousingManager {
  constructor(scene, physics, player) {
    this.scene = scene;
    this.physics = physics;
    this.player = player;
    this.interactables = [];
    this.animatedObjects = []; // spinning fans, smoke particles
    this.safehouses = [];
    this.bukaStalls = [];
    this.propertySigns = [];
    this.currentInterior = null; // null if outside, or safehouse object if inside
    this.outsidePlayerPos = new THREE.Vector3();
    this.footprints = null;
    this.grid = null;
    this.CELL = 50;
  }

  registerFootprint(cx, cz, width, depth, h = 6.0) {
    const hw = width / 2, hd = depth / 2;
    const pts = [
      [cx - hw, cz - hd],
      [cx + hw, cz - hd],
      [cx + hw, cz + hd],
      [cx - hw, cz + hd],
    ];
    const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const f = { pts, h, minX, maxX, minZ, maxZ };
    if (this.footprints) this.footprints.push(f);
    if (this.grid) {
      for (let cxCell = Math.floor(f.minX / this.CELL); cxCell <= Math.floor(f.maxX / this.CELL); cxCell++) {
        for (let czCell = Math.floor(f.minZ / this.CELL); czCell <= Math.floor(f.maxZ / this.CELL); czCell++) {
          const k = `${cxCell},${czCell}`;
          if (!this.grid.has(k)) this.grid.set(k, []);
          this.grid.get(k).push(f);
        }
      }
    }
  }

  init(roadPts, footprints = null, grid = null, CELL = 50) {
    this.footprints = footprints;
    this.grid = grid;
    this.CELL = CELL;
    this.buildCocoaHouse();
    this.buildDistrictShopsAndCompounds(roadPts, footprints);
    this.setupEnterableSafehouse();
  }

  // ---------- 1. COCOA HOUSE (26-Storey Dugbe Landmark) ----------
  buildCocoaHouse() {
    const group = new THREE.Group();
    // Place at the center of Dugbe
    const cx = -15, cz = 25;
    group.position.set(cx, 0, cz);
    this.registerFootprint(cx, cz, 42, 34, 88);

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x6e4327, // Cocoa bronze/terracotta
      roughness: 0.6,
      metalness: 0.3,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      roughness: 0.1,
      metalness: 0.85,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xd2c7b5,
      roughness: 0.9,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Podium / Plaza base (Ground + Mezzanine)
    const podiumGeo = new THREE.BoxGeometry(42, 6, 34);
    const podium = new THREE.Mesh(podiumGeo, concreteMat);
    podium.position.y = 3;
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    // Entrance Canopy & Pillars
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 12), bronzeMat);
    canopy.position.set(0, 5, 21);
    group.add(canopy);

    [-8, -3, 3, 8].forEach((px) => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 12), concreteMat);
      pillar.position.set(px, 2.5, 25);
      pillar.castShadow = true;
      group.add(pillar);
    });

    // 26-Storey Tower shaft (88 metres high)
    const towerH = 86;
    const towerW = 24;
    const towerD = 18;

    // Floor-by-floor banded curtain wall
    const floors = 26;
    const floorH = towerH / floors;

    for (let f = 0; f < floors; f++) {
      const fy = 6 + f * floorH + floorH / 2;
      // Concrete/bronze spandrel band
      const spandrel = new THREE.Mesh(
        new THREE.BoxGeometry(towerW, floorH * 0.42, towerD),
        bronzeMat
      );
      spandrel.position.y = fy - floorH * 0.28;
      spandrel.castShadow = true;
      group.add(spandrel);

      // Glass window ribbon
      const windowRibbon = new THREE.Mesh(
        new THREE.BoxGeometry(towerW + 0.1, floorH * 0.58, towerD + 0.1),
        glassMat
      );
      windowRibbon.position.y = fy + floorH * 0.2;
      group.add(windowRibbon);
    }

    // Vertical structural corner fins
    [-towerW / 2, towerW / 2].forEach((fx) => {
      [-towerD / 2, towerD / 2].forEach((fz) => {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(1.6, towerH, 1.6), concreteMat);
        fin.position.set(fx, 6 + towerH / 2, fz);
        fin.castShadow = true;
        group.add(fin);
      });
    });

    // Iconic pitched penthouse roof structure
    const roofH = 10;
    const roofGeo = new THREE.ConeGeometry(towerW * 0.6, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, bronzeMat);
    roof.position.set(0, 6 + towerH + roofH / 2, 0);
    roof.scale.set(1, 1, towerD / towerW);
    group.add(roof);

    // Communications / Radio Antenna on summit
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 24, 8), goldMat);
    mast.position.set(0, 6 + towerH + roofH + 12, 0);
    group.add(mast);

    // Top blinking aviation beacon
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff1100 })
    );
    beacon.position.set(0, 6 + towerH + roofH + 24, 0);
    group.add(beacon);

    // Cocoa House Signboard Banner
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#f5dfbb';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COCOA HOUSE', 256, 60);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#e5a823';
    ctx.fillText('DUGBE, IBADAN • EST. 1965', 256, 100);

    const signTex = new THREE.CanvasTexture(canvas);
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4 })
    );
    signMesh.position.set(0, 7.8, 17.1);
    group.add(signMesh);

    // Plaza trees & benches
    for (let i = -14; i <= 14; i += 7) {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.8, 2.5), concreteMat);
      planter.position.set(i, 0.4, 28);
      group.add(planter);

      const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 2.5, 6), bronzeMat);
      treeTrunk.position.set(i, 1.8, 28);
      const treeTop = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.6),
        new THREE.MeshStandardMaterial({ color: 0x2e6b35, roughness: 0.9 })
      );
      treeTop.position.set(i, 3.8, 28);
      group.add(treeTrunk, treeTop);
    }

    this.scene.add(group);
    this.cocoaHousePos = new THREE.Vector3(cx, 0, cz);
  }

  // ---------- 2. RESIDENTIAL FACE-ME-I-FACE-YOU & SHOPS ----------
  buildDistrictShopsAndCompounds(roadPts, footprints) {
    if (!roadPts || !roadPts.length) return;

    // Materials
    const rustZincMat = new THREE.MeshStandardMaterial({ color: 0x8b4528, roughness: 0.8, metalness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.9 });
    const blueTarpMat = new THREE.MeshStandardMaterial({ color: 0x1d58a8, roughness: 0.6 });
    const blackGPMaterial = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.35, metalness: 0.1 });
    const yellowStripeMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.6 });

    // Place 14 street stalls, shops, and compounds alongside roads
    const shopNames = [
      { name: 'IYA MORIA AMALA BUKA', sub: 'Amala, Ewedu, Gbegiri & Ogunfe', type: 'buka' },
      { name: 'MAMA BISI PROVISIONS', sub: 'Cold Drinks, Biscuits & Bread', type: 'provisions' },
      { name: 'ELEGANCE BARBERSHOP', sub: 'Classic Haircuts & Clipper Sharpening', type: 'barber' },
      { name: 'KHADIJAT CHEMIST', sub: 'Drugs, Paracetamol & Injections', type: 'chemist' },
      { name: 'BLESSED ELECTRICALS', sub: 'Generator Parts & Fan Repairs', type: 'electrical' },
      { name: 'ALHAJI TAILOR & TEXTILES', sub: 'Aso Ebi & Native Attire', type: 'tailor' },
      { name: 'DUGBE COCOA STALL', sub: 'Chilled Pure Water & Minerals', type: 'buka' },
    ];

    const sampled = [];
    for (let i = 0; i < roadPts.length && sampled.length < 12; i += 3) {
      sampled.push(roadPts[i]);
    }

    sampled.forEach((pt, idx) => {
      const [rx, rz, dx, dz] = pt;
      const angle = Math.atan2(dx, dz);
      // Place shop on roadside
      const side = idx % 2 === 0 ? 1 : -1;
      const nx = -dz * side, nz = dx * side;
      const sx = rx + nx * 6.5;
      const sz = rz + nz * 6.5;

      const shopData = shopNames[idx % shopNames.length];
      const g = new THREE.Group();
      g.position.set(sx, 0, sz);
      g.rotation.y = angle + (side > 0 ? Math.PI / 2 : -Math.PI / 2);

      if (shopData.type === 'buka') {
        // Amala Buka Stall with Benches, Big Umbrella & Pots
        this.createBukaJoint(g, shopData, woodMat, blueTarpMat);
        this.bukaStalls.push({
          pos: new THREE.Vector3(sx, 0, sz),
          name: shopData.name,
        });
      } else {
        // Roadside Shop with Awning, Signboard & Generator in welded cage
        this.createShopFront(g, shopData, concreteMat, yellowStripeMat);
        // Generator Cage outside shop
        this.createGeneratorCage(g, 2.6, 1.4);
      }

      // Add Face-Me-I-Face-You compounds details (Stairs, Balcony, GP Tank, TV Aerial)
      if (idx % 2 === 0) {
        this.createCompoundArchitecture(g, rustZincMat, woodMat, blackGPMaterial);
      }

      // Register collision footprint for shop/compound so human and cars cannot walk/drive through it!
      this.registerFootprint(sx, sz, 9.6, 7.6, 6.5);

      this.scene.add(g);
    });
  }

  // Buka Stall (Amala, Ewedu, Benches, Umbrellas, Pots)
  createBukaJoint(parent, shopData, woodMat, canopyMat) {
    const group = new THREE.Group();

    // Wooden stall counter & shack
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 1.2), woodMat);
    counter.position.set(0, 0.55, 0);
    counter.castShadow = true;
    group.add(counter);

    // Large Buka Umbrella (Yellow/Green)
    const umbrellaPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 3, 8),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    umbrellaPole.position.set(2.2, 1.5, 0.8);
    const umbrellaTop = new THREE.Mesh(
      new THREE.ConeGeometry(2.4, 0.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.5 })
    );
    umbrellaTop.position.set(2.2, 3, 0.8);
    group.add(umbrellaPole, umbrellaTop);

    // Wooden Benches for customers
    [-1.2, 1.2].forEach((bz) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.45, 0.5), woodMat);
      bench.position.set(2.2, 0.22, bz);
      bench.castShadow = true;
      group.add(bench);
    });

    // Cooking Cauldrons / Aluminum Pots on burner
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.3, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.4 })
    );
    pot.position.set(-0.8, 1.25, 0);
    group.add(pot);

    // Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 384;
    signCanvas.height = 96;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = '#ffcc00';
    sctx.fillRect(0, 0, 384, 96);
    sctx.fillStyle = '#990000';
    sctx.font = 'bold 28px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText(shopData.name, 192, 42);
    sctx.fillStyle = '#222';
    sctx.font = '16px sans-serif';
    sctx.fillText(shopData.sub, 192, 75);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 0.9),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signMesh.position.set(0, 2.2, 0.61);
    group.add(signMesh);

    // Interactive prompt circle
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.05, 1.8);
    group.add(ring);

    parent.add(group);
  }

  // Commercial Roadside Shop (Provisions / Chemist / Barber)
  createShopFront(parent, shopData, wallMat, trimMat) {
    const group = new THREE.Group();

    // Shop box structure
    const shopBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 3), wallMat);
    shopBody.position.set(0, 1.6, -1);
    shopBody.castShadow = true;
    shopBody.receiveShadow = true;
    group.add(shopBody);

    // Shop front canopy / metal awning
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.4), trimMat);
    awning.position.set(0, 2.7, 0.8);
    awning.rotation.x = 0.2;
    awning.castShadow = true;
    group.add(awning);

    // Signboard
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 400;
    signCanvas.height = 100;
    const sctx = signCanvas.getContext('2d');
    sctx.fillStyle = shopData.type === 'chemist' ? '#107c41' : shopData.type === 'barber' ? '#0b4f6c' : '#c8102e';
    sctx.fillRect(0, 0, 400, 100);
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 24px sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText(shopData.name, 200, 44);
    sctx.font = '15px sans-serif';
    sctx.fillStyle = '#ffea00';
    sctx.fillText(shopData.sub, 200, 78);

    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 0.85),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(signCanvas) })
    );
    signMesh.position.set(0, 3.0, 0.52);
    group.add(signMesh);

    // Wooden shop door & metal burglar protection bars
    const door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 })
    );
    door.position.set(0, 1.1, 0.52);
    group.add(door);

    parent.add(group);
  }

  // Small Petrol Generator in Welded Security Cage outside
  createGeneratorCage(parent, x, z) {
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      wireframe: true,
      roughness: 0.5,
    });
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), cageMat);
    cage.position.set(x, 0.4, z);

    // Generator body (Yellow/Red small generator)
    const genBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd92525, roughness: 0.6 })
    );
    genBody.position.set(x, 0.35, z);

    // Exhaust pipe
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    pipe.position.set(x + 0.25, 0.65, z);

    parent.add(cage, genBody, pipe);
  }

  // Traditional Face-Me-I-Face-You exterior details:
  // External concrete staircase, wooden balcony with drying clothes, and realistic black GeePee water storage tank
  createCompoundArchitecture(parent, roofMat, woodMat, gpMat) {
    const compound = new THREE.Group();
    compound.position.set(-3.5, 0, -2);

    // 1. Realistic Black GP Water Storage Tank on heavy-duty steel scaffold tower
    const gpTank = createRealisticGPTank({
      capacity: '1500L',
      radius: 0.72,
      height: 1.65,
      standHeight: 3.4,
      hasScaffoldStand: true,
      hasPlumbing: true,
    });
    gpTank.position.set(-2.4, 0, -1.2);
    compound.add(gpTank);

    // 2. External Cantilevered Concrete Staircase leading to upper floor
    const stairs = createExternalConcreteStaircase({
      stepsCount: 10,
      stepWidth: 1.25,
      stepHeight: 0.24,
      stepDepth: 0.32,
      hasLanding: true,
    });
    stairs.position.set(0.2, 0, -1.6);
    compound.add(stairs);

    // 3. Wooden Balcony with X-brace balustrades, timber canopy, and hanging clothes
    const balcony = createWoodenBalcony({
      width: 3.8,
      depth: 1.5,
      height: 2.7,
      hasRoofCanopy: true,
      hasClothesLine: true,
    });
    balcony.position.set(0.6, 2.4, 1.8);
    compound.add(balcony);

    // 4. Rooftop TV Aerial / Yagi Antenna
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
    );
    mast.position.set(1.5, 5.5, 0);
    [-0.4, 0, 0.4].forEach((ay) => {
      const crossbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
      );
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(1.5, 6.8 + ay, 0);
      compound.add(crossbar);
    });
    compound.add(mast);

    parent.add(compound);
  }

  // ---------- 3. ENTERABLE SAFEHOUSE & APARTMENT ----------
  setupEnterableSafehouse() {
    // Choose a cozy location close to Cocoa House in Dugbe
    const hx = 28, hz = -18;
    this.safehousePos = new THREE.Vector3(hx, 0, hz);
    this.registerFootprint(hx, hz, 16, 14, 8.0);

    // Exterior Entrance Marker & Physical Compound Architecture
    const exteriorMarker = new THREE.Group();
    exteriorMarker.position.set(hx, 0, hz);

    const signBoard = this.createBoardCanvas('COCOA VIEW APARTMENTS', 'Flat 2B (Your Rented Safehouse) - [E] Enter');
    signBoard.position.set(0, 2.6, 0);
    exteriorMarker.add(signBoard);

    // Glowing green entrance portal circle
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x00e676, side: THREE.DoubleSide })
    );
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.04;
    exteriorMarker.add(glowRing);

    // Dedicated External Concrete Staircase on Safehouse exterior
    const safehouseStairs = createExternalConcreteStaircase({
      stepsCount: 11,
      stepWidth: 1.3,
      stepHeight: 0.23,
      stepDepth: 0.32,
      hasLanding: true,
    });
    safehouseStairs.position.set(3.5, 0, -2.5);
    exteriorMarker.add(safehouseStairs);

    // Dedicated Wooden Balcony with hanging clothes overlooking Dugbe street
    const safehouseBalcony = createWoodenBalcony({
      width: 4.2,
      depth: 1.6,
      height: 2.8,
      hasRoofCanopy: true,
      hasClothesLine: true,
    });
    safehouseBalcony.position.set(3.8, 2.53, 1.2);
    exteriorMarker.add(safehouseBalcony);

    // Dedicated Black GP Water Storage Tank on steel tower in safehouse yard
    const safehouseGPTank = createRealisticGPTank({
      capacity: '2000L',
      radius: 0.8,
      height: 1.8,
      standHeight: 3.8,
      hasScaffoldStand: true,
      hasPlumbing: true,
    });
    safehouseGPTank.position.set(-4.2, 0, -3.2);
    exteriorMarker.add(safehouseGPTank);

    this.scene.add(exteriorMarker);

    // The Interior Room is built off-map at y = -100 so it has independent cozy lighting!
    this.interiorOrigin = new THREE.Vector3(hx, -100, hz);
    this.buildSafehouseInterior(this.interiorOrigin);

    this.safehouses.push({
      name: 'Cocoa View Apartment',
      exteriorPos: new THREE.Vector3(hx, 0, hz),
      interiorPos: new THREE.Vector3(hx, -99.9, hz + 2),
      balconyPos: new THREE.Vector3(hx + 3.8, 2.6, hz + 1.2), // Upper floor balcony overlooking Dugbe!
    });
  }

  createBoardCanvas(title, sub) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText(sub, 256, 92);

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(3.5, 0.9),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })
    );
  }

  // Furnished Nigerian Parlor (Living Room + Balcony + Bed)
  buildSafehouseInterior(origin) {
    const room = new THREE.Group();
    room.position.copy(origin);

    const roomW = 10, roomH = 3.2, roomD = 8;

    // Floor (Linoleum / Terrazzo tile texture)
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#c7b299';
    fctx.fillRect(0, 0, 128, 128);
    fctx.strokeStyle = '#a89278';
    fctx.lineWidth = 4;
    fctx.strokeRect(0, 0, 128, 128);
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(5, 4);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(roomW, roomD),
      new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.9 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = roomH;
    room.add(ceiling);

    // Walls (Warm cream/peach painted parlor walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf0e2ce, roughness: 0.85 });
    // Back wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.2), wallMat);
    backWall.position.set(0, roomH / 2, -roomD / 2);
    // Left wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomD), wallMat);
    leftWall.position.set(-roomW / 2, roomH / 2, 0);
    // Right wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, roomH, roomD), wallMat);
    rightWall.position.set(roomW / 2, roomH / 2, 0);
    // Front wall with door opening
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.2), wallMat);
    frontWall.position.set(0, roomH / 2, roomD / 2);
    room.add(backWall, leftWall, rightWall, frontWall);

    // 1. Spinning Ceiling Fan (Essential Nigerian parlor feature!)
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, roomH - 0.35, 0);
    const fanMotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0x9e6e44 })
    );
    fanGroup.add(fanMotor);

    const blades = new THREE.Group();
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.02, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x7a5230 })
      );
      blade.position.x = 0.7;
      blade.rotation.x = 0.1;
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.y = (b * Math.PI * 2) / 3;
      bladeHolder.add(blade);
      blades.add(bladeHolder);
    }
    fanGroup.add(blades);
    room.add(fanGroup);
    this.ceilingFanBlades = blades;

    // 2. Nigerian Rug on the floor (Geometric Ankara pattern)
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256;
    rugCanvas.height = 192;
    const rctx = rugCanvas.getContext('2d');
    rctx.fillStyle = '#8b2500';
    rctx.fillRect(0, 0, 256, 192);
    rctx.fillStyle = '#e69500';
    rctx.fillRect(20, 20, 216, 152);
    rctx.fillStyle = '#2d5a27';
    rctx.beginPath();
    rctx.arc(128, 96, 45, 0, Math.PI * 2);
    rctx.fill();
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.6),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(rugCanvas), roughness: 0.95 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 0);
    room.add(rug);

    // 3. Classic 3-Seater Foam Sofa with white lace headrest covers (Antimacassars)
    const sofa = new THREE.Group();
    sofa.position.set(0, 0, -2.6);
    const sofaBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.75, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x3d4b68 })
    );
    sofaBody.position.y = 0.38;
    const sofaBack = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.9, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x3d4b68 })
    );
    sofaBack.position.set(0, 0.9, -0.4);

    // White lace headrest cloths
    [-1, 0, 1].forEach((lx) => {
      const lace = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.45, 0.38),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
      );
      lace.position.set(lx, 1.05, -0.4);
      sofa.add(lace);
    });
    sofa.add(sofaBody, sofaBack);
    room.add(sofa);

    // 4. Center Glass Coffee Table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.45, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x221711, roughness: 0.3 })
    );
    table.position.set(0, 0.22, -0.8);
    room.add(table);

    // 5. Vintage CRT Television & TV Stand with rabbit-ear antenna
    const tvStand = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.7, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x4a2e1b })
    );
    tvStand.position.set(0, 0.35, 2.2);

    const crtTv = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 })
    );
    crtTv.position.set(0, 1.1, 2.2);

    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 128;
    screenCanvas.height = 96;
    const sctx = screenCanvas.getContext('2d');
    sctx.fillStyle = '#0a2540';
    sctx.fillRect(0, 0, 128, 96);
    sctx.fillStyle = '#00ffcc';
    sctx.font = 'bold 20px sans-serif';
    sctx.fillText('NTA IBADAN', 8, 48);
    const crtScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.65),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(screenCanvas) })
    );
    crtScreen.position.set(0, 1.1, 1.79);
    crtScreen.rotation.y = Math.PI;

    room.add(tvStand, crtTv, crtScreen);

    // 6. Sound System & Standing Fan in corner
    const standingFan = new THREE.Group();
    standingFan.position.set(2.8, 0, -2.4);
    const fanPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x111111 })
    );
    fanPole.position.y = 0.7;
    const fanCage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12),
      new THREE.MeshStandardMaterial({ color: 0x0055aa, wireframe: true })
    );
    fanCage.position.y = 1.4;
    standingFan.add(fanPole, fanCage);
    room.add(standingFan);

    // 7. Comfortable Bed & Sleeping Area (Right Alcove)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(3.4, 0, 0);

    const bedBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.45, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x5a3d28 })
    );
    bedBase.position.y = 0.22;

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.3, 3.1),
      new THREE.MeshStandardMaterial({ color: 0x90caf9, roughness: 0.9 })
    );
    mattress.position.y = 0.55;

    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.18, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    pillow.position.set(0, 0.75, -1.1);

    bedGroup.add(bedBase, mattress, pillow);

    // "Sleep & Advance Time" Interactive Floating Marker over bed
    const sleepBoard = this.createBoardCanvas('COMFORTABLE BED', '[E] Sleep & Change Time of Day');
    sleepBoard.position.set(3.4, 1.8, 0);
    sleepBoard.scale.set(0.65, 0.65, 0.65);
    room.add(bedGroup, sleepBoard);

    // 8. Exit Door Marker (returns to outside Dugbe)
    const exitBoard = this.createBoardCanvas('FRONT DOOR', '[E] Exit to Dugbe Street');
    exitBoard.position.set(0, 2.1, roomD / 2 - 0.2);
    exitBoard.rotation.y = Math.PI;
    exitBoard.scale.set(0.7, 0.7, 0.7);
    room.add(exitBoard);

    // 9. Balcony Door leading out to high-rise view
    const balconyBoard = this.createBoardCanvas('BALCONY DOOR', '[B] Step onto Dugbe View Balcony');
    balconyBoard.position.set(-roomW / 2 + 0.2, 2.1, 0);
    balconyBoard.rotation.y = Math.PI / 2;
    balconyBoard.scale.set(0.7, 0.7, 0.7);
    room.add(balconyBoard);

    // Interior Warm Lighting
    const roomLight = new THREE.PointLight(0xffecd2, 1.8, 12);
    roomLight.position.set(0, roomH - 0.6, 0);
    room.add(roomLight);

    const tvLight = new THREE.PointLight(0x66ccff, 0.6, 4);
    tvLight.position.set(0, 1.2, 1.6);
    room.add(tvLight);

    this.scene.add(room);
    this.safehouseRoom = room;
  }

  // Update animations: spinning ceiling fan, floating markers
  update(dt) {
    if (this.ceilingFanBlades) {
      this.ceilingFanBlades.rotation.y += dt * 6.5; // continuous breeze
    }
  }
}
