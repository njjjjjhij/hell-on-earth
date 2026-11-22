/* ============================================================
   HELL ON EARTH — low-poly model pipeline
   Soldiers match the reference sheet: olive helmet + tan face,
   dark chest rig, olive sleeves, team armband, AK in hands.
   ============================================================ */
import * as THREE from 'three';

export const PALETTE = {
  skin: 0xb98a63,
  skinDark: 0x9c7048,
  olive: 0x7d8354,
  oliveDk: 0x454a33,
  vest: 0x2a2e24,
  vestLt: 0x3b4132,
  boot: 0x1b1e18,
  metal: 0x33363a,
  metalLt: 0x5a5f63,
  wood: 0x7a4a24,
  black: 0x111310,
  white: 0xe9e5d6,
  ua: 0x2f7fd4,
  ru: 0xa8342a,
  gold: 0xb9a05a,
  tan: 0x8b7f5f,
  glass: 0x31424a
};

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + '|' + (opts.emissive || 0) + '|' + (opts.roughness ?? '') + '|' + (opts.transparent ? 't' : '');
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({
    color,
    emissive: opts.emissive || 0x000000,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    flatShading: true
  });
  matCache.set(key, m);
  return m;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
const UNIT_SPH = new THREE.SphereGeometry(0.5, 12, 8);

