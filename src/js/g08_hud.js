const CAM_OFFSET = new THREE.Vector3(0, 16.5, 11.5);
const camLook = new THREE.Vector3();

function updateCamera(dt) {
  const p = G.player;
  if (!p) return;
  const parallax = new THREE.Vector3(
    clamp((G.input.aim.x - p.pos.x) * 0.06, -2.2, 2.2),
    0,
    clamp((G.input.aim.z - p.pos.z) * 0.04, -1.6, 1.6)
  );
  const target = new THREE.Vector3(p.pos.x, 0, p.pos.z).add(CAM_OFFSET).add(parallax);
  G.camera.position.x = expDamp(G.camera.position.x, target.x, 6, dt);
  G.camera.position.y = expDamp(G.camera.position.y, target.y, 6, dt);
  G.camera.position.z = expDamp(G.camera.position.z, target.z, 6, dt);
  if (G.shake > 0.001) {
    const s = G.shake * G.shake * 0.9;
    G.camera.position.x += rnd(-s, s);
    G.camera.position.y += rnd(-s, s) * 0.6;
    G.camera.position.z += rnd(-s, s);
  }
  camLook.set(p.pos.x, 1.1, p.pos.z);
  G.camera.lookAt(camLook);

  G.sun.position.set(p.pos.x + 14, 26, p.pos.z + 10);
  G.sun.target.position.set(p.pos.x, 0, p.pos.z);
  G.torchLight.position.set(p.pos.x, 3.6, p.pos.z);
}

let minimapStatic = null;
function buildMinimapStatic() {
  const g = G.grid;
  const c = document.createElement('canvas');
  c.width = g.w;
  c.height = g.h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, g.w, g.h);
  for (let gy = 0; gy < g.h; gy++) {
    for (let gx = 0; gx < g.w; gx++) {
      if (g.cells[gy * g.w + gx] === 1) {
        ctx.fillStyle = '#4a4f5e';
        ctx.fillRect(gx, gy, 1, 1);
      } else {
        let near = false;
        for (let oy = -1; oy <= 1 && !near; oy++)
          for (let ox = -1; ox <= 1; ox++) {
            const nx = gx + ox, ny = gy + oy;
            if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[ny * g.w + nx] === 1) { near = true; break; }
          }
        if (near) { ctx.fillStyle = '#1c1f28'; ctx.fillRect(gx, gy, 1, 1); }
      }
    }
  }
  minimapStatic = c;
}

