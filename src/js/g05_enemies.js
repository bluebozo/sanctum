const ENEMY_TYPES = {
  ghoul: { hp: 44, dmg: 9, speed: 4.4, range: 1.9, radius: 0.55, windup: 0.55, recover: 0.6, xp: 14, gold: [3, 9], aggro: 11, skin: 0x7a8a5e, cloth: 0x3a3028, scale: 1 },
  archer: { hp: 32, dmg: 10, speed: 3.8, range: 9.5, pref: 7, radius: 0.5, windup: 0.85, recover: 1.1, xp: 18, gold: [4, 11], aggro: 13, skin: 0xd8d0bc, cloth: 0x40384a, scale: 0.96, ranged: true },
  brute: { hp: 135, dmg: 22, speed: 2.8, range: 2.7, radius: 0.9, windup: 0.95, recover: 1.15, xp: 44, gold: [10, 22], aggro: 10, skin: 0x9a6a4a, cloth: 0x50201c, scale: 1.5, slam: true },
};

function buildHumanoid(o) {
  const grp = new THREE.Group();
  const body = new THREE.Group();
  grp.add(body);
  const skinMat = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.9, flatShading: true });
  const clothMat = new THREE.MeshStandardMaterial({ color: o.cloth, roughness: 0.95, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x201a1a, roughness: 1, flatShading: true });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

  const torso = box(0.7, 0.78, 0.42, clothMat);
  torso.position.y = 1.14;
  const head = box(0.34, 0.34, 0.34, skinMat);
  head.position.y = 1.76;
  const jaw = box(0.3, 0.1, 0.3, darkMat);
  jaw.position.y = 1.62;
  const eye = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.06, 0.02),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: o.eye || 0xffdd66, emissiveIntensity: 3 })
  );
  eye.position.set(0, 1.78, 0.18);
  body.add(torso, head, jaw, eye);

  const armL = new THREE.Group();
  armL.position.set(-0.46, 1.42, 0);
  const armLm = box(0.18, 0.6, 0.18, skinMat);
  armLm.position.y = -0.3;
  armL.add(armLm);
  body.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.46, 1.42, 0);
  const armRm = box(0.18, 0.6, 0.18, skinMat);
  armRm.position.y = -0.3;
  armR.add(armRm);
  body.add(armR);

  if (o.weapon === 'claw') {
    const claw = box(0.1, 0.3, 0.06, darkMat);
    claw.position.set(0, -0.62, 0.08);
    armR.add(claw);
    const claw2 = claw.clone();
    armL.add(claw2);
  } else if (o.weapon === 'bow') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 6, 12, Math.PI), darkMat);
    bow.rotation.z = Math.PI / 2;
    bow.rotation.y = Math.PI / 2;
    bow.position.set(0, -0.5, 0.1);
    armL.add(bow);
  } else if (o.weapon === 'club') {
    const shaft = box(0.1, 1.3, 0.1, darkMat);
    shaft.position.set(0, -0.5, 0);
    const headC = box(0.34, 0.4, 0.34, new THREE.MeshStandardMaterial({ color: 0x50484a, roughness: 0.8, metalness: 0.3, flatShading: true }));
    headC.position.set(0, -1.1, 0);
    armR.add(shaft, headC);
  }

  const legL = new THREE.Group();
  legL.position.set(-0.19, 0.78, 0);
  const legLm = box(0.24, 0.78, 0.26, darkMat);
  legLm.position.y = -0.39;
  legL.add(legLm);
  const legR = new THREE.Group();
  legR.position.set(0.19, 0.78, 0);
  const legRm = box(0.24, 0.78, 0.26, darkMat);
  legRm.position.y = -0.39;
  legR.add(legRm);
  body.add(legL, legR);

  grp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  grp.scale.setScalar(o.scale);
  return { grp, body, armL, armR, legL, legR, materials: [skinMat, clothMat, darkMat] };
}

