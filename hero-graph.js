/* 首屏目录卡 · 图谱态（three.js 神经传导词关系图）
 * 由 hero-deck.js 在桌面 ≥1080px 时动态 import；零全局副作用。
 * 对外：window.YANBIAN_HERO_GRAPH = { mount, setTab, refresh, unmount, isReady, hitTest }
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GOLD = 0xF4BA3B;
const KEY_CURSOR = 'yb_hero_wg_cursor';
const RANK = { center: 0, main: 1, branch: 2 };
const SUFFIX = /(ation|ment|ance|ence|ing|ion|ive|ous|ity|er|or|ed|es|ly|al|s)$/i;

let canvas = null, stage = null, renderer = null, scene = null, camera = null, controls = null;
let timer = null, resizeObs = null, rafId = 0, mounted = false, ready = false;
let nodes = [], edges = [], nodeObjs = [], labelOrder = [], keptRects = [];
let pulseSprites = [], ringSprites = [], stars = null, lineMesh = null, leafMesh = null;
let stemPolys = [], stemLens = [], stemTotal = 0;
let selected = 0, hovered = -1, downX = 0, downY = 0, resumeAt = 0, elapsed = 0, seed = 20261125;
let centerWord = null, all = [], byWord = new Map(), byStem = new Map();
let disposables = [];
const _p = new THREE.Vector2();
const _v3 = new THREE.Vector3();

/* ------------------------------------------------------------------ 工具 */
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const stemOf = w => String(w || '').toLowerCase().replace(SUFFIX, '');
const phon = s => (s ? '/' + String(s).replace(/^\/+|\/+$/g, '') + '/' : '');
const dayOfYear = () => { const d = new Date(), a = Date.UTC(d.getFullYear(), 0, 0); return Math.floor((Date.now() - a) / 864e5); };
const readCursor = () => { try { return parseInt(localStorage.getItem(KEY_CURSOR), 10) || 0; } catch (_) { return 0; } };
const bumpCursor = () => { const n = readCursor() + 1; try { localStorage.setItem(KEY_CURSOR, String(n)); } catch (_) {} return n; };

