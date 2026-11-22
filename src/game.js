/* ============================================================
   HELL ON EARTH — match engine
   30 vs 30 combined arms in a destroyed city sector.
   ============================================================ */
import * as THREE from 'three';
import { buildWorld, segmentBlocked } from './world.js';
import { buildSoldier, animateSoldier, buildWeapon, buildVehicle, resolveWeapon, PALETTE, mat, box } from './models.js';

export const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const fmtTime = (s) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/* ============================ OPERATORS ============================ */
export const OPERATORS = [
  {
    id: 'rifleman', name: 'RIFLEMAN', role: 'Line Infantry', icon: '▲', weapon: 'ak74', hp: 110, speed: 1.0,
    desc: 'The backbone of every assault. Balanced armour, fast handling and a rifle that keeps working in the mud.',
    stats: { FIREPOWER: 74, MOBILITY: 70, ARMOR: 66, TECH: 40 },
    ability: { name: 'ADRENALINE', cd: 30, desc: '+35 HP and +30% movement speed for 6 seconds.' }
  },
  {
    id: 'gunner', name: 'GUNNER', role: 'Suppression', icon: '▦', weapon: 'lmg', hp: 140, speed: 0.86,
    desc: 'Belt-fed firepower. Pin a street for thirty seconds and nobody crosses it. Heavy, slow, terrifying.',
    stats: { FIREPOWER: 96, MOBILITY: 46, ARMOR: 82, TECH: 30 },
    ability: { name: 'OVERCHARGE', cd: 40, desc: '10 seconds of fire with no ammunition drain.' }
  },
  {
    id: 'marksman', name: 'MARKSMAN', role: 'Long Range Recon', icon: '✛', weapon: 'sniper', hp: 95, speed: 0.96,
    desc: 'One shot, one problem solved. Fragile up close, lethal down a boulevard.',
    stats: { FIREPOWER: 92, MOBILITY: 58, ARMOR: 48, TECH: 62 },
    ability: { name: 'FOCUS', cd: 38, desc: 'Perfect accuracy and +40% damage for 7 seconds.' }
  },
  {
    id: 'drone', name: 'DRONE OPERATOR', role: 'Recon & EW', icon: '◈', weapon: 'smg', hp: 100, speed: 1.06,
    desc: 'Eyes in the sky. Marks every hostile in the sector and feeds coordinates to the squad.',
    stats: { FIREPOWER: 56, MOBILITY: 84, ARMOR: 52, TECH: 98 },
    ability: { name: 'RECON DRONE', cd: 45, desc: 'Reveals every enemy in the sector for 15 seconds.' }
  },
  {
    id: 'driver', name: 'TANK DRIVER', role: 'Armour · Driver', icon: '▣', weapon: 'ak74', hp: 115, speed: 1.02,
    desc: 'Keeps the armour rolling. Repairs tracks under fire and drives through anything smaller.',
    stats: { FIREPOWER: 70, MOBILITY: 78, ARMOR: 74, TECH: 78 },
    ability: { name: 'FIELD REPAIR', cd: 35, desc: 'Patch your vehicle (+70% hull) and yourself (+25 HP).' }
  },
  {
    id: 'commander', name: 'TANK COMMANDER', role: 'Armour · Command', icon: '★', weapon: 'ak74', hp: 120, speed: 0.94,
    desc: 'Calls the shots and the artillery. Coordinates armour pushes across the city.',
    stats: { FIREPOWER: 84, MOBILITY: 54, ARMOR: 88, TECH: 86 },
    ability: { name: 'ARMOR BARRAGE', cd: 60, desc: 'Six-round artillery barrage on the point you are aiming at.' }
  }
];

const BOT_NAMES = ['KOVAL', 'SOKOL', 'MOROZ', 'TARAN', 'VOVK', 'ZIRKA', 'BILKA', 'DUNAI', 'HROM', 'KALYNA',
  'LESIA', 'MAVR', 'NESTOR', 'ORLYK', 'PECHORA', 'RAVEN', 'SICH', 'TREMBITA', 'UZHYN', 'VERBNA',
  'YAVIR', 'ZORIAN', 'BARS', 'CHUHA', 'DZVIR', 'HAIDAMAK', 'IRVA', 'KHRYSTIA'];

/* ============================ EFFECTS ============================ */
class Effects {
  constructor(scene) {
    this.scene = scene;
    this.tracers = [];
    this.impacts = [];
    this.flashes = [];
    this.booms = [];
    for (let i = 0; i < 34; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const m = new THREE.LineBasicMaterial({ color: 0xffd79a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      const line = new THREE.Line(geo, m);
      line.frustumCulled = false; line.visible = false;
      scene.add(line);
      this.tracers.push({ line, life: 0 });
    }
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: 0xd8cba8, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; scene.add(m);
      this.impacts.push({ mesh: m, life: 0, max: 1 });
    }
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc26a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      m.visible = false; scene.add(m);
      this.flashes.push({ mesh: m, life: 0 });
    }
  }

  tracer(from, to, color = 0xffd79a) {
    const t = this.tracers.find((x) => x.life <= 0) || this.tracers[0];
    const pos = t.line.geometry.attributes.position;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
    t.line.material.color.setHex(color);
    t.line.material.opacity = 0.85;
    t.line.visible = true;
    t.life = 0.07;
  }

  impact(pos, color = 0xd8cba8, size = 1) {
    const p = this.impacts.find((x) => x.life <= 0) || this.impacts[0];
    p.mesh.position.copy(pos);
    p.mesh.material.color.setHex(color);
    p.mesh.material.opacity = 0.95;
    p.mesh.scale.setScalar(size * 0.7);
    p.mesh.visible = true;
    p.life = 0.28; p.max = 0.28;
  }

  flash(pos, size = 0.5) {
    const f = this.flashes.find((x) => x.life <= 0) || this.flashes[0];
    f.mesh.position.copy(pos);
    f.mesh.scale.setScalar(size);
    f.mesh.material.opacity = 0.9;
    f.mesh.visible = true;
    f.life = 0.06;
  }

  explosion(pos, radius = 6) {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffb457, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    sphere.position.copy(pos);
    sphere.scale.setScalar(radius * 0.25);
    this.scene.add(sphere);
    const light = new THREE.PointLight(0xff8b32, 26, radius * 5, 2);
    light.position.copy(pos);
    this.scene.add(light);
    this.booms.push({ sphere, light, t: 0, dur: 0.65, radius });
    if (this.booms.length > 6) {
      const old = this.booms.shift();
      this.scene.remove(old.sphere, old.light);
      old.sphere.geometry.dispose(); old.sphere.material.dispose();
    }
    for (let i = 0; i < 5; i++) {
      this.impact(new THREE.Vector3(pos.x + rand(-1.4, 1.4), pos.y + rand(0, 1.6), pos.z + rand(-1.4, 1.4)), 0x6b6154, 2.4);
    }
  }

  update(dt) {
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.line.material.opacity = Math.max(0, t.life / 0.07) * 0.85;
        if (t.life <= 0) t.line.visible = false;
      }
    }
    for (const p of this.impacts) {
      if (p.life > 0) {
        p.life -= dt;
        const k = Math.max(0, p.life / p.max);
        p.mesh.material.opacity = k;
        p.mesh.scale.setScalar(p.mesh.scale.x * (1 + dt * 1.6));
        if (p.life <= 0) p.mesh.visible = false;
      }
    }
    for (const f of this.flashes) {
      if (f.life > 0) { f.life -= dt; f.mesh.material.opacity = Math.max(0, f.life / 0.06); if (f.life <= 0) f.mesh.visible = false; }
    }
    for (let i = this.booms.length - 1; i >= 0; i--) {
      const b = this.booms[i];
      b.t += dt;
      const k = b.t / b.dur;
      if (k >= 1) {
        this.scene.remove(b.sphere, b.light);
        b.sphere.geometry.dispose(); b.sphere.material.dispose();
        this.booms.splice(i, 1);
      } else {
        b.sphere.scale.setScalar(b.radius * (0.25 + k * 1.05));
        b.sphere.material.opacity = (1 - k) * 0.95;
        b.light.intensity = (1 - k) * 26;
      }
    }
  }
}

/* ============================ BOT ============================ */
class Bot {
  constructor(match, team, index) {
    this.m = match;
    this.team = team;
    this.enemyTeam = team === 'ua' ? 'ru' : 'ua';
    this.index = index;
    this.name = BOT_NAMES[index % BOT_NAMES.length] + '-' + (index + 1);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    this.hp = 100; this.maxHp = 100;
    this.alive = true;
    this.deadT = 0;
    this.weaponId = pick(['ak74', 'ak74', 'ak74', 'lmg', 'smg', 'sniper']);
    this.base = resolveWeapon(this.weaponId, {});
    this.mag = this.base.magSize;
    this.reserve = this.base.magSize * 2;
    this.thinkT = Math.random() * 0.4;
    this.aimT = rand(0.4, 1.4);
    this.fireT = rand(0.3, 1);
    this.reloadT = 0;
    this.unarmed = false;
    this.resupplyT = 0;
    this.target = null;
    this.waypoint = new THREE.Vector3();
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeT = rand(1, 3);
    this.speedMul = rand(0.82, 1.05);
    this.markedUntil = 0;
    this.phase = Math.random() * 6.28;
    this.moveSpeed = 0;

    this.soldier = buildSoldier({ team, weapon: this.weaponId, smile: Math.random() < 0.15 });
    this.soldier.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    this.soldier.userData.weaponMesh = this.soldier.userData.weapon;
    this.proxy = this.buildProxy();
    match.scene.add(this.soldier, this.proxy);
    this.spawn(true);
  }