function createEnemy(type, x, z, floorN) {
  const cfg = ENEMY_TYPES[type];
  const hpScale = Math.pow(1.34, floorN - 1);
  const dmgScale = Math.pow(1.19, floorN - 1);
  const rig = buildHumanoid({
    skin: cfg.skin,
    cloth: cfg.cloth,
    scale: cfg.scale,
    weapon: type === 'ghoul' ? 'claw' : type === 'archer' ? 'bow' : 'club',
    eye: type === 'brute' ? 0xff4422 : type === 'archer' ? 0x88ccff : 0xffdd66,
  });
  const e = {
    type,
    cfg,
    mesh: rig.grp,
    rig,
    pos: new THREE.Vector3(x, 0, z),
    center: new THREE.Vector3(x, cfg.scale * 1.1, z),
    facing: rnd(Math.PI * 2),
    hp: Math.round(cfg.hp * hpScale),
    maxHp: Math.round(cfg.hp * hpScale),
    dmg: cfg.dmg * dmgScale,
    radius: cfg.radius,
    state: 'chase',
    stateT: rnd(0.2, 1),
    attackCd: rnd(0.5, 1.6),
    aggro: false,
    slowT: 0,
    flashT: 0,
    animPhase: rnd(10),
    kb: new THREE.Vector3(),
    stuckT: 0,
    dead: false,
    deathT: 0,
    removeT: 0,
    strafeDir: Math.random() < 0.5 ? -1 : 1,
    groundT: 0,
  };
  e.mesh.position.copy(e.pos);
  e.mesh.rotation.y = e.facing;
  G.scene.add(e.mesh);
  G.enemies.push(e);
  return e;
}

function spawnFloorEnemies(n) {
  const types = ['ghoul'];
  if (n >= 2) types.push('archer');
  if (n >= 3) types.push('brute', 'ghoul');
  if (n >= 4) types.push('brute', 'archer');
  const count = 6 + n * 3;
  const spawnR = 1;
  const cells = pickFloorCells(count, (c) => {
    if (dist(c.x, c.z, G.spawn.x, G.spawn.z) < 10) return false;
    if (G.stairs && dist(c.x, c.z, G.stairs.x, G.stairs.z) < 3) return false;
    return true;
  });
  for (const c of cells) createEnemy(pick(types), c.x, c.z, n);
}

function updateEnemies(dt) {
  const p = G.player;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { updateEnemyDeath(e, dt); continue; }
    if (e.flashT > 0) {
      e.flashT -= dt;
      const on = e.flashT > 0;
      e.rig.materials.forEach((m) => { m.emissive.setHex(on ? 0x882222 : 0x000000); m.emissiveIntensity = on ? 1.4 : 0; });
    }
    e.slowT = Math.max(0, e.slowT - dt);
    if (e.groundT > 0) { e.groundT -= dt; }

    const d = dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    if (!e.aggro && d < e.cfg.aggro && G.state === 'playing') e.aggro = true;

    let speed = e.cfg.speed * (e.slowT > 0 ? 0.45 : 1);

    if (e.isBoss && G.state === 'playing') {
      if (!p.dead) updateBoss(e, dt);
      e.mesh.position.set(e.pos.x, e.mesh.position.y, e.pos.z);
      e.mesh.rotation.y = approachAngle(e.mesh.rotation.y, e.facing, 8 * dt);
      e.center.set(e.pos.x, 2.4, e.pos.z);
      continue;
    }

    if (e.aggro && !p.dead) {
      if (e.cfg.ranged) updateArcher(e, d, dt, speed);
      else updateMelee(e, d, dt, speed);
    } else {
      e.state = 'chase';
      e.stateT -= dt;
      e.rig.legL.rotation.x = Math.sin(e.animPhase) * 0.15;
      e.rig.legR.rotation.x = -Math.sin(e.animPhase) * 0.15;
    }

    if (e.kb.lengthSq() > 0.001) {
      const kx = e.kb.x * dt, kz = e.kb.z * dt;
      moveEntity(e.pos, kx, kz, e.radius);
      e.kb.multiplyScalar(Math.exp(-8 * dt));
    }

    let sepX = 0, sepZ = 0;
    for (const o of G.enemies) {
      if (o === e || o.dead) continue;
      const dd = dist(e.pos.x, e.pos.z, o.pos.x, o.pos.z);
      const minD = e.radius + o.radius + 0.15;
      if (dd < minD && dd > 0.001) {
        sepX += (e.pos.x - o.pos.x) / dd * (minD - dd);
        sepZ += (e.pos.z - o.pos.z) / dd * (minD - dd);
      }
    }
    if (sepX || sepZ) moveEntity(e.pos, sepX * dt * 6, sepZ * dt * 6, e.radius);

    e.mesh.position.set(e.pos.x, e.mesh.position.y, e.pos.z);
    e.mesh.rotation.y = approachAngle(e.mesh.rotation.y, e.facing, 9 * dt);
    e.center.set(e.pos.x, e.cfg.scale * 1.1, e.pos.z);
  }
}

