/* =====================================================================
 * gen_tests.js — sinh bộ testcase (file input + expected.csv). Chạy: node gen_tests.js
 *
 * Mọi đồ thị ngẫu nhiên đều có seed → chạy lại ra đúng từng byte.
 * Đáp án mong đợi KHÔNG lấy từ bộ giải của demo mà từ một trong các nguồn:
 *   ly_thuyet   χ biết theo lý thuyết (Kₙ, chu trình, lưỡng phân, Mycielski, Petersen, Sudoku…)
 *   de_bai      bài toán trong đề/bài giảng, χ đã được nêu (Khoang chứa, Sở thú, slide 18)
 *   vet_can     vét cạn mọi phép tô kⁿ, k = 1, 2, … (n ≤ 9)
 *   kiem_chung  DSatur nhánh-cận (Brélaz 1979) viết riêng trong suite.js, chạy đến hết
 *   cai_san     đồ thị k-phần có cài sẵn clique K_k → χ = k đúng bằng cấu trúc
 *   can         không biết χ: chỉ kiểm tra ω(G) ≤ số màu ≤ Δ + 1
 * Đáp án lý thuyết / đề bài được đối chiếu lại với vét cạn hoặc DSatur khi chạy được.
 * ===================================================================== */
const fs = require('fs'), path = require('path');
const S = require('../solver.js');
const T = require('./suite.js');

const OUT = __dirname;
const GROUPS = {
  '01_nho': 'Dữ liệu nhỏ',
  '02_thong_thuong': 'Thông thường',
  '03_bien': 'Biên',
  '04_dac_biet': 'Đặc biệt',
  '05_lon': 'Dữ liệu lớn',
  '06_khong_hop_le': 'Không hợp lệ / cảnh báo',
};

/* ---------------- RNG có seed (mulberry32) ---------------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Họ đồ thị (danh sách cạnh 0-based) ---------------- */
const G = {
  empty: n => ({ n, e: [] }),
  complete(n) { const e = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) e.push([i, j]); return { n, e }; },
  cycle(n) { const e = []; for (let i = 0; i < n; i++) e.push([i, (i + 1) % n]); return { n, e }; },
  path(n) { const e = []; for (let i = 0; i + 1 < n; i++) e.push([i, i + 1]); return { n, e }; },
  star(n) { const e = []; for (let i = 1; i < n; i++) e.push([0, i]); return { n, e }; },
  wheel(n) { const e = []; for (let i = 1; i < n; i++) { e.push([0, i]); e.push([i, i + 1 < n ? i + 1 : 1]); } return { n, e }; },
  bipartite(a, b) { const e = []; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) e.push([i, a + j]); return { n: a + b, e }; },
  crown(k) { const e = []; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (i !== j) e.push([2 * i, 2 * j + 1]); return { n: 2 * k, e }; },
  mycielski({ n, e }) {
    const r = e.map(x => x.slice());
    for (const [a, b] of e) { r.push([a, n + b]); r.push([b, n + a]); }
    for (let i = 0; i < n; i++) r.push([n + i, 2 * n]);
    return { n: 2 * n + 1, e: r };
  },
  petersen() {
    const e = [];
    for (let i = 0; i < 5; i++) { e.push([i, (i + 1) % 5]); e.push([i, i + 5]); e.push([5 + i, 5 + ((i + 2) % 5)]); }
    return { n: 10, e };
  },
  queen(r) {                       // DIMACS queenR_R: cùng hàng / cột / đường chéo
    const e = [];
    for (let a = 0; a < r * r; a++) for (let b = a + 1; b < r * r; b++) {
      const [x1, y1, x2, y2] = [a / r | 0, a % r, b / r | 0, b % r];
      if (x1 === x2 || y1 === y2 || Math.abs(x1 - x2) === Math.abs(y1 - y2)) e.push([a, b]);
    }
    return { n: r * r, e };
  },
  sudoku() {                       // 81 ô, nối nếu cùng hàng / cột / khối 3×3 → χ = 9
    const e = [];
    for (let a = 0; a < 81; a++) for (let b = a + 1; b < 81; b++) {
      const [r1, c1, r2, c2] = [a / 9 | 0, a % 9, b / 9 | 0, b % 9];
      if (r1 === r2 || c1 === c2 || ((r1 / 3 | 0) === (r2 / 3 | 0) && (c1 / 3 | 0) === (c2 / 3 | 0))) e.push([a, b]);
    }
    return { n: 81, e };
  },
  gnp(n, p, seed) { const R = rng(seed), e = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (R() < p) e.push([i, j]); return { n, e }; },
  tree(n, seed) { const R = rng(seed), e = []; for (let i = 1; i < n; i++) e.push([Math.floor(R() * i), i]); return { n, e }; },
  /* k-phần ngẫu nhiên (đỉnh i thuộc phần i mod k, chỉ nối khác phần) + clique trên đỉnh 0..k-1 → χ = k */
  planted(n, k, p, seed) {
    const R = rng(seed), e = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (i % k === j % k) continue;
      if ((i < k && j < k) || R() < p) e.push([i, j]);
    }
    return { n, e };
  },
  union(...gs) {
    let off = 0; const e = [];
    for (const g of gs) { for (const [a, b] of g.e) e.push([a + off, b + off]); off += g.n; }
    return { n: off, e };
  },
  /* xếp lịch thi: môn học là đỉnh, 2 môn có chung sinh viên thì không thi cùng ca */
  exams(courses, students, per, seed) {
    const R = rng(seed), set = new Set(), e = [];
    for (let s = 0; s < students; s++) {
      const pick = new Set();
      while (pick.size < per) pick.add(Math.floor(R() * courses));
      const a = [...pick].sort((x, y) => x - y);
      for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) {
        const k = a[i] * courses + a[j];
        if (!set.has(k)) { set.add(k); e.push([a[i], a[j]]); }
      }
    }
    return { n: courses, e };
  },
};

