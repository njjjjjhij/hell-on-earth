/* ============================================================
   HELL ON EARTH — menus, operator select, armory, settings
   ============================================================ */
import * as THREE from 'three';
import { OPERATORS } from './game.js';
import { WEAPONS, PRIMARY_ORDER, ATTACHMENTS, resolveWeapon, buildWeapon } from './models.js';

const $ = (id) => document.getElementById(id);
const SETTINGS_KEY = 'hoe-settings-v1';
const LOADOUT_KEY = 'hoe-loadout-v1';

const DEFAULTS = { sens: 1, fov: 78, vol: 0.8, quality: 'med', fps: 'no', controls: 'pc' };

export class UI {
  constructor({ audio, onDeploy, onSettings }) {
    this.audio = audio;
    this.onDeploy = onDeploy;
    this.onSettings = onSettings || (() => {});
    this.state = {
      side: null,
      operator: 'rifleman',
      weapon: 'ak74',
      attachments: { optic: 'iron', muzzle: 'none', mag: 'std', skin: 'wood' },
      settings: { ...DEFAULTS }
    };
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (s) this.state.settings = { ...DEFAULTS, ...s };
      const l = JSON.parse(localStorage.getItem(LOADOUT_KEY) || 'null');
      if (l) {
        this.state.operator = l.operator || 'rifleman';
        this.state.weapon = l.weapon || 'ak74';
        this.state.attachments = { ...this.state.attachments, ...(l.attachments || {}) };
        this.state.settings.controls = l.controls || this.state.settings.controls;
      }
    } catch (e) { /* ignore corrupt storage */ }