function animateEnemyWalk(e, amt, dt) {
  e.animPhase += dt * 7 * amt;
  const s = Math.sin(e.animPhase) * 0.55 * amt;
  e.rig.legL.rotation.x = s;
  e.rig.legR.rotation.x = -s;
  e.rig.body.position.y = Math.abs(Math.sin(e.animPhase)) * 0.05 * amt;
  if (e.state !== 'windup' && e.state !== 'strike') {
    e.rig.armL.rotation.x = expDamp(e.rig.armL.rotation.x, -s * 0.7, 10, dt);
    e.rig.armR.rotation.x = expDamp(e.rig.armR.rotation.x, s * 0.7, 10, dt);
  }
}

function steerToward(e, tx, tz, speed, dt) {
  const d = dist(e.pos.x, e.pos.z, tx, tz);
  if (d < 0.05) return;
  const ax = (tx - e.pos.x) / d, az = (tz - e.pos.z) / d;
  e.facing = Math.atan2(ax, az);
  const before = { x: e.pos.x, z: e.pos.z };
  moveEntity(e.pos, ax * speed * dt, az * speed * dt, e.radius);
  const moved = dist(before.x, before.z, e.pos.x, e.pos.z);
  if (moved < speed * dt * 0.4) e.stuckT += dt;
  else e.stuckT = Math.max(0, e.stuckT - dt * 2);
  if (e.stuckT > 0.35) {
    const side = Math.sin(e.animPhase * 2) > 0 ? 1 : -1;
    const px = -az * side, pz = ax * side;
    moveEntity(e.pos, px * speed * dt * 1.4, pz * speed * dt * 1.4, e.radius);
    if (e.stuckT > 1.2) e.stuckT = 0;
  }
}

function updateMelee(e, d, dt, speed) {
  if (e.state === 'windup') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) {
      e.state = 'strike';
      e.stateT = 0.16;
      strikeMelee(e);
    }
    return;
  }
  if (e.state === 'strike') {
    e.stateT -= dt;
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = e.cfg.recover;
    }
    return;
  }
  if (e.state === 'recover') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) e.state = 'chase';
    return;
  }
  if (d > e.cfg.range) {
    steerToward(e, G.player.pos.x, G.player.pos.z, speed, dt);
    animateEnemyWalk(e, 1, dt);
  } else {
    e.facing = angleTo(e.pos.x, e.pos.z, G.player.pos.x, G.player.pos.z);
    e.attackCd -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.attackCd <= 0) {
      e.state = 'windup';
      e.stateT = e.cfg.windup;
      e.attackCd = e.cfg.windup + e.cfg.recover + (e.cfg.slam ? 1.1 : 0.55);
      const teleR = e.cfg.range + 0.7;
      spawnTelegraph(e.pos.x, e.pos.z, teleR, e.cfg.windup, 0xff3020, e.facing, e.cfg.slam ? Math.PI * 2 : 2.5);
      sfx('telegraph');
    }
  }
}

