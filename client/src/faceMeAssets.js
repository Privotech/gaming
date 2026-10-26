// ============================================================
// CITYVERSE NG  |  faceMeAssets.js
// Dedicated 3D assets for 'Face-Me-I-Face-You' house exteriors:
// 1. External Concrete Staircase (cantilevered steps, stringer slab, pillars, welded metal handrails)
// 2. Wooden Balcony (cantilever joists, rustic timber planks, X-brace balustrade, shade canopy, drying clothes)
// 3. Realistic Black GP Water Storage Tank (ribbed HDPE body, threaded lid, GeePee stencil, PVC/brass plumbing, steel scaffold tower & ladder)
// ============================================================

import * as THREE from 'three';

// Shared Materials & Textures
const concreteMat = new THREE.MeshStandardMaterial({
  color: 0xc8beb0,
  roughness: 0.92,
  metalness: 0.05,
});

const darkMetalMat = new THREE.MeshStandardMaterial({
  color: 0x22262a,
  roughness: 0.55,
  metalness: 0.75,
});

const timberMat = new THREE.MeshStandardMaterial({
  color: 0x5c3c26, // weathered iroko / tropical hardwood
  roughness: 0.85,
  metalness: 0.1,
});

const gpPlasticMat = new THREE.MeshStandardMaterial({
  color: 0x111215, // deep carbon-black polyethylene
  roughness: 0.38,
  metalness: 0.15,
});

const pvcPipeMat = new THREE.MeshStandardMaterial({
  color: 0x2e6b9e, // blue PVC water pipe
  roughness: 0.45,
  metalness: 0.1,
});

const brassMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37, // brass gate valve tap
  roughness: 0.3,
  metalness: 0.85,
});

const zincRoofMat = new THREE.MeshStandardMaterial({
  color: 0x7c381c, // weathered corrugated rust
  roughness: 0.65,
  metalness: 0.4,
});

// Helper for quick box meshes
function box(w, h, l, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ============================================================
// 1. EXTERNAL CONCRETE STAIRCASESE
// ============================================================
export function createExternalConcreteStaircase(options = {}) {
  const {
    stepsCount = 11,
    stepWidth = 1.3,
    stepHeight = 0.22,
    stepDepth = 0.32,
    handrailColor = 0x1f2937,
    hasLanding = true,
  } = options;

  const stairGroup = new THREE.Group();
  const totalHeight = stepsCount * stepHeight;
  const totalLength = stepsCount * stepDepth;

  // 1. Concrete Cantilevered Steps
  for (let i = 0; i < stepsCount; i++) {
    const sy = i * stepHeight + stepHeight / 2;
    const sz = i * stepDepth;
    const step = box(stepWidth, stepHeight, stepDepth, concreteMat, 0, sy, sz);

    // Tread bullnose edge & subtle tread groove
    const nosing = box(stepWidth + 0.04, 0.04, 0.06, concreteMat, 0, sy + stepHeight / 2 - 0.02, sz + stepDepth / 2 + 0.02);
    stairGroup.add(step, nosing);
  }

  // 2. Angled Concrete Stringer / Supporting Waist Slab underneath
  const slabAngle = Math.atan2(totalHeight, totalLength);
  const slabLength = Math.hypot(totalHeight, totalLength);
  const waistSlab = box(stepWidth * 0.88, 0.16, slabLength, concreteMat, 0, totalHeight / 2 - 0.14, totalLength / 2 - stepDepth / 2);
  waistSlab.rotation.x = slabAngle;
  stairGroup.add(waistSlab);

  // 3. Ground and Mid Concrete Support Columns
  const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, totalHeight * 0.5, 0.25), concreteMat);
  col1.position.set(0, totalHeight * 0.25, totalLength * 0.5);
  col1.castShadow = true;
  stairGroup.add(col1);

  // 4. Intermediate Landing at top
  if (hasLanding) {
    const landing = box(stepWidth, 0.22, 1.2, concreteMat, 0, totalHeight - stepHeight / 2, totalLength + 0.45);
    // Support pillar under landing
    const landingCol = box(0.3, totalHeight - 0.22, 0.3, concreteMat, 0, (totalHeight - 0.22) / 2, totalLength + 0.45);
    stairGroup.add(landing, landingCol);
  }

  // 5. Welded Metal Handrail & Balustrades
  const railMat = new THREE.MeshStandardMaterial({
    color: handrailColor,
    roughness: 0.5,
    metalness: 0.8,
  });

  const railGroup = new THREE.Group();
  [-stepWidth / 2 + 0.05, stepWidth / 2 - 0.05].forEach((rx) => {
    // Vertical Balusters (posts every 2 steps)
    for (let i = 0; i < stepsCount; i += 2) {
      const by = i * stepHeight + stepHeight + 0.45;
      const bz = i * stepDepth;
      const post = box(0.04, 0.9, 0.04, railMat, rx, by, bz);
      railGroup.add(post);
    }

    // Slanted Top Handrail Bar
    const railBar = box(0.06, 0.06, slabLength + 0.2, railMat, rx, totalHeight / 2 + 0.9, totalLength / 2);
    railBar.rotation.x = slabAngle;
    railGroup.add(railBar);

    // Intermediate Lower Safety Knee Bar
    const kneeBar = box(0.03, 0.03, slabLength + 0.2, railMat, rx, totalHeight / 2 + 0.48, totalLength / 2);
    kneeBar.rotation.x = slabAngle;
    railGroup.add(kneeBar);

    // Landing Handrail (horizontal)
    if (hasLanding) {
      const lPost = box(0.05, 0.95, 0.05, railMat, rx, totalHeight + 0.48, totalLength + 1.0);
      const lRail = box(0.06, 0.06, 1.15, railMat, rx, totalHeight + 0.95, totalLength + 0.5);
      railGroup.add(lPost, lRail);
    }
  });

  stairGroup.add(railGroup);
  return stairGroup;
}

