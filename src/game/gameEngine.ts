import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { CaravanState, FactionId, GameEventMessage, PlayerStats, WoodenHut } from '../types/game';
import { FACTIONS } from './constants';
import {
  createCaravanWagon,
  createCharacterModel,
  createGoldLoot,
  createHealthPotion,
  createOakTree,
  createPalaceCitadel,
  createPineTree,
  createShieldBubble,
  createVillainFortress,
  createWoodenHut,
} from './models';
import { soundManager } from '../audio/soundManager';

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  pos: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface Projectile {
  mesh: THREE.Mesh | THREE.Group;
  velocity: THREE.Vector3;
  damage: number;
  isPlayer: boolean;
  faction: FactionId;
  life: number;
  maxLife: number;
  splashRadius?: number;
}

export interface EnemyEntity {
  id: string;
  mesh: THREE.Group;
  faction: FactionId;
  hp: number;
  maxHp: number;
  speed: number;
  targetPos: THREE.Vector3;
  attackCooldown: number;
  damage: number;
  isDead: boolean;
  type: 'soldier' | 'villain_minion' | 'caravan_guard' | 'elf_ranger';
}

export interface LootItem {
  id: string;
  mesh: THREE.Group;
  value: number;
  position: THREE.Vector3;
  isCaravanLoot: boolean;
  type: 'gold' | 'potion';
}

export class GameEngine {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  // Player state
  public faction: FactionId = 'elf';
  public playerMesh!: THREE.Group;
  public playerPos = new THREE.Vector3(0, 0, 10);
  public playerVelocity = new THREE.Vector3();
  public playerRotation = 0;
  public isGrounded = true;
  private isAttacking = false;
  private attackTimer = 0;

  // Survivability & Protection
  public invulnerabilityTimer: number = 0;
  public respawnShieldTimer: number = 4.0;
  public timeSinceLastDamage: number = 0;
  public shieldBubbleMesh?: THREE.Mesh;

  // Camera Orbit / Third Person
  public cameraDistance = 14;
  public cameraPitch = 0.45;
  public cameraYaw = 0;
  private isPointerLocked = false;
  private isRightMouseDown = false;

  // Controls
  private keys: Record<string, boolean> = {};
  public abilityCooldowns: Record<string, number> = {};

  // World objects
  public huts: WoodenHut[] = [];
  private hutMeshes: THREE.Group[] = [];
  public caravanState: CaravanState = {
    id: 'caravan-1',
    active: true,
    position: { x: -80, y: 0, z: -40 },
    hp: 400,
    maxHp: 400,
    progress: 0,
    totalGold: 850,
    robbed: false,
    guardsRemaining: 3,
  };
  private caravanMesh!: THREE.Group;
  private caravanWaypoints: THREE.Vector3[] = [
    new THREE.Vector3(-90, 0, -40),
    new THREE.Vector3(-45, 0, -10),
    new THREE.Vector3(-10, 0, 15), // Passes through forest huts
    new THREE.Vector3(30, 0, -20),
    new THREE.Vector3(70, 0, -60), // Royal Palace Gate
  ];

  public enemies: EnemyEntity[] = [];
  public projectiles: Projectile[] = [];
  public lootItems: LootItem[] = [];
  public floatingTexts: FloatingText[] = [];

  // Stats & Callbacks
  public stats: PlayerStats = {
    health: 220,
    maxHealth: 220,
    stamina: 100,
    maxStamina: 100,
    gold: 50,
    level: 1,
    exp: 0,
    caravansRobbed: 0,
    caravansProtected: 0,
    hutsDefended: 0,
    hutsRaided: 0,
    enemiesDefeated: 0,
    raidsSurvived: 0,
  };

  public onStatsUpdate?: (stats: PlayerStats) => void;
  public onEventMessage?: (msg: GameEventMessage) => void;
  public onCaravanUpdate?: (state: CaravanState) => void;
  public onHutsUpdate?: (huts: WoodenHut[]) => void;
  public onAbilityCooldownsUpdate?: (cooldowns: Record<string, number>) => void;

  public raidCountdown = 30;
  private isDisposed = false;
  private animFrameId: number | null = null;

  constructor(container: HTMLElement, initialFaction: FactionId = 'elf') {
    this.container = container;
    this.faction = initialFaction;
    const cfg = FACTIONS[initialFaction];
    this.stats.maxHealth = cfg.baseHealth;
    this.stats.health = cfg.baseHealth;
    this.init();
  }

