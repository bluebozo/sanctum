function buildPlayerMesh() {
  const grp = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a878, roughness: 0.85, flatShading: true });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x7a2020, roughness: 0.9, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a222c, roughness: 0.95, flatShading: true });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa2b0, roughness: 0.35, metalness: 0.75, flatShading: true });
  const gold = new THREE.MeshStandardMaterial({ color: 0xc8a24a, roughness: 0.4, metalness: 0.7, flatShading: true });
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  const body = new THREE.Group();
  grp.add(body);

  const torso = box(0.72, 0.8, 0.44, cloth);
  torso.position.y = 1.2;
  torso.castShadow = true;
  const belt = box(0.76, 0.14, 0.48, gold);
  belt.position.y = 0.86;
  const head = box(0.36, 0.36, 0.36, skin);
  head.position.y = 1.82;
  head.castShadow = true;
  const helm = box(0.4, 0.2, 0.4, metal);
  helm.position.y = 1.97;
  const crest = box(0.06, 0.16, 0.42, cloth);
  crest.position.y = 2.08;
  body.add(torso, belt, head, helm, crest);

  for (const s of [-1, 1]) {
    const pauldron = box(0.3, 0.24, 0.4, metal);
    pauldron.position.set(s * 0.5, 1.52, 0);
    pauldron.castShadow = true;
    body.add(pauldron);
  }

  const armL = new THREE.Group();
  armL.position.set(-0.48, 1.45, 0);
  const armLm = box(0.2, 0.62, 0.2, dark);
  armLm.position.y = -0.31;
  armLm.castShadow = true;
  armL.add(armLm);
  const shield = box(0.1, 0.6, 0.46, metal);
  shield.position.set(-0.14, -0.4, 0);
  const shieldTrim = box(0.06, 0.64, 0.12, gold);
  shieldTrim.position.set(-0.17, -0.4, 0);
  armL.add(shield, shieldTrim);
  body.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.48, 1.45, 0);
  const armRm = box(0.2, 0.62, 0.2, dark);
  armRm.position.y = -0.31;
  armRm.castShadow = true;
  armR.add(armRm);
  const sword = new THREE.Group();
  const blade = box(0.09, 1.15, 0.2, metal);
  blade.position.y = -1.05;
  blade.castShadow = true;
  const guard = box(0.1, 0.09, 0.44, gold);
  guard.position.y = -0.5;
  const grip = box(0.08, 0.26, 0.08, dark);
  grip.position.y = -0.36;
  sword.add(blade, guard, grip);
  sword.position.set(0, -0.6, 0.1);
  sword.rotation.x = 0.1;
  armR.add(sword);
  body.add(armR);

  const legL = new THREE.Group();
  legL.position.set(-0.2, 0.82, 0);
  const legLm = box(0.26, 0.78, 0.28, dark);
  legLm.position.y = -0.39;
  legLm.castShadow = true;
  legL.add(legLm);
  const bootL = box(0.28, 0.16, 0.36, metal);
  bootL.position.set(0, -0.74, 0.04);
  legL.add(bootL);
  body.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.2, 0.82, 0);
  const legRm = box(0.26, 0.78, 0.28, dark);
  legRm.position.y = -0.39;
  legRm.castShadow = true;
  legR.add(legRm);
  const bootR = box(0.28, 0.16, 0.36, metal);
  bootR.position.set(0, -0.74, 0.04);
  legR.add(bootR);
  body.add(legR);

  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  return { grp, body, armL, armR, legL, legR, sword };
}

