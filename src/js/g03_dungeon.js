const geoFloor = new THREE.BoxGeometry(CFG.CELL, 0.5, CFG.CELL);
const geoWall = new THREE.BoxGeometry(CFG.CELL, 3.2, CFG.CELL);
const matFloor = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0.02, flatShading: true });
const matWall = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, flatShading: true });

function newGrid() {
  return { w: CFG.GRID_W, h: CFG.GRID_H, cells: new Uint8Array(CFG.GRID_W * CFG.GRID_H) };
}
function cellIndex(gx, gy, g = G.grid) { return gy * g.w + gx; }
function cellBlocked(gx, gy, g = G.grid) {
  if (gx < 0 || gy < 0 || gx >= g.w || gy >= g.h) return true;
  return g.cells[gy * g.w + gx] === 0;
}
function isBlockedAt(x, z, g = G.grid) { return cellBlocked(Math.floor(x / CFG.CELL), Math.floor(z / CFG.CELL), g); }
function circleBlocked(x, z, r, g = G.grid) {
  const gx0 = Math.floor((x - r) / CFG.CELL), gx1 = Math.floor((x + r) / CFG.CELL);
  const gy0 = Math.floor((z - r) / CFG.CELL), gy1 = Math.floor((z + r) / CFG.CELL);
  for (let gy = gy0; gy <= gy1; gy++)
    for (let gx = gx0; gx <= gx1; gx++)
      if (cellBlocked(gx, gy, g)) return true;
  return false;
}
function moveEntity(pos, dx, dz, r) {
  if (!circleBlocked(pos.x + dx, pos.z, r)) pos.x += dx;
  if (!circleBlocked(pos.x, pos.z + dz, r)) pos.z += dz;
}
function cellCenter(gx, gy) {
  return { x: gx * CFG.CELL + CFG.CELL / 2, z: gy * CFG.CELL + CFG.CELL / 2 };
}
function worldCell(x, z) {
  return { gx: Math.floor(x / CFG.CELL), gy: Math.floor(z / CFG.CELL) };
}
function carveRoom(g, r) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      g.cells[y * g.w + x] = 1;
}
function roomsOverlap(a, b) {
  return a.x - 2 < b.x + b.w + 2 && a.x + a.w + 2 > b.x - 2 &&
         a.y - 2 < b.y + b.h + 2 && a.y + a.h + 2 > b.y - 2;
}
function carveCorridor(g, a, b) {
  let x = a.x, y = a.y;
  const horizFirst = Math.random() < 0.5;
  const carveLine = (toX, toY) => {
    while (x !== toX) { g.cells[y * g.w + x] = 1; x += Math.sign(toX - x); }
    while (y !== toY) { g.cells[y * g.w + x] = 1; y += Math.sign(toY - y); }
  };
  if (horizFirst) { carveLine(b.x, y); carveLine(x, b.y); }
  else { carveLine(x, b.y); carveLine(b.x, y); }
  g.cells[y * g.w + x] = 1;
}