function strikeMelee(e) {
  const p = G.player;
  const d = dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
  if (d > e.cfg.range + 0.5) return;
  const ang = angleTo(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
  let diff = Math.abs(ang - e.facing);
  while (diff > Math.PI) diff = Math.PI * 2 - diff;
  if (diff > 1.3) return;
  if (e.cfg.slam) {
    spawnRing(e.pos.x, e.pos.z, 0xff5030, e.cfg.range);
    shake(0.4);
    sfx('slam');
    burst(e.pos.x, 0.3, e.pos.z, 24, 0xc07040, 7, 0.5);
  } else {
    sfx('swing');
  }
  if (d <= e.cfg.range + 0.5) hurtPlayer(e.dmg, e.pos.x, e.pos.z);
}

function updateArcher(e, d, dt, speed) {
  const pref = e.cfg.pref;
  if (e.state === 'windup') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = e.cfg.recover;
      shootArrow(e);
    }
    return;
  }
  if (e.state === 'recover' || e.state === 'strike') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) e.state = 'chase';
    return;
  }
  e.facing = angleTo(e.pos.x, e.pos.z, G.player.pos.x, G.player.pos.z);
  if (d > pref + 1.5) {
    steerToward(e, G.player.pos.x, G.player.pos.z, speed, dt);
    animateEnemyWalk(e, 1, dt);
  } else if (d < pref - 1.5) {
    const ax = (e.pos.x - G.player.pos.x) / d, az = (e.pos.z - G.player.pos.z) / d;
    moveEntity(e.pos, -ax * speed * dt, -az * speed * dt, e.radius);
    animateEnemyWalk(e, 1, dt);
  } else {
    const px = Math.cos(e.animPhase * 0.4) * e.strafeDir;
    const pz = Math.sin(e.animPhase * 0.4) * e.strafeDir;
    moveEntity(e.pos, px * speed * 0.45 * dt, pz * speed * 0.45 * dt, e.radius);
    animateEnemyWalk(e, 0.5, dt);
    e.attackCd -= dt;
    if (e.attackCd <= 0 && lineOfSight(e.pos.x, e.pos.z, G.player.pos.x, G.player.pos.z)) {
      e.state = 'windup';
      e.stateT = e.cfg.windup;
      e.attackCd = e.cfg.windup + e.cfg.recover + rnd(0.6, 1.4);
      sfx('telegraph');
    }
  }
}

function shootArrow(e) {
  const p = G.player;
  const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  spawnProjectile(e.pos.x, 1.3, e.pos.z, (dx / d) * 15, (dz / d) * 15, e.dmg, false, 'arrow');
  sfx('shoot');
}

