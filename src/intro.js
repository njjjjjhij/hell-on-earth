/* ============================================================
   HELL ON EARTH — opening cinematic
   Flash → DOG PRODUCTIVE title card → two dummies, one shot.
   ============================================================ */
import * as THREE from 'three';
import { buildSoldier, animateSoldier, mat, box } from './models.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function signTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#15160f';
  x.fillRect(0, 0, 1024, 256);
  x.strokeStyle = 'rgba(200,164,90,.55)';
  x.lineWidth = 4;
  x.strokeRect(18, 18, 988, 220);
  x.fillStyle = '#c8a45a';
  x.font = '700 96px Oswald, Impact, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('DOG PRODUCTIVE', 512, 112);
  x.fillStyle = 'rgba(200,195,178,.55)';
  x.font = '500 30px Rajdhani, sans-serif';
  x.fillText('SECTOR 7 — URBAN COMBAT TRAINING FACILITY', 512, 196);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export function playIntro({ renderer, audio, onDone }) {
  const introEl = $('intro');
  const flashEl = $('flash');
  const logoEl = $('logo-card');
  const captionEl = $('cinema-caption');
  const skipBtn = $('skip-intro');
  introEl.classList.remove('hidden');
  introEl.style.background = '#000';
  introEl.classList.remove('bars');
  logoEl.classList.remove('show');
  captionEl.classList.remove('show');
  flashEl.style.transition = 'none';
  flashEl.style.opacity = '1';

  /* ------------------------- 3D scene ------------------------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0b08);
  scene.fog = new THREE.FogExp2(0x0d0e0a, 0.055);
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.05, 80);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight(0x8a8f7a, 0x15150f, 0.55));
  const key = new THREE.SpotLight(0xffd9a0, 26, 22, Math.PI / 4.5, 0.45, 1.6);
  key.position.set(0.5, 6.2, 3.2);
  key.target.position.set(0, 1.1, 0);
  scene.add(key, key.target);
  const rim = new THREE.SpotLight(0x6f90c8, 18, 20, Math.PI / 3.5, 0.6, 1.5);
  rim.position.set(-4, 4.4, -3.4);
  rim.target.position.set(0, 1.2, 0.4);
  scene.add(rim, rim.target);
  const fill = new THREE.PointLight(0xff9c4a, 6, 12, 2);
  fill.position.set(3.4, 1.4, 2.4);
  scene.add(fill);

  // floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), mat(0x24241d));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // grime stripes
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 18), mat(0x1c1c16));
    s.rotation.x = -Math.PI / 2;
    s.position.set(-4 + i * 1.15, 0.002, 0);
    s.rotation.z = 0.02;
    scene.add(s);
  }
  // back wall + sign
  const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 0.6), mat(0x2b2b23));
  wall.position.set(0, 4, -4.4);
  scene.add(wall);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 2.4),
    new THREE.MeshBasicMaterial({ map: signTexture() })
  );
  sign.position.set(0, 3.5, -4.05);
  scene.add(sign);
  // side crates / barrels
  const crate = (x, y, z, w, h, d, c) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  };
  crate(-4.6, 0.5, -2.2, 1.6, 1, 1.6, 0x4a4a35);
  crate(-4.2, 1.4, -2.1, 1.2, 0.8, 1.1, 0x56553d);
  crate(4.8, 0.45, -2.4, 1.4, 0.9, 1.3, 0x403f2e);
  crate(4.3, 1.25, -2.2, 0.9, 0.7, 0.9, 0x4c4a34);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1, 12), mat(0x3d4430));
  barrel.position.set(-3.5, 0.5, 1.6); barrel.castShadow = true; scene.add(barrel);
  // hanging lamp
  const lampCord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.4, 4), mat(0x181a15));
  lampCord.position.set(0, 5.4, 1.6); scene.add(lampCord);
  const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 10), mat(0x2a2c23));
  lamp.position.set(0, 4.1, 1.6); scene.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
  bulb.position.set(0, 3.95, 1.6); scene.add(bulb);
  const bulbLight = new THREE.PointLight(0xffc078, 8, 9, 2);
  bulbLight.position.copy(bulb.position); scene.add(bulbLight);
  const faceLight = new THREE.PointLight(0xffe6c0, 0, 8, 2);
  scene.add(faceLight);

  // dummies
  const soldierA = buildSoldier({ team: 'ua', unarmed: true, skin: 0xb98a63 });
  soldierA.position.set(-1.15, 0, 0.35);
  soldierA.rotation.y = Math.PI / 2;
  scene.add(soldierA);
  const soldierB = buildSoldier({ team: 'ru', weapon: 'ak74' });
  soldierB.position.set(1.15, 0, 0);
  soldierB.rotation.y = -Math.PI / 2;
  scene.add(soldierB);
  soldierB.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  // teeth for the smile
  const headB = soldierB.userData.head;
  const teeth = box(headB, 0xe9e5d6, 0.13, 0.03, 0.006, 0, -0.066, 0.153);
  teeth.visible = false;
  const smileLine = soldierB.userData.mouth;

  // muzzle flash + tracer
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), flashMat);
  scene.add(flash);
  const flashLight = new THREE.PointLight(0xffb35a, 0, 8, 2);
  scene.add(flashLight);
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0 });
  const tracer = new THREE.Line(tracerGeo, tracerMat);
  scene.add(tracer);

  // blood particles
  const blood = [];
  for (let i = 0; i < 14; i++) {
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), new THREE.MeshBasicMaterial({ color: 0x8e2b21 }));
    p.visible = false;
    scene.add(p);
    blood.push({ mesh: p, vel: new THREE.Vector3(), life: 0 });
  }

  /* camera framing */
  const tmpV = new THREE.Vector3();
  const muzzleWorld = new THREE.Vector3();
  const headA = new THREE.Vector3();
  const headBWorld = new THREE.Vector3();

  camera.position.set(0.2, 1.75, 4.6);
  camera.lookAt(0, 1.15, 0);

  let t = 0;
  let last = performance.now();
  let done = false;
  let fired = false;
  let fell = false;
  let shotAt = 7.9;
  let captionStage = -1;
  let raf = 0;

  const captions = [
    { at: 0.0, text: '' },
    { at: 3.4, text: 'SECTOR 7 · URBAN COMBAT TRAINING FACILITY' },
    { at: 5.2, text: 'TWO RECRUITS. ONE WORKING RIFLE.' },
    { at: 7.0, text: 'THIS IS NOT A DRILL' },
    { at: 10.3, text: 'DOG PRODUCTIVE' }
  ];

  const setCap = (i) => {
    if (i === captionStage) return;
    captionStage = i;
    if (!captions[i] || !captions[i].text) { captionEl.classList.remove('show'); return; }
    captionEl.textContent = captions[i].text;
    captionEl.classList.add('show');
  };

  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    skipBtn.removeEventListener('click', finish);
    introEl.style.transition = 'opacity .6s ease';
    introEl.style.opacity = '0';
    setTimeout(() => {
      introEl.classList.add('hidden');
      introEl.style.opacity = '';
      introEl.style.background = '#000';
      introEl.classList.remove('bars');
      logoEl.classList.remove('show');
      captionEl.classList.remove('show');
      onDone();
    }, 620);
  };

  const skip = () => {
    if (t < 12.4) { t = 12.4; }
  };
  const onKey = (e) => { if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); skip(); } };
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  skipBtn.addEventListener('click', skip);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  // opening flash
  requestAnimationFrame(() => {
    flashEl.style.transition = 'opacity 1.1s ease';
    flashEl.style.opacity = '0';
  });

  const tick = (now) => {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    /* ---- logo card ---- */
    if (t > 0.28 && t < 2.75) {
      logoEl.classList.add('show');
      if (!tick.voiced) {
        tick.voiced = true;
        if (audio) audio.speak('dog_productive', { volume: 0.9 });
      }
    } else {
      logoEl.classList.remove('show');
    }

    /* ---- 3D scene ---- */
    if (t >= 2.75) {
      introEl.style.background = 'rgba(0,0,0,0)';
      introEl.classList.add('bars');
      if (t < 3.2) {
        const k = clamp((t - 2.75) / 0.45, 0, 1);
        camera.position.set(0.2, 1.75 + (1 - k) * 0.6, 4.6 + (1 - k) * 2.2);
      } else if (t < 5.4) {
        camera.position.lerp(new THREE.Vector3(-0.4, 1.55, 3.5), dt * 1.2);
        camera.lookAt(0, 1.2, 0.1);
      } else if (t < shotAt) {
        camera.position.lerp(new THREE.Vector3(-0.9, 1.5, 2.9), dt * 1.2);
        camera.lookAt(0.15, 1.25, 0.1);
      } else if (t < 9.9) {
        camera.position.lerp(new THREE.Vector3(0.55, 1.45, 2.4), dt * 2.2);
        camera.lookAt(0.5, 1.5, 0);
      } else {
        // close-up on the survivor
        soldierB.getWorldPosition(tmpV);
        const target = tmpV.clone().add(new THREE.Vector3(0, 1.4, 0));
        const camTarget = tmpV.clone().add(new THREE.Vector3(0.12, 1.58, 2.9));
        camera.position.lerp(camTarget, Math.min(1, dt * 2.4));
        camera.lookAt(target);
        faceLight.position.copy(camera.position).add(new THREE.Vector3(0.3, 0.45, 0));
        faceLight.intensity = 3.2;
      }
      if (t > 9.9) camera.position.x += Math.sin(t * 8) * 0.0015;

      animateSoldier(soldierA, dt, 0, false);
      animateSoldier(soldierB, dt, 0, false);

      // A throws a punch around 5.6
      if (t > 5.5 && t < 6.1) {
        const k = (t - 5.5) / 0.6;
        soldierA.userData.armR.rotation.x = -0.2 - Math.sin(k * Math.PI) * 1.8;
        soldierA.userData.rig.position.x = Math.sin(k * Math.PI) * 0.18;
      }
      if (t > 6.1) {
        soldierA.userData.armR.rotation.x = -0.2;
        soldierA.userData.rig.position.x = 0;
      }
      // B brings the rifle up
      if (t > 6.6) {
        const k = clamp((t - 6.6) / 0.7, 0, 1);
        soldierB.userData.rig.rotation.x = -0.03 * k;
      }

      // the shot
      if (!fired && t >= shotAt) {
        fired = true;
        soldierB.getWorldPosition(tmpV);
        soldierA.getWorldPosition(headA);
        headA.y += 1.55;
        const gun = soldierB.userData.weapon;
        if (gun && gun.userData.muzzle) gun.userData.muzzle.getWorldPosition(muzzleWorld);
        else muzzleWorld.set(tmpV.x - 0.6, 1.25, tmpV.z);
        flash.position.copy(muzzleWorld);
        flashMat.opacity = 1;
        flash.scale.setScalar(1.4);
        flashLight.position.copy(muzzleWorld);
        flashLight.intensity = 24;
        const tp = tracer.geometry.attributes.position;
        tp.setXYZ(0, muzzleWorld.x, muzzleWorld.y, muzzleWorld.z);
        tp.setXYZ(1, headA.x, headA.y, headA.z);
        tp.needsUpdate = true;
        tracerMat.opacity = 0.95;
        if (audio) { audio.shot('rifle', 0); audio.flesh(); }
        // blood
        for (const b of blood) {
          b.mesh.position.set(headA.x, headA.y, headA.z + 0.1);
          b.mesh.visible = true;
          b.vel.set(-2.2 + Math.random() * 1.2, Math.random() * 2.4, Math.random() * 2 - 0.6);
          b.life = 1.4;
        }
        // A's head snaps
        soldierA.userData.head.rotation.x = -0.5;
      }
      if (fired) {
        flashMat.opacity = Math.max(0, flashMat.opacity - dt * 12);
        flashLight.intensity = Math.max(0, flashLight.intensity - dt * 160);
        tracerMat.opacity = Math.max(0, tracerMat.opacity - dt * 8);
        for (const b of blood) {
          if (b.life <= 0) continue;
          b.life -= dt;
          b.vel.y -= 8 * dt;
          b.mesh.position.addScaledVector(b.vel, dt);
          if (b.mesh.position.y < 0.02) { b.mesh.position.y = 0.02; b.vel.multiplyScalar(0); }
          if (b.life <= 0) b.mesh.visible = false;
        }
      }
      // A falls backward
      if (fired && !fell && t > shotAt + 0.18) {
        fell = true;
      }
      if (fell) {
        soldierA.rotation.z = Math.min(1.5, soldierA.rotation.z + dt * 4.5);
        soldierA.position.y = Math.max(-0.35, soldierA.position.y - dt * 0.6);
      }

      // B looks at camera + smiles
      if (t > 9.55 && !tick.smiled) {
        tick.smiled = true;
        teeth.visible = true;
        smileLine.scale.set(0.19, 0.032, 0.01);
        smileLine.position.y = -0.072;
      }
      if (t > 9.2) {
        soldierB.getWorldPosition(tmpV);
        const dx = camera.position.x - tmpV.x;
        const dz = camera.position.z - tmpV.z;
        const targetYaw = Math.atan2(dx, dz);
        let d = targetYaw - soldierB.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        soldierB.rotation.y += d * Math.min(1, dt * 3.4);
        soldierB.userData.head.rotation.y = Math.sin(t * 2) * 0.03;
      }

      const capStage = t > 10.3 ? 4 : t > 7.0 ? 3 : t > 5.2 ? 2 : t > 3.4 ? 1 : 0;
      setCap(capStage);

      renderer.render(scene, camera);
    }

    if (t > 12.4) {
      setCap(4);
      finish();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    skip,
    dispose() {
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      skipBtn.removeEventListener('click', skip);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (o.material.map) o.material.map.dispose();
          o.material.dispose();
        }
      });
    }
  };
}
