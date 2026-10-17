/* =====================================================================
 * suite.js — chấm MỘT testcase: đưa input văn bản qua đúng đường đi của demo
 * (Solver.parseInput → greedy / backtrack → trace), rồi so với đáp án mong đợi.
 *
 * Dùng chung cho:
 *   - run_tests.js (Node, chạy cả bộ, ghi results.*)
 *   - trang web (nút "Chạy lại trên trình duyệt" ở phần Kiểm thử)
 * nên hai nơi chấm theo cùng một luật.
 *
 * Không phụ thuộc vào bộ giải ngoài các hàm công khai của Solver. Cận dưới ω(G)
 * và thuật toán kiểm chứng DSatur nhánh-cận ở đây được viết độc lập để không
 * "tự chấm bài của mình".
 * ===================================================================== */
const TestSuite = (() => {
  const BT_MAX_N = 90;          // giống demo: loadGraph / computeCompare chỉ chạy quay lui khi n ≤ 90
  const BT_BUDGET = 1e6;        // giống computeCompare
  const TRACE_MAX_N = 120;      // trace chỉ xem được trên giao diện khi n ≤ MAX_N
  const TRACE_LIMIT = 30000;    // giống computeTrace() của main.js: player xem được tối đa chừng ấy bước
  const CHECK_LIMIT = 3e5;      // trace dài tới mức này vẫn chấm đủ từng bước

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

  /* ---------- Chấm một testcase ----------
   * tc: { id, group, limit: 'web' | 'node', chi, src, err, errCount, warn }
   *   chi      χ mong đợi (null nếu không biết chính xác)
   *   err      chuỗi phải xuất hiện trong thông báo lỗi (testcase không hợp lệ)
   *   errCount số lỗi mong đợi (tuỳ chọn)
   *   warn     chuỗi phải xuất hiện trong cảnh báo (tuỳ chọn)
   */
  function runCase(S, tc, text, opts = {}) {
    const row = { id: tc.id, group: tc.group, status: 'Đạt', fails: [], notes: [] };
    const fail = m => { row.fails.push(m); row.status = 'Không đạt'; };
    const t0 = now();
    const pr = S.parseInput(text, { maxN: tc.limit === 'node' ? Infinity : undefined });
    row.parseMs = now() - t0;
    row.errors = pr.errors.length; row.warnings = pr.warnings.length;
    row.msg = (pr.errors[0] || pr.warnings[0] || '');

    if (tc.err) {                                   // ---- testcase không hợp lệ: phải bị bắt lỗi
      if (!pr.errors.length) fail('không báo lỗi');
      else if (!pr.errors.some(e => e.includes(tc.err))) fail(`lỗi khác mong đợi: ${pr.errors[0]}`);
      if (tc.errCount && pr.errors.length !== tc.errCount) fail(`báo ${pr.errors.length} lỗi, mong đợi ${tc.errCount}`);
      return row;
    }
    if (pr.errors.length) { fail(`không đọc được: ${pr.errors[0]}`); return row; }
    if (tc.warn && !pr.warnings.some(w => w.includes(tc.warn))) fail(`thiếu cảnh báo "${tc.warn}"`);

    const g = pr.graph;
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
    row.greedyK = gr.r.k; row.greedyMs = gr.ms;
    if (!S.isProper(g, gr.r.colors)) fail('tham lam: tô màu không hợp lệ');
    if (gr.r.k > row.ub) fail(`tham lam: ${gr.r.k} màu > Δ + 1 = ${row.ub}`);
    if (gr.r.k < row.lb) fail(`tham lam: ${gr.r.k} màu < cận dưới ${row.lb} (không thể)`);
    if (chi != null) row.greedyGap = gr.r.k - chi;

    // ---- quay lui (cùng giới hạn như giao diện)
    if (g.n > BT_MAX_N) { row.btStatus = 'bỏ qua'; row.notes.push(`quay lui chỉ chạy khi n ≤ ${BT_MAX_N}`); }
    else {
      const bt = timeIt(() => S.backtrack(g, null, { budget: BT_BUDGET }), opts.minMs, 50);
      row.btMs = bt.ms; row.btCalls = bt.r.calls; row.btBacktracks = bt.r.backtracks;
      if (bt.r.aborted) { row.btStatus = 'vượt ngân sách'; row.notes.push(`quay lui dừng sau ${BT_BUDGET.toLocaleString('en')} lời gọi`); }
      else {
        row.btStatus = 'xong'; row.btK = bt.r.k;
        if (!S.isProper(g, bt.r.colors)) fail('quay lui: tô màu không hợp lệ');
        if (chi != null && bt.r.k !== chi) fail(`quay lui: ${bt.r.k} màu ≠ χ = ${chi}`);
        if (bt.r.k < row.lb) fail(`quay lui: ${bt.r.k} màu < cận dưới ${row.lb}`);
        if (bt.r.k > gr.r.k) fail('quay lui: tệ hơn tham lam');
      }
    }

    // ---- trace từng bước (cái người dùng thấy trên giao diện) phải ra đúng kết quả.
    // Chấm trên trace đầy đủ (tới CHECK_LIMIT bước); giao diện chỉ hiện TRACE_LIMIT bước đầu → ghi chú riêng.
    if (g.n <= TRACE_MAX_N && opts.trace !== false) {
      const tr = [];
      for (const id of ['greedy', 'backtrack']) {
        if (id === 'backtrack' && row.btStatus !== 'xong') continue;
        const t = S.trace(id, g, CHECK_LIMIT);
        if (t.truncated) { tr.push(`trace ${id} dài hơn ${CHECK_LIMIT.toLocaleString('en')} bước, không chấm`); continue; }
        if (t.steps.length > TRACE_LIMIT) row.notes.push(`giao diện hiện ${TRACE_LIMIT} / ${t.steps.length.toLocaleString('en')} bước ${id === 'greedy' ? 'tham lam' : 'quay lui'}`);
        const last = t.steps[t.steps.length - 1];
        const want = id === 'greedy' ? gr.r.colors : null;
        let ok = last.type === 'done' && S.isProper(g, last.colors);
        if (ok && want) ok = sameColors(last.colors, want);
        if (ok && id === 'backtrack') ok = S.usedCount(last.colors) === row.btK;
        if (ok) for (const s of t.steps) if (!S.isPartialProper(g, s.colors)) { ok = false; break; }
        if (!ok) fail(`trace ${id} không khớp kết quả`);
        if (id === 'greedy') row.greedySteps = t.steps.length; else row.btSteps = t.steps.length;
      }
      row.trace = row.fails.some(f => f.startsWith('trace')) ? 'lệch' : tr.length ? 'cắt' : 'khớp';
      if (tr.length) row.notes.push(...tr);
    } else row.trace = '—';
    return row;
  }

  return { runCase, maxClique, dsaturChi, maxDegree, timeIt, BT_MAX_N, BT_BUDGET, TRACE_MAX_N };
})();

if (typeof window !== 'undefined') window.TestSuite = TestSuite;
if (typeof module !== 'undefined' && module.exports) module.exports = TestSuite;