function generateFloor(n) {
  const g = newGrid();
  const rooms = [];
  if (n === CFG.FLOORS) {
    const w = 30, h = 22;
    const room = { x: Math.floor((g.w - w) / 2), y: Math.floor((g.h - h) / 2), w, h };
    carveRoom(g, room);
    rooms.push(room);
    for (const [px, py] of [[room.x + 3, room.y + 3], [room.x + room.w - 4, room.y + 3], [room.x + 3, room.y + room.h - 4], [room.x + room.w - 4, room.y + room.h - 4]]) {
      g.cells[py * g.w + px] = 0;
      g.cells[(py + 1) * g.w + px] = 0;
      g.cells[py * g.w + px + 1] = 0;
      g.cells[(py + 1) * g.w + px + 1] = 0;
    }
    for (let i = 0; i < 6; i++) {
      const cx = room.x + 6 + Math.floor(rnd(room.w - 12));
      const cy = room.y + 8 + Math.floor(rnd(room.h - 14));
      g.cells[cy * g.w + cx] = 0;
    }
  } else {
    const target = 7 + n;
    for (let attempt = 0; attempt < 90 && rooms.length < target; attempt++) {
      const rw = rndi(5, 10), rh = rndi(5, 10);
      const r = { x: rndi(2, g.w - rw - 3), y: rndi(2, g.h - rh - 3), w: rw, h: rh };
      if (rooms.some((o) => roomsOverlap(r, o))) continue;
      rooms.push(r);
      carveRoom(g, r);
    }
    for (let i = 1; i < rooms.length; i++) {
      const r = rooms[i];
      let best = rooms[0], bd = Infinity;
      for (let j = 0; j < i; j++) {
        const o = rooms[j];
        const d = Math.hypot(r.x - o.x, r.y - o.y);
        if (d < bd) { bd = d; best = o; }
      }
      const rc = () => ({ x: rndi(r.x, r.x + r.w - 1), y: rndi(r.y, r.y + r.h - 1) });
      const bc = () => ({ x: rndi(best.x, best.x + best.w - 1), y: rndi(best.y, best.y + best.h - 1) });
      carveCorridor(g, rc(), bc());
      if (Math.random() < 0.35 && i >= 2) {
        const o = rooms[rndi(0, i - 1)];
        carveCorridor(g, rc(), { x: rndi(o.x, o.x + o.w - 1), y: rndi(o.y, o.y + o.h - 1) });
      }
    }
    const corners = [[2, 2], [g.w - 3, 2], [2, g.h - 3], [g.w - 3, g.h - 3]];
    if (rooms.length >= 2) {
      for (const [cx, cy] of corners) carveCorridor(g, { x: cx, y: cy }, { x: rndi(1, g.w - 2), y: rndi(1, g.h - 2) });
    }
  }
  return { grid: g, rooms };
}

function pickFloorCells(count, filter) {
  const out = [];
  const g = G.grid;
  for (let t = 0; t < 4000 && out.length < count; t++) {
    const gx = rndi(1, g.w - 2), gy = rndi(1, g.h - 2);
    if (cellBlocked(gx, gy)) continue;
    const c = cellCenter(gx, gy);
    if (filter && !filter(c, gx, gy)) continue;
    if (out.some((p) => dist(p.x, p.z, c.x, c.z) < 6)) continue;
    out.push(c);
  }
  return out;
}

function roomCenter(r) { return cellCenter(r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)); }

function buildFloorGeometry(n) {
  const g = G.grid;
  const floorCells = [];
  const wallCells = [];
  for (let gy = 0; gy < g.h; gy++) {
    for (let gx = 0; gx < g.w; gx++) {
      if (g.cells[gy * g.w + gx] === 1) { floorCells.push([gx, gy]); continue; }
      let near = false;
      for (let oy = -1; oy <= 1 && !near; oy++)
        for (let ox = -1; ox <= 1; ox++) {
          const nx = gx + ox, ny = gy + oy;
          if (nx >= 0 && ny >= 0 && nx < g.w && ny < g.h && g.cells[ny * g.w + nx] === 1) { near = true; break; }
        }
      if (near) wallCells.push([gx, gy]);
    }
  }
  const baseHue = n === CFG.FLOORS ? 6 : 214 - n * 7;
  const baseSat = n === CFG.FLOORS ? 45 : 9;
  const baseLight = 25 - n * 1.5;

  const floorMesh = new THREE.InstancedMesh(geoFloor, matFloor, floorCells.length);
  floorMesh.receiveShadow = true;
  floorMesh.castShadow = false;
  const m4 = new THREE.Matrix4();
  const col = new THREE.Color();
  floorCells.forEach(([gx, gy], i) => {
    const c = cellCenter(gx, gy);
    m4.makeTranslation(c.x, -0.25, c.z);
    floorMesh.setMatrixAt(i, m4);
    const l = baseLight + rnd(-3.5, 3.5);
    col.setHSL((baseHue + rnd(-8, 8)) / 360, (baseSat + rnd(-4, 6)) / 100, l / 100);
    floorMesh.setColorAt(i, col);
  });
  floorMesh.instanceMatrix.needsUpdate = true;
  if (floorMesh.instanceColor) floorMesh.instanceColor.needsUpdate = true;

  const wallMesh = new THREE.InstancedMesh(geoWall, matWall, wallCells.length);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  wallCells.forEach(([gx, gy], i) => {
    const c = cellCenter(gx, gy);
    m4.makeTranslation(c.x, 1.35 + rnd(-0.06, 0.06), c.z);
    wallMesh.setMatrixAt(i, m4);
    const l = (baseLight - 9) + rnd(-3, 4);
    col.setHSL((baseHue + rnd(-10, 10)) / 360, (baseSat + 4) / 100, Math.max(4, l) / 100);
    wallMesh.setColorAt(i, col);
  });
  wallMesh.instanceMatrix.needsUpdate = true;
  if (wallMesh.instanceColor) wallMesh.instanceColor.needsUpdate = true;

  G.world.add(floorMesh);
  G.world.add(wallMesh);
  G.disposables.push(floorMesh, wallMesh);
}

