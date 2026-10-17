/* =====================================================================
 * suite.js — chấm MỘT testcase bằng bộ giải JS của demo: đưa input văn bản qua đúng đường đi
 * của trang (Solver.parseInput → tham lam / quay lui → trace), so với đáp án mong đợi,
 * và đo chi phí nạp testcase vào trang để quyết định có cho xem demo không.
 * Phần chạy code C++ nằm ở run_tests.js.
 *
 * Không phụ thuộc vào bộ giải ngoài các hàm công khai của Solver. Cận dưới ω(G)
 * và thuật toán kiểm chứng DSatur nhánh-cận ở đây được viết độc lập để không
 * "tự chấm bài của mình".
 * ===================================================================== */
const TestSuite = (() => {
  const CHECK_CELLS = 3e7;      // trace chấm tới (số bước × n) ô — mỗi bước chép mảng màu n phần tử
  const WEB_MAX_MS = 300;       // nạp vào trang (tính toán, đo bằng Node) quá ngưỡng này → không cho xem demo

  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();

  /* ---------- Thời gian: lặp đến khi đủ ≥ 20 ms (ít nhất 1 lần), lấy trung bình ---------- */
  function timeIt(fn, minMs = 20, maxReps = 200) {
    let r, reps = 0;
    const t0 = now();
    do { r = fn(); reps++; } while (now() - t0 < minMs && reps < maxReps);
    return { r, ms: (now() - t0) / reps, reps };
  }

  function maxDegree(g) { let d = 0; for (const a of g.adj) if (a.length > d) d = a.length; return d; }

  /* ---------- ω(G): Bron–Kerbosch có chốt, dừng theo số nút → cận dưới (exact nếu chạy hết) ---------- */
  function maxClique(g, nodeLimit = 3e5) {
    const { n, adj } = g;
    if (n === 0) return { size: 0, exact: true };
    const nb = adj.map(a => new Set(a));
    let best = 1, nodes = 0, cut = false;
    // khởi đầu bằng clique tham lam để có cận tốt ngay cả khi phải dừng sớm
    for (let s = 0; s < n; s++) {
      const C = [s];
      for (const v of [...adj[s]].sort((x, y) => adj[y].length - adj[x].length)) if (C.every(u => nb[u].has(v))) C.push(v);
      if (C.length > best) best = C.length;
    }
    function bk(size, P, X) {
      if (cut) return;
      if (++nodes > nodeLimit) { cut = true; return; }
      if (!P.length && !X.length) { if (size > best) best = size; return; }
      if (size + P.length <= best) return;
      let piv = -1, pc = -1;
      for (const u of P.concat(X)) { let c = 0; for (const v of P) if (nb[u].has(v)) c++; if (c > pc) { pc = c; piv = u; } }
      for (const v of P.filter(v => !nb[piv].has(v))) {
        bk(size + 1, P.filter(u => nb[v].has(u)), X.filter(u => nb[v].has(u)));
        P = P.filter(u => u !== v); X = X.concat(v);
        if (cut) return;
      }
    }
    bk(0, [...Array(n).keys()], []);
    return { size: best, exact: !cut };
  }

  /* ---------- χ(G) bằng DSatur nhánh-cận (Brélaz 1979) — bộ kiểm chứng độc lập ---------- */
  function dsaturChi(g, nodeLimit = 2e7) {
    const { n, adj } = g;
    if (n === 0) return { chi: 0, exact: true };
    const W = n + 1;
    const color = new Int32Array(n).fill(-1), cnt = new Int32Array(n * W), sat = new Int32Array(n);
    const lb = maxClique(g).size;
    let best = n + 1, bestCol = null, nodes = 0, cut = false;
    function pick() {
      let v = -1, vs = -1, vd = -1;
      for (let x = 0; x < n; x++) {
        if (color[x] >= 0) continue;
        if (sat[x] < vs) continue;
        let d = 0; for (const u of adj[x]) if (color[u] < 0) d++;
        if (sat[x] > vs || d > vd) { v = x; vs = sat[x]; vd = d; }
      }
      return v;
    }
    function put(v, c, s) {
      color[v] = s > 0 ? c : -1;
      for (const u of adj[v]) {
        const i = u * W + c;
        if (s > 0) { if (cnt[i]++ === 0) sat[u]++; } else if (--cnt[i] === 0) sat[u]--;
      }
    }
    function rec(done, used) {
      if (cut || used >= best) return;
      if (done === n) { best = used; bestCol = Int32Array.from(color); return; }
      if (++nodes > nodeLimit) { cut = true; return; }
      const v = pick();
      for (let c = 0; c <= used; c++) {
        if (c < used && cnt[v * W + c]) continue;
        if (Math.max(used, c + 1) >= best) break;
        put(v, c, 1);
        rec(done + 1, Math.max(used, c + 1));
        put(v, c, -1);
        if (cut || best <= lb) return;
      }
    }
    rec(0, 0);
    return { chi: best, exact: !cut, colors: bestCol, lb };
  }

  function sameColors(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }


  /* ---------- Trace: kiểm tra tăng dần, mỗi bước chỉ xét đỉnh vừa đổi màu ---------- */
  function checkSteps(g, steps) {
    const prev = new Int16Array(g.n).fill(-1);
    for (const s of steps) {
      const c = s.colors;
      for (let v = 0; v < g.n; v++) {
        if (c[v] === prev[v]) continue;
        prev[v] = c[v];
        if (c[v] < 0) continue;
        for (const u of g.adj[v]) if (c[u] === c[v]) return false;
      }
    }
    return true;
  }

  /* ---------- Chi phí nạp vào trang: lặp lại phần tính toán của main.js khi nạp một đồ thị ----------
   * loadGraph (quay lui tìm χ khi n ≤ BT_MAX_N), computeTrace (trace tham lam, mã giả, traceLimit(n)),
   * computeCompare (mỗi thuật toán chạy ≥ 1 lần + đếm bước trace). Không tính phần vẽ: bố cục stress chỉ
   * dùng khi n ≤ STRESS_MAX_N, bảng n² ô chỉ dựng khi n ≤ TABLE_MAX_N. */
  function webCost(S, g) {
    const U = S.UI, lim = U.traceLimit(g.n), t0 = now();
    if (g.n <= U.BT_MAX_N) S.backtrack(g, null, { budget: U.BT_LOAD_BUDGET }); else S.greedy(g, null);
    S.trace('greedy', g, lim, 'pseudo');
    for (const id of Object.keys(S.ALGOS)) {
      if (id === 'backtrack' && g.n > U.BT_MAX_N) continue;
      S.ALGOS[id].run(g, null, { budget: U.BT_CMP_BUDGET });
      S.trace(id, g, Math.min(6000, lim));
    }
    return now() - t0;
  }

  /* ---------- Chấm một testcase ----------
   * tc: { id, group, chi, err, errCount, warn }
   *   chi      χ mong đợi (null nếu không biết chính xác)
   *   err      chuỗi phải xuất hiện trong thông báo lỗi (testcase không hợp lệ)
   *   errCount số lỗi mong đợi (tuỳ chọn)
   *   warn     chuỗi phải xuất hiện trong cảnh báo (tuỳ chọn)
   */
  function runCase(S, tc, text, opts = {}) {
    const U = S.UI;
    const row = { id: tc.id, group: tc.group, status: 'Đạt', fails: [], notes: [] };
    const fail = m => { row.fails.push(m); row.status = 'Không đạt'; };
    const pr = S.parseInput(text);
    row.errors = pr.errors.length; row.warnings = pr.warnings.length;
    row.msg = (pr.errors[0] || pr.warnings.find(w => !w.startsWith('Đồ thị lớn') && !w.startsWith('n >')) || '');

    if (tc.err) {                                   // ---- testcase không hợp lệ: phải bị bắt lỗi
      if (!pr.errors.length) fail('không báo lỗi');
      else if (!pr.errors.some(e => e.includes(tc.err))) fail(`lỗi khác mong đợi: ${pr.errors[0]}`);
      if (tc.errCount && pr.errors.length !== tc.errCount) fail(`báo ${pr.errors.length} lỗi, mong đợi ${tc.errCount}`);
      row.demo = false; row.demoWhy = 'input lỗi: trang báo lỗi, không nạp';
      return row;
    }
    if (pr.errors.length) { fail(`không đọc được: ${pr.errors[0]}`); return row; }
    if (tc.warn && !pr.warnings.some(w => w.includes(tc.warn))) fail(`thiếu cảnh báo "${tc.warn}"`);

    const g = pr.graph;
    row.graph = g;
    row.n = g.n; row.m = g.edges.length;
    row.ub = maxDegree(g) + 1;                       // cận trên Δ + 1 (tham lam luôn đạt)
    const chi = tc.chi ?? null;
    if (chi == null) {                               // không biết χ → kẹp bằng ω(G)
      const cl = maxClique(g, opts.cliqueLimit ?? 3e5);
      row.lb = cl.size; row.lbExact = cl.exact;
    } else row.lb = chi;
    row.chi = chi;

    // ---- tham lam (bài giảng Buổi 10)
    const gr = timeIt(() => S.greedy(g, null), opts.minMs);
    row.greedyK = gr.r.k; row.greedyMs = gr.ms; row.greedyColors = gr.r.colors;
    if (!S.isProper(g, gr.r.colors)) fail('tham lam: tô màu không hợp lệ');
    if (gr.r.k > row.ub) fail(`tham lam: ${gr.r.k} màu > Δ + 1 = ${row.ub}`);
    if (gr.r.k < row.lb) fail(`tham lam: ${gr.r.k} màu < cận dưới ${row.lb} (không thể)`);
    if (chi != null) row.greedyGap = gr.r.k - chi;

    // ---- quay lui JS: cùng giới hạn như trang (n ≤ BT_MAX_N, ngân sách BT_CMP_BUDGET). n lớn hơn: chỉ chạy C++
    if (g.n > U.BT_MAX_N) row.btStatus = 'bỏ qua';
    else {
      const bt = timeIt(() => S.backtrack(g, null, { budget: U.BT_CMP_BUDGET }), opts.minMs, 50);
      row.btMs = bt.ms; row.btCalls = bt.r.calls;
      if (bt.r.aborted) row.btStatus = 'vượt ngân sách';
      else {
        row.btStatus = 'xong'; row.btK = bt.r.k; row.btColors = bt.r.colors;
        if (!S.isProper(g, bt.r.colors)) fail('quay lui: tô màu không hợp lệ');
        if (chi != null && bt.r.k !== chi) fail(`quay lui: ${bt.r.k} màu ≠ χ = ${chi}`);
        if (bt.r.k < row.lb) fail(`quay lui: ${bt.r.k} màu < cận dưới ${row.lb}`);
        if (bt.r.k > gr.r.k) fail('quay lui: tệ hơn tham lam');
      }
    }

    // ---- trace từng bước (cái người dùng xem trên trang) phải ra đúng kết quả.
    // Chấm tới CHECK_CELLS / n bước; dài hơn thì chấm phần đầu (không bước nào tô 2 đỉnh kề cùng màu).
    const lim = Math.max(2000, Math.floor(CHECK_CELLS / g.n)), cut = [];
    let bad = false;
    for (const id of ['greedy', 'backtrack']) {
      if (id === 'backtrack' && row.btStatus !== 'xong') continue;
      const t = S.trace(id, g, lim);
      if (!checkSteps(g, t.steps)) bad = true;
      if (t.truncated) { cut.push(id); continue; }
      const last = t.steps[t.steps.length - 1];
      if (last.type !== 'done' || !S.isProper(g, last.colors)) bad = true;
      if (id === 'greedy' && !sameColors(last.colors, gr.r.colors)) bad = true;
      if (id === 'backtrack' && S.usedCount(last.colors) !== row.btK) bad = true;
      if (id === 'greedy') row.greedySteps = t.steps.length; else row.btSteps = t.steps.length;
    }
    if (bad) fail('trace không khớp kết quả');
    row.trace = bad ? 'lệch' : cut.length ? 'cắt' : 'khớp';
    if (cut.length) row.notes.push(`trace ${cut.map(id => id === 'greedy' ? 'tham lam' : 'quay lui').join(', ')} dài hơn ${lim.toLocaleString('en')} bước: chỉ chấm phần đầu`);

    // ---- có cho xem demo không: đo phần tính toán khi nạp vào trang
    row.webMs = webCost(S, g);
    if (row.webMs > WEB_MAX_MS * 0.6) row.webMs = Math.min(row.webMs, webCost(S, g), webCost(S, g));   // sát ngưỡng: đo lại, bớt nhiễu
    row.demo = row.webMs <= WEB_MAX_MS;
    if (!row.demo) row.demoWhy = `nạp vào trang mất ≈ ${Math.round(row.webMs)} ms tính toán (ngưỡng ${WEB_MAX_MS} ms) — trang sẽ đứng`;
    else if (g.n > U.BT_MAX_N) row.demoWhy = `n > ${U.BT_MAX_N}: trang chỉ chạy tham lam`;
    return row;
  }

  return { runCase, webCost, checkSteps, maxClique, dsaturChi, maxDegree, timeIt, WEB_MAX_MS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = TestSuite;
