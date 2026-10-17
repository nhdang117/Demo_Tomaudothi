import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =====================================================================
 * Chromatic Cargo — lớp hiển thị. Bộ giải nằm trong window.Solver.
 * ===================================================================== */
const S = window.Solver;
const LUMEN = window.LOOK === 'lumen';            // cải biên Frost: nền trắng gradient, canvas trong suốt
/* Hiệu ứng trang trí riêng của Lumen (chớp đỉnh, trôi trong khay, lắc tủ) chạy cả khi prefers-reduced-motion,
   giống Frost: Windows tắt "Animation effects" là trình duyệt bật cờ này dù người dùng không chủ ý. */
const FROST = window.LOOK === 'frost' || LUMEN;   // bản nền sáng kiểu sương băng
const ORION = window.LOOK === 'orion';            // bản vũ trụ xanh: hành tinh, dãy núi
const LYRA = window.LOOK === 'lyra';              // bản tinh vân tím: vòng quỹ đạo, nút kính sương
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (dt, rate) => 1 - Math.exp(-rate * dt);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------- Bảng màu của đỉnh (dữ liệu, tách khỏi màu giao diện) ---------------- */
const BASE_PAL = FROST
  ? ['#ee3d5c', '#12a866', '#2a6cf0', '#eaa300', '#8656f2', '#ef6c17', '#d23c90', '#64a815']
  : ['#ff5470', '#36e08f', '#4f8dff', '#ffc83d', '#b48cff', '#ff8a3d', '#f15bd0', '#a6e22e'];
const PAL_NAMES = ['đỏ', 'lục', 'lam', 'vàng', 'tím', 'cam', 'hồng', 'chanh'];
const palHex = c => c < BASE_PAL.length ? BASE_PAL[c] : `hsl(${Math.round((c * 137.508 + 20) % 360)}, 85%, 62%)`;
const palName = c => c < PAL_NAMES.length ? PAL_NAMES[c] : `màu ${c}`;
const _palCache = [];
const palColor = c => _palCache[c] || (_palCache[c] = new THREE.Color(palHex(c)));
const UNCOLORED = new THREE.Color(LUMEN ? '#bcc3e4' : FROST ? '#bdc8d2' : ORION ? '#24407a' : LYRA ? '#3b3170' : '#2a4853');
const HOLO = new THREE.Color(LUMEN ? '#7a7ff0' : FROST ? '#ffffff' : ORION ? '#4aa8ff' : LYRA ? '#b59bff' : '#7cf4ff');      // cạnh, bệ
const WARN = new THREE.Color(FROST ? '#e0263f' : '#ff3d5a');
const AMBER = new THREE.Color(FROST ? '#d98a00' : '#ffb347');
const WHITE = new THREE.Color(FROST ? '#16202a' : ORION || LYRA ? '#f1ecff' : '#e9fdff');     // nhấn mạnh thao tác đang chạy
const RING_C = FROST ? new THREE.Color('#16202a') : HOLO;          // vòng chọn đỉnh
const FOGC = new THREE.Color(LUMEN ? '#e6e5f3' : '#c5cad1');      // màu sương nền (Frost / Lumen)
const BLEND = FROST ? THREE.NormalBlending : THREE.AdditiveBlending;

/* ---------------- Trạng thái ứng dụng ---------------- */
const SPEEDS = [0.25, 0.5, 1, 2, 4, 8];
const st = {
  g: null, meta: null, algo: 'greedy',
  steps: [], truncated: false, idx: 0, playing: false, acc: 0, speedI: 2,
  best: null, chi: null, chiExact: false,
  flat: false, layers: false, follow: true, zoom: 1, layerYaw: 0,
};
const stepMs = () => 900 / SPEEDS[st.speedI];
const dragVel = { x: 0, y: 0 };
let drag = null, hoverId = -1, mouse = null, tickKey = -1;

/* =====================================================================
 * WebGL
 * ===================================================================== */
const canvas = $('#stage');
let renderer = null, glOK = true;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: LUMEN, powerPreference: 'high-performance' });
  if (FROST) { renderer.toneMapping = THREE.NoToneMapping; }
  if (LUMEN) renderer.setClearColor(0xffffff, 0);              // để gradient CSS hiện xuyên canvas
} catch (e) {
  glOK = false;
}
if (!glOK) { document.documentElement.classList.add('no-webgl'); canvas.hidden = true; }

const scene = new THREE.Scene();
scene.background = LUMEN ? null : FROST ? FOGC.clone() : new THREE.Color('#04090d');
if (FROST) scene.fog = new THREE.Fog(FOGC.clone(), 10, 60);

/* Bầu trời Orion: hành tinh lớn, sao sáng, mặt trăng nhỏ, dãy núi — vẽ 2D thành texture nền.
   Bầu trời Lyra: tinh vân tím, vòng quỹ đạo mờ, mặt đất đá ở cuối (không có hành tinh).
   Texture cao gấp đôi màn hình; khi cuộn, nền trượt lên để lộ phần trời tối phía dưới. */
const sky = (ORION || LYRA) && glOK ? (() => {
  let tex = null, p = 0;
  function paint(w, h) {
    const k = Math.min(1, 1600 / Math.max(w, h));
    const X = Math.max(2, Math.round(w * k)), Y = Math.max(2, Math.round(h * k)), cv = document.createElement('canvas');
    cv.width = X; cv.height = Y * 2;
    const c = cv.getContext('2d'), rnd = S.mulberry32(2024), TAU = Math.PI * 2;
    const fillPath = (pts, style) => {
      c.fillStyle = style; c.beginPath(); c.moveTo(0, Y * 2);
      for (const [x, y] of pts) c.lineTo(x, y);
      c.lineTo(X, Y * 2); c.closePath(); c.fill();
    };
    const strokeRidge = (pts, style, lw) => {
      c.strokeStyle = style; c.lineWidth = lw; c.beginPath();
      pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke();
    };
    /* đường sống núi: dịch điểm giữa (midpoint displacement), base(t, v) → y */
    const ridge = (base, rough, seed) => {
      const r2 = S.mulberry32(seed), n = 257, ys = new Float32Array(n);
      for (let step = n - 1, amp = 1; step > 1; step >>= 1, amp *= rough)
        for (let i = step >> 1; i < n; i += step) ys[i] = (ys[i - (step >> 1)] + ys[i + (step >> 1)]) / 2 + (r2() * 2 - 1) * amp;
      return Array.from(ys, (v, i) => { const t = i / (n - 1); return [t * X, base(t, v)]; });
    };

    if (LYRA) {
      /* nền: tím than, sáng nhẹ ở giữa trang đầu */
      let g = c.createLinearGradient(0, 0, 0, Y * 2);
      g.addColorStop(0, '#0b0918'); g.addColorStop(0.2, '#181430'); g.addColorStop(0.36, '#1d1839');
      g.addColorStop(0.52, '#141128'); g.addColorStop(0.8, '#0f0c1e'); g.addColorStop(1, '#0a0814');
      c.fillStyle = g; c.fillRect(0, 0, X, Y * 2);
      const blob = (x, y, r, rgb, a) => {
        const gg = c.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, `rgba(${rgb},${a})`); gg.addColorStop(0.55, `rgba(${rgb},${(a * 0.35).toFixed(3)})`); gg.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = gg; c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      blob(X * 0.16, Y * 0.78, X * 0.46, '150,80,235', 0.3);
      blob(X * 0.84, Y * 0.22, X * 0.4, '70,95,215', 0.2);
      blob(X * 0.52, Y * 0.48, X * 0.32, '190,95,255', 0.1);
      blob(X * 0.74, Y * 1.38, X * 0.42, '120,70,215', 0.16);
      blob(X * 0.12, Y * 1.7, X * 0.36, '90,80,210', 0.12);

      /* sợi tinh vân: vẽ lên lớp riêng rồi làm mờ một lần */
      const nb = document.createElement('canvas'); nb.width = X; nb.height = Y * 2;
      const nc = nb.getContext('2d');
      for (let i = 0; i < 260; i++) {
        const t = rnd(), x = X * (-0.05 + t * 0.7), y = Y * (0.95 - t * 0.55) + (rnd() - 0.5) * Y * 0.32;
        const rr = Y * (0.01 + rnd() * rnd() * 0.06), pink = rnd() < 0.35;
        nc.fillStyle = pink ? `rgba(225,120,255,${(0.03 + rnd() * 0.06).toFixed(3)})` : `rgba(130,110,255,${(0.03 + rnd() * 0.07).toFixed(3)})`;
        nc.beginPath(); nc.ellipse(x, y, rr * (2 + rnd() * 4), rr, -0.45 + (rnd() - 0.5) * 0.5, 0, TAU); nc.fill();
      }
      c.filter = `blur(${Math.max(2, Y * 0.018).toFixed(1)}px)`;
      c.drawImage(nb, 0, 0);
      c.filter = 'none';

      /* sao */
      for (let i = 0, N = Math.round(X * Y / 1100); i < N; i++) {
        const x = rnd() * X, y = rnd() * Y * 1.85, r = rnd() < 0.95 ? 0.35 + rnd() * 0.6 : 0.9 + rnd() * 0.6;
        c.fillStyle = `rgba(${215 + rnd() * 40 | 0},${200 + rnd() * 40 | 0},255,${(0.15 + rnd() * 0.45).toFixed(2)})`;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }

      /* vòng quỹ đạo lớn, rất mờ, cắt mép trang */
      c.lineWidth = Math.max(1, Y * 0.0014);
      c.strokeStyle = 'rgba(205,185,255,.1)';
      c.beginPath(); c.arc(X * 0.02, Y * 0.42, Y * 0.58, 0, TAU); c.stroke();
      c.strokeStyle = 'rgba(205,185,255,.06)';
      c.beginPath(); c.arc(X * 0.02, Y * 0.42, Y * 0.82, 0, TAU); c.stroke();
      c.beginPath(); c.arc(X * 1.02, Y * 1.25, Y * 0.66, 0, TAU); c.stroke();

      /* mặt đất đá ở đáy trang cuối */
      const ground = ridge((t, v) => Y * 1.86 + v * Y * 0.035 - Y * 0.14 * Math.exp(-(((t - 0.9) / 0.13) ** 2)), 0.7, 51);
      g = c.createLinearGradient(0, Y * 1.7, 0, Y * 2);
      g.addColorStop(0, '#221a33'); g.addColorStop(0.4, '#150f22'); g.addColorStop(1, '#0a0712');
      fillPath(ground, g); strokeRidge(ground, 'rgba(190,160,255,.16)', 1);
      for (let i = 0; i < 46; i++) {
        const x = rnd() * X, y = Y * (1.9 + rnd() * 0.09), rx = X * (0.004 + rnd() * rnd() * 0.026), ry = rx * (0.35 + rnd() * 0.2);
        c.fillStyle = '#120d1c'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(180,150,235,.14)'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
      }
    } else {
      /* nền trời */
      let g = c.createLinearGradient(0, 0, 0, Y * 2);
      g.addColorStop(0, '#02040c'); g.addColorStop(0.28, '#05153c'); g.addColorStop(0.38, '#030d2c');
      g.addColorStop(0.5, '#020818'); g.addColorStop(1, '#01030a');
      c.fillStyle = g; c.fillRect(0, 0, X, Y * 2);
      for (let i = 0, N = Math.round(X * Y / 1400); i < N; i++) {
        const x = rnd() * X, y = rnd() * Y * 0.8, r = rnd() < 0.95 ? 0.35 + rnd() * 0.6 : 0.9 + rnd() * 0.5;
        c.fillStyle = `rgba(${190 + rnd() * 50 | 0},${210 + rnd() * 35 | 0},255,${(0.15 + rnd() * 0.4).toFixed(2)})`;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      }

      /* hành tinh: quầng khí quyển, thân, vệt lục địa, viền sáng */
      const R = Math.min(Y * 0.5, X * 0.36), cx = X * 0.5, cy = Y * 0.13 + R;
      g = c.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.3);
      g.addColorStop(0, 'rgba(40,110,255,.32)'); g.addColorStop(0.35, 'rgba(30,90,230,.12)'); g.addColorStop(1, 'rgba(20,60,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 1.3, 0, TAU); c.fill();
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
      g = c.createRadialGradient(cx - R * 0.3, cy - R * 0.55, R * 0.05, cx, cy, R * 1.1);
      g.addColorStop(0, '#1f4ea6'); g.addColorStop(0.4, '#123578'); g.addColorStop(0.78, '#0a2056'); g.addColorStop(1, '#051236');
      c.fillStyle = g; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      const cl = document.createElement('canvas'), d2 = Math.ceil(R * 2);   // mây: vẽ lên lớp riêng rồi làm mờ một lần
      cl.width = cl.height = d2;
      const cc = cl.getContext('2d');
      for (let i = 0; i < 700; i++) {
        const a = rnd() * TAU, d = Math.sqrt(rnd()) * R, x = R + Math.cos(a) * d, y = R + Math.sin(a) * d;
        const rr = R * (0.006 + rnd() * rnd() * 0.05), light = rnd() < 0.5;
        cc.fillStyle = light ? `rgba(120,170,255,${(0.04 + rnd() * 0.08).toFixed(3)})` : `rgba(2,8,30,${(0.1 + rnd() * 0.2).toFixed(3)})`;
        cc.beginPath(); cc.ellipse(x, y, rr * (2.5 + rnd() * 5), rr, (rnd() - 0.5) * 0.7, 0, TAU); cc.fill();
      }
      c.filter = `blur(${Math.max(1, R * 0.005).toFixed(1)}px)`;
      c.drawImage(cl, cx - R, cy - R);
      c.filter = 'none';
      g = c.createLinearGradient(0, cy - R, 0, cy + R);
      g.addColorStop(0, 'rgba(2,6,20,0)'); g.addColorStop(0.55, 'rgba(2,6,20,.12)'); g.addColorStop(1, 'rgba(2,6,20,.6)');
      c.fillStyle = g; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      g = c.createRadialGradient(cx, cy, R * 0.82, cx, cy, R);
      g.addColorStop(0, 'rgba(80,150,255,0)'); g.addColorStop(1, 'rgba(100,165,255,.38)');
      c.fillStyle = g; c.fillRect(cx - R, cy - R, R * 2, R * 2);
      c.restore();
      c.save(); c.shadowColor = '#3d8bff'; c.shadowBlur = R * 0.06;
      c.strokeStyle = 'rgba(150,200,255,.85)'; c.lineWidth = Math.max(1, R * 0.006);
      c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.95, Math.PI * 2.05); c.stroke(); c.restore();

      /* sương chân trời, ngôi sao sáng, mặt trăng nhỏ */
      g = c.createLinearGradient(0, Y * 0.5, 0, Y * 0.82);
      g.addColorStop(0, 'rgba(20,70,190,0)'); g.addColorStop(0.5, 'rgba(25,80,200,.22)'); g.addColorStop(1, 'rgba(20,70,190,0)');
      c.fillStyle = g; c.fillRect(0, Y * 0.5, X, Y * 0.32);
      const sx = X * 0.21, sy = Y * 0.25, sr = Y * 0.09;
      g = c.createRadialGradient(sx, sy, 0, sx, sy, sr);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.06, 'rgba(210,230,255,.95)');
      g.addColorStop(0.2, 'rgba(90,160,255,.35)'); g.addColorStop(1, 'rgba(40,100,255,0)');
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      const mx = X * 0.86, my = Y * 0.33, mr = Math.max(6, Y * 0.034);
      g = c.createRadialGradient(mx - mr * 0.45, my - mr * 0.35, mr * 0.1, mx, my, mr * 1.05);
      g.addColorStop(0, '#7f9cd0'); g.addColorStop(0.45, '#344f82'); g.addColorStop(1, '#09142e');
      c.fillStyle = g; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();

      /* dãy núi: xa (mờ xanh) → vách đá hai bên (có mỏm nhọn bên trái) → mặt đất gần */
      const far = ridge((t, v) => Y * 0.68 + v * Y * 0.03, 0.74, 11);
      g = c.createLinearGradient(0, Y * 0.58, 0, Y * 0.85);
      g.addColorStop(0, '#0a1d4c'); g.addColorStop(1, '#040c26');
      fillPath(far, g); strokeRidge(far, 'rgba(120,175,255,.28)', 1);
      const cliff = ridge((t, v) => {
        const e = Math.pow(Math.abs(t - 0.5) * 2, 1.8);
        return Y * (0.99 - 0.52 * e) + v * Y * 0.045 * (0.3 + e) - Y * 0.27 * Math.exp(-(((t - 0.17) / 0.022) ** 2));
      }, 0.76, 23);
      g = c.createLinearGradient(0, Y * 0.3, 0, Y);
      g.addColorStop(0, '#071636'); g.addColorStop(0.5, '#040c22'); g.addColorStop(1, '#01040e');
      fillPath(cliff, g);
      c.save(); c.beginPath(); c.moveTo(0, Y * 2); for (const [x, y] of cliff) c.lineTo(x, y); c.lineTo(X, Y * 2); c.clip();
      g = c.createRadialGradient(cx, Y * 0.62, 0, cx, Y * 0.62, X * 0.55);
      g.addColorStop(0, 'rgba(50,110,255,.12)'); g.addColorStop(1, 'rgba(50,110,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, X, Y * 2); c.restore();
      strokeRidge(cliff, 'rgba(120,175,255,.42)', 1.2);
      const near = ridge((t, v) => Y * 0.96 + v * Y * 0.018, 0.72, 37);
      g = c.createLinearGradient(0, Y * 0.9, 0, Y * 1.25);
      g.addColorStop(0, '#020818'); g.addColorStop(1, '#01030a');
      fillPath(near, g); strokeRidge(near, 'rgba(90,140,240,.18)', 1);
      g = c.createRadialGradient(X * 0.5, Y * 1.55, 0, X * 0.5, Y * 1.55, X * 0.6);
      g.addColorStop(0, 'rgba(20,60,170,.12)'); g.addColorStop(1, 'rgba(20,60,170,0)');
      c.fillStyle = g; c.fillRect(0, Y, X, Y);

    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(1, 0.5); t.offset.set(0, 0.5 * (1 - p));
    return t;
  }
  return {
    /* đổi kích thước canvas thì tạo texture mới (texture cũ không đổi kích thước được) */
    resize(w, h) { const old = tex; tex = paint(w, h); scene.background = tex; if (old) old.dispose(); },
    scroll(v) { if (Math.abs(v - p) < 1e-4) return; p = v; tex.offset.y = 0.5 * (1 - p); },
  };
})() : null;
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
camera.position.set(0, 0, 18);
const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
const graphGroup = new THREE.Group();
const fxGroup = new THREE.Group();
scene.add(graphGroup, fxGroup);

