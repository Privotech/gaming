// ============================================================
// CITYVERSE NG  |  gameplay.js
// Economy, Jobs, Real Estate & Daily Living in Ibadan:
// - ₦ Naira wallet & Daily Rent system
// - Danfo & Korope passenger transport routes ("Along Dugbe!")
// - Market goods delivery (Suzuki Carry cargo jobs)
// - Real estate inspection & property ownership (daily rental income)
// - Roadside Buka food dining (Amala, Ewedu, Jollof, Maltina)
// - Day / Night time cycle with lighting updates
// ============================================================

import * as THREE from 'three';
import { sounds } from './audio.js';

export class GameplayManager {
  constructor(scene, housing, sky, sun, renderer) {
    this.scene = scene;
    this.housing = housing;
    this.sky = sky;
    this.sun = sun;
    this.renderer = renderer;

    // Player Economy & Status (GTA 5 Style)
    this.money = 5000; // Starter ₦5,000
    this.stamina = 100; // Max 100
    this.health = 100; // Max 100
    this.maxHealth = 100;
    this.armor = 50; // Max 100
    this.maxArmor = 100;
    this.wantedStars = 0; // 0 to 5
    this.wantedTimer = 0; // evasion timer in seconds
    this.isWasted = false;
    this.isBusted = false;
    this.onWasted = null; // callback to main
    this.onBusted = null; // callback to main
    this.ownedProperties = ['starter_room'];

    // Time of Day (24-hour clock)
    // 8.5 = 08:30 AM
    this.timeOfDay = 9.0;
    this.timeScale = 0.05; // 1 real second = 3 game minutes
    this.dayCount = 1;
    this.rentDueTimer = 24.0; // hours until rent due

    // Jobs System
    this.activeJob = null; // null | { type: 'passenger'|'cargo', ... }
    this.busStops = [];
    this.deliveryDestinations = [];
    this.properties = [];

    // Objective & GPS Waypoint 3D beacon markers
    this.objectiveBeacon = null;
    this.customWaypoint = null; // { x, z, name }
    this.gpsBeacon = null;
  }