const toSolverGraph = g => S.makeGraph(g.n, g.e);

/* vét cạn kⁿ (chỉ n ≤ 9) */
function bruteChi(g) {
  const sg = toSolverGraph(g);
  if (!g.e.length) return Math.min(1, g.n);
  for (let k = 1; k <= g.n; k++) {
    const col = new Int16Array(g.n), total = Math.pow(k, g.n);
    for (let code = 0; code < total; code++) {
      let x = code;
      for (let i = 0; i < g.n; i++) { col[i] = x % k; x = Math.floor(x / k); }
      if (S.isProper(sg, col)) return k;
    }
  }
  return g.n;
}

/* ---------------- Định dạng file ----------------
 * Nhóm 01–05: input CHUẨN HÓA để code C++ (cpp/*.cpp, đọc bằng cin) đọc được — dòng đầu "n", mỗi dòng
 * sau "u v" (0 ≤ u, v < n), xuống dòng LF, không chú thích, không dòng trống. Mô tả và χ mong đợi nằm
 * trong expected.csv. Nhóm 06 kiểm tra bộ đọc input của web (chú thích, DIMACS, CRLF, input lỗi…)
 * nên giữ dạng thô và chỉ chạy bằng bộ giải JS. */
const CPP_READABLE = /^\d+\n(\d+ \d+\n)*$/;
function edgeText(g) {
  return [`${g.n}`, ...g.e.map(([a, b]) => `${a} ${b}`)].join('\n') + '\n';
}
function dimacsText(g, head) {
  return [...head.map(h => `c ${h}`), `p edge ${g.n} ${g.e.length}`, ...g.e.map(([a, b]) => `e ${a + 1} ${b + 1}`)].join('\n') + '\n';
}

