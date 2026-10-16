const RARITY = ['common', 'magic', 'rare', 'legendary'];
const RARITY_COLOR = [0xcfcabd, 0x6f9dff, 0xc86bff, 0xff9d3e];
const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armor', ring: 'Ring' };
const BASE_NAMES = {
  weapon: ['Shortsword', 'War Axe', 'Blade', 'Falchion', 'Mace', 'Claymore', 'Hook Blade'],
  armor: ['Leather Vest', 'Chainmail', 'Cuirass', 'Hauberk', 'Bone Plate'],
  ring: ['Bone Ring', 'Iron Band', 'Signet', 'Grave Loop'],
};
const PREFIX = ['Bloody', 'Frozen', 'Storm', 'Grim', 'Hallowed', 'Runic', 'Savage', 'Void-Touched', 'Wretched'];
const RARE_A = ['Doom', 'Soul', 'Blood', 'Dread', 'Royal', 'Iron'];
const RARE_B = ['of Ruin', 'of the Wyrm', 'of Embers', 'of the Abyss', 'of Kings', 'of Silence'];
const LEGENDARY = {
  weapon: ['Fang of the Ruined King', 'Ashbringer', 'Soulrender', 'Mourneblade', 'Kingsblood'],
  armor: ['Shroud of the Fallen', 'Aegis of Ash', 'Plate of the Cryptlord', 'Mantle of Woe'],
  ring: ['Eye of the Void', 'Band of the Lich King', 'Ember Coil', 'Ring of Hollow Stars'],
};
const ICON_SVG = {
  weapon: '<svg viewBox="0 0 48 48"><path d="M34 6l8 8-22 22-8-8z" fill="currentColor" opacity=".85"/><path d="M12 34l-4 8 8-4z" fill="currentColor"/><path d="M14 32l4 4" stroke="#000" stroke-width="2" opacity=".4"/></svg>',
  armor: '<svg viewBox="0 0 48 48"><path d="M24 6l14 6v10c0 10-6 16-14 20-8-4-14-10-14-20V12z" fill="currentColor" opacity=".85"/><path d="M24 12v24" stroke="#000" stroke-width="2" opacity=".35"/></svg>',
  ring: '<svg viewBox="0 0 48 48"><circle cx="24" cy="28" r="12" fill="none" stroke="currentColor" stroke-width="6" opacity=".9"/><path d="M24 6l6 8H18z" fill="currentColor"/></svg>',
  potion: '<svg viewBox="0 0 48 48"><path d="M20 6h8v8l7 14a10 10 0 0 1-9 15h-4a10 10 0 0 1-9-15l7-14z" fill="#3a1018" stroke="#c8b090" stroke-width="2.4"/><path d="M15 30h18a8 8 0 0 1-7 12h-4a8 8 0 0 1-7-12z" fill="#e0304a"/></svg>',
};

let itemSeq = 1;

function weightedRarity(floorN) {
  const w = [52 - floorN * 4, 30, 11 + floorN * 1.5, 2 + floorN * 1.4];
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; }
  return 0;
}

function rollStat(slot, rarity, floorN, primary) {
  const scale = (1 + (floorN - 1) * 0.38) * (1 + rarity * 0.55);
  const pools = {
    weapon: { damage: [4, 9], atkSpeed: [0.04, 0.1], crit: [0.015, 0.04], speed: [0.2, 0.5] },
    armor: { armor: [4, 9], maxHp: [14, 30], speed: [0.15, 0.4], crit: [0.01, 0.025] },
    ring: { crit: [0.02, 0.05], maxMana: [8, 18], damage: [2, 5], maxHp: [8, 18] },
  };
  const keys = Object.keys(pools[slot]);
  const key = primary || pick(keys);
  const [a, b] = pools[slot][key];
  let v = rnd(a, b) * scale;
  if (key === 'crit') v = Math.round(v * 1000) / 1000;
  else if (key === 'atkSpeed' || key === 'speed') v = Math.round(v * 100) / 100;
  else v = Math.round(v);
  return [key, Math.max(key === 'crit' ? 0.005 : 1, v)];
}

