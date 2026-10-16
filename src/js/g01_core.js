const THREE = await window.__threeReady;

const $ = (id) => document.getElementById(id);

const CFG = {
  CELL: 2,
  GRID_W: 46,
  GRID_H: 46,
  FLOORS: 5,
  PLAYER_SPEED: 6.4,
  PLAYER_HP: 120,
  PLAYER_MANA: 80,
  MANA_REGEN: 6.5,
  PLAYER_R: 0.42,
  ATK_RANGE: 2.5,
  ATK_CD: 0.55,
  BAG_SIZE: 24,
};

const FLOOR_NAMES = ['', 'THE CATACOMBS', 'THE FLOODED VAULT', 'THE BONE PITS', 'THE INFERNAL HALLS', 'THRONE OF THE TYRANT'];

function rnd(a = 1, b) { return b === undefined ? Math.random() * a : a + Math.random() * (b - a); }
function rndi(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function dist(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }
function angleTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }
function approachAngle(cur, target, maxStep) {
  let d = target - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return cur + clamp(d, -maxStep, maxStep);
}
function expDamp(cur, target, lambda, dt) { return lerp(cur, target, 1 - Math.exp(-lambda * dt)); }

const G = {
  state: 'title',
  floor: 1,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  world: null,
  player: null,
  enemies: [],
  projectiles: [],
  drops: [],
  pickupsFx: [],
  rooms: [],
  grid: null,
  stairs: null,
  torches: [],
  boss: null,
  stats: { kills: 0, gold: 0, time: 0 },
  fadeBusy: false,
  inventoryOpen: false,
  audio: null,
  ui: {},
  input: {
    keys: Object.create(null),
    aim: new THREE.Vector3(0, 0, 4),
    clickPoint: new THREE.Vector3(),
    path: [],
    target: null,
    lastMouse: { x: 0, y: 0, has: false },
  },
};

G.ui = {
  hud: $('hud'),
  hpFill: $('hp-fill'), hpNum: $('hp-num'), hpOrb: $('hp-orb'),
  mpFill: $('mp-fill'), mpNum: $('mp-num'), mpOrb: $('mp-orb'),
  xpFill: $('xp-fill'), xpText: $('xp-text'),
  lvl: $('lvl-num'), gold: $('gold'), floorName: $('floor-name'),
  bossBar: $('boss-bar'), bossFill: $('boss-fill'),
  minimap: $('minimap'),
  toasts: $('toasts'), ftext: $('ftext'),
  vignette: $('vignette'), fade: $('fade'),
  inventory: $('inventory'), bagGrid: $('bag-grid'), statsList: $('stats-list'),
  tooltip: $('tooltip'),
  death: $('death-screen'), victory: $('victory-screen'),
  skills: [$('sk-0'), $('sk-1'), $('sk-2'), $('sk-3'), $('sk-pot')],
  screens: { title: $('title-screen') },
};

const canvasHolder = document.body;

function initRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  document.body.insertBefore(renderer.domElement, document.body.firstChild);
  G.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05060b);
  scene.fog = new THREE.FogExp2(0x06070d, 0.032);
  G.scene = scene;

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 260);
  camera.position.set(0, 16, 12);
  G.camera = camera;

  const hemi = new THREE.HemisphereLight(0x36426e, 0x160f0a, 0.65);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0xbfd0ff, 0.5);
  moon.position.set(-18, 30, -12);
  scene.add(moon);

  const sun = new THREE.DirectionalLight(0xffd9a8, 1.7);
  sun.position.set(14, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0009;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  G.sun = sun;

  const torch = new THREE.PointLight(0xffa457, 30, 26, 2);
  torch.position.set(0, 3, 0);
  scene.add(torch);
  G.torchLight = torch;

  G.world = new THREE.Group();
  scene.add(G.world);

  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function updateAim() {
  const m = G.input.lastMouse;
  if (!m.has) return;
  const nx = (m.x / window.innerWidth) * 2 - 1;
  const ny = -(m.y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera({ x: nx, y: ny }, G.camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, hit)) G.input.aim.copy(hit);
}

function worldToScreen(v, out) {
  const p = v.clone().project(G.camera);
  out.x = (p.x * 0.5 + 0.5) * window.innerWidth;
  out.y = (-p.y * 0.5 + 0.5) * window.innerHeight;
  out.behind = p.z > 1;
  return out;
}

function bindInput() {
  const keys = G.input.keys;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (G.state !== 'playing') {
      if (e.code === 'Enter' && G.state === 'title') startRun();
      return;
    }
    if (e.code === 'Digit1') castSkill(0);
    else if (e.code === 'Digit2') castSkill(1);
    else if (e.code === 'Digit3') castSkill(2);
    else if (e.code === 'Digit4') castSkill(3);
    else if (e.code === 'Space') { e.preventDefault(); usePotion(); }
    else if (e.code === 'KeyI') toggleInventory();
    else if (e.code === 'KeyM') toggleMute();
    else if (e.code === 'Escape') { if (G.inventoryOpen) toggleInventory(); }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      G.input.path.length = 0;
      G.input.target = null;
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  window.addEventListener('mousemove', (e) => {
    G.input.lastMouse.x = e.clientX;
    G.input.lastMouse.y = e.clientY;
    G.input.lastMouse.has = true;
  });

  G.renderer.domElement.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || G.state !== 'playing') return;
    handleWorldClick();
  });
  G.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleWorldClick() {
  const m = G.input.lastMouse;
  const nx = (m.x / window.innerWidth) * 2 - 1;
  const ny = -(m.y / window.innerHeight) * 2 + 1;
  const sx = m.x, sy = m.y;
  let best = null, bestD = 34;
  const tmp = { x: 0, y: 0, behind: false };
  for (const e of G.enemies) {
    if (e.dead) continue;
    worldToScreen(e.center || e.mesh.position, tmp);
    if (tmp.behind) continue;
    const d = Math.hypot(tmp.x - sx, tmp.y - sy);
    if (d < bestD) { bestD = d; best = e; }
  }
  if (best) {
    G.input.target = best;
    G.input.path.length = 0;
    return;
  }
  raycaster.setFromCamera({ x: nx, y: ny }, G.camera);
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(groundPlane, hit)) {
    G.input.target = null;
    G.input.path = findPath(G.player.pos.x, G.player.pos.z, hit.x, hit.z);
  }
}