// 带 early-exit 的受限 Levenshtein
function lev(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur[j] = v; if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function indexVocab() {
  const Y = window.__YANBIAN__ || {};
  all = (Y.VOCAB_ALL || []).filter(v => v && v.word);
  byWord = new Map(); byStem = new Map();
  all.forEach(v => {
    const w = String(v.word).toLowerCase();
    if (!byWord.has(w)) byWord.set(w, v);
    const s = stemOf(w);
    if (s.length >= 4) { if (!byStem.has(s)) byStem.set(s, []); byStem.get(s).push(v); }
  });
}

/* ------------------------------------------------------------ 关系推断 */
function takeRelated(center, n, used, level) {
  const out = [];
  const cw = String(center.word).toLowerCase();
  const cs = stemOf(cw);
  const push = v => {
    if (!v || out.length >= n) return;
    const w = String(v.word).toLowerCase();
    if (w === cw || used.has(w)) return;
    used.add(w); out.push(v);
  };

  // 1) 同词根
  (byStem.get(cs) || []).slice(0, n * 2).forEach(push);
  // 2) 近义：synonyms[].en 命中词库
  (center.synonyms || []).forEach(s => { const v = byWord.get(String(s.en || '').toLowerCase()); if (v) push(v); });
  // 3) 形近：首字母相同 + 长度差 ≤2 + Levenshtein ≤2，不够放到 ≤3
  const head = cw.charAt(0);
  for (let max = 2; max <= 3 && out.length < n; max++) {
    for (let i = 0; i < all.length && out.length < n; i++) {
      const v = all[i], w = String(v.word).toLowerCase();
      if (w.charAt(0) !== head || used.has(w)) continue;
      if (lev(cw, w, max) <= max) push(v);
    }
  }
  // 4) 同 level 随机补齐，最后全库兜底
  const same = all.filter(v => !level || v.level === level);
  const pool = same.length >= n ? same : all;
  for (let guard = 0; guard < pool.length * 2 && out.length < n; guard++) push(pool[Math.floor(rnd() * pool.length)]);
  return out;
}

/* -------------------------------------------------------------- 拓扑构造 */
function buildTopology() {
  nodes = []; edges = [];
  const used = new Set([String(centerWord.word).toLowerCase()]);
  const mains = takeRelated(centerWord, 5, used, centerWord.level).slice(0, 5);
  if (!mains.length) mains.push(...all.slice(0, 1)); // 极端兜底

  nodes.push({ word: centerWord.word, phon: centerWord.phonetic || '', mean: centerWord.meaning || '', level: centerWord.level || '', kind: 'center', pos: new THREE.Vector3(0, 0, 0), gen: 0 });
  const XS = [0, 0.95, 1.72, 2.34, 2.86, 3.26];
  mains.forEach((v, i) => {
    const t = i + 1;
    nodes.push({ word: v.word, phon: v.phonetic || '', mean: v.meaning || '', level: v.level || '', kind: 'main',
      pos: new THREE.Vector3(XS[t], 0.19 * t + Math.sin(t * 0.85) * 0.22, Math.cos(t * 0.75) * 0.44), gen: t });
    edges.push([i, i + 1, 'stem']);
  });

  // 旁支：每个主干挂 2–5 个，前两节稀疏；旁支再 42% 概率挂二级
  const MAIN_N = nodes.length;
  for (let p = 1; p < MAIN_N; p++) {
    const parent = nodes[p];
    const kids = p <= 2 ? 2 + Math.floor(rnd() * 2) : 4 + Math.floor(rnd() * 2);
    const related = takeRelated(parent, kids, used, parent.level);
    for (let k = 0; k < kids; k++) {
      const a = (k / kids) * Math.PI * 2 + rnd() * 0.9;
      const r = 0.66 + rnd() * 0.72;
      const src = related[k] || all[Math.floor(rnd() * all.length)];
      const pos = parent.pos.clone().add(new THREE.Vector3(
        Math.cos(a) * r * 0.8 - 0.2 - 0.07 * p,
        Math.sin(a) * r * 1.05,
        Math.sin(a * 1.6) * r * 1.25
      ));
      nodes.push({ word: src.word, phon: src.phonetic || '', mean: src.meaning || '', level: src.level || '', kind: 'branch', pos, gen: parent.gen + 1 });
      edges.push([p, nodes.length - 1, 'branch']);
      if (p >= 3 && rnd() > 0.58) {
        const a2 = a + (rnd() - 0.5) * 1.4;
        const r2 = 0.5 + rnd() * 0.55;
        const pos2 = pos.clone().add(new THREE.Vector3(Math.cos(a2) * r2, Math.sin(a2) * r2 * 0.95, Math.sin(a2 * 2) * r2));
        const src2 = all[Math.floor(rnd() * all.length)];
        nodes.push({ word: src2.word, phon: src2.phonetic || '', mean: src2.meaning || '', level: src2.level || '', kind: 'branch', pos: pos2, gen: parent.gen + 2 });
        edges.push([nodes.length - 2, nodes.length - 1, 'branch']);
      }
    }
  }

  // 叶片：只有点，无标签
  const branchIdx = [];
  nodes.forEach((n, i) => { if (n.kind === 'branch') branchIdx.push(i); });
  branchIdx.forEach(bi => {
    const parent = nodes[bi];
    const kids = parent.gen <= 2 ? 1 + Math.floor(rnd() * 2) : 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < kids; k++) {
      const a = rnd() * Math.PI * 2, r = 0.18 + rnd() * 0.34;
      const p = parent.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 1.1, Math.sin(a * 1.7) * r * 1.3));
      nodes.push({ word: '', phon: '', mean: '', kind: 'leaf', pos: p, gen: parent.gen + 1 });
      edges.push([bi, nodes.length - 1, 'leaf']);
    }
  });

  // 居中 → 缩放（不含叶片）→ 叶片拉回 → 80 轮松弛 → 再居中
  const box = new THREE.Box3();
  nodes.forEach(n => box.expandByPoint(n.pos));
  const mid = box.getCenter(new THREE.Vector3());
  let maxR = 0;
  nodes.forEach(n => { if (n.kind !== 'leaf') maxR = Math.max(maxR, n.pos.clone().sub(mid).length()); });
  const k = 2.0 / (maxR || 1);
  nodes.forEach(n => {
    n.pos.sub(mid).multiplyScalar(k).add(new THREE.Vector3(0.1, 0, 0));
    if (n.kind === 'leaf' && n.pos.length() > 2.1) n.pos.setLength(1.86 + rnd() * 0.22);
  });
  for (let it = 0; it < 80; it++) {
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const d = nodes[i].pos.distanceTo(nodes[j].pos);
        const li = nodes[i].kind === 'leaf', lj = nodes[j].kind === 'leaf';
        const isMain = nodes[i].kind === 'main' || nodes[j].kind === 'main';
        const minD = li && lj ? 0.16 : li || lj ? 0.24 : isMain ? 0.80 : 0.56;
        if (d < minD && d > 1e-4) {
          const push = nodes[i].pos.clone().sub(nodes[j].pos).multiplyScalar(((minD - d) / d) * 0.5);
          nodes[i].pos.add(push); nodes[j].pos.sub(push);
        }
      }
    }
  }
  const box2 = new THREE.Box3();
  nodes.forEach(n => box2.expandByPoint(n.pos));
  const c2 = box2.getCenter(new THREE.Vector3());
  nodes.forEach(n => { n.pos.sub(c2); n.pos.x *= 1.45; n.pos.y *= 0.82; });
}

