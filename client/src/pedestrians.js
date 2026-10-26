// ============================================================
// CITYVERSE NG  |  pedestrians.js
// Pedestrian AI System:
// - Populates Ibadan sidewalks with animated characters
// - Authentic Nigerian attire (Ankara prints, casual wear, office clothes, market traders with head trays)
// - Waypoint navigation along roadside paths & intersections
// - Dynamic behaviors: walking, idling/chatting, vehicle avoidance
// - Smooth procedural walking animation with limb swings and torso bobbing
// - Performance optimized with distance culling
// ============================================================

import * as THREE from 'three';

// Random generator
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Materials Cache for Pedestrians
const skinColors = [0x3d2314, 0x4a2c1a, 0x5a3822, 0x6e472e, 0x331c10];
const clothColors = [
  0x1565c0, // Blue
  0xd32f2f, // Red
  0xfbc02d, // Gold / Yellow
  0x2e7d32, // Green
  0x6a1b9a, // Purple
  0xff6f00, // Orange
  0x37474f, // Charcoal
  0xf5f5f5, // White Kaftan
  0x00838f, // Teal
];
const pantColors = [0x263238, 0x1a237e, 0x3e2723, 0x455a64, 0x212121];

// Procedural Character Builder
function createPedestrianMesh(seed) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColors[Math.floor(rand() * skinColors.length)],
    roughness: 0.8,
  });
  const shirtColor = clothColors[Math.floor(rand() * clothColors.length)];
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.75 });
  const pantMat = new THREE.MeshStandardMaterial({
    color: pantColors[Math.floor(rand() * pantColors.length)],
    roughness: 0.85,
  });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  const heightScale = 0.92 + rand() * 0.16; // 1.6m - 1.85m tall
  const isFemale = rand() < 0.45;
  const isTrader = rand() < 0.25; // carries head tray of bread/fruits

  // 1. Torso / Shirt
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.55, 0.22),
    shirtMat
  );
  torso.position.y = 1.08;
  torso.castShadow = true;
  group.add(torso);

  // 2. Head & Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), skinMat);
  neck.position.y = 1.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), skinMat);
  head.position.y = 1.55;
  head.castShadow = true;

  // Hair or Fila / Cap / Head-tie
  const hatType = rand();
  if (hatType < 0.35) {
    // Yoruba Fila / Cap or headwrap
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.14, 0.12, 12),
      shirtMat
    );
    cap.position.y = 1.64;
    group.add(cap);
  }

  // Market Trader Head-Tray with goods (Bread / Fruits)
  if (isTrader) {
    const tray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.24, 0.1, 16),
      new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.6 })
    );
    tray.position.y = 1.74;
    // Goods on tray
    const goods = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24),
      new THREE.MeshStandardMaterial({ color: 0xffb74d, roughness: 0.9 })
    );
    goods.position.y = 1.85;
    group.add(tray, goods);
  }

  group.add(neck, head);

  // 3. Animated Limbs
  // Left Arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.24, 1.3, 0);
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.52, 8), shirtMat);
  leftArm.position.y = -0.26;
  leftArm.castShadow = true;
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
  leftHand.position.y = -0.54;
  leftArmGroup.add(leftArm, leftHand);
  group.add(leftArmGroup);

  // Right Arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.24, 1.3, 0);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.52, 8), shirtMat);
  rightArm.position.y = -0.26;
  rightArm.castShadow = true;
  const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), skinMat);
  rightHand.position.y = -0.54;
  rightArmGroup.add(rightArm, rightHand);
  group.add(rightArmGroup);

  // Left Leg
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.11, 0.8, 0);
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.72, 8), pantMat);
  leftLeg.position.y = -0.36;
  leftLeg.castShadow = true;
  const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), shoeMat);
  leftFoot.position.set(0, -0.74, 0.06);
  leftLegGroup.add(leftLeg, leftFoot);
  group.add(leftLegGroup);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.11, 0.8, 0);
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.72, 8), pantMat);
  rightLeg.position.y = -0.36;
  rightLeg.castShadow = true;
  const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), shoeMat);
  rightFoot.position.set(0, -0.74, 0.06);
  rightLegGroup.add(rightLeg, rightFoot);
  group.add(rightLegGroup);

  group.scale.setScalar(heightScale);

  return {
    group,
    limbs: {
      leftArm: leftArmGroup,
      rightArm: rightArmGroup,
      leftLeg: leftLegGroup,
      rightLeg: rightLegGroup,
      torso,
      head,
    },
    isTrader,
  };
}

export class PedestrianManager {
  constructor(scene) {
    this.scene = scene;
    this.pedestrians = [];
    this.sidewalkPaths = [];
    this.maxPedestrians = 42; // optimal balance of vibrant streets & 60 FPS
  }

  init(ways, project, roadWidthMap) {
    this.extractSidewalkPaths(ways, project, roadWidthMap);
    this.spawnPedestrians();
  }