function spawnProjectile(x, y, z, vx, vz, dmg, fromPlayer, kind) {
  const isFire = kind === 'fire';
  const geo = isFire
    ? new THREE.SphereGeometry(0.34, 8, 6)
    : kind === 'boss'
      ? new THREE.OctahedronGeometry(0.4, 0)
      : new THREE.BoxGeometry(0.1, 0.1, 0.7);
  const mat = new THREE.MeshBasicMaterial({
    color: isFire ? 0xffa040 : kind === 'boss' ? 0xff4060 : 0xe0d8c0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  const dir = Math.atan2(vx, vz);
  mesh.rotation.y = dir;
  G.scene.add(mesh);
  const light = isFire ? new THREE.PointLight(0xff8030, 22, 12, 2) : null;
  if (light) { mesh.add(light); light.position.set(0, 0, 0); }
  G.projectiles.push({
    mesh, pos: mesh.position, vx, vz, dmg, fromPlayer, kind,
    life: 3.2, radius: isFire ? 0.5 : 0.35, light,
  });
  if (isFire) burst(x, y, z, 6, 0xffa040, 3, 0.3);
}

function updateProjectiles(dt) {
  for (let i = G.projectiles.length - 1; i >= 0; i--) {
    const pr = G.projectiles[i];
    pr.life -= dt;
    pr.pos.x += pr.vx * dt;
    pr.pos.z += pr.vz * dt;
    if (pr.kind === 'fire') pr.pos.y = 1.1 + Math.sin(performance.now() * 0.01) * 0.08;
    let done = pr.life <= 0;
    if (!done && isBlockedAt(pr.pos.x, pr.pos.z)) done = true;
    if (!done) {
      if (pr.fromPlayer) {
        for (const e of G.enemies) {
          if (e.dead) continue;
          if (dist(pr.pos.x, pr.pos.z, e.pos.x, e.pos.z) < pr.radius + e.radius) { done = true; break; }
        }
      } else if (!G.player.dead) {
        if (dist(pr.pos.x, pr.pos.z, G.player.pos.x, G.player.pos.z) < pr.radius + CFG.PLAYER_R + 0.1) {
          hurtPlayer(pr.dmg, pr.pos.x, pr.pos.z);
          done = true;
        }
      }
    }
    if (done) {
      if (pr.kind === 'fire') explodeFireball(pr.pos.x, pr.pos.z);
      else if (pr.kind === 'boss') {
        spawnRing(pr.pos.x, pr.pos.z, 0xff4060, 2.2);
        if (dist(pr.pos.x, pr.pos.z, G.player.pos.x, G.player.pos.z) < 2.4) hurtPlayer(pr.dmg, pr.pos.x, pr.pos.z);
      } else burst(pr.pos.x, 1, pr.pos.z, 5, 0xc0b8a0, 3, 0.3);
      G.scene.remove(pr.mesh);
      pr.mesh.geometry.dispose();
      pr.mesh.material.dispose();
      G.projectiles.splice(i, 1);
    }
  }
}

function explodeFireball(x, z) {
  sfx('explode');
  shake(0.3);
  spawnRing(x, z, 0xff9040, 2.8);
  burst(x, 0.6, z, 30, 0xffa040, 9, 0.6);
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (dist(x, z, e.pos.x, e.pos.z) < 2.9 + e.radius) {
      const { dmg, crit } = playerDamageTo(e);
      damageEnemy(e, dmg, crit, angleTo(x, z, e.pos.x, e.pos.z));
    }
  }
}

function damageEnemy(e, dmg, crit, fromAngle) {
  if (e.dead) return;
  e.hp -= dmg;
  e.aggro = true;
  e.flashT = 0.09;
  if (e.kb !== undefined) {
    e.kb.x += Math.sin(fromAngle) * (crit ? 5 : 2.4);
    e.kb.z += Math.cos(fromAngle) * (crit ? 5 : 2.4);
  }
  spawnFloatText(e.center.clone().add(new THREE.Vector3(rnd(-0.3, 0.3), 0.7, 0)), String(dmg), crit ? 'crit' : '');
  burst(e.pos.x, e.cfg.scale * 0.9, e.pos.z, crit ? 12 : 6, 0xc02030, 4.5, 0.4);
  if (crit) sfx('crit');
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  e.dead = true;
  e.deathT = 0;
  G.stats.kills++;
  sfx('enemyDie');
  burst(e.pos.x, e.cfg.scale, e.pos.z, 22, 0x8a1820, 6, 0.6);
  gainXp(Math.round(e.cfg.xp * (1 + (G.floor - 1) * 0.35)));
  dropLoot(e);
  if (e === G.boss) onBossDead();
}

function updateEnemyDeath(e, dt) {
  e.deathT += dt;
  const t = e.deathT;
  if (t < 0.5) {
    e.mesh.rotation.x = lerp(0, -Math.PI / 2, t / 0.5);
    e.mesh.position.y = Math.max(-0.2, -t * 0.4);
  } else {
    e.mesh.position.y -= dt * 0.5;
    e.mesh.traverse((m) => {
      if (m.isMesh && m.material && m.material.opacity !== undefined && m.material.transparent === false) {
        m.material.transparent = true;
      }
      if (m.isMesh && m.material) {
        m.material.opacity = clamp(1 - (t - 0.5) / 0.9, 0, 1);
        m.material.transparent = true;
      }
    });
  }
  if (t > 1.5) {
    G.scene.remove(e.mesh);
    const idx = G.enemies.indexOf(e);
    if (idx >= 0) G.enemies.splice(idx, 1);
    if (e === G.boss) G.boss = null;
  }
}

/* ---------------- boss ---------------- */

function buildBossMesh() {
  const rig = buildHumanoid({
    skin: 0xd8d0bc,
    cloth: 0x5a0e12,
    scale: 2.3,
    weapon: 'club',
    eye: 0xff2200,
  });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.35, metalness: 0.8, flatShading: true });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 6, 1, true), gold);
  crown.position.y = 2.0;
  rig.body.add(crown);
  for (let i = 0; i < 5; i++) {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), gold);
    const a = (i / 5) * Math.PI * 2;
    spike.position.set(Math.cos(a) * 0.28, 2.14, Math.sin(a) * 0.28);
    rig.body.add(spike);
  }
  const cape = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.1, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x3a0a10, roughness: 1, flatShading: true })
  );
  cape.position.set(0, 1.1, -0.3);
  cape.rotation.x = 0.15;
  rig.body.add(cape);
  rig.grp.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  return rig;
}