/* --------------------------------------------------------------- 贴图工具 */
function radialTexture(rgb, inner) {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${rgb},${inner})`);
  grad.addColorStop(0.16, `rgba(${rgb},${inner * 0.6})`);
  grad.addColorStop(0.42, `rgba(${rgb},${inner * 0.18})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
}
function ringTexture(rgb) {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, s * 0.30, s / 2, s / 2, s * 0.5);
  grad.addColorStop(0, `rgba(${rgb},0)`); grad.addColorStop(0.55, `rgba(${rgb},.85)`);
  grad.addColorStop(0.7, `rgba(${rgb},.28)`); grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; disposables.push(t); return t;
}
function labelTexture(text, opts) {
  const { size = 34, weight = 600, color = '#CFF7EE', glow = 'rgba(120,240,225,.55)' } = opts;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), pad = 8;
  const c = document.createElement('canvas'), g0 = c.getContext('2d');
  const font = `${weight} ${size}px "Plus Jakarta Sans", "Outfit", -apple-system, "Segoe UI", "PingFang SC", sans-serif`;
  g0.font = font;
  const w = Math.ceil(g0.measureText(text).width) + pad * 2, h = Math.ceil(size * 1.6);
  c.width = Math.max(48, Math.ceil(w * dpr)); c.height = Math.ceil(h * dpr);
  const g = c.getContext('2d'); g.scale(dpr, dpr); g.font = font;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = glow; g.shadowBlur = size * 0.5; g.fillStyle = color;
  g.fillText(text, w / 2, h / 2); g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  disposables.push(t);
  return { texture: t, aspect: c.width / c.height };
}
function makeLabel(text, opts, scale) {
  const { texture, aspect } = labelTexture(text, opts);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: true, toneMapped: false }));
  sp.scale.set(scale * aspect, scale, 1); sp.renderOrder = 20;
  return sp;
}

