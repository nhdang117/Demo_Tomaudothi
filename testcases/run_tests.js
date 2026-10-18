/* =====================================================================
 * run_tests.js — chạy cả bộ testcase bằng CODE C++. Chạy: node run_tests.js [--timeout=10]
 *
 * Mỗi testcase đi qua 3 chương trình C++ (biên dịch g++ -O2 vào cpp/build/):
 *   cpp/kiem_tra.cpp   kiểm tra input ma trận kề — cùng luật, cùng thông báo lỗi với ô nhập trên web
 *   cpp/tham_lam.cpp   tham lam, bản CHỈ IN KẾT QUẢ CUỐI của code trên panel
 *   cpp/quay_lui.cpp   quay lui, như trên; dừng sau --timeout giây
 * File này chỉ gọi các chương trình đó rồi chấm output với đáp án mong đợi (expected.csv), không chạy
 * bộ giải JS của trang (solver.js chỉ được dùng để lấy ngưỡng hiển thị của web). Chấm: tô màu hợp lệ trên
 * ma trận kề, đúng χ mong đợi, hoặc nằm trong cận ω(G) ≤ k ≤ Δ + 1 (ω từ suite.js, viết độc lập).
 *
 *   expected.csv + <nhóm>/<id>.txt → results.csv (Excel) · results.md (GitHub) · results.json (web + báo cáo)
 * Thoát với mã 1 nếu có testcase không đạt; máy không có g++ thì dừng với mã 2.
 * ===================================================================== */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const S = require('../solver.js');
const T = require('./suite.js');

const DIR = __dirname, CPP = path.join(DIR, '..', 'cpp'), BUILD = path.join(CPP, 'build');
const GROUPS = {
  '01_nho': 'Dữ liệu nhỏ', '02_thong_thuong': 'Thông thường', '03_bien': 'Biên',
  '04_dac_biet': 'Đặc biệt', '05_lon': 'Dữ liệu lớn', '06_khong_hop_le': 'Không hợp lệ',
};
const EMBED_MAX = 12 * 1024;      // input ≤ 12 KB nhúng thẳng vào trang web, lớn hơn thì trang tải file
const DEMO_MAX_N = S.UI.TEXT_MAX_N;   // testcase hợp lệ có n ≤ ngưỡng này thì trang cho nạp xem từng bước
const TIMEOUT_S = +((process.argv.find(a => a.startsWith('--timeout=')) || '').split('=')[1] || 10);
const CXXFLAGS = ['-O2', '-std=c++17'];
const PROGS = { check: 'kiem_tra', greedy: 'tham_lam', backtrack: 'quay_lui' };

