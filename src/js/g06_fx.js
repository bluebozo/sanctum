const MAX_PARTICLES = 900;
let particleMesh = null;
const particles = [];
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

function initFX() {
  particleMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.17, 0.17, 0.17),
    new THREE.MeshBasicMaterial({ toneMapped: false }),
    MAX_PARTICLES
  );
  particleMesh.frustumCulled = false;
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  G.scene.add(particleMesh);
  dummy.scale.setScalar(0);
  dummy.updateMatrix();
  for (let i = 0; i < MAX_PARTICLES; i++) particleMesh.setMatrixAt(i, dummy.matrix);
  particleMesh.instanceMatrix.needsUpdate = true;
  G.rings = [];
  G.hazards = [];
  G.ftexts = [];
  G.ftextPool = [];
}

function burst(x, y, z, count, color, speed, ttl) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const a = rnd(Math.PI * 2);
    const up = rnd(0.4, 1.6);
    const s = speed * rnd(0.4, 1.25);
    particles.push({
      x, y, z,
      vx: Math.cos(a) * s * rnd(0.3, 1),
      vy: up * s * 0.55,
      vz: Math.sin(a) * s * rnd(0.3, 1),
      life: 0,
      ttl: ttl * rnd(0.6, 1.3),
      size: rnd(0.6, 1.6),
      col: new THREE.Color(color),
      grav: rnd(6, 14),
    });
  }
}

function updateParticles(dt) {
  if (!particleMesh) return;
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.ttl) { particles.splice(i, 1); continue; }
    p.vy -= p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
  }
  const n = particles.length;
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    const f = 1 - p.life / p.ttl;
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.setScalar(p.size * (0.4 + f * 0.8));
    dummy.rotation.set(p.life * 6, p.life * 4, 0);
    dummy.updateMatrix();
    particleMesh.setMatrixAt(i, dummy.matrix);
    tmpColor.copy(p.col).multiplyScalar(0.35 + f * 0.9);
    particleMesh.setColorAt(i, tmpColor);
  }
  for (let i = n; i < MAX_PARTICLES; i++) {
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    particleMesh.setMatrixAt(i, dummy.matrix);
  }
  particleMesh.instanceMatrix.needsUpdate = true;
  if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
}

const ringGeo = new THREE.RingGeometry(0.86, 1, 44);
const ringGeoArcCache = new Map();
function arcGeo(arc) {
  const key = arc.toFixed(2);
  if (!ringGeoArcCache.has(key)) {
    const start = Math.PI / 2 - arc / 2;
    ringGeoArcCache.set(key, new THREE.RingGeometry(0.7, 1, 32, 1, start, arc));
  }
  return ringGeoArcCache.get(key);
}

