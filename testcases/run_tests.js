/* =====================================================================
 * run_tests.js — chạy cả bộ testcase qua bộ giải của demo. Chạy: node run_tests.js
 *
 *   expected.csv + <nhóm>/<id>.txt  →  suite.runCase()  →  results.csv  (mở bằng Excel)
 *                                                       →  results.md   (đọc trên GitHub)
 *                                                       →  results.json (web demo + báo cáo dùng)
 * Thoát với mã 1 nếu có testcase không đạt.
 * ===================================================================== */
const fs = require('fs'), path = require('path'), os = require('os');
const S = require('../solver.js');
const T = require('./suite.js');

const DIR = __dirname;
const GROUPS = {
  '01_nho': 'Dữ liệu nhỏ', '02_thong_thuong': 'Thông thường', '03_bien': 'Biên',
  '04_dac_biet': 'Đặc biệt', '05_lon': 'Dữ liệu lớn', '06_khong_hop_le': 'Không hợp lệ / cảnh báo',
};
const EMBED_MAX = 12 * 1024;      // input ≤ 12 KB nhúng thẳng vào trang web, lớn hơn thì trang tải file

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

const exp = parseCsv(fs.readFileSync(path.join(DIR, 'expected.csv'), 'utf8'));
const rows = [], inputs = {};
const t0 = Date.now();
for (const e of exp) {
  const tc = {
    id: e.id, group: e.nhom, limit: e.gioi_han,
    chi: e.chi === '' ? null : +e.chi, err: e.loi, errCount: e.so_loi ? +e.so_loi : 0, warn: e.canh_bao,
  };
  const text = fs.readFileSync(path.join(DIR, e.file), 'utf8');
  const r = T.runCase(S, tc, text);
  rows.push({ ...r, file: e.file, fmt: e.dinh_dang, limit: e.gioi_han, src: e.nguon, desc: e.mo_ta,
              expErr: e.loi, expErrCount: tc.errCount, expWarn: e.canh_bao });
  if (e.gioi_han === 'web') inputs[e.id] = Buffer.byteLength(text) <= EMBED_MAX ? text : null;
  process.stdout.write(r.status === 'Đạt' ? '.' : 'x');
}
const totalSec = (Date.now() - t0) / 1000;
console.log();

/* ---------------- Tổng hợp ---------------- */
const summary = Object.entries(GROUPS).map(([g, name]) => {
  const rs = rows.filter(r => r.group === g);
  const withChi = rs.filter(r => r.chi != null && r.greedyK != null);
  return {
    group: g, name, total: rs.length, pass: rs.filter(r => r.status === 'Đạt').length,
    nMin: Math.min(...rs.map(r => r.n ?? Infinity)), nMax: Math.max(...rs.map(r => r.n ?? -Infinity)),
    greedyOpt: withChi.filter(r => r.greedyGap === 0).length, withChi: withChi.length,
    btDone: rs.filter(r => r.btStatus === 'xong').length, btAbort: rs.filter(r => r.btStatus === 'vượt ngân sách').length,
  };
});
const pass = rows.filter(r => r.status === 'Đạt').length;
const cpu = os.cpus()[0];
const meta = {
  date: new Date().toISOString(), node: process.version, platform: `${os.type()} ${os.release()} ${os.arch()}`,
  cpu: cpu ? cpu.model.trim() : '?', threads: os.cpus().length, ramGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  total: rows.length, pass, fail: rows.length - pass, seconds: +totalSec.toFixed(1),
  btMaxN: T.BT_MAX_N, btBudget: T.BT_BUDGET, maxN: S.MAX_N,
};
const round = x => x == null ? null : +x.toPrecision(4);
const slim = rows.map(r => ({
  id: r.id, group: r.group, file: r.file, fmt: r.fmt, limit: r.limit, desc: r.desc, src: r.src,
  n: r.n ?? null, m: r.m ?? null, chi: r.chi ?? null, lb: r.lb ?? null, ub: r.ub ?? null,
  greedyK: r.greedyK ?? null, greedyMs: round(r.greedyMs), greedySteps: r.greedySteps ?? null,
  btStatus: r.btStatus ?? null, btK: r.btK ?? null, btMs: round(r.btMs), btCalls: r.btCalls ?? null, btSteps: r.btSteps ?? null,
  trace: r.trace ?? null, errors: r.errors, warnings: r.warnings, msg: r.msg, expErr: r.expErr, expErrCount: r.expErrCount, expWarn: r.expWarn,
  status: r.status, fails: r.fails, notes: r.notes,
}));
fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify({ meta, groups: GROUPS, summary, rows: slim, inputs }));

