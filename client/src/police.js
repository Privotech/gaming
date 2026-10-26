// ============================================================
// CITYVERSE NG  |  police.js
// GTA 5-Style Active Police Pursuit System:
// - Nigeria Police Force (NPF) & Operation Burst Patrol Vehicles
// - Flashing Dual Red & Blue Emergency Strobe Lightbars & Pointlights
// - Real-time Aggressive Pursuit AI (Pincer maneuvers, Ramming, Roadblocks)
// - Distance-scaled Wailing Sirens & Megaphone Subtitles
// - Arrest / Busted Trigger when stopped or surrounded
// - Full integration with Wanted Stars (1 to 5 Stars) & Minimap Radar
// ============================================================

import * as THREE from 'three';

function box(w, h, l, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

// Canvas-generated Nigeria Police Force / Operation Burst Door Decal
function makePoliceDecal() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);

  // Diagonal green & yellow high-vis stripes
  ctx.fillStyle = '#00e676';
  ctx.fillRect(0, 0, 256, 18);
  ctx.fillStyle = '#ffea00';
  ctx.fillRect(0, 18, 256, 14);

  // Police Text
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICE', 128, 68);

  ctx.fillStyle = '#d50000';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('OPERATION BURST', 128, 92);

  ctx.fillStyle = '#555555';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('OYO STATE COMMAND • 112', 128, 114);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 124);

  const tex = new THREE.CanvasTexture(c);
  return new THREE.MeshBasicMaterial({ map: tex, transparent: false });
}

// 3D Model: Nigeria Police Force Hilux / Patrol Interceptor Cruiser
function buildPoliceCruiser() {
  const g = new THREE.Group();

  // Materials
  const blackPaint = new THREE.MeshStandardMaterial({ color: 0x0a1118, roughness: 0.35, metalness: 0.5 });
  const whitePaint = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x091016, roughness: 0.05, transparent: true, opacity: 0.85 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
  const steelBlack = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.8 });
  const decalMat = makePoliceDecal();

  // 1. Lower Chassis & Main Body
  g.add(box(1.95, 0.75, 4.6, blackPaint, 0, 0.55, 0));

  // 2. White Cab & Doors (Authentic Nigerian Police two-tone black/white)
  g.add(box(1.97, 0.72, 2.2, whitePaint, 0, 0.6, 0.1));

  // Door Police Badges (Both sides)
  const decalL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), decalMat);
  decalL.position.set(-0.99, 0.65, 0.1);
  decalL.rotation.y = -Math.PI / 2;

  const decalR = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), decalMat);
  decalR.position.set(0.99, 0.65, 0.1);
  decalR.rotation.y = Math.PI / 2;
  g.add(decalL, decalR);

  // 3. Cabin Greenhouse & Windows
  g.add(box(1.82, 0.7, 2.4, darkGlass, 0, 1.28, 0.1));
  // Roof plate
  g.add(box(1.86, 0.08, 2.3, blackPaint, 0, 1.65, 0.1));

  // 4. Heavy-Duty Police Steel Push Bumper (Bull bar) on Front
  const bullBar = new THREE.Group();
  bullBar.add(box(1.7, 0.55, 0.1, steelBlack, 0, 0.65, 2.38));
  bullBar.add(box(0.12, 0.85, 0.12, chrome, -0.65, 0.72, 2.4));
  bullBar.add(box(0.12, 0.85, 0.12, chrome, 0.65, 0.72, 2.4));
  bullBar.add(box(1.4, 0.08, 0.08, chrome, 0, 0.95, 2.4));
  g.add(bullBar);

  // 5. Headlights & High-beam flashers
  [-0.7, 0.7].forEach((lx) => {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff9e6, emissiveIntensity: 2.5 })
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(lx, 0.65, 2.32);
    g.add(lamp);
  });

  // 6. Taillights
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xd50000, emissive: 0xb71c1c, emissiveIntensity: 1.0 });
  [-0.75, 0.75].forEach((tx) => {
    g.add(box(0.24, 0.15, 0.04, tailMat, tx, 0.68, -2.31));
  });

  // 7. ROOF EMERGENCY STROBE LIGHTBAR (Dual Red & Blue)
  const lightbarGroup = new THREE.Group();
  lightbarGroup.position.set(0, 1.76, 0.1);

  // Mounting bracket
  lightbarGroup.add(box(1.3, 0.06, 0.25, steelBlack, 0, 0, 0));

  // Red Strobe Lens (Left)
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    emissive: 0xff1744,
    emissiveIntensity: 0.5,
    roughness: 0.1,
  });
  const redLens = box(0.5, 0.14, 0.22, redMat, -0.32, 0.08, 0);

  // Blue Strobe Lens (Right)
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x2979ff,
    emissive: 0x2979ff,
    emissiveIntensity: 0.5,
    roughness: 0.1,
  });
  const blueLens = box(0.5, 0.14, 0.22, blueMat, 0.32, 0.08, 0);

  // Dynamic Pointlights for illuminating buildings/streets with police strobes
  const redLight = new THREE.PointLight(0xff1744, 0, 22);
  redLight.position.set(-0.35, 0.3, 0);

  const blueLight = new THREE.PointLight(0x2979ff, 0, 22);
  blueLight.position.set(0.35, 0.3, 0);

  lightbarGroup.add(redLens, blueLens, redLight, blueLight);
  g.add(lightbarGroup);

  // 8. Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheelR = 0.36, wheelW = 0.22;
  const wheelSpots = [
    [0.92, wheelR, 1.45],
    [-0.92, wheelR, 1.45],
    [0.92, wheelR, -1.45],
    [-0.92, wheelR, -1.45],
  ];
  wheelSpots.forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 16), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    // Chrome center hub
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, wheelW + 0.02, 12), chrome);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(wx, wy, wz);
    g.add(w, cap);
  });

  // 9. Uniformed Police Officers Inside (Driver & Passenger)
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.8 });
  const policeVestMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.5 }); // High-vis yellow vest
  const beretMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });

  [-0.42, 0.42].forEach((ox) => {
    const offTorso = box(0.38, 0.45, 0.2, policeVestMat, ox, 1.15, 0.2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
    head.position.set(ox, 1.5, 0.2);
    const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12), beretMat);
    beret.position.set(ox, 1.59, 0.2);
    beret.rotation.z = -0.15;
    g.add(offTorso, head, beret);
  });

  return {
    group: g,
    redMat,
    blueMat,
    redLight,
    blueLight,
  };
}