function createPlayer() {
  const rig = buildPlayerMesh();
  const p = {
    mesh: rig.grp,
    rig,
    pos: new THREE.Vector3(G.spawn.x, 0, G.spawn.z),
    facing: 0,
    level: 1,
    xp: 0,
    xpNext: 80,
    hp: CFG.PLAYER_HP,
    mana: CFG.PLAYER_MANA,
    potions: 3,
    base: {
      damage: 14,
      armor: 4,
      crit: 0.08,
      maxHp: CFG.PLAYER_HP,
      maxMana: CFG.PLAYER_MANA,
      atkSpeed: 1,
      speed: CFG.PLAYER_SPEED,
      lifeBonus: 0,
    },
    stats: null,
    equip: { weapon: null, armor: null, ring: null },
    bag: [],
    attackCd: 0,
    attackT: -1,
    swingDone: false,
    animPhase: 0,
    moveAmt: 0,
    leap: null,
    invulnT: 0,
    dead: false,
    skills: [
      { cd: 0, cdMax: 4.5, cost: 8, lvl: 1, name: 'Cleave' },
      { cd: 0, cdMax: 3.0, cost: 14, lvl: 1, name: 'Fireball' },
      { cd: 0, cdMax: 7.0, cost: 20, lvl: 3, name: 'Frost Nova' },
      { cd: 0, cdMax: 5.0, cost: 16, lvl: 5, name: 'Leap' },
    ],
    stats_: null,
  };
  p.mesh.position.copy(p.pos);
  G.player = p;
  G.scene.add(p.mesh);
  recomputeStats();
  p.hp = p.stats.maxHp;
  p.mana = p.stats.maxMana;
  return p;
}

function recomputeStats() {
  const p = G.player;
  const s = {
    damage: p.base.damage,
    armor: p.base.armor,
    crit: p.base.crit,
    maxHp: p.base.maxHp,
    maxMana: p.base.maxMana,
    atkSpeed: p.base.atkSpeed,
    speed: p.base.speed,
  };
  for (const slot of ['weapon', 'armor', 'ring']) {
    const it = p.equip[slot];
    if (!it) continue;
    for (const k in it.stats) s[k] = (s[k] || 0) + it.stats[k];
  }
  s.maxHp += (p.level - 1) * 14;
  s.maxMana += (p.level - 1) * 6;
  s.damage += (p.level - 1) * 2.5;
  s.armor += (p.level - 1) * 1;
  s.crit = Math.min(0.6, s.crit);
  s.atkSpeed = Math.min(2.2, s.atkSpeed);
  s.speed = Math.min(9, s.speed);
  s.maxHp = Math.round(s.maxHp);
  s.damage = Math.round(s.damage * 10) / 10;
  p.stats = s;
  p.hp = Math.min(p.hp, s.maxHp);
  p.mana = Math.min(p.mana, s.maxMana);
}

function playerDamageTo(e) {
  const p = G.player;
  const crit = Math.random() < p.stats.crit;
  const dmg = p.stats.damage * rnd(0.9, 1.12) * (crit ? 2 : 1);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}

function updatePlayer(dt) {
  const p = G.player;
  if (!p || p.dead) return;
  p.attackCd = Math.max(0, p.attackCd - dt);
  p.invulnT = Math.max(0, p.invulnT - dt);
  for (const s of p.skills) s.cd = Math.max(0, s.cd - dt);
  p.mana = Math.min(p.stats.maxMana, p.mana + CFG.MANA_REGEN * dt);

  if (p.leap) { updateLeap(dt); animatePlayer(dt, 0); return; }

  const keys = G.input.keys;
  let dx = 0, dz = 0;
  if (keys.KeyW || keys.ArrowUp) dz -= 1;
  if (keys.KeyS || keys.ArrowDown) dz += 1;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;

  const target = G.input.target;
  if (target && (target.dead || !G.enemies.includes(target))) G.input.target = null;

  let moving = false;
  const spd = p.stats.speed;

  if (dx || dz) {
    const len = Math.hypot(dx, dz);
    dx /= len; dz /= len;
    moveEntity(p.pos, dx * spd * dt, dz * spd * dt, CFG.PLAYER_R);
    p.facing = Math.atan2(dx, dz);
    moving = true;
  } else if (G.input.target) {
    const t = G.input.target;
    const d = dist(p.pos.x, p.pos.z, t.pos.x, t.pos.z);
    p.facing = approachAngle(p.facing, angleTo(p.pos.x, p.pos.z, t.pos.x, t.pos.z), 14 * dt);
    if (d > CFG.ATK_RANGE) {
      const ax = (t.pos.x - p.pos.x) / d, az = (t.pos.z - p.pos.z) / d;
      moveEntity(p.pos, ax * spd * dt, az * spd * dt, CFG.PLAYER_R);
      moving = true;
    } else if (p.attackCd <= 0 && p.attackT < 0) {
      startSwing(t);
    }
  } else if (G.input.path.length) {
    const wp = G.input.path[0];
    const d = dist(p.pos.x, p.pos.z, wp.x, wp.z);
    if (d < 0.45) {
      G.input.path.shift();
    } else {
      const ax = (wp.x - p.pos.x) / d, az = (wp.z - p.pos.z) / d;
      moveEntity(p.pos, ax * spd * dt, az * spd * dt, CFG.PLAYER_R);
      p.facing = Math.atan2(ax, az);
      moving = true;
    }
  } else {
    p.facing = approachAngle(p.facing, angleTo(p.pos.x, p.pos.z, G.input.aim.x, G.input.aim.z), 8 * dt);
  }

  p.mesh.position.set(p.pos.x, 0, p.pos.z);
  p.mesh.rotation.y = p.facing;

  if (p.attackT >= 0) {
    p.attackT += dt / 0.36;
    if (p.attackT >= 0.42 && !p.swingDone) {
      p.swingDone = true;
      applySwingHits();
    }
    if (p.attackT >= 1) p.attackT = -1;
  }

  animatePlayer(dt, moving ? 1 : 0);
}