/* ---------------- Danh sách testcase ---------------- */
const cases = [];
function add(group, id, desc, g, { chi = null, src, check = true, oracle = true } = {}) {
  if (g.n > S.MAX_N) throw new Error(`${id}: n = ${g.n} > MAX_N = ${S.MAX_N}`);
  if (check && chi != null && g.n <= 9) {
    const b = bruteChi(g);
    if (b !== chi) throw new Error(`${id}: χ mong đợi ${chi} nhưng vét cạn ra ${b}`);
  }
  if (check && chi != null && oracle && g.n <= 120) {
    const d = T.dsaturChi(toSolverGraph(g), 5e6);
    if (d.exact && d.chi !== chi) throw new Error(`${id}: χ mong đợi ${chi} nhưng DSatur ra ${d.chi}`);
    if (!d.exact) console.log(`   (${id}: DSatur không chạy hết, giữ χ = ${chi} theo ${src})`);
  }
  const text = edgeText(g);
  if (!CPP_READABLE.test(text)) throw new Error(`${id}: file không đúng dạng chuẩn hóa`);
  cases.push({ group, id, desc, fmt: 'edge', n: g.n, m: g.e.length, chi, src, text });
}
function addRaw(group, id, desc, text, { err = '', errCount = '', warn = '', chi = null, src = '' } = {}) {
  cases.push({ group, id, desc, fmt: /^\s*(c |p )/m.test(text) ? 'dimacs' : 'edge', n: '', m: '', chi, src, err, errCount, warn, text });
}

/* 01 — Dữ liệu nhỏ: đáp án bằng vét cạn */
{
  const P = [0.25, 0.45, 0.65, 0.85];
  for (let i = 0; i < 20; i++) {
    const n = 3 + (i % 7), p = P[i % 4], seed = 101 + i;
    const g = G.gnp(n, p, seed);
    add('01_nho', `nho_${String(i + 1).padStart(2, '0')}`, `G(n = ${n}, p = ${p}), seed ${seed}`, g, { chi: bruteChi(g), src: 'vet_can' });
  }
}

/* 02 — Thông thường: bài toán trong đề / bài giảng + đồ thị cỡ vừa */
{
  const preset = id => { const p = S.PRESETS.find(x => x.id === id), g = p.build(); return { p, g: { n: g.n, e: g.edges.map(e => e.slice()) } }; };
  for (const [id, fid] of [['cargo', 'khoang_chua'], ['buoi10', 'buoi10_slide18'], ['zoo', 'so_thu']]) {
    const { p, g } = preset(id);
    add('02_thong_thuong', fid, p.desc, g, { chi: p.chi, src: 'de_bai' });
  }
  const lt = [[20, 40, 3, 7], [30, 60, 3, 8], [40, 90, 3, 9]];
  for (const [c, s, per, seed] of lt) {
    const g = G.exams(c, s, per, seed), d = T.dsaturChi(toSolverGraph(g));
    add('02_thong_thuong', `lich_thi_${c}mon`, `Xếp lịch thi: ${c} môn, ${s} sinh viên, mỗi SV ${per} môn (seed ${seed}) — số ca thi ít nhất`,
        g, { chi: d.chi, src: 'kiem_chung', oracle: false });
  }
  const rnd = [[12, 0.5, 11], [16, 0.4, 12], [20, 0.3, 13], [25, 0.25, 14], [30, 0.2, 15], [30, 0.5, 16], [40, 0.15, 17], [50, 0.1, 18], [60, 0.08, 19]];
  for (const [n, p, seed] of rnd) {
    const g = G.gnp(n, p, seed), d = T.dsaturChi(toSolverGraph(g));
    if (!d.exact) throw new Error(`G(${n},${p}) DSatur không chạy hết`);
    add('02_thong_thuong', `gnp_${n}_${String(p).slice(2)}`, `Ngẫu nhiên G(n = ${n}, p = ${p}), seed ${seed}`, g, { chi: d.chi, src: 'kiem_chung', oracle: false });
  }
}

