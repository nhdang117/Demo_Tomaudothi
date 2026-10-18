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

console.log('7) Đọc input (ma trận kề) & dữ liệu không hợp lệ');
{
  let r = S.parseInput('4\n0 1 0 1\n1 0 1 0\n0 1 0 1\n1 0 1 0');
  check('ma trận kề hợp lệ (C₄)', r.errors.length === 0 && r.graph.n === 4 && r.graph.edges.length === 4);
  r = S.parseInput('1\n0');
  check('n = 1: ma trận 1×1', r.errors.length === 0 && r.graph.n === 1 && r.graph.edges.length === 0);
  r = S.parseInput('4\r\n0\t1 0 1\r\n\r\n 1 0 1 0  \r\n0 1  0 1\r\n1 0 1 0\r\n\r\n');
  check('CRLF, tab, khoảng trắng thừa, dòng trống vẫn nhận (như cin)', r.errors.length === 0 && r.graph.edges.length === 4);
  r = S.parseInput('4\n0 1\n1 2\n2 3\n3 0');
  check('danh sách cạnh "u v" → lỗi, gợi ý đúng định dạng', r.errors.length === 4 && /cần đúng 4 số/.test(r.errors[0]) && /danh sách cạnh/.test(r.errors[0]));
  r = S.parseInput('3\n1 2\n0\n0');
  check('danh sách kề → lỗi số phần tử mỗi hàng', r.errors.length === 3 && r.errors.every(e => /cần đúng 3 số/.test(e)));
  r = S.parseInput('c DIMACS\np edge 3 3\ne 1 2\ne 2 3\ne 3 1');
  check('DIMACS → lỗi dòng đầu', r.errors.length === 1 && /dòng đầu/.test(r.errors[0]));
  r = S.parseInput('0 1\n1 0');
  check('quên dòng n → lỗi dòng đầu', r.errors.length === 1 && /dòng đầu/.test(r.errors[0]));
  r = S.parseInput('3   # n\n0 1 0\n1 0 0\n0 0 0');
  check('chú thích # ở dòng n → lỗi', r.errors.length === 1 && /#/.test(r.errors[0]));
  r = S.parseInput('3\n0 1 0  # a\n1 0 0\n0 0 0');
  check('chú thích # cuối hàng → đúng 1 lỗi', r.errors.length === 1 && /#/.test(r.errors[0]));
  r = S.parseInput('3\n0 1 0\n1 1 0\n0 0 0');
  check('khuyên (đường chéo = 1)', r.errors.length === 1 && /khuyên/.test(r.errors[0]) && /Dòng 3/.test(r.errors[0]));
  r = S.parseInput('3\n0 1 0\n0 0 1\n0 1 0');
  check('không đối xứng → lỗi, chỉ ra 2 dòng', r.errors.length === 1 && /đối xứng/.test(r.errors[0]) && /Dòng 2/.test(r.errors[0]) && /dòng 3/.test(r.errors[0]));
  r = S.parseInput('3\n0 2 0\n1 0 0\n0 0 0');
  check('giá trị khác 0/1', r.errors.length === 1 && /chỉ gồm 0 và 1/.test(r.errors[0]));
  r = S.parseInput('3\n0 x 0\n1 0 0\n0 0 0');
  check('token chữ', r.errors.length === 1 && /chỉ gồm 0 và 1/.test(r.errors[0]));
  r = S.parseInput('3\n0 1 0\n1 0 0');
  check('thiếu hàng', r.errors.length === 1 && /Thiếu hàng/.test(r.errors[0]));
  r = S.parseInput('2\n0 1\n1 0\n0 0');
  check('thừa hàng', r.errors.length === 1 && /thừa hàng/.test(r.errors[0]));
  r = S.parseInput('3\n0 1 0 0\n1 0 0\n0 0 0');
  check('hàng thừa số', r.errors.length === 1 && /có 4 số, cần đúng 3 số/.test(r.errors[0]));
  r = S.parseInput(`${S.MAX_N + 1}\n0`);
  check('n quá lớn (> MAX_N = MAXN − 5 của code C++)', r.errors.length === 1 && /quá lớn/.test(r.errors[0]));
  {
    const n = S.MAX_N, g = S.makeGraph(n, [[0, 1], [n - 2, n - 1]]);
    r = S.parseInput(S.toMatrixText(g));
    check('n = MAX_N vẫn nhận (ma trận 5000×5000)', r.errors.length === 0 && r.graph.n === n && r.graph.edges.length === 2);
  }
  r = S.parseInput('6\n0 0 0 0 0 0', { maxN: 5 });
  check('opts.maxN thu giới hạn', r.errors.length === 1 && /quá lớn/.test(r.errors[0]));
  check('MAXN trong code C++ = MAX_N + 5', Object.values(S.ALGOS).every(A => A.cpp().some(l => l.includes(`const int MAXN = ${S.MAX_N + 5};`))));
  check('code C++ đọc ma trận kề bằng 2 vòng for', Object.values(S.ALGOS).every(A => A.cpp().some(l => l.includes('cin >> x; a[u][v] = (x == \'1\');'))));
  r = S.parseInput('');
  check('rỗng', r.errors.length === 1);
  r = S.parseInput('abc');
  check('dòng đầu sai', r.errors.length === 1);
  r = S.parseInput('0\n');
  check('n = 0', r.errors.length === 1 && /≥ 1/.test(r.errors[0]));
  r = S.parseInput('3 2\n0 1 0\n1 0 0\n0 0 0');
  check('dòng đầu "n K" → lỗi', r.errors.length === 1 && /dòng đầu/.test(r.errors[0]));
  {
    const k = 60, rows = Array.from({ length: k }, (_, u) => Array.from({ length: k }, (_, v) => (u === 0 && v > 0 ? 1 : 0)).join(' '));
    r = S.parseInput(`${k}\n` + rows.join('\n'));
    check('quá nhiều lỗi → dừng sau 50 lỗi', r.errors.length === 51 && /dừng kiểm tra/.test(r.errors[50]));
  }
  const key = ([a, b]) => a < b ? `${a}-${b}` : `${b}-${a}`;
  for (const p of S.PRESETS) {
    const g0 = p.build();
    r = S.parseInput(S.toMatrixText(g0));
    check(`${p.id}: xuất ma trận kề rồi đọc lại ra đúng đồ thị`, r.errors.length === 0 && r.graph.n === g0.n &&
      r.graph.edges.map(key).sort().join() === g0.edges.map(key).sort().join());
  }
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
        const input = S.toMatrixText(g) + '\n';
        const full = spawnSync(exe, [], { input, encoding: 'utf8' }).stdout.replace(/\r\n/g, '\n');
        const res = spawnSync(exeR, [], { input, encoding: 'utf8' }).stdout.replace(/\r\n/g, '\n');
        if (!res.startsWith('So mau:') || full.slice(full.indexOf('So mau:')) !== res) badR++;
      }
      check(`C++ ${id} bản kết quả: in đúng kết quả cuối của bản log trên ${graphs.length} đồ thị`, badR === 0, `${badR} đồ thị lệch`);
      let bad = 0, badOut = 0;
      for (const g of graphs) {
        const input = S.toMatrixText(g) + '\n';
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

console.log('10) cpp/kiem_tra.cpp — kiểm tra input bằng C++, thông báo lỗi trùng từng ký tự với web');
{
  const { spawnSync } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
  if (spawnSync('g++', ['--version']).status !== 0) console.log('   (bỏ qua: máy không có g++)');
  else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-kt-')), exe = path.join(dir, 'kiem_tra.exe');
    fs.copyFileSync(path.join(__dirname, 'cpp', 'kiem_tra.cpp'), path.join(dir, 'kiem_tra.cpp'));
    const c = spawnSync('g++', ['-O2', '-Wall', '-Wextra', '-o', exe, path.join(dir, 'kiem_tra.cpp')], { encoding: 'utf8' });
    check('kiem_tra.cpp: biên dịch được, không cảnh báo', c.status === 0 && !c.stderr.trim(), c.stderr);
    if (c.status === 0) {
      const inputs = [
        '', '\n\n', 'abc', '0\n', '007\n0 0 0 0 0 0 0\n' + '0 0 0 0 0 0 0\n'.repeat(6), '-3\n0', '2.5\n0 1\n1 0', `${S.MAX_N + 1}\n0`, '99999999999999\n0',
        '3 2\n0 1 0\n1 0 0\n0 0 0', '0 1\n1 0', '# x\n3', '3   # n\n0 1 0', '3\n0 1 0  # a\n1 0 0\n0 0 0',
        '4\n0 1\n1 2\n2 3\n3 0', '3\n1 2\n0\n0', 'c DIMACS\np edge 3 3\ne 1 2', '3\n0 2 0\n1 0 0\n0 0 0', '3\n0 x 0\n1 0 0\n0 0 0',
        '3\n0 0.5 0\n1 0 0\n0 0 0', '3\n0 -1 0\n1 0 0\n0 0 0', '3\n0 1 0\n1 0 0', '2\n0 1\n1 0\n0 0', '3\n0 1 0 0\n1 0 0\n0 0 0',
        '3\n0 1 0\n1 1 0\n0 0 0', '3\n0 1 1\n1 0 0\n0 0 0', '4\r\n0\t1 0 1\r\n\r\n 1 0 1 0  \r\n0 1  0 1\r\n1 0 1 0\r\n\r\n',
        '1\n0', '1\n1', '2\n01\n10', '2\n0 1\n1 0 # z',
      ];
      for (const f of fs.readdirSync(path.join(__dirname, 'testcases', '06_khong_hop_le')))
        inputs.push(fs.readFileSync(path.join(__dirname, 'testcases', '06_khong_hop_le', f), 'utf8'));
      const R = S.mulberry32(2026);                  // ma trận ngẫu nhiên + một lỗi ngẫu nhiên
      for (let t = 0; t < 300; t++) {
        const g = S.randomGraph(1 + Math.floor(R() * 12), R(), 1 + t);
        const L = S.toMatrixText(g).split('\n'), n = g.n, u = 1 + Math.floor(R() * n), v = Math.floor(R() * n);
        const row = () => L[u].split(' ');
        switch (t % 10) {
          case 0: break;                                                       // hợp lệ
          case 1: { const x = row(); x[v] = x[v] === '1' ? '0' : '1'; L[u] = x.join(' '); break; }   // đối xứng / đường chéo
          case 2: { const x = row(); x[v] = ['2', 'x', '-1', '0.5', '00'][t % 5]; L[u] = x.join(' '); break; }
          case 3: { const x = row(); x.splice(v, 1); L[u] = x.join(' '); break; }
          case 4: L[u] += ' 0'; break;
          case 5: L.splice(u, 1); break;
          case 6: L.push(L[u]); break;
          case 7: L[u] += ' # chú thích'; break;
          case 8: L[u] = '\t ' + L[u].split(' ').join('  \t') + ' \r'; L.splice(u, 0, '', '  '); break;
          case 9: for (let a = 1; a <= n; a++) L[a] = L[a].split(' ').map(() => (R() < 0.5 ? '1' : '0')).join(' '); break;   // nhiều lỗi
        }
        inputs.push(L.join(t % 3 ? '\n' : '\r\n'));
      }
      {
        const k = 60;                                // > 50 lỗi: dừng đúng chỗ như web
        inputs.push(`${k}\n` + Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => (a === 0 && b > 0 ? 1 : 0)).join(' ')).join('\n'));
      }
      let bad = 0, ex = '';
      for (const text of inputs) {
        const p = spawnSync(exe, [], { input: text, encoding: 'utf8' });
        const got = p.stdout.replace(/\r\n/g, '\n').trimEnd();
        const r = S.parseInput(text);
        const want = r.errors.length ? r.errors.join('\n') : `Hop le: n = ${r.graph.n}, m = ${r.graph.edges.length}`;
        if (got !== want || p.status !== (r.errors.length ? 1 : 0)) { bad++; ex = ex || `${JSON.stringify(text.slice(0, 40))}\n     C++: ${got.split('\n')[0]}\n     web: ${want.split('\n')[0]}`; }
      }
      check(`kiem_tra.cpp: kết quả trùng web trên ${inputs.length} input`, bad === 0, `${bad} input lệch, vd ${ex}`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nKết quả: ${pass} đạt, ${fail} không đạt`);
process.exit(fail ? 1 : 0);
