/* test.js — kiểm thử tự động bộ giải. Chạy: node test.js */
const S = require('./solver.js');

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) pass++;
  else { fail++; console.log('  ✗ FAIL:', name, extra); }
}

/* χ bằng vét cạn thuần (chỉ cho n nhỏ) — dùng làm "đáp án chuẩn" */
function bruteChi(g) {
  if (g.edges.length === 0) return 1;
  for (let k = 1; k <= g.n; k++) {
    const col = new Int16Array(g.n);
    const total = Math.pow(k, g.n);
    for (let code = 0; code < total; code++) {
      let x = code;
      for (let i = 0; i < g.n; i++) { col[i] = x % k; x = Math.floor(x / k); }
      if (S.isProper(g, col)) return k;
    }
  }
  return g.n;
}

function checkTrace(name, algo, g) {
  const t = S.trace(algo, g, 200000);
  const steps = t.steps;
  check(`${name}/${algo}: trace không bị cắt`, !t.truncated);
  check(`${name}/${algo}: có đúng 1 bước init`, steps.filter(s => s.type === 'init').length === 1);
  const last = steps[steps.length - 1];
  check(`${name}/${algo}: bước cuối là done`, last.type === 'done');
  check(`${name}/${algo}: trạng thái cuối = kết quả`, S.isProper(g, last.colors));
  let ok = true;
  for (const s of steps) if (!S.isPartialProper(g, s.colors)) { ok = false; break; }
  check(`${name}/${algo}: mọi bước trung gian đều hợp lệ`, ok);
  return steps.length;
}

console.log('1) Đồ thị mẫu có χ đã biết');
for (const p of S.PRESETS) {
  const g = p.build();
  const res = {};
  for (const id of Object.keys(S.ALGOS)) {
    const r = S.ALGOS[id].run(g, null, { budget: 5e6 });
    res[id] = r.k;
    check(`${p.id}/${id}: tô màu hợp lệ`, S.isProper(g, r.colors));
    if (!S.ALGOS[id].exact) check(`${p.id}/${id}: số màu ≥ χ`, r.k >= p.chi);
  }
  check(`${p.id}: quay lui = χ đã biết (${p.chi})`, res.backtrack === p.chi, `got ${res.backtrack}`);
  check(`${p.id}: vét cạn = χ đã biết`, g.n > 11 || bruteChi(g) === p.chi);
  const lens = {};
  for (const id of Object.keys(S.ALGOS)) lens[id] = checkTrace(p.id, id, g);
  console.log(`   ${p.id.padEnd(9)} n=${g.n} m=${g.edges.length} χ=${p.chi} | màu: ` +
    Object.entries(res).map(([k, v]) => `${k}=${v}`).join(' ') + ' | số bước: ' +
    Object.entries(lens).map(([k, v]) => `${k}=${v}`).join(' '));
}

