/* ============================================================
   HELL ON EARTH — bootstrap / state machine
   Loader → cinematic → menu → match → results
   ============================================================ */
import * as THREE from 'three';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { Match } from './game.js';
import { playIntro } from './intro.js';
import { buildSoldier, animateSoldier, buildVehicle, PALETTE, mat, box } from './models.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------- renderer ------------------------- */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const audio = new AudioEngine();
let state = 'loader';
let match = null;
let menu = null;
let intro = null;
let lastConfig = null;
let settings = { sens: 1, fov: 78, vol: 0.8, quality: 'med', fps: 'no', controls: 'pc' };

const ui = new UI({
  audio,
  onDeploy: (cfg) => startMatch(cfg),
  onSettings: (s) => {
    settings = s;
    audio.setVolume(s.vol);
    if (match) {
      match.settings = s;
      match.baseFov = s.fov;
    }
    const fps = $('fps-counter');
    if (fps) fps.classList.toggle('hidden', s.fps !== 'yes');
  }
});
settings = ui.state.settings;
audio.setVolume(settings.vol);

/* ------------------------- menu diorama ------------------------- */
function createMenuScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12130e);
  scene.fog = new THREE.FogExp2(0x12130e, 0.03);
  const cam = new THREE.PerspectiveCamera(44, window.innerWidth / window.innerHeight, 0.1, 220);
  cam.position.set(4.6, 2.15, 6.4);
  cam.lookAt(0.4, 1.25, 0);

  scene.add(new THREE.HemisphereLight(0x9c9a80, 0x1a1a13, 0.85));
  const key = new THREE.DirectionalLight(0xffd9a8, 2.5);
  key.position.set(-6, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -12; key.shadow.camera.right = 12;
  key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
  key.shadow.bias = -0.0008;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6f8fc0, 1.9);
  rim.position.set(7, 4, -8);
  scene.add(rim);
  const glow = new THREE.PointLight(0xff8c3a, 9, 18, 2);
  glow.position.set(-4.5, 1.4, -3.5);
  scene.add(glow);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), mat(0x2a2a22));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ruins silhouette
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 18 + Math.random() * 28;
    const w = 3 + Math.random() * 7, h = 4 + Math.random() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(0x1d1e17));
    b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    b.rotation.y = Math.random() * 3;
    scene.add(b);
  }
  // nearby broken wall + pillars
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 0.7), mat(0x3a3a2e));
  wall.position.set(-4.2, 2.1, -2.4);
  wall.rotation.y = 0.32;
  wall.castShadow = true; wall.receiveShadow = true;
  scene.add(wall);
  for (const [x, z, w, h] of [[3.2, -4.4, 2.2, 2.4], [4.9, -3.4, 1.4, 1.6], [-2.2, -4.8, 1.8, 1.2]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6), mat(0x31312a));
    p.position.set(x, h / 2, z);
    p.castShadow = true;
    scene.add(p);
  }

  const soldiers = [];
  const specs = [
    { x: -0.6, z: 0.4, yaw: 2.55, team: 'ua', weapon: 'ak74', smile: false },
    { x: 0.9, z: -0.5, yaw: 2.9, team: 'ua', weapon: 'lmg', smile: false },
    { x: 2.1, z: 0.7, yaw: 2.35, team: 'ru', weapon: 'ak74', smile: true }
  ];
  for (const s of specs) {
    const soldier = buildSoldier({ team: s.team, weapon: s.weapon, smile: s.smile });
    soldier.position.set(s.x, 0, s.z);
    soldier.rotation.y = s.yaw;
    soldier.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    scene.add(soldier);
    soldiers.push({ mesh: soldier, phase: Math.random() * 6 });
  }

  const tank = buildVehicle('tank', 'ua');
  tank.position.set(4.3, 0, -3.6);
  tank.rotation.y = -0.55;
  tank.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(tank);
  const atv = buildVehicle('atv', 'ua');
  atv.position.set(-3.4, 0, 1.8);
  atv.rotation.y = 0.9;
  atv.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(atv);

  // dust
  const dustGeo = new THREE.BufferGeometry();
  const pts = new Float32Array(220 * 3);
  for (let i = 0; i < 220; i++) {
    pts[i * 3] = (Math.random() - 0.5) * 26;
    pts[i * 3 + 1] = Math.random() * 9;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 22;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xc8bd9a, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dust);

  let time = 0;
  return {
    scene, cam, tank, dust,
    update(dt) {
      time += dt;
      cam.position.x = 4.6 + Math.sin(time * 0.18) * 0.55;
      cam.position.y = 2.15 + Math.sin(time * 0.12) * 0.12;
      cam.position.z = 6.4 + Math.cos(time * 0.15) * 0.35;
      cam.lookAt(0.5, 1.2, 0);
      dust.rotation.y = time * 0.012;
      for (const s of soldiers) animateSoldier(s.mesh, dt, 0.15, false);
      tank.userData.turret && (tank.userData.turret.rotation.y = Math.sin(time * 0.22) * 0.5);
    },
    dispose() {
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

function ensureMenu() {
  if (!menu) menu = createMenuScene();
}

function disposeMenu() {
  if (!menu) return;
  menu.dispose();
  menu = null;
}

/* ------------------------- match lifecycle ------------------------- */
function hideAllScreens() {
  for (const id of ['menu', 'faction', 'operator', 'customize', 'settings', 'credits', 'end', 'pause']) {
    const el = $(id);
    if (el) el.classList.add('hidden');
  }
}

function startMatch(cfg) {
  lastConfig = cfg;
  disposeMenu();
  if (match) { match.dispose(); match = null; }
  hideAllScreens();
  $('hud').classList.remove('hidden');
  state = 'game';
  match = new Match({
    renderer, audio,
    team: cfg.side || 'ua',
    operator: cfg.operator,
    weapon: cfg.weapon,
    attachments: cfg.attachments,
    controls: cfg.settings.controls,
    settings: cfg.settings,
    onEnd: showResults,
    onPause: () => $('pause').classList.remove('hidden'),
    onResume: () => $('pause').classList.add('hidden')
  });
  $('fps-counter').classList.toggle('hidden', settings.fps !== 'yes');
  if (window.location.search.includes('debug')) {
    window.__HOE = { get match() { return match; }, startMatch, toMenu };
  }
  if (cfg.settings.controls === 'pc') {
    setTimeout(() => {
      if (match && match.active && !match.paused) {
        try { renderer.domElement.requestPointerLock(); } catch (e) { /* user can click */ }
      }
    }, 80);
  }
}

function showResults(result) {
  state = 'end';
  $('hud').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('mobile').classList.add('hidden');
  const banner = $('end-banner');
  banner.textContent = result.win ? 'VICTORY' : 'DEFEAT';
  banner.classList.toggle('loss', !result.win);
  $('end-sub').textContent = (result.team === 'ua' ? 'UKRAINE' : 'RUSSIA') +
    (result.win ? ' HOLDS THE CITY' : ' LOST THE SECTOR') +
    ' · ' + result.tickets.ua + ' — ' + result.tickets.ru;
  $('st-kills').textContent = result.kills;
  $('st-deaths').textContent = result.deaths;
  $('st-veh').textContent = result.vehKills;
  $('st-score').textContent = result.score;
  $('end').classList.remove('hidden');
}

function toMenu() {
  $('end').classList.add('hidden');
  $('pause').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('mobile').classList.add('hidden');
  if (match) { match.dispose(); match = null; }
  ensureMenu();
  state = 'menu';
  ui.show('menu');
  if (audio.ctx) { audio.startMusic(); audio.startAmbience(); }
}

/* ------------------------- global loop ------------------------- */
let last = performance.now();
let fpsAcc = 0, fpsFrames = 0, fpsShown = 0;

function loop(now) {
  requestAnimationFrame(loop);
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  if (state === 'intro' || state === 'loader') return;

  if (state === 'menu') {
    ensureMenu();
    menu.update(dt);
    renderer.render(menu.scene, menu.cam);
  } else if (match) {
    if (state === 'game') match.update(dt);
    match.render();
    fpsAcc += dt; fpsFrames++;
    if (fpsAcc > 0.5) {
      fpsShown = Math.round(fpsFrames / fpsAcc);
      match.fpsValue = fpsShown;
      fpsAcc = 0; fpsFrames = 0;
    }
  }
}
requestAnimationFrame(loop);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (menu) {
    menu.cam.aspect = window.innerWidth / window.innerHeight;
    menu.cam.updateProjectionMatrix();
  }
});