export function box(parent, color, w, h, d, x = 0, y = 0, z = 0, rot = null) {
  const m = new THREE.Mesh(UNIT_BOX, typeof color === 'object' ? color : mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  m.castShadow = true; m.receiveShadow = false;
  parent.add(m);
  return m;
}
export function cyl(parent, color, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 10) {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  const m = new THREE.Mesh(g, typeof color === 'object' ? color : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}
export function sph(parent, color, r, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(UNIT_SPH, typeof color === 'object' ? color : mat(color));
  m.scale.setScalar(r * 2);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

/* ============================ WEAPONS ============================ */
const WEAPON_DEFS = {
  ak74:  { name: 'AK-74M',  cls: 'ASSAULT RIFLE', dmg: 26, rpm: 620, mag: 30,  reserve: 150, spread: 0.015, recoil: 0.85, auto: true,  range: 200, kind: 'rifle' },
  lmg:   { name: 'PKM',     cls: 'MACHINE GUN',   dmg: 30, rpm: 540, mag: 100, reserve: 200, spread: 0.030, recoil: 1.5,  auto: true,  range: 240, kind: 'lmg' },
  sniper:{ name: 'SVD-M',   cls: 'MARKSMAN',      dmg: 82, rpm: 65,  mag: 10,  reserve: 50,  spread: 0.003, recoil: 2.6,  auto: false, range: 520, kind: 'sniper' },
  smg:   { name: 'MP5-K',   cls: 'SUBMACHINE GUN',dmg: 19, rpm: 820, mag: 30,  reserve: 150, spread: 0.021, recoil: 0.6,  auto: true,  range: 110, kind: 'smg' },
  rpg:   { name: 'RPG-7',   cls: 'ANTI-VEHICLE',  dmg: 150, rpm: 30,  mag: 1,   reserve: 4,   spread: 0.01,  recoil: 3.2,  auto: false, range: 300, kind: 'launcher' },
  pistol:{ name: 'PM-9',    cls: 'SIDEARM',       dmg: 24, rpm: 420, mag: 15,  reserve: 45,  spread: 0.02,  recoil: 0.7,  auto: false, range: 70,  kind: 'pistol' }
};
export const WEAPONS = WEAPON_DEFS;
export const PRIMARY_ORDER = ['ak74', 'lmg', 'sniper', 'smg', 'rpg'];

export const ATTACHMENTS = {
  optic: [ { id: 'iron', name: 'IRON SIGHTS', spread: 0, zoom: 1 },
           { id: 'reddot', name: 'RED DOT', spread: -0.002, zoom: 1.15 },
           { id: 'scope', name: '4X SCOPE', spread: -0.004, zoom: 2.2 } ],
  muzzle: [ { id: 'none', name: 'STANDARD', recoil: 0 },
            { id: 'brake', name: 'MUZZLE BRAKE', recoil: -0.22 },
            { id: 'suppressor', name: 'SUPPRESSOR', recoil: -0.1, flash: 0.25 } ],
  mag: [ { id: 'std', name: 'STANDARD', mag: 1 },
          { id: 'ext', name: 'EXTENDED', mag: 1.5 },
          { id: 'drum', name: 'DRUM', mag: 2.2 } ],
  skin: [ { id: 'wood', name: 'FIELD WOOD', color: PALETTE.wood },
          { id: 'black', name: 'BLACK OPS', color: 0x1c1e1c },
          { id: 'sand', name: 'DESERT TAN', color: 0x9a8659 },
          { id: 'olive', name: 'OLIVE DRAB', color: PALETTE.oliveDk } ]
};

export function resolveWeapon(id, attachments = {}) {
  const base = WEAPON_DEFS[id] || WEAPON_DEFS.ak74;
  const optic = ATTACHMENTS.optic.find(o => o.id === (attachments.optic || 'iron')) || ATTACHMENTS.optic[0];
  const muzzle = ATTACHMENTS.muzzle.find(o => o.id === (attachments.muzzle || 'none')) || ATTACHMENTS.muzzle[0];
  const magA = ATTACHMENTS.mag.find(o => o.id === (attachments.mag || 'std')) || ATTACHMENTS.mag[0];
  const skin = ATTACHMENTS.skin.find(o => o.id === (attachments.skin || 'wood')) || ATTACHMENTS.skin[0];
  return {
    ...base,
    id,
    magSize: Math.max(1, Math.round(base.mag * magA.mag)),
    reserveSize: Math.round(base.reserve * magA.mag),
    spread: Math.max(0.001, base.spread + optic.spread),
    recoil: Math.max(0.2, base.recoil + muzzle.recoil),
    zoom: optic.zoom,
    muzzleFlash: muzzle.flash ?? 1,
    attached: { optic: optic.id, muzzle: muzzle.id, mag: magA.id, skin: skin.id },
    skinColor: skin.color
  };
}

/** Builds a stylized gun. Returns group with userData.muzzle (Object3D) */
export function buildWeapon(id = 'ak74', attachments = {}) {
  const def = resolveWeapon(id, attachments);
  const g = new THREE.Group();
  const body = def.skinColor || PALETTE.wood;
  const metal = PALETTE.metal;
  const isLauncher = def.kind === 'launcher';
  const isPistol = def.kind === 'pistol';

  if (isPistol) {
    box(g, metal, 0.07, 0.1, 0.26, 0, 0, -0.04);
    box(g, body, 0.06, 0.16, 0.1, 0, -0.11, 0.05, [0.25, 0, 0]);
    cyl(g, PALETTE.metalLt, 0.022, 0.022, 0.14, 0, 0.015, -0.22).rotation.x = Math.PI / 2;
  } else if (isLauncher) {
    cyl(g, PALETTE.oliveDk, 0.13, 0.13, 1.5, 0, 0, -0.1).rotation.x = Math.PI / 2;
    cyl(g, PALETTE.metal, 0.16, 0.13, 0.34, 0, 0, -0.86).rotation.x = Math.PI / 2;
    cyl(g, PALETTE.oliveDk, 0.09, 0.09, 0.5, 0, 0, 0.62).rotation.x = Math.PI / 2;
    box(g, body, 0.06, 0.24, 0.12, 0, -0.16, -0.02);
    box(g, pal_wood(), 0.06, 0.1, 0.24, 0, -0.06, 0.02);
    box(g, PALETTE.metal, 0.03, 0.1, 0.03, 0, 0.16, -0.34);
    sph(g, 0x2e3a28, 0.13, 0, 0, -0.98);
  } else {
    const len = def.kind === 'sniper' ? 1.34 : def.kind === 'lmg' ? 1.22 : def.kind === 'smg' ? 0.86 : 1.06;
    // receiver
    box(g, metal, 0.075, 0.12, len * 0.5, 0, 0, 0);
    // handguard
    box(g, body, 0.085, 0.1, len * 0.42, 0, 0.005, -len * 0.42);
    // barrel
    const bl = def.kind === 'sniper' ? 0.62 : 0.42;
    cyl(g, PALETTE.metalLt, 0.018, 0.018, bl, 0, 0.02, -len * 0.62).rotation.x = Math.PI / 2;
    // muzzle device
    if (def.attached.muzzle === 'suppressor') cyl(g, PALETTE.black, 0.036, 0.036, 0.24, 0, 0.02, -len * 0.62 - bl * 0.55).rotation.x = Math.PI / 2;
    else cyl(g, PALETTE.metal, 0.028, 0.03, 0.1, 0, 0.02, -len * 0.62 - bl * 0.5).rotation.x = Math.PI / 2;
    // magazine
    const magH = def.magSize > 60 ? 0.3 : def.magSize > 40 ? 0.24 : 0.18;
    box(g, def.attached.mag === 'drum' ? PALETTE.metal : mat(0x2a2a26), 0.06, magH, 0.13, 0, -0.1 - magH * 0.2, -0.02, [0.35, 0, 0]);
    if (def.attached.mag === 'drum') cyl(g, PALETTE.metal, 0.14, 0.14, 0.07, 0, -0.16, -0.02).rotation.z = Math.PI / 2;
    // grip
    box(g, PALETTE.black, 0.055, 0.16, 0.07, 0, -0.13, 0.1, [-0.3, 0, 0]);
    // stock
    if (def.kind !== 'smg') {
      box(g, body, 0.06, 0.1, 0.3, 0, -0.01, len * 0.42);
      box(g, body, 0.06, 0.14, 0.09, 0, -0.04, len * 0.57);
    }
    // optic
    if (def.attached.optic === 'scope') {
      cyl(g, PALETTE.black, 0.045, 0.05, 0.34, 0, 0.115, -0.05).rotation.x = Math.PI / 2;
      cyl(g, PALETTE.glass, 0.04, 0.04, 0.02, 0, 0.115, -0.23).rotation.x = Math.PI / 2;
      box(g, PALETTE.black, 0.03, 0.05, 0.1, 0, 0.08, -0.05);
    } else if (def.attached.optic === 'reddot') {
      box(g, PALETTE.black, 0.05, 0.055, 0.11, 0, 0.095, -0.02);
      const lens = box(g, mat(0x8a2a22, { emissive: 0x5c1712 }), 0.045, 0.035, 0.01, 0, 0.1, -0.075);
      lens.material = mat(0x8a2a22, { emissive: 0x5c1712 });
    } else {
      box(g, PALETTE.metal, 0.015, 0.03, 0.02, 0, 0.075, -0.42);
      box(g, PALETTE.metal, 0.02, 0.025, 0.02, 0, 0.07, 0.28);
    }
    // bipod for LMG
    if (def.kind === 'lmg') {
      box(g, PALETTE.metal, 0.015, 0.24, 0.015, -0.05, -0.1, -0.5, [0, 0, 0.3]);
      box(g, PALETTE.metal, 0.015, 0.24, 0.015, 0.05, -0.1, -0.5, [0, 0, -0.3]);
    }
  }
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.02, isPistol ? -0.3 : isLauncher ? -1.05 : -(def.kind === 'sniper' ? 0.95 : 0.72));
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.def = def;
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; } });
  return g;
}
function pal_wood() { return mat(PALETTE.wood); }