/* ------------------------------------------------------------------ 场景 */
function clearScene() {
  if (scene) {
    while (scene.children.length) scene.remove(scene.children[0]);
  }
  disposables.forEach(d => { try { d.dispose && d.dispose(); } catch (_) {} });
  disposables = [];
  nodeObjs = []; labelOrder = []; keptRects = []; pulseSprites = []; ringSprites = [];
  stars = null; lineMesh = null; leafMesh = null; selected = 0; hovered = -1;
}

function buildScene() {
  clearScene();
  seed = (readCursor() * 7919 + dayOfYear() * 131 + 20261125) & 0x7fffffff;
  buildTopology();

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060d, 0.085);
  if (!camera) camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.5, 1.3, 4.5); camera.lookAt(0, -0.12, 0);

  const texCyan = radialTexture('150,246,255', 1.0);
  const texGold = radialTexture('255,216,130', 1.0);
  const texRing = ringTexture('255,205,110');

  scene.add(new THREE.HemisphereLight(0x8fd8ff, 0x120e2a, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x8f7bff, 0.55); fill.position.set(-5, -2, 3); scene.add(fill);
  const warm = new THREE.PointLight(GOLD, 1.1, 9); warm.position.set(-1.2, 0.2, 1.4); scene.add(warm);

  const CENTER_R = 0.185, MAIN_R = 0.092, BRANCH_R = 0.056;
  nodes.forEach(n => {
    if (n.kind === 'leaf') return;
    const isCenter = n.kind === 'center', isMain = n.kind === 'main';
    const r = isCenter ? CENTER_R : isMain ? MAIN_R : BRANCH_R;
    const color = isCenter ? 0xFFC94F : isMain ? 0x7FF0E4 : 0x49A6C2;

    const geo = new THREE.SphereGeometry(r, isCenter ? 40 : 16, isCenter ? 28 : 12);
    const mat = new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: isCenter ? 0.7 : isMain ? 0.3 : 0.16,
      roughness: 0.28, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.2, transparent: true, opacity: isCenter ? 0.97 : 0.92 });
    const mesh = new THREE.Mesh(geo, mat); mesh.position.copy(n.pos); scene.add(mesh);
    disposables.push(geo, mat);

    const cg = new THREE.SphereGeometry(r * 0.42, 12, 10);
    const cm = new THREE.MeshBasicMaterial({ color: isCenter ? 0xFFF3CC : 0xDFFDFF, toneMapped: false, transparent: true, opacity: 0.75 });
    const core = new THREE.Mesh(cg, cm); core.position.copy(n.pos); scene.add(core);
    disposables.push(cg, cm);

    const hm = new THREE.SpriteMaterial({ map: isCenter ? texGold : texCyan, color: isCenter ? 0xFFC96B : 0x8FF2FF,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true,
      opacity: isCenter ? 0.95 : isMain ? 0.5 : 0.3, toneMapped: false });
    const halo = new THREE.Sprite(hm);
    const hs = r * (isCenter ? 11 : isMain ? 11 : 9);
    halo.scale.set(hs, hs, 1); halo.position.copy(n.pos); scene.add(halo); disposables.push(hm);

    const dir = n.pos.clone().normalize();
    const lbl = makeLabel(n.word, isCenter
      ? { size: 62, weight: 700, color: '#FFFFFF', glow: 'rgba(255,196,80,.85)' }
      : isMain ? { size: 45, weight: 600, color: '#D6FBF4', glow: 'rgba(120,245,225,.7)' }
        : { size: 38, weight: 500, color: '#A9DCEC', glow: 'rgba(70,170,200,.6)' },
      isCenter ? 0.50 : isMain ? 0.33 : 0.25);
    lbl.position.copy(n.pos).add(new THREE.Vector3(dir.x * (r + 0.16), -(r + 0.12) + dir.y * 0.1, dir.z * 0.1));
    lbl.material.opacity = isCenter ? 1 : isMain ? 0.92 : 0.7;
    if (n.kind === 'branch' && n.gen >= 3) lbl.visible = false;
    scene.add(lbl); disposables.push(lbl.material);
    nodeObjs.push({ data: n, mesh, core, halo, label: lbl, baseR: r, kind: n.kind });
  });

  // 连线：贝塞尔细分 + 顶点色，一条 LineSegments
  const linePos = [], lineCol = [];
  const cStem = new THREE.Color(0x7FF0E4), cBranch = new THREE.Color(0x3E8FA8);
  edges.forEach(([a, b, kind]) => {
    const A = nodes[a].pos, B = nodes[b].pos;
    const curve = new THREE.QuadraticBezierCurve3(A.clone(),
      A.clone().lerp(B, 0.5).add(new THREE.Vector3(0, 0.06 * (rnd() - 0.5), 0.07 * (rnd() - 0.5))), B.clone());
    const pts = curve.getPoints(12);
    const base = kind === 'stem' ? cStem : cBranch;
    const f = kind === 'stem' ? 1 : kind === 'leaf' ? 0.22 : 0.55;
    for (let i = 0; i < pts.length - 1; i++) {
      linePos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
      for (let v = 0; v < 2; v++) lineCol.push(base.r * f, base.g * f, base.b * f);
    }
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineCol, 3));
  const lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false });
  lineMesh = new THREE.LineSegments(lineGeo, lineMat); scene.add(lineMesh);
  disposables.push(lineGeo, lineMat);

  // 叶片小点
  const leafPts = nodes.filter(n => n.kind === 'leaf');
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(leafPts.flatMap(n => [n.pos.x, n.pos.y, n.pos.z]), 3));
  const leafMat = new THREE.PointsMaterial({ map: texCyan, color: 0x8FF3FF, size: 0.12, transparent: true, opacity: 1,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false });
  leafMesh = new THREE.Points(leafGeo, leafMat); scene.add(leafMesh);
  disposables.push(leafGeo, leafMat);

  // 星尘
  const STAR = 520, sp = new Float32Array(STAR * 3);
  for (let i = 0; i < STAR; i++) {
    const r = 5.5 + Math.random() * 10, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    sp[i * 3 + 1] = Math.cos(ph) * r * 0.72;
    sp[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }
  const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0x9fd8ff, size: 0.026, transparent: true, opacity: 0.6,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  stars = new THREE.Points(starGeo, starMat); scene.add(stars);
  disposables.push(starGeo, starMat);

  // 金光传导：沿主干折线按弧长前进
  const stemEdges = edges.map((e, i) => e[2] === 'stem' ? i : -1).filter(i => i >= 0);
  stemPolys = stemEdges.map(ei => {
    const pts = [], [a, b] = edges[ei];
    for (let s = 0; s <= 24; s++) pts.push(nodes[a].pos.clone().lerp(nodes[b].pos, s / 24));
    return pts;
  });
  stemLens = stemPolys.map(pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); return L; });
  stemTotal = stemLens.reduce((a, b) => a + b, 0);

  pulseSprites = [0, 1, 2, 3].map(() => {
    const m = new THREE.SpriteMaterial({ map: texGold, color: 0xFFD98A, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, opacity: 0, toneMapped: false });
    const s = new THREE.Sprite(m); s.scale.set(0.5, 0.5, 1); scene.add(s); disposables.push(m); return s;
  });
  ringSprites = [0, 1].map(() => {
    const m = new THREE.SpriteMaterial({ map: texRing, color: 0xFFCE78, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: true, opacity: 0, toneMapped: false });
    const s = new THREE.Sprite(m); s.position.copy(nodes[0].pos); scene.add(s); disposables.push(m); return s;
  });

  labelOrder = nodeObjs.map((o, i) => i).sort((a, b) => RANK[nodeObjs[a].kind] - RANK[nodeObjs[b].kind]);
  selected = 0; hovered = -1;
  showDetail(0);
}