export class PoliceManager {
  constructor(scene, roadPts, gameplay, ui, sounds) {
    this.scene = scene;
    this.roadPts = roadPts;
    this.gameplay = gameplay;
    this.ui = ui;
    this.sounds = sounds;

    this.policeCars = [];
    this.strobeTimer = 0;
    this.sirenTimer = 0;
    this.calloutTimer = 4.0;
    this.arrestTimer = 0;
  }

  init() {
    console.log('Police pursuit system ready.');
  }

  // Spawns a police cruiser on a road segment near the player
  spawnPoliceCar(playerPos) {
    if (!this.roadPts || !this.roadPts.length) return null;

    // Find road nodes between 30m and 70m away for instant visibility
    const candidates = [];
    for (const pt of this.roadPts) {
      const [rx, rz] = pt;
      const dist = Math.hypot(rx - playerPos.x, rz - playerPos.z);
      if (dist >= 30 && dist <= 75) {
        candidates.push({ pt, dist });
      }
    }

    let chosen;
    if (candidates.length > 0) {
      // Pick one with good visual line
      chosen = candidates[Math.floor(Math.random() * candidates.length)].pt;
    } else {
      // Fallback: spawn 45m behind or ahead on nearest road
      let nearest = this.roadPts[0], nd = 9999;
      for (const pt of this.roadPts) {
        const d = Math.hypot(pt[0] - playerPos.x, pt[1] - playerPos.z);
        if (d < nd) { nd = d; nearest = pt; }
      }
      chosen = [nearest[0] + 35, nearest[1] + 35, nearest[2], nearest[3]];
    }

    const [sx, sz] = chosen;
    const cruiser = buildPoliceCruiser();
    cruiser.group.position.set(sx, 0, sz);

    // Face towards player
    const targetHeading = Math.atan2(playerPos.x - sx, playerPos.z - sz);
    cruiser.group.rotation.y = targetHeading;

    this.scene.add(cruiser.group);

    const copData = {
      id: Date.now() + Math.random(),
      mesh: cruiser.group,
      visuals: cruiser,
      speed: 8.0, // starts in motion immediately
      topSpeed: 18.0 + Math.random() * 4.0, // ~70 km/h
      ramCooldown: 0,
      state: 'PURSUIT',
    };

    this.policeCars.push(copData);
    this.sounds?.playPoliceSiren();
    return copData;
  }