let composer = null, bloom = null;
if (glOK && FROST) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#ffffff', '#9aa3ad', 0.7));
  const sun = new THREE.DirectionalLight('#ffffff', 1.4); sun.position.set(4, 7, 9); scene.add(sun);
}
if (glOK && !FROST) {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = ORION || LYRA ? new UnrealBloomPass(new THREE.Vector2(512, 512), 0.6, 0.4, 0.26)   // ngưỡng cao hơn để nền trời không lóa
                : new UnrealBloomPass(new THREE.Vector2(512, 512), 0.62, 0.42, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}

/* Chấm sáng mềm dùng chung cho bụi nền và xung chạy dọc cạnh */
function glowMaterial(fadeFar) {
  return new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 400 } },
    vertexShader: `
      attribute float aSize; attribute vec3 aColor; attribute float aAlpha;
      uniform float uScale; varying vec3 vC; varying float vA;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
        vC = aColor; vA = aAlpha ${fadeFar ? '* smoothstep(260.0, 70.0, -mv.z)' : ''};
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        if (a * vA < 0.004) discard;
        ${FROST ? 'gl_FragColor = vec4(vC, a * vA);' : 'gl_FragColor = vec4(vC * a * vA, a * vA);'}
      }`,
    transparent: true, depthWrite: false, blending: BLEND,
  });
}
const glowMats = [];

/* Bụi hologram ở xa */
(function makeDust() {
  if (LUMEN) return;                                     // Lumen: nền gradient sạch, không bụi chấm
  const N = 1500, rnd = S.mulberry32(42);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), alpha = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, r = 70 + rnd() * 140, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(th), r * u * 0.7, r * s * Math.sin(th)], i * 3);
    const k = 0.25 + rnd() * 0.55;
    if (FROST) { col.set([1, 1, 1], i * 3); size[i] = 0.8 + rnd() * 2.2; alpha[i] = 0.12 + rnd() * 0.35; continue; }
    if (ORION) { col.set(rnd() < 0.7 ? [0.55 * k, 0.75 * k, 1.0 * k] : [0.9 * k, 0.95 * k, 1.0 * k], i * 3); size[i] = 0.3 + rnd() * 0.7; alpha[i] = 0.2 + rnd() * 0.45; continue; }
    if (LYRA) { col.set(rnd() < 0.6 ? [0.78 * k, 0.62 * k, 1.0 * k] : rnd() < 0.5 ? [0.95 * k, 0.6 * k, 1.0 * k] : [0.95 * k, 0.93 * k, 1.0 * k], i * 3); size[i] = 0.3 + rnd() * 0.8; alpha[i] = 0.2 + rnd() * 0.45; continue; }
    else if (rnd() < 0.86) col.set([0.35 * k, 0.9 * k, 1.0 * k], i * 3); else col.set([0.75 * k, 0.45 * k, 1.0 * k], i * 3);
    size[i] = 0.6 + rnd() * 1.6; alpha[i] = 0.35 + rnd() * 0.65;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  const m = glowMaterial(true); glowMats.push(m);
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.name = 'dust';
  scene.add(pts);
})();

/* Bệ hologram dưới đồ thị */
const platform = new THREE.Group();
(function makePlatform() {
  const mat = new THREE.LineBasicMaterial({ color: HOLO, transparent: true, opacity: FROST ? 0.6 : 0.1, blending: BLEND, depthWrite: false });
  const circle = (r, seg = 128) => {
    const pts = [];
    for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
  };
  platform.add(circle(1), circle(1.32), circle(1.7));
  const tick = [];
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2, r0 = 1.32, r1 = i % 6 === 0 ? 1.46 : 1.38;
    tick.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, 0), new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0));
  }
  platform.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), mat));
  platform.rotation.x = -Math.PI / 2;
  if (!FROST) scene.add(platform);                       // Frost: bỏ bệ 3 vòng tròn xoay
})();

/* Vòng chọn đỉnh, vòng hàng xóm, gợn sóng */
const ringGeo = new THREE.RingGeometry(0.4, 0.46, 64);
const arcGeo = new THREE.RingGeometry(0.58, 0.61, 32, 1, 0, Math.PI * 0.32);
function addRing(geo, color, opacity) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: BLEND, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.visible = false; fxGroup.add(m); return m;
}
const selRing = addRing(ringGeo, RING_C, 0.95);
const selArcs = new THREE.Group();
for (let i = 0; i < 4; i++) { const a = addRing(arcGeo, RING_C, 0.7); a.visible = true; a.rotation.z = i * Math.PI / 2; fxGroup.remove(a); selArcs.add(a); }
selArcs.visible = false; fxGroup.add(selArcs);
const uRing = addRing(ringGeo, WHITE, 0.7);

/* Lumen: thay vòng chọn bằng đỉnh nhấp nháy (chớp sáng kiểu đèn hiệu) + quầng sáng mềm và sóng sáng lan ra */
const glowTex = LUMEN ? (() => {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.6)');
  g.addColorStop(0.55, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
})() : null;
function addGlow() {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  sp.visible = false; sp.renderOrder = -1; fxGroup.add(sp); return sp;
}
const FLASH = new THREE.Color('#5b5bf0');
const vGlow = LUMEN ? addGlow() : null, vPing = LUMEN ? addGlow() : null, uGlow = LUMEN ? addGlow() : null;
const BLINK_MS = 950;                                     // chu kỳ chớp
let blinkV = -1, blinkT0 = 0;
/* Gợn sóng khi tô/quay lui; Lumen dùng quầng sáng loang ra thay cho vòng tròn */
const ripples = Array.from({ length: 10 }, () => ({ mesh: LUMEN ? addGlow() : addRing(ringGeo, WHITE, 0), t: 1, dur: 1, node: -1 }));

/* Xung sáng chạy dọc cạnh */
const PULSE_SLOTS = 64;
const pulse = { list: [], pos: new Float32Array(PULSE_SLOTS * 3), col: new Float32Array(PULSE_SLOTS * 3), size: new Float32Array(PULSE_SLOTS), alpha: new Float32Array(PULSE_SLOTS), points: null };
(function makePulses() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pulse.pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aColor', new THREE.BufferAttribute(pulse.col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSize', new THREE.BufferAttribute(pulse.size, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(pulse.alpha, 1).setUsage(THREE.DynamicDrawUsage));
  const m = glowMaterial(false); glowMats.push(m);
  pulse.points = new THREE.Points(g, m); pulse.points.frustumCulled = false; pulse.points.renderOrder = 5;
  graphGroup.add(pulse.points);
})();

/* ---------------- Khung hiển thị đồ thị ---------------- */
/* Tinh thể băng: icosahedron bị kéo dài và méo ngẫu nhiên, mặt phẳng (flat) */
function crystalGeometry() {
  const g = new THREE.IcosahedronGeometry(0.34, 0);
  const pos = g.attributes.position, rnd = S.mulberry32(77), jit = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!jit.has(key)) jit.set(key, 0.78 + rnd() * 0.42);
    const k = jit.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 1.4, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}
const coreGeo = FROST ? new THREE.IcosahedronGeometry(0.15, 2) : new THREE.IcosahedronGeometry(0.2, 3);
const shellGeo = FROST ? crystalGeometry() : new THREE.IcosahedronGeometry(0.34, 0);
const coreMat = FROST
  ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.0 })
  : new THREE.MeshBasicMaterial({ color: 0xffffff });
const shellMat = FROST
  ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: 0.3, thickness: 0.55, ior: 1.31, metalness: 0,
      clearcoat: 0.6, clearcoatRoughness: 0.22, specularIntensity: 1, envMapIntensity: 0.95,
      attenuationColor: new THREE.Color('#d6e6f3'), attenuationDistance: 2.4 })
  : new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: BLEND, depthWrite: false });
const tmpC2 = new THREE.Color(), _q3 = new THREE.Quaternion();

const GV = {
  n: 0, m: 0, cores: null, shells: null, edges: null, ePos: null, eCol: null, eCur: null,
  p3: null, p2: null, pL: null, pLKey: null, pCur: null, col: null, scl: null, glitch: null, nodeSize: 1,
  R: 4, mark: null,
};

/* Bố cục theo "stress majorization" (SMACOF): khoảng cách hình học ≈ khoảng cách đường đi ngắn nhất.
   Cho bố cục đều hơn lực đẩy-kéo khi đồ thị có lõi dày và lá dài. */
function stressLayout(g, dim, init) {
  const n = g.n, P = new Float32Array(n * 3), rnd = S.mulberry32(1000 + n * 31 + g.edges.length * 7);
  if (n <= 1) return P;
  const Dm = new Int16Array(n * n).fill(-1), q = new Int32Array(n);
  let maxD = 1;
  for (let s = 0; s < n; s++) {
    let h = 0, t = 0; q[t++] = s; Dm[s * n + s] = 0;
    while (h < t) {
      const v = q[h++], dv = Dm[s * n + v];
      for (const u of g.adj[v]) if (Dm[s * n + u] < 0) { Dm[s * n + u] = dv + 1; q[t++] = u; if (dv + 1 > maxD) maxD = dv + 1; }
    }
  }
  for (let i = 0; i < n * n; i++) if (Dm[i] < 0) Dm[i] = maxD + 1;
  if (init) { P.set(init); if (dim === 2) for (let i = 0; i < n; i++) P[i * 3 + 2] = 0; }
  else {
    const r0 = Math.max(1, maxD * 0.6);
    for (let i = 0; i < n; i++) {
      P[i * 3] = (rnd() * 2 - 1) * r0; P[i * 3 + 1] = (rnd() * 2 - 1) * r0; P[i * 3 + 2] = dim === 3 ? (rnd() * 2 - 1) * r0 : 0;
    }
  }
  const iters = init ? 140 : 280;
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      let sw = 0, sx = 0, sy = 0, sz = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const jx = j * 3, d = Dm[i * n + j], w = 1 / (d * d);
        let dx = P[ix] - P[jx], dy = P[ix + 1] - P[jx + 1], dz = P[ix + 2] - P[jx + 2];
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 1e-5) { dx = (rnd() - 0.5) * 1e-3; dy = (rnd() - 0.5) * 1e-3; dz = dim === 3 ? (rnd() - 0.5) * 1e-3 : 0; dist = Math.sqrt(dx * dx + dy * dy + dz * dz); }
        sw += w;
        sx += w * (P[jx] + d * dx / dist);
        sy += w * (P[jx + 1] + d * dy / dist);
        sz += w * (P[jx + 2] + d * dz / dist);
      }
      P[ix] = sx / sw; P[ix + 1] = sy / sw;
      P[ix + 2] = dim === 3 ? sz / sw : 0;
    }
  }
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < n; i++) { cx += P[i * 3]; cy += P[i * 3 + 1]; cz += P[i * 3 + 2]; }
  cx /= n; cy /= n; cz /= n;
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    P[i * 3] -= cx; P[i * 3 + 1] -= cy; P[i * 3 + 2] -= cz;
    maxR = Math.max(maxR, Math.hypot(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
  }
  const target = clamp(1.3 + Math.sqrt(n) * 0.62, 2.2, 7.5);
  const sc = maxR > 1e-6 ? target / maxR : 1;
  for (let i = 0; i < n * 3; i++) P[i] *= sc;
  return P;
}

/* Tách ngăn: mỗi màu (ngăn chứa) một tầng nằm ngang */
function layerLayout(colors) {
  const n = GV.n, P = new Float32Array(n * 3);
  const k = Math.max(1, S.usedCount(colors));
  const groups = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) groups[Math.max(0, colors[i])].push(i);
  const gap = clamp(9 / Math.max(1, k - 1), 1.0, 2.0);
  groups.forEach((arr, j) => {
    const y = ((k - 1) / 2 - j) * gap, s = arr.length;
    const r = s <= 1 ? 0 : Math.max(0.7, s * 1.05 / (2 * Math.PI));
    arr.forEach((v, t) => {
      const a = (t / Math.max(1, s)) * Math.PI * 2 + j * 0.7;
      P[v * 3] = r * Math.cos(a); P[v * 3 + 1] = y; P[v * 3 + 2] = r * Math.sin(a);
    });
  });
  return P;
}

/* Lumen: tách ngăn thành tủ ngăn chứa 3D — mỗi màu một khay kính, mẫu vật xếp lưới trên sàn khay */
const BIN = { group: null, mats: [], tags: [], r: 0, side: 0 };
const PURE_W = new THREE.Color(1, 1, 1);
function binLabelTex(j, cnt) {
  const cv = document.createElement('canvas'); cv.width = 384; cv.height = 96;
  const x = cv.getContext('2d'), F1 = '700 36px "Be Vietnam Pro", system-ui, sans-serif', F2 = '500 30px "Be Vietnam Pro", system-ui, sans-serif';
  const t1 = `Ngăn ${j + 1}`, t2 = ` · ${cnt} mẫu`;
  x.font = F1; const w1 = x.measureText(t1).width; x.font = F2; const w2 = x.measureText(t2).width;
  const w = Math.min(380, 64 + w1 + w2 + 26), h = 72, y0 = 12;
  x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.roundRect(2, y0, w, h, 36); x.fill();
  x.fillStyle = palHex(j); x.beginPath(); x.arc(38, y0 + h / 2, 13, 0, Math.PI * 2); x.fill();
  x.textBaseline = 'middle';
  x.fillStyle = '#161a36'; x.font = F1; x.fillText(t1, 62, y0 + h / 2 + 1);
  x.fillStyle = '#4a5072'; x.font = F2; x.fillText(t2, 62 + w1, y0 + h / 2 + 1);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function buildBins(groups, k, w, dd, H, pitch, ns) {
  if (BIN.group) {
    graphGroup.remove(BIN.group);
    BIN.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  }
  const grp = new THREE.Group(); BIN.mats = []; BIN.tags = [];
  const mat = (M, o) => { const m = new M({ transparent: true, depthWrite: false, ...o }); m.userData.base = o.opacity; BIN.mats.push(m); return m; };
  const boxG = new THREE.BoxGeometry(w, H, dd), edgeG = new THREE.EdgesGeometry(boxG), floorG = new THREE.BoxGeometry(w, 0.05 * ns, dd);
  groups.forEach((arr, j) => {
    const yc = ((k - 1) / 2 - j) * pitch, tint = palColor(j);
    const wall = new THREE.Mesh(boxG, mat(THREE.MeshStandardMaterial, { color: tint.clone().lerp(PURE_W, 0.7), opacity: 0.2, roughness: 0.2, side: THREE.DoubleSide }));
    const floor = new THREE.Mesh(floorG, mat(THREE.MeshStandardMaterial, { color: tint.clone().lerp(PURE_W, 0.35), opacity: 0.6, roughness: 0.45 }));
    const frame = new THREE.LineSegments(edgeG, mat(THREE.LineBasicMaterial, { color: tint, opacity: 0.95 }));
    const tag = new THREE.Sprite(mat(THREE.SpriteMaterial, { map: binLabelTex(j, arr.length), opacity: 1, fog: false, depthTest: false }));
    wall.position.y = frame.position.y = yc; floor.position.y = yc - H / 2;
    tag.center.set(1, 0.5); tag.scale.set(2.3 * ns, 0.575 * ns, 1); tag.renderOrder = 5;   // nhãn bên trái tủ, ngang giữa khay
    BIN.tags.push({ sp: tag, y: yc });
    grp.add(wall, floor, frame, tag);
  });
  const top = ((k - 1) / 2) * pitch + H / 2 + 0.14 * ns, rp = [];       // 4 trụ dựng tủ + đế
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rp.push(sx * w / 2, -top, sz * dd / 2, sx * w / 2, top, sz * dd / 2);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
  grp.add(new THREE.LineSegments(rg, mat(THREE.LineBasicMaterial, { color: new THREE.Color('#7a7ff0'), opacity: 0.5 })));
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3 * ns, 0.08 * ns, dd + 0.3 * ns), mat(THREE.MeshStandardMaterial, { color: new THREE.Color('#d9d9f3'), opacity: 0.7, roughness: 0.5 }));
  base.position.y = -top - 0.04 * ns;
  grp.add(base);
  grp.visible = false;
  graphGroup.add(grp);
  BIN.group = grp; BIN.r = Math.hypot(w / 2, dd / 2, top); BIN.side = Math.hypot(w / 2, dd / 2) + 0.15 * ns;
}
/* Mẫu vật trôi nhẹ trong khay: nhấp nhô trên sàn + dạt ngang chậm, mỗi mẫu một nhịp riêng (i = chỉ số toạ độ x/y/z) */
function binDrift(i, now) {
  const v = (i / 3) | 0, d = i % 3, t = now / 1000, ns = GV.nodeSize;
  if (d === 1) return ns * 0.07 * (1 + Math.sin(t * 1.3 + v * 2.1));
  return ns * 0.08 * Math.sin(t * (0.45 + (v % 5) * 0.07) + v * 1.7 + d * 2.4);
}
function binLayout(colors) {
  const n = GV.n, P = new Float32Array(n * 3), ns = GV.nodeSize;
  const k = Math.max(1, S.usedCount(colors));
  const groups = Array.from({ length: k }, () => []);
  for (let i = 0; i < n; i++) groups[Math.max(0, colors[i])].push(i);
  const maxS = Math.max(1, ...groups.map(a => a.length));
  const cols = Math.max(2, Math.ceil(Math.sqrt(maxS * 2))), rows = Math.ceil(maxS / cols);
  const d = 1.0 * ns, H = 1.35 * ns, pitch = H + 0.4 * ns;
  const w = cols * d + 0.35 * ns, dd = rows * d + 0.35 * ns;
  groups.forEach((arr, j) => {
    const yc = ((k - 1) / 2 - j) * pitch, s = arr.length, rs = Math.ceil(s / cols);
    arr.forEach((v, t) => {
      const r = Math.floor(t / cols), c = t % cols, cnt = Math.min(cols, s - r * cols);
      P[v * 3] = (c - (cnt - 1) / 2) * d; P[v * 3 + 1] = yc - H / 2 + 0.56 * ns; P[v * 3 + 2] = (r - (rs - 1) / 2) * d;
    });
  });
  buildBins(groups, k, w, dd, H, pitch, ns);
  return P;
}

function buildGraphView(g) {
  if (GV.cores) {
    graphGroup.remove(GV.cores, GV.shells, GV.edges);
    GV.cores.dispose(); GV.shells.dispose(); GV.edges.geometry.dispose();
  }
  const n = g.n, m = g.edges.length;
  GV.n = n; GV.m = m;
  GV.p3 = stressLayout(g, 3);
  GV.p2 = stressLayout(g, 2, GV.p3);
  GV.pL = null; GV.pLKey = null;
  GV.pCur = new Float32Array(GV.p3);
  for (let i = 0; i < n * 3; i++) GV.pCur[i] *= 0.2;           // nở ra từ tâm
  GV.col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) GV.col.set([UNCOLORED.r, UNCOLORED.g, UNCOLORED.b], i * 3);
  GV.scl = new Float32Array(n).fill(0.01);
  GV.glitch = new Float32Array(n);
  GV.mark = new Uint8Array(n);
  GV.nodeSize = n > 60 ? 0.72 : n > 30 ? 0.86 : 1;
  { const rq = S.mulberry32(500 + n);
    GV.qs = Array.from({ length: n }, () => new THREE.Quaternion().setFromEuler(new THREE.Euler((rq() - 0.5) * 0.9, rq() * Math.PI * 2, (rq() - 0.5) * 0.9))); }
  GV.cores = new THREE.InstancedMesh(coreGeo, coreMat, Math.max(1, n));
  GV.shells = new THREE.InstancedMesh(shellGeo, shellMat, Math.max(1, n));
  GV.cores.count = n; GV.shells.count = n;
  for (const im of [GV.cores, GV.shells]) {
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    for (let i = 0; i < Math.max(1, n); i++) im.setColorAt(i, UNCOLORED);
  }
  const eg = new THREE.BufferGeometry();
  GV.ePos = new Float32Array(Math.max(1, m) * 6);
  GV.eCol = new Float32Array(Math.max(1, m) * 6);
  GV.eCur = new Float32Array(Math.max(1, m) * 3);
  eg.setAttribute('position', new THREE.BufferAttribute(GV.ePos, 3).setUsage(THREE.DynamicDrawUsage));
  eg.setAttribute('color', new THREE.BufferAttribute(GV.eCol, 3).setUsage(THREE.DynamicDrawUsage));
  eg.setDrawRange(0, m * 2);
  GV.edges = new THREE.LineSegments(eg, edgeMat);
  GV.edges.frustumCulled = false;
  graphGroup.add(GV.edges, GV.shells, GV.cores);
  pulse.list.length = 0;
  for (const r of ripples) { r.t = r.dur; r.mesh.visible = false; }
  hoverId = -1;
}