// ============================================================
// 2. WOODEN BALCONY / VERANDA
// ============================================================
export function createWoodenBalcony(options = {}) {
  const {
    width = 4.0,
    depth = 1.6,
    height = 2.8,
    hasRoofCanopy = true,
    hasClothesLine = true,
  } = options;

  const balconyGroup = new THREE.Group();

  // 1. Heavy Timber Cantilever Joists extending from house wall
  const joistCount = Math.floor(width / 0.8) + 1;
  const joistSpacing = width / (joistCount - 1);
  for (let j = 0; j < joistCount; j++) {
    const jx = -width / 2 + j * joistSpacing;
    const joist = box(0.12, 0.22, depth + 0.4, timberMat, jx, -0.11, depth / 2 - 0.2);
    // Diagonal Timber Under-bracket (Support strut)
    const strut = box(0.1, 0.1, 0.95, timberMat, jx, -0.45, depth * 0.35);
    strut.rotation.x = -0.78;
    balconyGroup.add(joist, strut);
  }

  // 2. Weathered Tropical Hardwood Floor Planks
  const plankW = 0.18;
  const plankCount = Math.floor(depth / plankW);
  for (let p = 0; p < plankCount; p++) {
    const pz = p * (plankW + 0.01) + plankW / 2;
    const plank = box(width, 0.035, plankW, timberMat, 0, 0.02, pz);
    balconyGroup.add(plank);
  }

  // 3. Wooden Balustrade & Traditional Nigerian Cross-Bracing ("X-Balustrade")
  const railH = 0.95;
  const postSize = 0.1;

  // Corner & Intermediate Timber Posts
  const postPositions = [-width / 2, -width / 6, width / 6, width / 2];
  postPositions.forEach((px) => {
    // Balustrade post
    const post = box(postSize, railH, postSize, timberMat, px, railH / 2, depth);
    balconyGroup.add(post);

    // Tall canopy support column (if canopy enabled)
    if (hasRoofCanopy) {
      const roofCol = box(0.1, height, 0.1, timberMat, px, height / 2, depth);
      balconyGroup.add(roofCol);
    }
  });

  // End posts against wall
  [-width / 2, width / 2].forEach((px) => {
    const wallPost = box(postSize, railH, postSize, timberMat, px, railH / 2, 0.05);
    balconyGroup.add(wallPost);
  });

  // Top and Bottom Railings
  const frontTopRail = box(width, 0.08, 0.12, timberMat, 0, railH, depth);
  const frontBottomRail = box(width, 0.06, 0.08, timberMat, 0, 0.1, depth);
  balconyGroup.add(frontTopRail, frontBottomRail);

  // Side Railings
  [-width / 2, width / 2].forEach((px) => {
    const sideTop = box(0.12, 0.08, depth, timberMat, px, railH, depth / 2);
    const sideBottom = box(0.08, 0.06, depth, timberMat, px, 0.1, depth / 2);
    balconyGroup.add(sideTop, sideBottom);
  });

  // Traditional Nigerian "X" Timber Cross-bracing in balustrade panels
  const panelCount = 3;
  const panelW = width / panelCount;
  for (let i = 0; i < panelCount; i++) {
    const cx = -width / 2 + i * panelW + panelW / 2;
    const diagLen = Math.hypot(panelW, railH - 0.15);
    const diagAngle = Math.atan2(railH - 0.15, panelW);

    const x1 = box(panelW * 0.95, 0.035, 0.05, timberMat, cx, railH / 2, depth);
    x1.rotation.z = diagAngle;
    const x2 = box(panelW * 0.95, 0.035, 0.05, timberMat, cx, railH / 2, depth);
    x2.rotation.z = -diagAngle;
    balconyGroup.add(x1, x2);
  }

  // 4. Overhanging Slanted Shade Canopy with Rusted Corrugated Zinc
  if (hasRoofCanopy) {
    const canopyW = width + 0.4;
    const canopyD = depth + 0.35;
    const canopyRoof = box(canopyW, 0.04, canopyD, zincRoofMat, 0, height, depth / 2);
    canopyRoof.rotation.x = 0.14; // slanted rainwater runoff

    // Timber fascia board under canopy edge
    const fascia = box(canopyW, 0.14, 0.03, timberMat, 0, height - 0.05, depth + 0.15);
    balconyGroup.add(canopyRoof, fascia);
  }

  // 5. Authentic Nigerian Balcony Detail: Hanging Laundry / Ankara Fabrics Drying
  if (hasClothesLine) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x888888 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width / 2 + 0.1, railH + 0.3, depth * 0.5),
      new THREE.Vector3(width / 2 - 0.1, railH + 0.28, depth * 0.5),
    ]);
    const line = new THREE.Line(lineGeo, lineMat);
    balconyGroup.add(line);

    // Colorful Hanging Clothes / Ankara cloth wraps
    const clothColors = [0xd32f2f, 0x1976d2, 0xffb300, 0x388e3c, 0xf57c00];
    const clothCount = 4;
    for (let c = 0; c < clothCount; c++) {
      const cx = -width / 2 + 0.6 + c * (width * 0.22);
      const clothColor = clothColors[c % clothColors.length];
      const cloth = box(0.35, 0.45, 0.02, new THREE.MeshStandardMaterial({
        color: clothColor,
        roughness: 0.95,
      }), cx, railH + 0.06, depth * 0.5);
      // Gentle sway
      cloth.rotation.x = 0.08;
      balconyGroup.add(cloth);
    }
  }

  return balconyGroup;
}