  private init() {
    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x82b59f);
    this.scene.fog = new THREE.FogExp2(0x82b59f, 0.0075);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 400);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    const ambient = new THREE.AmbientLight(0xdcfce7, 0.8);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfef08a, 1.2);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    this.scene.add(sun);

    // 5. Build Environment & Zones
    this.buildTerrain();
    this.buildForestAndHuts();
    this.buildPalace();
    this.buildVillainFortress();
    this.buildCaravan();

    // 6. Spawn Player
    this.spawnPlayer(this.faction);

    // Shield Bubble Mesh
    this.shieldBubbleMesh = createShieldBubble();
    this.scene.add(this.shieldBubbleMesh);

    // 7. Initial Guards & Raiders (safely placed!)
    this.spawnInitialWorldEnemies();

    // 8. Event Listeners
    this.bindEvents();

    // 9. Start Main Loop
    this.animate();

    this.postMessage({
      id: Math.random().toString(),
      text: 'Добро пожаловать в 3Д-Экшон! Джва года ожидания подошли к концу!',
      type: 'system',
      timestamp: Date.now(),
    });
  }

  public setFaction(newFaction: FactionId) {
    this.faction = newFaction;
    const cfg = FACTIONS[newFaction];
    this.stats.maxHealth = cfg.baseHealth;
    this.stats.health = cfg.baseHealth;
    this.respawnShieldTimer = 4.0;
    this.invulnerabilityTimer = 1.0;
    this.timeSinceLastDamage = 0;

    // Reposition player to appropriate faction starting point
    if (newFaction === 'elf') {
      this.playerPos.set(0, 0, 10);
    } else if (newFaction === 'guard') {
      this.playerPos.set(70, 0, -50);
    } else {
      this.playerPos.set(-70, 0, 70);
    }

    if (this.playerMesh) {
      this.scene.remove(this.playerMesh);
    }
    this.playerMesh = createCharacterModel(newFaction);
    this.scene.add(this.playerMesh);

    // Push away hostile enemies from home base
    this.pushHostilesAway(35);

    this.postMessage({
      id: Math.random().toString(),
      text: `Вы играете за: ${cfg.name}! ${cfg.primaryObjective}`,
      type: 'system',
      timestamp: Date.now(),
    });

    if (this.onStatsUpdate) this.onStatsUpdate(this.stats);
  }

  public respawnPlayer() {
    const cfg = FACTIONS[this.faction];
    this.stats.health = cfg.baseHealth;
    this.stats.maxHealth = cfg.baseHealth;
    this.respawnShieldTimer = 4.0;
    this.invulnerabilityTimer = 1.0;
    this.timeSinceLastDamage = 0;

    if (this.faction === 'elf') {
      this.playerPos.set(0, 0, 10);
    } else if (this.faction === 'guard') {
      this.playerPos.set(70, 0, -50);
    } else {
      this.playerPos.set(-70, 0, 70);
    }

    if (this.playerMesh) {
      this.playerMesh.position.copy(this.playerPos);
    }

    this.pushHostilesAway(35);

    soundManager.playWarHorn(false);
    this.spawnFloatingText('🛡️ ЩИТ ВОЗРОЖДЕНИЯ (4 сек)!', '#facc15', this.playerPos.clone().add(new THREE.Vector3(0, 3, 0)));
    this.postMessage({
      id: Math.random().toString(),
      text: 'Герой успешно возродился! Действует защитный щит.',
      type: 'system',
      timestamp: Date.now(),
    });

    if (this.onStatsUpdate) this.onStatsUpdate(this.stats);
  }

  private pushHostilesAway(radius: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.isDead || enemy.faction === this.faction) return;
      const d = enemy.mesh.position.distanceTo(this.playerPos);
      if (d < radius) {
        const pushDir = new THREE.Vector3().subVectors(enemy.mesh.position, this.playerPos).normalize();
        if (pushDir.lengthSq() < 0.01) pushDir.set(1, 0, 0);
        enemy.mesh.position.copy(this.playerPos).addScaledVector(pushDir, radius + 5);
        enemy.attackCooldown = 2.5;
      }
    });
  }

  private buildTerrain() {
    const groundGeo = new THREE.PlaneGeometry(280, 280, 40, 40);
    groundGeo.rotateX(-Math.PI / 2);

    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const distFromCenter = Math.hypot(x, z);
      if (distFromCenter > 30) {
        const hill = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2.2;
        posAttr.setY(i, Math.max(-0.5, hill));
      }
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3f6212,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Trade Road
    const roadCurve = new THREE.CatmullRomCurve3(this.caravanWaypoints);
    const roadPoints = roadCurve.getPoints(50);
    const roadGeo = new THREE.BufferGeometry().setFromPoints(roadPoints);
    const roadMat = new THREE.LineBasicMaterial({ color: 0x785334, linewidth: 8 });
    const roadLine = new THREE.Line(roadGeo, roadMat);
    roadLine.position.y = 0.05;
    this.scene.add(roadLine);

    roadPoints.forEach((pt) => {
      const patchGeo = new THREE.CircleGeometry(4, 8);
      patchGeo.rotateX(-Math.PI / 2);
      const patchMat = new THREE.MeshStandardMaterial({ color: 0x6d4c2d, roughness: 1.0 });
      const patch = new THREE.Mesh(patchGeo, patchMat);
      patch.position.set(pt.x, 0.02, pt.z);
      patch.receiveShadow = true;
      this.scene.add(patch);
    });
  }

  private buildForestAndHuts() {
    const hutPositions = [
      { x: -14, z: 6, rot: 0.3, name: 'Северный Домик Эльфов' },
      { x: 12, z: 8, rot: -0.4, name: 'Домик Старейшины Леса' },
      { x: -10, z: 22, rot: 1.2, name: 'Оружейный Деревяный Склад' },
      { x: 15, z: 24, rot: 2.1, name: 'Южный Домик Охотников' },
    ];

    this.huts = hutPositions.map((hp, idx) => ({
      id: `hut-${idx + 1}`,
      name: hp.name,
      position: { x: hp.x, y: 0, z: hp.z },
      hp: 350,
      maxHp: 350,
      isBurning: false,
      ruined: false,
    }));

    hutPositions.forEach((hp) => {
      const hut = createWoodenHut();
      hut.position.set(hp.x, 0, hp.z);
      hut.rotation.y = hp.rot;
      this.scene.add(hut);
      this.hutMeshes.push(hut);

      for (let f = 0; f < 3; f++) {
        const fenceGeo = new THREE.BoxGeometry(2.4, 0.8, 0.15);
        const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5c3d23 });
        const fence = new THREE.Mesh(fenceGeo, fenceMat);
        fence.position.set(hp.x + (f - 1) * 3, 0.4, hp.z + 5);
        fence.castShadow = true;
        this.scene.add(fence);
      }
    });

    if (this.onHutsUpdate) this.onHutsUpdate(this.huts);

    // Campfire in center of elven settlement
    const fireGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 8);
    const fireMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const campfire = new THREE.Mesh(fireGeo, fireMat);
    campfire.position.set(0, 0.2, 14);
    this.scene.add(campfire);

    const flameLight = new THREE.PointLight(0xf97316, 2, 15);
    flameLight.position.set(0, 1.2, 14);
    this.scene.add(flameLight);

    // Trees ("Густой Лес и тп...")
    for (let i = 0; i < 220; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 115;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      const distToPalace = Math.hypot(tx - 70, tz - (-60));
      const distToFortress = Math.hypot(tx - (-70), tz - 70);
      const distToVillage = Math.hypot(tx, tz - 14);

      if (distToPalace > 25 && distToFortress > 25 && distToVillage > 15) {
        const isPine = Math.random() > 0.45;
        const scale = 0.8 + Math.random() * 0.55;
        const tree = isPine ? createPineTree(scale) : createOakTree(scale);
        tree.position.set(tx, 0, tz);
        tree.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(tree);
      }
    }
  }

  private buildPalace() {
    const palace = createPalaceCitadel();
    palace.position.set(70, 0, -60);
    palace.rotation.y = -Math.PI / 4;
    this.scene.add(palace);

    const bannerLight = new THREE.PointLight(0x38bdf8, 2, 20);
    bannerLight.position.set(70, 8, -50);
    this.scene.add(bannerLight);
  }

  private buildVillainFortress() {
    const fortress = createVillainFortress();
    fortress.position.set(-70, 0, 70);
    this.scene.add(fortress);

    const evilLight = new THREE.PointLight(0xc084fc, 2.5, 25);
    evilLight.position.set(-70, 6, 70);
    this.scene.add(evilLight);
  }

  private buildCaravan() {
    this.caravanMesh = createCaravanWagon();
    this.caravanMesh.position.set(-80, 0, -40);
    this.scene.add(this.caravanMesh);
  }

  private spawnPlayer(faction: FactionId) {
    this.playerMesh = createCharacterModel(faction);
    this.playerMesh.position.copy(this.playerPos);
    this.scene.add(this.playerMesh);
  }

  private spawnInitialWorldEnemies() {
    // Caravan escort guards (far away with caravan)
    for (let i = 0; i < 3; i++) {
      this.spawnEnemy('guard', 'caravan_guard', new THREE.Vector3(-85 + i * 4, 0, -38 + i * 2));
    }

    // Elven archers in forest (friendly to elves)
    this.spawnEnemy('elf', 'elf_ranger', new THREE.Vector3(-8, 0, 20));
    this.spawnEnemy('elf', 'elf_ranger', new THREE.Vector3(10, 0, 22));

    // Distant villain scouting fiends (far away, > 50 units)
    this.spawnEnemy('villain', 'villain_minion', new THREE.Vector3(-55, 0, 45));
    this.spawnEnemy('villain', 'villain_minion', new THREE.Vector3(-50, 0, -30));
  }

  public spawnEnemy(faction: FactionId, type: EnemyEntity['type'], pos: THREE.Vector3) {
    const mesh = createCharacterModel(faction);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    const maxHp = type === 'soldier' ? 75 : type === 'caravan_guard' ? 100 : 70;
    this.enemies.push({
      id: Math.random().toString(),
      mesh,
      faction,
      type,
      hp: maxHp,
      maxHp,
      speed: 6.5 + Math.random() * 1.5, // Fair speed so player can outrun
      targetPos: pos.clone(),
      attackCooldown: 1.5 + Math.random() * 0.8, // 1.5s initial delay!
      damage: 8, // Fair damage
      isDead: false,
    });
  }

  public triggerRaid() {
    this.raidCountdown = 35;
    soundManager.playWarHorn(true);

    this.postMessage({
      id: Math.random().toString(),
      text: '⚔️ ТРЕВОГА! На деревянные домики НАБИГАЮТ солдаты дворца и злодеи!',
      type: 'raid',
      timestamp: Date.now(),
    });

    // Spawn Palace Soldiers from the Palace
    for (let i = 0; i < 3; i++) {
      const spawnPos = new THREE.Vector3(55 + (Math.random() - 0.5) * 10, 0, -45 + (Math.random() - 0.5) * 10);
      this.spawnEnemy('guard', 'soldier', spawnPos);
    }

    // Spawn Villain Raiders from the Dark Fortress
    for (let i = 0; i < 3; i++) {
      const spawnPos = new THREE.Vector3(-60 + (Math.random() - 0.5) * 10, 0, 60 + (Math.random() - 0.5) * 10);
      this.spawnEnemy('villain', 'villain_minion', spawnPos);
    }
  }

  public spawnNewCaravan() {
    this.caravanState.active = true;
    this.caravanState.progress = 0;
    this.caravanState.hp = this.caravanState.maxHp;
    this.caravanState.robbed = false;
    this.caravanState.guardsRemaining = 3;

    const startPt = this.caravanWaypoints[0];
    this.caravanMesh.position.copy(startPt);
    this.caravanMesh.visible = true;

    soundManager.playWarHorn(false);
    this.postMessage({
      id: Math.random().toString(),
      text: '💰 ПО ДОРОГЕ ИДЁТ НОВЫЙ КОРОВАН! МОЖНО ГРАБИТЬ КОРОВАН!',
      type: 'caravan',
      timestamp: Date.now(),
    });

    for (let i = 0; i < 3; i++) {
      this.spawnEnemy('guard', 'caravan_guard', new THREE.Vector3(startPt.x + i * 3, 0, startPt.z + 2));
    }
  }

  // Combat: Primary Attack
  public performPrimaryAttack() {
    if (this.isAttacking || this.stats.health <= 0) return;
    this.isAttacking = true;
    this.attackTimer = 0.25;

    if (this.faction === 'elf') {
      soundManager.playBowShot();
      const dir = new THREE.Vector3(
        -Math.sin(this.playerRotation),
        0,
        -Math.cos(this.playerRotation)
      ).normalize();

      this.createProjectile(
        this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)),
        dir.multiplyScalar(36),
        40,
        'arrow'
      );
    } else if (this.faction === 'guard') {
      soundManager.playSwordSlash();
      this.doMeleeAreaDamage(45, 5.0);
    } else {
      soundManager.playDarkMagic();
      const dir = new THREE.Vector3(
        -Math.sin(this.playerRotation),
        0,
        -Math.cos(this.playerRotation)
      ).normalize();

      this.createProjectile(
        this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)),
        dir.multiplyScalar(28),
        50,
        'dark_skull',
        4.0
      );
    }
  }

  // Combat: Ability 1 (Q)
  public useAbilityQ() {
    if (this.stats.health <= 0) return;
    const cfg = FACTIONS[this.faction].abilities[0];
    if ((this.abilityCooldowns['Q'] || 0) > 0) return;
    this.abilityCooldowns['Q'] = cfg.cooldown;

    if (this.faction === 'elf') {
      soundManager.playBowShot();
      const baseDir = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
      [-0.25, 0, 0.25].forEach((angleOffset) => {
        const dir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angleOffset).multiplyScalar(36);
        this.createProjectile(this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)), dir, cfg.damage, 'arrow');
      });
      this.spawnFloatingText('Тройной Залп!', '#86efac', this.playerPos);
    } else if (this.faction === 'guard') {
      soundManager.playSwordSlash();
      this.doMeleeAreaDamage(cfg.damage, 6.5);
      this.spawnFloatingText('Круговой Рассек!', '#93c5fd', this.playerPos);
    } else {
      soundManager.playDarkMagic();
      const dir = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation)).multiplyScalar(28);
      this.createProjectile(this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0)), dir, cfg.damage, 'dark_skull', 5.5);
      this.spawnFloatingText('Огненный Череп!', '#d8b4fe', this.playerPos);
    }
  }

  // Combat: Ability 2 (E)
  public useAbilityE() {
    if (this.stats.health <= 0) return;
    const cfg = FACTIONS[this.faction].abilities[1];
    if ((this.abilityCooldowns['E'] || 0) > 0) return;
    this.abilityCooldowns['E'] = cfg.cooldown;

    if (this.faction === 'elf') {
      soundManager.playBowShot();
      const forward = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
      this.playerPos.add(forward.multiplyScalar(14));
      this.invulnerabilityTimer = 0.8; // Brief dodge invulnerability!
      this.spawnFloatingText('Лесной Рывок (Уклонение)!', '#86efac', this.playerPos);
    } else if (this.faction === 'guard') {
      soundManager.playShieldBash();
      const forward = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
      this.playerPos.add(forward.clone().multiplyScalar(9));
      this.doMeleeAreaDamage(cfg.damage, 5.5);
      this.invulnerabilityTimer = 0.8;
      this.spawnFloatingText('Таран Щитом!', '#93c5fd', this.playerPos);
    } else {
      soundManager.playDarkMagic();
      const forward = new THREE.Vector3(-Math.sin(this.playerRotation), 0, -Math.cos(this.playerRotation));
      this.playerPos.add(forward.multiplyScalar(15));
      this.doMeleeAreaDamage(cfg.damage, 5.0);
      this.invulnerabilityTimer = 0.8;
      this.spawnFloatingText('Теневой Скачок!', '#d8b4fe', this.playerPos);
    }
  }

  // Combat: Ability 3 (R)
  public useAbilityR() {
    if (this.stats.health <= 0) return;
    const cfg = FACTIONS[this.faction].abilities[2];
    if ((this.abilityCooldowns['R'] || 0) > 0) return;
    this.abilityCooldowns['R'] = cfg.cooldown;

    if (this.faction === 'elf') {
      soundManager.playSwordSlash();
      this.doMeleeAreaDamage(cfg.damage, 12.0);
      this.spawnFloatingText('Гнев Древней Чащи!', '#22c55e', this.playerPos);
    } else if (this.faction === 'guard') {
      soundManager.playWarHorn(false);
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 60);
      this.doMeleeAreaDamage(cfg.damage, 10.0);
      this.spawnFloatingText('Королевский Горн! +60 HP', '#3b82f6', this.playerPos);
    } else {
      soundManager.playDarkMagic();
      this.doMeleeAreaDamage(cfg.damage, 12.0);
      this.spawnFloatingText('Метеоритный Дождь!', '#a855f7', this.playerPos);
    }
  }

  private createProjectile(
    pos: THREE.Vector3,
    velocity: THREE.Vector3,
    damage: number,
    type: 'arrow' | 'dark_skull',
    splashRadius = 0
  ) {
    let mesh: THREE.Mesh | THREE.Group;

    if (type === 'arrow') {
      const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6);
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.SphereGeometry(0.45, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
      mesh = new THREE.Mesh(geo, mat);
    }

    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity,
      damage,
      isPlayer: true,
      faction: this.faction,
      life: 0,
      maxLife: 2.8,
      splashRadius,
    });
  }

  private doMeleeAreaDamage(dmg: number, radius: number) {
    const center = this.playerPos.clone();

    // Damage enemies within radius
    this.enemies.forEach((enemy) => {
      if (enemy.isDead || enemy.faction === this.faction) return;
      const dist = enemy.mesh.position.distanceTo(center);
      if (dist <= radius) {
        this.hitEnemy(enemy, dmg);
        // Knockback enemy slightly
        const push = new THREE.Vector3().subVectors(enemy.mesh.position, center).normalize();
        enemy.mesh.position.addScaledVector(push, 2.5);
      }
    });

    // Check hit against Caravan if elf/villain
    if (this.faction !== 'guard' && this.caravanState.active) {
      const distToCaravan = this.caravanMesh.position.distanceTo(center);
      if (distToCaravan <= radius + 3) {
        this.hitCaravan(dmg);
      }
    }

    // Check hit against Wooden Huts if guard/villain
    if (this.faction !== 'elf') {
      this.huts.forEach((hut) => {
        if (hut.ruined) return;
        const hutPos = new THREE.Vector3(hut.position.x, 0, hut.position.z);
        if (hutPos.distanceTo(center) <= radius + 4) {
          hut.hp = Math.max(0, hut.hp - dmg);
          hut.isBurning = hut.hp < hut.maxHp * 0.5;
          if (hut.hp === 0) hut.ruined = true;
          this.spawnFloatingText(`-${dmg}`, '#ef4444', hutPos.clone().add(new THREE.Vector3(0, 3, 0)));
          if (this.onHutsUpdate) this.onHutsUpdate(this.huts);
        }
      });
    }
  }

  private hitEnemy(enemy: EnemyEntity, damage: number) {
    enemy.hp -= damage;
    this.spawnFloatingText(`-${damage}`, '#f87171', enemy.mesh.position.clone().add(new THREE.Vector3(0, 2.5, 0)));

    if (enemy.hp <= 0 && !enemy.isDead) {
      enemy.isDead = true;
      this.scene.remove(enemy.mesh);
      this.stats.enemiesDefeated++;
      this.stats.exp += 30;

      // Drop gold
      const goldDrop = 20 + Math.floor(Math.random() * 30);
      this.spawnLoot(enemy.mesh.position, goldDrop, false, 'gold');

      // 45% chance to drop a healing potion!
      if (Math.random() < 0.45) {
        this.spawnLoot(
          enemy.mesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)),
          50,
          false,
          'potion'
        );
      }

      this.postMessage({
        id: Math.random().toString(),
        text: `Враг повержен! Получено +${goldDrop} золота`,
        type: 'kill',
        timestamp: Date.now(),
      });
    }
  }

  public takeDamage(amount: number) {
    if (this.stats.health <= 0) return;

    if (this.respawnShieldTimer > 0) {
      this.spawnFloatingText('Отражено щитом!', '#facc15', this.playerPos.clone().add(new THREE.Vector3(0, 2, 0)));
      return;
    }

    if (this.invulnerabilityTimer > 0) {
      return; // i-frame immunity!
    }

    this.invulnerabilityTimer = 0.75; // 0.75s grace period between hits
    this.timeSinceLastDamage = 0;
    this.stats.health = Math.max(0, this.stats.health - amount);
    soundManager.playSwordSlash();
    this.spawnFloatingText(`-${amount}`, '#ef4444', this.playerPos.clone().add(new THREE.Vector3(0, 2.5, 0)));

    if (this.onStatsUpdate) this.onStatsUpdate(this.stats);

    if (this.stats.health <= 0) {
      this.postMessage({
        id: Math.random().toString(),
        text: 'Вы пали в бою! Нажмите «Возродиться» для возвращения в бой.',
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }

  public hitCaravan(damage: number) {
    if (!this.caravanState.active || this.caravanState.robbed) return;

    this.caravanState.hp -= damage;
    soundManager.playCrateSmash();

    const lootGold = Math.floor(damage * 3.5);
    this.spawnLoot(
      this.caravanMesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4)),
      lootGold,
      true,
      'gold'
    );

    // Guaranteed healing potion drop from broken merchant supplies!
    this.spawnLoot(
      this.caravanMesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)),
      60,
      true,
      'potion'
    );

    this.spawnFloatingText(`ГРАБЁЖ! +${lootGold} 💰`, '#fbbf24', this.caravanMesh.position.clone().add(new THREE.Vector3(0, 4, 0)));

    if (this.caravanState.hp <= 0) {
      this.caravanState.robbed = true;
      this.caravanState.active = false;
      this.stats.caravansRobbed++;
      this.stats.gold += 400;

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      soundManager.playCoinLoot();
      this.postMessage({
        id: Math.random().toString(),
        text: '🎉 КОРОВАН УСПЕШНО ОГРАБЛЕН! ДЖВА ГОДА ЖДАЛИ ЭТОТ МОМЕНТ! (+400 ЗОЛОТА)',
        type: 'caravan',
        timestamp: Date.now(),
      });
    }

    if (this.onCaravanUpdate) this.onCaravanUpdate(this.caravanState);
  }

  private spawnLoot(pos: THREE.Vector3, value: number, isCaravanLoot: boolean, type: 'gold' | 'potion' = 'gold') {
    const mesh = type === 'potion' ? createHealthPotion() : createGoldLoot();
    mesh.position.copy(pos);
    mesh.position.y = 0;
    this.scene.add(mesh);

    this.lootItems.push({
      id: Math.random().toString(),
      mesh,
      value,
      position: pos.clone(),
      isCaravanLoot,
      type,
    });
  }

  private spawnFloatingText(text: string, color: string, pos: THREE.Vector3) {
    this.floatingTexts.push({
      id: Math.random().toString(),
      text,
      color,
      pos: pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
      life: 0,
      maxLife: 1.2,
    });
  }

  private postMessage(msg: GameEventMessage) {
    if (this.onEventMessage) {
      this.onEventMessage(msg);
    }
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onWindowResize);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', this.onWheel);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys[key] = true;

    if (key === 'q') this.useAbilityQ();
    if (key === 'e') this.useAbilityE();
    if (key === 'r') this.useAbilityR();
    if (key === 'f' || key === ' ') {
      this.performPrimaryAttack();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      this.performPrimaryAttack();
    } else if (e.button === 2) {
      this.isRightMouseDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isRightMouseDown = false;
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isRightMouseDown || this.isPointerLocked) {
      const sensitivity = 0.005;
      this.cameraYaw -= e.movementX * sensitivity;
      this.cameraPitch = Math.max(0.1, Math.min(1.2, this.cameraPitch + e.movementY * sensitivity));
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.cameraDistance = Math.max(6, Math.min(28, this.cameraDistance + e.deltaY * 0.02));
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private updatePlayer(dt: number) {
    if (this.stats.health <= 0) return; // Dead player doesn't move

    const cfg = FACTIONS[this.faction];
    const speed = cfg.baseSpeed * (this.keys['shift'] ? 1.35 : 1.0);

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['w'] || this.keys['arrowup']) moveZ -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) moveZ += 1;
    if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
    if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
      moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

      this.playerPos.x += moveVec.x * speed * dt;
      this.playerPos.z += moveVec.z * speed * dt;

      this.playerPos.x = Math.max(-125, Math.min(125, this.playerPos.x));
      this.playerPos.z = Math.max(-125, Math.min(125, this.playerPos.z));

      this.playerRotation = Math.atan2(-moveVec.x, -moveVec.z);
    }

    if (this.playerMesh) {
      this.playerMesh.position.copy(this.playerPos);
      this.playerMesh.rotation.y = this.playerRotation;

      if (moveX !== 0 || moveZ !== 0) {
        this.playerMesh.position.y = Math.abs(Math.sin(this.clock.getElapsedTime() * 10)) * 0.25;
      } else {
        this.playerMesh.position.y = 0;
      }
    }

    // Shield bubble position and rotation
    if (this.shieldBubbleMesh) {
      if (this.respawnShieldTimer > 0) {
        this.shieldBubbleMesh.visible = true;
        this.shieldBubbleMesh.position.copy(this.playerPos);
        this.shieldBubbleMesh.rotation.y += dt * 1.5;
        this.shieldBubbleMesh.rotation.x += dt * 0.8;
      } else {
        this.shieldBubbleMesh.visible = false;
      }
    }

    // Loot & Potion pickups
    for (let i = this.lootItems.length - 1; i >= 0; i--) {
      const loot = this.lootItems[i];
      if (this.playerPos.distanceTo(loot.position) < 3.2) {
        if (loot.type === 'potion') {
          this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + loot.value);
          soundManager.playHeal();
          this.spawnFloatingText(`+${loot.value} HP Зелье! ❤️`, '#4ade80', loot.position);
        } else {
          this.stats.gold += loot.value;
          soundManager.playCoinLoot();
          this.spawnFloatingText(`+${loot.value} 💰`, '#facc15', loot.position);
        }
        this.scene.remove(loot.mesh);
        this.lootItems.splice(i, 1);
      }
    }

    // Passive out-of-combat health regeneration
    this.timeSinceLastDamage += dt;
    if (this.timeSinceLastDamage > 3.0 && this.stats.health > 0 && this.stats.health < this.stats.maxHealth) {
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 10 * dt);
    }

    // Timers
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer = Math.max(0, this.invulnerabilityTimer - dt);
    }
    if (this.respawnShieldTimer > 0) {
      this.respawnShieldTimer = Math.max(0, this.respawnShieldTimer - dt);
    }
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }
  }

  private updateCamera() {
    const cx = this.playerPos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const cy = this.playerPos.y + Math.sin(this.cameraPitch) * this.cameraDistance + 2.5;
    const cz = this.playerPos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.8, this.playerPos.z);
  }

  private updateCaravan(dt: number) {
    if (!this.caravanState.active) return;

    const speed = 3.5;
    const totalWaypoints = this.caravanWaypoints.length;
    const currentWaypointIdx = Math.min(
      totalWaypoints - 2,
      Math.floor(this.caravanState.progress * (totalWaypoints - 1))
    );
    const p1 = this.caravanWaypoints[currentWaypointIdx];
    const p2 = this.caravanWaypoints[currentWaypointIdx + 1];

    this.caravanState.progress += (speed * dt) / 130;
    if (this.caravanState.progress >= 1) {
      this.caravanState.active = false;
      if (this.faction === 'guard') {
        this.stats.caravansProtected++;
        this.stats.gold += 250;
        soundManager.playWarHorn(false);
        this.postMessage({
          id: Math.random().toString(),
          text: '🛡️ Охрана Дворца успешно доставила корован в целости! (+250 золота)',
          type: 'caravan',
          timestamp: Date.now(),
        });
      }
    } else {
      const curve = new THREE.CatmullRomCurve3(this.caravanWaypoints);
      const curPt = curve.getPoint(this.caravanState.progress);
      this.caravanMesh.position.set(curPt.x, 0, curPt.z);
      this.caravanState.position = { x: curPt.x, y: 0, z: curPt.z };

      const tangent = curve.getTangent(this.caravanState.progress);
      this.caravanMesh.rotation.y = Math.atan2(tangent.x, tangent.z);
    }

    if (this.onCaravanUpdate) this.onCaravanUpdate(this.caravanState);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      let hit = false;
      for (const enemy of this.enemies) {
        if (enemy.isDead || enemy.faction === p.faction) continue;
        if (p.mesh.position.distanceTo(enemy.mesh.position) < 2.0) {
          this.hitEnemy(enemy, p.damage);
          hit = true;
          break;
        }
      }

      if (!hit && p.faction !== 'guard' && this.caravanState.active) {
        if (p.mesh.position.distanceTo(this.caravanMesh.position) < 3.5) {
          this.hitCaravan(p.damage);
          hit = true;
        }
      }

      if (hit || p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;

      const isAlly = enemy.faction === this.faction;

      let targetPos: THREE.Vector3 | null = null;
      let targetType: 'player' | 'enemy' | 'hut' | 'caravan' | 'idle' = 'idle';
      let targetEnemyRef: EnemyEntity | null = null;

      if (isAlly) {
        // ALLIED UNIT: DEFEND PLAYER AND ATTACK HOSTILES!
        // Never targets player!
        let closestHostile: EnemyEntity | null = null;
        let closestHostileDist = 26;

        for (const other of this.enemies) {
          if (other.isDead || other.faction === this.faction) continue;
          const d = enemy.mesh.position.distanceTo(other.mesh.position);
          if (d < closestHostileDist) {
            closestHostile = other;
            closestHostileDist = d;
          }
        }

        if (closestHostile) {
          targetPos = closestHostile.mesh.position;
          targetType = 'enemy';
          targetEnemyRef = closestHostile;
        } else {
          // Patrol around player or elven huts
          const activeHut = this.huts.find((h) => !h.ruined);
          targetPos = activeHut
            ? new THREE.Vector3(activeHut.position.x, 0, activeHut.position.z)
            : this.playerPos;
          targetType = 'idle';
        }
      } else {
        // HOSTILE UNIT:
        // Priority 1: Check if player is hostile, close (< 14m), and alive!
        const distToPlayer = enemy.mesh.position.distanceTo(this.playerPos);

        if (distToPlayer < 14 && this.stats.health > 0) {
          targetPos = this.playerPos;
          targetType = 'player';
        } else {
          // Priority 2: Cross-faction fighting! Guard vs Villain clash!
          let rivalEnemy: EnemyEntity | null = null;
          let rivalDist = 18;

          for (const other of this.enemies) {
            if (other.isDead || other.faction === enemy.faction) continue;
            const d = enemy.mesh.position.distanceTo(other.mesh.position);
            if (d < rivalDist) {
              rivalEnemy = other;
              rivalDist = d;
            }
          }

          if (rivalEnemy) {
            targetPos = rivalEnemy.mesh.position;
            targetType = 'enemy';
            targetEnemyRef = rivalEnemy;
          } else if (enemy.type === 'soldier' || enemy.type === 'villain_minion') {
            // Target wooden huts
            const activeHut = this.huts.find((h) => !h.ruined);
            if (activeHut) {
              targetPos = new THREE.Vector3(activeHut.position.x, 0, activeHut.position.z);
              targetType = 'hut';
            } else {
              targetPos = this.playerPos;
              targetType = this.stats.health > 0 ? 'player' : 'idle';
            }
          } else if (enemy.type === 'caravan_guard' && this.caravanState.active) {
            targetPos = this.caravanMesh.position;
            targetType = 'caravan';
          } else {
            targetPos = enemy.mesh.position;
            targetType = 'idle';
          }
        }
      }

      if (!targetPos) return;

      const dist = enemy.mesh.position.distanceTo(targetPos);

      if (dist > 3.0) {
        // Move towards target
        const dir = new THREE.Vector3().subVectors(targetPos, enemy.mesh.position).normalize();
        enemy.mesh.position.addScaledVector(dir, enemy.speed * dt);
        enemy.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
      } else {
        // In attack range
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 2.0; // 2.0s between swings

          if (targetType === 'player' && !isAlly) {
            this.takeDamage(enemy.damage);
          } else if (targetType === 'enemy' && targetEnemyRef && !targetEnemyRef.isDead) {
            // AI vs AI combat!
            targetEnemyRef.hp -= enemy.damage;
            soundManager.playSwordSlash();
            this.spawnFloatingText(`-${enemy.damage}`, '#fca5a5', targetEnemyRef.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)));
            if (targetEnemyRef.hp <= 0) {
              targetEnemyRef.isDead = true;
              this.scene.remove(targetEnemyRef.mesh);
            }
          } else if (targetType === 'hut') {
            const hitHut = this.huts.find((h) => !h.ruined && h.position.x === targetPos!.x);
            if (hitHut) {
              hitHut.hp = Math.max(0, hitHut.hp - enemy.damage);
              hitHut.isBurning = hitHut.hp < hitHut.maxHp * 0.5;
              if (hitHut.hp === 0) hitHut.ruined = true;
              this.spawnFloatingText(`-${enemy.damage}`, '#f97316', targetPos);
              if (this.onHutsUpdate) this.onHutsUpdate(this.huts);
            }
          }
        }
      }
    });
  }

  private updateRaidCycle(dt: number) {
    this.raidCountdown -= dt;
    if (this.raidCountdown <= 0) {
      this.triggerRaid();
    }
  }

  private updateFloatingTexts(dt: number) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.pos.y += dt * 1.5;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updateCooldowns(dt: number) {
    let changed = false;
    for (const key in this.abilityCooldowns) {
      if (this.abilityCooldowns[key] > 0) {
        this.abilityCooldowns[key] = Math.max(0, this.abilityCooldowns[key] - dt);
        changed = true;
      }
    }
    if (changed && this.onAbilityCooldownsUpdate) {
      this.onAbilityCooldownsUpdate({ ...this.abilityCooldowns });
    }
  }

  private animate = () => {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    this.updatePlayer(dt);
    this.updateCamera();
    this.updateCaravan(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateRaidCycle(dt);
    this.updateFloatingTexts(dt);
    this.updateCooldowns(dt);

    if (this.onStatsUpdate) this.onStatsUpdate(this.stats);

    this.renderer.render(this.scene, this.camera);
  };

  public project3DToScreen(pos: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const p = pos.clone().project(this.camera);
    const visible = p.z < 1;
    const x = ((p.x + 1) * this.container.clientWidth) / 2;
    const y = ((-p.y + 1) * this.container.clientHeight) / 2;
    return { x, y, visible };
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