    this.screens = ['menu', 'faction', 'operator', 'customize', 'settings', 'credits'];
    this.buildOperators();
    this.buildGuns();
    this.bindNav();
    this.bindSettings();
    this.bindControls();
    this.bindProfile();
    this.updateProfile();
    this.initPreview();
    this.globalClicks();
  }

  /* ------------------------- navigation ------------------------- */
  show(name) {
    for (const id of this.screens) {
      const el = $(id);
      if (el) el.classList.toggle('hidden', id !== name);
    }
    if (name === 'customize') {
      this.previewActive = true;
      setTimeout(() => this.resizePreview(), 30);
    } else {
      this.previewActive = false;
    }
    if (name === 'operator') this.renderOperator();
    if (name === 'settings') this.syncSettingsInputs();
  }

  bindNav() {
    document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
      if (this.audio) this.audio.ui();
      const go = b.dataset.go;
      if (go === 'faction') this.state.side = null;
      this.show(go);
    }));
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
      if (this.audio) this.audio.ui();
      this.show(b.dataset.back);
    }));
    document.querySelectorAll('.faction-card').forEach((b) => b.addEventListener('click', () => {
      if (this.audio) this.audio.ui();
      this.state.side = b.dataset.side;
      $('op-side-label').textContent = this.state.side === 'ua' ? 'UKRAINE' : 'RUSSIA';
      $('op-side-label').style.color = this.state.side === 'ua' ? '#7fb4ee' : '#ef8b7f';
      this.renderOperator();
      this.show('operator');
    }));
    $('deploy-btn').addEventListener('click', () => {
      if (!this.state.side) { this.state.side = 'ua'; }
      if (this.audio) this.audio.ui();
      this.persistLoadout();
      this.onDeploy({ ...this.state, settings: { ...this.state.settings } });
    });
    $('deploy-btn').addEventListener('pointerenter', () => { if (this.audio) this.audio.ui(); });
  }

  globalClicks() {
    document.querySelectorAll('button').forEach((b) => {
      b.addEventListener('pointerdown', () => { if (this.audio && !b.dataset.noSfx) this.audio.ui(); });
    });
  }

  /* ------------------------- operators ------------------------- */
  buildOperators() {
    const list = $('op-list');
    list.innerHTML = '';
    OPERATORS.forEach((op, i) => {
      const b = document.createElement('button');
      b.className = 'op-tile' + (op.id === this.state.operator ? ' active' : '');
      b.dataset.op = op.id;
      b.innerHTML = `<span class="ic">${op.icon}</span><b>${op.name}</b><small>${op.role}</small>`;
      b.addEventListener('click', () => {
        this.state.operator = op.id;
        list.querySelectorAll('.op-tile').forEach((t) => t.classList.toggle('active', t === b));
        this.renderOperator();
        if (this.audio) this.audio.ui();
      });
      list.appendChild(b);
    });
  }

  renderOperator() {
    const op = OPERATORS.find((o) => o.id === this.state.operator) || OPERATORS[0];
    $('op-name').textContent = op.name;
    $('op-role').textContent = op.role.toUpperCase();
    $('op-desc').textContent = op.desc;
    $('op-ability').textContent = op.ability.name + ' — ' + op.ability.desc;
    const stats = $('op-stats');
    stats.innerHTML = '';
    for (const [k, v] of Object.entries(op.stats)) {
      const row = document.createElement('div');
      row.className = 'stat';
      row.innerHTML = `<span>${k}</span><div class="bar"><i style="width:${v}%"></i></div><span>${v}</span>`;
      stats.appendChild(row);
    }
    document.querySelectorAll('.op-tile').forEach((t) => t.classList.toggle('active', t.dataset.op === op.id));
  }

  bindControls() {
    document.querySelectorAll('.seg-btn[data-controls]').forEach((b) => {
      b.classList.toggle('active', b.dataset.controls === this.state.settings.controls);
      b.addEventListener('click', () => {
        this.state.settings.controls = b.dataset.controls;
        document.querySelectorAll('.seg-btn[data-controls]').forEach((x) => x.classList.toggle('active', x === b));
        this.saveSettings();
        this.updateProfile();
        if (this.audio) this.audio.ui();
      });
    });
  }

  bindProfile() {
    const card = $('profile-card');
    if (!card) return;
    card.addEventListener('click', () => this.show('customize'));
    card.style.cursor = 'pointer';
  }

  updateProfile() {
    const op = OPERATORS.find((o) => o.id === this.state.operator) || OPERATORS[0];
    const gun = resolveWeapon(this.state.weapon, this.state.attachments);
    if ($('profile-op')) $('profile-op').textContent = op.name;
    if ($('profile-gun')) $('profile-gun').textContent = gun.name;
    if ($('hud-op')) $('hud-op').textContent = op.name;
  }

  /* ------------------------- armory ------------------------- */
  buildGuns() {
    const list = $('gun-list');
    list.innerHTML = '';
    PRIMARY_ORDER.forEach((id) => {
      const w = WEAPONS[id];
      const b = document.createElement('button');
      b.className = 'gun-item' + (id === this.state.weapon ? ' active' : '');
      b.dataset.gun = id;
      b.innerHTML = `<b>${w.name}</b><small>${w.cls}</small>`;
      b.addEventListener('click', () => {
        this.state.weapon = id;
        list.querySelectorAll('.gun-item').forEach((x) => x.classList.toggle('active', x === b));
        this.updateGun();
        this.updateProfile();
        if (this.audio) this.audio.reload();
      });
      list.appendChild(b);
    });
    this.buildAttachments();
    this.updateGun();
  }

  buildAttachments() {
    const groups = { optic: 'attach-optic', muzzle: 'attach-muzzle', mag: 'attach-mag', skin: 'attach-skin' };
    for (const [group, holder] of Object.entries(groups)) {
      const el = $(holder);
      el.innerHTML = '';
      for (const opt of ATTACHMENTS[group]) {
        const b = document.createElement('button');
        b.className = 'chip' + (this.state.attachments[group] === opt.id ? ' active' : '');
        b.textContent = opt.name;
        b.dataset.att = group + ':' + opt.id;
        b.addEventListener('click', () => {
          this.state.attachments[group] = opt.id;
          el.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === b));
          this.updateGun();
          this.updateProfile();
          if (this.audio) this.audio.ui();
        });
        el.appendChild(b);
      }
    }
  }

  updateGun() {
    const def = resolveWeapon(this.state.weapon, this.state.attachments);
    $('gun-title').textContent = def.name;
    $('gun-class').textContent = def.cls;
    const stats = $('gun-stats');
    stats.innerHTML = '';
    const rows = [
      ['DAMAGE', Math.round(def.dmg)],
      ['RPM', Math.round(def.rpm)],
      ['MAG', def.magSize],
      ['RECOIL', (def.recoil * 10).toFixed(0)]
    ];
    for (const [k, v] of rows) {
      const row = document.createElement('div');
      row.className = 'stat';
      const pct = k === 'MAG' ? Math.min(100, v / 1.2) : k === 'RPM' ? Math.min(100, v / 9) : k === 'DAMAGE' ? Math.min(100, v) : Math.min(100, v * 4);
      row.innerHTML = `<span>${k}</span><div class="bar"><i style="width:${pct}%"></i></div><span>${v}</span>`;
      stats.appendChild(row);
    }
    this.rebuildPreviewGun();
  }

  initPreview() {
    const host = $('gun-preview-3d');
    if (!host) return;
    this.previewActive = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(host.clientWidth || 420, host.clientHeight || 300);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    this.previewRenderer = renderer;

    const scene = new THREE.Scene();
    this.previewScene = scene;
    const cam = new THREE.PerspectiveCamera(32, (host.clientWidth || 420) / (host.clientHeight || 300), 0.1, 60);
    cam.position.set(1.55, 0.62, 1.75);
    cam.lookAt(0, 0, -0.05);
    this.previewCam = cam;
    scene.add(new THREE.HemisphereLight(0xd8cfb4, 0x2a2a22, 1.6));
    const key = new THREE.DirectionalLight(0xffe6bd, 2.6);
    key.position.set(3, 5, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6f8fbf, 1.8);
    rim.position.set(-4, 2, -3);
    scene.add(rim);
    this.previewGroup = new THREE.Group();
    scene.add(this.previewGroup);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ color: 0x0e100c }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.55;
    scene.add(floor);
    this.rebuildPreviewGun();

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (this.previewGroup) this.previewGroup.rotation.y += dt * 0.35;
      if (this.previewActive) renderer.render(scene, cam);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.addEventListener('resize', () => this.resizePreview());
  }

  resizePreview() {
    const host = $('gun-preview-3d');
    if (!host || !this.previewRenderer) return;
    const w = host.clientWidth || 420, h = host.clientHeight || 300;
    this.previewRenderer.setSize(w, h);
    this.previewCam.aspect = w / h;
    this.previewCam.updateProjectionMatrix();
  }

  rebuildPreviewGun() {
    if (!this.previewGroup) return;
    while (this.previewGroup.children.length) this.previewGroup.remove(this.previewGroup.children[0]);
    const gun = buildWeapon(this.state.weapon, this.state.attachments);
    gun.position.set(0, 0, 0.1);
    gun.rotation.y = 0.2;
    this.previewGroup.add(gun);
  }

  /* ------------------------- settings ------------------------- */
  bindSettings() {
    const bind = (id, out, key, fmt) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        this.state.settings[key] = key === 'vol' || key === 'sens' ? parseFloat(el.value) : parseFloat(el.value);
        if (out) $(out).textContent = fmt ? fmt(el.value) : el.value;
        this.saveSettings();
      });
    };
    bind('set-sens', 'set-sens-out', 'sens', (v) => Number(v).toFixed(2));
    bind('set-fov', 'set-fov-out', 'fov', (v) => Math.round(v));
    bind('set-vol', 'set-vol-out', 'vol', (v) => Math.round(v * 100));
    const q = $('set-quality');
    q.addEventListener('change', () => { this.state.settings.quality = q.value; this.saveSettings(); });
    const f = $('set-fps');
    f.addEventListener('change', () => { this.state.settings.fps = f.value; this.saveSettings(); });
    $('set-reset').addEventListener('click', () => {
      this.state.settings = { ...DEFAULTS };
      this.saveSettings();
      this.syncSettingsInputs();
      if (this.audio) this.audio.ui();
    });
  }

  syncSettingsInputs() {
    const s = this.state.settings;
    const set = (id, v) => { const el = $(id); if (el) el.value = v; };
    set('set-sens', s.sens); set('set-fov', s.fov); set('set-vol', s.vol);
    set('set-quality', s.quality); set('set-fps', s.fps);
    if ($('set-sens-out')) $('set-sens-out').textContent = Number(s.sens).toFixed(2);
    if ($('set-fov-out')) $('set-fov-out').textContent = Math.round(s.fov);
    if ($('set-vol-out')) $('set-vol-out').textContent = Math.round(s.vol * 100);
    document.querySelectorAll('.seg-btn[data-controls]').forEach((b) => b.classList.toggle('active', b.dataset.controls === s.controls));
  }

  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.state.settings)); } catch (e) { /* quota */ }
    this.applySettings();
  }

  applySettings() {
    if (this.audio) this.audio.setVolume(this.state.settings.vol);
    this.onSettings(this.state.settings);
  }

  persistLoadout() {
    try {
      localStorage.setItem(LOADOUT_KEY, JSON.stringify({
        operator: this.state.operator,
        weapon: this.state.weapon,
        attachments: this.state.attachments,
        controls: this.state.settings.controls
      }));
    } catch (e) { /* quota */ }
  }
}