  takeDamage(amount) {
    if (this.isWasted || this.isBasted) return;
    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, remaining * 0.7);
      this.armor = Math.max(0, this.armor - absorbed);
      remaining -= absorbed;
    }
    this.health = Math.max(0, this.health - remaining);
    if (this.health <= 0) {
      this.triggerWasted();
    }
  }

  heal(amount = 100) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  repairArmor(amount = 100) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  addWantedStars(stars = 1) {
    const old = this.wantedStars;
    this.wantedStars = Math.min(5, this.wantedStars + stars);
    this.wantedTimer = 25.0 + this.wantedStars * 8.0; // seconds before evasion
    if (this.wantedStars > old) {
      if (this.wantedStars === 1) sounds.playPoliceWhistle();
      else sounds.playPoliceSiren();
    }
  }

  clearWanted() {
    this.wantedStars = 0;
    this.wantedTimer = 0;
  }

  triggerWasted() {
    if (this.isWasted) return;
    this.isWasted = true;
    sounds.playWasted();
    if (this.onWasted) this.onWasted();
  }

  triggerBusted() {
    if (this.isBusted) return;
    this.isBusted = true;
    sounds.playPoliceSiren();
    if (this.onBusted) this.onBusted();
  }

  respawnPlayer(hospitalFee = 1000) {
    this.health = this.maxHealth;
    this.armor = 25;
    this.money = Math.max(0, this.money - hospitalFee);
    this.wantedStars = 0;
    this.wantedTimer = 0;
    this.isWasted = false;
    this.isBusted = false;
  }

  init(roadPts) {
    this.setupBusStops(roadPts);
    this.setupRealEstateProperties(roadPts);
    this.createObjectiveBeacon();
    this.updateLightingForTime(this.timeOfDay);
  }

  // ---------- BUS STOPS FOR DANFO / KOROPE ----------
  setupBusStops(roadPts) {
    const stopNames = [
      'Cocoa House Bus Stop',
      'Post Office Junction',
      'Gbagi Commercial Market',
      'Railway Station Halt',
      'Ekotedo Central Stage',
      'Queen Elizabeth Road Turn',
    ];

    const sampledPts = [];
    const step = Math.max(1, Math.floor(roadPts.length / stopNames.length));
    for (let i = 0; i < roadPts.length && sampledPts.length < stopNames.length; i += step) {
      sampledPts.push(roadPts[i]);
    }

    sampledPts.forEach((pt, idx) => {
      const [x, z, dx, dz] = pt;
      const angle = Math.atan2(dx, dz);
      const nx = -dz, nz = dx;
      const sx = x + nx * 4.5, sz = z + nz * 4.5;

      const stopObj = {
        id: `stop_${idx}`,
        name: stopNames[idx % stopNames.length],
        pos: new THREE.Vector3(sx, 0, sz),
        passengersWaiting: 2 + Math.floor(Math.random() * 4),
      };

      // 3D Visual Bus Stop Pole & Waiting Passengers
      const stopGroup = new THREE.Group();
      stopGroup.position.set(sx, 0, sz);
      stopGroup.rotation.y = angle;

      // Yellow & Black striped bus stop pole
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.5 })
      );
      pole.position.y = 1.9;

      // Bus stop sign plate
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = '#000000'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('BUS STOP', 128, 54);
      ctx.font = '22px sans-serif';
      ctx.fillText(stopNames[idx].slice(0, 16), 128, 96);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 0.8),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas) })
      );
      signMesh.position.set(0, 3.4, 0.05);

      // Yellow glowing stop bay marker
      const bay = new THREE.Mesh(
        new THREE.RingGeometry(2.5, 3.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide })
      );
      bay.rotation.x = -Math.PI / 2;
      bay.position.y = 0.03;

      // 2 Waiting passenger character shapes with bags
      [-0.8, 0.8].forEach((px, pidx) => {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.25, 0.7, 4, 8),
          new THREE.MeshStandardMaterial({ color: pidx === 0 ? 0x1976d2 : 0xd32f2f })
        );
        body.position.set(px, 0.75, 1.2);
        // Suitcase / Ghana-Must-Go bag
        const bag = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.45, 0.25),
          new THREE.MeshStandardMaterial({ color: 0xffeb3b })
        );
        bag.position.set(px + 0.35, 0.22, 1.2);
        stopGroup.add(body, bag);
      });

      stopGroup.add(pole, signMesh, bay);
      this.scene.add(stopGroup);
      this.busStops.push(stopObj);
    });
  }

  // ---------- REAL ESTATE PROPERTIES ----------
  setupRealEstateProperties(roadPts) {
    this.properties = [
      {
        id: 'starter_room',
        name: 'Dugbe Face-Me-I-Face-You (Flat 2B)',
        type: 'Residential Room',
        desc: 'Modest single room in a traditional compound with shared balcony. Low rent.',
        rent: 1500,
        price: 25000,
        dailyIncome: 0,
        owned: true,
        pos: new THREE.Vector3(28, 0, -18),
      },
      {
        id: 'cocoa_view_house',
        name: 'Cocoa View 2-Bedroom Storey Flat',
        type: 'Residential Storey Building',
        desc: 'Upper-floor flat with private veranda overlooking Cocoa House. Good breeze and high security.',
        rent: 3500,
        price: 65000,
        dailyIncome: 1500,
        owned: false,
        pos: new THREE.Vector3(-45, 0, 52),
      },
      {
        id: 'commercial_shopfront',
        name: 'Dugbe Commercial Shopfront & Yard',
        type: 'Commercial Property',
        desc: 'Prime street-facing lockup shop with generator cage. Collects strong daily tenant rental!',
        rent: 5000,
        price: 120000,
        dailyIncome: 4200,
        owned: false,
        pos: new THREE.Vector3(55, 0, 30),
      },
      {
        id: 'luxury_duplex',
        name: 'Royal Heritage Dugbe Duplex Compound',
        type: 'Luxury Gated Estate',
        desc: 'Expansive compound with perimeter fence, private GeePee tank, and space for 4 vehicles.',
        rent: 12000,
        price: 250000,
        dailyIncome: 9500,
        owned: false,
        pos: new THREE.Vector3(-60, 0, -50),
      },
    ];

    // Build physical "FOR SALE / TO LET" signboards in world
    this.properties.forEach((prop) => {
      const g = new THREE.Group();
      g.position.copy(prop.pos);

      const canvas = document.createElement('canvas');
      canvas.width = 384; canvas.height = 192;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = prop.owned ? '#1b5e20' : '#b71c1c';
      ctx.fillRect(0, 0, 384, 192);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prop.owned ? 'OCCUPIED / OWNED' : 'TO LET / FOR SALE', 192, 45);
      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(prop.name.slice(0, 24), 192, 85);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px sans-serif';
      ctx.fillText(prop.owned ? 'Collects Daily Profit' : `Rent: ₦${prop.rent.toLocaleString()} | Buy: ₦${prop.price.toLocaleString()}`, 192, 125);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#80d8ff';
      ctx.fillText('[E] Inspect Property', 192, 165);

      const signTex = new THREE.CanvasTexture(canvas);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.6),
        new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 })
      );
      board.position.y = 2.0;

      const post1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x4e342e }));
      post1.position.set(-1.2, 1.2, 0);
      const post2 = post1.clone();
      post2.position.x = 1.2;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 2.0, 16),
        new THREE.MeshBasicMaterial({ color: prop.owned ? 0x4caf50 : 0xf44336, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;

      g.add(board, post1, post2, ring);
      this.scene.add(g);
    });
  }

  // 3D Objective Marker (Pillar of light + spinning diamond beacon)
  createObjectiveBeacon() {
    this.objectiveBeacon = new THREE.Group();
    const beamGeo = new THREE.CylinderGeometry(0.6, 0.6, 60, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 30;

    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.8),
      new THREE.MeshBasicMaterial({ color: 0xffeb3b, wireframe: true })
    );
    diamond.position.y = 6;

    this.objectiveBeacon.add(beam, diamond);
    this.objectiveBeacon.visible = false;
    this.scene.add(this.objectiveBeacon);
  }

  // ---------- JOBS: PASSENGER TRANSPORT ("ALONG DUGBE!") ----------
  startPassengerJob(startStop = null) {
    if (!this.busStops.length) return false;
    const origin = startStop || this.busStops[Math.floor(Math.random() * this.busStops.length)];
    // Select destination different from origin
    let dest = this.busStops[Math.floor(Math.random() * this.busStops.length)];
    while (dest.id === origin.id && this.busStops.length > 1) {
      dest = this.busStops[Math.floor(Math.random() * this.busStops.length)];
    }

    const passengerCount = 2 + Math.floor(Math.random() * 4);
    const farePerHead = 300 + Math.floor(Math.random() * 400); // ₦300 - ₦700

    this.activeJob = {
      type: 'passenger',
      title: 'Danfo / Korope Passenger Run',
      origin,
      dest,
      passengers: passengerCount,
      farePerHead,
      totalFare: passengerCount * farePerHead,
      timer: 85, // seconds
      maxTime: 85,
    };

    sounds.playChime();
    this.setObjectiveLocation(dest.pos);
    return true;
  }

  // ---------- JOBS: MARKET GOODS CARGO DELIVERY ----------
  startCargoJob() {
    if (!this.housing.bukaStalls.length && !this.busStops.length) return false;
    // Deliver to one of the shops or compounds
    const target = this.housing.bukaStalls[0] || this.busStops[0];
    const reward = 1800 + Math.floor(Math.random() * 1200); // ₦1,800 - ₦3,000

    this.activeJob = {
      type: 'cargo',
      title: 'Dugbe Market Supply Delivery',
      destName: target.name || 'Dugbe Commercial Stall',
      destPos: target.pos,
      reward,
      cargoHealth: 100,
      timer: 110,
      maxTime: 110,
    };

    sounds.playChime();
    this.setObjectiveLocation(target.pos);
    return true;
  }

  setObjectiveLocation(pos) {
    if (this.objectiveBeacon) {
      this.objectiveBeacon.position.set(pos.x, 0, pos.z);
      this.objectiveBeacon.visible = true;
    }
  }

  clearObjective() {
    if (this.objectiveBeacon) {
      this.objectiveBeacon.visible = false;
    }
    this.activeJob = null;
  }

  // Complete passenger route successfully
  completePassengerJob() {
    if (!this.activeJob || this.activeJob.type !== 'passenger') return 0;
    const earned = this.activeJob.totalFare;
    this.money += earned;
    sounds.playCash();
    const summary = {
      earned,
      passengers: this.activeJob.passengers,
      nextStop: this.activeJob.dest,
    };
    this.clearObjective();
    return summary;
  }

  // Complete cargo delivery
  completeCargoJob() {
    if (!this.activeJob || this.activeJob.type !== 'cargo') return 0;
    const finalPayout = Math.round(this.activeJob.reward * (this.activeJob.cargoHealth / 100));
    this.money += finalPayout;
    sounds.playCash();
    this.clearObjective();
    return finalPayout;
  }

  // BUKA MEAL DINING (Refill Stamina)
  eatMeal(mealIndex) {
    const meals = [
      { name: 'Amala + Ewedu + Gbegiri + Ogunfe', cost: 800, stamina: 50 },
      { name: 'Jollof Rice + Fried Plantain (Dodo) + Beef', cost: 700, stamina: 40 },
      { name: 'Chilled Bottle of Maltina / Minerals', cost: 300, stamina: 25 },
    ];
    const meal = meals[mealIndex];
    if (!meal) return { success: false, msg: 'Invalid meal' };
    if (this.money < meal.cost) {
      return { success: false, msg: `Not enough cash! You need ₦${meal.cost}` };
    }

    this.money -= meal.cost;
    this.stamina = Math.min(100, this.stamina + meal.stamina);
    sounds.playEat();
    return {
      success: true,
      msg: `Enjoyed ${meal.name}! +${meal.stamina}% Stamina`,
      meal,
    };
  }

  // REAL ESTATE ACTIONS
  buyProperty(propId) {
    const prop = this.properties.find((p) => p.id === propId);
    if (!prop) return { success: false, msg: 'Property not found' };
    if (prop.owned) return { success: false, msg: 'You already own this property!' };
    if (this.money < prop.price) {
      return { success: false, msg: `Insufficient funds! Need ₦${prop.price.toLocaleString()}` };
    }

    this.money -= prop.price;
    prop.owned = true;
    this.ownedProperties.push(prop.id);
    sounds.playCash();
    return {
      success: true,
      msg: `Congratulations! You now own ${prop.name}!`,
      prop,
    };
  }

  // SLEEP & ADVANCE TIME (Morning, Afternoon, Golden Hour, Night)
  sleepTo(targetHour) {
    sounds.playDoor();
    this.timeOfDay = targetHour;
    this.stamina = 100; // Fully refreshed!
    this.dayCount++;

    // Collect daily rental income from owned properties!
    let totalIncome = 0;
    this.properties.forEach((p) => {
      if (p.owned && p.dailyIncome > 0) totalIncome += p.dailyIncome;
    });
    if (totalIncome > 0) {
      this.money += totalIncome;
      sounds.playCash();
    }

    // Deduct daily rent if starter room is rented
    if (!this.properties.find((p) => p.id === 'starter_room')?.owned) {
      this.money = Math.max(0, this.money - 1500);
    }

    this.updateLightingForTime(this.timeOfDay);
    return {
      day: this.dayCount,
      time: targetHour,
      rentalIncome: totalIncome,
    };
  }

  // Time & Lighting updates
  updateLightingForTime(hour) {
    if (!this.sky || !this.sun) return;
    const su = this.sky.material.uniforms;

    // Map hour 0..24 to sun elevation & turbidity
    // 07:00 Sunrise, 13:00 Noon, 18:00 Sunset/Golden Hour, 22:00 Night
    let elevation = 0, azimuth = 150;
    let turbidity = 9, rayleigh = 2;
    let sunColor = 0xfff1dc, sunIntensity = 4;

    if (hour >= 6 && hour < 12) {
      // Morning
      elevation = (hour - 6) * 10 + 10;
      turbidity = 6; rayleigh = 2;
      sunColor = 0xfff4e6; sunIntensity = 3.8;
      this.renderer.toneMappingExposure = 0.48;
    } else if (hour >= 12 && hour < 17) {
      // Afternoon
      elevation = 75 - (hour - 12) * 5;
      turbidity = 8; rayleigh = 2.2;
      sunColor = 0xfffaed; sunIntensity = 4.2;
      this.renderer.toneMappingExposure = 0.5;
    } else if (hour >= 17 && hour < 19.5) {
      // Golden Hour / Harmattan Sunset
      elevation = Math.max(2, 25 - (hour - 17) * 9);
      turbidity = 14; rayleigh = 4.5;
      sunColor = 0xff7722; sunIntensity = 3.2; // warm orange
      this.renderer.toneMappingExposure = 0.42;
    } else {
      // Night
      elevation = -15;
      turbidity = 3; rayleigh = 0.2;
      sunColor = 0x223355; sunIntensity = 0.4;
      this.renderer.toneMappingExposure = 0.22;
    }

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(azimuth);
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
    su.sunPosition.value.copy(sunDir);
    su.turbidity.value = turbidity;
    su.rayleigh.value = rayleigh;

    this.sun.color.setHex(sunColor);
    this.sun.intensity = sunIntensity;
    this.sunDir = sunDir;
  }

  // Per-frame game loop update
  update(dt, playerPos, isRunning) {
    // Advance time smoothly
    this.timeOfDay = (this.timeOfDay + (dt * this.timeScale)) % 24;

    // Drain stamina if running
    if (isRunning) {
      this.stamina = Math.max(0, this.stamina - dt * 3.5);
    } else {
      // Slow recovery when walking/resting
      this.stamina = Math.min(100, this.stamina + dt * 0.8);
    }

    // Active Job timer
    if (this.activeJob) {
      this.activeJob.timer -= dt;
      if (this.activeJob.timer <= 0) {
        // Job expired / failed
        this.clearObjective();
      }
    }

    // Wanted Level Evasion Countdown (GTA 5 style)
    if (this.wantedStars > 0) {
      this.wantedTimer -= dt;
      if (this.wantedTimer <= 0) {
        this.wantedStars = Math.max(0, this.wantedStars - 1);
        if (this.wantedStars > 0) {
          this.wantedTimer = 15.0; // cooldown to lose next star
        } else {
          sounds.playChime(); // Evaded wanted level!
        }
      }
    }

    // Diamond beacon rotation & gentle bobbing
    if (this.objectiveBeacon && this.objectiveBeacon.visible) {
      this.objectiveBeacon.children[1].rotation.y += dt * 2.5;
      this.objectiveBeacon.children[1].position.y = 6 + Math.sin(Date.now() * 0.003) * 0.8;
    }
  }

  getTimeFormatted() {
    const hours = Math.floor(this.timeOfDay);
    const mins = Math.floor((this.timeOfDay % 1) * 60);
    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    let phase = 'Morning';
    if (hours >= 12 && hours < 17) phase = 'Afternoon';
    else if (hours >= 17 && hours < 20) phase = 'Sunset';
    else if (hours >= 20 || hours < 6) phase = 'Night';
    return { text: `${hh}:${mm}`, phase, hours, mins };
  }
}