/* 03 — Biên */
{
  add('03_bien', 'n1', 'n = 1, không cạnh (giá trị nhỏ nhất của n)', G.empty(1), { chi: 1, src: 'ly_thuyet' });
  add('03_bien', 'n2_mot_canh', 'n = 2, một cạnh', G.complete(2), { chi: 2, src: 'ly_thuyet' });
  add('03_bien', 'n2_khong_canh', 'n = 2, không cạnh', G.empty(2), { chi: 1, src: 'ly_thuyet' });
  add('03_bien', 'canh_dinh_cuoi', 'Cạnh chạm đỉnh có chỉ số lớn nhất n − 1', { n: 5, e: [[0, 4], [3, 4]] }, { chi: 2, src: 'ly_thuyet' });
  add('03_bien', 'n120_khong_canh', 'n = 120, không cạnh', G.empty(120), { chi: 1, src: 'ly_thuyet' });
  add('03_bien', 'n120_duong_di', 'n = 120, đường đi P₁₂₀', G.path(120), { chi: 2, src: 'ly_thuyet' });
  add('03_bien', 'n120_hinh_sao', 'n = 120, hình sao: 1 đỉnh kề 119 đỉnh', G.star(120), { chi: 2, src: 'ly_thuyet' });
  add('03_bien', 'n119_chu_trinh_le', 'n = 119, chu trình lẻ C₁₁₉ (quay lui bị bỏ qua vì n > 90)', G.cycle(119), { chi: 3, src: 'ly_thuyet' });
  add('03_bien', 'k90', 'Đồ thị đầy đủ K₉₀ — n lớn nhất quay lui còn chạy', G.complete(90), { chi: 90, src: 'ly_thuyet', oracle: false });
  add('03_bien', 'k91', 'Đồ thị đầy đủ K₉₁ — vừa vượt ngưỡng quay lui', G.complete(91), { chi: 91, src: 'ly_thuyet', oracle: false });
  add('03_bien', 'k120', 'Đồ thị đầy đủ K₁₂₀ (7140 cạnh)', G.complete(120), { chi: 120, src: 'ly_thuyet', oracle: false });
  add('03_bien', 'n5000_khong_canh', `n = ${S.MAX_N} (tối đa, = MAXN − 5 của code C++), không cạnh`, G.empty(S.MAX_N), { chi: 1, src: 'ly_thuyet' });
  add('03_bien', 'n5000_canh_cuoi', `n = ${S.MAX_N}, một cạnh nối 2 đỉnh có chỉ số lớn nhất`, { n: S.MAX_N, e: [[S.MAX_N - 2, S.MAX_N - 1]] }, { chi: 2, src: 'ly_thuyet' });
}