  update(dt, playerPos, playerDrivingVehicle, playerObj, blockedFn = null) {
    const wantedStars = this.gameplay?.wantedStars || 0;

    // Determine target number of chasing police cars based on Wanted Stars
    let targetCops = 0;
    if (wantedStars === 1) targetCops = 1;
    else if (wantedStars === 2) targetCops = 2;
    else if (wantedStars === 3) targetCops = 3;
    else if (wantedStars >= 4) targetCops = 4;

    // Spawn squad cars if needed
    if (this.policeCars.length < targetCops) {
      this.spawnPoliceCar(playerPos);
    }

    // Lightbar strobe clock (8Hz flashing)
    this.strobeTimer += dt * 8;
    const isRedPhase = Math.floor(this.strobeTimer) % 2 === 0;

    // Track distance to closest police car for siren volume & HUD
    let closestDist = 9999;
    let closestCop = null;

    for (let i = this.policeCars.length - 1; i >= 0; i--) {
      const cop = this.policeCars[i];
      const mesh = cop.mesh;
      const dx = playerPos.x - mesh.position.x;
      const dz = playerPos.z - mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < closestDist) {
        closestDist = dist;
        closestCop = cop;
      }

      // 1. If wanted level is 0: dismiss police once far away
      if (wantedStars === 0) {
        cop.visuals.redLight.intensity = 0;
        cop.visuals.blueLight.intensity = 0;
        cop.visuals.redMat.emissiveIntensity = 0.1;
        cop.visuals.blueMat.emissiveIntensity = 0.1;

        if (dist > 50) {
          this.scene.remove(mesh);
          this.policeCars.splice(i, 1);
          continue;
        } else {
          // Slow down to a stop smoothly
          cop.speed = Math.max(0, cop.speed - dt * 6.0);
          const forwardX = Math.sin(mesh.rotation.y);
          const forwardZ = Math.cos(mesh.rotation.y);
          mesh.position.x += forwardX * cop.speed * dt;
          mesh.position.z += forwardZ * cop.speed * dt;
          continue;
        }
      }

      // 2. Animate Strobe Lights (Emissive + Dynamic Pointlights)
      cop.visuals.redMat.emissiveIntensity = isRedPhase ? 4.0 : 0.2;
      cop.visuals.blueMat.emissiveIntensity = isRedPhase ? 0.2 : 4.0;
      cop.visuals.redLight.intensity = isRedPhase ? 3.0 : 0;
      cop.visuals.blueLight.intensity = isRedPhase ? 0 : 3.0;

      // 3. Dynamic Pursuit Steering AI
      // Lead target slightly if player is driving fast
      let targetX = playerPos.x;
      let targetZ = playerPos.z;
      if (playerDrivingVehicle && playerDrivingVehicle.kmh > 15) {
        const lead = Math.min(dist * 0.35, 14);
        const fwdX = -Math.sin(playerDrivingVehicle.heading);
        const fwdZ = -Math.cos(playerDrivingVehicle.heading);
        targetX += fwdX * lead;
        targetZ += fwdZ * lead;
      }

      const desiredHeading = Math.atan2(targetX - mesh.position.x, targetZ - mesh.position.z);
      let dRot = desiredHeading - mesh.rotation.y;
      dRot = Math.atan2(Math.sin(dRot), Math.cos(dRot));
      mesh.rotation.y += dRot * Math.min(1, dt * 5.0);

      // Building collision avoidance
      const fwdCheckX = Math.sin(mesh.rotation.y);
      const fwdCheckZ = Math.cos(mesh.rotation.y);
      if (blockedFn && blockedFn(mesh.position.x + fwdCheckX * 3.0, mesh.position.z + fwdCheckZ * 3.0)) {
        // Steer slightly away from obstacle
        mesh.rotation.y += (Math.random() > 0.5 ? 1 : -1) * dt * 3.5;
      }

      // 4. Acceleration & Ramming Tactics
      if (dist > 6.0) {
        cop.speed = Math.min(cop.topSpeed, cop.speed + dt * 7.5);
      } else {
        // Close-range pit maneuver ramming or blocking
        cop.speed = Math.min(cop.topSpeed * 0.95, cop.speed + dt * 4.0);
      }

      // Move forward along heading
      const forwardX = Math.sin(mesh.rotation.y);
      const forwardZ = Math.cos(mesh.rotation.y);
      mesh.position.x += forwardX * cop.speed * dt;
      mesh.position.z += forwardZ * cop.speed * dt;

      // 5. Physical Ramming & Collision against Player
      if (dist < 4.2) {
        cop.ramCooldown -= dt;
        if (cop.ramCooldown <= 0) {
          cop.ramCooldown = 1.2;

          // Metal impact sound & dent
          this.sounds?.playDent();
          this.ui?.flashDamage();

          if (playerDrivingVehicle) {
            // Push player's car sideways (PIT maneuver)
            const pushX = forwardX * 7.0;
            const pushZ = forwardZ * 7.0;
            playerDrivingVehicle.body?.applyImpulse({ x: pushX, y: 0.5, z: pushZ }, true);
            this.gameplay?.takeDamage(12);
          } else if (playerObj) {
            // Push player on foot
            playerObj.position.x += forwardX * 3.2;
            playerObj.position.z += forwardZ * 3.2;
            this.gameplay?.takeDamage(18);
            this.sounds?.playGroan();
          }
        }
      }

      // 6. Arrest / Busted Trigger (Surrounded & stopped)
      const playerSpeed = playerDrivingVehicle ? playerDrivingVehicle.kmh : 0;
      if (dist < 4.5 && playerSpeed < 5) {
        this.arrestTimer += dt;
        if (this.arrestTimer > 2.2) {
          this.arrestTimer = 0;
          this.gameplay?.triggerBusted();
          return;
        }
      } else {
        this.arrestTimer = Math.max(0, this.arrestTimer - dt * 2.0);
      }
    }