/* CSV cho Excel */
const csvCell = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const CC = ['id', 'group', 'n', 'm', 'chi', 'src', 'lb', 'ub', 'greedyK', 'greedyMs', 'btStatus', 'btK', 'btMs', 'btCalls', 'trace',
            'errors', 'warnings', 'msg', 'status', 'fails', 'notes'];
fs.writeFileSync(path.join(DIR, 'results.csv'), '﻿' + [CC.join(','), ...slim.map(r => CC.map(c => csvCell(r[c])).join(','))].join('\n') + '\n');

/* Markdown */
const fmtMs = ms => ms == null ? '—' : ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : `${ms.toFixed(ms < 10 ? 2 : 1)} ms`;
const md = [
  '# Kết quả chạy bộ testcase', '',
  `Chạy lúc ${meta.date} · Node ${meta.node} · ${meta.cpu} (${meta.threads} luồng, ${meta.ramGB} GB RAM) · ${meta.platform}`, '',
  `**${pass}/${rows.length} testcase đạt** (${meta.seconds} s). Sinh lại: \`node gen_tests.js\` · chạy lại: \`node run_tests.js\`.`, '',
  '| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui xong / vượt ngân sách |', '|---|---:|---:|---|---:|---|',
  ...summary.map(s => `| ${s.name} | ${s.total} | ${s.pass} | ${isFinite(s.nMin) ? `${s.nMin}–${s.nMax}` : '—'} | ${s.withChi ? `${s.greedyOpt}/${s.withChi}` : '—'} | ${s.btDone} / ${s.btAbort} |`),
  '',
];
for (const [g, name] of Object.entries(GROUPS)) {
  md.push(`## ${name}`, '');
  if (g === '06_khong_hop_le') {
    md.push('| Test | Mô tả | Mong đợi | Hệ thống báo | Kết quả |', '|---|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const want = r.expErr ? `lỗi "${r.expErr}"` : r.expWarn ? `cảnh báo "${r.expWarn}", χ = ${r.chi}` : `hợp lệ, χ = ${r.chi}`;
      const got = r.errors ? `${r.errors} lỗi: ${r.msg}` : `${r.warnings} cảnh báo${r.msg ? `: ${r.msg}` : ''}${r.greedyK != null ? ` · quay lui ${r.btK}` : ''}`;
      md.push(`| [${r.id}](${r.file}) | ${r.desc} | ${want} | ${got.replace(/\|/g, '\\|')} | ${r.status === 'Đạt' ? '✅' : '❌ ' + r.fails.join('; ')} |`);
    }
  } else {
    md.push('| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |', '|---|---:|---:|---|---:|---|---|---|---|');
    for (const r of slim.filter(x => x.group === g)) {
      const chi = r.chi != null ? `${r.chi} (${r.src})` : `${r.lb} ≤ χ ≤ ${r.greedyK} (cận)`;
      const gk = r.chi != null && r.greedyK > r.chi ? `**${r.greedyK}** (+${r.greedyK - r.chi})` : r.greedyK;
      const bt = r.btStatus === 'xong' ? `${r.btK} · ${r.btCalls.toLocaleString('en')} lời gọi` : r.btStatus;
      md.push(`| [${r.id}](${r.file}) | ${r.n} | ${r.m} | ${chi} | ${gk} | ${bt} | ${fmtMs(r.greedyMs)} / ${fmtMs(r.btMs)} | ${r.trace} | ${r.status === 'Đạt' ? '✅' : '❌ ' + r.fails.join('; ')} |`);
    }
  }
  md.push('');
}
fs.writeFileSync(path.join(DIR, 'results.md'), md.join('\n'));

for (const r of rows.filter(r => r.status !== 'Đạt')) console.log(`  ✗ ${r.id}: ${r.fails.join('; ')}`);
for (const s of summary) console.log(`   ${s.name.padEnd(24)} ${s.pass}/${s.total}`);
console.log(`Kết quả: ${pass}/${rows.length} testcase đạt (${meta.seconds} s) → results.csv, results.md, results.json`);
process.exit(pass === rows.length ? 0 : 1);
