# CityVerse NG — 3D Ibadan Open-World Simulation

**CityVerse NG** is a high-fidelity, browser-based 3D open-world game and urban simulation set in the historic commercial heart of **Ibadan, Nigeria** (centered around the Dugbe Central Business District, Cocoa House, Ekotedo, and Gbagi Market).

Powered by **Three.js**, **Rapier 3D Physics**, real **OpenStreetMap (OSM)** geospatial cartography, and an authentic Nigerian cultural soundscape and vehicle fleet.

---

## 🌟 Key Highlights & Systems Implemented

### 1. Geospatial World & Nigerian Architecture
* **Real-World OSM Cartography**: Procedurally parses building footprints, road geometries, street lamps, and vegetation directly from OpenStreetMap data centered at Dugbe (lat `7.3962`, lon `3.8968`).
* **Authentic Tropical Textures**: Custom procedural PBR surface shaders replicating Nigerian urban textures:
  * Weathered zinc roofs with orange rust and rainwater drip stains.
  * Tropical stippled concrete block plaster with dampness plinth bands.
  * Red African laterite clay/gravel soil.
  * Bituminous asphalt road surfaces with worn white lane markings.
* **Iconic Landmarks**:
  * **Cocoa House**: Nigeria's iconic 26-story skyscraper.
  * **Cocoa View Safehouse**: Fully accessible apartment interior with bed (advances time of day) and Dugbe view balcony.
  * **Dugbe Railway Terminus**: Historic colonial railway hub.
  * **Oyo State Police Command**: Security headquarters.
  * **Buka Amala Stalls & Filling Stations**: Authentic street dining and fuel stops.

### 2. Vehicle Fleet & Rapier 3D Physics
* Real rigid-body vehicle physics powered by `@dimforge/rapier3d-compat` (spring suspension, tire friction, steering geometry, drift dynamics, and roll recovery).
* **Authentic Nigerian Vehicle Fleet**:
  * **Danfo Commercial Bus (VW T3 / Toyota HiAce)**: Iconic yellow & black commercial stripes, mud flaps, luggage roof rack, and diesel engine acoustics.
  * **Suzuki Carry ("Korope")**: Agile microvan with spring suspension physics and high-detail 3D GLB model.
  * **Toyota Saloon Sedan**: Aerodynamic body, alloy rims, disc brakes, working projector headlights, and reactive LED brake lights.
  * **NPF Police Patrol Cruiser**: Reinforced push bumper, dual red/blue revolving LED strobe lightbars, and pursuit AI.
  * **Bajaj Boxer Keke Napep & Okada**: Tricycles and motorcycles active in city traffic.
* **Driving Features**:
  * Carjacking & entry system (`[F]` / `[E]`).
  * 4 Dynamic GTA-style camera perspectives (`[V]`): Close, Normal, Far, and First-Person Hood/Bumper view.
  * In-Car Radio Cassette Player (`[N]`) with live procedural audio stations (Afrobeats, Fuji Beats, Highlife Radio, and Dugbe News).
  * Vehicle horn (`[H]`) and vehicle flip recovery (`[R]`).

### 3. Nigeria Police Force (NPF) Active Pursuit AI
* **Wanted Stars System (1–5 Stars)**: Triggered dynamically by vehicle hijacking, assaulting citizens, or speeding through roadside police checkpoints.
* **Pursuit AI Tactics**:
  * Dynamic spawning ahead of the player on nearby road nodes.
  * Obstacle avoidance against buildings and street infrastructure.
  * Aggressive interception angles and PIT / ramming maneuvers.
  * Realistic procedural dual-tone police siren synthesis and whistle alerts.
* **Pursuit HUD & Radar**:
  * Flashing red/blue pursuit banner tracking active patrol units, closest cruiser distance, and evasion progress.
  * Minimap radar blips with animated strobe rings and heading arrows.
* **GTA-style "WASTED" & "BUSTED" Screens**: Cinematic grayscale detention/injury screens with hospital/police station respawn routines.

### 4. Interactive Town Map & GPS Waypoint System (`[M]`)
* **Fullscreen Tactical Vector Map**: High-resolution 2D map rendered on HTML5 canvas with color-coded districts (Dugbe CBD, Cocoa House, Ekotedo, Gbagi Traditional Market, Railway Terminus, Oyo Police Command).
* **Click-to-Set GPS Waypoints**: Clicking anywhere on the town map drops a waypoint with a 3D glowing golden beacon pillar in the world and dotted navigation routing on the minimap.
* **Point of Interest (POI) Directory**: Searchable sidebar categorizing Transit, Safehouses, Police, Services, and Buka eateries with live distance calculations.
* **Fast Travel**: Instant teleportation to major city nodes with nominal transit fare.
* **Optimized Minimap Radar**: Offscreen canvas pre-rendering eliminates costly frame-by-frame redraws.