function genItem(floorN, forcedSlot) {
  const slot = forcedSlot || pick(['weapon', 'armor', 'ring']);
  const rarity = weightedRarity(floorN);
  const affixCount = [1, 2, 3, 4][rarity];
  const primary = slot === 'weapon' ? 'damage' : slot === 'armor' ? 'armor' : 'crit';
  const stats = {};
  const used = new Set();
  for (let i = 0; i < affixCount; i++) {
    const [k, v] = rollStat(slot, rarity, floorN, i === 0 ? primary : null);
    if (used.has(k)) continue;
    used.add(k);
    stats[k] = (stats[k] || 0) + v;
  }
  if (!(primary in stats)) {
    const [k, v] = rollStat(slot, rarity, floorN, primary);
    stats[k] = v;
  }
  let name;
  if (rarity === 0) name = pick(BASE_NAMES[slot]);
  else if (rarity === 1) name = pick(PREFIX) + ' ' + pick(BASE_NAMES[slot]).toLowerCase();
  else if (rarity === 2) name = pick(RARE_A) + pick(['', '', 'born', 'forged']) + ' ' + pick(BASE_NAMES[slot]).toLowerCase() + ' ' + pick(RARE_B);
  else name = pick(LEGENDARY[slot]);
  return { id: itemSeq++, slot, rarity, name, stats };
}

function itemScore(it) {
  if (!it) return 0;
  let s = 0;
  const w = { damage: 3, armor: 2, crit: 90, maxHp: 0.7, maxMana: 0.5, atkSpeed: 60, speed: 14 };
  for (const k in it.stats) s += it.stats[k] * (w[k] || 1);
  return Math.round(s);
}

function statLabel(k) {
  return {
    damage: 'Damage', armor: 'Armor', crit: 'Crit Chance', maxHp: 'Max Health',
    maxMana: 'Max Mana', atkSpeed: 'Attack Speed', speed: 'Move Speed',
  }[k] || k;
}
function statValue(k, v) {
  if (k === 'crit' || k === 'atkSpeed') return '+' + Math.round(v * 100) + '%';
  if (k === 'speed') return '+' + v;
  return '+' + v;
}

function makeDropMesh(kind, color) {
  const grp = new THREE.Group();
  const core = new THREE.Mesh(
    kind === 'gold' ? new THREE.OctahedronGeometry(0.22, 0) : new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5, emissive: color, emissiveIntensity: kind === 'gold' ? 0.7 : 0.35, flatShading: true })
  );
  core.castShadow = true;
  grp.add(core);
  if (kind !== 'gold') {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 3.2, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
    );
    beam.position.y = 1.4;
    grp.add(beam);
    if (color === RARITY_COLOR[3]) {
      const l = new THREE.PointLight(0xff9d3e, 22, 12, 2);
      l.position.y = 1;
      grp.add(l);
    }
  }
  return grp;
}

function spawnDrop(x, z, payload) {
  const mesh = makeDropMesh(payload.kind, payload.color);
  mesh.position.set(x, 0.6, z);
  G.scene.add(mesh);
  G.drops.push({ mesh, pos: mesh.position, kind: payload.kind, item: payload.item || null, amount: payload.amount || 0, color: payload.color, t: rnd(10), life: 60 });
}

