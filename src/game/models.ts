import * as THREE from 'three';
import { FactionId } from '../types/game';

// Shared materials for performance
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x6e4a2d, roughness: 0.8 });
const darkWoodMaterial = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.9 });
const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
const darkStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
const goldMaterial = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });
const royalBlueMaterial = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 });
const pineLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
const oakLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });

/**
 * Creates a Wooden Hut ("Домик деревяный")
 */
export function createWoodenHut(): THREE.Group {
  const hut = new THREE.Group();

  // Log cabin main body
  const bodyGeo = new THREE.BoxGeometry(6, 4.2, 5.5);
  const body = new THREE.Mesh(bodyGeo, woodMaterial);
  body.position.y = 2.1;
  body.castShadow = true;
  body.receiveShadow = true;
  hut.add(body);

  // Corner log posts
  const logGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.5, 6);
  const corners = [
    [-2.9, 2.25, -2.65],
    [2.9, 2.25, -2.65],
    [-2.9, 2.25, 2.65],
    [2.9, 2.25, 2.65],
  ];
  corners.forEach(([x, y, z]) => {
    const post = new THREE.Mesh(logGeo, darkWoodMaterial);
    post.position.set(x, y, z);
    post.castShadow = true;
    hut.add(post);
  });

  // Roof (sloped prism)
  const roofGeo = new THREE.ConeGeometry(5.2, 2.8, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, roofMaterial);
  roof.position.y = 5.2;
  roof.scale.set(1.1, 1, 1.25);
  roof.castShadow = true;
  hut.add(roof);

  // Door
  const doorGeo = new THREE.BoxGeometry(1.4, 2.4, 0.2);
  const door = new THREE.Mesh(doorGeo, darkWoodMaterial);
  door.position.set(0, 1.2, 2.76);
  hut.add(door);

  // Windows with warm light
  const windowGeo = new THREE.BoxGeometry(1, 1, 0.15);
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // warm yellow glow
  const win1 = new THREE.Mesh(windowGeo, windowMat);
  win1.position.set(-1.8, 2.5, 2.76);
  hut.add(win1);

  const win2 = new THREE.Mesh(windowGeo, windowMat);
  win2.position.set(1.8, 2.5, 2.76);
  hut.add(win2);

  // Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.8, 2.2, 0.8);
  const chimney = new THREE.Mesh(chimneyGeo, stoneMaterial);
  chimney.position.set(1.8, 5.4, -1);
  chimney.castShadow = true;
  hut.add(chimney);

  // Small wooden porch / steps
  const stepGeo = new THREE.BoxGeometry(2.4, 0.3, 1.2);
  const step = new THREE.Mesh(stepGeo, woodMaterial);
  step.position.set(0, 0.15, 3.2);
  step.receiveShadow = true;
  hut.add(step);

  return hut;
}

/**
 * Creates Pine Tree ("Густой лес")
 */
export function createPineTree(scale = 1): THREE.Group {
  const tree = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 3 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMaterial);
  trunk.position.y = 1.5 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  // Pine layers
  const layers = [
    { radius: 2.8 * scale, height: 2.6 * scale, y: 3.4 * scale },
    { radius: 2.2 * scale, height: 2.4 * scale, y: 4.8 * scale },
    { radius: 1.5 * scale, height: 2.0 * scale, y: 6.2 * scale },
  ];

  layers.forEach((layer) => {
    const foliageGeo = new THREE.ConeGeometry(layer.radius, layer.height, 6);
    const foliage = new THREE.Mesh(foliageGeo, pineLeafMaterial);
    foliage.position.y = layer.y;
    foliage.castShadow = true;
    tree.add(foliage);
  });

  return tree;
}

/**
 * Creates Oak Tree ("Густой лес")
 */
export function createOakTree(scale = 1): THREE.Group {
  const tree = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.5 * scale, 0.8 * scale, 3.2 * scale, 6);
  const trunk = new THREE.Mesh(trunkGeo, darkWoodMaterial);
  trunk.position.y = 1.6 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  // Canopy clusters
  const crownGeo = new THREE.DodecahedronGeometry(2.4 * scale, 1);
  const crown = new THREE.Mesh(crownGeo, oakLeafMaterial);
  crown.position.y = 4.6 * scale;
  crown.castShadow = true;
  tree.add(crown);

  return tree;
}

