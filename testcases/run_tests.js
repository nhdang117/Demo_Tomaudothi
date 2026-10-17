/* =====================================================================
 * run_tests.js — chạy cả bộ testcase. Chạy: node run_tests.js [--timeout=10]
 *
 * Mỗi testcase chạy qua 2 bộ giải cùng thuật toán:
 *   JS   solver.js (bộ giải của trang web), theo đúng giới hạn của trang: quay lui chỉ khi n ≤ 90
 *   C++  cpp/tham_lam.cpp, cpp/quay_lui.cpp — bản CHỈ IN KẾT QUẢ CUỐI (không in log từng bước),
 *        biên dịch g++ -O2; quay lui chạy cho mọi n, dừng sau --timeout giây
 * rồi so với đáp án mong đợi và so JS với C++ (phải ra cùng số màu, cùng cách tô).
 *
 *   expected.csv + <nhóm>/<id>.txt → results.csv (Excel) · results.md (GitHub) · results.json (web + báo cáo)
 * Thoát với mã 1 nếu có testcase không đạt. Máy không có g++ thì bỏ phần C++.
 * ===================================================================== */
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const S = require('../solver.js');
const T = require('./suite.js');

const DIR = __dirname, CPP = path.join(DIR, '..', 'cpp'), BUILD = path.join(CPP, 'build');
const GROUPS = {
  '01_nho': 'Dữ liệu nhỏ', '02_thong_thuong': 'Thông thường', '03_bien': 'Biên',
  '04_dac_biet': 'Đặc biệt', '05_lon': 'Dữ liệu lớn', '06_khong_hop_le': 'Không hợp lệ / cảnh báo',
};
const EMBED_MAX = 12 * 1024;      // input ≤ 12 KB nhúng thẳng vào trang web, lớn hơn thì trang tải file
const TIMEOUT_S = +((process.argv.find(a => a.startsWith('--timeout=')) || '').split('=')[1] || 10);
const CXXFLAGS = ['-O2', '-std=c++17'];

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