console.log('2) Trường hợp đặc biệt');
{
  const crown = S.PRESETS.find(p => p.id === 'crown').build();
  check('crown: tham lam dùng 6 màu (bẫy: mọi đỉnh cùng bậc)', S.greedy(crown, null).k === 6);
  check('crown: quay lui tìm đúng χ = 2', S.backtrack(crown, null).k === 2);
  const cargo = S.PRESETS.find(p => p.id === 'cargo').build();
  check('cargo: tham lam vừa 4 ngăn', S.greedy(cargo, null).k === 4);
  check('cargo: phản vật chất kề mọi mẫu', cargo.adj[11].length === 11);
  check('cargo: Heli-3 chỉ phản ứng với phản vật chất', cargo.adj[0].length === 1);
  const one = S.makeGraph(1, []);
  for (const id of Object.keys(S.ALGOS)) check(`1 đỉnh/${id}: 1 màu`, S.ALGOS[id].run(one, null).k === 1);
  const empty = S.makeGraph(6, []);
  for (const id of Object.keys(S.ALGOS)) check(`không cạnh/${id}: 1 màu`, S.ALGOS[id].run(empty, null).k === 1);
  const kn = S.makeGraph(6, [].concat(...[0,1,2,3,4,5].map(i => [0,1,2,3,4,5].filter(j => j > i).map(j => [i, j]))));
  for (const id of Object.keys(S.ALGOS)) check(`K6/${id}: 6 màu`, S.ALGOS[id].run(kn, null).k === 6);
  const disc = S.makeGraph(7, [[0, 1], [1, 2], [2, 0], [4, 5]]);
  check('không liên thông: χ = 3', S.backtrack(disc, null).k === 3);
  // quay lui kiểu kmin: mỗi lời giải gặp sau phải ÍT màu hơn hẳn lời giải trước, cái cuối = χ
  const graphs = S.PRESETS.map(p => p.build());
  for (let seed = 1; seed <= 100; seed++) graphs.push(S.randomGraph(2 + seed % 12, [0.2, 0.4, 0.7][seed % 3], seed));
  let bad = 0;
  for (const g of graphs) {
    const t = S.trace('backtrack', g, 200000);
    const ks = t.steps.filter(s => s.type === 'found').map(s => s.k);
    if (!ks.length || ks[ks.length - 1] !== t.result.k) bad++;
    for (let i = 1; i < ks.length; i++) if (ks[i] >= ks[i - 1]) bad++;
  }
  check(`quay lui: kmin giảm ngặt ở mỗi lời giải mới (${graphs.length} đồ thị)`, bad === 0, `${bad} chỗ sai`);
}

console.log('3) Ví dụ Buổi 10 (slide 18) — trace khớp bảng cô chạy tay');
{
  const g = S.PRESETS.find(p => p.id === 'buoi10').build();
  const t = S.trace('greedy', g, 100000);
  const sel = t.steps.filter(s => s.type === 'select'), asg = t.steps.filter(s => s.type === 'assign');
  const row = s => Array.from(s.degs).join(' ');
  check('buoi10: tô lần lượt 5, 0, 6', asg.slice(0, 3).map(s => s.v).join() === '5,0,6');
  check('buoi10: 5 màu 0, 0 màu 0, 6 sinh màu mới 1', asg.slice(0, 3).map(s => s.c).join() === '0,0,1');
  check('buoi10: bảng bậc ban đầu', row(sel[0]) === '3 4 4 4 2 5 4 3 3 2', row(sel[0]));
  check('buoi10: bảng bậc sau khi tô 5', row(sel[1]) === '3 3 3 3 2 -1 3 2 3 2', row(sel[1]));
  check('buoi10: bảng bậc sau khi tô 0', row(sel[2]) === '-1 2 2 2 2 -1 3 2 3 2', row(sel[2]));
  check('buoi10: dùng 3 màu = χ', t.result.k === 3);
}

console.log('4) Bất biến bảng bậc ở mọi bước chọn đỉnh của tham lam');
{
  const graphs = S.PRESETS.map(p => p.build());
  for (let seed = 1; seed <= 150; seed++) graphs.push(S.randomGraph(2 + seed % 30, [0.1, 0.3, 0.6][seed % 3], seed));
  let bad = 0;
  for (const g of graphs) {
    for (const s of S.trace('greedy', g, 100000).steps) {
      if (s.type !== 'select') continue;
      let best = -1;
      for (let x = 0; x < g.n; x++) {
        const want = s.colors[x] >= 0 ? -1 : g.adj[x].filter(u => s.colors[u] < 0).length;   // −1 hoặc số đỉnh kề chưa tô
        if (s.degs[x] !== want) bad++;
        if (s.degs[x] >= 0 && (best < 0 || s.degs[x] > s.degs[best])) best = x;
      }
      if (s.v !== best) bad++;                                                            // bậc cao nhất, hòa → chỉ số nhỏ
    }
  }
  check(`bảng bậc đúng và đỉnh chọn đúng trên ${graphs.length} đồ thị`, bad === 0, `${bad} chỗ sai`);
}