/* 04 — Đặc biệt: tính chất đồ thị, bẫy cho tham lam, benchmark DIMACS */
{
  const c5 = G.cycle(5), m3 = G.mycielski(c5), m4 = G.mycielski(m3), m5 = G.mycielski(m4);
  add('04_dac_biet', 'crown_6', 'Crown S₆: lưỡng phân nhưng mọi đỉnh cùng bậc → tham lam theo bậc dùng 6 màu', G.crown(6), { chi: 2, src: 'ly_thuyet' });
  add('04_dac_biet', 'crown_10', 'Crown S₁₀ (20 đỉnh): tham lam dùng 10 màu thay vì 2', G.crown(10), { chi: 2, src: 'ly_thuyet' });
  add('04_dac_biet', 'myciel3', 'Grötzsch = Mycielski(C₅): không có tam giác nhưng χ = 4 (DIMACS myciel3)', m3, { chi: 4, src: 'ly_thuyet' });
  add('04_dac_biet', 'myciel4', 'Mycielski bậc 4 (DIMACS myciel4): không tam giác, χ = 5', m4, { chi: 5, src: 'ly_thuyet' });
  add('04_dac_biet', 'myciel5', 'Mycielski bậc 5 (DIMACS myciel5): ca khó cho quay lui', m5, { chi: 6, src: 'ly_thuyet', oracle: false });
  add('04_dac_biet', 'petersen', 'Petersen: 3-chính quy, có chu trình lẻ', G.petersen(), { chi: 3, src: 'ly_thuyet' });
  add('04_dac_biet', 'c7_le', 'Chu trình lẻ C₇', G.cycle(7), { chi: 3, src: 'ly_thuyet' });
  add('04_dac_biet', 'c8_chan', 'Chu trình chẵn C₈', G.cycle(8), { chi: 2, src: 'ly_thuyet' });
  add('04_dac_biet', 'banh_xe_w8', 'Bánh xe W₈: trục + C₇ lẻ → 4', G.wheel(8), { chi: 4, src: 'ly_thuyet' });
  add('04_dac_biet', 'banh_xe_w9', 'Bánh xe W₉: trục + C₈ chẵn → 3', G.wheel(9), { chi: 3, src: 'ly_thuyet' });
  add('04_dac_biet', 'k_5_7', 'Lưỡng phân đầy đủ K₅,₇', G.bipartite(5, 7), { chi: 2, src: 'ly_thuyet' });
  add('04_dac_biet', 'cay_40', 'Cây ngẫu nhiên 40 đỉnh (seed 41)', G.tree(40, 41), { chi: 2, src: 'ly_thuyet' });
  add('04_dac_biet', 'khong_lien_thong', 'Không liên thông: K₄ ∪ C₅ ∪ 3 đỉnh cô lập', G.union(G.complete(4), G.cycle(5), G.empty(3)), { chi: 4, src: 'ly_thuyet' });
  {
    const g = G.bipartite(4, 4); g.e.push(...[...Array(8).keys()].map(i => [i, 8])); g.n = 9;
    add('04_dac_biet', 'dinh_ke_tat_ca', 'Một đỉnh kề mọi đỉnh (như phản vật chất) + K₄,₄ → 2 + 1', g, { chi: 3, src: 'ly_thuyet' });
  }
  add('04_dac_biet', 'queen5_5', 'Bàn cờ hậu 5×5 (DIMACS queen5_5)', G.queen(5), { chi: 5, src: 'ly_thuyet' });
  add('04_dac_biet', 'queen6_6', 'Bàn cờ hậu 6×6 (DIMACS queen6_6)', G.queen(6), { chi: 7, src: 'ly_thuyet' });
  add('04_dac_biet', 'sudoku', 'Đồ thị Sudoku 9×9: 81 ô, nối ô cùng hàng/cột/khối', G.sudoku(), { chi: 9, src: 'ly_thuyet', oracle: false });
}

/* 05 — Dữ liệu lớn (web không chạy quay lui khi n > 90, quay lui chạy bằng C++) */
{
  for (const [n, seed] of [[200, 51], [500, 52], [1000, 53], [2000, 54], [5000, 55]]) {
    const p = +(10 / n).toFixed(4);
    add('05_lon', `thua_${n}`, `Đồ thị thưa G(n = ${n}, p = ${p}), bậc trung bình ≈ 10, seed ${seed}`, G.gnp(n, p, seed));
  }
  add('05_lon', 'day_300', 'Đồ thị dày G(n = 300, p = 0.5), seed 56', G.gnp(300, 0.5, 56));
  add('05_lon', 'day_1000', 'Đồ thị dày G(n = 1000, p = 0.1), seed 57', G.gnp(1000, 0.1, 57));
  add('05_lon', 'cai_san_1000_k5', '1000 đỉnh, 5 phần + clique K₅ cài sẵn → χ = 5', G.planted(1000, 5, 0.03, 58), { chi: 5, src: 'cai_san' });
  add('05_lon', 'cai_san_3000_k8', '3000 đỉnh, 8 phần + clique K₈ cài sẵn → χ = 8', G.planted(3000, 8, 0.004, 59), { chi: 8, src: 'cai_san' });
  add('05_lon', 'luong_phan_2000', '2000 đỉnh, lưỡng phân ngẫu nhiên → χ = 2', G.planted(2000, 2, 0.003, 60), { chi: 2, src: 'cai_san' });
  add('05_lon', 'crown_100', 'Crown S₁₀₀ (200 đỉnh, 9900 cạnh): bẫy tham lam ở quy mô lớn', G.crown(100), { chi: 2, src: 'ly_thuyet' });
  add('05_lon', 'k150', 'Đồ thị đầy đủ K₁₅₀', G.complete(150), { chi: 150, src: 'ly_thuyet' });
  add('05_lon', 'chu_trinh_4999', 'Chu trình lẻ C₄₉₉₉', G.cycle(4999), { chi: 3, src: 'ly_thuyet' });
  add('05_lon', 'duong_di_5000', 'Đường đi P₅₀₀₀', G.path(5000), { chi: 2, src: 'ly_thuyet' });
}