/**
 * Creates a Character Model (Elf, Guard, Villain, Raider)
 */
export function createCharacterModel(faction: FactionId | 'neutral'): THREE.Group {
  const char = new THREE.Group();

  let bodyColor = 0x15803d; // Elf: Forest green
  let headColor = 0xffedd5; // Fair skin
  let accentColor = 0x22c55e;
  let armorMat = woodMaterial;

  if (faction === 'guard') {
    bodyColor = 0x1d4ed8; // Guard: Royal Blue
    accentColor = 0x93c5fd;
    armorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.4 });
  } else if (faction === 'villain') {
    bodyColor = 0x581c87; // Dark purple
    headColor = 0x71717a; // Pale / ash
    accentColor = 0xc084fc;
    armorMat = darkStoneMaterial;
  }

  const torsoMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 });
  const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 });

  // Torso
  const torsoGeo = new THREE.BoxGeometry(0.9, 1.2, 0.5);
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.3;
  torso.castShadow = true;
  char.add(torso);

  // Head
  const headGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 2.2;
  head.castShadow = true;
  char.add(head);

  // Helmet / Hat / Ears
  if (faction === 'elf') {
    // Pointed ears / Green hood
    const earGeo = new THREE.ConeGeometry(0.12, 0.4, 4);
    const leftEar = new THREE.Mesh(earGeo, headMat);
    leftEar.position.set(-0.35, 2.25, 0);
    leftEar.rotation.z = Math.PI / 3;
    char.add(leftEar);

    const rightEar = leftEar.clone();
    rightEar.position.x = 0.35;
    rightEar.rotation.z = -Math.PI / 3;
    char.add(rightEar);

    // Quiver on back with arrows
    const quiverGeo = new THREE.CylinderGeometry(0.14, 0.12, 1.1, 6);
    const quiver = new THREE.Mesh(quiverGeo, darkWoodMaterial);
    quiver.position.set(0.15, 1.5, -0.32);
    quiver.rotation.z = -0.3;
    char.add(quiver);

    // Bow in left hand
    const bowGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 12, Math.PI * 0.9);
    const bow = new THREE.Mesh(bowGeo, woodMaterial);
    bow.position.set(-0.6, 1.3, 0.3);
    bow.rotation.y = Math.PI / 2;
    char.add(bow);
  } else if (faction === 'guard') {
    // Royal helmet
    const helmGeo = new THREE.BoxGeometry(0.65, 0.4, 0.65);
    const helm = new THREE.Mesh(helmGeo, armorMat);
    helm.position.y = 2.4;
    char.add(helm);

    // Halberd in right hand
    const staffGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.8, 6);
    const staff = new THREE.Mesh(staffGeo, darkWoodMaterial);
    staff.position.set(0.65, 1.4, 0.2);

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.6, 0.4);
    const blade = new THREE.Mesh(bladeGeo, armorMat);
    blade.position.y = 1.1;
    blade.position.z = 0.15;
    staff.add(blade);
    char.add(staff);

    // Shield on left arm
    const shieldGeo = new THREE.BoxGeometry(0.1, 0.9, 0.6);
    const shield = new THREE.Mesh(shieldGeo, royalBlueMaterial);
    shield.position.set(-0.65, 1.3, 0.1);
    char.add(shield);
  } else if (faction === 'villain') {
    // Horned cowl
    const hornGeo = new THREE.ConeGeometry(0.12, 0.5, 4);
    const hornL = new THREE.Mesh(hornGeo, darkStoneMaterial);
    hornL.position.set(-0.35, 2.5, 0);
    hornL.rotation.z = 0.4;
    char.add(hornL);

    const hornR = hornL.clone();
    hornR.position.x = 0.35;
    hornR.rotation.z = -0.4;
    char.add(hornR);

    // Dark chaos staff
    const staffGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6);
    const staff = new THREE.Mesh(staffGeo, darkStoneMaterial);
    staff.position.set(0.65, 1.3, 0.2);

    const orbGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.y = 1.3;
    staff.add(orb);
    char.add(staff);
  }

  // Legs
  const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
  const leftLeg = new THREE.Mesh(legGeo, torsoMat);
  leftLeg.position.set(-0.25, 0.4, 0);
  leftLeg.castShadow = true;
  char.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, torsoMat);
  rightLeg.position.set(0.25, 0.4, 0);
  rightLeg.castShadow = true;
  char.add(rightLeg);

  return char;
}