### 5. Character Animation & Adobe Mixamo Integration
* **Mixamo Rigging & Animation Pipeline**:
  * Player model loaded from `public/assets/models/characters/player.glb`.
  * Bone retargeting automatically standardizes bone naming (`mixamorig` prefix normalization) across arbitrary Mixamo downloads.
  * Animation clips in `public/assets/models/characters/anims/` (`idle.glb`, `walk.glb`, `run.glb`, `jump.glb`).
  * Includes `scripts/convert-animations.mjs` to convert any downloaded Mixamo `.fbx` into lightweight, root-motion-pruned `.glb` animation clips.
* **Pedestrians & Melee Combat**:
  * Walking pedestrians with pathing and avoidance.
  * Punch melee system (`[Q]` or Left-Click) with knockback impulse, cash drops, and crime escalation.

### 6. Street Life, Jobs & Economy
* **Commercial Transit Jobs**: Pick up passengers at Dugbe bus stops ("Along Dugbe!") and drop them off for Naira fares.
* **Roadside Hawkers**: Buy Gala sausage rolls, plantain chips, and cold sachet water.
* **Amala Buka Stalls**: Dine on authentic Ibadan dishes (Amala, Ewedu, Gbegiri, Goat Meat) to replenish energy.
* **Real Estate Inspection**: Inspect residential and commercial properties for rent or purchase.
* **Dugbe Petrol Filling Station**: Refuel vehicle tanks with current PMS rates.

### 7. Engine & iframe Robustness
* **Pointer Lock & Drag-to-Look**: Resolved `The root document of this element is not valid for pointer lock` with a feature-policy guard and seamless click-and-drag camera fallback for sandboxed iframes.
* **Performance Optimizations**: Multi-tier level-of-detail, instanced street poles and trees, offscreen canvas road caching, and responsive framerate monitoring.

---

## 🎮 Game Controls

| Key / Action | Function |
| :--- | :--- |
| **W, A, S, D** / **Arrows** | Move character / Steer, accelerate & reverse vehicle |
| **Shift** | Sprint (on foot) |
| **Space** | Jump (on foot) / Handbrake & Drift (driving) |
| **F** or **E** | Enter, exit, or hijack vehicle / Interact with nearby POIs |
| **Q** or **Left-Click** | Melee Punch (assault / defense) |
| **M** | Toggle Fullscreen Town Map & GPS Navigation |
| **P** | Toggle Police Wanted Status & Pursuit Simulation |
| **N** | Cycle In-Car Radio Station |
| **V** | Cycle Camera View (Close, Normal, Far, Hood Cam) |
| **H** | Vehicle Horn |
| **R** | Reset / Flip vehicle upright |
| **Mouse Drag / Look** | Rotate 360° camera orbit |

---

## 🛠️ Project Structure

```text
├── client/
│   ├── index.html                       # HTML entry point
│   ├── package.json                     # Client dependencies
│   ├── vite.config.js                   # Vite configuration
│   ├── public/
│   │   └── assets/
│   │       └── models/
│   │           ├── characters/          # Mixamo character (player.glb)
│   │           │   └── anims/           # idle.glb, walk.glb, run.glb, jump.glb
│   │           ├── street-lamp/         # 3D street lamp assets
│   │           └── vehicles/            # Suzuki Carry microvan (GLB)
│   ├── scripts/
│   │   ├── convert-animations.mjs       # Mixamo FBX-to-GLB conversion script
│   │   ├── fetch-osm.mjs                # OSM geospatial downloader
│   │   └── inspect-model.mjs            # 3D GLTF inspector utility
│   └── src/
│       ├── main.js                      # Main game loop, camera, input, OSM generation
│       ├── vehicles.js                  # Rapier 3D physics, car models, wheel logic
│       ├── police.js                    # NPF pursuit AI, patrol cruiser models, sirens
│       ├── ui.js                        # HUD, minimap, fullscreen town map, dialogues
│       ├── gameplay.js                  # Economy, wanted stars, day/night, jobs
│       ├── streetLife.js                # Checkpoints, petrol stations, hawkers, bukas
│       ├── housing.js                   # Safehouse interior, balcony, colliders
│       ├── pedestrians.js               # Walking crowd AI, melee hit detection
│       ├── audio.js                     # Procedural audio engine, radio stations, sirens
│       └── style.css                    # Styling and HUD CSS
├── metadata.json                        # Applet metadata
└── package.json                         # Root project scripts & dependencies
```

---

## 🚀 Development & Running Locally

1. **Install dependencies**:
   ```bash
   cd client
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```
