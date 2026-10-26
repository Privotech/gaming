// ============================================================
// CITYVERSE NG  |  traffic.js
// Moving Traffic AI System:
// - Autonomous vehicles navigating road lanes: Keke NAPEP, Okada, Danfos, Saloon Cars
// - Authentic 3D models:
//   * Keke NAPEP (Yellow Tricycle with animated rider)
//   * Okada (Commercial motorcycle with rider)
//   * Danfo buses and Saloon cars in traffic
// - Lane following, distance keeping, braking for pedestrians & player
// - Realistic vehicle speeds and occasional horn honks
// ============================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

function box(w, h, l, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// ---------- 1. KEKE NAPEP (Yellow Tricycle) BUILDER ----------
function buildKekeMesh() {
  const g = new THREE.Group();
  const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xf5b300, roughness: 0.35, metalness: 0.4 });
  const blackCanopy = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.1 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x091016, roughness: 0.1, transparent: true, opacity: 0.75 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.8 });

  // Main Chasis / Lower Body
  const body = box(1.3, 0.45, 2.2, yellowPaint, 0, 0.42, 0);
  // Rear passenger seat area
  const cabin = box(1.26, 0.95, 1.3, yellowPaint, 0, 0.95, -0.4);
  // Black Vinyl Canopy Top
  const roof = box(1.32, 0.08, 2.1, blackCanopy, 0, 1.58, -0.05);
  // Windscreen
  const windscreen = box(1.15, 0.55, 0.03, glass, 0, 1.15, 0.65);
  windscreen.rotation.x = -0.15;

  // Thin side pillars holding canopy
  [-0.6, 0.6].forEach((px) => {
    g.add(box(0.04, 0.75, 0.04, darkPlastic, px, 1.2, 0.65));
    g.add(box(0.04, 0.75, 0.04, darkPlastic, px, 1.2, -0.95));
  });

  // Front Nose & Single Headlight
  const nose = box(0.65, 0.65, 0.75, yellowPaint, 0, 0.55, 0.95);
  const headlight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.0 })
  );
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.65, 1.34);

  // Handlebars
  const bar = box(0.65, 0.03, 0.03, chrome, 0, 0.88, 0.45);

  // Animated Keke Rider
  const riderTorso = box(0.35, 0.48, 0.22, new THREE.MeshStandardMaterial({ color: 0x1976d2 }), 0, 0.95, 0.2);
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
  riderHead.position.set(0, 1.32, 0.2);
  const filaCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 8), yellowPaint);
  filaCap.position.set(0, 1.42, 0.2);

  // Wheels (1 front, 2 rear)
  const wheelR = 0.23, wheelW = 0.14;
  // Front wheel
  const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), tyreMat);
  frontWheel.rotation.z = Math.PI / 2;
  frontWheel.position.set(0, wheelR, 0.95);
  // Rear Left & Right wheels
  const rearWheelL = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), tyreMat);
  rearWheelL.rotation.z = Math.PI / 2;
  rearWheelL.position.set(0.68, wheelR, -0.65);
  const rearWheelR = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), tyreMat);
  rearWheelR.rotation.z = Math.PI / 2;
  rearWheelR.position.set(-0.68, wheelR, -0.65);

  g.add(body, cabin, roof, windscreen, nose, headlight, bar, riderTorso, riderHead, filaCap, frontWheel, rearWheelL, rearWheelR);
  return g;
}