function startSwing(target) {
  const p = G.player;
  p.attackT = 0;
  p.attackCd = CFG.ATK_CD / p.stats.atkSpeed;
  p.swingDone = false;
  if (target) p.facing = angleTo(p.pos.x, p.pos.z, target.pos.x, target.pos.z);
  sfx('swing');
}

function applySwingHits() {
  const p = G.player;
  let hitAny = false;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = dist(p.pos.x, p.pos.z, e.pos.x, e.pos.z);
    if (d > CFG.ATK_RANGE + e.radius) continue;
    const ang = Math.atan2(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    let diff = Math.abs(ang - p.facing);
    while (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 1.15) continue;
    const { dmg, crit } = playerDamageTo(e);
    damageEnemy(e, dmg, crit, p.facing);
    hitAny = true;
  }
  if (hitAny) sfx('hit');
}

function animatePlayer(dt, movingAmt) {
  const p = G.player;
  const rig = p.rig;
  p.moveAmt = expDamp(p.moveAmt, movingAmt, 12, dt);
  p.animPhase += dt * (4 + p.stats.speed * 0.9) * (0.25 + p.moveAmt * 0.75);
  const swing = Math.sin(p.animPhase) * 0.62 * p.moveAmt;
  rig.legL.rotation.x = swing;
  rig.legR.rotation.x = -swing;
  rig.armL.rotation.x = -swing * 0.7;
  rig.body.position.y = Math.abs(Math.sin(p.animPhase)) * 0.06 * p.moveAmt;
  rig.body.rotation.z = Math.sin(p.animPhase * 0.5) * 0.03 * p.moveAmt;

  if (p.attackT >= 0) {
    const t = p.attackT;
    let arm;
    if (t < 0.42) arm = lerp(-0.2, -2.5, t / 0.42);
    else arm = lerp(-2.5, 1.1, (t - 0.42) / 0.58);
    rig.armR.rotation.x = arm;
    rig.body.rotation.y = t < 0.42 ? lerp(0, -0.5, t / 0.42) : lerp(-0.5, 0.6, (t - 0.42) / 0.58);
  } else {
    rig.armR.rotation.x = expDamp(rig.armR.rotation.x, -swing * 0.5 - 0.15, 14, dt);
    rig.body.rotation.y = expDamp(rig.body.rotation.y, 0, 12, dt);
  }
}

function beginLeap(tx, tz) {
  const p = G.player;
  const from = p.pos.clone();
  const d = dist(from.x, from.z, tx, tz);
  const maxD = 11;
  let dirx = 0, dirz = 0;
  if (d > 0.01) { dirx = (tx - from.x) / d; dirz = (tz - from.z) / d; }
  const steps = Math.ceil(Math.min(d, maxD) / 0.3);
  let endD = Math.min(d, maxD);
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * endD;
    if (circleBlocked(from.x + dirx * t, from.z + dirz * t, CFG.PLAYER_R)) { endD = Math.max(0, (i - 1) * 0.3); break; }
  }
  p.leap = {
    from,
    to: new THREE.Vector3(from.x + dirx * endD, 0, from.z + dirz * endD),
    t: 0,
    dur: 0.42,
    hit: false,
  };
  p.invulnT = 0.5;
  sfx('leap');
}