function parseCsv(text) {
  const out = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const [head, ...rest] = out;
  return rest.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

/* ---------------- Biên dịch 3 chương trình C++ ---------------- */
const cpp = { version: null, exe: {} };
{
  const v = spawnSync('g++', ['--version'], { encoding: 'utf8' });
  if (v.status !== 0) { console.log('Máy không có g++: bộ testcase chạy bằng code C++ nên không chạy được.'); process.exit(2); }
  cpp.version = v.stdout.split('\n')[0].trim();
  fs.mkdirSync(BUILD, { recursive: true });
  for (const [id, src] of Object.entries(PROGS)) {
    const out = `build/${src}${process.platform === 'win32' ? '.exe' : ''}`;
    // đường dẫn tương đối + cwd: ld của MinGW không mở được đường dẫn có dấu tiếng Việt
    const c = spawnSync('g++', [...CXXFLAGS, '-o', out, src + '.cpp'], { encoding: 'utf8', cwd: CPP });
    if (c.status !== 0) { console.log(`Không biên dịch được cpp/${src}.cpp:\n${c.stderr}`); process.exit(2); }
    cpp.exe[id] = path.join(CPP, out);
  }
}
function runExe(id, input) {
  const t0 = process.hrtime.bigint();
  const p = spawnSync(cpp.exe[id], [], { input, encoding: 'utf8', timeout: TIMEOUT_S * 1000, maxBuffer: 64 << 20 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (p.error && p.error.code === 'ETIMEDOUT') return { status: 'timeout', ms };
  return { status: 'ok', ms, code: p.status, out: (p.stdout || '').replace(/\r\n/g, '\n'), err: (p.stderr || '').trim() };
}
/* tham_lam / quay_lui: "So mau: k" rồi "Dinh v: mau c" */
function runSolver(id, input) {
  const p = runExe(id, input);
  if (p.status === 'timeout') return p;
  const m = p.out.match(/So mau: (-?\d+)/);
  if (p.code !== 0 || !m) return { status: 'error', ms: p.ms, code: p.code, err: p.err };
  const colors = [];
  for (const x of p.out.matchAll(/Dinh (\d+): mau (-?\d+)/g)) colors[+x[1]] = +x[2];
  return { status: 'ok', ms: p.ms, k: +m[1], colors };
}
// thời gian khởi động 1 tiến trình (đồ thị 1 đỉnh) — thời gian C++ đo từ ngoài nên đã gồm khoản này
const startMs = Math.min(...[0, 1, 2, 3, 4].map(() => runSolver('greedy', '1\n0\n').ms));

/* ---------------- Đồ thị để CHẤM output (chỉ đọc khi kiem_tra đã nhận input) ---------------- */
function readMatrix(text) {                         // quét từng ký tự: n = 5000 là 25 triệu số, không tách chuỗi
  let i = 0, n = 0, k = -1;                          // k: chỉ số phần tử ma trận đang đọc (−1 = đang đọc n)
  const isWs = c => c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12;
  let adj = null; const edges = [];
  while (i < text.length) {
    while (i < text.length && isWs(text.charCodeAt(i))) i++;
    const s = i;
    while (i < text.length && !isWs(text.charCodeAt(i))) i++;
    if (i === s) break;
    if (k < 0) { n = +text.slice(s, i); adj = Array.from({ length: n }, () => []); }
    else if (text.charCodeAt(s) === 49) {            // '1' (kiem_tra.cpp đã bảo đảm chỉ có "0"/"1", đối xứng)
      const u = Math.floor(k / n), v = k % n;
      if (u < v) { adj[u].push(v); adj[v].push(u); edges.push([u, v]); }
    }
    k++;
  }
  return { n, adj, edges };
}
const validColoring = (g, cols) => cols.length === g.n && cols.every(c => c >= 0) && g.edges.every(([u, v]) => cols[u] !== cols[v]);

/* ---------------- Chạy ---------------- */
const exp = parseCsv(fs.readFileSync(path.join(DIR, 'expected.csv'), 'utf8'));
const rows = [], inputs = {};
const t0 = Date.now();
for (const e of exp) {
  const text = fs.readFileSync(path.join(DIR, e.file), 'utf8');
  const r = { id: e.id, group: e.nhom, file: e.file, fmt: e.dinh_dang, norm: e.chuan_hoa === '1', src: e.nguon, desc: e.mo_ta,
              expErr: e.loi, expErrCount: e.so_loi ? +e.so_loi : 0, chi: e.chi === '' ? null : +e.chi,
              status: 'Đạt', fails: [], notes: [], demo: false, demoWhy: '' };
  const fail = m => { r.fails.push(m); r.status = 'Không đạt'; };
  rows.push(r);
  inputs[e.id] = Buffer.byteLength(text) <= EMBED_MAX ? text : null;

  // ---- 1. kiem_tra.cpp: input có hợp lệ không
  const ck = runExe('check', text);
  r.checkMs = ck.ms;
  if (ck.status === 'timeout') { fail(`C++ kiểm tra input: quá ${TIMEOUT_S} s`); continue; }
  const errs = ck.code === 0 ? [] : ck.out.split('\n').filter(Boolean);
  r.errors = errs.length; r.msg = errs[0] || '';
  if (r.expErr) {                                   // testcase không hợp lệ: phải bị bắt lỗi
    if (!errs.length) fail('không báo lỗi');
    else if (!errs.some(x => x.includes(r.expErr))) fail(`lỗi khác mong đợi: ${errs[0]}`);
    if (r.expErrCount && errs.length !== r.expErrCount) fail(`báo ${errs.length} lỗi, mong đợi ${r.expErrCount}`);
    r.demoWhy = 'input lỗi: trang báo lỗi, không nạp';
    continue;
  }
  if (errs.length) { fail(`C++ kiểm tra input báo lỗi: ${errs[0]}`); continue; }

  const g = readMatrix(text);
  r.n = g.n; r.m = g.edges.length;
  if (ck.out.trim() !== `Hop le: n = ${g.n}, m = ${g.edges.length}`) fail(`C++ kiểm tra input in sai: ${ck.out.trim()}`);
  r.ub = T.maxDegree(g) + 1;                         // cận trên Δ + 1 (tham lam luôn đạt)
  if (r.chi == null) {                               // không biết χ → kẹp bằng ω(G)
    const cl = T.maxClique(g, 3e5);
    r.lb = cl.size; r.lbExact = cl.exact;
  } else r.lb = r.chi;

  // ---- 2. tham_lam.cpp
  const gr = runSolver('greedy', text);
  r.greedyMs = gr.ms;
  if (gr.status !== 'ok') fail(`C++ tham lam: ${gr.status === 'timeout' ? `quá ${TIMEOUT_S} s` : `lỗi chạy (mã ${gr.code})`}`);
  else {
    r.greedyK = gr.k;
    if (!validColoring(g, gr.colors)) fail('tham lam: tô màu không hợp lệ');
    if (gr.k > r.ub) fail(`tham lam: ${gr.k} màu > Δ + 1 = ${r.ub}`);
    if (gr.k < r.lb) fail(`tham lam: ${gr.k} màu < cận dưới ${r.lb} (không thể)`);
    if (r.chi != null) r.greedyGap = gr.k - r.chi;
  }

  // ---- 3. quay_lui.cpp: chạy cho mọi n, quá giờ thì ghi nhận (không tính là sai)
  const bt = runSolver('backtrack', text);
  r.btMs = bt.ms;
  if (bt.status === 'timeout') { r.btStatus = 'quá thời gian'; r.notes.push(`quay lui chưa xong sau ${TIMEOUT_S} s`); }
  else if (bt.status !== 'ok') { r.btStatus = 'lỗi'; fail(`C++ quay lui: lỗi chạy (mã ${bt.code}${bt.err ? ': ' + bt.err.slice(0, 80) : ''})`); }
  else {
    r.btStatus = 'xong'; r.btK = bt.k;
    if (!validColoring(g, bt.colors)) fail('quay lui: tô màu không hợp lệ');
    if (r.chi != null && bt.k !== r.chi) fail(`quay lui: ${bt.k} màu ≠ χ = ${r.chi}`);
    if (bt.k < r.lb) fail(`quay lui: ${bt.k} màu < cận dưới ${r.lb}`);
    if (gr.status === 'ok' && bt.k > gr.k) fail('quay lui tệ hơn tham lam');
  }

  r.demo = g.n <= DEMO_MAX_N;
  r.demoWhy = r.demo ? (g.n > S.UI.BT_MAX_N ? `n > ${S.UI.BT_MAX_N}: trang chỉ chạy tham lam` : '')
                     : `n > ${DEMO_MAX_N}: đồ thị lớn, trang chỉ hiện kết quả C++`;
  process.stdout.write(r.status === 'Đạt' ? '.' : 'x');
}
const totalSec = (Date.now() - t0) / 1000;
console.log();

/* ---------------- Tổng hợp ---------------- */
const summary = Object.entries(GROUPS).map(([g, name]) => {
  const rs = rows.filter(r => r.group === g);
  const withChi = rs.filter(r => r.chi != null && r.greedyK != null);
  const ns = rs.filter(r => r.n != null).map(r => r.n);
  return {
    group: g, name, total: rs.length, pass: rs.filter(r => r.status === 'Đạt').length,
    nMin: ns.length ? Math.min(...ns) : null, nMax: ns.length ? Math.max(...ns) : null,
    greedyOpt: withChi.filter(r => r.greedyGap === 0).length, withChi: withChi.length,
    btDone: rs.filter(r => r.btStatus === 'xong').length, btTimeout: rs.filter(r => r.btStatus === 'quá thời gian').length,
    demo: rs.filter(r => r.demo).length,
  };
});
const pass = rows.filter(r => r.status === 'Đạt').length;
const cpu = os.cpus()[0];
const meta = {
  date: new Date().toISOString(), node: process.version, platform: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: cpu ? cpu.model.trim() : '?', threads: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  total: rows.length, pass, fail: rows.length - pass, seconds: +totalSec.toFixed(1),
  btMaxN: S.UI.BT_MAX_N, maxN: S.MAX_N, demoMaxN: DEMO_MAX_N,
  cpp: { compiler: cpp.version, flags: CXXFLAGS.join(' '), timeoutS: TIMEOUT_S, startMs: +startMs.toFixed(1),
         programs: Object.values(PROGS).map(p => `cpp/${p}.cpp`) },
};
const round = x => x == null ? null : +x.toPrecision(4);
const slim = rows.map(r => ({
  id: r.id, group: r.group, file: r.file, fmt: r.fmt, norm: r.norm, desc: r.desc, src: r.src,
  n: r.n ?? null, m: r.m ?? null, chi: r.chi ?? null, lb: r.lb ?? null, ub: r.ub ?? null,
  checkMs: round(r.checkMs), greedyK: r.greedyK ?? null, greedyMs: round(r.greedyMs),
  btStatus: r.btStatus ?? null, btK: r.btK ?? null, btMs: round(r.btMs),
  demo: r.demo, demoWhy: r.demoWhy,
  errors: r.errors ?? 0, msg: r.msg ?? '', expErr: r.expErr, expErrCount: r.expErrCount,
  status: r.status, fails: r.fails, notes: r.notes,
}));
fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify({ meta, groups: GROUPS, summary, rows: slim, inputs }));

/* CSV cho Excel */
const csvCell = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const CC = ['id', 'group', 'n', 'm', 'chi', 'src', 'lb', 'ub', 'checkMs', 'greedyK', 'greedyMs', 'btStatus', 'btK', 'btMs',
            'demo', 'errors', 'msg', 'status', 'fails', 'notes'];
fs.writeFileSync(path.join(DIR, 'results.csv'), '﻿' + [CC.join(','), ...slim.map(r => CC.map(c => csvCell(r[c])).join(','))].join('\n') + '\n');

/* Markdown */
const fmtMs = ms => ms == null ? '—' : ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : ms < 1000 ? `${ms.toFixed(ms < 10 ? 2 : 1)} ms` : `${(ms / 1000).toFixed(1)} s`;
const C = meta.cpp;
const md = [
  '# Kết quả chạy bộ testcase', '',
  `Chạy lúc ${meta.date} · ${C.compiler}, \`${C.flags}\` · Node ${meta.node} (chỉ để gọi chương trình) · ${meta.cpu} (${meta.threads} luồng, ${meta.ramGB} GB RAM) · ${meta.platform}`, '',
  `**${pass}/${rows.length} testcase đạt** (${meta.seconds} s). Sinh lại: \`node gen_tests.js\` · chạy lại: \`node run_tests.js\`.`, '',
  `Mọi testcase chạy bằng **code C++**: \`cpp/kiem_tra.cpp\` kiểm tra input ma trận kề (cùng thông báo lỗi với web), rồi \`cpp/tham_lam.cpp\` và \`cpp/quay_lui.cpp\` — bản chỉ in kết quả cuối, **không in log từng bước**. Quay lui chạy cho mọi n, dừng sau ${C.timeoutS} s. Thời gian đo từ ngoài tiến trình, đã gồm ≈ ${C.startMs} ms khởi động tiến trình và đọc input.`, '',
  `Cột **Demo**: testcase hợp lệ có n ≤ ${meta.demoMaxN} thì phần Kiểm thử trên trang cho nạp đồ thị để xem từng bước.`, '',
  '| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui xong / quá giờ | Xem demo |',
  '|---|---:|---:|---|---:|---|---:|',
  ...summary.map(s => `| ${s.name} | ${s.total} | ${s.pass} | ${s.nMin != null ? `${s.nMin}–${s.nMax}` : '—'} | ${s.withChi ? `${s.greedyOpt}/${s.withChi}` : '—'} | ${s.btDone} / ${s.btTimeout} | ${s.demo}/${s.total} |`),
  '',
];
const ok = r => r.status === 'Đạt' ? '✅' : '❌ ' + r.fails.join('; ');
for (const [g, name] of Object.entries(GROUPS)) {
  md.push(`## ${name}`, '');
  if (g === '06_khong_hop_le') {
    md.push('| Test | Mô tả | Mong đợi | kiem_tra.cpp báo | Kết quả |', '|---|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const want = r.expErr ? `lỗi "${r.expErr}"` : `hợp lệ, χ = ${r.chi}`;
      const got = r.errors ? `${r.errors} lỗi: ${r.msg}` : `hợp lệ${r.greedyK != null ? ` · tham lam ${r.greedyK}, quay lui ${r.btK}` : ''}`;
      md.push(`| [${r.id}](${r.file}) | ${r.desc} | ${want} | ${got.replace(/\|/g, '\\|')} | ${ok(r)} |`);
    }
  } else {
    md.push('| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |',
            '|---|---:|---:|---|---:|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const chi = r.chi != null ? `${r.chi} (${r.src})` : `${r.lb} ≤ χ ≤ ${r.greedyK} (cận)`;
      const gk = r.chi != null && r.greedyK > r.chi ? `**${r.greedyK}** (+${r.greedyK - r.chi})` : r.greedyK;
      const bt = r.btStatus === 'xong' ? `${r.btK}` : r.btStatus;
      md.push(`| [${r.id}](${r.file}) | ${r.n} | ${r.m} | ${chi} | ${gk} | ${bt} | ${fmtMs(r.greedyMs)} / ${fmtMs(r.btMs)} | ${r.demo ? '✓' : '—'} | ${ok(r)} |`);
    }
  }
  md.push('');
}
fs.writeFileSync(path.join(DIR, 'results.md'), md.join('\n'));

for (const r of rows.filter(r => r.status !== 'Đạt')) console.log(`  ✗ ${r.id}: ${r.fails.join('; ')}`);
for (const s of summary) console.log(`   ${s.name.padEnd(24)} ${s.pass}/${s.total}  · quay lui xong ${s.btDone}, quá giờ ${s.btTimeout} · demo ${s.demo}`);
console.log(`Kết quả: ${pass}/${rows.length} testcase đạt (${meta.seconds} s) → results.csv, results.md, results.json`);
process.exit(pass === rows.length ? 0 : 1);