/* ---------------- C++: biên dịch bản kết quả ---------------- */
const cpp = { ok: false, version: null, exe: {} };
{
  const v = spawnSync('g++', ['--version'], { encoding: 'utf8' });
  if (v.status === 0) {
    cpp.version = v.stdout.split('\n')[0].trim();
    fs.mkdirSync(BUILD, { recursive: true });
    cpp.ok = true;
    for (const [id, src] of [['greedy', 'tham_lam'], ['backtrack', 'quay_lui']]) {
      const out = `build/${src}${process.platform === 'win32' ? '.exe' : ''}`;
      // đường dẫn tương đối + cwd: ld của MinGW không mở được đường dẫn có dấu tiếng Việt
      const c = spawnSync('g++', [...CXXFLAGS, '-o', out, src + '.cpp'], { encoding: 'utf8', cwd: CPP });
      if (c.status !== 0) { console.log(`Không biên dịch được cpp/${src}.cpp:\n${c.stderr}`); process.exit(2); }
      cpp.exe[id] = path.join(CPP, out);
    }
  } else console.log('(máy không có g++: bỏ phần chạy C++)');
}
function runCpp(id, input) {
  const t0 = process.hrtime.bigint();
  const p = spawnSync(cpp.exe[id], [], { input, encoding: 'utf8', timeout: TIMEOUT_S * 1000, maxBuffer: 64 << 20 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  if (p.error && p.error.code === 'ETIMEDOUT') return { status: 'timeout', ms };
  const m = (p.stdout || '').match(/So mau: (-?\d+)/);
  if (p.status !== 0 || !m) return { status: 'error', ms, code: p.status, err: (p.stderr || '').trim() };
  const colors = [];
  for (const x of p.stdout.matchAll(/Dinh (\d+): mau (-?\d+)/g)) colors[+x[1]] = +x[2];
  return { status: 'ok', ms, k: +m[1], colors };
}
// thời gian khởi động 1 tiến trình (đồ thị 1 đỉnh) — thời gian C++ đo từ ngoài nên đã gồm khoản này
const startMs = cpp.ok ? Math.min(...[0, 1, 2, 3, 4].map(() => runCpp('greedy', '1\n').ms)) : null;

/* ---------------- Chạy ---------------- */
const exp = parseCsv(fs.readFileSync(path.join(DIR, 'expected.csv'), 'utf8'));
const rows = [], inputs = {};
const t0 = Date.now();
for (const e of exp) {
  const tc = { id: e.id, group: e.nhom, chi: e.chi === '' ? null : +e.chi, err: e.loi, errCount: e.so_loi ? +e.so_loi : 0, warn: e.canh_bao };
  const text = fs.readFileSync(path.join(DIR, e.file), 'utf8');
  const r = T.runCase(S, tc, text);
  const fail = m => { r.fails.push(m); r.status = 'Không đạt'; };

  // ---- C++ (chỉ với input chuẩn hóa: nhóm 01–05)
  if (!tc.err && r.graph && e.chuan_hoa === '1' && cpp.ok) {
    const g = r.graph;
    const valid = cols => cols.length === g.n && S.isProper(g, Int16Array.from(cols));
    const gr = runCpp('greedy', text);
    if (gr.status !== 'ok') fail(`C++ tham lam: ${gr.status === 'timeout' ? `quá ${TIMEOUT_S} s` : `lỗi chạy (mã ${gr.code})`}`);
    else {
      r.cppGreedyK = gr.k; r.cppGreedyMs = gr.ms;
      if (!valid(gr.colors)) fail('C++ tham lam: tô màu không hợp lệ');
      if (gr.k !== r.greedyK || gr.colors.join() !== Array.from(r.greedyColors).join()) fail('C++ tham lam khác JS');
    }
    const bt = runCpp('backtrack', text);
    r.cppBtMs = bt.ms;
    if (bt.status === 'timeout') { r.cppBtStatus = 'quá thời gian'; r.notes.push(`C++ quay lui chưa xong sau ${TIMEOUT_S} s`); }
    else if (bt.status !== 'ok') { r.cppBtStatus = 'lỗi'; fail(`C++ quay lui: lỗi chạy (mã ${bt.code}${bt.err ? ': ' + bt.err.slice(0, 80) : ''})`); }
    else {
      r.cppBtStatus = 'xong'; r.cppBtK = bt.k;
      if (!valid(bt.colors)) fail('C++ quay lui: tô màu không hợp lệ');
      if (r.chi != null && bt.k !== r.chi) fail(`C++ quay lui: ${bt.k} màu ≠ χ = ${r.chi}`);
      if (bt.k < r.lb) fail(`C++ quay lui: ${bt.k} màu < cận dưới ${r.lb}`);
      if (bt.k > gr.k) fail('C++ quay lui tệ hơn tham lam');
      if (r.btStatus === 'xong' && bt.colors.join() !== Array.from(r.btColors).join()) fail('C++ quay lui khác JS');
    }
  } else if (!tc.err && r.graph) r.cppBtStatus = r.cppNote = e.chuan_hoa === '1' ? 'không có g++' : 'không chạy';
  if (!tc.err && r.graph && e.chuan_hoa !== '1') r.notes.push('input dạng thô (kiểm tra bộ đọc của web) nên không chạy C++');

  rows.push({ ...r, file: e.file, fmt: e.dinh_dang, norm: e.chuan_hoa === '1', src: e.nguon, desc: e.mo_ta,
              expErr: e.loi, expErrCount: tc.errCount, expWarn: e.canh_bao });
  inputs[e.id] = Buffer.byteLength(text) <= EMBED_MAX ? text : null;
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
    btDone: rs.filter(r => r.btStatus === 'xong').length, btAbort: rs.filter(r => r.btStatus === 'vượt ngân sách').length,
    btSkip: rs.filter(r => r.btStatus === 'bỏ qua').length,
    cppBtDone: rs.filter(r => r.cppBtStatus === 'xong').length, cppBtTimeout: rs.filter(r => r.cppBtStatus === 'quá thời gian').length,
    demo: rs.filter(r => r.demo).length,
  };
});
const pass = rows.filter(r => r.status === 'Đạt').length;
const cpu = os.cpus()[0];
const meta = {
  date: new Date().toISOString(), node: process.version, platform: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: cpu ? cpu.model.trim() : '?', threads: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  total: rows.length, pass, fail: rows.length - pass, seconds: +totalSec.toFixed(1),
  btMaxN: S.UI.BT_MAX_N, btBudget: S.UI.BT_CMP_BUDGET, maxN: S.MAX_N, webMaxMs: T.WEB_MAX_MS,
  cpp: cpp.ok ? { compiler: cpp.version, flags: CXXFLAGS.join(' '), timeoutS: TIMEOUT_S, startMs: +startMs.toFixed(1) } : null,
};
const round = x => x == null ? null : +x.toPrecision(4);
const slim = rows.map(r => ({
  id: r.id, group: r.group, file: r.file, fmt: r.fmt, norm: r.norm, desc: r.desc, src: r.src,
  n: r.n ?? null, m: r.m ?? null, chi: r.chi ?? null, lb: r.lb ?? null, ub: r.ub ?? null,
  greedyK: r.greedyK ?? null, greedyMs: round(r.greedyMs), greedySteps: r.greedySteps ?? null,
  btStatus: r.btStatus ?? null, btK: r.btK ?? null, btMs: round(r.btMs), btCalls: r.btCalls ?? null, btSteps: r.btSteps ?? null,
  cppGreedyK: r.cppGreedyK ?? null, cppGreedyMs: round(r.cppGreedyMs),
  cppBtStatus: r.cppBtStatus ?? null, cppBtK: r.cppBtK ?? null, cppBtMs: round(r.cppBtMs),
  trace: r.trace ?? null, demo: !!r.demo, demoWhy: r.demoWhy || '', webMs: round(r.webMs),
  errors: r.errors, warnings: r.warnings, msg: r.msg, expErr: r.expErr, expErrCount: r.expErrCount, expWarn: r.expWarn,
  status: r.status, fails: r.fails, notes: r.notes,
}));
fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify({ meta, groups: GROUPS, summary, rows: slim, inputs }));