function alongStem(u) {
  let d = Math.max(0, Math.min(1, u)) * stemTotal;
  for (let s = 0; s < stemPolys.length; s++) {
    if (d <= stemLens[s] || s === stemPolys.length - 1) {
      const pts = stemPolys[s], f = Math.min(1, d / (stemLens[s] || 1)) * (pts.length - 1);
      const i0 = Math.floor(f);
      return pts[i0].clone().lerp(pts[Math.min(pts.length - 1, i0 + 1)], f - i0);
    }
    d -= stemLens[s];
  }
  return stemPolys[0][0].clone();
}

/* -------------------------------------------------------------- 详情条 */
function wrongOf(word) {
  const list = (window.__YANBIAN__.getS().vocabWrong || []);
  return list.find(w => String(w.word).toLowerCase() === String(word).toLowerCase());
}
function showDetail(i) {
  const o = nodeObjs[i]; if (!o) return;
  const n = o.data; selected = i;
  const q = n => (stage.ownerDocument.getElementById(n));
  if (q('wg-d-word')) q('wg-d-word').textContent = n.word || '';
  if (q('wg-d-phon')) q('wg-d-phon').textContent = n.phon ? phon(n.phon) : '';
  if (q('wg-d-mean')) q('wg-d-mean').textContent = n.mean || '';
  const w = wrongOf(n.word);
  if (q('wg-d-note')) q('wg-d-note').textContent = w
    ? '错 ' + (w.times || 1) + ' 次 · 上次 ' + new Date(w.ts || Date.now()).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
    : '不在错题本';
}