// ---------- 2. OKADA (Commercial Motorcycle) BUILDER ----------
function buildOkadaMesh() {
  const g = new THREE.Group();
  const redTank = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3, metalness: 0.6 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.8 });

  // Frame & Engine Block
  const engine = box(0.28, 0.35, 0.45, blackMat, 0, 0.38, 0);
  const exhaust = box(0.06, 0.06, 1.1, chrome, 0.18, 0.22, -0.3);
  exhaust.rotation.x = -0.1;

  // Red Fuel Tank
  const tank = box(0.32, 0.24, 0.55, redTank, 0, 0.68, 0.22);
  // Long Seat (Driver + Passenger)
  const seat = box(0.28, 0.12, 0.78, blackMat, 0, 0.64, -0.28);

  // Front Fork & Handlebars
  const fork = box(0.04, 0.68, 0.04, chrome, 0, 0.58, 0.65);
  fork.rotation.x = -0.25;
  const bar = box(0.68, 0.03, 0.03, chrome, 0, 0.92, 0.55);

  // Round Headlight
  const headlight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.0 })
  );
  headlight.rotation.x = Math.PI / 2;
  headlight.position.set(0, 0.82, 0.75);

  // Wheels (Spoked rims)
  const wheelR = 0.32, wheelW = 0.09;
  const fWheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), blackMat);
  fWheel.rotation.z = Math.PI / 2;
  fWheel.position.set(0, wheelR, 0.85);
  const rWheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), blackMat);
  rWheel.rotation.z = Math.PI / 2;
  rWheel.position.set(0, wheelR, -0.75);

  // Rider Figure
  const riderTorso = box(0.32, 0.46, 0.2, new THREE.MeshStandardMaterial({ color: 0x388e3c }), 0, 0.95, 0.1);
  riderTorso.rotation.x = 0.25; // leaning forward on handlebars
  const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
  riderHead.position.set(0, 1.28, 0.22);
  // Helmet
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfbc02d }));
  helmet.position.set(0, 1.31, 0.22);

  g.add(engine, exhaust, tank, seat, fork, bar, headlight, fWheel, rWheel, riderTorso, riderHead, helmet);
  return g;
}

// ---------- 3. TRAFFIC DANFO & SALOON CAR BUILDERS ----------
function buildTrafficDanfoMesh() {
  const g = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf5b300, roughness: 0.3, metalness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const white = new THREE.MeshStandardMaterial({ color: 0xefede8, roughness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x091016, roughness: 0.1, transparent: true, opacity: 0.8 });

  // Body
  g.add(box(1.9, 0.95, 4.8, yellow, 0, 0.65, 0));
  // Double Black Stripes
  g.add(box(1.92, 0.1, 4.82, black, 0, 0.65, 0));
  g.add(box(1.92, 0.1, 4.82, black, 0, 0.85, 0));
  // Cabin & Roof
  g.add(box(1.85, 0.75, 4.6, yellow, 0, 1.45, -0.1));
  g.add(box(1.88, 0.1, 4.7, white, 0, 1.88, -0.1));
  // Windows
  g.add(box(1.86, 0.5, 4.5, glass, 0, 1.45, -0.1));
  // Headlights
  [-0.65, 0.65].forEach((lx) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.0 }));
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(lx, 0.65, 2.42);
    g.add(lamp);
  });
  // Wheels
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.35, wz);
    g.add(w);
  });
  return g;
}

function buildTrafficCarMesh() {
  const g = new THREE.Group();
  const colors = [0x1a365d, 0x8b0000, 0x2e7d32, 0x37474f, 0xc0c0c0];
  const paint = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.25, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x091016, roughness: 0.1, transparent: true, opacity: 0.8 });

  // Lower body
  g.add(box(1.8, 0.48, 4.3, paint, 0, 0.42, 0));
  // Cabin
  g.add(box(1.6, 0.46, 2.3, paint, 0, 0.85, -0.3));
  g.add(box(1.62, 0.42, 2.2, glass, 0, 0.85, -0.3));
  // Headlights
  [-0.6, 0.6].forEach((lx) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.0 }));
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(lx, 0.45, 2.16);
    g.add(lamp);
  });
  // Wheels
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  [[-0.88, 1.2], [0.88, 1.2], [-0.88, -1.2], [0.88, -1.2]].forEach(([wx, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 12), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.32, wz);
    g.add(w);
  });
  return g;
}

// ---------- TRAFFIC MANAGER ----------
export class TrafficManager {
  constructor(scene) {
    this.scene = scene;
    this.vehicles = [];
    this.roadLanes = [];
    this.maxTraffic = 20; // 20 autonomous traffic vehicles
  }

