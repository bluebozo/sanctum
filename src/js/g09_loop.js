const CLEAVE_R = 4.4;
const NOVA_R = 6.6;

function castSkill(i) {
  if (G.state !== 'playing') return;
  const p = G.player;
  const sk = p.skills[i];
  if (p.level < sk.lvl) return;
  if (sk.cd > 0) return;
  if (p.mana < sk.cost) return;
  sk.cd = sk.cdMax;
  p.mana -= sk.cost;
  if (sk.cdMax > 0.9) sfx('click');

  if (i === 0) {
    sfx('cleave');
    spawnRing(p.pos.x, p.pos.z, 0xffd88a, CLEAVE_R);
    burst(p.pos.x, 0.5, p.pos.z, 26, 0xffe0a0, 9, 0.5);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist(p.pos.x, p.pos.z, e.pos.x, e.pos.z) < CLEAVE_R + e.radius) {
        const { dmg, crit } = playerDamageTo(e);
        damageEnemy(e, Math.round(dmg * 0.9), crit, angleTo(p.pos.x, p.pos.z, e.pos.x, e.pos.z));
      }
    }
  } else if (i === 1) {
    const dx = G.input.aim.x - p.pos.x, dz = G.input.aim.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const fbDmg = Math.round(playerDamageTo().dmg * 1.3);
    spawnProjectile(p.pos.x, 1.15, p.pos.z, (dx / d) * 24, (dz / d) * 24, fbDmg, true, 'fire');
    p.facing = Math.atan2(dx, dz);
    sfx('fireball');
  } else if (i === 2) {
    sfx('frost');
    spawnRing(p.pos.x, p.pos.z, 0x9fd4ff, NOVA_R);
    burst(p.pos.x, 0.5, p.pos.z, 40, 0xbfe0ff, 10, 0.7);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist(p.pos.x, p.pos.z, e.pos.x, e.pos.z) < NOVA_R + e.radius) {
        const { dmg, crit } = playerDamageTo(e);
        damageEnemy(e, Math.round(dmg * 1.15), crit, angleTo(p.pos.x, p.pos.z, e.pos.x, e.pos.z));
        if (e.isBoss) e.slowT = Math.max(e.slowT, 2.2);
        else e.slowT = Math.max(e.slowT, 4);
      }
    }
  } else if (i === 3) {
    beginLeap(G.input.aim.x, G.input.aim.z);
  }
}

function updateTorches(dt) {
  const now = performance.now();
  for (const t of G.torches) {
    if (!t.light && !t.flame) continue;
    const v = Math.sin(now * 0.013 + t.seed) * 4 + Math.sin(now * 0.047 + t.seed * 1.7) * 6 + Math.sin(now * 0.109 + t.seed) * 2.5;
    if (t.light) t.light.intensity = Math.max(6, t.base + v);
    if (t.flame && t.flame.material) {
      const f = 2.6 + Math.sin(now * 0.02 + t.seed) * 0.7 + Math.sin(now * 0.081 + t.seed) * 0.9;
      t.flame.material.emissiveIntensity = Math.max(1.6, f);
    }
  }
}

function updateGameplay(dt) {
  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateDrops(dt);

  if (G.stairs && !G.boss && G.player && !G.player.dead) {
    const d = dist(G.player.pos.x, G.player.pos.z, G.stairs.x, G.stairs.z);
    if (d < 1.6) descendFloor();
  }
  updateHUD();
  drawMinimap();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, G.clock.getDelta());
  if (G.state === 'playing') G.stats.time += dt;
  updateAim();

  if (G.state === 'playing') {
    updateGameplay(dt);
  } else if (G.state === 'dead' && G.player) {
    updateDrops(dt);
  }

  updateFX(dt);
  updateTorches(dt);
  updateCamera(dt);
  G.renderer.render(G.scene, G.camera);
}

initRenderer();
bindInput();
initFX();
G.clock = new THREE.Clock();

$('btn-start').addEventListener('click', startRun);
document.querySelectorAll('.btn-retry').forEach((b) => b.addEventListener('click', () => location.reload()));

if (new URLSearchParams(location.search).has('auto')) {
  setTimeout(startRun, 250);
}

if (new URLSearchParams(location.search).has('sim')) {
  setInterval(() => {
    if (G.state === 'dead' || G.state === 'victory') return;
    if (G.player) G.player.invulnT = 9999;
    if (G.boss && !G.boss.dead) {
      G.boss.hp -= 60;
      if (G.boss.hp <= 0) killEnemy(G.boss);
    }
    for (let i = 0; i < 4; i++) castSkill(i);
    const e = G.enemies.find((x) => !x.dead && !x.isBoss);
    if (e) G.input.target = e;
    if (performance.now() > 6500 && G.floor < 5) { G.input.target = null; descendFloor(); }
    if (performance.now() > 9000 && G.floor < 5) { G.input.target = null; descendFloor(); }
    if (performance.now() > 11500 && G.floor < 5) { G.input.target = null; descendFloor(); }
    if (performance.now() > 14000 && G.floor < 5) { G.input.target = null; descendFloor(); }
  }, 400);
  console.log('SIM_ENGAGED');
}

const camStart = new THREE.Vector3(0, 16.5, 11.5);
G.camera.position.copy(camStart);

animate();