function updateLeap(dt) {
  const p = G.player;
  const L = p.leap;
  L.t += dt / L.dur;
  const t = Math.min(1, L.t);
  p.pos.x = lerp(L.from.x, L.to.x, t);
  p.pos.z = lerp(L.from.z, L.to.z, t);
  p.mesh.position.set(p.pos.x, Math.sin(Math.PI * t) * 3.4, p.pos.z);
  if (t >= 1) {
    p.leap = null;
    p.mesh.position.y = 0;
    sfx('land');
    spawnRing(p.pos.x, p.pos.z, 0xffcf6a, 4.5);
    shake(0.45);
    burst(p.pos.x, 0.4, p.pos.z, 26, 0xd8b060, 7, 0.55);
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist(p.pos.x, p.pos.z, e.pos.x, e.pos.z) < 4.2 + e.radius) {
        const { dmg, crit } = playerDamageTo(e);
        damageEnemy(e, Math.round(dmg * 1.4), crit, angleTo(p.pos.x, p.pos.z, e.pos.x, e.pos.z));
      }
    }
  }
}

function hurtPlayer(amount, fromX, fromZ) {
  const p = G.player;
  if (!p || p.dead || p.invulnT > 0) return;
  const red = p.stats.armor / (p.stats.armor + 60);
  const dmg = Math.max(1, Math.round(amount * (1 - red)));
  p.hp -= dmg;
  p.invulnT = 0.25;
  spawnFloatText(p.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0)), '-' + dmg, 'taken');
  sfx('hurt');
  shake(0.3);
  flashHurt();
  if (fromX !== undefined) {
    const d = dist(p.pos.x, p.pos.z, fromX, fromZ) || 1;
    moveEntity(p.pos, ((p.pos.x - fromX) / d) * 0.5, ((p.pos.z - fromZ) / d) * 0.5, CFG.PLAYER_R);
    p.mesh.position.set(p.pos.x, 0, p.pos.z);
  }
  if (p.hp <= 0) { p.hp = 0; playerDie(); }
}

function usePotion() {
  const p = G.player;
  if (!p || p.dead || p.potions <= 0) return;
  if (p.hp >= p.stats.maxHp) { spawnFloatText(p.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)), 'FULL', 'info'); return; }
  p.potions--;
  const heal = Math.round(p.stats.maxHp * 0.42);
  p.hp = Math.min(p.stats.maxHp, p.hp + heal);
  spawnFloatText(p.mesh.position.clone().add(new THREE.Vector3(0, 2.2, 0)), '+' + heal, 'heal');
  burst(p.pos.x, 1, p.pos.z, 14, 0xff4a6a, 4, 0.5);
  sfx('potion');
  updateHUD();
}

function gainXp(n) {
  const p = G.player;
  p.xp += n;
  spawnFloatText(p.mesh.position.clone().add(new THREE.Vector3(0, 2.6, 0)), '+' + n + ' XP', 'xp');
  while (p.xp >= p.xpNext) {
    p.xp -= p.xpNext;
    p.level++;
    p.xpNext = Math.round(80 * Math.pow(p.level, 1.45));
    recomputeStats();
    p.hp = p.stats.maxHp;
    p.mana = p.stats.maxMana;
    sfx('levelup');
    spawnRing(p.pos.x, p.pos.z, 0xffe08a, 7);
    burst(p.pos.x, 1, p.pos.z, 40, 0xffd070, 9, 0.9);
    spawnFloatText(p.mesh.position.clone().add(new THREE.Vector3(0, 3.2, 0)), 'LEVEL ' + p.level, 'info');
    toast('Level ' + p.level + ' — you feel stronger');
    for (const s of p.skills) {
      if (s.lvl === p.level) toast('New skill unlocked: ' + s.name);
    }
  }
}