/**
 * Creates the Caravan ("Корован")
 * A heavy merchant supply convoy with covered wooden wagon, draft animal, chests and banner!
 */
export function createCaravanWagon(): THREE.Group {
  const convoy = new THREE.Group();

  // Wagon Base (Bed)
  const bedGeo = new THREE.BoxGeometry(3.6, 0.4, 6.2);
  const bed = new THREE.Mesh(bedGeo, woodMaterial);
  bed.position.y = 1.4;
  bed.castShadow = true;
  bed.receiveShadow = true;
  convoy.add(bed);

  // Wagon Wheels (4 large wooden wheels)
  const wheelGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-1.9, 0.8, -2],
    [1.9, 0.8, -2],
    [-1.9, 0.8, 2],
    [1.9, 0.8, 2],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, darkWoodMaterial);
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    convoy.add(wheel);
  });

  // Wagon Cover (Canvas / Timber arch)
  const archGeo = new THREE.CylinderGeometry(1.9, 1.9, 5.6, 12, 1, false, 0, Math.PI);
  archGeo.rotateX(Math.PI / 2);
  archGeo.rotateZ(Math.PI / 2);
  const canvasMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 });
  const arch = new THREE.Mesh(archGeo, canvasMat);
  arch.position.set(0, 2.8, 0);
  arch.castShadow = true;
  convoy.add(arch);

  // Treasure Crates & Golden Chests inside/on rear of wagon
  const chestGeo = new THREE.BoxGeometry(1.2, 0.8, 0.9);
  const chest = new THREE.Mesh(chestGeo, goldMaterial);
  chest.position.set(0, 1.9, -1.2);
  chest.castShadow = true;
  convoy.add(chest);

  const sackGeo = new THREE.SphereGeometry(0.6, 6, 6);
  const sackMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const sack = new THREE.Mesh(sackGeo, sackMat);
  sack.position.set(0.6, 1.8, 0.6);
  sack.scale.set(1, 0.7, 1);
  convoy.add(sack);

  // Draught Horse / Ox in front
  const horse = new THREE.Group();
  horse.position.set(0, 0, 4.5);

  const horseBodyGeo = new THREE.BoxGeometry(1.2, 1.4, 2.4);
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const horseBody = new THREE.Mesh(horseBodyGeo, horseMat);
  horseBody.position.y = 1.5;
  horseBody.castShadow = true;
  horse.add(horseBody);

  const horseHeadGeo = new THREE.BoxGeometry(0.8, 0.9, 1.2);
  const horseHead = new THREE.Mesh(horseHeadGeo, horseMat);
  horseHead.position.set(0, 2.3, 1.3);
  horseHead.rotation.x = -0.3;
  horseHead.castShadow = true;
  horse.add(horseHead);

  // 4 Horse Legs
  const hLegGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
  const hLegs = [
    [-0.4, 0.6, -0.8],
    [0.4, 0.6, -0.8],
    [-0.4, 0.6, 0.8],
    [0.4, 0.6, 0.8],
  ];
  hLegs.forEach(([hx, hy, hz]) => {
    const leg = new THREE.Mesh(hLegGeo, horseMat);
    leg.position.set(hx, hy, hz);
    leg.castShadow = true;
    horse.add(leg);
  });

  convoy.add(horse);

  // Merchant Banner: Royal Gold / Red flag on back
  const bannerPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.8, 6);
  const bannerPole = new THREE.Mesh(bannerPoleGeo, darkWoodMaterial);
  bannerPole.position.set(1.4, 2.8, -2.5);
  convoy.add(bannerPole);

  const flagGeo = new THREE.BoxGeometry(0.04, 0.9, 1.4);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(1.4, 4.0, -1.8);
  convoy.add(flag);

  return convoy;
}

/**
 * Creates the Royal Palace Citadel ("Дворец")
 */