/* =====================================================================
 * DOM: nhãn, chú thích, code, bảng biến, HUD
 * ===================================================================== */
const labelsEl = $('#labels');
let labelEls = [], labelKey = [], labelVis = [];
function buildLabels(n) {
  labelsEl.textContent = '';
  labelEls = []; labelKey = []; labelVis = [];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'nl'; d.style.display = 'none';
    labelsEl.appendChild(d);
    labelEls.push(d); labelKey.push(''); labelVis.push(false);
  }
}

const codeEl = $('#code');
let curLine = -1;
const KW = /("[^"]*")|\b(def|for|in|if|else|while|return|not|is|None|True|False|lambda|and|or|int|bool|void|const|using|namespace|include|true|false)\b|\b(all|any|max|min|argmax|range|set|sorted|len|main|cin|cout|trungMau|thamLam|quayLui)\b|\b(\d+)\b/g;
function hl(line) {
  const hi = line.search(/\/\//);                        // chú thích //
  const code = hi >= 0 ? line.slice(0, hi) : line, cm = hi >= 0 ? line.slice(hi) : '';
  const c = esc(code).replace(KW, (m, str, kw, fn, nu) => str ? `<span class="nu">${str}</span>` : kw ? `<span class="kw">${kw}</span>`
    : fn ? `<span class="fn">${fn}</span>` : `<span class="nu">${nu}</span>`);
  return c + (cm ? `<span class="cm">${esc(cm)}</span>` : '');
}
/* Tiêu đề panel code là ô chọn thuật toán (tên ngắn; tên đầy đủ hiện khi rê chuột) */
const algoSel = $('#algoSel');
algoSel.innerHTML = Object.entries(S.ALGOS).map(([id, A]) => `<option value="${id}">${esc(A.short)}</option>`).join('');
algoSel.addEventListener('change', () => {
  if (algoSel.value === st.algo) return;
  st.algo = algoSel.value;
  computeTrace();
});
/* Công tắc Mã giả ⇄ C++: mỗi ngôn ngữ một trace chạy qua từng dòng của chính nó. Đổi ngôn ngữ thì dựng lại
   trace và đứng ở dòng ứng với chỗ đang xem (cùng seq = cùng thời điểm chạy, xem Recorder trong solver.js) */
const langSw = $('#langSw');
st.lang = 'pseudo';
try { if (localStorage.getItem('cc-lang') === 'cpp') st.lang = 'cpp'; } catch (e) { /* không có storage: giữ mã giả */ }
const codeLine = s => s.line;
langSw.addEventListener('click', () => {
  const seq = st.steps.length ? st.steps[st.idx].seq : 0;
  st.lang = st.lang === 'cpp' ? 'pseudo' : 'cpp';
  try { localStorage.setItem('cc-lang', st.lang); } catch (e) { /* bỏ qua */ }
  computeTrace(seq);
});
function renderCode() {
  const A = S.ALGOS[st.algo];
  langSw.setAttribute('aria-checked', st.lang === 'cpp' ? 'true' : 'false');
  codeEl.setAttribute('aria-label', st.lang === 'cpp' ? 'Code C++ của thuật toán' : 'Mã giả của thuật toán');
  codeEl.innerHTML = (st.lang === 'cpp' ? A.cpp() : A.code()).map((t, i) =>
    `<li data-i="${i}"><span class="ln">${i + 1}</span><span class="tx">${hl(t) || ' '}</span></li>`).join('');
  $$('.tx', codeEl).forEach(tx => { tx.dataset.html = tx.innerHTML; });
  curLine = -1;
  algoSel.value = st.algo;
  algoSel.title = A.name;
  $('#algoCx').textContent = A.cx;
}
const GLYPH = 'ΔΣΨΩχλ01#%*+<>/|=~';
function scrambleLine(tx) {
  if (!tx) return;
  cancelAnimationFrame(tx._raf);
  const plain = tx.textContent, html = tx.dataset.html, N = 7;
  let f = 0;
  const step = () => {
    f++;
    const k = Math.floor(plain.length * f / N);
    let out = plain.slice(0, k);
    for (let i = k; i < plain.length; i++) out += plain[i] === ' ' ? ' ' : GLYPH[(Math.random() * GLYPH.length) | 0];
    tx.textContent = out;
    if (f < N) tx._raf = requestAnimationFrame(step); else { tx.innerHTML = html; tx._raf = 0; }
  };
  tx._raf = requestAnimationFrame(step);
}
function setActiveLine(i, animate) {
  if (i === curLine) return;
  const prev = codeEl.children[curLine];
  if (prev) {
    prev.classList.remove('on'); prev.classList.add('was');
    const ptx = prev.querySelector('.tx');
    if (ptx._raf) { cancelAnimationFrame(ptx._raf); ptx._raf = 0; ptx.innerHTML = ptx.dataset.html; }
    setTimeout(() => prev.classList.remove('was'), 500);
  }
  curLine = i;
  const li = codeEl.children[i];
  if (!li) return;
  li.classList.remove('was');
  li.classList.remove('on'); void li.offsetWidth; li.classList.add('on');
  if (animate && !REDUCED && stepMs() >= 200) scrambleLine(li.querySelector('.tx'));
  const top = li.offsetTop - codeEl.clientHeight * 0.4;
  codeEl.scrollTo({ top: Math.max(0, top), behavior: REDUCED ? 'auto' : 'smooth' });
}

const chip = c => `<span class="chip"><i style="--c:${palHex(c)}"></i>${c} · ngăn ${c + 1}</span>`;

/* ---------------- Log = stdout của code C++ ----------------
   Mỗi bước trace có `out` khi đúng chỗ đó code C++ chạy lệnh cout (solver.js); log chỉ in các dòng này,
   nên trùng từng ký tự với chương trình C++ thật (test.js biên dịch bằng g++ và so). Bước không in gì
   thì log không thêm dòng. Lời giải thích đầy đủ nằm ở title và ở chú thích nổi.
   Chỉ giữ TL.MAX dòng gần nhất; tới/lùi 1 bước thì thêm/bớt dòng, nhảy xa thì dựng lại. */
const TL = { list: $('#tlList'), from: 0, to: -1, MAX: 300 };
function logLine(i) {
  const s = st.steps[i], t = s.type;
  if (s.out == null) return '';
  const G = st.algo === 'greedy';
  const cls = [t === 'select' && G ? 'grp' : '',
    t === 'select' && G ? 'k-sel' : t === 'conflict' || t === 'prune' ? 'k-bad' : t === 'assign' && !G ? 'k-ok'
      : t === 'backtrack' || t === 'fail' ? 'k-back' : t === 'found' ? 'k-gold' : t === 'done' ? 'k-end' : '']
    .filter(Boolean).join(' ');
  return `<li${cls ? ` class="${cls}"` : ''} data-i="${i}" title="${esc(s.note || '')}"><span class="x">${esc(s.out)}</span></li>`;
}
function updateLog(i) {
  const L = TL.list;
  if (TL.to >= 0 && i >= TL.from && i <= TL.to) {          // lùi trong cửa sổ đang hiện: bỏ các dòng sau i
    while (L.lastElementChild && +L.lastElementChild.dataset.i > i) L.lastElementChild.remove();
    TL.to = i;
  } else if (TL.to >= 0 && i === TL.to + 1) {              // tới 1 bước: thêm dòng (nếu bước này có in), quá MAX thì bỏ dòng đầu
    L.insertAdjacentHTML('beforeend', logLine(i)); TL.to = i;
    while (L.children.length > TL.MAX) { L.firstElementChild.remove(); TL.from = +L.firstElementChild.dataset.i; }
  } else {                                                 // nhảy xa: dựng lại từ TL.MAX dòng in gần nhất
    let j = i, cnt = 0;
    for (; j >= 0 && cnt < TL.MAX; j--) if (st.steps[j].out != null) cnt++;
    TL.from = j + 1; TL.to = i;
    let h = '';
    for (let k = TL.from; k <= i; k++) h += logLine(k);
    L.innerHTML = h;
  }
  const more = $('#tlMore');
  more.hidden = TL.from === 0;
  more.textContent = '… các dòng in trước đó không hiện';
  L.querySelector('.cur')?.classList.remove('cur');
  const last = L.lastElementChild;
  if (last && +last.dataset.i === i) last.classList.add('cur');   // chỉ sáng khi chính bước này in ra dòng đó
  if (last) {                                              // đệ quy sâu → dòng thụt nhiều: cuộn ngang để thấy dòng mới nhất
    const lead = st.steps[+last.dataset.i].out.match(/^ */)[0].length;
    TL.cw = TL.cw || (() => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(L).font; return c.measureText('0').width; })();
    L.scrollLeft = Math.max(0, lead * TL.cw - 24);
  }
  L.scrollTop = L.scrollHeight;
}
TL.list.addEventListener('click', e => {
  const li = e.target.closest('li[data-i]');
  if (li) { play(false); setStep(+li.dataset.i, false); }
});
/* Log trace: màn rộng nằm ở cột phải dưới HUD; màn hẹp về cuối cột code,
   vì ở màn hẹp cột phải là khung đồ thị cao cố định, không còn chỗ */
const tlogEl = $('.tlog'), narrowMQ = matchMedia('(max-width: 820px)');
function placeLog() {
  if (narrowMQ.matches) { if (tlogEl.parentElement !== $('.lab-left')) $('.lab-left').appendChild(tlogEl); }
  else if (tlogEl.parentElement !== $('.lab-right')) $('.tools').before(tlogEl);
}
narrowMQ.addEventListener('change', placeLog);
placeLog();

const anno = $('#anno');
/* Chú thích nổi: tự chọn chỗ đặt hộp sao cho che ít tinh thể nhất, không đè lên các bảng và không quá xa đỉnh.
   Ứng viên = vòng vị trí sát đỉnh + lưới phủ cả màn hình; hộp trượt mượt sang chỗ mới, đường dẫn vẽ lại theo. */
