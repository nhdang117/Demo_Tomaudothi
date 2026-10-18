/* =====================================================================
 * suite.js — bộ kiểm chứng ĐỘC LẬP dùng khi sinh và chấm testcase (không phải bộ giải của demo):
 *   maxDegree   Δ(G) → cận trên Δ + 1 của số màu tham lam
 *   maxClique   ω(G) bằng Bron–Kerbosch có chốt → cận dưới của χ khi không biết χ
 *   dsaturChi   χ(G) bằng DSatur nhánh-cận (Brélaz 1979) → đáp án "kiem_chung" trong gen_tests.js
 * Bộ testcase chạy bằng code C++ (run_tests.js); các hàm ở đây chỉ đọc đồ thị { n, adj }
 * và được viết riêng để không "tự chấm bài của mình".
 * ===================================================================== */
const TestSuite = (() => {
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

  return { maxClique, dsaturChi, maxDegree };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = TestSuite;
