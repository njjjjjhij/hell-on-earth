/* ============================================================
   HELL ON EARTH — world: destroyed city sector 7
   ============================================================ */
import * as THREE from 'three';
import { buildCar, buildVehicle, PALETTE, mat, box, cyl } from './models.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#3b3a32';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const g = 40 + Math.random() * 60;
    x.fillStyle = `rgba(${g},${g - 2},${g - 8},${Math.random() * 0.5})`;
    x.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 4 + 1, Math.random() * 4 + 1);
  }
  // cracks
  x.strokeStyle = 'rgba(20,20,16,.55)';
  for (let i = 0; i < 26; i++) {
    x.beginPath();
    let px = Math.random() * 512, py = Math.random() * 512;
    x.moveTo(px, py);
    for (let s = 0; s < 9; s++) { px += rnd(-34, 34); py += rnd(-34, 34); x.lineTo(px, py); }
    x.lineWidth = Math.random() * 1.6 + 0.3;
    x.stroke();
  }
  // scorch
  for (let i = 0; i < 24; i++) {
    const r = rnd(12, 48);
    const g = x.createRadialGradient(Math.random() * 512, Math.random() * 512, 0, Math.random() * 512, Math.random() * 512, r);
    g.addColorStop(0, 'rgba(14,13,11,.5)');
    g.addColorStop(1, 'rgba(14,13,11,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(26, 26);
  t.anisotropy = 4;
  return t;
}

function windowTexture(base = '#4d4b41', lit = true) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 200; i++) {
    x.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
    x.fillRect(Math.random() * 128, Math.random() * 256, 8, 8);
  }
  for (let ry = 0; ry < 7; ry++) {
    for (let rx = 0; rx < 3; rx++) {
      const broken = Math.random() < 0.32;
      x.fillStyle = broken ? '#111210' : (Math.random() < 0.08 && lit ? '#7c6231' : '#23262a');
      x.fillRect(12 + rx * 38, 16 + ry * 34, 26, 22);
      if (!broken && Math.random() < 0.25) {
        x.fillStyle = 'rgba(140,150,150,.18)';
        x.fillRect(13 + rx * 38, 17 + ry * 34, 11, 9);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function buildWorld(scene, quality = 'med') {
  const group = new THREE.Group();
  scene.add(group);
  const colliders = [];
  const coverPoints = [];
  const debrisCount = quality === 'low' ? 90 : quality === 'high' ? 260 : 170;

  const addCollider = (x, y, z, w, h, d) => {
    colliders.push({
      minX: x - w / 2, maxX: x + w / 2,
      minY: y, maxY: y + h,
      minZ: z - d / 2, maxZ: z + d / 2
    });
  };

  /* ---------------- ground ---------------- */
  const gTex = groundTexture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280, 1, 1),
    new THREE.MeshLambertMaterial({ map: gTex, color: 0x8b8778 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // road strips
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x35352e });
  for (const z of [-46, 0, 46]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(280, 15), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.02, z); r.receiveShadow = true; group.add(r);
  }
  for (const x of [-46, 0, 46]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(15, 280), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.021, 0); r.receiveShadow = true; group.add(r);
  }
  // road markings
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x8c8467, transparent: true, opacity: 0.35 });
  for (const z of [-46, 0, 46]) for (let i = -120; i < 120; i += 8) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.3), lineMat);
    l.rotation.x = -Math.PI / 2; l.position.set(i, 0.03, z); group.add(l);
  }

  /* ---------------- buildings ---------------- */
  const winTexA = windowTexture('#4b4840');
  const winTexB = windowTexture('#5a4b3e');
  const winTexC = windowTexture('#42423a');
  const blocks = [-92, -46, 0, 46, 92];

  const addBuilding = (cx, cz, w, d, h, style) => {
    // Keep the two main boulevards clear so the city is always traversable.
    if (Math.abs(cx) - w / 2 < 9 || Math.abs(cz) - d / 2 < 9) return;
    const tex = style === 0 ? winTexA : style === 1 ? winTexB : winTexC;
    const map = tex.clone();
    map.needsUpdate = true;
    map.repeat.set(Math.max(1, Math.round(w / 12)), Math.max(1, Math.round(h / 14)));
    const m = new THREE.MeshLambertMaterial({ map, color: style === 1 ? 0x9a8b76 : 0x9c9a8c });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(cx, h / 2, cz);
    b.castShadow = true; b.receiveShadow = true;
    group.add(b);
    addCollider(cx, 0, cz, w, h, d);

    // broken crown
    const crown = new THREE.Group();
    const chunks = 2 + ((Math.random() * 4) | 0);
    for (let i = 0; i < chunks; i++) {
      const cw = rnd(w * 0.15, w * 0.4), ch = rnd(1, 4.2), cd = rnd(d * 0.15, d * 0.45);
      box(crown, 0x6b675c, cw, ch, cd, rnd(-w / 2 + cw / 2, w / 2 - cw / 2), h + ch / 2, rnd(-d / 2 + cd / 2, d / 2 - cd / 2));
    }
    crown.position.set(cx, 0, cz); group.add(crown);
    // ground floor awning / storefront
    box(group, 0x2f3029, w * 0.8, 0.3, 0.5, cx, 3.2, cz + d / 2 + 0.25);
  };

  // perimeter of city blocks
  for (let ix = 0; ix < blocks.length; ix++) {
    for (let iz = 0; iz < blocks.length; iz++) {
      const cx = blocks[ix], cz = blocks[iz];
      if (cx === 0 && cz === 0) continue; // central plaza
      if (Math.abs(cx) > 92 || Math.abs(cz) > 92) { if (Math.random() < 0.45) continue; }
      const count = Math.random() < 0.55 ? 2 : 1;
      if (count === 2) {
        const w1 = rnd(11, 16), w2 = rnd(11, 15);
        const h1 = rnd(7, 26), h2 = rnd(6, 20);
        const d1 = rnd(13, 19), d2 = rnd(12, 18);
        addBuilding(cx - 11, cz - rnd(-5, 5), w1, d1, h1, (Math.random() * 3) | 0);
        addBuilding(cx + 11, cz + rnd(-5, 5), w2, d2, h2, (Math.random() * 3) | 0);
      } else {
        addBuilding(cx + rnd(-3, 3), cz + rnd(-3, 3), rnd(17, 24), rnd(16, 22), rnd(8, 30), (Math.random() * 3) | 0);
      }
      // rubble piles in the block
      for (let k = 0; k < 3; k++) {
        const rx = cx + rnd(-14, 14), rz = cz + rnd(-14, 14);
        const rw = rnd(2, 5), rh = rnd(0.6, 1.8), rd = rnd(2, 5);
        const rm = new THREE.Mesh(new THREE.BoxGeometry(rw, rh, rd), mat(pick([0x5c584c, 0x4a463c, 0x6a6558])));
        rm.position.set(rx, rh / 2, rz);
        rm.rotation.set(rnd(-0.15, 0.15), rnd(0, 3.14), rnd(-0.12, 0.12));
        rm.castShadow = true; rm.receiveShadow = true;
        group.add(rm);
        addCollider(rx, 0, rz, rw * 0.9, rh, rd * 0.9);
      }
    }
  }

  /* ---------------- central plaza / objective ---------------- */
  const plaza = new THREE.Group(); group.add(plaza);
  const rubbleRing = new THREE.Mesh(new THREE.TorusGeometry(9, 0.45, 6, 26), mat(0x4a463c));
  rubbleRing.rotation.x = -Math.PI / 2; rubbleRing.position.y = 0.12; plaza.add(rubbleRing);
  cyl(plaza, 0x55503f, 1.4, 1.9, 0.5, 0, 0.25, 0);
  // flag pole (capture point)
  cyl(group, 0x84807a, 0.09, 0.09, 9, 0, 4.5, 0);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.7), new THREE.MeshLambertMaterial({ color: 0xc8a45a, side: THREE.DoubleSide }));
  flag.position.set(1.5, 8, 0); group.add(flag);
  // sandbag ring
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const x = Math.cos(a) * 13, z = Math.sin(a) * 13;
    if (i % 4 === 0) continue;
    const sb = box(group, 0x7a7358, 1.5, 0.55, 0.8, x, 0.3, z, [0, -a, 0]);
    addCollider(x, 0, z, 1.5, 0.65, 1.0);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4;
    box(group, 0x3b3f2e, 2.6, 0.7, 1.1, Math.cos(a) * 7, 0.35, Math.sin(a) * 7, [0, -a, 0]);
    addCollider(Math.cos(a) * 7, 0, Math.sin(a) * 7, 2.6, 0.8, 1.3);
  }

  /* ---------------- cover / props ---------------- */
  const propKinds = quality === 'low' ? 26 : 46;
  for (let i = 0; i < propKinds; i++) {
    const x = rnd(-105, 105), z = rnd(-105, 105);
    if (Math.hypot(x, z) < 16) continue;
    const roll = Math.random();
    if (roll < 0.36) {
      // concrete barrier
      const bw = rnd(2.2, 3.6);
      const b = box(group, 0x817d6d, bw, 0.95, 0.7, x, 0.48, z, [0, rnd(0, 3.14), 0]);
      addCollider(x, 0, z, bw, 1.0, 0.9);
      coverPoints.push({ x, z });
    } else if (roll < 0.62) {
      // burnt car
      const car = buildCar(pick([0x6a2f26, 0x394451, 0x4c4a3a, 0x2f3230]));
      car.position.set(x, 0, z); car.rotation.y = rnd(0, 3.14); group.add(car);
      addCollider(x, 0, z, 2.1, 1.4, 4.3);
      coverPoints.push({ x, z });
    } else if (roll < 0.82) {
      // shipping container
      const cw = rnd(2.4, 3), cl = rnd(5, 8);
      const c = box(group, pick([0x5a4a3a, 0x3f5138, 0x455a5e]), cw, 2.4, cl, x, 1.2, z, [0, rnd(0, 3.14), 0]);
      addCollider(x, 0, z, cw + 0.6, 2.5, cl);
    } else {
      // wall segment
      const w = rnd(4, 9), h = rnd(1.6, 3.4);
      box(group, 0x6d685c, w, h, 0.55, x, h / 2, z, [0, rnd(0, 3.14), 0]);
      addCollider(x, 0, z, w, h, 1.2);
      coverPoints.push({ x, z });
    }
  }

  /* ---------------- burning barrels + smoke ---------------- */
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff8b32, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const fires = [];
  const barrelSpots = quality === 'low' ? 5 : 9;
  for (let i = 0; i < barrelSpots; i++) {
    let x = 0, z = 0, tries = 0;
    do { x = rnd(-100, 100); z = rnd(-100, 100); tries++; } while (Math.hypot(x, z) < 14 && tries < 20);
    cyl(group, 0x3a3630, 0.38, 0.4, 0.95, x, 0.48, z);
    addCollider(x, 0, z, 0.9, 0.95, 0.9);
    const light = new THREE.PointLight(0xff7a2a, 5, 22, 2);
    light.position.set(x, 1.6, z); group.add(light);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.3, 6), fireMat.clone());
    flame.position.set(x, 1.4, z); group.add(flame);
    fires.push({ flame, light, seed: Math.random() * 10 });
  }

  /* ---------------- debris field ---------------- */
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const debrisMesh = new THREE.InstancedMesh(debrisGeo, mat(0x494538), debrisCount);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  for (let i = 0; i < debrisCount; i++) {
    p3.set(rnd(-118, 118), rnd(0.02, 0.3), rnd(-118, 118));
    q.setFromEuler(new THREE.Euler(rnd(0, 3), rnd(0, 6), rnd(0, 3)));
    s3.set(rnd(0.15, 1.1), rnd(0.06, 0.35), rnd(0.15, 1.1));
    m4.compose(p3, q, s3);
    debrisMesh.setMatrixAt(i, m4);
  }
  debrisMesh.instanceMatrix.needsUpdate = true;
  group.add(debrisMesh);

  /* ---------------- distant skyline ---------------- */
  const skylineMat = new THREE.MeshBasicMaterial({ color: 0x4a463c });
  for (let i = 0; i < 42; i++) {
    const a = (i / 42) * Math.PI * 2;
    const r = rnd(155, 195);
    const h = rnd(10, 70);
    const b = new THREE.Mesh(new THREE.BoxGeometry(rnd(8, 20), h, rnd(8, 20)), skylineMat);
    b.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r);
    group.add(b);
  }

  /* ---------------- atmosphere ---------------- */
  scene.fog = new THREE.FogExp2(0x9d9078, 0.0072);
  scene.background = new THREE.Color(0x9d9078);
  scene.add(new THREE.HemisphereLight(0xb9a98b, 0x3a372d, 1.05));
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.1);
  sun.position.set(-60, 70, 45);
  sun.castShadow = true;
  if (quality !== 'low') {
    sun.shadow.mapSize.set(quality === 'high' ? 2048 : 1024, quality === 'high' ? 2048 : 1024);
    sun.shadow.camera.left = -70; sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70; sun.shadow.camera.bottom = -70;
    sun.shadow.camera.far = 240;
    sun.shadow.bias = -0.0006;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6b7a9a, 0.35);
  fill.position.set(40, 30, -50); scene.add(fill);

  /* ---------------- spawns & vehicles ---------------- */
  // Staging areas sit on the north/south boulevard, clear of the last building block.
  const spawns = { ua: [], ru: [] };
  for (let i = 0; i < 30; i++) {
    const x = -58 + i * 4 + rnd(-0.7, 0.7);
    const z = 109 + (i % 2 ? 3 : 0) + rnd(-0.7, 0.7);
    spawns.ua.push(new THREE.Vector3(x, 0, z));
    spawns.ru.push(new THREE.Vector3(-x, 0, -z));
  }
  const vehicleSpawns = [
    { kind: 'tank', team: 'ua', pos: new THREE.Vector3(-5, 0, 105), rot: Math.PI },
    { kind: 'atv', team: 'ua', pos: new THREE.Vector3(4, 0, 107), rot: Math.PI },
    { kind: 'transport', team: 'ua', pos: new THREE.Vector3(14, 0, 108), rot: Math.PI },
    { kind: 'tank', team: 'ru', pos: new THREE.Vector3(5, 0, -105), rot: 0 },
    { kind: 'atv', team: 'ru', pos: new THREE.Vector3(-4, 0, -107), rot: 0 },
    { kind: 'transport', team: 'ru', pos: new THREE.Vector3(-14, 0, -108), rot: 0 },
    { kind: 'atv', team: 'neutral', pos: new THREE.Vector3(0, 0, 62), rot: 1.2 },
    { kind: 'tank', team: 'neutral', pos: new THREE.Vector3(46, 0, 14), rot: -0.2 }
  ];

  const objectives = [
    { x: 0, z: 0 }, { x: -46, z: 0 }, { x: 46, z: 0 }, { x: 0, z: -46 }, { x: 0, z: 46 },
    { x: -46, z: 46 }, { x: 46, z: -46 }, { x: -46, z: -46 }, { x: 46, z: 46 }
  ];

  return {
    group, colliders, spawns, vehicleSpawns, coverPoints, objectives, fires, flag,
    heightAt() { return 0; },
    bounds: 116
  };
}