/* ------------------------- buttons ------------------------- */
$('resume').addEventListener('click', () => { if (match) match.resume(); });
$('quit').addEventListener('click', toMenu);
$('to-menu').addEventListener('click', toMenu);
$('rematch').addEventListener('click', () => {
  if (lastConfig) {
    $('end').classList.add('hidden');
    startMatch(lastConfig);
  }
});
$('rematch').addEventListener('mouseenter', () => audio.ui());

/* ------------------------- audio unlock ------------------------- */
const unlock = () => {
  audio.init();
  audio.setVolume(settings.vol);
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

/* ------------------------- boot sequence ------------------------- */
const loadFill = $('load-fill');
const loadText = $('load-text');
const steps = ['INITIALIZING ENGINE', 'BUILDING SECTOR 7', 'DEPLOYING UNITS', 'READY'];
let loadPct = 0;
let stepIdx = 0;
const loadTimer = setInterval(() => {
  loadPct = Math.min(100, loadPct + 9 + Math.random() * 14);
  loadFill.style.width = loadPct + '%';
  const idx = Math.min(steps.length - 1, Math.floor(loadPct / 26));
  if (idx !== stepIdx) { stepIdx = idx; loadText.textContent = steps[idx]; }
  if (loadPct >= 100) {
    clearInterval(loadTimer);
    setTimeout(boot, 320);
  }
}, 110);

function boot() {
  ensureMenu();
  $('loader').classList.add('hidden');
  state = 'intro';
  ui.show(null);
  intro = playIntro({
    renderer, audio,
    onDone: () => {
      if (intro) { intro.dispose(); intro = null; }
      state = 'menu';
      ui.show('menu');
      ui.updateProfile();
      ui.applySettings();
      if (audio.ctx) { audio.startMusic(); audio.startAmbience(); }
    }
  });
}