  init(ways, project, roadWidthMap) {
    this.extractRoadLanes(ways, project, roadWidthMap);
    this.spawnTraffic();
  }

  // Extract forward and backward driving lanes for roads
  extractRoadLanes(ways, project, roadWidthMap) {
    for (const w of ways) {
      const type = w.tags?.highway;
      const width = roadWidthMap[type];
      if (!width || width < 6 || !w.geometry || w.geometry.length < 2) continue;

      const pts = w.geometry.map((p) => project(p.lat, p.lon));
      const laneOffset = width * 0.24; // offset from centerline to lane center

      const laneFwd = [];
      const laneRev = [];

      for (let i = 0; i < pts.length; i++) {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        dx /= len; dz /= len;
        const nx = -dz, nz = dx; // road normal

        // Lane right (forward) & lane left (reverse)
        laneFwd.push(new THREE.Vector2(pts[i][0] + nx * laneOffset, pts[i][1] + nz * laneOffset));
        laneRev.push(new THREE.Vector2(pts[i][0] - nx * laneOffset, pts[i][1] - nz * laneOffset));
      }

      if (laneFwd.length >= 2) this.roadLanes.push({ waypoints: laneFwd });
      if (laneRev.length >= 2) this.roadLanes.push({ waypoints: laneRev.reverse() });
    }
  }

  spawnTraffic() {
    if (!this.roadLanes.length) return;

    const types = ['keke', 'okada', 'danfo', 'car', 'keke', 'car'];
    for (let i = 0; i < this.maxTraffic; i++) {
      const type = types[i % types.length];
      let mesh;
      let topSpeed = 9; // m/s (~32 km/h)
      let vehLength = 2.5;

      if (type === 'keke') {
        mesh = buildKekeMesh();
        topSpeed = 8.5;
        vehLength = 2.4;
      } else if (type === 'okada') {
        mesh = buildOkadaMesh();
        topSpeed = 12.0; // agile okada
        vehLength = 2.0;
      } else if (type === 'danfo') {
        mesh = buildTrafficDanfoMesh();
        topSpeed = 10.0;
        vehLength = 4.8;
      } else {
        mesh = buildTrafficCarMesh();
        topSpeed = 11.0;
        vehLength = 4.4;
      }

      const laneIdx = Math.floor(Math.random() * this.roadLanes.length);
      const lane = this.roadLanes[laneIdx];
      const startNode = Math.floor(Math.random() * (lane.waypoints.length - 1));
      const pt = lane.waypoints[startNode];

      mesh.position.set(pt.x, 0, pt.y);
      this.scene.add(mesh);

      const displayName =
        type === 'danfo'
          ? 'Danfo Commercial Bus'
          : type === 'car'
          ? 'Toyota Saloon Sedan'
          : type === 'keke'
          ? 'Bajaj RE Tricycle'
          : 'Okada Express Bike';

      this.vehicles.push({
        id: i,
        type,
        name: displayName,
        mesh,
        lane,
        nodeIdx: startNode,
        speed: 0,
        targetSpeed: topSpeed * (0.8 + Math.random() * 0.4),
        vehLength,
        honkCooldown: 0,
      });
    }
  }