// ============================================================
// 3. REALISTIC BLACK GP WATER STORAGE TANK (GeePee Tank)
// ============================================================
export function createRealisticGPTank(options = {}) {
  const {
    capacity = '1500L',
    radius = 0.72,
    height = 1.65,
    standHeight = 3.6,
    hasScaffoldStand = true,
    hasPlumbing = true,
  } = options;

  const gpGroup = new THREE.Group();

  // 1. Steel Scaffold Tower / Stand
  if (hasScaffoldStand) {
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x22272b, // Industrial painted structural steel
      roughness: 0.6,
      metalness: 0.7,
    });

    const standW = radius * 2.3;
    const standD = radius * 2.3;
    const standGroup = new THREE.Group();

    // 4 Heavy Angle-Iron Corner Columns
    const legOffset = standW / 2 - 0.06;
    [-legOffset, legOffset].forEach((lx) => {
      [-legOffset, legOffset].forEach((lz) => {
        const leg = box(0.08, standHeight, 0.08, standMat, lx, standHeight / 2, lz);
        standGroup.add(leg);
      });
    });

    // Horizontal Steel Tie-Beams (at ground, mid, and top)
    [0.1, standHeight * 0.5, standHeight].forEach((ty) => {
      const beamX1 = box(standW, 0.08, 0.06, standMat, 0, ty, legOffset);
      const beamX2 = box(standW, 0.08, 0.06, standMat, 0, ty, -legOffset);
      const beamZ1 = box(0.06, 0.08, standD, standMat, legOffset, ty, 0);
      const beamZ2 = box(0.06, 0.08, standD, standMat, -legOffset, ty, 0);
      standGroup.add(beamX1, beamX2, beamZ1, beamZ2);
    });

    // Diagonal "X" Wind-Bracing on all 4 faces
    [-legOffset, legOffset].forEach((faceZ) => {
      const diagLen = Math.hypot(standW, standHeight * 0.5);
      const diagAngle = Math.atan2(standHeight * 0.5, standW);
      [standHeight * 0.25, standHeight * 0.75].forEach((midY) => {
        const d1 = box(diagLen, 0.03, 0.03, standMat, 0, midY, faceZ);
        d1.rotation.z = diagAngle;
        const d2 = box(diagLen, 0.03, 0.03, standMat, 0, midY, faceZ);
        d2.rotation.z = -diagAngle;
        standGroup.add(d1, d2);
      });
    });

    // Top Platform Tray (Checkerplate / Steel Grate)
    const tray = box(standW * 1.05, 0.08, standD * 1.05, standMat, 0, standHeight + 0.04, 0);
    // Platform Safety Railings on 3 sides
    [-standW / 2, standW / 2].forEach((sx) => {
      const sRail = box(0.04, 0.85, standD, standMat, sx, standHeight + 0.46, 0);
      standGroup.add(sRail);
    });
    const backRail = box(standW, 0.85, 0.04, standMat, 0, standHeight + 0.46, -standD / 2);
    standGroup.add(tray, backRail);

    // Maintenance Steel Ladder on one side
    const ladderX = legOffset + 0.05;
    const ladderRungs = Math.floor(standHeight / 0.35);
    for (let r = 0; r <= ladderRungs; r++) {
      const rungY = r * 0.35 + 0.2;
      const rung = box(0.03, 0.03, 0.45, standMat, ladderX, rungY, 0);
      standGroup.add(rung);
    }
    const ladderSide1 = box(0.04, standHeight + 0.9, 0.03, standMat, ladderX, (standHeight + 0.9) / 2, -0.22);
    const ladderSide2 = box(0.04, standHeight + 0.9, 0.03, standMat, ladderX, (standHeight + 0.9) / 2, 0.22);
    standGroup.add(ladderSide1, ladderSide2);

    gpGroup.add(standGroup);
  }

  // 2. High-Density Ribbed Cylindrical Polyethylene Tank Body
  const tankBaseY = hasScaffoldStand ? standHeight + 0.08 : 0;
  const tankBodyGroup = new THREE.Group();
  tankBodyGroup.position.set(0, tankBaseY, 0);

  // Main Cylinder
  const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
  bodyGeo.translate(0, height / 2, 0);
  const bodyMesh = new THREE.Mesh(bodyGeo, gpPlasticMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  tankBodyGroup.add(bodyMesh);

  // Iconic Molded Horizontal Reinforcement Ribs (Corrugated Hoops)
  const ribCount = 6;
  const ribSpacing = height / (ribCount + 1);
  for (let r = 1; r <= ribCount; r++) {
    const ry = r * ribSpacing;
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(radius + 0.015, 0.025, 8, 24),
      gpPlasticMat
    );
    rib.rotation.x = Math.PI / 2;
    rib.position.y = ry;
    tankBodyGroup.add(rib);
  }

  // Domed Top Shoulder
  const shoulder = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.65, radius, 0.22, 24),
    gpPlasticMat
  );
  shoulder.position.y = height + 0.11;
  tankBodyGroup.add(shoulder);

  // Threaded Manhole Inspection Lid on top with grip ribs
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.42, radius * 0.44, 0.14, 16),
    gpPlasticMat
  );
  lid.position.y = height + 0.28;
  // Lid Center Air Vent Breather Cap
  const ventCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12),
    darkMetalMat
  );
  ventCap.position.y = height + 0.4;
  tankBodyGroup.add(lid, ventCap);

  // 3. Stenciled High-Resolution GeePee Brand Texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111215';
  ctx.fillRect(0, 0, 512, 256);

  // Distinct white stenciled branding
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GEEPEE', 256, 75);

  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 32px monospace';
  ctx.fillText(capacity, 256, 125);

  ctx.fillStyle = '#cccccc';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('HEAVY DUTY POLYETHYLENE', 256, 165);
  ctx.font = '14px sans-serif';
  ctx.fillText('100% FOOD GRADE VIRGIN POLYMER', 256, 195);

  // Graduation Level Scale
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 40, 6, 180);
  ctx.fillRect(40, 50, 20, 4);
  ctx.fillText(capacity, 90, 55);
  ctx.fillRect(40, 110, 16, 4);
  ctx.fillText('1000L', 80, 115);
  ctx.fillRect(40, 170, 16, 4);
  ctx.fillText('500L', 75, 175);

  const stencilTex = new THREE.CanvasTexture(canvas);
  const stencilMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 1.5, radius * 0.75),
    new THREE.MeshStandardMaterial({
      map: stencilTex,
      roughness: 0.4,
      metalness: 0.1,
    })
  );
  stencilMesh.position.set(0, height * 0.55, radius + 0.02);
  tankBodyGroup.add(stencilMesh);

  // 4. Plumbing Pipes & Brass Outlet Valves
  if (hasPlumbing) {
    const pipeR = 0.035;
    // Upper Water Inlet PVC Pipe (Blue pipe coming into top of tank)
    const inletPipe = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, 0.45, 12), pvcPipeMat);
    inletPipe.rotation.z = Math.PI / 2;
    inletPipe.position.set(radius + 0.18, height * 0.9, 0);

    const inletElbow = new THREE.Mesh(new THREE.SphereGeometry(pipeR * 1.3, 8, 8), pvcPipeMat);
    inletElbow.position.set(radius + 0.38, height * 0.9, 0);

    const inletDown = new THREE.Mesh(new THREE.CylinderGeometry(pipeR, pipeR, 1.2, 12), pvcPipeMat);
    inletDown.position.set(radius + 0.38, height * 0.9 - 0.6, 0);

    // Lower Brass Gate Valve Tap with Red Handle at bottom of tank
    const tapNipple = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 12), brassMat);
    tapNipple.rotation.z = Math.PI / 2;
    tapNipple.position.set(-radius - 0.12, 0.25, 0);

    const valveBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), brassMat);
    valveBody.position.set(-radius - 0.24, 0.25, 0);

    const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
    valveWheel.rotation.x = Math.PI / 2;
    valveWheel.position.set(-radius - 0.24, 0.35, 0);

    // Vertical Overflow Pipe running down from top
    const overflowPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, height + 0.4, 8), pvcPipeMat);
    overflowPipe.position.set(radius * 0.7, (height + 0.4) / 2, -radius * 0.7);

    tankBodyGroup.add(inletPipe, inletElbow, inletDown, tapNipple, valveBody, valveWheel, overflowPipe);
  }

  gpGroup.add(tankBodyGroup);
  return gpGroup;
}