  buildProxy() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.86, 0.32), mat(this.team === 'ua' ? 0x59623f : 0x5f5a3d));
    b.position.y = 1.12; g.add(b);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.29, 0.29), mat(PALETTE.skin));
    head.position.y = 1.7; g.add(head);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(PALETTE.olive));
    helm.position.y = 1.77; helm.scale.y = 0.85; g.add(helm);
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.9), mat(PALETTE.metal));
    gun.position.set(0.12, 1.22, -0.44); g.add(gun);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.18), mat(this.team === 'ua' ? PALETTE.ua : PALETTE.ru));
    band.position.set(-0.29, 1.4, 0); g.add(band);
    g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return g;
  }

  eye() { return { x: this.pos.x, y: this.pos.y + 1.55, z: this.pos.z }; }

  spawn(first = false) {
    const pts = this.m.world.spawns[this.team];
    const p = pts[(this.index + 1) % pts.length];
    this.pos.set(p.x + rand(-4, 4), 0, p.z + rand(-4, 4));
    this.hp = this.maxHp;
    this.alive = true;
    this.unarmed = false;
    this.deadT = 0;
    this.mag = this.base.magSize;
    this.reserve = this.base.magSize * 2;
    this.reloadT = 0;
    this.target = null;
    this.soldier.rotation.set(0, 0, 0);
    this.soldier.position.copy(this.pos);
    this.soldier.visible = true;
    this.proxy.visible = false;
    this.waypoint.set(rand(-70, 70), 0, this.team === 'ua' ? rand(-55, -10) : rand(10, 55));
    if (this.soldier.userData.weaponMesh) this.soldier.userData.weaponMesh.visible = !this.unarmed;
    this.soldier.userData.weapon = this.soldier.userData.weaponMesh;
    this.m.botsAlive++;
  }

  setUnarmed() {
    if (this.unarmed) return;
    this.unarmed = true;
    this.resupplyT = rand(8, 12);
    const u = this.soldier.userData;
    if (u.weaponMesh) u.weaponMesh.visible = false;
    u.weapon = null;
    this.m.onBotUnarmed(this);
  }

  resupply() {
    this.unarmed = false;
    const u = this.soldier.userData;
    u.weapon = u.weaponMesh;
    if (u.weaponMesh) u.weaponMesh.visible = true;
    this.mag = this.base.magSize;
    this.reserve = this.base.magSize;
    if (this.m.audio) this.m.audio.reload();
  }

  takeDamage(dmg, fromName, fromTeam, weaponLabel, headshot = false) {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.m.effects.impact(new THREE.Vector3(this.pos.x, this.pos.y + 1.2, this.pos.z), 0x8e2b21, 1.4);
    if (this.hp <= 0) {
      this.die(fromName, fromTeam, weaponLabel, headshot);
      return true;
    }
    return false;
  }

  die(killerName, killerTeam, weaponLabel, headshot) {
    this.alive = false;
    this.deadT = 0;
    this.mag = 0;
    this.reserve = 0;
    this.soldier.userData.weapon = null;
    if (this.soldier.userData.weaponMesh) this.soldier.userData.weaponMesh.visible = false;
    this.proxy.visible = false;
    this.m.onBotKilled(this, killerName, killerTeam, weaponLabel, headshot);
  }

  update(dt) {
    const m = this.m;
    if (!this.alive) {
      this.deadT += dt;
      if (this.deadT < 0.7) {
        this.soldier.rotation.z = clamp(this.deadT / 0.7, 0, 1) * 1.45;
        this.soldier.position.y = this.pos.y - clamp(this.deadT - 0.35, 0, 0.35) * 0.7;
      } else if (this.deadT > 6) {
        this.soldier.visible = false;
      }
      if (this.deadT > 8) this.spawn();
      return;
    }

    // LOD
    const d2 = this.pos.distanceToSquared(m.camera.position);
    const near = d2 < 3600;
    this.soldier.visible = near;
    this.proxy.visible = !near;
    this.soldier.position.copy(this.pos);
    this.proxy.position.copy(this.pos);

    if (this.resupplyT > 0) {
      this.resupplyT -= dt;
      if (this.resupplyT <= 0) this.resupply();
    }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        if (this.reserve >= this.base.magSize) { this.reserve -= this.base.magSize; this.mag = this.base.magSize; }
        else { this.mag = this.reserve; this.reserve = 0; }
      }
    }

    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = rand(0.35, 0.65);
      this.think();
    }

    /* -------- movement -------- */
    let move = null;
    if (this.target) {
      const tp = this.target.pos;
      const dx = tp.x - this.pos.x, dz = tp.z - this.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const range = this.base.kind === 'sniper' ? 62 : this.base.kind === 'lmg' ? 34 : 22;
      if (this.unarmed) {
        if (dist < 55) { move = { x: -dx / dist, z: -dz / dist }; }
        else { move = { x: dx / dist, z: dz / dist }; }
      } else if (dist > range * 1.15) {
        move = { x: dx / dist, z: dz / dist };
      } else if (dist < range * 0.55) {
        move = { x: -dx / dist + -dz / dist * this.strafeDir * 0.6, z: -dz / dist + dx / dist * this.strafeDir * 0.6 };
      } else {
        move = { x: -dz / dist * this.strafeDir, z: dx / dist * this.strafeDir };
      }
      this.yaw = Math.atan2(dx, dz);
    } else {
      const dx = this.waypoint.x - this.pos.x, dz = this.waypoint.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 4) {
        this.waypoint.set(rand(-85, 85), 0, this.team === 'ua' ? rand(-75, 20) : rand(-20, 75));
      }
      move = { x: dx / (dist || 1), z: dz / (dist || 1) };
      this.yaw = Math.atan2(dx, dz);
    }

    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeDir *= -1; this.strafeT = rand(1.2, 2.8); }

    const spd = (this.unarmed ? 4.4 : this.target ? 2.6 : 3.6) * this.speedMul;
    this.moveSpeed = spd;
    if (move) {
      const mv = new THREE.Vector3(move.x, 0, move.z);
      if (mv.lengthSq() > 0) mv.normalize();
      this.step(mv.x * spd * dt, mv.z * spd * dt);
    }
    this.soldier.rotation.y = this.yaw;
    this.proxy.rotation.y = this.yaw;
    animateSoldier(this.soldier, dt, this.moveSpeed, false);

    /* -------- combat -------- */
    if (this.unarmed || this.mag <= 0 || this.reloadT > 0 || !this.target) return;
    const tgt = this.target;
    if (!tgt || !tgt.alive) return;
    const tx = tgt.pos.x, ty = tgt.pos.y + (tgt === m.player ? 1.5 : 1.2), tz = tgt.pos.z;
    const dist = Math.hypot(tx - this.pos.x, tz - this.pos.z);
    if (dist > this.base.range * 0.85) return;
    if (m.wallBetween(this.eye(), { x: tx, y: ty, z: tz })) return;

    this.fireT -= dt;
    if (this.fireT > 0) return;
    this.fireT = (60 / this.base.rpm) * rand(1.1, 2.6);
    this.aimT -= dt;
    if (this.aimT > 0) return;
    this.shootAt(tgt, tx, ty, tz, dist);
  }

  step(dx, dz) {
    const nx = this.pos.x + dx;
    if (!this.m.collides(nx, this.pos.y, this.pos.z, 0.34, 1.75)) this.pos.x = nx;
    const nz = this.pos.z + dz;
    if (!this.m.collides(this.pos.x, this.pos.y, nz, 0.34, 1.75)) this.pos.z = nz;
    this.pos.x = clamp(this.pos.x, -114, 114);
    this.pos.z = clamp(this.pos.z, -114, 114);
  }

  shootAt(tgt, tx, ty, tz, dist) {
    const m = this.m;
    if (this.base.kind === 'sniper' && Math.random() > 0.55) return;
    this.mag--;
    if (this.mag <= 0) {
      if (this.reserve > 0) this.reloadT = rand(2.2, 3.2);
      else this.setUnarmed();
    }
    const from = { x: this.pos.x, y: this.pos.y + 1.22, z: this.pos.z };
    const isPlayer = tgt === m.player;
    const distToPlayer = this.pos.distanceTo(m.player.pos);
    if (m.audio && distToPlayer < 100) m.audio.shot(this.base.kind, distToPlayer);
    m.effects.flash(new THREE.Vector3(from.x, from.y, from.z), 0.32);
    m.effects.tracer(from, new THREE.Vector3(tx + rand(-1, 1), ty + rand(-1, 1), tz + rand(-1, 1)));

    const acc = clamp(0.34 - dist * 0.0022, 0.08, 0.34) * (this.base.kind === 'sniper' ? 1.25 : 1);
    if (Math.random() > acc) return;
    let dmg = this.base.kind === 'sniper' ? 46 : this.base.kind === 'lmg' ? 13 : this.base.kind === 'smg' ? 8 : 12;
    if (isPlayer) {
      dmg *= 0.55;
      m.damagePlayer(dmg, this.pos);
    } else if (tgt.takeDamage) {
      tgt.takeDamage(dmg, this.name, this.team, this.base.name, false);
    }
  }

  think() {
    const m = this.m;
    let best = null, bd = 78 * 78;
    for (const b of m.botsByTeam[this.enemyTeam]) {
      if (!b.alive) continue;
      const d = b.pos.distanceToSquared(this.pos);
      if (d < bd) { bd = d; best = b; }
    }
    if (m.player.team === this.enemyTeam && m.player.alive) {
      const d = m.player.pos.distanceToSquared(this.pos);
      if (d < bd) { bd = d; best = m.player; }
    }
    this.target = best;
    if (best) this.aimT = rand(0.15, 0.6) * clamp(bd / 900, 0.4, 2.2);
  }
}