function makeGroundRing(color, arc) {
  const geo = arc >= Math.PI * 2 - 0.01 ? ringGeo : arcGeo(arc);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function spawnRing(x, z, color, maxR) {
  const mesh = makeGroundRing(color, Math.PI * 2);
  mesh.position.set(x, 0.07, z);
  mesh.scale.setScalar(0.3);
  G.scene.add(mesh);
  G.rings.push({ mesh, t: 0, ttl: 0.5, maxR });
}

function spawnTelegraph(x, z, r, delay, color, facing = 0, arc = Math.PI * 2, dmg = 0) {
  const mesh = makeGroundRing(color, arc);
  if (arc < Math.PI * 2 - 0.01) mesh.rotation.z = facing - Math.PI;
  mesh.position.set(x, 0.06, z);
  mesh.scale.setScalar(r * 0.6);
  G.scene.add(mesh);
  G.hazards.push({ mesh, x, z, r, t: 0, delay, dmg, color, arc });
}

function spawnHazard(x, z, r, delay, dmg, color) {
  spawnTelegraph(x, z, r, delay, color, 0, Math.PI * 2, dmg);
  sfx('telegraph');
}

function updateHazards(dt) {
  for (let i = G.hazards.length - 1; i >= 0; i--) {
    const h = G.hazards[i];
    h.t += dt;
    const f = clamp(h.t / h.delay, 0, 1);
    const pulse = 0.75 + Math.sin(h.t * (10 + f * 22)) * 0.12;
    h.mesh.scale.setScalar(h.r * (0.55 + f * 0.45) * (h.arc < 6 ? 1 : pulse));
    h.mesh.material.opacity = 0.35 + f * 0.55;
    if (h.t >= h.delay) {
      if (h.dmg > 0) {
        const d = dist(h.x, h.z, G.player.pos.x, G.player.pos.z);
        if (d < h.r + CFG.PLAYER_R) hurtPlayer(h.dmg, h.x, h.z);
        burst(h.x, 0.3, h.z, 26, h.color, 8, 0.55);
        spawnRing(h.x, h.z, h.color, h.r);
        shake(0.4);
        sfx('slam');
      } else {
        burst(h.x, 0.1, h.z, 6, h.color, 4, 0.3);
      }
      G.scene.remove(h.mesh);
      h.mesh.material.dispose();
      G.hazards.splice(i, 1);
    }
  }
}

function updateRings(dt) {
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const r = G.rings[i];
    r.t += dt;
    const f = r.t / r.ttl;
    if (f >= 1) {
      G.scene.remove(r.mesh);
      r.mesh.material.dispose();
      G.rings.splice(i, 1);
      continue;
    }
    r.mesh.scale.setScalar(lerp(0.3, r.maxR, Math.pow(f, 0.55)));
    r.mesh.material.opacity = (1 - f) * 0.9;
  }
}

function spawnFloatText(worldPos, text, cls = '') {
  let item = G.ftextPool.pop();
  if (!item) {
    const el = document.createElement('div');
    el.className = 'ft';
    G.ui.ftext.appendChild(el);
    item = { el };
  }
  item.el.className = 'ft ' + cls;
  item.el.textContent = text;
  item.el.style.opacity = '1';
  item.pos = worldPos.clone();
  item.t = 0;
  item.ttl = cls === 'crit' ? 1.25 : 1.0;
  item.offX = rnd(-14, 14);
  G.ftexts.push(item);
}

const proj = { x: 0, y: 0, behind: false };
function updateFloatTexts(dt) {
  for (let i = G.ftexts.length - 1; i >= 0; i--) {
    const f = G.ftexts[i];
    f.t += dt;
    if (f.t >= f.ttl) {
      f.el.style.opacity = '0';
      G.ftexts.splice(i, 1);
      G.ftextPool.push(f);
      continue;
    }
    f.pos.y += dt * 1.5;
    worldToScreen(f.pos, proj);
    if (proj.behind) { f.el.style.opacity = '0'; continue; }
    const k = f.t / f.ttl;
    const opacity = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    f.el.style.opacity = String(opacity);
    f.el.style.transform = `translate3d(${proj.x + f.offX - 20}px, ${proj.y - 40 - k * 46}px, 0) scale(${1 + Math.min(0.35, f.t * 2)})`;
  }
}

function shake(amount) {
  G.shake = Math.min(1.2, (G.shake || 0) + amount);
}

function flashHurt() {
  const v = G.ui.vignette;
  v.classList.add('hurt');
  clearTimeout(v._t);
  v._t = setTimeout(() => v.classList.remove('hurt'), 160);
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  G.ui.toasts.appendChild(el);
  while (G.ui.toasts.children.length > 5) G.ui.toasts.removeChild(G.ui.toasts.firstChild);
  setTimeout(() => {
    el.style.transition = 'opacity 0.5s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 520);
  }, 2900);
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}

function updateFX(dt) {
  updateParticles(dt);
  updateRings(dt);
  updateHazards(dt);
  updateFloatTexts(dt);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 1.8);
}