function drawMinimap() {
  const cv = G.ui.minimap;
  if (!minimapStatic || !G.grid) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const g = G.grid;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, W, H);
  const s = Math.min(W / g.w, H / g.h);
  const ox = (W - g.w * s) / 2, oy = (H - g.h * s) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(minimapStatic, ox, oy, g.w * s, g.h * s);

  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(ox + (x / CFG.CELL) * s, oy + (z / CFG.CELL) * s, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (G.stairs) dot(G.stairs.x, G.stairs.z, '#ffd24a', 3.2);
  for (const d of G.drops) dot(d.pos.x, d.pos.z, d.kind === 'gold' ? '#c8a840' : '#7fd0ff', 1.6);
  for (const e of G.enemies) {
    if (e.dead) continue;
    dot(e.pos.x, e.pos.z, e.isBoss ? '#ff2020' : '#e04848', e.isBoss ? 4 : 2.4);
  }
  if (G.player) dot(G.player.pos.x, G.player.pos.z, '#ffffff', 3);
  ctx.strokeStyle = 'rgba(200,180,120,0.35)';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

function updateHUD() {
  const p = G.player;
  if (!p) return;
  const s = p.stats;
  const hpFrac = clamp(p.hp / s.maxHp, 0, 1);
  const mpFrac = clamp(p.mana / s.maxMana, 0, 1);
  G.ui.hpFill.style.height = (hpFrac * 100).toFixed(1) + '%';
  G.ui.mpFill.style.height = (mpFrac * 100).toFixed(1) + '%';
  G.ui.hpNum.textContent = Math.ceil(p.hp);
  G.ui.mpNum.textContent = Math.floor(p.mana);
  G.ui.hpOrb.classList.toggle('low', hpFrac < 0.3);
  G.ui.mpOrb.classList.toggle('low', mpFrac < 0.15);
  G.ui.xpFill.style.width = ((p.xp / p.xpNext) * 100).toFixed(2) + '%';
  G.ui.xpText.textContent = Math.floor(p.xp) + ' / ' + p.xpNext;
  G.ui.lvl.textContent = p.level;
  G.ui.gold.innerHTML = '&#9679; ' + G.stats.gold;
  $('pot-count').textContent = p.potions;

  for (let i = 0; i < 4; i++) {
    const sk = p.skills[i];
    const el = G.ui.skills[i];
    const locked = p.level < sk.lvl;
    el.classList.toggle('locked', locked);
    const cooling = sk.cd > 0.05 && !locked;
    el.classList.toggle('cooling', cooling);
    const nomana = !locked && p.mana < sk.cost;
    el.classList.toggle('nomana', nomana);
    if (cooling) {
      const frac = sk.cd / sk.cdMax;
      el.style.setProperty('--cd', (frac * 360).toFixed(0) + 'deg');
      el.querySelector('.cdnum').textContent = sk.cd.toFixed(1);
    } else if (locked) {
      el.querySelector('.cdnum').textContent = 'Lv ' + sk.lvl;
    }
  }
  const potEl = G.ui.skills[4];
  potEl.classList.toggle('locked', p.potions <= 0);
  potEl.classList.toggle('cooling', false);

  if (G.boss && !G.boss.dead) {
    G.ui.bossFill.style.width = (clamp(G.boss.hp / G.boss.maxHp, 0, 1) * 100).toFixed(1) + '%';
  }
}

function showFloorBanner(n) {
  const el = G.ui.floorName;
  el.textContent = FLOOR_NAMES[n] || ('DEPTH ' + n);
  el.classList.remove('banner');
  void el.offsetWidth;
  el.classList.add('banner');
}

function setupFloor(n) {
  const { spawn } = createFloor(n);
  if (!G.player) createPlayer();
  G.player.pos.set(spawn.x, 0, spawn.z);
  G.player.mesh.position.set(spawn.x, 0, spawn.z);
  G.input.path.length = 0;
  G.input.target = null;
  G.enemies.forEach((e) => G.scene.remove(e.mesh));
  G.enemies = [];
  G.projectiles.forEach((pr) => G.scene.remove(pr.mesh));
  G.projectiles = [];
  G.drops.forEach((d) => G.scene.remove(d.mesh));
  G.drops = [];
  G.boss = null;
  G.ui.bossBar.classList.remove('on');
  spawnFloorEnemies(n);
  if (n === CFG.FLOORS) spawnBoss();
  buildMinimapStatic();
  showFloorBanner(n);
}

function descendFloor() {
  if (G.fadeBusy || G.state !== 'playing') return;
  G.fadeBusy = true;
  G.state = 'transition';
  sfx('stairs');
  G.ui.fade.classList.add('on');
  setTimeout(() => {
    G.floor++;
    setupFloor(G.floor);
    G.player.hp = Math.min(G.player.stats.maxHp, G.player.hp + G.player.stats.maxHp * 0.3);
    G.player.potions = Math.min(6, G.player.potions + 1);
    G.ui.fade.classList.remove('on');
    setTimeout(() => {
      G.state = 'playing';
      G.fadeBusy = false;
    }, 480);
  }, 480);
}

function playerDie() {
  if (G.state !== 'playing') return;
  G.player.dead = true;
  G.state = 'dead';
  G.input.path.length = 0;
  G.input.target = null;
  sfx('death');
  shake(0.9);
  burst(G.player.pos.x, 1, G.player.pos.z, 50, 0xaa1020, 8, 1);
  setTimeout(() => {
    $('d-floor').textContent = G.floor;
    $('d-level').textContent = G.player.level;
    $('d-kills').textContent = G.stats.kills;
    $('d-gold').textContent = G.stats.gold;
    G.ui.death.classList.add('on');
  }, 900);
}

function startRun() {
  initAudio();
  if (G.audio && G.audio.ctx.state === 'suspended') G.audio.ctx.resume();
  G.ui.screens.title.classList.add('hidden');
  G.ui.hud.style.display = 'block';
  G.state = 'playing';
  G.stats.time = 0;
  G.floor = 1;
  setupFloor(1);
  updateHUD();
  sfx('click');
}