  getNearestVehicle(pos, maxDist = 5.5) {
    let best = null, bd = maxDist;
    for (const v of this.vehicles) {
      if (!v.mesh) continue;
      const p = v.mesh.position;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  }

  removeVehicle(targetV) {
    const idx = this.vehicles.indexOf(targetV);
    if (idx !== -1) {
      this.vehicles.splice(idx, 1);
      if (targetV.mesh) this.scene.remove(targetV.mesh);
    }
  }

  update(dt, playerPos, playerDrivingVehicle, playerObj, gameplayRef, uiRef) {
    for (const v of this.vehicles) {
      const mesh = v.mesh;
      const distToPlayer = Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z);

      // Distance culling & recycling
      if (distToPlayer > 130) {
        if (distToPlayer > 200) {
          const newLane = this.roadLanes[Math.floor(Math.random() * this.roadLanes.length)];
          const pt = newLane.waypoints[0];
          mesh.position.set(pt.x, 0, pt.y);
          v.lane = newLane;
          v.nodeIdx = 0;
          v.speed = 0;
        }
        continue;
      }

      // 1. Navigation along lane waypoints
      const wps = v.lane.waypoints;
      const nextNode = v.nodeIdx + 1;
      if (nextNode >= wps.length) {
        // Reached end of street: pick new connected lane or loop back
        v.lane = this.roadLanes[Math.floor(Math.random() * this.roadLanes.length)];
        v.nodeIdx = 0;
        continue;
      }

      const targetPt = wps[nextNode];
      const dx = targetPt.x - mesh.position.x;
      const dz = targetPt.y - mesh.position.z;
      const distToWp = Math.hypot(dx, dz);

      if (distToWp < 1.5) {
        v.nodeIdx = nextNode;
      }

      // Desired heading
      const targetHeading = Math.atan2(dx, dz);
      let dHeading = targetHeading - mesh.rotation.y;
      dHeading = Math.atan2(Math.sin(dHeading), Math.cos(dHeading));
      mesh.rotation.y += dHeading * Math.min(1, dt * 5);

      // 2. Obstacle & Traffic Detection
      let shouldBrake = false;
      const forwardVec = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), mesh.rotation.y);

      // Check distance to player
      const playerDist = Math.hypot(mesh.position.x - playerPos.x, mesh.position.z - playerPos.z);
      if (playerDist < 7.5) {
        // Dot product to see if player is in front
        const toPlayer = new THREE.Vector2(playerPos.x - mesh.position.x, playerPos.z - mesh.position.z).normalize();
        if (toPlayer.x * forwardVec.x + toPlayer.y * forwardVec.z > 0.6) {
          shouldBrake = true;
          // Honk occasionally when player blocks traffic!
          v.honkCooldown -= dt;
          if (v.honkCooldown <= 0 && distToPlayer < 25) {
            sounds.playHorn();
            v.honkCooldown = 5.0 + Math.random() * 4.0;
          }
        }
      }

      // Human-Car collision: car pushes player if in contact, and deals damage if speeding
      if (!playerDrivingVehicle && playerObj) {
        const hitRadius = (v.vehLength / 2) + 0.85;
        if (playerDist < hitRadius) {
          const pushX = forwardVec.x * Math.max(1.8, v.speed) * dt * 2.0;
          const pushZ = forwardVec.z * Math.max(1.8, v.speed) * dt * 2.0;
          playerObj.position.x += pushX;
          playerObj.position.z += pushZ;

          if (v.speed > 2.8 && gameplayRef) {
            gameplayRef.takeDamage(Math.round(v.speed * 2.2));
            uiRef?.flashDamage();
            sounds.playGroan?.();
          }
        }
      }

      // Check distance to other traffic vehicles in front
      for (const other of this.vehicles) {
        if (other.id === v.id) continue;
        const dOther = Math.hypot(other.mesh.position.x - mesh.position.x, other.mesh.position.z - mesh.position.z);
        if (dOther < v.vehLength + 3.5) {
          const toOther = new THREE.Vector2(other.mesh.position.x - mesh.position.x, other.mesh.position.z - mesh.position.z).normalize();
          if (toOther.x * forwardVec.x + toOther.y * forwardVec.z > 0.7) {
            shouldBrake = true;
            break;
          }
        }
      }

      // 3. Acceleration & Braking
      if (shouldBrake) {
        v.speed = Math.max(0, v.speed - dt * 9.0); // quick brake
      } else {
        v.speed = Math.min(v.targetSpeed, v.speed + dt * 4.5); // accelerate
      }

      // Move forward
      mesh.position.x += forwardVec.x * v.speed * dt;
      mesh.position.z += forwardVec.z * v.speed * dt;
    }
  }

  getTrafficPositions() {
    return this.vehicles.map((v) => ({
      x: v.mesh.position.x,
      z: v.mesh.position.z,
      rotY: v.mesh.rotation.y,
      type: v.type,
    }));
  }
}