const annoBox = $('.anno-box', anno), annoSvg = $('svg', anno), annoLine = $('polyline', anno);
const ANNO_RING = [[1, -1, 0], [-1, -1, 0], [1, 1, 0], [-1, 1, 0], [1, 0, 0], [-1, 0, 0], [1, -1, 1], [-1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const AN = { x: 0, y: 0, tx: 0, ty: 0, w: 290, h: 110, tick: 0, evalT: 0, panels: [], init: false };
const annoPts = [], lockTxt = $('#lockT');
function overlapArea(x, y, w, h, b) {
  const ow = Math.min(x + w, b.right) - Math.max(x, b.left), oh = Math.min(y + h, b.bottom) - Math.max(y, b.top);
  return ow > 0 && oh > 0 ? ow * oh : 0;
}
function annoScore(x, y, px, py, lockR) {
  const w = AN.w, h = AN.h;
  let sc = Math.hypot(px - clamp(px, x, x + w), py - clamp(py, y, y + h)) / 160;     // càng xa đỉnh càng phạt nhẹ
  for (let j = 0; j < annoPts.length; j += 4) {                                    // che tinh thể (đỉnh đang xét & hàng xóm nặng hơn)
    const d = Math.hypot(annoPts[j] - clamp(annoPts[j], x, x + w), annoPts[j + 1] - clamp(annoPts[j + 1], y, y + h));
    if (d < annoPts[j + 2]) sc += annoPts[j + 3] * (1 - d / annoPts[j + 2]) * 3;
  }
  for (const b of AN.panels) sc += overlapArea(x, y, w, h, b) / 120;               // đè lên bảng code, HUD, nút, player
  if (lockR) sc += overlapArea(x, y, w, h, lockR) / 60;                            // dòng chữ đo đạc của khung ngắm
  return sc + (Math.max(0, 8 - x) + Math.max(0, x + w - W + 8) + Math.max(0, 8 - y) + Math.max(0, y + h - H + 8)) * 0.5;
}
function placeAnno(px, py, focusV, focusU, dt) {
  if (AN.tick-- <= 0) {                                   // đo lại kích thước hộp và vị trí các bảng thỉnh thoảng
    AN.tick = 20;
    AN.w = annoBox.offsetWidth; AN.h = annoBox.offsetHeight;
    AN.panels = ['.lab-left', '.hud', '.tlog', '.tools', '#player', '.topbar', '#tbMx', '#tbHt'].map(q => $(q)).filter(Boolean).map(e => {
      const r = e.getBoundingClientRect(), m = 10;            // chừa lề quanh mỗi bảng
      return { left: r.left - m, top: r.top - m, right: r.right + m, bottom: r.bottom + m };
    });
  }
  if (AN.evalT-- <= 0 || !AN.init) {                      // chấm điểm lại mỗi 4 khung hình
    AN.evalT = 3;
    annoPts.length = 0;
    let rf = 24;
    for (let i = 0; i < GV.n; i++) {                      // vùng chiếm chỗ của từng tinh thể (kèm nhãn bên dưới) trên màn hình
      nodeWorld(i, tmpV);
      const r = 0.5 * GV.scl[i] * H / (2 * TAN_HALF * Math.max(0.1, camera.position.z - tmpV.z));
      const q = project(tmpV);
      if (i === focusV) rf = Math.max(rf, r);
      annoPts.push(q.x, q.y + r * 0.3, r * 1.25 + 8, i === focusV || i === focusU ? 4 : GV.mark[i] ? 2 : 1);
    }
    const lr = lockTxt && lockTxt.offsetParent ? lockTxt.getBoundingClientRect() : null;
    const lockR = lr && lr.width ? { left: lr.left - 6, top: lr.top - 6, right: lr.right + 6, bottom: lr.bottom + 6 } : null;
    let bx = AN.tx, by = AN.ty, bestS = AN.init ? annoScore(AN.tx, AN.ty, px, py, lockR) - 1 : Infinity;   // giữ chỗ cũ nếu chỗ mới không tốt hơn rõ rệt
    const tryAt = (x, y) => { const sc = annoScore(x, y, px, py, lockR); if (sc < bestS) { bestS = sc; bx = x; by = y; } };
    for (const c of ANNO_RING) {
      const gx = rf + (c[2] ? 70 : 22), gy = c[2] ? 60 : 18;
      tryAt(px + (c[0] > 0 ? gx : -gx - AN.w), py + (c[1] < 0 ? -gy - AN.h : c[1] > 0 ? gy : -AN.h / 2));
    }
    for (let y = 70; y + AN.h < H - 8; y += 30) for (let x = 12; x + AN.w < W - 8; x += 36) tryAt(x, y);
    AN.tx = bx; AN.ty = by;
    if (!AN.init) { AN.x = bx; AN.y = by; AN.init = true; }
  }
  const kk = damp(dt, 6);
  AN.x = lerp(AN.x, AN.tx, kk); AN.y = lerp(AN.y, AN.ty, kk);
  const ox = AN.x - px, oy = AN.y - py;
  annoBox.style.left = `${ox.toFixed(1)}px`; annoBox.style.top = `${oy.toFixed(1)}px`; annoBox.style.right = 'auto';
  anno.classList.toggle('flip', ox + AN.w / 2 < 0);
  const ax = clamp(0, ox, ox + AN.w), ay = clamp(0, oy + 10, oy + AN.h - 10);      // điểm gắn gần đỉnh nhất trên mép hộp
  const stub = Math.abs(ax) > 30 ? Math.sign(ax) * 18 : 0;
  annoSvg.style.top = '0'; annoSvg.style.transform = 'none';
  annoLine.setAttribute('points', `0,0 ${stub},0 ${ax.toFixed(1)},${ay.toFixed(1)}`);
}
let typeRaf = 0;
function setNote(el, text, animate) {
  cancelAnimationFrame(el._raf || 0);
  if (!animate || REDUCED || stepMs() < 300) { el.textContent = text; return; }
  const t0 = performance.now(), dur = Math.min(380, text.length * 9);
  const tick = t => {
    const p = clamp((t - t0) / dur, 0, 1);
    el.textContent = text.slice(0, Math.ceil(text.length * p));
    if (p < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}
function annoChips(s) {
  if (s.type === 'done' || s.type === 'found') {
    const k = s.type === 'done' ? s.used : s.k, chi = st.chi;
    if (chi == null) return `<span class="chip">tự xếp vào ${k} ngăn</span>`;
    return k > chi ? `<span class="chip over">dùng ${k} ngăn, tối ưu chỉ cần ${chi}</span>` : `<span class="chip">tối ưu: ${k} ngăn</span>`;
  }
  if (s.type === 'assign' && st.chi != null && s.c >= st.chi) return chip(s.c) + `<span class="chip over">mở thêm ngăn ngoài tối ưu ${st.chi}</span>`;
  if (s.type === 'newcolor') return s.c != null ? chip(s.c) + '<span class="chip">màu mới</span>' : '';
  if (s.type === 'conflict' || s.type === 'assign' || s.type === 'ok' || s.type === 'try') return s.c != null ? chip(s.c) : '';
  if (s.type === 'select' && s.ties && s.ties.length > 1) return `<span class="chip">bậc ${s.deg} · ${s.ties.length} đỉnh hòa → chỉ số nhỏ nhất</span>`;
  if (s.type === 'prune') return `<span class="chip">soMauMin = ${s.kmin}</span><span class="chip over">cắt tỉa</span>`;
  if (s.type === 'select' && s.deg != null) return `<span class="chip">bậc ${s.deg}</span>` + (s.kmin != null ? `<span class="chip">soMauMin = ${s.kmin}</span>` : '');
  return '';
}
function updateAnnoContent(s, animate) {
  const label = s.title || '';
  const L = st.g.labels;
  const mat = s.v != null && L ? `<b>${esc(L[s.v].sym)}</b>${esc(L[s.v].name)}${L[s.v].from ? ' · ' + esc(L[s.v].from) : ''}` : '';
  for (const [t, n, c, mt] of [['#aType', '#aNote', '#aChips', '#aMat'], ['#dType', '#dNote', '#dChips', '#dMat']]) {
    $(t).textContent = label;
    $(mt).innerHTML = mat;
    setNote($(n), s.note || '', animate);
    $(c).innerHTML = annoChips(s);
  }
  AN.tick = 0; AN.evalT = 0;                             // nội dung đổi → đo lại hộp chú thích, chọn chỗ lại ngay
  anno.classList.toggle('is-conflict', s.type === 'conflict');
  anno.classList.toggle('is-back', s.type === 'backtrack' || s.type === 'fail' || s.type === 'prune');
}

function updateHUD() {
  const g = st.g, m = st.meta;
  $('#hudName').textContent = m.name;
  $('#hudMeta').textContent = [`n = ${g.n}`, `m = ${g.edges.length}`, st.chi != null ? `χ = ${st.chi}` : null]
    .filter(Boolean).map(t => t.replace(/ /g, '\u00a0')).join(' · ');
  const w = $('#hudWarn');
  if (st.truncated) {
    w.hidden = false;
    w.textContent = `Trace dài quá ${st.steps.length} dòng lệnh nên đã dừng ghi. Kết quả đầy đủ xem ở phần So sánh.`;
  } else w.hidden = true;
}
function updateHudColors(s) {
  const k = s.used || 0;
  $('#hudColors').innerHTML = k
    ? Array.from({ length: Math.min(k, 16) }, (_, c) => `<span class="sw" style="--c:${palHex(c)}"></span>`).join('') +
      `<span class="${st.chi != null && k > st.chi ? 'over' : ''}">${k} ngăn${st.chi != null && k > st.chi ? ` · tối ưu ${st.chi}` : ''}</span>`
    : `<span>Chưa xếp mẫu nào · chương trình tự chia ngăn</span>`;
}

/* ---------------- Ma trận kề + bảng tính tay ----------------
   Đủ chỗ: 2 bảng mở sẵn thành một cột cạnh đồ thị, đồ thị lùi sang phải (.tb-dock).
   Thiếu chỗ: thu thành 2 nút ở góc đồ thị, bấm để mở đè lên đồ thị. */
const TB = { wide: null, open: { mx: false, ht: false }, btWide: false, mx: null, hot: [], headC: null, cross: null, rows: [], trs: [], order: null };
const tbLab = $('.lab'), tbSec = { mx: $('#tbMx'), ht: $('#tbHt') };
const tbCell = n => n <= 16 ? 20 : n <= 30 ? 16 : 12;
const swatch = c => `<span class="sw" style="--c:${palHex(c)}"></span>`;
function keepVisible(box, el) {                          // cuộn khung bảng vừa đủ để thấy dòng đang xét (chừa dòng tiêu đề dính)
  if (!el || !box.clientHeight) return;
  const b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
  const head = el.closest('table').rows[0].getBoundingClientRect().height + 4;
  if (r.top < b.top + head) box.scrollTop -= b.top + head - r.top;
  else if (r.bottom > b.bottom - 4) box.scrollTop += r.bottom - b.bottom + 4;
}
function tbApply() {
  for (const k of ['mx', 'ht']) {
    tbSec[k].classList.toggle('open', TB.open[k]);
    $('.tb-head', tbSec[k]).setAttribute('aria-expanded', String(TB.open[k]));
  }
  tbLab.classList.toggle('tb-dock', !!TB.wide && (TB.open.mx || TB.open.ht));
  if (!TB.open.ht || st.algo === 'greedy') TB.btWide = false;
  const btw = TB.btWide && !!TB.wide;                     // cây mở rộng: giãn sang phải, đè lên khung 3D
  if (btw !== tbLab.classList.contains('bt-wide')) TR.fresh = true;   // khung cây đổi cỡ → căn lại cây
  tbLab.classList.toggle('bt-wide', btw);
  const exp = $('.bt-exp', tbSec.ht);
  if (exp) { exp.textContent = btw ? '✕ Thu lại' : '⛶ Mở rộng'; exp.setAttribute('aria-pressed', String(btw)); }
  AN.tick = 0;                                            // bảng đổi kích thước → chú thích nổi né lại
  if (st.steps.length) requestAnimationFrame(tbScroll);
}
function tbLayout() {
  const n = st.g ? st.g.n : 12;
  const tbw = clamp(n * (tbCell(n) + 2) + 140, 300, 440);   // đủ cho bảng tính tay: Lần + n đỉnh + Chọn + Màu
  tbLab.style.setProperty('--tbw', tbw + 'px');
  const right = $('.lab-right'), side = parseFloat(getComputedStyle($('.gbox', right)).right) || 0;
  const wide = innerWidth > 820 && innerHeight >= 600 && right.clientWidth - side - tbw - 14 >= 420;
  if (wide !== TB.wide) { TB.wide = wide; TB.open.mx = TB.open.ht = wide; }   // đổi chế độ → về mặc định của chế độ đó
  tbApply();
}
addEventListener('resize', tbLayout);
for (const k of ['mx', 'ht']) $('.tb-head', tbSec[k]).addEventListener('click', () => { TB.open[k] = !TB.open[k]; tbApply(); });

function buildMatrix(g) {
  const n = g.n, L = g.labels, cs = tbCell(n), A = new Uint8Array(n * n);
  for (const [a, b] of g.edges) A[a * n + b] = A[b * n + a] = 1;
  const nm = i => esc(L ? `${i} · ${L[i].sym} ${L[i].name}` : `Đỉnh ${i}`);
  let h = `<table class="mx${n > 30 ? ' tiny' : ''}" style="--tc:${cs}px"><tr><th></th>`;
  for (let j = 0; j < n; j++) h += `<th title="${nm(j)}">${j}</th>`;
  h += '<th class="sum" title="Tổng dòng = bậc của đỉnh">Σ</th></tr>';
  for (let i = 0; i < n; i++) {
    h += `<tr><th title="${nm(i)}">${i}</th>`;
    for (let j = 0; j < n; j++) h += `<td${A[i * n + j] ? ' class="one"' : i === j ? ' class="diag"' : ''}>${A[i * n + j]}</td>`;
    h += `<td class="sum">${g.adj[i].length}</td></tr>`;
  }
  $('#tbMxBody').innerHTML = '<p class="tb-key">Dòng sáng = đỉnh v đang xét, số 1 trên dòng là đỉnh kề của v. ' +
    '<span style="white-space:nowrap">Viền = hạ bậc · đỏ = trùng màu</span> · Σ dòng = bậc.</p>' + h + '</table>';
  TB.mx = $('#tbMxBody table'); TB.hot = []; TB.cross = null;
  TB.headC = new Int16Array(n).fill(-1);
  $('#tbMxMeta').textContent = `${n} × ${n} · ${g.edges.length} cạnh`;
}
function mxCross(td) {                                    // trỏ vào ô → sáng tiêu đề dòng & cột của ô đó
  if (TB.cross) for (const x of TB.cross) x.classList.remove('hl');
  TB.cross = null;
  if (!td || td.classList.contains('sum')) return;
  TB.cross = [td.parentElement.cells[0], TB.mx.rows[0].cells[td.cellIndex]];
  for (const x of TB.cross) x.classList.add('hl');
}
$('#tbMxBody').addEventListener('mouseover', e => mxCross(e.target.closest('td')));
$('#tbMxBody').addEventListener('mouseleave', () => mxCross(null));
function updateMatrix(s) {
  const t = TB.mx, n = st.g.n, cols = s.colors;
  for (const [el, c] of TB.hot) el.classList.remove(c);
  TB.hot = [];
  const hot = (el, c) => { if (el) { el.classList.add(c); TB.hot.push([el, c]); } };
  for (let j = 0; j < n; j++) {                           // tiêu đề dòng/cột mang màu của đỉnh đã tô
    const c = cols[j];
    if (c === TB.headC[j]) continue;
    TB.headC[j] = c;
    for (const th of [t.rows[0].cells[j + 1], t.rows[j + 1].cells[0]]) {
      th.classList.toggle('cc', c >= 0);
      if (c >= 0) th.style.setProperty('--c', palHex(c));
    }
  }
  if (s.v == null || s.v < 0) return;
  const row = t.rows[s.v + 1];
  hot(row, 'cur'); hot(t.rows[0].cells[s.v + 1], 'cur');
  if (s.cu != null) hot(row.cells[s.cu + 1], 'look');      // ô a[v][u] dòng code đang xét
  if (s.type === 'conflict') hot(row.cells[s.u + 1], 'bad');
  else if (s.type === 'dec') for (const u of s.us) hot(row.cells[u + 1], 'dn');
}

function buildHand() {
  const body = $('#tbHtBody'), n = st.g.n, cs = tbCell(n), G = st.algo === 'greedy';
  TB.rows = []; TB.trs = [];
  $('#tbHt .eyebrow').textContent = G ? 'Bảng trạng thái' : 'Cây quay lui';
  tbSec.ht.setAttribute('aria-label', G ? 'Bảng trạng thái' : 'Cây quay lui');
  tbSec.ht.classList.toggle('tree-mode', !G);
  if (!G) { buildTree(); return; }
  if (TR.ro) { TR.ro.disconnect(); TR.ro = null; }
  /* mỗi dòng = một lần chọn đỉnh, chụp bảng bậc lúc chọn (giống bảng cô chạy tay ở slide 18);
     dòng hiện ra ngay ở bước hạ bậc trước đó để thấy bậc giảm */
  let lastDec = 0;
  st.steps.forEach((s, i) => {
    if (s.type === 'dec' || s.type === 'mark') lastDec = i;
    else if (s.type === 'select') TB.rows.push({ vis: TB.rows.length ? lastDec : 0, at: i, degs: s.degs, v: s.v, ties: new Set(s.ties), c: -1, cAt: Infinity });
    else if (s.type === 'assign' && TB.rows.length) Object.assign(TB.rows[TB.rows.length - 1], { c: s.c, cAt: i });
  });
  let h = `<table class="ht${n > 30 ? ' tiny' : ''}" style="--tc:${cs}px"><tr><th class="hn">Lần</th>`;
  for (let j = 0; j < n; j++) h += `<th>${j}</th>`;
  h += '<th class="hv">Chọn</th><th class="hc">Màu</th></tr>';
  TB.rows.forEach((r, k) => {
    const prev = k ? TB.rows[k - 1].degs : null;
    h += `<tr><th class="hn">${k + 1}</th>`;
    for (let j = 0; j < n; j++) {
      const d = r.degs[j];
      const cls = (d < 0 ? 'x' : prev && d < prev[j] ? 'dn' : '') + (j === r.v ? ' sel' : r.ties.size > 1 && r.ties.has(j) ? ' tie' : '');
      h += `<td${cls.trim() ? ` class="${cls.trim()}"` : ''}>${d < 0 ? '−1' : d}</td>`;
    }
    h += `<td class="hv"><span>${r.v}</span></td><td class="hc"><span>${r.c >= 0 ? swatch(r.c) + r.c : ''}</span></td></tr>`;
  });
  body.innerHTML = '<p class="tb-key">Mỗi dòng là bảng bậc lúc chọn đỉnh. Ô đậm = bậc cao nhất được chọn, khung = hòa bậc ' +
    '(lấy chỉ số nhỏ nhất), đỏ = vừa bị hạ bậc, −1 = đã tô.</p>' + h + '</table>';
  TB.trs = [...body.querySelectorAll('tr')].slice(1);
}
function updateHandGreedy(i) {
  let cur = -1;
  TB.rows.forEach((r, k) => {
    const tr = TB.trs[k], vis = i >= r.vis;
    tr.hidden = !vis;
    if (!vis) return;
    cur = k;
    tr.classList.toggle('picked', i >= r.at);
    tr.classList.toggle('colored', i >= r.cAt);
  });
  TB.trs.forEach((tr, k) => tr.classList.toggle('cur', k === cur));
  const s = st.steps[i];
  $('#tbHtMeta').textContent = s.type === 'done' ? `xong · ${s.used} màu` : cur < 0 ? 'bảng bậc' : `lần ${cur + 1} / ${TB.rows.length}`;
}
/* ---------------- Cây quay lui (thay bảng tính tay khi chạy quay lui) ----------------
   Cách làm theo file Tuần 6 (sinh_hoanvi_neon_responsive.html): dựng cả cây tìm kiếm từ trace một lần,
   nút chưa tới vẽ mờ; mỗi bước chỉ đổi class: đang xét (sáng) · chọn (xanh) · loại (đỏ, gạch) ·
   đã quay lui (mờ) · cắt tỉa (✂) · lời giải tốt nhất hiện hành (vàng). Gốc χ → tầng i là các màu đã thử cho đỉnh ord[i].
   Mỗi lần gặp lời giải tốt hơn, đường vàng cũ hết vàng (thành mờ) và đường mới sáng vàng.
   Kéo để di chuyển, lăn chuột để phóng to, nhấp đúp hoặc nút "Vừa khung" để xem cả cây; cây tự cuộn theo nút đang xét. */
const SVGNS = 'http://www.w3.org/2000/svg';
const TR = { nodes: [], focus: null, stage: null, g: null, v: { s: 1, x: 0, y: 0 }, W: 0, H: 0, fresh: true, ro: null };
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function buildTree() {
  const steps = st.steps, n = st.g.n, order = steps.find(s => s.order).order, nodes = [], focus = new Int32Array(steps.length);
  const mk = (level, label, parent, at, extra) => {
    const nd = Object.assign({ id: nodes.length, level, label: String(label), parent, at, kids: [], st: '' }, extra);
    nodes.push(nd); if (parent) parent.kids.push(nd);
    return nd;
  };
  const root = mk(0, 'χ', null, 0, { kind: 'root' });
  let path = [], best = [], f = root;
  const par = d => d > 0 ? path[d - 1] : root;
  steps.forEach((s, i) => {
    switch (s.type) {
      case 'select': case 'fail': f = par(s.depth); break;
      case 'sym': f = mk(s.depth + 1, '»', par(s.depth), i, { v: s.v, sym: s.c, rej: true }); break;
      case 'conflict': f = mk(s.depth + 1, s.c, par(s.depth), i, { c: s.c, v: s.v, u: s.u, rej: true }); break;
      case 'prune': f = mk(s.depth + 1, '✂', par(s.depth), i, { v: s.v, cut: s.c, kmin: s.kmin, rej: true }); break;
      case 'assign': f = path[s.depth] = mk(s.depth + 1, s.c, par(s.depth), i, { c: s.c, v: s.v }); break;
      case 'backtrack': f = path[s.depth]; f.back = i; break;
      case 'found': {                                    // đường vàng cũ hết vàng, đường mới vàng
        const now = path.slice(0, n);
        for (const nd of best) if (!now.includes(nd)) nd.goldEnd = i;
        for (const nd of now) if (nd.gold == null) nd.gold = i;
        best = now; f = path[n - 1];
        break;
      }
      case 'done': root.gold = i; f = root; break;
    }
    focus[i] = f.id;
  });
  /* xếp gọn kiểu Reingold–Tilford: mỗi cây con mang đường viền trái/phải theo từng tầng; anh em đặt sát nhau
     sao cho ở mọi tầng chung cách nhau ≥ 1 ô, cha nằm giữa con đầu và con cuối. Nhờ vậy nhánh sâu bên phải
     chui được xuống dưới các lá đỏ bên trái thay vì mỗi lá chiếm riêng một cột (cách cũ làm cây dàn ngang). */
  (function lay(nd) {                                    // trả về { l, r }: viền theo tầng, tính từ nd (nd ở 0)
    if (!nd.kids.length) return { l: [0], r: [0] };
    const cs = nd.kids.map(lay), off = [], L = [], R = [];
    cs.forEach((c, k) => {
      let o = k ? -Infinity : 0;
      for (let d = 0; d < c.l.length && d < R.length; d++) o = Math.max(o, R[d] - c.l[d] + 1);
      if (o === -Infinity) o = off[k - 1] + 1;           // không có tầng chung (không xảy ra vì mọi con cùng tầng) — phòng hờ
      off.push(o);
      for (let d = 0; d < c.l.length; d++) {
        L[d] = d < L.length ? Math.min(L[d], c.l[d] + o) : c.l[d] + o;
        R[d] = d < R.length ? Math.max(R[d], c.r[d] + o) : c.r[d] + o;
      }
    });
    const mid = (off[0] + off[off.length - 1]) / 2;
    nd.kids.forEach((kd, k) => { kd.dx = off[k] - mid; });
    return { l: [0, ...L.map(v => v - mid)], r: [0, ...R.map(v => v - mid)] };
  })(root);
  let x0 = 0, x1 = 0;
  (function place(nd, x) {
    nd.x = x; x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    for (const kd of nd.kids) place(kd, x + kd.dx);
  })(root, 0);
  const XU = 32, YU = 50, NH = 20, LX = 44, top = 18;    // LX: lề trái cho nhãn tầng
  const px = nd => LX + (nd.x - x0) * XU + XU / 2, py = nd => top + NH / 2 + nd.level * YU;
  TR.W = LX + (x1 - x0 + 1) * XU + 8; TR.H = top + NH + n * YU + 12;

  const body = $('#tbHtBody');
  body.innerHTML = '<p class="tb-key">Tầng i = màu thử cho đỉnh thuTu[i]. <b class="t-k ok">xanh</b> chọn · <b class="t-k bad">đỏ</b> loại (trùng màu) · ' +
    '<b class="t-k bad">✂</b> cắt tỉa · <b class="t-k">»</b> vượt số màu · <b class="t-k gold">vàng</b> lời giải tốt nhất hiện hành · mờ = đã quay lui. Kéo, lăn chuột để phóng to.</p>' +
    '<div class="bt-stage" data-lenis-prevent data-wheel-own><svg class="bt-svg" aria-label="Cây quay lui"></svg>' +
    '<button type="button" class="bt-fit" title="Xem cả cây (hoặc nhấp đúp vào cây)">⤢ Vừa khung</button>' +
    '<button type="button" class="bt-exp" aria-pressed="false" title="Mở rộng cây đè lên khung 3D (Esc để thu lại)">⛶ Mở rộng</button></div>';
  const stage = $('.bt-stage', body), svg = $('svg', stage), g = svgEl('g', { class: 'bt-view' }, svg);
  const rowsG = svgEl('g', {}, g), edgeG = svgEl('g', {}, g), nodeG = svgEl('g', {}, g);
  for (let L = 1; L <= n; L++) {                         // nhãn tầng i: đỉnh ord[i] = order[i-1]
    const y = top + NH / 2 + L * YU;
    svgEl('line', { x1: LX - 6, x2: TR.W, y1: y, y2: y, class: 't-row' }, rowsG);
    svgEl('text', { x: 4, y: y + 1, class: 't-rowl' }, rowsG).textContent = `v${order[L - 1]}`;
  }
  for (const nd of nodes) {
    const x = px(nd), y = py(nd), w = nd.kind === 'root' ? 30 : 28;
    if (nd.parent) {
      const x0 = px(nd.parent), y0 = py(nd.parent), my = (y0 + y) / 2;
      nd.edge = svgEl('path', { d: `M${x0} ${y0 + NH / 2} C${x0} ${my} ${x} ${my} ${x} ${y - NH / 2}`, class: 't-edge' }, edgeG);
    }
    const gg = svgEl('g', { class: 't-node' }, nodeG);
    svgEl('rect', { x: x - w / 2, y: y - NH / 2, width: w, height: NH, rx: 6, class: 't-shape' }, gg);
    if (nd.c != null) svgEl('circle', { cx: x - w / 2 + 7, cy: y, r: 3.5, fill: palHex(nd.c), class: 't-dot' }, gg);
    svgEl('text', { x: nd.c != null ? x + 4 : x, y: y + 1, class: 't-label' }, gg).textContent = nd.label;
    svgEl('title', {}, gg).textContent = nd.kind === 'root' ? 'Tìm sắc số χ(G)'
      : nd.sym != null ? `Đỉnh ${nd.v}, từ màu ${nd.sym}: vượt số màu (màu mới ${nd.sym - 1} đã thử, màu mới khác chỉ là đổi tên) → bỏ`
      : nd.cut != null ? `Đỉnh ${nd.v}, từ màu ${nd.cut}: không thể ít hơn soMauMin = ${nd.kmin} màu → cắt tỉa`
      : nd.rej ? `Đỉnh ${nd.v}, màu ${nd.c}: trùng với đỉnh kề ${nd.u} → loại` : `Đỉnh ${nd.v} tô màu ${nd.c}`;
    nd.el = gg; nd.cx = x; nd.cy = y;
  }
  Object.assign(TR, { nodes, focus, stage, g, fresh: true });
  $('.bt-fit', stage).addEventListener('click', () => trFit(true));
  $('.bt-exp', stage).addEventListener('click', () => { TB.btWide = !TB.btWide; tbApply(); });
  stage.addEventListener('dblclick', e => { if (!e.target.closest('button')) trFit(true); });
  stage.addEventListener('wheel', e => {                 // lăn chuột: phóng to/thu nhỏ quanh con trỏ
    e.preventDefault();
    const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, v = TR.v;
    const ns = clamp(v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 0.15, 3), k = ns / v.s;
    v.x = mx - (mx - v.x) * k; v.y = my - (my - v.y) * k; v.s = ns;
    trApply(false);
  }, { passive: false });
  let drag = null;                                       // kéo để di chuyển (chuột lẫn cảm ứng)
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging');
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    TR.v.x += e.clientX - drag.x; TR.v.y += e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    trApply(false);
  });
  const end = () => { drag = null; stage.classList.remove('dragging'); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  if (TR.ro) TR.ro.disconnect();                         // khung mở/đổi cỡ → căn lại lần đầu, sau đó chỉ bám nút đang xét
  TR.sw = TR.sh = 0;
  tbApply();                                             // nhãn nút Mở rộng theo trạng thái hiện tại
  TR.ro = new ResizeObserver(([e]) => {                 // nhớ cỡ khung để mỗi bước không phải đo lại (đo = ép tính layout)
    TR.sw = e.contentRect.width; TR.sh = e.contentRect.height;
    if (TR.sw && TR.fresh) trInit();
  });
  TR.ro.observe(stage);
}
function trApply(smooth) {
  const v = TR.v;
  TR.g.classList.toggle('anim', smooth && !REDUCED);
  TR.g.style.transform = `translate(${v.x.toFixed(1)}px,${v.y.toFixed(1)}px) scale(${v.s.toFixed(3)})`;
}
function trFit(smooth) {                                  // cả cây vừa khung
  const W = TR.sw, H = TR.sh, v = TR.v;
  if (!W) return;
  v.s = clamp(Math.min(W / TR.W, H / TR.H), 0.15, 1.2);
  v.x = (W - TR.W * v.s) / 2; v.y = Math.max(4, (H - TR.H * v.s) / 2);
  trApply(smooth);
}
function trInit() {                                       // lần đầu: vừa khung nếu chữ còn đọc được, không thì giữ cỡ dễ đọc và bám nút đang xét
  const W = TR.sw, H = TR.sh, v = TR.v;
  if (!W) return;
  TR.fresh = false;
  const fit = Math.min(W / TR.W, H / TR.H);
  if (fit >= 0.6) { trFit(false); return; }
  v.s = 0.75; v.x = W / 2 - TR.nodes[0].cx * v.s; v.y = 6;
  trApply(false);
  trFollow(TR.nodes[TR.focus[st.idx]], false);
}
function trFollow(nd, smooth) {                           // nút đang xét ra khỏi khung → dời khung đưa nó vào giữa
  const W = TR.sw, H = TR.sh, v = TR.v, m = 36;
  if (!W || !nd) return;
  const sx = nd.cx * v.s + v.x, sy = nd.cy * v.s + v.y;
  if (sx >= m && sx <= W - m && sy >= m && sy <= H - m) return;
  v.x = W / 2 - nd.cx * v.s; v.y = H / 2 - nd.cy * v.s;
  trApply(smooth);
}
function trState(nd, i) {
  if (i < nd.at) return 'todo';
  if (nd.gold != null && i >= nd.gold && !(i >= nd.goldEnd)) return 'leaf';
  if (nd.kind === 'root') return 'root';
  if (nd.sym != null) return 'symm';
  if (nd.rej) return 'rejected';
  if (nd.back != null && i >= nd.back) return 'done';
  return 'accepted';
}
const TR_EDGE = { todo: 'todo', leaf: 'gold', accepted: 'lit', root: 'lit', rejected: 'rej', symm: 'sym', done: 'dim' };
function updateHandBT(i) {
  const fid = TR.focus[i];
  for (const nd of TR.nodes) {
    const s = trState(nd, i), cls = s + (nd.id === fid ? ' active' : '');
    if (cls === nd.st) continue;
    nd.st = cls;
    nd.el.setAttribute('class', 't-node ' + cls);
    if (nd.edge) nd.edge.setAttribute('class', 't-edge ' + TR_EDGE[s] + (nd.id === fid ? ' act' : ''));
  }
  if (!TR.fresh) trFollow(TR.nodes[fid], true);
  const s = st.steps[i];
  $('#tbHtMeta').textContent = s.type === 'done' ? `χ = ${s.k} · quay lui ${s.backtracks}`
    : `soMauMin = ${s.kmin}${s.kmin > st.g.n ? ' (n+1)' : ''} · quay lui ${s.backtracks}`;
}
function tbScroll() {                                     // giữ dòng đang xét trong tầm nhìn của cả 2 bảng
  const s = st.steps[st.idx];
  if (TB.open.mx && TB.mx && s.v != null && s.v >= 0) keepVisible($('#tbMxBody'), TB.mx.rows[s.v + 1]);
  if (TB.open.ht) keepVisible($('#tbHtBody'), TB.trs.find(tr => tr.classList.contains('cur')));
}
function updateTables(i) {
  updateMatrix(st.steps[i]);
  if (st.algo === 'greedy') updateHandGreedy(i); else updateHandBT(i);
  tbScroll();
}

/* =====================================================================
 * Trace & player
 * ===================================================================== */
const scrub = $('#pScrub'), speed = $('#pSpeed');
const setFill = el => { const mx = +el.max || 1; el.style.setProperty('--fill', ((+el.value - +el.min) / (mx - +el.min || 1) * 100) + '%'); };

function computeTrace(seq = 0) {
  const t = S.trace(st.algo, st.g, 30000, st.lang);
  st.steps = t.steps; st.truncated = t.truncated;
  st.playing = false; st.acc = 0;
  if (st.layers) toggleLayers(false);
  renderCode();
  buildHand();
  TL.to = -1;                                             // trace mới → log dựng lại từ đầu
  scrub.max = Math.max(0, st.steps.length - 1);
  updateHUD();
  let i = 0;
  while (i + 1 < st.steps.length && st.steps[i + 1].seq <= seq) i++;
  setStep(i, false);
  setPlayIcon();
}

function setStep(i, animate) {
  i = clamp(i, 0, st.steps.length - 1);
  st.idx = i;
  const s = st.steps[i];
  setActiveLine(codeLine(s), animate);
  updateLog(i);
  updateAnnoContent(s, animate);
  updateHudColors(s);
  updateTables(i);
  scrub.value = i; setFill(scrub);
  if (lockT) lockT.textContent = lockText(s);
  const atEnd = s.type === 'done';
  const lb = $('#tLayers');
  lb.disabled = !atEnd;
  lb.title = atEnd ? 'Xếp mỗi ngăn thành một tầng' : 'Chạy xong để tách ngăn';
  if (!atEnd && st.layers) toggleLayers(false);
  if (animate && glOK) triggerFx(s);
}

function setPlayIcon() {
  $('#playIco').innerHTML = st.playing ? '<path d="M4 2h3v12H4zM9 2h3v12H9z"/>' : '<path d="M4 2l10 6-10 6z"/>';
  $('#pPlay').setAttribute('aria-label', st.playing ? 'Tạm dừng' : 'Chạy');
}
function play(on) {
  if (on && st.idx >= st.steps.length - 1) setStep(0, false);
  st.playing = on; st.acc = stepMs();
  setPlayIcon();
}
function tickPlayer(dt) {
  if (!st.playing) return;
  st.acc += dt * 1000;
  if (st.acc >= stepMs()) {
    st.acc = 0;
    if (st.idx < st.steps.length - 1) setStep(st.idx + 1, true);
    else play(false);
  }
}

$('#pPlay').addEventListener('click', () => play(!st.playing));
$('#pPrev').addEventListener('click', () => { play(false); setStep(st.idx - 1, true); });
$('#pNext').addEventListener('click', () => { play(false); setStep(st.idx + 1, true); });
$('#pFirst').addEventListener('click', () => { play(false); setStep(0, false); });
$('#pLast').addEventListener('click', () => { play(false); setStep(st.steps.length - 1, false); });
scrub.addEventListener('input', () => { play(false); setStep(+scrub.value, false); });
speed.addEventListener('input', () => {
  st.speedI = +speed.value;
  $('#pSpeedOut').textContent = SPEEDS[st.speedI] + '×';
  setFill(speed);
});
setFill(speed);

/* ---------------- Hiệu ứng theo sự kiện ---------------- */
function spawnPulse(a, b, color, size = 1) {
  if (a < 0 || b < 0) return;
  const dur = clamp(stepMs() / 1000 * 0.75, 0.18, 0.7);
  pulse.list.push({ a, b, c: color, t: 0, dur, size });
  if (pulse.list.length > PULSE_SLOTS / 2) pulse.list.shift();
}
function spawnRipple(v, color, delay = 0) {
  const r = ripples.find(x => x.t >= x.dur) || ripples[0];
  r.node = v; r.t = -delay; r.dur = 0.85; r.mesh.material.color.copy(color); r.mesh.visible = false;
}
function triggerFx(s) {
  switch (s.type) {
    case 'conflict': spawnPulse(s.u, s.v, WARN, 1.3); break;
    case 'assign': spawnRipple(s.v, palColor(s.c)); break;
    case 'dec': for (const u of s.us) spawnPulse(s.v, u, palColor(s.c), 0.9); break;
    case 'backtrack': GV.glitch[s.v] = 0.5; spawnRipple(s.v, AMBER); break;
    case 'prune': GV.glitch[s.v] = 0.4; break;
    case 'done': case 'found': {
      const cols = st.steps[st.idx].colors;
      for (let i = 0; i < Math.min(GV.n, ripples.length); i++) spawnRipple(i, palColor(Math.max(0, cols[i])), i * 0.06);
      break;
    }
  }
}

/* ---------------- Công cụ góc nhìn ---------------- */
function setPressed(btn, on) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
function toggleLayers(on) { st.layers = on; setPressed($('#tLayers'), on); if (on) { st.flat = false; setPressed($('#tFlat'), false); } }
$('#tFlat').addEventListener('click', e => { st.flat = !st.flat; setPressed(e.currentTarget, st.flat); if (st.flat && st.layers) toggleLayers(false); });
$('#tLayers').addEventListener('click', () => toggleLayers(!st.layers));
$('#tFollow').addEventListener('click', e => { st.follow = !st.follow; setPressed(e.currentTarget, st.follow); });
$('#tZoomIn').addEventListener('click', () => { st.zoom = clamp(st.zoom * 1.18, 0.55, 2.4); });
$('#tZoomOut').addEventListener('click', () => { st.zoom = clamp(st.zoom / 1.18, 0.55, 2.4); });
const DEFAULT_Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, -0.45, 0));
function resetView() { graphGroup.quaternion.copy(DEFAULT_Q); st.zoom = 1; dragVel.x = dragVel.y = 0; }
$('#tReset').addEventListener('click', resetView);
resetView();

/* =====================================================================
 * Nạp đồ thị
 * ===================================================================== */
function loadGraph(g, meta) {
  st.g = g; st.meta = meta;
  const bt = g.n <= 90 ? S.backtrack(g, null, { budget: 4e5 }) : { aborted: true };
  if (!bt.aborted && bt.k > 0) { st.best = bt.colors; st.chi = bt.k; st.chiExact = true; }
  else { st.best = S.greedy(g, null).colors; st.chi = meta.chi ?? null; st.chiExact = meta.chi != null; }
  if (meta.chi != null) st.chi = meta.chi;
  if (glOK) buildGraphView(g);
  buildLabels(g.n);
  buildMatrix(g);
  tbLayout();
  tickKey = -1;
  computeTrace();
  computeCompare();
  buildPairs(g);
  $('#probNote').hidden = meta.id === 'cargo';
  $('#probName').textContent = meta.name;
}
function presetMeta(p) { return { id: p.id, name: p.name, chi: p.chi, desc: p.desc }; }
function loadPreset(id) {
  const p = S.PRESETS.find(x => x.id === id);
  if (p) loadGraph(p.build(), presetMeta(p));
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-preset]');
  if (b && !b.closest('#opts')) loadPreset(b.dataset.preset);
});