/* ------------------------------------------------------------------ 交互 */
const ray = new THREE.Raycaster();
function pickAt(clientX, clientY) {
  if (!canvas || !camera || !ready) return -1;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return -1;
  _p.x = ((clientX - r.left) / r.width) * 2 - 1;
  _p.y = -((clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(_p, camera);
  const hit = ray.intersectObjects(nodeObjs.map(o => o.mesh), false)[0];
  return hit ? nodeObjs.findIndex(o => o.mesh === hit.object) : -1;
}
function pick(ev) { return pickAt(ev.clientX, ev.clientY); }
/* 只读命中查询：供 hero-deck 判断「点节点看释义」还是「点空白开全屏」 */
function hitTest(clientX, clientY) { return pickAt(clientX, clientY) >= 0; }
function onDown(ev) { downX = ev.clientX; downY = ev.clientY; controls.autoRotate = false; resumeAt = 0; }
function onUp(ev) {
  const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY) > 5;
  resumeAt = performance.now() + 4000;
  if (moved) return;
  const i = pick(ev); if (i >= 0) showDetail(i);
}
function onMove(ev) {
  hovered = pick(ev);
  canvas.style.cursor = hovered >= 0 ? 'pointer' : 'grab';
}
function onLeave() { hovered = -1; resumeAt = performance.now() + 4000; }

/* -------------------------------------------------------------- 标签防叠 */
function layoutLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const kept = [];
  const vhK = 2 * Math.tan(camera.fov * Math.PI / 360);
  labelOrder.forEach(i => {
    const o = nodeObjs[i];
    const force = i === selected || i === hovered;
    _v3.copy(o.label.position).project(camera);
    if (_v3.z > 1) { o.label.visible = force; return; }
    const dist = camera.position.distanceTo(o.label.position);
    const vh = vhK * dist;
    const ph = (o.label.scale.y / vh) * h, pw = (o.label.scale.x / vh) * h;
    const x = (_v3.x * 0.5 + 0.5) * w - pw / 2, y = (-_v3.y * 0.5 + 0.5) * h - ph / 2;
    const rect = { x, y, w: pw, h: ph };
    let clash = false;
    for (const r of kept) {
      const ox = Math.max(0, Math.min(rect.x + rect.w, r.x + r.w) - Math.max(rect.x, r.x));
      const oy = Math.max(0, Math.min(rect.y + rect.h, r.y + r.h) - Math.max(rect.y, r.y));
      if (ox * oy > 0.3 * rect.w * rect.h) { clash = true; break; }
    }
    // 阻尼：连续 3 帧判定一致才切换，避免旋转时闪烁
    const want = force || !clash;
    o._vote = want === o.label.visible ? 0 : (o._vote || 0) + 1;
    if (o._vote >= 3) { o.label.visible = want; o._vote = 0; }
    if (!clash) kept.push(rect);
  });
}