console.log('5) 400 đồ thị ngẫu nhiên nhỏ — so quay lui với vét cạn');
{
  let n0 = 0;
  for (let seed = 1; seed <= 400; seed++) {
    const n = 1 + (seed % 8), p = [0.2, 0.4, 0.6, 0.8][seed % 4];
    const g = S.randomGraph(n, p, seed);
    const chi = bruteChi(g);
    const bt = S.backtrack(g, null);
    if (bt.k !== chi) { check(`random seed=${seed}`, false, `bt=${bt.k} brute=${chi}`); continue; }
    const gr = S.greedy(g, null), maxDeg = Math.max(0, ...g.adj.map(a => a.length));
    if (!(S.isProper(g, gr.colors) && gr.k >= chi && gr.k <= maxDeg + 1)) { check(`random seed=${seed} tham lam`, false); continue; }
    n0++;
  }
  check('400 đồ thị ngẫu nhiên khớp vét cạn', n0 === 400, `${n0}/400`);
}

console.log('6) Đồ thị ngẫu nhiên lớn hơn — độ dài trace');
for (const [n, p, seed] of [[14, 0.35, 7], [20, 0.3, 3], [30, 0.2, 11], [60, 0.1, 5], [120, 0.05, 9]]) {
  const g = S.randomGraph(n, p, seed);
  const row = [];
  for (const id of Object.keys(S.ALGOS)) {
    const t0 = process.hrtime.bigint();
    const r = S.ALGOS[id].run(g, null, { budget: 2e6 });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (!r.aborted) check(`G(${n},${p})/${id} hợp lệ`, S.isProper(g, r.colors));
    const t = S.trace(id, g, 6000);
    row.push(`${id}=${r.aborted ? 'abort' : r.k}(${t.steps.length}${t.truncated ? '+' : ''} bước, ${ms.toFixed(1)}ms)`);
  }
  console.log(`   G(${n},${p}) m=${g.edges.length}: ` + row.join(' '));
}

console.log('7) Đọc input & dữ liệu không hợp lệ');
{
  let r = S.parseInput('4\n0 1\n1 2\n2 3\n3 0');
  check('input hợp lệ', r.errors.length === 0 && r.graph.n === 4 && r.graph.edges.length === 4);
  r = S.parseInput('c DIMACS\np edge 3 3\ne 1 2\ne 2 3\ne 3 1');
  check('DIMACS', r.errors.length === 0 && r.graph.n === 3 && S.backtrack(r.graph, null).k === 3);
  r = S.parseInput('3\n0 0');
  check('khuyên bị bắt lỗi', r.errors.length === 1 && /khuyên/.test(r.errors[0]));
  r = S.parseInput('3\n0 5');
  check('đỉnh ngoài phạm vi', r.errors.length === 1 && /ngoài phạm vi/.test(r.errors[0]));
  r = S.parseInput('3\n0 x');
  check('token sai', r.errors.length === 1);
  r = S.parseInput('3\n0 1\n1 0');
  check('cạnh lặp → cảnh báo', r.errors.length === 0 && r.warnings.length === 1 && r.graph.edges.length === 1);
  r = S.parseInput(`${S.MAX_N + 1}\n0 1`);
  check('n quá lớn (> MAX_N = MAXN − 5 của code C++)', r.errors.length === 1);
  r = S.parseInput(`${S.MAX_N}\n0 1\n${S.MAX_N - 1} 1`);
  check('n = MAX_N vẫn nhận', r.errors.length === 0 && r.graph.n === S.MAX_N && r.graph.edges.length === 2);
  r = S.parseInput('9999\n0 1\n9998 1', { maxN: Infinity });
  check('opts.maxN nới giới hạn', r.errors.length === 0 && r.graph.n === 9999 && r.graph.edges.length === 2);
  check('MAXN trong code C++ = MAX_N + 5', Object.values(S.ALGOS).every(A => A.cpp().some(l => l.includes(`const int MAXN = ${S.MAX_N + 5};`))));
  r = S.parseInput('p edge 3 5\ne 1 2\ne 2 3');
  check('DIMACS khai sai m → cảnh báo', r.errors.length === 0 && r.warnings.length === 1 && /m = 5/.test(r.warnings[0]));
  r = S.parseInput('');
  check('rỗng', r.errors.length === 1);
  r = S.parseInput('abc');
  check('dòng đầu sai', r.errors.length === 1);
  r = S.parseInput('3 2\n0 1\n1 2');
  check('dòng đầu "n K" cũ → bỏ qua K, cảnh báo', r.errors.length === 0 && r.warnings.length === 1 && r.graph.n === 3 && !('bays' in r));
  r = S.parseInput('3 2 1\n0 1');
  check('dòng đầu 3 số → lỗi', r.errors.length === 1);
  const g0 = S.PRESETS[0].build();
  r = S.parseInput(S.toEdgeListText(g0));
  check('xuất rồi đọc lại danh sách cạnh', r.errors.length === 0 && r.warnings.length === 0 && r.graph.n === g0.n && r.graph.edges.length === g0.edges.length);
}