function dropLoot(e) {
  const f = G.floor;
  let gold = Math.round(rnd(e.cfg.gold ? e.cfg.gold[0] : 5, e.cfg.gold ? e.cfg.gold[1] : 12) * (1 + f * 0.5));
  if (e.isBoss) gold = 400;
  const scatter = e.cfg.radius || 0.5;
  spawnDrop(e.pos.x + rnd(-scatter, scatter), e.pos.z + rnd(-scatter, scatter), { kind: 'gold', color: 0xffd24a, amount: gold });

  let itemChance = e.isBoss ? 1 : e.type === 'brute' ? 0.55 : 0.32;
  if (Math.random() < itemChance) {
    const it = genItem(f, null);
    spawnDrop(e.pos.x + rnd(-1, 1), e.pos.z + rnd(-1, 1), { kind: 'item', color: RARITY_COLOR[it.rarity], item: it });
    if (it.rarity >= 2) sfx('rare');
  }
  if (Math.random() < 0.07) {
    spawnDrop(e.pos.x + rnd(-0.8, 0.8), e.pos.z + rnd(-0.8, 0.8), { kind: 'potion', color: 0xe0304a, amount: 1 });
  }
  if (e.isBoss) {
    for (let i = 0; i < 3; i++) {
      const it = genItem(f, i === 0 ? 'weapon' : null);
      spawnDrop(e.pos.x + rnd(-2, 2), e.pos.z + rnd(-2, 2), { kind: 'item', color: RARITY_COLOR[it.rarity], item: it });
    }
    spawnDrop(e.pos.x, e.pos.z + 2, { kind: 'potion', color: 0xe0304a, amount: 3 });
  }
}

function updateDrops(dt) {
  const p = G.player;
  if (!p) return;
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t += dt;
    d.life -= dt;
    d.mesh.rotation.y += dt * 1.8;
    d.mesh.position.y = 0.55 + Math.sin(d.t * 2.6) * 0.12;
    const dd = dist(d.pos.x, d.pos.z, p.pos.x, p.pos.z);
    if (d.kind === 'gold' && dd < 3.6 && dd > 0.05) {
      const step = Math.min(dd, (3 + (3.6 - dd) * 7) * dt);
      d.pos.x += ((p.pos.x - d.pos.x) / dd) * step;
      d.pos.z += ((p.pos.z - d.pos.z) / dd) * step;
    }
    if (dd < 1.5) {
      if (d.kind === 'gold') {
        G.stats.gold += d.amount;
        spawnFloatText(d.pos.clone().add(new THREE.Vector3(0, 1, 0)), '+' + d.amount + ' gold', 'xp');
        sfx('coin');
        removeDrop(i);
        continue;
      }
      if (d.kind === 'potion') {
        const before = p.potions;
        p.potions = Math.min(6, p.potions + d.amount);
        if (p.potions > before) {
          toast('Potion acquired (' + p.potions + ')');
          sfx('pickup');
        } else toast('Already carrying maximum potions');
        removeDrop(i);
        updateHUD();
        continue;
      }
      if (d.kind === 'item') {
        if (giveItem(d.item)) {
          toast(d.item.name);
          sfx(d.item.rarity >= 2 ? 'rare' : 'pickup');
          removeDrop(i);
          if (G.inventoryOpen) renderInventory();
          continue;
        }
      }
    }
    if (d.life <= 0) removeDrop(i);
  }
}

function removeDrop(i) {
  const d = G.drops[i];
  G.scene.remove(d.mesh);
  d.mesh.traverse((o) => {
    if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); }
  });
  G.drops.splice(i, 1);
}

function giveItem(item) {
  const p = G.player;
  const cur = p.equip[item.slot];
  if (!cur || itemScore(item) > itemScore(cur)) {
    if (cur) p.bag.push(cur);
    p.equip[item.slot] = item;
    recomputeStats();
    if (!cur) toast('Equipped ' + item.name);
    else toast('Equipped ' + item.name + ' (replaced ' + cur.name + ')');
    updateHUD();
    return true;
  }
  if (p.bag.length < CFG.BAG_SIZE) {
    p.bag.push(item);
    updateHUD();
    return true;
  }
  if (performance.now() - (G._fullToast || 0) > 3500) {
    G._fullToast = performance.now();
    toast('Pack is full — ' + item.name + ' left behind');
  }
  return false;
}

function equipFromBag(idx) {
  const p = G.player;
  const item = p.bag[idx];
  if (!item) return;
  const cur = p.equip[item.slot];
  p.equip[item.slot] = item;
  if (cur) p.bag[idx] = cur;
  else p.bag.splice(idx, 1);
  recomputeStats();
  sfx('pickup');
  renderInventory();
  updateHUD();
}