/* ------------------------------------------------------------------ 循环 */
function frame() {
  if (!mounted) return;
  timer.update();
  const dt = Math.min(0.05, timer.getDelta());
  if (!stage.hidden) elapsed += dt;

  const CYCLE = 5.2, t = (elapsed % CYCLE) / CYCLE;
  const travel = Math.min(1, t / 0.82), head = alongStem(travel);
  const fade = t < 0.88 ? 1 : Math.max(0, (1 - t) / 0.12);

  pulseSprites.forEach((s, k) => {
    const u = travel - k * 0.035;
    if (u < 0) { s.material.opacity = 0; return; }
    s.position.copy(alongStem(u));
    const sc = (0.44 - k * 0.08) * (1 + Math.sin(elapsed * 8 + k) * 0.05);
    s.scale.set(sc, sc, 1); s.material.opacity = (0.46 - k * 0.1) * fade;
  });

  nodeObjs.forEach((o, i) => {
    const n = o.data;
    const near = Math.max(0, 1 - n.pos.distanceTo(head) / (n.kind === 'branch' ? 1.15 : 1.5));
    const lit = Math.pow(near, 2) * fade;
    const baseE = n.kind === 'center' ? 0.7 : n.kind === 'main' ? 0.3 : 0.16;
    o.mesh.material.emissiveIntensity = baseE + lit * (n.kind === 'branch' ? 1.3 : 0.9);
    o.core.material.opacity = 0.75 + lit * 0.12;
    const baseO = n.kind === 'center' ? 0.95 : n.kind === 'main' ? 0.42 : 0.26;
    o.halo.material.opacity = n.kind === 'center' ? 0.88 + Math.sin(elapsed * 1.6) * 0.12 : baseO + lit * 0.45;
    const hb = n.kind === 'center' ? 15 : n.kind === 'main' ? 13 : 10;
    const hsc = o.baseR * hb * (1 + lit * 0.30);
    o.halo.scale.set(hsc, hsc, 1);
    const baseL = n.kind === 'center' ? 1 : n.kind === 'main' ? 0.84 : 0.62;
    o.label.material.opacity = Math.min(1, baseL + lit * 0.5 + (i === hovered ? 0.4 : 0) + (i === selected ? 0.3 : 0));
    o.mesh.scale.setScalar(1 + lit * 0.28 + (i === hovered ? 0.18 : 0));
  });

  ringSprites.forEach((sp, i) => {
    const u = ((elapsed / 1.9) + i * 0.5) % 1, sc = 0.5 + u * 2.6;
    sp.scale.set(sc, sc, 1); sp.material.opacity = Math.max(0, 0.55 * (1 - u) * (1 - u));
  });
  stars.rotation.y = elapsed * 0.012;
  if (resumeAt && performance.now() >= resumeAt) { controls.autoRotate = true; resumeAt = 0; }
  controls.update();
  if (!stage.hidden) { layoutLabels(); renderer.render(scene, camera); }
  rafId = requestAnimationFrame(frame);
}

/* -------------------------------------------------------------- 对外接口 */
function setTab(tab) {
  const graph = tab === 'graph';
  const idx = canvas && canvas.closest('.vd-index');
  if (idx) idx.classList.toggle('is-graph', graph);
  const tabs = document.querySelectorAll('.wg-tab');
  tabs.forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
  const list = document.getElementById('wgList');
  if (list) list.hidden = graph;
  if (stage) stage.hidden = !graph;
  const tools = document.querySelector('.wg-tools'), detail = document.querySelector('.wg-detail');
  if (tools) tools.hidden = !graph;
  if (detail) detail.hidden = !graph;
  if (!graph) { controls && (controls.autoRotate = false); resumeAt = 0; }
  else if (controls) resumeAt = performance.now() + 400;
}