/* 06 — Không hợp lệ (phải bắt lỗi) và hợp lệ kèm cảnh báo */
{
  const H = '06_khong_hop_le';
  addRaw(H, 'rong', 'File rỗng', '', { err: 'Chưa có dữ liệu' });
  addRaw(H, 'chi_chu_thich', 'Chỉ có chú thích, không có dữ liệu', '# chỉ có chú thích\n\n# không có n\n', { err: 'Chưa có dữ liệu' });
  addRaw(H, 'dong_dau_chu', 'Dòng đầu là chữ', 'abc\n0 1\n', { err: 'dòng đầu phải là số mẫu', errCount: 1 });
  addRaw(H, 'n_am', 'n âm', '-3\n0 1\n', { err: 'dòng đầu phải là số mẫu', errCount: 1 });
  addRaw(H, 'n_bang_0', 'n = 0', '0\n', { err: 'phải ≥ 1', errCount: 1 });
  addRaw(H, 'n_qua_lon', `n = ${S.MAX_N + 1} vượt giới hạn MAX_N = ${S.MAX_N}`, `${S.MAX_N + 1}\n0 1\n`, { err: 'quá lớn', errCount: 1 });
  addRaw(H, 'dong_dau_3_so', 'Dòng đầu có 3 số', '3 2 1\n0 1\n', { err: 'dòng đầu phải là số mẫu', errCount: 1 });
  addRaw(H, 'khuyen', 'Khuyên 2–2', '3\n0 1\n2 2\n', { err: 'khuyên', errCount: 1 });
  addRaw(H, 'dinh_ngoai_pham_vi', 'Đỉnh 4 khi n = 4 (đỉnh đánh số 0..3)', '4\n0 1\n1 4\n', { err: 'ngoài phạm vi', errCount: 1 });
  addRaw(H, 'dinh_am', 'Đỉnh âm', '4\n0 -1\n', { err: 'ngoài phạm vi', errCount: 1 });
  addRaw(H, 'token_chu', 'Cạnh có chữ', '3\n0 x\n', { err: 'phải gồm đúng 2 số nguyên', errCount: 1 });
  addRaw(H, 'so_thuc', 'Cạnh có số thực', '3\n0 1.5\n', { err: 'phải gồm đúng 2 số nguyên', errCount: 1 });
  addRaw(H, 'ba_so_tren_dong', 'Dòng cạnh có 3 số', '3\n0 1 2\n', { err: 'phải gồm đúng 2 số nguyên', errCount: 1 });
  addRaw(H, 'dimacs_e_truoc_p', 'DIMACS: cạnh "e" đứng trước dòng "p"', 'e 1 2\np edge 2 1\n', { err: 'trước dòng', errCount: 1 });
  addRaw(H, 'dimacs_p_sai', 'DIMACS: dòng "p" thiếu số đỉnh', 'p edge x 1\n', { err: 'p edge n m', errCount: 1 });
  addRaw(H, 'dimacs_e_thieu', 'DIMACS: dòng "e" thiếu đỉnh', 'p edge 3 1\ne 1\n', { err: 'e u v', errCount: 1 });
  addRaw(H, 'dimacs_dinh_0', 'DIMACS đánh số từ 1, đỉnh 0 không hợp lệ', 'p edge 3 1\ne 0 1\n', { err: 'ngoài phạm vi', errCount: 1 });
  addRaw(H, 'nhieu_loi', 'Nhiều lỗi cùng lúc: khuyên, ngoài phạm vi, chữ', '4\n0 1\n1 1\n2 9\n3 y\n', { err: 'khuyên', errCount: 3 });
  addRaw(H, 'canh_lap', 'Cạnh lặp → bỏ qua, cảnh báo', '3\n0 1\n1 2\n0 1\n', { warn: 'bị lặp', chi: 2, src: 'ly_thuyet' });
  addRaw(H, 'canh_lap_dao', 'Cạnh lặp đảo chiều (1 0 sau 0 1)', '3\n0 1\n1 0\n1 2\n2 0\n', { warn: 'bị lặp', chi: 3, src: 'ly_thuyet' });
  addRaw(H, 'dong_dau_n_K', 'Dòng đầu kiểu cũ "n K" → bỏ qua K, cảnh báo', '4 2\n0 1\n1 2\n2 3\n3 0\n', { warn: 'không cần nhập số ngăn', chi: 2, src: 'ly_thuyet' });
  addRaw(H, 'dimacs_m_sai', 'DIMACS khai m = 5 nhưng chỉ có 2 cạnh', 'p edge 3 5\ne 1 2\ne 2 3\n', { warn: 'khai báo m = 5', chi: 2, src: 'ly_thuyet' });
  addRaw(H, 'dimacs_myciel3', 'DIMACS hợp lệ (định dạng benchmark, đỉnh 1..n, chú thích c): Grötzsch',
    dimacsText(G.mycielski(G.cycle(5)), ['myciel3 = Mycielski(C5), chi = 4']), { chi: 4, src: 'ly_thuyet' });
  addRaw(H, 'dimacs_queen5_5', 'DIMACS hợp lệ: bàn cờ hậu 5×5', dimacsText(G.queen(5), ['queen5_5, chi = 5']), { chi: 5, src: 'ly_thuyet' });
  addRaw(H, 'chu_thich', 'Danh sách cạnh có chú thích # đầu file và cuối dòng — Petersen',
    '# Petersen: 10 đỉnh, 15 cạnh\n10   # n\n' + G.petersen().e.map(([a, b]) => `${a} ${b}   # cạnh`).join('\n') + '\n', { chi: 3, src: 'ly_thuyet' });
  addRaw(H, 'crlf_tab_chu_thich', 'Xuống dòng Windows (CRLF), tab, dòng trống, chú thích cuối dòng — C₅ hợp lệ',
    '# C5 gõ tay trên Windows\r\n5\t# n\r\n\r\n0  1\r\n1\t2   # cạnh\r\n2 3\r\n\r\n3 4\r\n4 0\r\n', { chi: 3, src: 'ly_thuyet' });
}