function unequip(slot) {
  const p = G.player;
  const item = p.equip[slot];
  if (!item) return;
  if (p.bag.length >= CFG.BAG_SIZE) { toast('Pack is full'); return; }
  p.bag.push(item);
  p.equip[slot] = null;
  recomputeStats();
  sfx('pickup');
  renderInventory();
  updateHUD();
}

function toggleInventory() {
  G.inventoryOpen = !G.inventoryOpen;
  G.ui.inventory.classList.toggle('on', G.inventoryOpen);
  if (G.inventoryOpen) renderInventory();
  sfx('click');
}

function showTooltip(item, x, y) {
  const tip = G.ui.tooltip;
  const cls = 'r-' + RARITY[item.rarity];
  let html = '<div class="tname ' + cls + '">' + item.name + '</div>';
  html += '<div class="ttype">' + RARITY[item.rarity].toUpperCase() + ' ' + SLOT_NAMES[item.slot] + '</div>';
  html += '<div class="tstat">';
  for (const k in item.stats) html += statLabel(k) + ' ' + statValue(k, item.stats[k]) + '<br>';
  html += '</div><div class="tscore">Score ' + itemScore(item) + '</div>';
  tip.innerHTML = html;
  tip.style.display = 'block';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = clamp(x + 16, 8, window.innerWidth - w - 8) + 'px';
  tip.style.top = clamp(y - h - 12, 8, window.innerHeight - h - 8) + 'px';
}
function hideTooltip() { G.ui.tooltip.style.display = 'none'; }

function renderInventory() {
  const p = G.player;
  const grid = G.ui.bagGrid;
  grid.innerHTML = '';
  for (let i = 0; i < CFG.BAG_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const item = p.bag[i];
    if (item) {
      cell.classList.add('bg-r-' + RARITY[item.rarity]);
      const ico = document.createElement('div');
      ico.innerHTML = ICON_SVG[item.slot];
      ico.style.color = '#' + RARITY_COLOR[item.rarity].toString(16).padStart(6, '0');
      ico.style.width = '64%';
      ico.style.height = '64%';
      cell.appendChild(ico);
      cell.addEventListener('click', () => equipFromBag(i));
      cell.addEventListener('mousemove', (e) => showTooltip(item, e.clientX, e.clientY));
      cell.addEventListener('mouseleave', hideTooltip);
    }
    grid.appendChild(cell);
  }
  for (const slot of ['weapon', 'armor', 'ring']) {
    const el = $('eq-' + slot);
    const item = p.equip[slot];
    el.className = 'eq-slot' + (item ? ' filled bg-r-' + RARITY[item.rarity] : '');
    el.innerHTML = '<span class="lab">' + slot.toUpperCase() + '</span>';
    const ico = document.createElement('div');
    ico.className = 'ico';
    ico.innerHTML = ICON_SVG[slot];
    ico.style.color = item ? '#' + RARITY_COLOR[item.rarity].toString(16).padStart(6, '0') : '#5a5248';
    const txt = document.createElement('div');
    txt.className = 'txt';
    txt.textContent = item ? item.name : 'empty';
    if (item) txt.classList.add('r-' + RARITY[item.rarity]);
    el.appendChild(ico);
    el.appendChild(txt);
    if (item) {
      el.onclick = () => unequip(slot);
      el.onmousemove = (e) => showTooltip(item, e.clientX, e.clientY);
      el.onmouseleave = hideTooltip;
    } else {
      el.onclick = null;
      el.onmousemove = null;
      el.onmouseleave = hideTooltip;
    }
  }
  const s = p.stats;
  const rows = [
    ['Damage', Math.round(s.damage * 10) / 10],
    ['Armor', Math.round(s.armor)],
    ['Crit', Math.round(s.crit * 100) + '%'],
    ['Max Health', s.maxHp],
    ['Max Mana', s.maxMana],
    ['Atk Speed', Math.round(s.atkSpeed * 100) + '%'],
    ['Move Speed', Math.round(s.speed * 10) / 10],
    ['Gold', G.stats.gold],
  ];
  G.ui.statsList.innerHTML = rows.map(([k, v]) => '<div class="st"><span>' + k + '</span><b>' + v + '</b></div>').join('');
}