/* ============================ SOLDIER ============================ */
const teamBand = (team) => (team === 'ua' ? PALETTE.ua : PALETTE.ru);
const teamPatch = (team) => (team === 'ua' ? 0x2470c0 : 0x8f2b22);

/**
 * Blocky operator in the reference style.
 * height ≈ 1.82, origin at feet.
 */
export function buildSoldier({ team = 'ua', weapon = 'ak74', attachments = {}, helmet = true, unarmed = false, skin = PALETTE.skin, vestColor = PALETTE.vest, smile = false } = {}) {
  const root = new THREE.Group();
  const rig = new THREE.Group();       // animated body
  root.add(rig);

  const legs = new THREE.Group(); rig.add(legs);
  const legL = new THREE.Group(); legL.position.set(-0.13, 0.86, 0); legs.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.13, 0.86, 0); legs.add(legR);
  for (const leg of [legL, legR]) {
    box(leg, PALETTE.oliveDk, 0.185, 0.5, 0.2, 0, -0.25, 0);
    box(leg, 0x2f3326, 0.17, 0.34, 0.19, 0, -0.62, 0);
    box(leg, PALETTE.boot, 0.19, 0.13, 0.29, 0, -0.79, 0.04);
    // knee pad
    box(leg, PALETTE.vest, 0.16, 0.13, 0.06, 0, -0.45, -0.11);
    // thigh pouch
    box(leg, PALETTE.vest, 0.1, 0.13, 0.09, 0.09, -0.3, -0.03);
  }

  const torso = new THREE.Group(); torso.position.set(0, 0.88, 0); rig.add(torso);
  box(torso, PALETTE.olive, 0.5, 0.46, 0.27, 0, 0.24, 0);          // shirt
  box(torso, vestColor, 0.46, 0.4, 0.33, 0, 0.25, 0);              // plate carrier
  box(torso, PALETTE.vestLt, 0.34, 0.1, 0.36, 0, 0.34, 0);         // chest rig top
  for (let i = 0; i < 3; i++) box(torso, PALETTE.oliveDk, 0.1, 0.14, 0.05, -0.13 + i * 0.13, 0.14, -0.18);
  box(torso, PALETTE.vest, 0.2, 0.12, 0.06, 0, 0.36, -0.18);       // radio pouch
  box(torso, PALETTE.metal, 0.02, 0.16, 0.02, 0.12, 0.44, -0.15);  // antenna
  sph(torso, PALETTE.vestLt, 0.055, -0.26, 0.34, 0);               // shoulder pad L
  sph(torso, PALETTE.vestLt, 0.055, 0.26, 0.34, 0);                // shoulder pad R
  box(torso, PALETTE.olive, 0.34, 0.12, 0.2, 0, 0.46, 0);          // collar

  const head = new THREE.Group(); head.position.set(0, 1.5, 0); rig.add(head);
  box(head, skin, 0.3, 0.3, 0.28, 0, 0.02, 0);                     // head
  box(head, PALETTE.skinDark, 0.12, 0.1, 0.05, 0, -0.06, 0.14);    // jaw shade
  // eyes
  const eyeL = box(head, PALETTE.white, 0.06, 0.075, 0.02, -0.075, 0.055, 0.145);
  const eyeR = box(head, PALETTE.white, 0.06, 0.075, 0.02, 0.075, 0.055, 0.145);
  box(head, 0x1a1a18, 0.032, 0.04, 0.01, -0.075, 0.05, 0.157);
  box(head, 0x1a1a18, 0.032, 0.04, 0.01, 0.075, 0.05, 0.157);
  const mouth = box(head, 0x4a2f24, 0.1, 0.02, 0.01, 0, -0.085, 0.148);
  if (smile) {
    mouth.scale.set(0.17, 0.03, 0.01);
    mouth.position.y = -0.075;
    box(head, PALETTE.white, 0.13, 0.03, 0.005, 0, -0.065, 0.152);
  }
  // helmet
  if (helmet) {
    const helmetG = new THREE.Group(); head.add(helmetG);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(PALETTE.olive));
    dome.scale.set(1, 0.86, 1.02);
    dome.position.set(0, 0.09, 0);
    dome.castShadow = true;
    helmetG.add(dome);
    box(helmetG, 0x6c7245, 0.44, 0.06, 0.44, 0, 0.1, 0);            // brim ring
    box(helmetG, PALETTE.oliveDk, 0.1, 0.05, 0.06, 0.18, 0.06, 0);  // side mount
    box(helmetG, PALETTE.oliveDk, 0.03, 0.03, 0.3, 0.2, 0.13, 0);   // rail
    box(helmetG, 0x2b2e22, 0.3, 0.02, 0.02, 0, 0.02, 0.15);         // strap
    box(helmetG, 0x2b2e22, 0.02, 0.16, 0.02, -0.13, -0.06, 0.1);
    box(helmetG, 0x2b2e22, 0.02, 0.16, 0.02, 0.13, -0.06, 0.1);
    box(helmetG, 0x6c7245, 0.2, 0.04, 0.05, 0, 0.16, -0.1);         // top detail
    sph(helmetG, PALETTE.oliveDk, 0.035, -0.16, 0.13, 0);
    sph(helmetG, PALETTE.oliveDk, 0.035, 0.16, 0.13, 0);
  }

  // team armband on left upper arm
  const band = new THREE.Group(); band.position.set(-0.28, 1.33, 0);
  rig.add(band);
  box(band, teamBand(team), 0.16, 0.1, 0.17, 0, 0, 0);
  box(rig, teamPatch(team), 0.09, 0.06, 0.02, 0.19, 1.36, -0.14);

  // arms
  const armL = new THREE.Group(); armL.position.set(-0.31, 1.36, 0); rig.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.31, 1.36, 0); rig.add(armR);
  for (const arm of [armL, armR]) {
    box(arm, PALETTE.olive, 0.145, 0.34, 0.16, 0, -0.15, 0);
    box(arm, PALETTE.oliveDk, 0.13, 0.26, 0.145, 0, -0.42, 0);
    box(arm, skin, 0.115, 0.13, 0.12, 0, -0.59, 0);   // hand
  }

  // weapon in hands
  let weaponGroup = null;
  if (!unarmed) {
    weaponGroup = buildWeapon(weapon, attachments);
    weaponGroup.position.set(0.06, 1.14, 0.34);
    weaponGroup.rotation.set(0, Math.PI + 0.16, 0);
    rig.add(weaponGroup);
    // hands forward on the gun
    armR.rotation.set(-1.05, 0.1, 0.18);
    armL.rotation.set(-1.28, -0.18, -0.22);
  } else {
    armR.rotation.set(-0.25, 0, 0.1);
    armL.rotation.set(0.1, 0, -0.12);
  }

  root.userData = {
    type: 'soldier', rig, legL, legR, armL, armR, head, torso,
    weapon: weaponGroup, team, unarmed, phase: Math.random() * 6.28,
    mouth, eyeL, eyeR
  };
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return root;
}