function a39madjust() { return 0x9d9078; }

/* ---------------- collision & ray helpers ---------------- */
export function overlapsAABB(px, py, pz, radius, height, c) {
  return (px + radius > c.minX && px - radius < c.maxX &&
          pz + radius > c.minZ && pz - radius < c.maxZ &&
          py + height > c.minY && py < c.maxY);
}

export function segmentBlocked(ax, ay, az, bx, by, bz, colliders, skipLow = true) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (skipLow && c.maxY < 1.4) continue;  // low cover does not block sight
    let tmin = 0, tmax = 1;
    // x
    if (Math.abs(dx) < 1e-6) { if (ax < c.minX || ax > c.maxX) continue; }
    else {
      let t1 = (c.minX - ax) / dx, t2 = (c.maxX - ax) / dx;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    // y
    if (Math.abs(dy) < 1e-6) { if (ay < c.minY || ay > c.maxY) continue; }
    else {
      let t1 = (c.minY - ay) / dy, t2 = (c.maxY - ay) / dy;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    // z
    if (Math.abs(dz) < 1e-6) { if (az < c.minZ || az > c.maxZ) continue; }
    else {
      let t1 = (c.minZ - az) / dz, t2 = (c.maxZ - az) / dz;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin >= 0 && tmin <= 1) return true;
  }
  return false;
}