  // Generate left & right sidewalk waypoint chains from road network
  extractSidewalkPaths(ways, project, roadWidthMap) {
    for (const w of ways) {
      const type = w.tags?.highway;
      const width = roadWidthMap[type];
      if (!width || width < 4 || !w.geometry || w.geometry.length < 2) continue;

      const pts = w.geometry.map((p) => project(p.lat, p.lon));
      const leftSidewalk = [];
      const rightSidewalk = [];
      const sidewalkOffset = width / 2 + 1.35;

      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const nx = -dz, nz = dx; // perpendicular normal

        leftSidewalk.push(new THREE.Vector2(pts[i][0] + nx * sidewalkOffset, pts[i][1] + nz * sidewalkOffset));
        rightSidewalk.push(new THREE.Vector2(pts[i][0] - nx * sidewalkOffset, pts[i][1] - nz * sidewalkOffset));
      }

      if (leftSidewalk.length >= 2) this.sidewalkPaths.push(leftSidewalk);
      if (rightSidewalk.length >= 2) this.sidewalkPaths.push(rightSidewalk);
    }
  }

  spawnPedestrians() {
    if (!this.sidewalkPaths.length) return;

    for (let i = 0; i < this.maxPedestrians; i++) {
      const pathIdx = Math.floor(Math.random() * this.sidewalkPaths.length);
      const path = this.sidewalkPaths[pathIdx];
      const startNode = Math.floor(Math.random() * (path.length - 1));
      const direction = Math.random() > 0.5 ? 1 : -1;

      const pedMesh = createPedestrianMesh(100 + i * 17);
      const startPt = path[startNode];
      pedMesh.group.position.set(startPt.x, 0, startPt.y);
      this.scene.add(pedMesh.group);

      this.pedestrians.push({
        id: i,
        mesh: pedMesh.group,
        limbs: pedMesh.limbs,
        isTrader: pedMesh.isTrader,
        path,
        nodeIdx: startNode,
        direction,
        speed: 1.25 + Math.random() * 0.45, // realistic 1.25 - 1.7 m/s walking speed
        state: 'WALKING', // 'WALKING' | 'IDLE' | 'FLEEING'
        idleTimer: 0,
        animTime: Math.random() * 10,
        avoidAngle: 0,
      });
    }
  }

  update(dt, playerPos, drivingVehicle) {
    const now = performance.now() * 0.001;

    for (const p of this.pedestrians) {
      const mesh = p.mesh;
      const distToPlayer = Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z);

      // Distance culling: Skip detailed animation if far away (> 110m)
      if (distToPlayer > 120) {
        // Simple distance wrap/teleport if too far
        if (distToPlayer > 180) {
          const newPath = this.sidewalkPaths[Math.floor(Math.random() * this.sidewalkPaths.length)];
          const newPt = newPath[0];
          mesh.position.set(newPt.x, 0, newPt.y);
          p.path = newPath;
          p.nodeIdx = 0;
        }
        continue;
      }

      // 1. Vehicle Proximity Reaction (Step aside / alert)
      let vehicleNear = false;
      if (drivingVehicle) {
        const vPos = drivingVehicle.position;
        const distToCar = Math.hypot(mesh.position.x - vPos.x, mesh.position.z - vPos.z);
        if (distToCar < 4.2) {
          vehicleNear = true;
          // Sidestep away from car
          const awayX = mesh.position.x - vPos.x;
          const awayZ = mesh.position.z - vPos.z;
          const l = Math.hypot(awayX, awayZ) || 1;
          mesh.position.x += (awayX / l) * dt * 2.5;
          mesh.position.z += (awayZ / l) * dt * 2.5;
        }
      }

      // 2. State Machine: FLEEING vs WALKING vs IDLING
      if (p.state === 'FLEEING') {
        p.fleeTimer -= dt;
        if (p.fleeTimer <= 0) {
          p.state = 'WALKING';
          p.speed = 1.4;
        }
        if (p.fleeDirection) {
          mesh.position.x += p.fleeDirection.x * p.speed * dt;
          mesh.position.z += p.fleeDirection.y * p.speed * dt;
          mesh.rotation.y = Math.atan2(p.fleeDirection.x, p.fleeDirection.y);
        }
        // Panicked flailing animation
        p.animTime += dt * 14.0;
        p.limbs.leftLeg.rotation.x = Math.sin(p.animTime) * 0.9;
        p.limbs.rightLeg.rotation.x = -Math.sin(p.animTime) * 0.9;
        p.limbs.leftArm.rotation.x = 2.4 + Math.sin(p.animTime * 1.5) * 0.5; // hands in air screaming!
        p.limbs.rightArm.rotation.x = 2.4 + Math.cos(p.animTime * 1.5) * 0.5;
        p.limbs.torso.position.y = 1.08 + Math.abs(Math.sin(p.animTime)) * 0.08;
        continue;
      }

      if (p.state === 'IDLE') {
        p.idleTimer -= dt;
        if (p.idleTimer <= 0) {
          p.state = 'WALKING';
        }
        // Subtle idle breathing
        p.limbs.torso.position.y = 1.08 + Math.sin(now * 2) * 0.015;
        continue;
      }

      // Random chance to stop near shops / bus stops
      if (Math.random() < 0.0008 && p.state === 'WALKING') {
        p.state = 'IDLE';
        p.idleTimer = 3.5 + Math.random() * 5.0; // rest for a few seconds
        continue;
      }

      // 3. Sidewalk Path Navigation
      const targetNodeIdx = p.nodeIdx + p.direction;
      if (targetNodeIdx < 0 || targetNodeIdx >= p.path.length) {
        // Reached end of street: reverse or switch to another sidewalk
        p.direction *= -1;
        p.nodeIdx = THREE.MathUtils.clamp(p.nodeIdx + p.direction, 0, p.path.length - 1);
        continue;
      }

      const targetPt = p.path[targetNodeIdx];
      const dx = targetPt.x - mesh.position.x;
      const dz = targetPt.y - mesh.position.z;
      const distToTarget = Math.hypot(dx, dz);

      if (distToTarget < 0.6) {
        p.nodeIdx = targetNodeIdx;
      } else {
        const stepDist = p.speed * dt;
        mesh.position.x += (dx / distToTarget) * stepDist;
        mesh.position.z += (dz / distToTarget) * stepDist;

        // Face forward along walking direction
        const targetHeading = Math.atan2(dx, dz);
        let dHeading = targetHeading - mesh.rotation.y;
        dHeading = Math.atan2(Math.sin(dHeading), Math.cos(dHeading));
        mesh.rotation.y += dHeading * Math.min(1, dt * 10);
      }

      // 4. Procedural Walking Gait Animation
      p.animTime += dt * p.speed * 4.6;
      const swing = Math.sin(p.animTime) * 0.65; // Leg swing angle

      // Antiphase Leg Swings
      p.limbs.leftLeg.rotation.x = swing;
      p.limbs.rightLeg.rotation.x = -swing;

      // Antiphase Arm Swings (Traders keep arms steady to balance head tray!)
      if (p.isTrader) {
        p.limbs.leftArm.rotation.x = 0.2 + Math.sin(now) * 0.05;
        p.limbs.rightArm.rotation.x = 0.2 + Math.cos(now) * 0.05;
      } else {
        p.limbs.leftArm.rotation.x = -swing * 0.75;
        p.limbs.rightArm.rotation.x = swing * 0.75;
      }

      // Natural vertical hip bobbing during walk (double frequency)
      p.limbs.torso.position.y = 1.08 + Math.abs(Math.sin(p.animTime)) * 0.04;
      p.limbs.head.position.y = 1.55 + Math.abs(Math.sin(p.animTime)) * 0.04;
    }
  }

  // GTA 5 Driver Ejection when carjacked: driver stumbles out and flees in panic
  spawnEjectedDriver(x, z, heading) {
    const pedMesh = createPedestrianMesh(Date.now() % 10000);
    pedMesh.group.position.set(x, 0, z);
    pedMesh.group.rotation.y = heading + Math.PI / 2;
    this.scene.add(pedMesh.group);

    // Initial stumble / tumble pose
    pedMesh.limbs.torso.rotation.z = 0.35;
    pedMesh.limbs.torso.position.y = 0.8;

    const fleeDir = new THREE.Vector2(-Math.cos(heading), Math.sin(heading)).normalize();

    const ejected = {
      id: Date.now(),
      mesh: pedMesh.group,
      limbs: pedMesh.limbs,
      isTrader: false,
      path: this.sidewalkPaths[0] || [],
      nodeIdx: 0,
      direction: 1,
      speed: 4.8, // runs fast in panic!
      state: 'FLEEING',
      fleeDirection: fleeDir,
      fleeTimer: 8.0,
      animTime: 0,
      avoidAngle: 0,
    };
    this.pedestrians.push(ejected);
    return ejected;
  }

  // GTA 5 Melee / Punch interaction on pedestrians
  punchPedestrian(pos, radius = 2.4) {
    let nearest = null, minD = radius;
    for (const p of this.pedestrians) {
      const d = Math.hypot(p.mesh.position.x - pos.x, p.mesh.position.z - pos.z);
      if (d < minD) {
        minD = d;
        nearest = p;
      }
    }
    if (!nearest) return null;

    // React to punch: stagger back and flee!
    const dx = nearest.mesh.position.x - pos.x;
    const dz = nearest.mesh.position.z - pos.z;
    const l = Math.hypot(dx, dz) || 1;
    nearest.mesh.position.x += (dx / l) * 0.9;
    nearest.mesh.position.z += (dz / l) * 0.9;
    nearest.state = 'FLEEING';
    nearest.speed = 4.2;
    nearest.fleeDirection = new THREE.Vector2(dx / l, dz / l);
    nearest.fleeTimer = 8.0;

    // Drop cash loot (₦300 - ₦1,500)
    const cashDrop = 200 + Math.floor(Math.random() * 8) * 150;
    return { hit: true, cash: cashDrop, pos: nearest.mesh.position };
  }
}