/** Walk / idle / aim animation. speed in m/s. */
export function animateSoldier(s, dt, speed = 0, aiming = false, t = 0) {
  const u = s.userData;
  if (!u || u.type !== 'soldier') return;
  u.phase += dt * Math.max(2.5, speed * 1.8);
  const amp = Math.min(1, speed / 4.2);
  const sw = Math.sin(u.phase) * 0.55 * amp;
  u.legL.rotation.x = sw;
  u.legR.rotation.x = -sw;
  if (u.weapon) {
    // keep hands on weapon, add slight bob
    u.armR.rotation.x = -1.05 + Math.sin(u.phase * 2) * 0.04 * amp;
    u.armL.rotation.x = -1.28 + Math.sin(u.phase * 2) * 0.04 * amp;
  } else {
    u.armR.rotation.x = -0.25 - sw * 0.6;
    u.armL.rotation.x = 0.1 + sw * 0.6;
  }
  u.rig.position.y = Math.abs(Math.sin(u.phase)) * 0.035 * amp;
  if (aiming) u.armR.rotation.x -= 0.06;
}

/* ============================ VEHICLES ============================ */
export function buildVehicle(kind = 'tank', team = 'ua') {
  const g = new THREE.Group();
  const band = teamBand(team);
  const olive = kind === 'atv' ? 0x5a5f3a : team === 'ua' ? 0x4a5238 : 0x54513a;
  const dark = 0x24261f;

  let data = { type: 'vehicle', kind, turret: null, barrel: null, barrels: [], muzzle: null, wheels: [], name: '', maxSpeed: 8, hp: 500, seats: 1 };

  if (kind === 'tank') {
    data.name = team === 'ua' ? 'T-64BM' : 'T-72B3';
    data.maxSpeed = 11; data.hp = 1400; data.seats = 2;
    box(g, dark, 3.0, 0.5, 6.2, 0, 0.5, 0);                    // lower hull
    box(g, olive, 3.3, 0.62, 5.6, 0, 0.92, 0);                 // upper hull
    box(g, olive, 3.4, 0.2, 2.2, 0, 1.05, -1.9);               // glacis
    // tracks
    for (const sx of [-1, 1]) {
      box(g, 0x1a1c17, 0.62, 0.72, 6.4, sx * 1.62, 0.42, 0);
      for (let i = 0; i < 7; i++) {
        const w = cyl(g, 0x2b2e26, 0.34, 0.34, 0.66, sx * 1.62, 0.42, -2.7 + i * 0.9);
        w.rotation.z = Math.PI / 2;
      }
      box(g, olive, 0.7, 0.16, 6.5, sx * 1.62, 0.82, 0);       // track guard
      box(g, band, 0.08, 0.3, 0.4, sx * 1.72, 0.95, 1.9);
    }
    // turret
    const turret = new THREE.Group(); turret.position.set(0, 1.28, 0.15); g.add(turret);
    box(turret, olive, 2.3, 0.62, 2.6, 0, 0.16, 0);
    box(turret, olive, 1.9, 0.34, 1.2, 0, 0.5, -0.3);
    box(turret, olive, 1.0, 0.3, 0.5, 0, 0.45, -1.5);          // mantlet
    // ERA blocks
    for (let i = 0; i < 5; i++) {
      box(turret, 0x3b3f2e, 0.36, 0.14, 0.3, -0.9 + i * 0.45, 0.42, -1.05, [0.25, 0, 0]);
    }
    box(turret, band, 0.5, 0.2, 0.5, 0, 0.56, 0.9);            // recognition panel
    // barrel
    const barrel = new THREE.Group(); barrel.position.set(0, 0.42, -1.4); turret.add(barrel);
    cyl(barrel, 0x2f3329, 0.14, 0.16, 3.4, 0, 0, -1.7).rotation.x = Math.PI / 2;
    cyl(barrel, 0x1f221a, 0.2, 0.2, 0.36, 0, 0, -3.4).rotation.x = Math.PI / 2;
    box(barrel, 0x1f221a, 0.9, 0.9, 0.3, 0, 0, -2.9);
    const mz = new THREE.Object3D(); mz.position.set(0, 0, -3.62); barrel.add(mz);
    // commander hatch MG
    const mg = new THREE.Group(); mg.position.set(0.45, 0.62, 0.35); turret.add(mg);
    box(mg, 0x23261e, 0.1, 0.14, 0.4, 0, 0, -0.1);
    cyl(mg, 0x3a3d33, 0.035, 0.035, 0.9, 0, 0.02, -0.5).rotation.x = Math.PI / 2;
    const mgmz = new THREE.Object3D(); mgmz.position.set(0, 0.02, -0.98); mg.add(mgmz);
    // smoke launchers
    for (let i = 0; i < 4; i++) box(turret, dark, 0.1, 0.1, 0.28, -0.75 + i * 0.16, 0.42, -0.9, [-0.4, 0, 0]);
    data.turret = turret; data.barrel = barrel; data.barrels.push({ group: barrel, muzzle: mz, dmg: 260, cooldown: 4.5, kind: 'cannon' });
    data.mg = { group: mg, muzzle: mgmz };
    data.muzzle = mz;
  } else if (kind === 'atv') {
    data.name = 'QUAD-ATV'; data.maxSpeed = 17; data.hp = 320; data.seats = 2;
    box(g, dark, 1.12, 0.22, 1.9, 0, 0.42, 0);
    box(g, olive, 0.86, 0.34, 1.0, 0, 0.62, 0.05);
    box(g, olive, 0.66, 0.26, 0.5, 0, 0.78, 0.5);              // seat
    box(g, 0x1c1e17, 0.6, 0.1, 0.4, 0, 0.9, -0.34, [-0.12, 0, 0]); // handlebar cowl
    box(g, 0x2b2e26, 0.8, 0.1, 0.06, 0, 0.98, -0.28);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const w = cyl(g, 0x14150f, 0.32, 0.32, 0.22, sx * 0.62, 0.3, sz * 0.72);
      w.rotation.z = Math.PI / 2;
      box(g, 0x22241c, 0.24, 0.3, 0.5, sx * 0.6, 0.48, sz * 0.72); // fender
      w.isWheel = true;
    }
    box(g, band, 0.1, 0.18, 0.36, 0.5, 0.62, 0.4);
    const mg = new THREE.Group(); mg.position.set(0, 1.02, -0.1); g.add(mg);
    box(mg, 0x23261e, 0.12, 0.12, 0.34, 0, 0, -0.06);
    cyl(mg, 0x3a3d33, 0.032, 0.032, 0.8, 0, 0.01, -0.5).rotation.x = Math.PI / 2;
    const mz = new THREE.Object3D(); mz.position.set(0, 0.01, -0.94); mg.add(mz);
    data.turret = mg; data.muzzle = mz;
    data.barrels.push({ group: mg, muzzle: mz, dmg: 26, cooldown: 0.11, kind: 'mg' });
  } else {
    data.name = 'MT-LB TRANSPORT'; data.maxSpeed = 12; data.hp = 700; data.seats = 6;
    box(g, dark, 2.1, 0.34, 5.2, 0, 0.5, 0);
    box(g, olive, 2.2, 0.9, 2.0, 0, 0.98, -1.6);               // cab
    box(g, 0x2b3128, 1.9, 0.5, 0.12, 0, 1.2, -2.6);            // windshield
    box(g, olive, 2.2, 1.3, 3.1, 0, 1.2, 0.9);                 // cargo body
    box(g, 0x4a4a3a, 2.1, 0.5, 3.0, 0, 1.95, 0.9);             // canvas top
    for (let i = 0; i < 5; i++) box(g, 0x3b3b2c, 0.06, 0.5, 2.9, -1 + i * 0.5, 1.96, 0.9);
    box(g, band, 0.5, 0.16, 0.16, 0, 1.24, -2.66);
    for (const sx of [-1, 1]) for (const sz of [-1.9, 0.2, 1.9]) {
      const w = cyl(g, 0x14150f, 0.44, 0.44, 0.28, sx * 1.06, 0.44, sz);
      w.rotation.z = Math.PI / 2; w.isWheel = true;
    }
    const mg = new THREE.Group(); mg.position.set(0, 1.86, -0.55); g.add(mg);
    box(mg, 0x23261e, 0.1, 0.12, 0.34, 0, 0, -0.05);
    cyl(mg, 0x3a3d33, 0.03, 0.03, 0.8, 0, 0.01, -0.5).rotation.x = Math.PI / 2;
    const mz = new THREE.Object3D(); mz.position.set(0, 0.01, -0.94); mg.add(mz);
    data.turret = mg; data.muzzle = mz;
    data.barrels.push({ group: mg, muzzle: mz, dmg: 24, cooldown: 0.12, kind: 'mg' });
  }

  g.userData = data;
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return g;
}

/* ============================ PROPS ============================ */
export function buildCar(color = 0x6a2f26) {
  const g = new THREE.Group();
  box(g, color, 1.8, 0.6, 4.1, 0, 0.6, 0);
  box(g, color, 1.6, 0.5, 1.9, 0, 1.12, 0.1);
  box(g, 0x22282a, 1.5, 0.36, 1.7, 0, 1.16, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) {
    const w = cyl(g, 0x141510, 0.32, 0.32, 0.2, sx * 0.86, 0.32, sz);
    w.rotation.z = Math.PI / 2;
  }
  return g;
}