/* ---------------- So sánh ---------------- */
function fmtTime(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(ms < 0.01 ? 1 : 0)} µs`;
  return `${ms.toFixed(ms < 10 ? 2 : 1)} ms`;
}
function computeCompare() {
  const g = st.g;
  const rows = Object.keys(S.ALGOS).map(id => {
    const A = S.ALGOS[id];
    if (id === 'backtrack' && g.n > 90) return { id, A, skip: true };
    let r, reps = 0;
    const t0 = performance.now();
    do { r = A.run(g, null, { budget: 1e6 }); reps++; } while (performance.now() - t0 < 10 && reps < 300 && !r.aborted);
    const ms = (performance.now() - t0) / reps;
    const tr = S.trace(id, g, 6000);
    return { id, A, k: r.k, aborted: r.aborted, ms, steps: tr.steps.length, trunc: tr.truncated };
  });
  const chi = st.chi;
  $('#cmpFit').textContent = chi != null
    ? `Chương trình tự xếp mẫu vào χ = ${chi} ngăn, số ngăn ít nhất có thể. Thuật toán nào dùng nhiều hơn ${chi} ngăn là chưa tối ưu.`
    : `Chưa xác định được χ. Chương trình tự xếp theo phương án tốt nhất tìm được: ${S.usedCount(st.best)} ngăn.`;
  $('#cmpSub').textContent = `${st.meta.name} · n = ${g.n} · m = ${g.edges.length}` +
    (chi != null ? ` · χ = ${chi}${st.meta.chi == null ? ' (tìm bằng quay lui)' : ''}` : ' · χ chưa xác định');
  $('#cmpBody').innerHTML = rows.map(r => {
    const name = `<td><span class="an">${r.A.short}<small>${esc(r.A.desc)}</small></span></td>`;
    if (r.skip || r.aborted) return `<tr>${name}<td><span class="pill na">vượt giới hạn</span></td><td class="num">—</td><td class="num">—</td><td class="num">${r.A.cx}</td></tr>`;
    const sq = Array.from({ length: Math.min(r.k, 16) }, (_, c) => `<i style="--c:${palHex(c)}"></i>`).join('');
    let pill = '';
    if (r.A.exact) pill = '<span class="pill ok">chính xác</span>';
    else if (chi != null) pill = r.k === chi ? '<span class="pill ok">tối ưu</span>' : `<span class="pill over">+${r.k - chi} so với χ</span>`;
    return `<tr>${name}<td><span class="bars">${sq}<b>${r.k}</b>${pill}</span></td>` +
      `<td class="num">${r.steps.toLocaleString('vi-VN')}${r.trunc ? '+' : ''}</td><td class="num">${fmtTime(r.ms)}</td><td class="num">${r.A.cx}</td></tr>`;
  }).join('');
}

/* ---------------- Ví dụ mẫu ở phần Mô hình ---------------- */
(function fillSample() {
  const p = S.PRESETS.find(x => x.id === 'cargo'), g = p.build();
  const r = S.backtrack(g, null);
  const L = g.labels;
  $('#sampleIn').textContent = S.toEdgeListText(g);
  $('#sampleK').textContent = r.k;
  $('#sampleFit').textContent = 'chương trình tự chia, ít ngăn nhất';
  $('#samplePens').innerHTML = Array.from({ length: r.k }, (_, c) => {
    const names = [];
    for (let v = 0; v < g.n; v++) if (r.colors[v] === c) names.push(`${L[v].sym} ${L[v].name} (${v})`);
    return `<div><span class="tag" style="--c:${palHex(c)}">Ngăn ${c + 1} · c = ${c}</span><span>${esc(names.join(', '))}</span></div>`;
  }).join('');
  $('#hsN').textContent = g.n;
  $('#hsM').textContent = g.edges.length;
  $('#hsChi').innerHTML = `${r.k}<small>= χ(G)</small>`;
  if (LYRA) { $('#lbChi').textContent = r.k; $('#lbM').textContent = g.edges.length; $('#lbN').textContent = g.n; }
})();

/* =====================================================================
 * Section & cuộn
 * ===================================================================== */
const SECS = ['hero', 'problem', 'model', 'demo', 'compare'].map(id => ({ id, el: document.getElementById(id), box: $(`[data-gbox="${id}"]`) }));
const SEC_SPIN = { hero: 0.16, problem: FROST ? 0.13 : 0.07, model: 0.09, demo: 0, compare: 0.14 };
function sectionState(H) {
  const vc = H * 0.5;
  const rects = SECS.map(s => s.el.getBoundingClientRect());
  let i = rects.findIndex(r => r.top <= vc && r.bottom > vc);
  if (i < 0) i = rects[0].top > vc ? 0 : SECS.length - 1;
  const r = rects[i];
  const p = clamp((vc - r.top) / r.height, 0, 1);
  let a = i, b = i, w = 0;
  if (p > 0.5 && i < SECS.length - 1) { b = i + 1; w = smooth(0.5, 1, p); }
  return { a, b, w, rects, dom: SECS[w < 0.5 ? a : b].id };
}

let lenis = null;
if (!REDUCED && typeof window.Lenis === 'function') {
  try { lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, anchors: false, virtualScroll: FROST ? snapWheel : undefined }); } catch (e) { lenis = null; }
}

/* Frost: mỗi lần lăn chuột chuyển đúng 1 trang, khung nội dung mỗi phần nằm giữa vùng dưới topbar.
   Chạy cả khi không có Lenis (Windows tắt Animation effects ⇒ prefers-reduced-motion ⇒ REDUCED) */
let snapUntil = 0, snapLastWheel = 0, snapRaf = 0;
const snapPos = () => lenis ? lenis.scroll : scrollY;
function snapStops() {
  const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H), pos = snapPos();
  const TB = $('.topbar').getBoundingClientRect().bottom, avail = H - TB;
  const ys = [0, max];
  for (const s of SECS) {
    const top = s.el.getBoundingClientRect().top + pos, h = s.el.offsetHeight;
    let a = Infinity, b = -Infinity;                       // khung nội dung = hợp các khối con đang hiện
    for (const c of s.el.children) { const r = c.getBoundingClientRect(); if (r.height) { a = Math.min(a, r.top + pos); b = Math.max(b, r.bottom + pos); } }
    if (!isFinite(a)) { ys.push(top); continue; }
    if (b - a <= avail) { ys.push(a - TB - (avail - (b - a)) / 2); continue; }
    // khung cao hơn màn hình: dừng ở đầu khung, giữa (nếu cần), và cuối khung
    const y0 = a - TB - 12, y1 = b - H + 12;
    for (let y = y0; y < y1; y += avail * 0.85) ys.push(y);
    ys.push(y1);
  }
  return ys.map(y => clamp(Math.round(y), 0, max)).sort((a, b) => a - b).filter((y, i, a) => i === 0 || y - a[i - 1] > 8);
}
function snapWheel({ deltaX, deltaY, event }) {
  if (event.type !== 'wheel' || event.ctrlKey || optsOpen || (lenis && lenis.isStopped) || Math.abs(deltaX) > Math.abs(deltaY)) return true;
  if (event.target instanceof Element && event.target.closest('[data-wheel-own]')) return true;   // khung tự xử lý lăn chuột (cây quay lui: phóng to)
  // khung tự cuộn (mã giả…): chỉ nhường khi khung còn chỗ cuộn theo hướng lăn, hết chỗ thì chuyển trang
  const box = event.composedPath().find(n => n instanceof HTMLElement && n.hasAttribute('data-lenis-prevent'));
  if (box && (deltaY > 0 ? box.scrollTop + box.clientHeight < box.scrollHeight - 1 : box.scrollTop > 0)) return true;
  event.preventDefault();
  const now = performance.now(), gap = now - snapLastWheel;
  snapLastWheel = now;
  // bỏ qua khi đang chuyển trang, và cả chuỗi wheel quán tính (touchpad / lăn mạnh) cho tới khi tay dừng lăn
  if (now < snapUntil || gap < 160 || Math.abs(deltaY) < 2) return false;
  snapGo(deltaY > 0 ? 1 : -1);
  return false;
}
/* chuyển sang điểm dừng kế tiếp (dir = 1 xuống, -1 lên); trả false nếu đã ở cuối */
function snapNext(dir) {
  const cur = snapPos(), stops = snapStops();
  return dir > 0 ? stops.find(y => y > cur + 4) : stops.slice().reverse().find(y => y < cur - 4);
}
function snapGo(dir) {
  const now = performance.now();
  if (now < snapUntil) return;
  const to = snapNext(dir);
  if (to === undefined) return;
  snapUntil = now + 1100;
  if (lenis) { lenis.scrollTo(to, { duration: 1.1, lock: true }); return; }
  cancelAnimationFrame(snapRaf);
  const from = scrollY, t0 = now, D = 900;                // không có Lenis: tự tween, ease-out
  const tick = t => {
    const k = clamp((t - t0) / D, 0, 1);
    window.scrollTo(0, from + (to - from) * (1 - Math.pow(1 - k, 3)));
    if (k < 1) snapRaf = requestAnimationFrame(tick);
  };
  snapRaf = requestAnimationFrame(tick);
}
/* nút mũi tên ngay dưới đồ thị: bấm để sang trang kế */
const snapBtn = FROST ? document.createElement('button') : null;
if (snapBtn) {
  snapBtn.type = 'button';
  snapBtn.className = 'snap-next';
  snapBtn.setAttribute('aria-label', 'Sang phần kế tiếp');
  snapBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  snapBtn.addEventListener('click', () => snapGo(1));
  document.body.appendChild(snapBtn);
}
if (FROST && !lenis) addEventListener('wheel', e => snapWheel({ deltaX: e.deltaX, deltaY: e.deltaY, event: e }), { passive: false });
function scrollToEl(el) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const el = document.getElementById(a.getAttribute('href').slice(1));
  if (!el) return;
  e.preventDefault();
  scrollToEl(el);
});

/* Bàn phím cho player khi đang ở phần Demo */
let domSec = 'hero';
document.addEventListener('keydown', e => {
  if (optsOpen) { if (e.key === 'Escape') closeOpts(); return; }
  if (domSec !== 'demo') return;
  const t = e.target;
  if (t.closest && t.closest('input, textarea, select')) return;
  if (e.key === ' ' && !(t.tagName === 'BUTTON')) { e.preventDefault(); play(!st.playing); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); play(false); setStep(st.idx + 1, true); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); play(false); setStep(st.idx - 1, true); }
  else if (e.key === 'Escape' && TB.btWide) { TB.btWide = false; tbApply(); }   // thu cây đang mở rộng
  else if (e.key === 'Escape' && !TB.wide && (TB.open.mx || TB.open.ht)) { TB.open.mx = TB.open.ht = false; tbApply(); }   // đóng bảng đang đè lên đồ thị
});

/* ---------------- Kéo chuột để xoay ---------------- */
const Y_AXIS = new THREE.Vector3(0, 1, 0), X_AXIS = new THREE.Vector3(1, 0, 0);
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
function rotateBy(ax, ay) {
  graphGroup.quaternion.premultiply(_q1.setFromAxisAngle(Y_AXIS, ax)).premultiply(_q2.setFromAxisAngle(X_AXIS, ay));
}
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || e.button !== 0) return;
  drag = { x: e.clientX, y: e.clientY, t: performance.now() };
  dragVel.x = dragVel.y = 0;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
});
canvas.addEventListener('pointermove', e => {
  mouse = { x: e.clientX, y: e.clientY };
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
  const dtm = Math.max(8, now - drag.t) / 1000;
  drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
  if (curMode.layer > 0.5 || curMode.flat > 0.5) return;
  rotateBy(dx * 0.006, dy * 0.006);
  dragVel.x = dx * 0.006 / dtm; dragVel.y = dy * 0.006 / dtm;
});
const endDrag = e => { if (!drag) return; drag = null; try { canvas.releasePointerCapture(e.pointerId); } catch (_) {} canvas.style.cursor = ''; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { mouse = null; });
canvas.addEventListener('dblclick', resetView);

/* =====================================================================
 * Panel Tuỳ chọn (khói)
 * ===================================================================== */
const smoke = (() => {
  const cv = $('#smoke');
  let gl = null, uR, uT, raf = 0, on = false, t0 = 0;
  function init() {
    gl = cv.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) return false;
    const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;uniform vec2 r;uniform float t;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
        return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
      uniform vec3 cBase,cMid,cHi,cTint;uniform float vigAmt;
      void main(){
        vec2 uv=gl_FragCoord.xy/r; vec2 p=(gl_FragCoord.xy-.5*r)/r.y*2.4;
        vec2 q=vec2(fbm(p+vec2(0.,t*.07)),fbm(p+vec2(5.2,1.3)-t*.05));
        float f=fbm(p+2.3*q+vec2(t*.035,-t*.025));
        vec3 sm=mix(cMid,cHi,pow(f,3.2)*1.25);
        vec3 col=mix(cBase,sm,smoothstep(.22,.98,f)*.8);
        col+=cTint*pow(clamp(q.y,0.,1.),6.)*.22;
        float vig=smoothstep(1.35,.15,length(uv-.5)*1.7);
        gl_FragColor=vec4(col*(1.-vigAmt+vigAmt*vig),1.);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { gl = null; return false; }
    gl.useProgram(pr);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uR = gl.getUniformLocation(pr, 'r'); uT = gl.getUniformLocation(pr, 't');
    const U = (nm, v) => gl.uniform3fv(gl.getUniformLocation(pr, nm), v);
    if (LUMEN) { U('cBase', [0.885, 0.88, 0.95]); U('cMid', [0.93, 0.915, 0.985]); U('cHi', [0.99, 0.98, 1]); U('cTint', [-0.28, -0.2, 0.02]); }
    else if (FROST) { U('cBase', [0.76, 0.785, 0.815]); U('cMid', [0.84, 0.86, 0.885]); U('cHi', [1, 1, 1]); U('cTint', [0.1, 0.16, 0.3]); }
    else if (ORION) { U('cBase', [0.006, 0.016, 0.05]); U('cMid', [0.03, 0.09, 0.26]); U('cHi', [0.4, 0.68, 1]); U('cTint', [0.1, 0.45, 1]); }
    else if (LYRA) { U('cBase', [0.04, 0.03, 0.08]); U('cMid', [0.14, 0.09, 0.27]); U('cHi', [0.78, 0.55, 1]); U('cTint', [0.35, 0.4, 1]); }
    else { U('cBase', [0.008, 0.026, 0.036]); U('cMid', [0.03, 0.16, 0.2]); U('cHi', [0.45, 0.95, 1]); U('cTint', [0.55, 0.25, 0.95]); }
    gl.uniform1f(gl.getUniformLocation(pr, 'vigAmt'), LUMEN ? 0.05 : FROST ? 0.16 : 0.5);
    return true;
  }
  function resize() {
    if (!gl) return;
    cv.width = Math.max(2, (innerWidth * 0.5) | 0); cv.height = Math.max(2, (innerHeight * 0.5) | 0);
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function loop(t) {
    if (!on) return;
    gl.uniform2f(uR, cv.width, cv.height);
    gl.uniform1f(uT, REDUCED ? 6 : (t - t0) / 1000 + 6);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!REDUCED) raf = requestAnimationFrame(loop);
  }
  return {
    start() { if (!gl && !init()) return; on = true; resize(); t0 = performance.now(); raf = requestAnimationFrame(loop); },
    stop() { on = false; cancelAnimationFrame(raf); },
    resize,
  };
})();

const optsEl = $('#opts');
let optsOpen = false, optsFull = false, opener = null, closeTimer = 0;
const pending = { g: null, meta: null, algo: 'greedy', dirty: false };

function buildOptionCards() {
  $('#algoCards').innerHTML = Object.entries(S.ALGOS).map(([id, A]) =>
    `<button type="button" class="card" role="radio" aria-checked="${id === pending.algo}" data-algo="${id}">
       <b>${A.name}</b><span>${esc(A.desc)}</span><em>${A.cx}</em></button>`).join('');
  $('#presetCards').innerHTML = S.PRESETS.map(p =>
    `<button type="button" class="card" aria-pressed="${pending.meta && pending.meta.id === p.id}" data-pick="${p.id}">
       <b>${esc(p.name)}</b><span>${esc(p.desc)}</span><em>χ = ${p.chi}</em></button>`).join('');
}
function updatePending(msgs = []) {
  const g = pending.g, m = pending.meta;
  $('#pendInfo').innerHTML = `<b>${esc(m.name)}</b> · n = ${g.n} · m = ${g.edges.length}` +
    (m.chi != null ? ` · χ = ${m.chi} ngăn` : ' · số ngăn tự tính khi chạy') +
    `<br>Thuật toán: <b>${esc(S.ALGOS[pending.algo].name)}</b>`;
  $('#pendMsgs').innerHTML = msgs.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join('');
  $$('#presetCards .card').forEach(c => c.setAttribute('aria-pressed', String(!!m.id && c.dataset.pick === m.id)));
  $$('#algoCards .card').forEach(c => c.setAttribute('aria-checked', String(c.dataset.algo === pending.algo)));
}
function fillText(g) { $('#edgeText').value = S.toEdgeListText(g); pending.dirty = false; $('#parseMsgs').innerHTML = ''; }
function parseText() {
  const r = S.parseInput($('#edgeText').value);
  const box = $('#parseMsgs');
  if (r.errors.length) {
    box.innerHTML = r.errors.slice(0, 6).map(t => `<span class="e">✕ ${esc(t)}</span>`).join('') +
      (r.errors.length > 6 ? `<span class="e">… và ${r.errors.length - 6} lỗi khác</span>` : '');
    return null;
  }
  box.innerHTML = `<span class="ok">✓ Hợp lệ: n = ${r.graph.n}, m = ${r.graph.edges.length}</span>` +
    r.warnings.map(t => `<span class="w">! ${esc(t)}</span>`).join('');
  return r.graph;
}

function openOpts(btn) {
  if (optsOpen) return;
  opener = btn || null;
  const r = btn ? btn.getBoundingClientRect() : { left: innerWidth - 60, top: 10, width: 40, height: 40 };
  optsEl.style.setProperty('--ox', `${r.left + r.width / 2}px`);
  optsEl.style.setProperty('--oy', `${r.top + r.height / 2}px`);
  pending.g = st.g; pending.meta = st.meta; pending.algo = st.algo;
  buildOptionCards(); fillText(st.g); updatePending();
  clearTimeout(closeTimer);
  optsEl.hidden = false;
  optsOpen = true;
  play(false);
  lenis && lenis.stop();
  document.documentElement.style.overflow = 'hidden';
  smoke.start();
  requestAnimationFrame(() => requestAnimationFrame(() => optsEl.classList.add('open')));
  setTimeout(() => { optsFull = true; $('#optsClose').focus({ preventScroll: true }); }, REDUCED ? 0 : 760);
}
function closeOpts() {
  if (!optsOpen) return;
  optsOpen = false; optsFull = false;
  optsEl.classList.remove('open');
  document.documentElement.style.overflow = '';
  lenis && lenis.start();
  closeTimer = setTimeout(() => { optsEl.hidden = true; smoke.stop(); }, REDUCED ? 0 : 760);
  if (opener) opener.focus({ preventScroll: true });
}
$('#optsTop').addEventListener('click', e => openOpts(e.currentTarget));
$('#tOpts').addEventListener('click', e => openOpts(e.currentTarget));
$('#optsClose').addEventListener('click', closeOpts);
$('#algoCards').addEventListener('click', e => {
  const c = e.target.closest('[data-algo]'); if (!c) return;
  pending.algo = c.dataset.algo; updatePending();
});
$('#presetCards').addEventListener('click', e => {
  const c = e.target.closest('[data-pick]'); if (!c) return;
  const p = S.PRESETS.find(x => x.id === c.dataset.pick);
  pending.g = p.build(); pending.meta = presetMeta(p);
  fillText(pending.g); updatePending();
});
const rN = $('#rN'), rP = $('#rP'), rS = $('#rS');
const syncR = () => { $('#rNo').textContent = rN.value; $('#rPo').textContent = (rP.value / 100).toFixed(2); setFill(rN); setFill(rP); };
rN.addEventListener('input', syncR); rP.addEventListener('input', syncR); syncR();
$('#rGo').addEventListener('click', () => {
  const n = clamp(+rN.value || 16, 1, 60), p = clamp(+rP.value / 100, 0.01, 1), seed = clamp(Math.round(+rS.value || 1), 1, 999999);
  rS.value = seed;
  pending.g = S.randomGraph(n, p, seed);
  pending.meta = { id: null, name: `Ngẫu nhiên G(${n}, ${p.toFixed(2)}) · seed ${seed}`, chi: null };
  fillText(pending.g); updatePending([['ok', `Đã sinh ${pending.g.edges.length} cạnh.`]]);
});
$('#edgeText').addEventListener('input', () => { pending.dirty = true; parseText(); });
function useText() {
  const g = parseText();
  if (!g) { updatePending([['e', 'Danh sách cạnh còn lỗi, chưa thể dùng.']]); return false; }
  pending.g = g; pending.meta = { id: null, name: 'Đồ thị tự nhập', chi: null }; pending.dirty = false;
  updatePending([['ok', 'Đã nhận đồ thị từ danh sách cạnh.']]);
  return true;
}
$('#useText').addEventListener('click', useText);
$('#optsApply').addEventListener('click', () => {
  if (pending.dirty && !useText()) { $('#edgeText').focus(); return; }
  const graphChanged = pending.g !== st.g;
  const algoChanged = pending.algo !== st.algo;
  st.algo = pending.algo;
  if (graphChanged) loadGraph(pending.g, pending.meta);
  else if (algoChanged) computeTrace();
  opener = null;
  closeOpts();
  setTimeout(() => scrollToEl($('#demo')), REDUCED ? 0 : 420);
});

/* =====================================================================
 * Vòng render
 * ===================================================================== */
const curMode = { flat: 0, layer: 0, spin: SEC_SPIN.hero, reveal: 1 };
const curBox = { x: 0, y: 0, s: 300, init: false };
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpC = new THREE.Color(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
const ident = new THREE.Quaternion(), tgtQ = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 'YXZ');
const raycaster = new THREE.Raycaster();
const FOCUS_TYPES = new Set(['line', 'select', 'try', 'ok', 'newcolor', 'assign', 'mark', 'dec', 'conflict', 'sym', 'prune', 'backtrack', 'fail']);
const tip = $('#tip');
let labelSz = [], labelA = [];
/* Frost, phần bài toán: cạnh trắng lần lượt mọc từ đỉnh này sang đỉnh kia (lan theo BFS), giữ, mờ, lặp lại */
const EA = { g: null, on: false, t: 0, start: null, from: null, cycle: 0, fadeAt: 0 };
const EA_GROW = 0.5, EA_GAP = 0.12, EA_HOLD = 60, EA_FADE = 1, EA_REST = 0.5;   // vẽ xong giữ nguyên 1 phút rồi mới lặp
function edgeOrder(g) {
  const n = g.n, m = g.edges.length, inc = Array.from({ length: n }, () => []);
  g.edges.forEach(([a, b], e) => { inc[a].push(e); inc[b].push(e); });
  const start = new Float32Array(m), from = new Uint8Array(m), done = new Uint8Array(m), seen = new Uint8Array(n);
  let k = 0;
  const roots = [...Array(n).keys()].sort((u, v) => inc[v].length - inc[u].length);
  for (const r of roots) {
    if (seen[r]) continue;
    seen[r] = 1;
    const q = [r];
    while (q.length) {
      const u = q.shift();
      for (const e of inc[u]) {
        if (done[e]) continue;
        done[e] = 1; from[e] = g.edges[e][0] === u ? 0 : 1; start[e] = k++ * EA_GAP;
        const v = g.edges[e][from[e] ? 0 : 1];
        if (!seen[v]) { seen[v] = 1; q.push(v); }
      }
    }
  }
  EA.fadeAt = (k - 1) * EA_GAP + EA_GROW + EA_HOLD;
  EA.cycle = EA.fadeAt + EA_FADE + EA_REST;
  EA.start = start; EA.from = from;
}
let W = innerWidth, H = innerHeight, Rcur = 4, prevNav = '', groupOff = new THREE.Vector3();
let layerHigh = false;

function resize() {
  W = innerWidth; H = innerHeight;
  if (glOK) {
    const dpr = Math.min(devicePixelRatio || 1, W < 820 ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(W, H); }
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    for (const m of glowMats) m.uniforms.uScale.value = (H * dpr) / (2 * TAN_HALF);
    if (sky) sky.resize(W, H);
  }
  smoke.resize();
}
addEventListener('resize', resize);
resize();

function rectOf(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.min(r.width, r.height) }; }

function colorSource(dom) {
  if (dom === 'demo') return st.steps[st.idx].colors;
  if (dom === 'problem') return null;
  return st.best;
}

function nodeWorld(i, out) {
  return out.set(GV.pCur[i * 3], GV.pCur[i * 3 + 1], GV.pCur[i * 3 + 2]).applyMatrix4(graphGroup.matrixWorld);
}
function project(world) {
  tmpV2.copy(world).project(camera);
  return { x: (tmpV2.x + 1) / 2 * W, y: (1 - tmpV2.y) / 2 * H, behind: tmpV2.z > 1 };
}

function updateTicker(reveal) {
  const g = st.g, m = g.edges.length;
  const k = Math.min(m, Math.floor(reveal * m + 0.001));
  if (k === tickKey) return;
  tickKey = k;
  $('#tickCount').textContent = `${k}/${m}`;
  $('#tickMeter').style.setProperty('--p', m ? k / m : 0);
  if (k === 0) { $('#tickText').textContent = 'Chưa có cặp nào'; return; }
  const [a, b] = g.edges[k - 1];
  const L = g.labels;
  $('#tickText').textContent = L
    ? `${L[a].sym} ${L[a].name} — ${L[b].sym} ${L[b].name} · ${g.reasons[k - 1]}`
    : `Đỉnh ${a} — đỉnh ${b}`;
}

/* Frost: ma trận kề (1 = có phản ứng, 0 = không) trong khung bài toán, ô sáng theo cạnh đang mọc */
let pairEls = [], pairState = [], pairCell = null, pairCapKey = '', pairOrd = [];
const pairBox = FROST ? document.createElement('div') : null;
if (pairBox) {
  pairBox.className = 'pairs';
  pairBox.innerHTML = '<div class="pairs-h"><span>Ma trận phản ứng</span><span class="pairs-key"><b>1</b> có phản ứng <b>0</b> không <span class="pairs-n"></span></span></div>'
    + '<div class="pairs-body"><div class="adj-wrap" data-lenis-prevent></div>'
    + '<div class="pairs-side"><p class="pairs-sub"></p><ol class="pairs-log"></ol></div></div>';
  $('.problem .ticker').before(pairBox);
  pairBox.addEventListener('mouseover', e => {
    const c = e.target.closest('td[data-a]');
    setPairCell(c ? [+c.dataset.a, +c.dataset.b] : null);
  });
  pairBox.addEventListener('mouseleave', () => setPairCell(null));
}
function setPairCell(ab) {                                // tô dòng/cột đang trỏ
  if (String(ab) === String(pairCell)) return;
  pairBox.querySelectorAll('.hl').forEach(x => x.classList.remove('hl'));
  pairCell = ab;
  if (!ab) return;
  const t = pairBox.querySelector('table');
  t.rows[ab[0] + 1].cells[0].classList.add('hl');
  t.rows[0].cells[ab[1] + 1].classList.add('hl');
}
function pairText(g, e) {
  const [a, b] = g.edges[e], L = g.labels;
  return L ? `${L[a].sym} ${L[a].name} — ${L[b].sym} ${L[b].name}` + (g.reasons && g.reasons[e] ? ` · ${g.reasons[e]}` : '') : `Đỉnh ${a} — đỉnh ${b}`;
}
function buildPairs(g) {
  if (!pairBox) return;
  const n = g.n, L = g.labels, nm = i => esc(L ? L[i].sym : String(i));
  EA.g = g; edgeOrder(g); EA.on = false;
  const eAt = new Int32Array(n * n).fill(-1);
  g.edges.forEach(([a, b], e) => { eAt[a * n + b] = e; eAt[b * n + a] = e; });
  let h = '<table class="adj"><tr><th></th>';
  for (let j = 0; j < n; j++) h += `<th title="${L ? esc(L[j].name) : ''}">${nm(j)}</th>`;
  h += '</tr>';
  for (let i = 0; i < n; i++) {
    h += `<tr><th title="${L ? esc(L[i].name) : ''}">${nm(i)}</th>`;
    for (let j = 0; j < n; j++) {
      const e = eAt[i * n + j];
      h += e >= 0 ? `<td data-a="${i}" data-b="${j}" data-e="${e}">1</td>` : `<td data-a="${i}" data-b="${j}" class="z${i === j ? ' dg' : ''}">0</td>`;
    }
    h += '</tr>';
  }
  const wrap = pairBox.querySelector('.adj-wrap');
  wrap.innerHTML = h + '</table>';
  wrap.classList.toggle('big', n > 16);
  pairEls = g.edges.map(() => []);
  pairBox.querySelectorAll('td[data-e]').forEach(c => pairEls[+c.dataset.e].push(c));
  pairState = pairEls.map(() => '');
  pairBox.querySelector('.pairs-n').textContent = `· ${g.edges.length} cặp`;
  pairOrd = g.edges.map((_, e) => e).sort((u, v) => EA.start[u] - EA.start[v]);
  pairCell = null; pairCapKey = '';
}
function updatePairs(cur) {                               // cur: cạnh đang mọc (-1 nếu không có)
  if (!pairBox || !pairEls.length) return;
  for (let e = 0; e < pairEls.length; e++) {
    let s = '';
    if (EA.on && EA.t < EA.fadeAt) { const g = (EA.t - EA.start[e]) / EA_GROW; s = g >= 1 ? 'done' : g > 0 ? 'on' : ''; }
    else if (!EA.on) s = 'done';
    if (s !== pairState[e]) { for (const c of pairEls[e]) c.className = s; pairState[e] = s; }
  }
  /* cột phải: mặc định là nhật ký cặp vừa nối (mới nhất trên cùng); trỏ vào ô thì liệt kê mọi phản ứng của chất ở dòng đó */
  const g = st.g, L = g.labels, nm = i => L ? L[i].sym : String(i), full = i => L ? `${L[i].sym} ${L[i].name}` : `Đỉnh ${i}`;
  const line = (e, a, cls) => {
    const [x, y] = g.edges[e], b = a === x ? y : x, r = g.reasons ? g.reasons[e] || '' : '';
    return `<li class="${cls}" title="${esc(pairText(g, e))}"><b>${esc(nm(a))} — ${esc(nm(b))}</b><span>${esc(r)}</span></li>`;
  };
  let key, sub, html = '';
  if (pairCell) {
    const [a, b] = pairCell, inc = [];
    g.edges.forEach(([x, y], e) => { if (x === a || y === a) inc.push(e); });
    key = 'h' + a + ',' + b;
    const hit = inc.find(e => g.edges[e].includes(b) && a !== b);
    sub = `${full(a)} · ${inc.length} phản ứng` + (a === b ? '' : hit === undefined ? ` · không phản ứng với ${nm(b)}` : '');
    html = inc.map(e => line(e, a, e === hit ? 'on' : 'done')).join('');
  } else {
    const drawn = EA.on ? pairOrd.filter(e => EA.t < EA.fadeAt && EA.start[e] <= EA.t) : pairOrd;
    key = 'd' + drawn.length + ',' + cur;
    sub = EA.on ? `Đã nối ${drawn.length}/${pairOrd.length} cặp` : `${pairOrd.length} cặp phản ứng`;
    html = drawn.slice().reverse().map(e => line(e, EA.from[e] ? g.edges[e][1] : g.edges[e][0], e === cur ? 'on' : 'done')).join('');
  }
  if (key !== pairCapKey) {
    pairCapKey = key;
    pairBox.querySelector('.pairs-sub').textContent = sub;
    pairBox.querySelector('.pairs-log').innerHTML = html;
  }
}

/* Khung ngắm kiểu HUD quanh đỉnh đang xét (hiện ở bản Frost) */
const lockEl = $('#lock'), lockT = $('#lockT');
const pad2 = v => v == null ? '--' : String(v).padStart(2, '0');
function lockText(s) {
  const L = st.g.labels;
  const head = s.v != null ? `MẪU_${pad2(s.v)}${L ? ' · ' + L[s.v].sym : ''}` : '';
  if (!head || st.algo !== 'backtrack') return head;      // tham lam: chỉ tên mẫu, bậc / màu đã có ở bảng trạng thái và HUD
  return `${head}\nMIN ${pad2(s.kmin)} / BƯỚC ${pad2(s.depth != null ? s.depth + 1 : null)}`;
}
function demoVisOf(sec) {
  const dr = sec.rects[3];
  return clamp((Math.min(dr.bottom, H) - Math.max(dr.top, 0)) / Math.min(H, dr.height), 0, 1);
}
function updateLock(v) {
  if (!lockEl) return;
  if (v < 0 || v >= GV.n) { lockEl.style.opacity = '0'; return; }
  nodeWorld(v, tmpV);
  const p = project(tmpV);
  const depth = camera.position.z - tmpV.z;
  const px = 0.34 * 1.4 * GV.scl[v] * H / (2 * TAN_HALF * Math.max(0.1, depth));
  const size = clamp(px * 2.6, 44, 180);
  lockEl.style.setProperty('--s', size.toFixed(0) + 'px');
  lockEl.style.transform = `translate3d(${(p.x - size / 2).toFixed(1)}px,${(p.y - size / 2).toFixed(1)}px,0)`;
  lockEl.style.opacity = p.behind ? '0' : '1';
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (lenis) lenis.raf(now);
  tickPlayer(dt);

  const sec = sectionState(H);
  const dom = sec.dom;
  if (dom !== domSec) domSec = dom;
  if (dom !== prevNav) {
    prevNav = dom;
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.sec === dom));
  }
  const pr = sec.rects[1];
  const pProblem = clamp((H * 0.5 - pr.top) / pr.height, 0, 1);
  const revealT = dom === 'problem' && !FROST ? smooth(0.05, 0.5, pProblem) : 1;   // Frost: không nối cạnh theo cuộn
  curMode.reveal = lerp(curMode.reveal, revealT, damp(dt, 7));
  if (dom === 'problem' && !FROST) updateTicker(curMode.reveal);

  if (!glOK || optsFull) return;

  /* ----- tham số liên tục theo section ----- */
  const A = SECS[sec.a].id, B = SECS[sec.b].id;
  const layerOf = id => id === 'compare' ? 1 : id === 'demo' && st.layers ? 1 : 0;
  const flatOf = id => id === 'demo' && st.flat ? 1 : 0;
  curMode.layer = lerp(curMode.layer, lerp(layerOf(A), layerOf(B), sec.w), damp(dt, 4));
  curMode.flat = lerp(curMode.flat, lerp(flatOf(A), flatOf(B), sec.w), damp(dt, 4));
  curMode.spin = lerp(SEC_SPIN[A], SEC_SPIN[B], sec.w);

  /* ----- vị trí đích của đỉnh ----- */
  const n = GV.n;
  const step = st.steps[st.idx];
  const layerSrc = (A === 'compare' || B === 'compare') ? st.best : st.steps[st.steps.length - 1].colors;
  if (curMode.layer > 0.001 && GV.pLKey !== layerSrc) { GV.pL = LUMEN ? binLayout(layerSrc) : layerLayout(layerSrc); GV.pLKey = layerSrc; }
  const f = curMode.flat, l = curMode.layer, kPos = damp(dt, 7);
  let maxR = 0.6;
  for (let i = 0; i < n * 3; i++) {
    let t = lerp(GV.p3[i], GV.p2[i], f);
    if (l > 0.001 && GV.pL) t = lerp(t, GV.pL[i] + (LUMEN ? binDrift(i, now) : 0), l);
    GV.pCur[i] = lerp(GV.pCur[i], t, kPos);
  }
  for (let i = 0; i < n; i++) maxR = Math.max(maxR, Math.hypot(GV.pCur[i * 3], GV.pCur[i * 3 + 1], GV.pCur[i * 3 + 2]));
  if (BIN.group) {                                       // Lumen: tủ ngăn chứa hiện dần theo chế độ tách ngăn
    const a = smooth(0.15, 0.95, l);
    BIN.group.visible = a > 0.01;
    if (BIN.group.visible) {
      for (const m of BIN.mats) m.opacity = m.userData.base * a;
      maxR = Math.max(maxR, BIN.r * l);
      _q1.copy(graphGroup.quaternion).invert();            // nhãn luôn nằm sát mép trái tủ dù tủ đang lắc
      for (const t of BIN.tags) t.sp.position.set(-BIN.side, t.y, 0).applyQuaternion(_q1);
    }
  }
  if (LUMEN && GV.edges) { edgeMat.opacity = 1 - smooth(0, 0.85, l); GV.edges.visible = edgeMat.opacity > 0.01; }
  Rcur = lerp(Rcur, maxR + 0.45, damp(dt, 5));

  /* ----- hướng xoay ----- */
  if (l > 0.5) {
    if (!layerHigh) { euler.setFromQuaternion(graphGroup.quaternion, 'YXZ'); st.layerYaw = euler.y; layerHigh = true; }
    if (LUMEN) {                                         // tủ ngăn chứa đứng thẳng, lắc nhẹ quanh góc 3/4 để thấy chiều sâu và nhãn
      st.layerYaw = 0.45 + Math.sin(now / 1000 * 0.35) * 0.3;
      tgtQ.setFromEuler(euler.set(0, st.layerYaw, 0, 'YXZ'));
    } else {
      if (!REDUCED) st.layerYaw += dt * 0.22;
      tgtQ.setFromEuler(euler.set(0.36, st.layerYaw, 0, 'YXZ'));
    }
    graphGroup.quaternion.slerp(tgtQ, damp(dt, 3));
  } else {
    layerHigh = false;
    if (f > 0.5) graphGroup.quaternion.slerp(ident, damp(dt, 5));
    else if (!drag) {
      if ((!REDUCED || FROST) && curMode.spin) graphGroup.quaternion.premultiply(_q1.setFromAxisAngle(Y_AXIS, curMode.spin * dt));
      if (Math.abs(dragVel.x) + Math.abs(dragVel.y) > 1e-4) {
        rotateBy(dragVel.x * dt, dragVel.y * dt);
        const k = Math.exp(-3.2 * dt); dragVel.x *= k; dragVel.y *= k;
      }
    }
  }

  /* ----- trạng thái tập trung (demo) ----- */
  const inDemo = dom === 'demo';
  const focusV = inDemo && FOCUS_TYPES.has(step.type) && step.v != null ? step.v : -1;
  const focusU = inDemo && step.u != null && FOCUS_TYPES.has(step.type) ? step.u : -1;
  GV.mark.fill(0);
  if (focusV >= 0) for (const u of st.g.adj[focusV]) GV.mark[u] = 1;

  /* ----- bám theo đỉnh ----- */
  graphGroup.updateMatrixWorld();
  if (inDemo && st.follow && focusV >= 0 && l < 0.5) {
    tmpV.set(GV.pCur[focusV * 3], GV.pCur[focusV * 3 + 1], GV.pCur[focusV * 3 + 2]).applyQuaternion(graphGroup.quaternion).multiplyScalar(-0.32);
  } else tmpV.set(0, 0, 0);
  groupOff.lerp(tmpV, damp(dt, 3));
  graphGroup.position.copy(groupOff);

  /* ----- khung đồ thị trên màn hình + camera ----- */
  const ra = rectOf(SECS[sec.a].box), rb = rectOf(SECS[sec.b].box);
  const tx = lerp(ra.x, rb.x, sec.w), ty = lerp(ra.y, rb.y, sec.w), ts = Math.max(60, lerp(ra.s, rb.s, sec.w));
  if (!curBox.init) { curBox.x = tx; curBox.y = ty; curBox.s = ts; curBox.init = true; }
  const kb = damp(dt, 9);
  curBox.x = lerp(curBox.x, tx, kb); curBox.y = lerp(curBox.y, ty, kb); curBox.s = lerp(curBox.s, ts, kb);
  const zoom = (inDemo ? st.zoom : 1) * (inDemo && st.follow && focusV >= 0 && l < 0.5 ? 1.08 : 1);
  const boxHalf = curBox.s * 0.5 * 0.92;
  /* Lumen, tủ ngăn chứa: nâng camera nhưng vẫn nhìn ngang rồi dịch khung hình (kiểu ống kính shift) —
     thấy được lòng khay từ trên xuống mà trụ tủ vẫn thẳng đứng */
  const lift = LUMEN ? smooth(0.2, 1, l) * 0.42 : 0;
  const camZ = Rcur * H / (2 * TAN_HALF * boxHalf) * 1.06 / zoom * (1 + lift * 0.12);
  camera.position.set(0, camZ * lift, camZ);
  camera.setViewOffset(W, H, W / 2 - curBox.x, H / 2 - curBox.y + lift / (2 * TAN_HALF) * H, W, H);
  camera.updateMatrixWorld();

  /* nút mũi tên: bám ngay dưới đồ thị, ẩn khi ở trang cuối hoặc đang ở Demo (chỗ đó có thanh điều khiển) */
  if (snapBtn) {
    const hide = dom === 'demo' || optsOpen || snapNext(1) === undefined;
    snapBtn.classList.toggle('off', hide);
    if (!hide) snapBtn.style.transform = `translate(${Math.round(curBox.x)}px, ${Math.round(Math.min(H - 64, curBox.y + boxHalf + 14))}px) translateX(-50%)`;
  }

  /* bệ hologram */
  platform.position.set(groupOff.x, groupOff.y - Rcur * 1.02, groupOff.z);
  platform.scale.setScalar(Rcur * 1.05);
  platform.rotation.z += dt * 0.05;

  /* ----- màu & kích thước đỉnh ----- */
  let blinkF = 0, blinkC = FLASH;                         // Lumen: cường độ chớp hiện tại (0..1) và màu chớp
  if (LUMEN && focusV >= 0) {
    if (focusV !== blinkV) { blinkV = focusV; blinkT0 = now; }   // đổi đỉnh → chớp ngay từ đỉnh sóng
    const ph = ((now - blinkT0) % BLINK_MS) / BLINK_MS;
    blinkF = Math.exp(-ph * 4.2) * 0.85 + 0.15 * (0.5 + 0.5 * Math.cos(ph * Math.PI * 2));
    blinkC = step.type === 'conflict' ? WARN : step.type === 'backtrack' || step.type === 'fail' ? AMBER : FLASH;
  } else blinkV = -1;
  const src = colorSource(dom);
  const kc = damp(dt, 9);
  const sz = GV.nodeSize;
  for (let i = 0; i < n; i++) {
    const c = src ? src[i] : -1;
    const base = c >= 0 ? palColor(c) : UNCOLORED;
    let bright = 1, scale = 1;
    if (focusV >= 0) {
      if (i === focusV) { bright = 1.4; scale = 1.45; }
      else if (i === focusU) { bright = 1.25; scale = 1.2; }
      else if (GV.mark[i]) bright = 0.95;
      else bright = 0.3;
    }
    if (i === hoverId) { bright *= 1.3; scale *= 1.15; }
    let r, g, b;
    if (FROST) { const t = Math.min(1, bright); r = FOGC.r + (base.r - FOGC.r) * t; g = FOGC.g + (base.g - FOGC.g) * t; b = FOGC.b + (base.b - FOGC.b) * t; }
    else { r = base.r * bright; g = base.g * bright; b = base.b * bright; }
    if (GV.glitch[i] > 0) {
      GV.glitch[i] -= dt;
      if (Math.random() < 0.5) { const gc = palColor((Math.random() * 6) | 0); const gm = FROST ? 1 : 1.4; r = gc.r * gm; g = gc.g * gm; b = gc.b * gm; } else { r = g = b = FROST ? 1 : 0.02; }
      scale *= 0.85 + Math.random() * 0.4;
    }
    const ix = i * 3;
    GV.col[ix] = lerp(GV.col[ix], r, kc); GV.col[ix + 1] = lerp(GV.col[ix + 1], g, kc); GV.col[ix + 2] = lerp(GV.col[ix + 2], b, kc);
    GV.scl[i] = lerp(GV.scl[i], scale * sz, damp(dt, 10));
    tmpC.setRGB(GV.col[ix], GV.col[ix + 1], GV.col[ix + 2]);
    const fl = i === focusV ? blinkF : i === focusU ? blinkF * 0.55 : 0;
    if (fl) tmpC.lerp(blinkC, fl * 0.85);
    GV.cores.setColorAt(i, tmpC);
    if (FROST) { tmpC2.setRGB(1, 1, 1).lerp(tmpC, c >= 0 ? (LUMEN ? 0.45 : 0.32) : (LUMEN ? 0.14 : 0.06)); if (fl) tmpC2.lerp(blinkC, fl * 0.8); GV.shells.setColorAt(i, tmpC2); }
    else GV.shells.setColorAt(i, tmpC);
    tmpV.set(GV.pCur[ix], GV.pCur[ix + 1], GV.pCur[ix + 2]);
    tmpS.setScalar(GV.scl[i] * (1 + fl * 0.16));
    if (FROST) tmpQ.copy(GV.qs[i]).multiply(_q3.setFromAxisAngle(Y_AXIS, REDUCED ? 0 : now * 0.00025 + i * 0.7));
    else tmpQ.identity();
    tmpM.compose(tmpV, tmpQ, tmpS);
    GV.cores.setMatrixAt(i, tmpM);
    GV.shells.setMatrixAt(i, tmpM);
  }
  if (n) {
    GV.cores.instanceMatrix.needsUpdate = true; GV.shells.instanceMatrix.needsUpdate = true;
    GV.cores.instanceColor.needsUpdate = true; GV.shells.instanceColor.needsUpdate = true;
  }

  /* ----- cạnh ----- */
  const m = GV.m, edges = st.g.edges;
  const frontier = Math.floor(curMode.reveal * m);
  const eAnim = FROST && dom === 'problem' && m > 0;
  if (eAnim) {
    if (EA.g !== st.g) { EA.g = st.g; edgeOrder(st.g); EA.on = false; }
    if (!EA.on) { EA.on = true; EA.t = 0; }
    EA.t += dt;
    if (EA.t > EA.cycle) EA.t = 0;
  } else EA.on = false;
  const eFade = eAnim ? 1 - clamp((EA.t - EA.fadeAt) / EA_FADE, 0, 1) : 1;
  const activeE = focusU >= 0 ? (focusV < focusU ? focusV * 100000 + focusU : focusU * 100000 + focusV) : -1;
  for (let e = 0; e < m; e++) {
    const [a, b] = edges[e];
    const ax = a * 3, bx = b * 3, ex = e * 6;
    GV.ePos[ex] = GV.pCur[ax]; GV.ePos[ex + 1] = GV.pCur[ax + 1]; GV.ePos[ex + 2] = GV.pCur[ax + 2];
    GV.ePos[ex + 3] = GV.pCur[bx]; GV.ePos[ex + 4] = GV.pCur[bx + 1]; GV.ePos[ex + 5] = GV.pCur[bx + 2];
    let cr = HOLO.r, cg = HOLO.g, cb = HOLO.b, k = 0.24;
    if (eAnim) {                                         // cạnh mọc từ đỉnh xuất phát tới đỉnh kia
      const g = clamp((EA.t - EA.start[e]) / EA_GROW, 0, 1), u = 1 - Math.pow(1 - g, 3);
      const s0 = EA.from[e] ? bx : ax, s1 = EA.from[e] ? ax : bx;
      for (let d = 0; d < 3; d++) {
        GV.ePos[ex + d] = GV.pCur[s0 + d];
        GV.ePos[ex + 3 + d] = lerp(GV.pCur[s0 + d], GV.pCur[s1 + d], u);
      }
      k = g > 0 ? 0.24 * eFade : 0;
    }
    if (focusV >= 0) {
      const key = a < b ? a * 100000 + b : b * 100000 + a;
      if (key === activeE) {
        if (step.type === 'conflict') { cr = WARN.r; cg = WARN.g; cb = WARN.b; k = 1.7; }
        else { cr = WHITE.r; cg = WHITE.g; cb = WHITE.b; k = 1.2; }
      } else if (a === focusV || b === focusV) k = 0.6;
      else k = 0.08;
    }
    const rev = clamp(curMode.reveal * m - e, 0, 1);
    if (dom === 'problem' && e === frontier - 1 && curMode.reveal < 0.999) { cr = WHITE.r; cg = WHITE.g; cb = WHITE.b; k = 1.4; }
    k *= rev;
    if (LUMEN) k *= 1 - l;                               // Lumen: trong tủ ngăn chứa không vẽ cạnh phản ứng
    let tr, tg, tb;
    if (FROST) { const kk = clamp(k * 3.5, 0, 1); tr = FOGC.r + (cr - FOGC.r) * kk; tg = FOGC.g + (cg - FOGC.g) * kk; tb = FOGC.b + (cb - FOGC.b) * kk; }
    else { tr = cr * k; tg = cg * k; tb = cb * k; }
    const cx3 = e * 3;
    GV.eCur[cx3] = lerp(GV.eCur[cx3], tr, kc); GV.eCur[cx3 + 1] = lerp(GV.eCur[cx3 + 1], tg, kc); GV.eCur[cx3 + 2] = lerp(GV.eCur[cx3 + 2], tb, kc);
    GV.eCol[ex] = GV.eCol[ex + 3] = GV.eCur[cx3];
    GV.eCol[ex + 1] = GV.eCol[ex + 4] = GV.eCur[cx3 + 1];
    GV.eCol[ex + 2] = GV.eCol[ex + 5] = GV.eCur[cx3 + 2];
  }
  if (eAnim || dom === 'problem') {                       // cạnh mới bắt đầu mọc gần nhất
    let cur = -1, best = -1;
    if (eAnim && EA.t < EA.fadeAt) for (let e = 0; e < m; e++) { const t0 = EA.start[e]; if (t0 <= EA.t && t0 > best) { best = t0; cur = e; } }
    updatePairs(cur);
  }
  if (m) { GV.edges.geometry.attributes.position.needsUpdate = true; GV.edges.geometry.attributes.color.needsUpdate = true; }

  /* ----- xung sáng ----- */
  pulse.alpha.fill(0);
  let slot = 0;
  for (let i = pulse.list.length - 1; i >= 0; i--) {
    const p = pulse.list[i];
    p.t += dt;
    if (p.t >= p.dur || p.a >= n || p.b >= n) { pulse.list.splice(i, 1); continue; }
    const u = p.t / p.dur, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    for (const [off, sMul, aMul] of [[0, 1, 1], [-0.1, 0.6, 0.55]]) {
      if (slot >= PULSE_SLOTS) break;
      const uu = clamp(e + off, 0, 1);
      for (let d = 0; d < 3; d++) pulse.pos[slot * 3 + d] = lerp(GV.pCur[p.a * 3 + d], GV.pCur[p.b * 3 + d], uu);
      pulse.col[slot * 3] = p.c.r; pulse.col[slot * 3 + 1] = p.c.g; pulse.col[slot * 3 + 2] = p.c.b;
      pulse.size[slot] = 0.55 * sz * p.size * sMul * (LUMEN ? 0.62 : 1);
      pulse.alpha[slot] = Math.sin(Math.PI * u) * (LUMEN ? 0.55 : 1.6) * aMul;   // Lumen: đốm sáng nhỏ, trong
      slot++;
    }
  }
  const pg = pulse.points.geometry.attributes;
  pg.position.needsUpdate = pg.aColor.needsUpdate = pg.aSize.needsUpdate = pg.aAlpha.needsUpdate = true;

  /* ----- vòng chọn & gợn sóng ----- */
  graphGroup.updateMatrixWorld();
  if (focusV >= 0 && focusV < n) {
    nodeWorld(focusV, tmpV);
    if (!selRing.visible) selRing.position.copy(tmpV);
    selRing.position.lerp(tmpV, damp(dt, 14));
    selArcs.position.copy(selRing.position);
    const pulseS = sz * (FROST ? 1.75 : 1.45) * (1 + Math.sin(now / 1000 * 4) * 0.04);
    selRing.scale.setScalar(pulseS); selArcs.scale.setScalar(pulseS);
    selArcs.rotation.z -= dt * 1.4;
    selRing.material.color.copy(step.type === 'conflict' ? WARN : step.type === 'backtrack' || step.type === 'fail' ? AMBER : RING_C);
    selRing.visible = selArcs.visible = !LUMEN;
    if (LUMEN) {
      const ph = ((now - blinkT0) % BLINK_MS) / BLINK_MS;
      vGlow.position.copy(selRing.position); vGlow.material.color.copy(blinkC);
      vGlow.scale.setScalar(sz * (2.6 + blinkF * 1.5)); vGlow.material.opacity = 0.3 + blinkF * 0.6;
      vPing.position.copy(selRing.position); vPing.material.color.copy(blinkC);
      vPing.scale.setScalar(sz * (1.6 + ph * 4.2)); vPing.material.opacity = (1 - ph) * (1 - ph) * 0.42;
      vGlow.visible = vPing.visible = true;
    }
  } else { selRing.visible = selArcs.visible = false; if (LUMEN) vGlow.visible = vPing.visible = false; }
  if (LUMEN) {
    if (focusU >= 0 && focusU < n) {
      nodeWorld(focusU, uGlow.position);
      uGlow.material.color.copy(step.type === 'conflict' ? WARN : FLASH);
      uGlow.scale.setScalar(sz * (2 + blinkF * 0.7)); uGlow.material.opacity = 0.14 + blinkF * 0.3;
      uGlow.visible = true;
    } else uGlow.visible = false;
    uRing.visible = false;
  } else if (focusU >= 0 && focusU < n) {
    nodeWorld(focusU, uRing.position);
    uRing.scale.setScalar(sz * (FROST ? 1.45 : 1.15));
    uRing.material.color.copy(step.type === 'conflict' ? WARN : WHITE);
    uRing.visible = true;
  } else uRing.visible = false;
  for (const r of ripples) {
    if (r.t >= r.dur || r.node < 0 || r.node >= n) { r.mesh.visible = false; continue; }
    r.t += dt;
    if (r.t < 0) { r.mesh.visible = false; continue; }
    const u = clamp(r.t / r.dur, 0, 1);
    nodeWorld(r.node, r.mesh.position);
    r.mesh.scale.setScalar(sz * (LUMEN ? 1.6 + u * 4.5 : 1 + u * 3.2));
    r.mesh.material.opacity = LUMEN ? (1 - u) * (1 - u) * 0.6 : (1 - u) * 0.9;
    r.mesh.visible = inDemo;
  }

  /* ----- hover ----- */
  if (mouse && !drag && n) {
    GV.cores.computeBoundingSphere();
    raycaster.setFromCamera({ x: mouse.x / W * 2 - 1, y: -(mouse.y / H) * 2 + 1 }, camera);
    const hit = raycaster.intersectObject(GV.cores, false)[0];
    hoverId = hit ? hit.instanceId : -1;
  } else if (!drag) hoverId = -1;
  canvas.style.cursor = drag ? 'grabbing' : hoverId >= 0 ? 'pointer' : 'grab';
  if (hoverId >= 0 && mouse) {
    const c = src ? src[hoverId] : -1;
    const L = st.g.labels;
    const name = L ? `${L[hoverId].sym} ${L[hoverId].name} (${hoverId})` : `Đỉnh ${hoverId}`;
    tip.textContent = `${name} · ${st.g.adj[hoverId].length} cặp phản ứng` + (c >= 0 ? ` · ngăn ${c + 1}` : ' · chưa xếp');
    tip.style.transform = `translate3d(${Math.min(mouse.x + 14, W - tip.offsetWidth - 8)}px,${mouse.y + 16}px,0)`;
    tip.hidden = false;
  } else if (!tip.hidden) tip.hidden = true;

  if (FROST) {
    const cz = camera.position.z;
    scene.fog.near = Math.max(0.1, cz - Rcur * 0.35);
    scene.fog.far = cz + Rcur * 3.4;
  }
  if (sky) sky.scroll(clamp(scrollY / (H * 1.3), 0, 1));
  if (composer) composer.render(); else renderer.render(scene, camera);
  updateLock(inDemo && demoVisOf(sec) > 0.5 ? focusV : -1);

  /* ----- nhãn ----- */
  const labelMode = dom === 'hero' ? 'none' : dom === 'problem' ? (st.g.labels ? 'mat' : 'index') : 'index';
  labelsEl.style.opacity = labelMode === 'none' ? '0' : '1';
  if (labelMode !== 'none') {
    const many = n > 40;
    const degs = inDemo && st.algo === 'greedy' ? step.degs : null;   // bậc trong bảng của các đỉnh chưa tô
    const camD = camera.position.z;
    const declut = FROST && labelMode === 'mat', boxes = [];
    for (let i = 0; i < n; i++) {
      const el = labelEls[i];
      const want = !(many && i !== focusV && i !== focusU && i !== hoverId);
      if (!want) { if (labelVis[i]) { el.style.display = 'none'; labelVis[i] = false; } continue; }
      nodeWorld(i, tmpV);
      const p = project(tmpV);
      if (p.behind || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { if (labelVis[i]) { el.style.display = 'none'; labelVis[i] = false; } continue; }
      if (!labelVis[i]) { el.style.display = ''; labelVis[i] = true; }
      let key, html, cls;
      if (labelMode === 'mat') {
        const L = st.g.labels[i];
        key = 'm' + i; cls = 'nl mat';
        html = `<span class="sym${L.emoji ? ' emoji' : ''}">${esc(L.sym)}</span><span class="nm">${esc(L.name)}</span>`;
      } else {
        const c = src ? src[i] : -1;
        const dg = degs && c < 0 && degs[i] >= 0 ? degs[i] : -1;
        key = `i${i}|${c}|${dg}`; cls = 'nl';
        html = `<b>${i}</b>` + (c >= 0 ? `<i class="ci" style="--c:${palHex(c)}">${c}</i>` : '') + (dg >= 0 ? `<i class="sat">b${dg}</i>` : '');
      }
      if (labelKey[i] !== key) { el.className = cls; el.innerHTML = html; labelKey[i] = key; if (declut) labelSz[i] = [el.offsetWidth, el.offsetHeight]; }
      const depth = camD - tmpV.z;
      const fade = clamp((depth - (camD - Rcur)) / (2 * Rcur), 0, 1);
      const pxPerUnit = H / (2 * TAN_HALF * Math.max(0.1, depth));
      const below = labelMode !== 'mat' || FROST;            // Frost: nhãn chất nằm dưới đỉnh, không che tinh thể
      const nodeR = 0.36 * GV.scl[i] * pxPerUnit;
      const yOff = below ? nodeR + 4 : 8;
      el.style.transform = `translate3d(${p.x.toFixed(1)}px,${(p.y + yOff).toFixed(1)}px,0) translate(-50%,${below ? '0' : '-50%'})`;
      if (!declut) { el.style.opacity = (1 - fade * 0.6).toFixed(2); continue; }
      const [lw, lh] = labelSz[i] || [60, 34];
      boxes.push({ i, depth, a: 1 - fade * 0.6, node: [p.x - nodeR, p.y - nodeR, p.x + nodeR, p.y + nodeR], lab: [p.x - lw / 2, p.y + yOff, p.x + lw / 2, p.y + yOff + lh] });
    }
    if (declut) {                                          // tránh đè: nhãn nào chạm nhãn/đỉnh gần camera hơn thì mờ đi
      boxes.sort((u, v) => u.depth - v.depth);
      const hit = (r, q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];
      const kA = damp(dt, 8);
      boxes.forEach((b, k) => {
        let clash = false;
        for (let j = 0; j < k && !clash; j++) clash = (boxes[j].ok && hit(b.lab, boxes[j].lab)) || hit(b.lab, boxes[j].node);
        b.ok = !clash;
        const tgt = clash && b.i !== hoverId ? 0.1 : b.a;
        labelA[b.i] = lerp(labelA[b.i] ?? tgt, tgt, kA);
        labelEls[b.i].style.opacity = labelA[b.i].toFixed(2);
      });
    }
  }

  /* ----- chú thích nổi ----- */
  const dr = sec.rects[3];
  const demoVis = clamp((Math.min(dr.bottom, H) - Math.max(dr.top, 0)) / Math.min(H, dr.height), 0, 1);
  const showAnno = inDemo && demoVis > 0.6 && W > 820;
  anno.style.opacity = showAnno ? '1' : '0';
  if (showAnno) {
    let p;
    if (focusV >= 0) p = project(nodeWorld(focusV, tmpV));
    else p = project(tmpV.set(0, Rcur * 0.75, 0).add(groupOff));
    const y = clamp(p.y, 150, H - 40);
    anno.style.transform = `translate3d(${p.x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    placeAnno(p.x, y, focusV, focusU, dt);
  }
}

/* ---------------- Khởi động ---------------- */
function heroScramble() {
  if (REDUCED) return;
  const chars = 'ΔΣΨΩχλ#%+<>/|';
  $$('#heroTitle span').forEach((el, idx) => {
    const fin = el.textContent; let t0 = 0;
    const f = t => {
      if (!t0) t0 = t;
      const p = (t - t0) / 900 - idx * 0.15;
      let out = '';
      for (let i = 0; i < fin.length; i++) out += fin[i] === ' ' || i / fin.length < p * 1.25 - 0.1 ? fin[i] : chars[(Math.random() * chars.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(f); else el.textContent = fin;
    };
    requestAnimationFrame(f);
  });
}

loadPreset('cargo');
heroScramble();
(function telemetry() {
  const t = $('#telT'), d = $('#telD');
  if (!FROST || !t || REDUCED) return;
  setInterval(() => {
    t.textContent = `T ${(-182.96 - Math.random() * 0.21).toFixed(2)}°C`;
    d.textContent = `${Math.random() < 0.5 ? '+' : '−'}0${(Math.random() * 1.6).toFixed(2)}`;
  }, 1100);
})();
requestAnimationFrame(t => { last = t; frame(t); });