/* ============================ MATCH ============================ */
export class Match {
  constructor(o) {
    this.opts = o;
    this.renderer = o.renderer;
    this.audio = o.audio;
    this.settings = o.settings || {};
    this.controls = o.controls || 'pc';
    this.team = o.team || 'ua';
    this.enemyTeam = this.team === 'ua' ? 'ru' : 'ua';
    this.op = OPERATORS.find((x) => x.id === o.operator) || OPERATORS[0];
    this.teamLabel = this.team === 'ua' ? 'UKRAINE' : 'RUSSIA';
    this.enemyLabel = this.enemyTeam === 'ua' ? 'UKRAINE' : 'RUSSIA';
    this.onEnd = o.onEnd || (() => {});
    this.onPause = o.onPause || (() => {});
    this.onResume = o.onResume || (() => {});
    this.active = true;
    this.paused = false;
    this.finished = false;
    this.timeLeft = 15 * 60;
    this.tickets = { ua: 250, ru: 250 };
    this.frame = 0;
    this.botsAlive = 0;
    this.voiceCooldown = 0;
    this.armorCalled = false;
    this.shake = 0;
    this.dryT = 0;
    this.droneT = 0;
    this.sectorFill = 0;

    this.scene = new THREE.Scene();
    const fov = this.settings.fov || 78;
    this.baseFov = fov;
    this.camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.08, 420);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.world = buildWorld(this.scene, this.settings.quality || 'med');
    this.effects = new Effects(this.scene);

    this.el = {
      hud: $('hud'), mobile: $('mobile'),
      scoreUa: $('score-ua'), scoreRu: $('score-ru'), time: $('match-time'), sector: $('sector-fill'),
      hpFill: $('hp-fill'), hpText: $('hp-text'), hpBar: document.querySelector('#vitals .hp'),
      opName: $('hud-op'), teamName: $('hud-team'),
      abilKey: $('abil-key'), abilFill: $('abil-fill'), abilName: $('abil-name'),
      weaponName: $('weapon-name'), mag: $('ammo-mag'), reserve: $('ammo-res'), fireMode: $('fire-mode'), reloadHint: $('reload-hint'),
      killfeed: $('killfeed'), radio: $('radio-log'), subtitles: $('subtitles'), objective: $('objective'),
      prompt: $('prompt'), vignette: $('damage-vignette'), crosshair: $('crosshair'), hitmarker: $('hitmarker'),
      vehicleHud: $('vehicle-hud'), vhName: $('vh-name'), vhSpeed: $('vh-speed'), vhHint: $('vh-hint'),
      fps: $('fps-counter'), minimap: $('minimap'), fpsCounter: $('fps-counter')
    };

    this.keys = {};
    this.firing = false;
    this.ads = false;
    this.mobileMove = { x: 0, y: 0 };
    this.mobileFire = false;
    this.subT = 0;
    this.hitT = 0;
    this.lastStep = 0;