function mount(hostEl) {
  if (mounted || !hostEl) return false;
  if (!window.WebGLRenderingContext) return false;
  stage = hostEl;
  canvas = document.createElement('canvas');
  stage.appendChild(canvas);
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (_) { canvas.remove(); canvas = null; return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.5, 1.3, 4.5); camera.lookAt(0, -0.12, 0);
  controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableZoom = true;
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.5; controls.zoomSpeed = 0.8;
  controls.minDistance = 3.6; controls.maxDistance = 13;
  controls.minPolarAngle = Math.PI * 0.2; controls.maxPolarAngle = Math.PI * 0.76;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.28;
  controls.target.set(0, -0.12, 0);

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);

  // 词库可能晚到：轮询最多 8 秒
  const tryBuild = () => {
    if (!mounted) return;
    if (!(window.__YANBIAN__ && window.__YANBIAN__.VOCAB_ALL && window.__YANBIAN__.VOCAB_ALL.length)) {
      setTimeout(tryBuild, 200); return;
    }
    indexVocab();
    const wrong = (window.__YANBIAN__.getS().vocabWrong || []);
    const cur = bumpCursor();
    // 随机中心词依赖 seed，先用 cursor + 日期播种，保证每次进站/刷新都换一个
    seed = (cur * 7919 + dayOfYear() * 131 + 20261125) & 0x7fffffff;
    centerWord = wrong.length ? wrong[(cur + dayOfYear()) % wrong.length] : all[Math.floor(rnd() * all.length)];
    if (!centerWord) { setTimeout(tryBuild, 300); return; }
    if (!wrong.length) {
      const n = document.querySelector('.wg-d-note'); if (n) n.textContent = '随机词';
    }
    buildScene();
    const w = stage.clientWidth, h = stage.clientHeight;
    if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); }
    resizeObs = new ResizeObserver(() => {
      const cw = stage.clientWidth, ch = stage.clientHeight;
      if (!cw || !ch) return;
      camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch, false);
    });
    resizeObs.observe(stage);
    timer = new THREE.Timer(); timer.connect(document);
    const loading = stage.querySelector('.wg-loading'); if (loading) loading.remove();
    ready = true;
    rafId = requestAnimationFrame(frame);
  };
  mounted = true;
  tryBuild();
  return true;
}

function refresh() {
  if (!mounted || !ready) return;
  bumpCursor();
  const wrong = (window.__YANBIAN__.getS().vocabWrong || []);
  const cur = readCursor();
  seed = (cur * 7919 + dayOfYear() * 131 + 20261125) & 0x7fffffff;
  centerWord = wrong.length ? wrong[(cur + dayOfYear()) % wrong.length] : all[Math.floor(rnd() * all.length)];
  if (!centerWord) return;
  buildScene();
  controls.object = camera;
}

function unmount() {
  if (!mounted) return;
  mounted = false; ready = false;
  cancelAnimationFrame(rafId);
  if (timer) { timer.disconnect && timer.disconnect(); timer = null; }
  if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
  canvas && canvas.removeEventListener('pointerdown', onDown);
  canvas && canvas.removeEventListener('pointerup', onUp);
  canvas && canvas.removeEventListener('pointermove', onMove);
  canvas && canvas.removeEventListener('pointerleave', onLeave);
  if (controls) { controls.dispose(); controls = null; }
  clearScene();
  if (renderer) { renderer.dispose(); renderer = null; }
  if (canvas) { canvas.remove(); canvas = null; }
  stage = null; scene = null; camera = null;
}

function isReady() { return ready; }

window.YANBIAN_HERO_GRAPH = { mount, setTab, refresh, unmount, isReady, hitTest };