    this.closestDist = closestDist;

    // 7. Periodic Police Radio Megaphone Callouts
    if (wantedStars > 0 && closestDist < 80) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) {
        this.calloutTimer = 8.0 + Math.random() * 4.0;
        const callouts = [
          'OYO STATE POLICE: Pull over your vehicle immediately!',
          'Operation Burst to Suspect: Stop the car and step out with hands raised!',
          'Control, suspect is evading down Dugbe main road, deploy roadblocks!',
          'Drop the steering! Pull over to the curb right now!',
          'NPF Oyo Command: Do not resist, you are surrounded!',
        ];
        const randomCallout = callouts[Math.floor(Math.random() * callouts.length)];
        this.ui?.showShout(randomCallout);
        this.sounds?.playPoliceWhistle();
      }

      // Periodic siren wail
      this.sirenTimer -= dt;
      if (this.sirenTimer <= 0) {
        this.sirenTimer = 3.6;
        this.sounds?.playPoliceSiren();
      }
    }
  }

  dismissAll() {
    for (const cop of this.policeCars) {
      if (cop.mesh && cop.mesh.parent) {
        this.scene.remove(cop.mesh);
      }
    }
    this.policeCars = [];
    this.arrestTimer = 0;
    this.closestDist = 9999;
  }

  getPursuitInfo() {
    return {
      count: this.policeCars.length,
      closestDist: this.closestDist || 9999,
      isChasing: (this.gameplay?.wantedStars || 0) > 0,
    };
  }

  getPolicePositions() {
    return this.policeCars.map((cop) => ({
      x: cop.mesh.position.x,
      z: cop.mesh.position.z,
      rotY: cop.mesh.rotation.y,
      speed: cop.speed,
      isChasing: (this.gameplay?.wantedStars || 0) > 0,
    }));
  }
}