function buildTorches(n) {
  const positions = pickFloorCells(n === CFG.FLOORS ? 4 : 4, (c) => {
    const { gx, gy } = worldCell(c.x, c.z);
    return cellBlocked(gx + 1, gy) || cellBlocked(gx - 1, gy) || cellBlocked(gx, gy + 1) || cellBlocked(gx, gy - 1);
  });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff7a20, emissiveIntensity: 3.2 });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1c, roughness: 1 });
  positions.forEach((p, i) => {
    const grp = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), poleMat);
    pole.position.y = 1.1;
    pole.castShadow = true;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.6, 6), flameMat.clone());
    flame.position.y = 2.4;
    grp.add(pole, flame);
    grp.position.set(p.x, 0, p.z);
    G.world.add(grp);
    let light = null;
    if (i < (n === CFG.FLOORS ? 3 : 3)) {
      light = new THREE.PointLight(0xff9040, 26, 22, 2);
      light.position.set(p.x, 2.6, p.z);
      G.scene.add(light);
    }
    G.torches.push({ flame, light, base: 26, seed: rnd(100) });
    G.disposables.push(grp, flame, pole);
  });
}

function buildStairs() {
  const p = G.stairs;
  const grp = new THREE.Group();
  const hole = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.1, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x02030a, roughness: 1 })
  );
  hole.position.y = 0.06;
  grp.add(hole);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x0a0a14, emissive: 0x3f80ff, emissiveIntensity: 2.4, roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(i % 2 === 0 ? 1.9 : 0.14, 0.1, i % 2 === 0 ? 0.14 : 1.9), rimMat);
    bar.position.set(i === 1 ? 0.9 : i === 3 ? -0.9 : 0, 0.1, i === 0 ? 0.9 : i === 2 ? -0.9 : 0);
    grp.add(bar);
  }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.8, 4, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x5f9fff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 2;
  grp.add(beam);
  grp.position.set(p.x, 0, p.z);
  G.world.add(grp);
  const light = new THREE.PointLight(0x5f9fff, 16, 14, 2);
  light.position.set(p.x, 2, p.z);
  G.scene.add(light);
  G.stairsFx = { grp, beam, light };
  G.disposables.push(grp, beam, light);
}

function disposeWorld() {
  for (const t of G.torches) {
    if (t.light) G.scene.remove(t.light);
  }
  G.torches = [];
  if (G.stairsFx) {
    G.scene.remove(G.stairsFx.light);
    G.stairsFx = null;
  }
  while (G.world.children.length) {
    const c = G.world.children.pop();
    G.world.remove(c);
    if (c.dispose) c.dispose();
    c.traverse && c.traverse((o) => { if (o.geometry && o.geometry !== geoFloor && o.geometry !== geoWall) o.geometry.dispose(); });
  }
  G.disposables = [];
}