function spawnBoss() {
  const rig = buildBossMesh();
  const pos = G.bossSpawn || { x: G.spawn.x, z: G.spawn.z - 8 };
  const e = {
    type: 'boss',
    cfg: { radius: 1.3, scale: 2.3, range: 4.2, windup: 0.9, recover: 0.9, slam: true, aggro: 999, xp: 300 },
    mesh: rig.grp,
    rig,
    pos: new THREE.Vector3(pos.x, 0, pos.z),
    center: new THREE.Vector3(pos.x, 2.4, pos.z),
    facing: Math.PI,
    hp: 1500,
    maxHp: 1500,
    dmg: 26,
    radius: 1.3,
    state: 'idle',
    stateT: 1.2,
    attackCd: 2,
    summonCd: 8,
    aggro: false,
    slowT: 0,
    flashT: 0,
    animPhase: 0,
    kb: new THREE.Vector3(),
    stuckT: 0,
    dead: false,
    deathT: 0,
    phase: 1,
    charge: null,
    isBoss: true,
    groundT: 0,
    materials: rig.materials,
  };
  e.mesh.position.copy(e.pos);
  G.scene.add(e.mesh);
  G.enemies.push(e);
  G.boss = e;
  G.ui.bossBar.classList.add('on');
  sfx('bossRoar');
  shake(0.6);
  toast('The Bone Tyrant stirs...');
  return e;
}

function updateBoss(e, dt) {
  const p = G.player;
  const frac = e.hp / e.maxHp;
  const newPhase = frac > 0.66 ? 1 : frac > 0.3 ? 2 : 3;
  if (newPhase !== e.phase) {
    e.phase = newPhase;
    sfx('bossRoar');
    shake(0.7);
    spawnFloatText(e.center.clone(), newPhase === 2 ? 'THE TYRANT ROARS' : 'ENRAGED!', 'crit');
    if (newPhase === 2) e.summonCd = 0.5;
    if (newPhase === 3) { e.dmg *= 1.25; e.cfg.windup = 0.7; }
  }

  if (e.charge) {
    const c = e.charge;
    c.t += dt;
    const step = c.speed * dt;
    const nx = e.pos.x + c.dx * step, nz = e.pos.z + c.dz * step;
    if (isBlockedAt(nx + c.dx * e.radius, nz + c.dz * e.radius) || c.t > c.dur) {
      e.charge = null;
      sfx('slam');
      shake(0.5);
      spawnRing(e.pos.x, e.pos.z, 0xff4020, 3);
      burst(e.pos.x, 1, e.pos.z, 26, 0xff5030, 8, 0.6);
      if (dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z) < 3.2) hurtPlayer(e.dmg * 1.2, e.pos.x, e.pos.z);
    } else {
      e.pos.x = nx; e.pos.z = nz;
      e.facing = Math.atan2(c.dx, c.dz);
      if (dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z) < 2.1 && !c.hit) {
        c.hit = true;
        hurtPlayer(e.dmg, e.pos.x, e.pos.z);
      }
      burst(e.pos.x, 0.3, e.pos.z, 2, 0xff7040, 4, 0.25);
    }
    e.mesh.position.set(e.pos.x, 0, e.pos.z);
    e.mesh.rotation.y = e.facing;
    animateEnemyWalk(e, 1, dt);
    return;
  }

  const d = dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
  e.summonCd -= dt;

  if (e.state === 'windup') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = e.cfg.recover;
      bossStrike(e, d);
    }
    return;
  }
  if (e.state === 'recover') {
    e.stateT -= dt;
    animateEnemyWalk(e, 0, dt);
    if (e.stateT <= 0) e.state = 'chase';
    return;
  }

  e.attackCd -= dt;
  if (e.phase >= 2 && e.summonCd <= 0 && G.enemies.length < 14) {
    e.summonCd = e.phase === 3 ? 14 : 18;
    bossSummon(e);
    return;
  }

  if (d > e.cfg.range) {
    steerToward(e, p.pos.x, p.pos.z, e.cfg.speed, dt);
    animateEnemyWalk(e, 1, dt);
  } else {
    e.facing = angleTo(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    animateEnemyWalk(e, 0, dt);
    if (e.attackCd <= 0) {
      bossChooseAttack(e, d);
    }
  }
}