    this.buildPlayer();
    this.buildBots();
    this.buildVehicles();
    this.bindInput();
    this.startHud();
    this.resize();
  }

  /* ------------------------- setup ------------------------- */
  buildPlayer() {
    const p = {
      pos: new THREE.Vector3(0, 0, 96), vel: new THREE.Vector3(), yaw: 0, pitch: 0,
      team: this.team, alive: true, hp: this.op.hp, maxHp: this.op.hp,
      speedMul: this.op.speed, kills: 0, deaths: 0, score: 0, vehKills: 0,
      slot: 0, reloadT: 0, cooldown: 0, heat: 0, regenT: 0, stepAcc: 0,
      respawnT: 0, dryCalled: false, resupplyT: 0, abilityCd: 0, speedBoostT: 0,
      noDrainT: 0, focusT: 0, vehicle: null, lastHitT: 0, shots: 0, hits: 0
    };
    const primary = resolveWeapon(this.opts.weapon || this.op.weapon, this.opts.attachments || {});
    p.slots = [
      { def: primary, id: this.opts.weapon || this.op.weapon, mag: primary.magSize, reserve: primary.reserveSize },
      { def: resolveWeapon('pistol', {}), id: 'pistol', mag: 15, reserve: 45 }
    ];
    this.player = p;
    this.viewmodel = new THREE.Group();
    this.camera.add(this.viewmodel);
    this.vmGuns = [
      buildWeapon(p.slots[0].id, this.opts.attachments || {}),
      buildWeapon('pistol', {})
    ];
    this.vmGuns[0].position.set(0.25, -0.21, -0.46);
    this.vmGuns[0].rotation.set(0.02, -0.05, 0);
    this.vmGuns[0].scale.setScalar(0.76);
    this.vmGuns[1].position.set(0.25, -0.22, -0.4);
    this.vmGuns[1].rotation.set(0.02, -0.05, 0);
    this.vmGuns[1].scale.setScalar(0.9);
    this.viewmodel.add(this.vmGuns[0], this.vmGuns[1]);
    this.vmGuns[1].visible = false;
    this.viewmodel.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    this.viewmodel.position.set(0, 0, 0);
    this.spawnPlayer(true);
  }

  spawnPlayer(first = false) {
    const p = this.player;
    const dirZ = this.team === 'ua' ? 1 : -1;
    p.pos.set(rand(-3, 3), 0, dirZ * 113);
    p.vel.set(0, 0, 0);
    p.hp = p.maxHp;
    p.alive = true;
    p.respawnT = 0;
    p.yaw = Math.atan2(-(0 - p.pos.x), -(0 - p.pos.z));
    p.pitch = 0;
    p.reloadT = 0;
    p.cooldown = 0;
    p.heat = 0;
    p.vehicle = null;
    this.camera.position.set(p.pos.x, p.pos.y + 1.68, p.pos.z);
    this.viewmodel.visible = true;
    if (this.el.vehicleHud) this.el.vehicleHud.classList.add('hidden');
    if (first) {
      this.el.opName.textContent = this.op.name;
      this.el.teamName.textContent = this.teamLabel;
      this.el.teamName.style.color = this.team === 'ua' ? '#7fb4ee' : '#ef8b7f';
      this.el.abilKey.textContent = 'Q';
      this.el.abilName.textContent = this.op.ability.name;
      this.el.hpBar.parentElement.classList.toggle('low', false);
    }
  }

  buildBots() {
    this.bots = [];
    this.botsByTeam = { ua: [], ru: [] };
    const ownCount = 29, enemyCount = 30;
    for (let i = 0; i < enemyCount; i++) {
      const b = new Bot(this, this.enemyTeam, i);
      this.bots.push(b); this.botsByTeam[this.enemyTeam].push(b);
    }
    for (let i = 0; i < ownCount; i++) {
      const b = new Bot(this, this.team, i);
      this.bots.push(b); this.botsByTeam[this.team].push(b);
    }
  }

  buildVehicles() {
    this.vehicles = this.world.vehicleSpawns.map((s, i) => {
      const mesh = buildVehicle(s.kind, s.team === 'neutral' ? (i % 2 ? 'ua' : 'ru') : s.team);
      mesh.position.copy(s.pos);
      mesh.rotation.y = s.rot;
      mesh.userData.startRot = s.rot;
      this.scene.add(mesh);
      mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      return {
        id: i, kind: s.kind, team: s.team, mesh,
        hp: mesh.userData.hp, maxHp: mesh.userData.hp,
        speed: 0, yaw: s.rot, respawnT: 0, driver: null,
        label: mesh.userData.name
      };
    });
  }

  /* ------------------------- physics helpers ------------------------- */
  collides(x, y, z, r, h) {
    const cols = this.world.colliders;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ && y + h > c.minY && y < c.maxY) return true;
    }
    return false;
  }

  wallBetween(a, b) {
    return segmentBlocked(a.x, a.y, a.z, b.x, b.y, b.z, this.world.colliders, true);
  }

  rayWall(origin, dir, maxT) {
    let best = maxT;
    const groundT = dir.y < -1e-4 ? -origin.y / dir.y : Infinity;
    if (groundT > 0 && groundT < best) best = groundT;
    const cols = this.world.colliders;
    for (let i = 0; i < cols.length; i++) {
      const t = rayAABB(origin, dir, cols[i], best);
      if (t >= 0 && t < best) best = t;
    }
    return best;
  }

  aimDir(spread = 0) {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    if (spread > 0) {
      d.x += rand(-spread, spread); d.y += rand(-spread, spread); d.z += rand(-spread, spread);
      d.normalize();
    }
    return d;
  }

  /* ------------------------- input ------------------------- */
  bindInput() {
    const canvas = this.renderer.domElement;

    this._kd = (e) => {
      if (!this.active) return;
      if (e.code === 'Escape') {
        if (this.paused) this.resume(); else this.pause();
        return;
      }
      if (this.paused) return;
      this.keys[e.code] = true;
      if (['Space', 'KeyR', 'KeyF', 'KeyV', 'KeyQ', 'Digit1', 'Digit2', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyR') this.reload();
      if (e.code === 'KeyF') this.toggleVehicle();
      if (e.code === 'KeyV') this.callResupply();
      if (e.code === 'KeyQ') this.useAbility();
      if (e.code === 'Digit1' || e.code === 'Digit2') this.swapWeapon(e.code === 'Digit2' ? 1 : 0);
    };
    this._ku = (e) => { this.keys[e.code] = false; };

    this._md = (e) => {
      if (!this.active || this.paused || this.controls !== 'pc') return;
      if (e.button === 0) this.firing = true;
      if (e.button === 2) this.ads = true;
    };
    this._mu = (e) => {
      if (e.button === 0) this.firing = false;
      if (e.button === 2) this.ads = false;
    };
    this._mm = (e) => {
      if (!this.active || this.paused || this.controls !== 'pc') return;
      if (document.pointerLockElement !== canvas) return;
      const s = (this.settings.sens || 1) * 0.0021 * (this.ads ? 0.6 : 1);
      this.player.yaw -= e.movementX * s;
      this.player.pitch = clamp(this.player.pitch - e.movementY * s, -1.48, 1.42);
    };
    this._click = () => {
      if (!this.active || this.paused || this.controls !== 'pc') return;
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) canvas.requestPointerLock();
    };
    this._plc = () => {
      if (!this.active || this.paused || this.finished) return;
      if (this.controls === 'pc' && document.pointerLockElement !== canvas) this.pause();
    };
    this._ctx = (e) => { if (this.active) e.preventDefault(); };
    this._resize = () => this.resize();

    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    window.addEventListener('mousedown', this._md);
    window.addEventListener('mouseup', this._mu);
    window.addEventListener('mousemove', this._mm);
    window.addEventListener('resize', this._resize);
    canvas.addEventListener('click', this._click);
    canvas.addEventListener('contextmenu', this._ctx);
    document.addEventListener('pointerlockchange', this._plc);

    if (this.controls === 'mobile') this.bindMobile();
    this.el.mobile.classList.toggle('hidden', this.controls !== 'mobile');
  }

  bindMobile() {
    const stick = $('stick-zone'), knob = $('stick-knob'), look = $('look-zone');
    let stickId = null, lookId = null, lx = 0, ly = 0;
    const setKnob = (x, y) => { knob.style.transform = `translate(${x * 32}px,${y * 32}px)`; };

    this._msd = (e) => {
      const t = e.target;
      if (t.closest && t.closest('.mbtn')) return;
      e.preventDefault();
      stickId = e.pointerId;
      stick.setPointerCapture(e.pointerId);
    };
    this._msm = (e) => {
      if (e.pointerId !== stickId) return;
      const r = stick.getBoundingClientRect();
      const cx = r.left + 82, cy = r.bottom - 82;
      let dx = (e.clientX - cx) / 46, dy = (e.clientY - cy) / 46;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.mobileMove.x = dx; this.mobileMove.y = -dy;
      setKnob(dx, dy);
    };
    this._msu = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null; this.mobileMove.x = 0; this.mobileMove.y = 0; setKnob(0, 0);
    };
    this._msdown = (e) => {
      if (e.target.closest && e.target.closest('.mbtn')) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      look.setPointerCapture(e.pointerId);
    };
    this._msmove = (e) => {
      if (e.pointerId !== lookId) return;
      const s = (this.settings.sens || 1) * 0.0042;
      this.player.yaw -= (e.clientX - lx) * s;
      this.player.pitch = clamp(this.player.pitch - (e.clientY - ly) * s, -1.48, 1.42);
      lx = e.clientX; ly = e.clientY;
    };
    this._msup = (e) => { if (e.pointerId === lookId) lookId = null; };

    stick.addEventListener('pointerdown', this._msd);
    stick.addEventListener('pointermove', this._msm);
    stick.addEventListener('pointerup', this._msu);
    stick.addEventListener('pointercancel', this._msu);
    look.addEventListener('pointerdown', this._msdown);
    look.addEventListener('pointermove', this._msmove);
    look.addEventListener('pointerup', this._msup);
    look.addEventListener('pointercancel', this._msup);

    const hold = (id, on, off) => {
      const el = $(id);
      const d = (e) => { e.preventDefault(); on(); };
      const u = (e) => { e.preventDefault(); off && off(); };
      el.addEventListener('pointerdown', d);
      el.addEventListener('pointerup', u);
      el.addEventListener('pointercancel', u);
      el.addEventListener('pointerleave', u);
      this._mh.push([el, d, u]);
    };
    this._mh = [];
    hold('m-fire', () => { this.mobileFire = true; }, () => { this.mobileFire = false; });
    hold('m-jump', () => { this.tryJump(); });
    hold('m-reload', () => this.reload());
    hold('m-enter', () => this.toggleVehicle());
    hold('m-swap', () => this.swapWeapon(this.player.slot === 0 ? 1 : 0));
    hold('m-abil', () => this.useAbility());
    hold('m-pause', () => this.pause());
    this.el.mobile.classList.remove('hidden');
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  pause() {
    if (!this.active || this.finished) return;
    this.paused = true;
    this.firing = false;
    this.mobileFire = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.onPause();
  }

  resume() {
    if (this.finished) return;
    this.paused = false;
    this.onResume();
    if (this.controls === 'pc' && this.renderer.domElement.requestPointerLock) {
      this.renderer.domElement.requestPointerLock();
    }
  }

  /* ------------------------- loop ------------------------- */
  update(dt) {
    if (!this.active || this.paused || this.finished) return;
    dt = Math.min(dt, 1 / 20);
    this.frame++;
    this.timeLeft -= dt;
    this.voiceCooldown = Math.max(0, this.voiceCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 3.2);

    const p = this.player;
    p.abilityCd = Math.max(0, p.abilityCd - dt);
    p.speedBoostT = Math.max(0, p.speedBoostT - dt);
    p.noDrainT = Math.max(0, p.noDrainT - dt);
    p.focusT = Math.max(0, p.focusT - dt);
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.heat = Math.max(0, p.heat - dt * 0.9);
    p.resupplyT = Math.max(0, p.resupplyT - dt);
    p.lastHitT += dt;
    this.droneT = Math.max(0, this.droneT - dt);
    this.subT = Math.max(0, this.subT - dt);
    if (this.subT <= 0) this.el.subtitles.classList.remove('show');

    if (!p.alive) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) this.spawnPlayer();
      else this.el.prompt.textContent = `RESPAWNING IN ${Math.ceil(p.respawnT)}`;
      this.el.prompt.classList.remove('hidden');
    } else {
      if (p.vehicle) this.updateDriving(dt);
      else this.updateFoot(dt);
      if (p.resupplyT > 0) this.el.prompt.textContent = 'RESUPPLY INBOUND…';
      else if (!p.vehicle) this.vehiclePrompt();
      if (p.resupplyT <= 0 && p.alive && !p.vehicle && !this.hasAmmo()) this.dryPrompt();
    }

    for (const b of this.bots) b.update(dt);
    this.updateStrikes(dt);
    this.updateVehiclesPassive(dt);
    this.effects.update(dt);
    this.updateHud(dt);
    if (this.frame % 30 === 0) this.updateSector();
    this.checkEnd();
  }

  /* ------------------------- player on foot ------------------------- */
  updateFoot(dt) {
    const p = this.player;
    let mx = 0, mz = 0;
    if (this.controls === 'mobile') {
      mx = this.mobileMove.x; mz = this.mobileMove.y;
    } else {
      if (this.keys.KeyW || this.keys.ArrowUp) mz += 1;
      if (this.keys.KeyS || this.keys.ArrowDown) mz -= 1;
      if (this.keys.KeyA || this.keys.ArrowLeft) mx -= 1;
      if (this.keys.KeyD || this.keys.ArrowRight) mx += 1;
    }
    const sprint = !!(this.keys.ShiftLeft || this.keys.ShiftRight);
    const boost = p.speedBoostT > 0 ? 1.3 : 1;
    const baseSpeed = (this.ads ? 3.3 : sprint ? 8.3 : 5.5) * p.speedMul * boost;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
    const wx = (-sin * mz + cos * mx) * baseSpeed;
    const wz = (-cos * mz - sin * mx) * baseSpeed;

    const nx = p.pos.x + wx * dt;
    if (!this.collides(nx, p.pos.y, p.pos.z, 0.4, 1.7)) p.pos.x = nx; else p.vel.x = 0;
    const nz = p.pos.z + wz * dt;
    if (!this.collides(p.pos.x, p.pos.y, nz, 0.4, 1.7)) p.pos.z = nz; else p.vel.z = 0;
    p.pos.x = clamp(p.pos.x, -113, 113);
    p.pos.z = clamp(p.pos.z, -113, 113);

    p.vel.y -= 24 * dt;
    p.pos.y += p.vel.y * dt;
    if (p.pos.y <= 0) { p.pos.y = 0; p.vel.y = 0; }

    if ((this.firing || this.mobileFire) && p.cooldown <= 0) this.firePlayer();
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) this.finishReload();
    }

    const speed = Math.hypot(wx, wz);
    p.stepAcc += speed * dt;
    if (p.stepAcc > 2.4) { p.stepAcc = 0; if (speed > 1.2 && this.audio) this.audio.step(); }

    const bob = Math.sin(performance.now() * 0.012) * (speed > 1 ? 0.014 : 0.004);
    const shakeX = this.shake ? rand(-this.shake, this.shake) * 0.22 : 0;
    const shakeY = this.shake ? rand(-this.shake, this.shake) * 0.22 : 0;
    this.camera.position.set(p.pos.x + shakeX, p.pos.y + 1.68 + bob + shakeY, p.pos.z);
    this.camera.rotation.set(p.pitch, p.yaw, 0);

    const fov = (this.ads ? this.baseFov / p.slots[p.slot].def.zoom : this.baseFov) + (speed > 6 ? 1.5 : 0);
    this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 9);
    this.camera.updateProjectionMatrix();

    // viewmodel sway / recoil
    const t = performance.now() * 0.002;
    const sway = this.ads ? 0.3 : 1;
    this.viewmodel.position.set(
      Math.sin(t) * 0.006 * sway + (this.ads ? -0.13 : 0),
      Math.cos(t * 1.4) * 0.006 * sway + (this.ads ? -0.03 : 0),
      p.cooldown > 0 ? p.cooldown * 0.35 : 0
    );
    this.vmGuns.forEach((g, i) => { g.visible = i === p.slot && p.alive && !p.vehicle; });

    if (p.lastHitT > 5 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + 9 * dt);
    }
    if (this.el.vignette) this.el.vignette.style.boxShadow = `inset 0 0 160px rgba(142,43,33,${clamp(0.75 - p.hp / p.maxHp, 0, 0.75)})`;
  }

  tryJump() {
    const p = this.player;
    if (!p.alive || p.vehicle) return;
    if (p.pos.y <= 0.01) { p.vel.y = 7.4; }
  }

  hasAmmo() {
    return this.player.slots.some((s) => s.mag + s.reserve > 0);
  }

  dryPrompt() {
    this.el.prompt.innerHTML = 'OUT OF AMMO — <kbd>V</kbd> CALL RESUPPLY';
    this.el.prompt.classList.remove('hidden');
    this.dryT += 1 / 60;
    if (!this.player.dryCalled && this.dryT > 0.6) {
      this.player.dryCalled = true;
      this.callResupply();
    }
  }

  vehiclePrompt() {
    const p = this.player;
    let near = null, nd = 25;
    for (const v of this.vehicles) {
      if (v.hp <= 0 || v.driver) continue;
      const d = v.mesh.position.distanceToSquared(p.pos);
      if (d < nd) { nd = d; near = v; }
    }
    if (near) {
      this.nearVehicle = near;
      this.el.prompt.innerHTML = `<kbd>F</kbd> ENTER ${near.label}`;
      this.el.prompt.classList.remove('hidden');
    } else {
      this.nearVehicle = null;
      if (this.player.resupplyT <= 0) this.el.prompt.classList.add('hidden');
    }
  }

  firePlayer() {
    const p = this.player;
    const w = p.slots[p.slot];
    const def = w.def;
    if (p.reloadT > 0) return;
    if (w.mag <= 0) {
      p.cooldown = 0.35;
      if (this.audio) this.audio.hit();
      if (!this.hasAmmo()) this.dryPrompt();
      return;
    }
    p.cooldown = 60 / def.rpm;
    if (p.noDrainT <= 0) w.mag--;
    p.shots++;

    let spread = def.spread * (this.ads ? 0.32 : 1) * (p.focusT > 0 ? 0 : 1);
    spread += p.heat * 0.006 * (this.ads ? 0.5 : 1);
    const origin = this.camera.position.clone();
    const dir = this.aimDir(spread);
    const hit = this.hitscan(origin, dir, def.range, this.team);

    const muzzle = origin.clone().add(dir.clone().multiplyScalar(0.9)).add(new THREE.Vector3(0.08, -0.06, 0));
    this.effects.flash(muzzle, def.kind === 'launcher' ? 0.9 : 0.4);
    if (this.audio) this.audio.shot(def.kind, 0);
    this.shake = Math.max(this.shake, def.recoil * 0.16);

    if (def.kind === 'launcher') {
      this.effects.tracer(muzzle, hit.point, 0xffc06a);
      this.explode(hit.point, 8, 180 * (p.focusT > 0 ? 1.4 : 1), this.team, 'YOU');
    } else {
      this.effects.tracer(muzzle, hit.point, 0xffe2a8);
      if (hit.type === 'bot') {
        const dmg = def.dmg * (p.focusT > 0 ? 1.4 : 1) * (hit.head ? 2.4 : 1);
        const killed = hit.bot.takeDamage(dmg, 'YOU', this.team, def.name, hit.head);
        p.hits++;
        if (this.audio) this.audio.flesh();
        this.showHit(killed ? '#e8c884' : '#ffffff');
        if (!killed) p.score += hit.head ? 20 : 10;
      } else if (hit.type === 'vehicle') {
        this.damageVehicle(hit.vehicle, def.dmg * 1.6, 'YOU');
        this.showHit('#ffffff');
        this.effects.impact(hit.point, 0xffcf7a, 1.4);
      } else {
        this.effects.impact(hit.point, 0xd8cba8, 0.9);
      }
    }

    p.heat = Math.min(3, p.heat + def.recoil * 0.22);
    p.pitch = clamp(p.pitch + def.recoil * 0.0045 * (this.ads ? 0.6 : 1), -1.48, 1.42);
    p.yaw += rand(-0.0016, 0.0016) * def.recoil;
  }

  hitscan(origin, dir, range, ownerTeam) {
    let bestT = this.rayWall(origin, dir, range);
    let result = { type: 'wall', point: origin.clone().add(dir.clone().multiplyScalar(Math.min(bestT, range))), t: bestT };

    const enemies = this.botsByTeam[ownerTeam === 'ua' ? 'ru' : 'ua'];
    for (const b of enemies) {
      if (!b.alive) continue;
      const chestT = raySphere(origin, dir, b.pos.x, b.pos.y + 1.12, b.pos.z, 0.48);
      const headT = raySphere(origin, dir, b.pos.x, b.pos.y + 1.62, b.pos.z, 0.25);
      let t = -1, head = false;
      if (headT > 0) { t = headT; head = true; }
      if (chestT > 0 && (!head || chestT < headT)) { t = chestT; head = false; }
      if (t > 0 && t < bestT) { bestT = t; result = { type: 'bot', bot: b, head, t, point: origin.clone().add(dir.clone().multiplyScalar(t)) }; }
    }
    for (const v of this.vehicles) {
      if (v.hp <= 0) continue;
      const vt = raySphere(origin, dir, v.mesh.position.x, v.mesh.position.y + 1.1, v.mesh.position.z, v.kind === 'tank' ? 2.5 : 2.0);
      if (vt > 0 && vt < bestT) { bestT = vt; result = { type: 'vehicle', vehicle: v, t: vt, point: origin.clone().add(dir.clone().multiplyScalar(vt)) }; }
    }
    return result;
  }

  showHit(color) {
    if (!this.el.hitmarker) return;
    this.el.hitmarker.style.color = color;
    this.el.hitmarker.classList.remove('show');
    void this.el.hitmarker.offsetWidth;
    this.el.hitmarker.classList.add('show');
    if (this.audio) this.audio.hit();
  }

  reload() {
    const p = this.player;
    if (!p.alive || p.vehicle) return;
    const w = p.slots[p.slot];
    if (p.reloadT > 0 || w.mag >= w.def.magSize || w.reserve <= 0) return;
    p.reloadT = w.def.kind === 'lmg' ? 3.1 : w.def.kind === 'launcher' ? 3.4 : 2.2;
    if (this.audio) this.audio.reload();
  }

  finishReload() {
    const p = this.player;
    const w = p.slots[p.slot];
    const need = w.def.magSize - w.mag;
    const take = Math.min(need, w.reserve);
    w.mag += take;
    w.reserve -= take;
    if (w.mag <= 0) this.callResupply();
  }

  swapWeapon(i) {
    const p = this.player;
    if (!p.alive || p.vehicle || i === p.slot) return;
    p.slot = i;
    p.reloadT = 0;
    p.cooldown = 0.25;
    if (this.audio) this.audio.reload();
  }

  callResupply() {
    const p = this.player;
    if (!p.alive || p.resupplyT > 0) return;
    const keys = ['no_ammo', 'unarmed_cover', 'running_dry', 'toss_rifle', 'dry_need_weapon'];
    const k = pick(keys);
    if (this.audio) {
      this.audio.speak(k, { onSub: (meta) => { this.subtitle(meta.sub, 'YOU'); this.radio('ALPHA-1', meta.label); } });
    }
    p.resupplyT = 3.2;
    p.dryCalled = true;
    this.dryT = 0;
    setTimeout(() => {
      if (!this.active) return;
      for (const s of p.slots) { s.mag = s.def.magSize; s.reserve = s.def.reserveSize; }
      p.dryCalled = false;
      this.subtitle('Resupply complete. Weapon back in the fight.', 'QUARTERMASTER');
    }, 3200);
  }

  damagePlayer(dmg, fromPos) {
    const p = this.player;
    if (!p.alive || this.finished) return;
    p.hp -= dmg;
    p.lastHitT = 0;
    this.shake = Math.max(this.shake, 0.5);
    if (this.audio && Math.random() < 0.4) this.audio.whiz();
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      p.deaths++;
      p.respawnT = 6;
      this.tickets[this.team] = Math.max(0, this.tickets[this.team] - 1);
      this.addKill('HOSTILE', this.enemyTeam, 'YOU', this.team, 'SMALL ARMS', false);
      this.subtitle('You are down. Regrouping at the rally point.', 'COMMAND');
      if (p.vehicle) this.exitVehicle(true);
      this.checkEnd();
    }
  }

  /* ------------------------- vehicles ------------------------- */
  toggleVehicle() {
    const p = this.player;
    if (!p.alive) return;
    if (p.vehicle) { this.exitVehicle(); return; }
    if (this.nearVehicle) this.enterVehicle(this.nearVehicle);
  }

  enterVehicle(v) {
    const p = this.player;
    if (v.hp <= 0 || v.driver) return;
    v.driver = p;
    p.vehicle = v;
    p.pos.copy(v.mesh.position);
    this.viewmodel.visible = false;
    this.el.prompt.classList.add('hidden');
    this.el.vehicleHud.classList.remove('hidden');
    this.el.vhName.textContent = v.label;
    this.el.vhHint.textContent = v.kind === 'tank'
      ? 'LMB MG · SPACE MAIN GUN · F EXIT'
      : 'LMB FIRE · F EXIT';
    if (this.audio) this.engineSound = this.audio.engineStart();
    this.subtitle(v.label + ' — driver seat.', 'VEHICLE');
  }

  exitVehicle(forced = false) {
    const p = this.player;
    const v = p.vehicle;
    if (!v) return;
    v.driver = null;
    v.speed = 0;
    p.vehicle = null;
    const side = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    p.pos.copy(v.mesh.position).addScaledVector(side, v.kind === 'tank' ? 3.2 : 2.2);
    p.pos.y = 0;
    this.camera.position.set(p.pos.x, 1.68, p.pos.z);
    this.viewmodel.visible = true;
    this.el.vehicleHud.classList.add('hidden');
    if (this.engineSound) { this.engineSound.stop(); this.engineSound = null; }
    if (!forced) this.subtitle('Out of the vehicle.', 'YOU');
  }

  updateDriving(dt) {
    const p = this.player;
    const v = p.vehicle;
    if (!v) return;
    let throttle = 0, steer = 0;
    if (this.controls === 'mobile') {
      throttle = this.mobileMove.y; steer = this.mobileMove.x;
    } else {
      if (this.keys.KeyW || this.keys.ArrowUp) throttle += 1;
      if (this.keys.KeyS || this.keys.ArrowDown) throttle -= 1;
      if (this.keys.KeyA || this.keys.ArrowLeft) steer -= 1;
      if (this.keys.KeyD || this.keys.ArrowRight) steer += 1;
    }
    const max = v.mesh.userData.maxSpeed;
    const target = throttle > 0 ? max : throttle < 0 ? -max * 0.4 : 0;
    v.speed += clamp(target - v.speed, -14 * dt, 10 * dt);
    if (Math.abs(v.speed) < 0.06 && throttle === 0) v.speed = 0;
    const turnRate = v.kind === 'atv' ? 1.85 : v.kind === 'tank' ? 0.72 : 1.05;
    v.yaw += steer * turnRate * dt * clamp(Math.abs(v.speed) / 5, 0, 1) * (v.speed < 0 ? -1 : 1);
    const fx = -Math.sin(v.yaw), fz = -Math.cos(v.yaw);
    const nx = v.mesh.position.x + fx * v.speed * dt;
    const nz = v.mesh.position.z + fz * v.speed * dt;
    const rad = v.kind === 'atv' ? 1.1 : v.kind === 'tank' ? 1.9 : 1.5;
    if (!this.collides(nx, 0.6, nz, rad, 1.3) && Math.abs(nx) < 112 && Math.abs(nz) < 112) {
      v.mesh.position.x = nx;
      v.mesh.position.z = nz;
    } else {
      v.speed *= -0.22;
      this.shake = Math.max(this.shake, 0.35);
    }
    v.mesh.rotation.y = v.yaw;
    p.pos.copy(v.mesh.position);

    const turret = v.mesh.userData.turret;
    if (turret) {
      turret.rotation.order = 'YXZ';
      turret.rotation.y = p.yaw - v.yaw;
      if (v.kind === 'atv' || v.kind === 'transport') turret.rotation.x = clamp(p.pitch, -0.3, 0.5);
    }
    if (v.kind === 'tank' && v.mesh.userData.barrel) {
      v.mesh.userData.barrel.rotation.x = clamp(p.pitch, -0.1, 0.24);
    }

    const seat = v.kind === 'tank' ? 2.85 : v.kind === 'atv' ? 1.5 : 2.25;
    this.camera.position.set(v.mesh.position.x, seat, v.mesh.position.z);
    this.camera.rotation.set(p.pitch * 0.55, p.yaw, 0);
    this.camera.fov += (this.baseFov - this.camera.fov) * Math.min(1, dt * 6);
    this.camera.updateProjectionMatrix();

    v.mainCd = Math.max(0, (v.mainCd || 0) - dt);
    v.mgCd = Math.max(0, (v.mgCd || 0) - dt);
    const fireHeld = this.firing || this.mobileFire;
    if (v.kind === 'tank') {
      if (fireHeld && v.mgCd <= 0) this.fireVehicle('mg');
      if ((this.keys.Space || this.mobileFire) && v.mainCd <= 0) this.fireVehicle('cannon');
    } else if (fireHeld && v.mgCd <= 0) {
      this.fireVehicle('mg');
    }
    if (this.engineSound) this.engineSound.set(v.speed, Math.abs(throttle) > 0.1);

    this.el.vhSpeed.textContent = Math.round(Math.abs(v.speed) * 3.6);
    this.el.vhName.textContent = v.label;
    this.el.vehicleHud.classList.remove('hidden');
  }

  fireVehicle(kind) {
    const v = this.player.vehicle;
    if (!v || v.hp <= 0) return;
    const isCannon = kind === 'cannon';
    const origin = this.camera.position.clone();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const range = isCannon ? 400 : 220;
    const team = v.team === 'neutral' ? this.team : v.team;
    const hit = this.hitscan(origin, dir, range, team);
    const muzzleHolder = isCannon ? v.mesh.userData.muzzle : (v.mesh.userData.mg && v.mesh.userData.mg.group);
    const muzzle = new THREE.Vector3();
    if (muzzleHolder) muzzleHolder.getWorldPosition(muzzle); else muzzle.copy(origin).add(dir.clone().multiplyScalar(2));
    this.effects.flash(muzzle, isCannon ? 2.2 : 0.5);
    this.effects.tracer(muzzle, hit.point, isCannon ? 0xffb057 : 0xffe2a8);
    if (this.audio) this.audio.shot(isCannon ? 'sniper' : 'lmg', 0);
    this.shake = Math.max(this.shake, isCannon ? 1.2 : 0.22);
    if (isCannon) {
      v.mainCd = 4.6;
      this.explode(hit.point, 9.5, 240, team, 'YOU');
    } else {
      v.mgCd = 0.1;
      if (hit.type === 'bot') {
        hit.bot.takeDamage(26, 'YOU', team, 'MG', false);
        this.showHit('#ffffff');
      } else if (hit.type === 'vehicle') {
        this.damageVehicle(hit.vehicle, 18, 'YOU');
      } else {
        this.effects.impact(hit.point, 0xd8cba8, 0.8);
      }
    }
  }

  damageVehicle(v, dmg, killerName) {
    if (v.hp <= 0) return;
    v.hp -= dmg;
    this.effects.impact(new THREE.Vector3(v.mesh.position.x, v.mesh.position.y + 1.1, v.mesh.position.z), 0xffcf7a, 1.2);
    if (v.hp <= 0) {
      v.hp = 0;
      v.respawnT = 30;
      const pos = new THREE.Vector3(v.mesh.position.x, 1.2, v.mesh.position.z);
      this.effects.explosion(pos, 12);
      if (this.audio) this.audio.explosion(this.player.pos.distanceTo(pos));
      this.shake = Math.max(this.shake, 1.4);
      v.mesh.visible = false;
      if (v.driver === this.player) this.exitVehicle(true);
      v.driver = null;
      this.addKill(killerName, killerName === 'YOU' ? this.team : this.enemyTeam, v.label, v.team, 'ANTI-ARMOUR', false);
      if (killerName === 'YOU') {
        this.player.vehKills++;
        this.player.score += 250;
        this.subtitle(v.label + ' destroyed. +250', 'COMMAND');
      }
    }
  }

  respawnVehicle(v) {
    const s = this.world.vehicleSpawns[v.id];
    v.mesh.position.copy(s.pos);
    v.yaw = s.rot;
    v.mesh.rotation.y = s.rot;
    v.hp = v.maxHp;
    v.speed = 0;
    v.driver = null;
    v.mesh.visible = true;
    v.respawnT = 0;
  }

  updateVehiclesPassive(dt) {
    for (const v of this.vehicles) {
      if (v.hp <= 0) {
        v.respawnT -= dt;
        if (v.respawnT <= 0) this.respawnVehicle(v);
        continue;
      }
      if (v.driver) continue;
      v.speed *= Math.max(0, 1 - dt * 2.2);
      if (Math.abs(v.speed) < 0.05) v.speed = 0;
      v.mainCd = Math.max(0, (v.mainCd || 0) - dt);
      v.mgCd = Math.max(0, (v.mgCd || 0) - dt);
    }
  }

  explode(pos, radius, dmg, ownerTeam, killerName) {
    this.effects.explosion(pos, radius);
    const d = this.player.pos.distanceTo(pos);
    if (this.audio) this.audio.explosion(d);
    this.shake = Math.max(this.shake, clamp(1.6 - d / 30, 0, 1.6));
    for (const b of this.bots) {
      if (!b.alive) continue;
      const bd = b.pos.distanceTo(pos);
      if (bd < radius) b.takeDamage(dmg * (1 - bd / radius), killerName, ownerTeam, 'EXPLOSION', false);
    }
    for (const v of this.vehicles) {
      if (v.hp <= 0) continue;
      const vd = v.mesh.position.distanceTo(pos);
      if (vd < radius + 2) this.damageVehicle(v, dmg * (1 - vd / (radius + 2)) * 0.8, killerName);
    }
    const pd = this.player.pos.distanceTo(pos);
    if (pd < radius && this.player.alive) this.damagePlayer(dmg * (1 - pd / radius) * 0.45, pos);
  }

  useAbility() {
    const p = this.player;
    if (!p.alive || p.abilityCd > 0 || this.finished) return;
    const ab = this.op.ability;
    p.abilityCd = ab.cd;
    this.radio('COMMAND', ab.name);
    switch (this.op.id) {
      case 'rifleman':
        p.hp = Math.min(p.maxHp, p.hp + 35);
        p.speedBoostT = 6;
        this.subtitle('Stims in. Move fast, hit hard.', 'YOU');
        break;
      case 'gunner':
        p.noDrainT = 10;
        this.subtitle('Belt overcharge — ten seconds of free fire.', 'YOU');
        break;
      case 'marksman':
        p.focusT = 7;
        this.subtitle('Breathing out. Focus locked.', 'YOU');
        break;
      case 'drone':
        this.droneT = 15;
        this.subtitle('Drone overhead — all hostiles marked.', 'DRONE');
        if (this.audio) this.audio.ui();
        break;
      case 'driver': {
        p.hp = Math.min(p.maxHp, p.hp + 25);
        let veh = p.vehicle;
        if (!veh) {
          let nd = 100;
          for (const v of this.vehicles) { if (v.hp <= 0) continue; const dd = v.mesh.position.distanceToSquared(p.pos); if (dd < nd) { nd = dd; veh = v; } }
        }
        if (veh) {
          veh.hp = Math.min(veh.maxHp, veh.hp + veh.maxHp * 0.7);
          this.subtitle('Tracks patched. Hull at ' + Math.round((veh.hp / veh.maxHp) * 100) + '%.', 'YOU');
        } else this.subtitle('No vehicle in reach — patched myself up.', 'YOU');
        break;
      }
      case 'commander': {
        const origin = this.camera.position.clone();
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const hit = this.hitscan(origin, dir, 160, this.team);
        const target = hit.point.clone();
        for (let i = 0; i < 6; i++) {
          this.strikes.push({ pos: new THREE.Vector3(target.x + rand(-11, 11), 0, target.z + rand(-11, 11)), t: 0.8 + i * 0.4 });
        }
        this.subtitle('Barrage inbound. Danger close.', 'COMMAND');
        if (this.audio) this.audio.speak('armor_inbound', { onSub: (meta) => this.subtitle(meta.sub, 'COMMAND') });
        break;
      }
    }
  }

  updateStrikes(dt) {
    if (!this.strikes || !this.strikes.length) return;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t -= dt;
      if (s.t <= 0) {
        this.explode(new THREE.Vector3(s.pos.x, 0.6, s.pos.z), 10, 220, this.team, 'YOU');
        this.strikes.splice(i, 1);
      }
    }
  }

  /* ------------------------- events ------------------------- */
  onBotKilled(bot, killerName, killerTeam, weaponLabel, headshot) {
    this.tickets[bot.team] = Math.max(0, this.tickets[bot.team] - 1);
    this.addKill(killerName, killerTeam, bot.name, bot.team, weaponLabel, headshot);
    if (killerName === 'YOU') {
      this.player.kills++;
      this.player.score += headshot ? 150 : 100;
      this.showHit('#e8c884');
    }
    this.checkEnd();
  }

  onBotUnarmed(bot) {
    if (this.voiceCooldown > 0) return;
    this.voiceCooldown = 7;
    const k = pick(['no_ammo', 'unarmed_cover', 'running_dry', 'toss_rifle', 'dry_need_weapon']);
    if (this.audio) {
      this.audio.speak(k, { onSub: (meta) => { this.subtitle(meta.sub, bot.name); this.radio(bot.name, meta.label); } });
    } else {
      this.subtitle("I'm out of ammo! Somebody get me a weapon!", bot.name);
    }
  }

  addKill(killerName, killerTeam, victimName, victimTeam, weaponLabel, headshot) {
    const d = document.createElement('div');
    d.className = 'kf ' + (killerTeam === 'ua' ? 'ua' : 'ru');
    d.innerHTML = '<b class="' + (killerTeam === 'ua' ? 'ua-t' : 'ru-t') + '">' + killerName + '</b>' +
      '<span class="wpn">' + weaponLabel + (headshot ? ' ◉ HEAD' : '') + '</span>' +
      '<b class="' + (victimTeam === 'ua' ? 'ua-t' : 'ru-t') + '">' + victimName + '</b>';
    this.el.killfeed.appendChild(d);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.removeChild(this.el.killfeed.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 7000);
  }

  radio(who, text) {
    const d = document.createElement('div');
    d.className = 'radio';
    const b = document.createElement('b'); b.textContent = who;
    d.appendChild(b);
    d.appendChild(document.createTextNode(' ' + text));
    this.el.radio.appendChild(d);
    while (this.el.radio.children.length > 4) this.el.radio.removeChild(this.el.radio.firstChild);
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 9000);
  }

  subtitle(text, who = '') {
    const el = this.el.subtitles;
    el.innerHTML = '';
    if (who) { const w = document.createElement('span'); w.className = 'who'; w.textContent = who; el.appendChild(w); }
    el.appendChild(document.createTextNode(text));
    el.classList.add('show');
    this.subT = 4.5;
  }

  /* ------------------------- HUD ------------------------- */
  startHud() {
    this.el.scoreUa.textContent = this.tickets.ua;
    this.el.scoreRu.textContent = this.tickets.ru;
    this.el.time.textContent = fmtTime(this.timeLeft);
    this.el.opName.textContent = this.op.name;
    this.el.teamName.textContent = this.teamLabel;
    this.el.abilName.textContent = this.op.ability.name;
    this.el.abilKey.textContent = 'Q';
    this.el.objective.textContent = 'ADVANCE TO THE CITY CENTRE · CAPTURE THE SECTOR';
    this.el.hud.classList.remove('hidden');
    this.strikes = [];
    this.radio('COMMAND', this.teamLabel + ' deployed — 30 versus 30.');
    this.subtitle('Thirty versus thirty. Take the city centre. No reinforcements beyond the rally point.', 'COMMAND');
    if (this.audio) { this.audio.startMusic(); this.audio.startAmbience(); }
    this.timers = [];
    this.timers.push(setTimeout(() => {
      if (!this.active) return;
      if (this.audio) this.audio.speak('announcer_match', { onSub: (meta) => { this.subtitle(meta.sub, 'COMMAND'); this.radio('COMMAND', 'MATCH START'); } });
    }, 1200));
    this.timers.push(setTimeout(() => {
      if (!this.active) return;
      if (this.audio) this.audio.speak('armor_inbound', { onSub: (meta) => { this.subtitle(meta.sub, 'COMMAND'); this.radio('COMMAND', 'ARMOUR'); } });
    }, 70000));
  }

  updateHud(dt) {
    const p = this.player;
    const el = this.el;
    el.scoreUa.textContent = this.tickets.ua;
    el.scoreRu.textContent = this.tickets.ru;
    el.time.textContent = fmtTime(this.timeLeft);
    const hpPct = clamp(p.hp / p.maxHp, 0, 1);
    el.hpFill.style.width = (hpPct * 100).toFixed(1) + '%';
    el.hpText.textContent = Math.ceil(p.hp);
    if (el.hpBar) el.hpBar.classList.toggle('low', hpPct < 0.34);
    const w = p.slots[p.slot];
    el.mag.textContent = p.reloadT > 0 ? '--' : w.mag;
    el.reserve.textContent = w.reserve;
    el.mag.classList.toggle('empty', w.mag <= 0);
    el.weaponName.textContent = w.def.name;
    el.fireMode.textContent = w.def.auto ? 'AUTO' : 'SEMI';
    el.reloadHint.textContent = p.reloadT > 0 ? 'RELOADING' : 'R RELOAD';
    const cdMax = this.op.ability.cd;
    el.abilFill.style.transform = 'scaleX(' + clamp(1 - p.abilityCd / cdMax, 0, 1) + ')';
    el.abilName.textContent = p.abilityCd > 0 ? this.op.ability.name + ' ' + Math.ceil(p.abilityCd) + 's' : this.op.ability.name;
    const moving = this.controls === 'pc'
      ? (this.keys.KeyW || this.keys.KeyS || this.keys.KeyA || this.keys.KeyD)
      : (Math.abs(this.mobileMove.x) + Math.abs(this.mobileMove.y) > 0.2);
    el.crosshair.classList.toggle('wide', !!moving || p.heat > 0.9 || this.ads);
    el.crosshair.style.opacity = this.ads && w.def.attached.optic === 'scope' ? '0.15' : '1';
    if (this.frame % 8 === 0) this.drawMinimap();
  }

  updateSector() {
    let own = 0, foe = 0;
    for (const b of this.bots) {
      if (!b.alive) continue;
      if (Math.hypot(b.pos.x, b.pos.z) < 28) { if (b.team === this.team) own++; else foe++; }
    }
    if (this.player.alive && Math.hypot(this.player.pos.x, this.player.pos.z) < 28) own++;
    const total = own + foe;
    this.sectorFill = total === 0 ? 0 : own / total;
    if (this.el.sector) this.el.sector.style.width = (this.sectorFill * 100).toFixed(0) + '%';
    const d = Math.hypot(this.player.pos.x, this.player.pos.z);
    this.el.objective.textContent = d < 30
      ? 'SECTOR CONTESTED · HOLD THE PLAZA'
      : 'ADVANCE TO THE CITY CENTRE · ' + Math.round(d) + 'M';
  }

  drawMinimap() {
    const c = this.el.minimap;
    if (!c) return;
    const ctx = c.getContext('2d');
    const S = 220, half = S / 2, scale = S / 240;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#0b0c09';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#191a15';
    for (const z of [-46, 0, 46]) ctx.fillRect(0, half + (z - 7.5) * scale, S, 15 * scale);
    for (const x of [-46, 0, 46]) ctx.fillRect(half + (x - 7.5) * scale, 0, 15 * scale, S);
    ctx.fillStyle = '#2b2c25';
    ctx.globalAlpha = 0.55;
    for (const b of this.world.colliders) {
      if (b.maxY - b.minY < 4) continue;
      ctx.fillRect(half + b.minX * scale, half + b.minZ * scale, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#c8a45a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(half, half, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,164,90,.16)';
    ctx.fill();
    for (const v of this.vehicles) {
      if (v.hp <= 0) continue;
      ctx.fillStyle = v.team === this.team ? 'rgba(110,170,240,.8)' : v.team === 'neutral' ? '#9a9484' : 'rgba(220,110,90,.8)';
      ctx.fillRect(half + v.mesh.position.x * scale - 2, half + v.mesh.position.z * scale - 2, 4, 4);
    }
    for (const b of this.bots) {
      if (!b.alive) continue;
      const enemy = b.team !== this.team;
      if (enemy && this.droneT <= 0 && b.pos.distanceToSquared(this.player.pos) > 55 * 55) continue;
      ctx.fillStyle = enemy ? '#e0644c' : '#6ea8ef';
      ctx.beginPath();
      ctx.arc(half + b.pos.x * scale, half + b.pos.z * scale, enemy ? 1.7 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = this.player;
    ctx.save();
    ctx.translate(half + p.pos.x * scale, half + p.pos.z * scale);
    ctx.rotate(-p.yaw);
    ctx.fillStyle = '#f4efdf';
    ctx.beginPath();
    ctx.moveTo(0, -5); ctx.lineTo(3.6, 4); ctx.lineTo(0, 2); ctx.lineTo(-3.6, 4);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(232,226,209,.18)';
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  }

  /* ------------------------- match flow ------------------------- */
  checkEnd() {
    if (this.finished) return;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finish(this.tickets[this.team] >= this.tickets[this.enemyTeam]);
    } else if (this.tickets[this.team] <= 0 || this.tickets[this.enemyTeam] <= 0) {
      this.finish(this.tickets[this.team] > this.tickets[this.enemyTeam]);
    }
  }

  finish(win) {
    if (this.finished) return;
    this.finished = true;
    this.active = false;
    this.firing = false;
    if (this.engineSound) { this.engineSound.stop(); this.engineSound = null; }
    if (document.pointerLockElement) document.exitPointerLock();
    if (this.timers) this.timers.forEach((t) => clearTimeout(t));
    if (this.audio) { this.audio.stopMusic(); this.audio.stopAmbience(); }
    const p = this.player;
    this.onEnd({
      win,
      kills: p.kills,
      deaths: p.deaths,
      vehKills: p.vehKills,
      score: p.score + p.kills * 100,
      accuracy: p.shots ? Math.round((p.hits / p.shots) * 100) : 0,
      tickets: Object.assign({}, this.tickets),
      team: this.team
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.active = false;
    this.finished = true;
    if (this.engineSound) { this.engineSound.stop(); this.engineSound = null; }
    if (this.audio) { this.audio.stopMusic(); this.audio.stopAmbience(); }
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    window.removeEventListener('mousedown', this._md);
    window.removeEventListener('mouseup', this._mu);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('resize', this._resize);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this._click);
    canvas.removeEventListener('contextmenu', this._ctx);
    document.removeEventListener('pointerlockchange', this._plc);
    if (this._mh) for (const [el, d, u] of this._mh) { el.removeEventListener('pointerdown', d); el.removeEventListener('pointerup', u); el.removeEventListener('pointercancel', u); el.removeEventListener('pointerleave', u); }
    const stick = $('stick-zone'), look = $('look-zone');
    if (this._msd) {
      stick.removeEventListener('pointerdown', this._msd);
      stick.removeEventListener('pointermove', this._msm);
      stick.removeEventListener('pointerup', this._msu);
      stick.removeEventListener('pointercancel', this._msu);
      look.removeEventListener('pointerdown', this._msdown);
      look.removeEventListener('pointermove', this._msmove);
      look.removeEventListener('pointerup', this._msup);
      look.removeEventListener('pointercancel', this._msup);
    }
    if (this.timers) this.timers.forEach((t) => clearTimeout(t));
    if (document.pointerLockElement) document.exitPointerLock();
    this.el.mobile.classList.add('hidden');
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        else { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
      }
    });
  }
}

/* ============================ ray helpers ============================ */
function raySphere(o, d, cx, cy, cz, r) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const c = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - c;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : -1;
}

function rayAABB(o, d, c, maxT) {
  let tmin = 0, tmax = maxT;
  const lo = [c.minX, c.minY, c.minZ], hi = [c.maxX, c.maxY, c.maxZ];
  const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-8) {
      if (oo[i] < lo[i] || oo[i] > hi[i]) return -1;
    } else {
      let t1 = (lo[i] - oo[i]) / dd[i], t2 = (hi[i] - oo[i]) / dd[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
  }
  return tmin;
}