/* CSV cho Excel */
const csvCell = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const CC = ['id', 'group', 'n', 'm', 'chi', 'src', 'lb', 'ub', 'greedyK', 'greedyMs', 'btStatus', 'btK', 'btMs', 'btCalls',
            'cppGreedyK', 'cppGreedyMs', 'cppBtStatus', 'cppBtK', 'cppBtMs', 'trace', 'demo', 'webMs',
            'errors', 'warnings', 'msg', 'status', 'fails', 'notes'];
fs.writeFileSync(path.join(DIR, 'results.csv'), '﻿' + [CC.join(','), ...slim.map(r => CC.map(c => csvCell(r[c])).join(','))].join('\n') + '\n');

/* Markdown */
const fmtMs = ms => ms == null ? '—' : ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : ms < 1000 ? `${ms.toFixed(ms < 10 ? 2 : 1)} ms` : `${(ms / 1000).toFixed(1)} s`;
const C = meta.cpp;
const md = [
  '# Kết quả chạy bộ testcase', '',
  `Chạy lúc ${meta.date} · Node ${meta.node} · ${C ? `${C.compiler}, \`${C.flags}\`` : 'không có g++'} · ${meta.cpu} (${meta.threads} luồng, ${meta.ramGB} GB RAM) · ${meta.platform}`, '',
  `**${pass}/${rows.length} testcase đạt** (${meta.seconds} s). Sinh lại: \`node gen_tests.js\` · chạy lại: \`node run_tests.js\`.`, '',
  '- **JS**: bộ giải của trang web (`solver.js`), cùng giới hạn như trang: quay lui chỉ khi n ≤ ' + meta.btMaxN + '.',
  C ? `- **C++**: \`cpp/tham_lam.cpp\`, \`cpp/quay_lui.cpp\` — bản chỉ in kết quả cuối, **không in log từng bước**. Quay lui chạy cho mọi n, dừng sau ${C.timeoutS} s. Thời gian đo từ ngoài tiến trình, đã gồm ≈ ${C.startMs} ms khởi động tiến trình và đọc input.` : '',
  `- **Demo**: testcase được nạp vào trang nếu phần tính toán lúc nạp ≤ ${meta.webMaxMs} ms (đo bằng Node).`, '',
  '| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui JS xong / vượt ngân sách / bỏ qua | Quay lui C++ xong / quá giờ | Xem demo |',
  '|---|---:|---:|---|---:|---|---|---:|',
  ...summary.map(s => `| ${s.name} | ${s.total} | ${s.pass} | ${s.nMin != null ? `${s.nMin}–${s.nMax}` : '—'} | ${s.withChi ? `${s.greedyOpt}/${s.withChi}` : '—'} | ${s.btDone} / ${s.btAbort} / ${s.btSkip} | ${s.cppBtDone} / ${s.cppBtTimeout} | ${s.demo}/${s.total} |`),
  '',
];
const ok = r => r.status === 'Đạt' ? '✅' : '❌ ' + r.fails.join('; ');
for (const [g, name] of Object.entries(GROUPS)) {
  md.push(`## ${name}`, '');
  if (g === '06_khong_hop_le') {
    md.push('| Test | Mô tả | Mong đợi | Hệ thống báo | Kết quả |', '|---|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const want = r.expErr ? `lỗi "${r.expErr}"` : r.expWarn ? `cảnh báo "${r.expWarn}", χ = ${r.chi}` : `hợp lệ, χ = ${r.chi}`;
      const got = r.errors ? `${r.errors} lỗi: ${r.msg}` : `${r.warnings} cảnh báo${r.msg ? `: ${r.msg}` : ''}${r.greedyK != null ? ` · tham lam ${r.greedyK}, quay lui ${r.btK}` : ''}`;
      md.push(`| [${r.id}](${r.file}) | ${r.desc} | ${want} | ${got.replace(/\|/g, '\\|')} | ${ok(r)} |`);
    }
  } else {
    md.push('| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |',
            '|---|---:|---:|---|---:|---|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const chi = r.chi != null ? `${r.chi} (${r.src})` : `${r.lb} ≤ χ ≤ ${r.greedyK} (cận)`;
      const gk = r.chi != null && r.greedyK > r.chi ? `**${r.greedyK}** (+${r.greedyK - r.chi})` : r.greedyK;
      const bt = r.btStatus === 'xong' ? `${r.btK}` : r.btStatus;
      const cb = r.cppBtStatus === 'xong' ? `${r.cppBtK}` : r.cppBtStatus;
      md.push(`| [${r.id}](${r.file}) | ${r.n} | ${r.m} | ${chi} | ${gk} | ${bt} | ${cb} | ${fmtMs(r.cppGreedyMs)} / ${fmtMs(r.cppBtMs)} | ${r.demo ? '✓' : '—'} | ${ok(r)} |`);
    }
  }
  md.push('');
}
fs.writeFileSync(path.join(DIR, 'results.md'), md.filter(x => x !== null).join('\n'));

for (const r of rows.filter(r => r.status !== 'Đạt')) console.log(`  ✗ ${r.id}: ${r.fails.join('; ')}`);
for (const s of summary) console.log(`   ${s.name.padEnd(24)} ${s.pass}/${s.total}  · C++ quay lui xong ${s.cppBtDone}, quá giờ ${s.cppBtTimeout} · demo ${s.demo}`);
console.log(`Kết quả: ${pass}/${rows.length} testcase đạt (${meta.seconds} s) → results.csv, results.md, results.json`);
process.exit(pass === rows.length ? 0 : 1);