function bossChooseAttack(e, d) {
  const p = G.player;
  const opts = ['swipe', 'slam'];
  if (e.phase >= 2 && d > 6) opts.push('charge', 'charge');
  if (e.phase >= 3) opts.push('rain');
  const choice = pick(opts);
  if (choice === 'rain') { bossRain(e); return; }
  if (choice === 'charge') { bossCharge(e); return; }
  e.state = 'windup';
  e.stateT = e.cfg.windup;
  e.pendingAttack = choice;
  e.attackCd = e.cfg.windup + e.cfg.recover + (e.phase === 3 ? 1.1 : 1.8);
  const teleR = choice === 'slam' ? 6.5 : e.cfg.range + 0.8;
  spawnTelegraph(e.pos.x, e.pos.z, teleR, e.cfg.windup, 0xff2010, e.facing, choice === 'slam' ? Math.PI * 2 : 2.6);
  sfx('telegraph');
}

function bossStrike(e, d) {
  const p = G.player;
  const atk = e.pendingAttack || 'swipe';
  if (atk === 'slam') {
    spawnRing(e.pos.x, e.pos.z, 0xff4020, 6.5);
    shake(0.8);
    sfx('slam');
    burst(e.pos.x, 0.4, e.pos.z, 60, 0xff6030, 12, 0.8);
    if (dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z) < 6.6) hurtPlayer(e.dmg * 1.15, e.pos.x, e.pos.z);
  } else {
    sfx('swingHeavy');
    const dd = dist(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    if (dd < e.cfg.range + 1) {
      const ang = angleTo(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
      let diff = Math.abs(ang - e.facing);
      while (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 1.4) hurtPlayer(e.dmg, e.pos.x, e.pos.z);
    }
    spawnRing(e.pos.x + Math.sin(e.facing) * 2, e.pos.z + Math.cos(e.facing) * 2, 0xffa040, 3);
  }
}

function bossCharge(e) {
  const p = G.player;
  const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
  const d = Math.hypot(dx, dz) || 1;
  e.charge = { dx: dx / d, dz: dz / d, speed: 24, t: 0, dur: 1.1, hit: false };
  e.state = 'chase';
  sfx('bossRoar');
  spawnFloatText(e.center.clone(), 'CHARGE!', 'crit');
}

function bossRain(e) {
  const p = G.player;
  e.state = 'recover';
  e.stateT = 1.4;
  e.attackCd = 2.5;
  for (let i = 0; i < 6; i++) {
    const tx = p.pos.x + rnd(-5, 5), tz = p.pos.z + rnd(-5, 5);
    spawnHazard(tx, tz, 2.6, 1.3 + i * 0.12, e.dmg * 0.9, 0xff2040);
  }
}

function bossSummon(e) {
  sfx('bossRoar');
  spawnFloatText(e.center.clone(), 'ARISE!', 'crit');
  const n = e.phase === 3 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(0.5);
    const r = 4.5;
    const x = e.pos.x + Math.cos(a) * r, z = e.pos.z + Math.sin(a) * r;
    if (isBlockedAt(x, z)) continue;
    const g = createEnemy('ghoul', x, z, G.floor);
    g.aggro = true;
    spawnRing(x, z, 0xff3020, 2.5);
    burst(x, 0.5, z, 16, 0x8a1820, 6, 0.5);
  }
}

function onBossDead() {
  G.ui.bossBar.classList.remove('on');
  toast('The Bone Tyrant has fallen!');
  sfx('victory');
  shake(1);
  setTimeout(() => {
    if (G.state === 'playing') {
      G.state = 'victory';
      $('v-level').textContent = G.player.level;
      $('v-kills').textContent = G.stats.kills;
      $('v-gold').textContent = G.stats.gold;
      $('v-time').textContent = fmtTime(G.stats.time);
      G.ui.victory.classList.add('on');
    }
  }, 1600);
}