function createFloor(n) {
  disposeWorld();
  const { grid, rooms } = generateFloor(n);
  G.grid = grid;
  G.rooms = rooms;
  G.disposables = [];
  buildFloorGeometry(n);
  buildTorches(n);

  const spawnRoom = rooms[0];
  const sp = roomCenter(spawnRoom);
  G.spawn = sp;

  if (n === CFG.FLOORS) {
    G.stairs = null;
    const bossRoom = rooms[0];
    G.bossSpawn = { x: bossRoom.x * CFG.CELL + CFG.CELL / 2 + (bossRoom.w * CFG.CELL) / 2, z: bossRoom.y * CFG.CELL + 4 };
    const brazierMat = new THREE.MeshStandardMaterial({ color: 0x140806, emissive: 0xff3010, emissiveIntensity: 2.6 });
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 1.1, 8), brazierMat);
      b.position.set(G.bossSpawn.x + sx * 9, 0.55, G.bossSpawn.z + 2);
      G.world.add(b);
      const l = new THREE.PointLight(0xff4020, 34, 30, 2);
      l.position.set(b.position.x, 2, b.position.z);
      G.scene.add(l);
      G.torches.push({ flame: b, light: l, base: 34, seed: rnd(100) });
      G.disposables.push(b, l);
    }
  } else {
    let far = rooms[0], fd = -1;
    for (const r of rooms) {
      const c = roomCenter(r);
      const d = dist(c.x, c.z, sp.x, sp.z);
      if (d > fd) { fd = d; far = r; }
    }
    G.stairs = roomCenter(far);
    buildStairs();
  }
  return { spawn: sp, rooms };
}

function lineOfSight(x0, z0, x1, z1) {
  const d = dist(x0, z0, x1, z1);
  const steps = Math.ceil(d / 0.3);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isBlockedAt(lerp(x0, x1, t), lerp(z0, z1, t))) return false;
  }
  return true;
}

class MinHeap {
  constructor() { this.a = []; }
  push(node) {
    const a = this.a;
    a.push(node);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return null;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let s = i;
        if (l < a.length && a[l].f < a[s].f) s = l;
        if (r < a.length && a[r].f < a[s].f) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

function nearestFloorCell(gx, gy, maxR = 6) {
  if (!cellBlocked(gx, gy)) return { gx, gy };
  for (let r = 1; r <= maxR; r++) {
    for (let oy = -r; oy <= r; oy++)
      for (let ox = -r; ox <= r; ox++) {
        if (Math.abs(ox) !== r && Math.abs(oy) !== r) continue;
        if (!cellBlocked(gx + ox, gy + oy)) return { gx: gx + ox, gy: gy + oy };
      }
  }
  return null;
}

function findPath(x0, z0, x1, z1) {
  const g = G.grid;
  let a = worldCell(x0, z0), b = worldCell(x1, z1);
  a = nearestFloorCell(a.gx, a.gy);
  b = nearestFloorCell(b.gx, b.gy);
  if (!a || !b) return [];
  if (a.gx === b.gx && a.gy === b.gy) return [{ x: x1, z: z1 }];
  const W = g.w;
  const open = new MinHeap();
  const came = new Map();
  const gScore = new Map();
  const startK = a.gy * W + a.gx;
  gScore.set(startK, 0);
  open.push({ gx: a.gx, gy: a.gy, f: 0 });
  const goalK = b.gy * W + b.gx;
  const H = (gx, gy) => {
    const dx = Math.abs(gx - b.gx), dy = Math.abs(gy - b.gy);
    return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  let found = false;
  let guard = 0;
  while (open.a.length && guard++ < 6000) {
    const cur = open.pop();
    const ck = cur.gy * W + cur.gx;
    if (ck === goalK) { found = true; break; }
    const cg = gScore.get(ck) ?? Infinity;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = cur.gx + ox, ny = cur.gy + oy;
        if (cellBlocked(nx, ny)) continue;
        if (ox && oy && (cellBlocked(cur.gx + ox, cur.gy) || cellBlocked(cur.gx, cur.gy + oy))) continue;
        const nk = ny * W + nx;
        const ng = cg + (ox && oy ? Math.SQRT2 : 1);
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, ck);
          open.push({ gx: nx, gy: ny, f: ng + H(nx, ny) });
        }
      }
    }
  }
  if (!found) return [];
  const cells = [];
  let k = goalK;
  while (k !== startK) {
    cells.push({ gx: k % W, gy: Math.floor(k / W) });
    if (!came.has(k)) return [];
    k = came.get(k);
  }
  cells.reverse();
  let pts = cells.map((c) => cellCenter(c.gx, c.gy));
  pts.push({ x: x1, z: z1 });
  const smooth = [pts[0]];
  let anchor = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    if (!lineOfSight(anchor.x, anchor.z, pts[i].x, pts[i].z)) {
      anchor = pts[i - 1];
      smooth.push(pts[i - 1]);
    }
  }
  smooth.push(pts[pts.length - 1]);
  return smooth;
}