console.log('8) Code C++ trên panel — biên dịch bằng g++, chạy và so với solver');
{
  const { spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
  if (spawnSync('g++', ['--version']).status !== 0) console.log('   (bỏ qua: máy không có g++)');
  else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-cpp-'));
    const graphs = S.PRESETS.map(p => p.build());
    for (let seed = 1; seed <= 40; seed++) graphs.push(S.randomGraph(1 + seed % 14, [0.2, 0.4, 0.7][seed % 3], seed));
    const { exportCpp, FILES } = require('./cpp/export_cpp.js');
    const want = exportCpp(S);
    for (const [name, text] of Object.entries(want)) {
      const p = path.join(__dirname, 'cpp', name);
      check(`cpp/${name} khớp solver.js (chạy node cpp/export_cpp.js nếu lệch)`,   // bỏ qua CRLF do git autocrlf
        fs.existsSync(p) && fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') === text);
    }
    for (const id of Object.keys(S.ALGOS)) {
      const src = path.join(dir, id + '.cpp'), exe = path.join(dir, id + '.exe');
      fs.writeFileSync(src, want[FILES[id].log]);
      const c = spawnSync('g++', ['-O2', '-Wall', '-Wextra', '-o', exe, src], { encoding: 'utf8' });
      check(`C++ ${id}: biên dịch được, không cảnh báo`, c.status === 0 && !c.stderr.trim(), c.stderr);
      if (c.status !== 0) continue;
      // bản chỉ in kết quả (dùng cho bộ testcase): in đúng phần "So mau…" cuối của bản log
      const srcR = path.join(dir, id + '_kq.cpp'), exeR = path.join(dir, id + '_kq.exe');
      fs.writeFileSync(srcR, want[FILES[id].res]);
      const cr = spawnSync('g++', ['-O2', '-Wall', '-Wextra', '-o', exeR, srcR], { encoding: 'utf8' });
      check(`C++ ${id} bản kết quả: biên dịch được, không cảnh báo`, cr.status === 0 && !cr.stderr.trim(), cr.stderr);
      let badR = 0;
      for (const g of graphs) {
        const input = `${g.n}\n` + g.edges.map(e => e.join(' ')).join('\n') + '\n';
        const full = spawnSync(exe, [], { input, encoding: 'utf8' }).stdout.replace(/\r\n/g, '\n');
        const res = spawnSync(exeR, [], { input, encoding: 'utf8' }).stdout.replace(/\r\n/g, '\n');
        if (!res.startsWith('So mau:') || full.slice(full.indexOf('So mau:')) !== res) badR++;
      }
      check(`C++ ${id} bản kết quả: in đúng kết quả cuối của bản log trên ${graphs.length} đồ thị`, badR === 0, `${badR} đồ thị lệch`);
      let bad = 0, badOut = 0;
      for (const g of graphs) {
        const input = `${g.n}\n` + g.edges.map(e => e.join(' ')).join('\n') + '\n';
        const out = spawnSync(exe, [], { input, encoding: 'utf8' }).stdout;
        const k = +(out.match(/So mau: (\d+)/) || [])[1];
        const cols = [...out.matchAll(/Dinh \d+: mau (-?\d+)/g)].map(m => m[1]).join();
        const r = S.ALGOS[id].run(g, null);
        if (k !== r.k || cols !== Array.from(r.colors).join()) bad++;
        for (const lang of ['pseudo', 'cpp']) {
          const t = S.trace(id, g, 1e6, lang);
          if (t.truncated || S.stdoutOf(t.steps) !== out.replace(/\r\n/g, '\n')) badOut++;
        }
      }
      check(`C++ ${id}: số màu và cách tô trùng solver trên ${graphs.length} đồ thị`, bad === 0, `${bad} đồ thị lệch`);
      check(`C++ ${id}: log trên web trùng TỪNG KÝ TỰ stdout của C++ trên ${graphs.length} đồ thị`, badOut === 0, `${badOut} đồ thị lệch`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('9) Trace từng dòng: dòng tô sáng hợp lệ, 2 ngôn ngữ cùng các sự kiện');
{
  const graphs = S.PRESETS.map(p => p.build());
  for (let seed = 1; seed <= 20; seed++) graphs.push(S.randomGraph(1 + seed % 12, [0.2, 0.4, 0.7][seed % 3], seed));
  const semantic = steps => steps.filter(s => !['line', 'done', 'init'].includes(s.type)).map(s => `${s.type}:${s.v}:${s.c}`).join();
  for (const id of Object.keys(S.ALGOS)) {
    const A = S.ALGOS[id], cpp = A.cpp(), code = A.code();
    let bad = 0, ex = '', badLine = 0, badSem = 0, badSeq = 0;
    for (const g of graphs) {
      const tp = S.trace(id, g, 1e6, 'pseudo'), tc = S.trace(id, g, 1e6, 'cpp');
      for (const [t, lines] of [[tp, code], [tc, cpp]]) {
        if (t.steps.some(s => !(s.line >= 0 && s.line < lines.length && lines[s.line].trim()))) badLine++;   // dòng có thật, không phải dòng trống
        if (t.steps.some((s, i) => i && s.seq <= t.steps[i - 1].seq)) badSeq++;
        if (t.steps.filter(s => s.type === 'done').length !== 1 || t.steps[t.steps.length - 1].type !== 'done') badSem++;
      }
      if (semantic(tp.steps) !== semantic(tc.steps)) badSem++;
      for (const s of tc.steps) {                       // bước có in → dòng C++ được tô là đúng lệnh cout in ra dòng đó
        if (s.out == null) continue;
        const head = s.out.split('\n')[0], words = head.match(/[A-Za-z]{2,}/g) || [], ln = cpp[s.line];
        if (s.out.includes('\n') || !ln.includes('cout') || !words.every(w => ln.includes(w))) { bad++; ex = ex || `${s.type} "${head}" ↔ ${ln.trim()}`; }
      }
    }
    check(`${id}: mọi bước tô 1 dòng code có thật (cả mã giả lẫn C++)`, badLine === 0, `${badLine} trace lệch`);
    check(`${id}: seq tăng dần (đổi ngôn ngữ giữ được vị trí)`, badSeq === 0, `${badSeq} trace lệch`);
    check(`${id}: mã giả và C++ cùng chuỗi sự kiện, đúng 1 bước kết thúc`, badSem === 0, `${badSem} đồ thị lệch`);
    check(`${id}: C++ — mỗi bước có in là 1 lệnh cout in đúng 1 dòng đó`, bad === 0, `${bad} bước lệch, vd ${ex}`);
  }
}

console.log(`\nKết quả: ${pass} đạt, ${fail} không đạt`);
process.exit(fail ? 1 : 0);