export function createPalaceCitadel(): THREE.Group {
  const palace = new THREE.Group();

  // Central Grand Keep
  const keepGeo = new THREE.BoxGeometry(16, 12, 16);
  const keep = new THREE.Mesh(keepGeo, stoneMaterial);
  keep.position.y = 6;
  keep.castShadow = true;
  keep.receiveShadow = true;
  palace.add(keep);

  // 4 Castle Corner Towers
  const towerGeo = new THREE.CylinderGeometry(2.5, 2.8, 16, 8);
  const towerRoofGeo = new THREE.ConeGeometry(3.2, 5, 8);
  const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });

  const towerOffsets = [
    [-8, 0, -8],
    [8, 0, -8],
    [-8, 0, 8],
    [8, 0, 8],
  ];

  towerOffsets.forEach(([tx, _, tz]) => {
    const tower = new THREE.Mesh(towerGeo, stoneMaterial);
    tower.position.set(tx, 8, tz);
    tower.castShadow = true;
    palace.add(tower);

    const roof = new THREE.Mesh(towerRoofGeo, blueRoofMat);
    roof.position.set(tx, 18.5, tz);
    roof.castShadow = true;
    palace.add(roof);
  });

  // Gilded Golden Gate Arch
  const gateArchGeo = new THREE.BoxGeometry(6, 7, 2);
  const gateArchMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
  const gateArch = new THREE.Mesh(gateArchGeo, gateArchMat);
  gateArch.position.set(0, 3.5, 8.5);
  palace.add(gateArch);

  const gateGeo = new THREE.BoxGeometry(4.6, 5, 0.4);
  const gate = new THREE.Mesh(gateGeo, goldMaterial);
  gate.position.set(0, 2.5, 8.7);
  palace.add(gate);

  return palace;
}

/**
 * Creates the Villain's Volcano Spire ("Логово Злодея")
 */
export function createVillainFortress(): THREE.Group {
  const fortress = new THREE.Group();

  // Spiked Obsidian Spire
  const spireGeo = new THREE.ConeGeometry(7, 22, 6);
  const spire = new THREE.Mesh(spireGeo, darkStoneMaterial);
  spire.position.y = 11;
  spire.castShadow = true;
  fortress.add(spire);

  // Glowing Purple Crystals
  const crystalGeo = new THREE.OctahedronGeometry(1.6);
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
  const c1 = new THREE.Mesh(crystalGeo, crystalMat);
  c1.position.set(3, 8, 3);
  fortress.add(c1);

  const c2 = new THREE.Mesh(crystalGeo, crystalMat);
  c2.position.set(-3, 10, -2);
  fortress.add(c2);

  return fortress;
}

/**
 * Creates a Gold Loot Pile (from robbing caravans)
 */
export function createGoldLoot(): THREE.Group {
  const group = new THREE.Group();

  const chestGeo = new THREE.BoxGeometry(1.1, 0.8, 0.8);
  const chest = new THREE.Mesh(chestGeo, goldMaterial);
  chest.position.y = 0.4;
  chest.castShadow = true;
  group.add(chest);

  // Sparkling coins
  const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
  for (let i = 0; i < 5; i++) {
    const coin = new THREE.Mesh(coinGeo, goldMaterial);
    coin.position.set((Math.random() - 0.5) * 1.2, 0.1, (Math.random() - 0.5) * 1.2);
    coin.rotation.x = Math.random() * 0.5;
    group.add(coin);
  }

  return group;
}

/**
 * Creates a glowing Health Potion flask ("Зелье Исцеления")
 */
export function createHealthPotion(): THREE.Group {
  const group = new THREE.Group();

  const bottleGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8);
  const bottleMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.2,
    metalness: 0.1,
  });
  const bottle = new THREE.Mesh(bottleGeo, bottleMat);
  bottle.position.y = 0.4;
  bottle.castShadow = true;
  group.add(bottle);

  // Cork top
  const corkGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 6);
  const corkMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
  const cork = new THREE.Mesh(corkGeo, corkMat);
  cork.position.y = 0.9;
  group.add(cork);

  // Red glow light
  const light = new THREE.PointLight(0xf87171, 1.5, 6);
  light.position.y = 0.6;
  group.add(light);

  return group;
}

/**
 * Creates a translucent golden protection bubble ("Щит Возрождения")
 */
export function createShieldBubble(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(2.2, 16, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.28,
    wireframe: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 1.3;
  return mesh;
}