/* ---------------- Ghi file ---------------- */
for (const g of Object.keys(GROUPS)) {
  const dir = path.join(OUT, g);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const COLS = ['id', 'nhom', 'file', 'dinh_dang', 'chuan_hoa', 'n', 'm', 'chi', 'nguon', 'loi', 'so_loi', 'canh_bao', 'mo_ta'];
const rows = [COLS.join(',')];
let bytes = 0;
for (const c of cases) {
  c.file = `${c.group}/${c.id}.txt`;
  fs.writeFileSync(path.join(OUT, c.file), c.text);
  bytes += Buffer.byteLength(c.text);
  rows.push([c.id, c.group, c.file, c.fmt, CPP_READABLE.test(c.text) ? 1 : 0, c.n, c.m, c.chi ?? '', c.src || (c.chi == null && !c.err ? 'can' : ''),
    c.err || '', c.errCount || '', c.warn || '', c.desc].map(csvCell).join(','));
}
fs.writeFileSync(path.join(OUT, 'expected.csv'), '﻿' + rows.join('\n') + '\n');
const by = {};
for (const c of cases) by[c.group] = (by[c.group] || 0) + 1;
console.log(`Đã sinh ${cases.length} testcase (${(bytes / 1024).toFixed(0)} KB):`);
for (const [g, name] of Object.entries(GROUPS)) console.log(`   ${g.padEnd(16)} ${String(by[g] || 0).padStart(3)}  ${name}`);
