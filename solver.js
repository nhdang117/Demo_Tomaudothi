/* =====================================================================
 * solver.js — Bộ giải bài toán Khoang chứa vật chất (tô màu đồ thị) + sinh TRACE
 *
 * Mỗi thuật toán chạy được ở 2 chế độ:
 *   - rec = null      : chạy thuần, dùng cho đo thời gian / kiểm thử
 *   - rec = Recorder  : ghi lại từng bước (dòng code, thao tác, trạng thái
 *                       màu sau bước đó, ghi chú) để giao diện phát lại.
 * Cùng một file chạy được trong trình duyệt và trong Node (test.js).
 * ===================================================================== */
const Solver = (() => {
  'use strict';

  const TRUNC = { reason: 'truncated' };
  const ABORT = { reason: 'budget' };

  /* ---------------- Trace recorder ----------------
   * Trace ghi theo TỪNG DÒNG CODE chạy qua. Thuật toán chạy đúng như code C++ và gọi
   * at(cl, ps, color, ev) mỗi khi một dòng chạy xong: cl / ps = chữ nhận diện dòng C++ /
   * dòng mã giả (null = ngôn ngữ đó không có dòng tương ứng). Recorder chỉ ghi các dòng
   * của ngôn ngữ đang xem (lang); phần in (out) của dòng bị bỏ dồn sang bước kế tiếp
   * được ghi, nên stdout ghép lại vẫn y hệt chương trình C++.
   * seq = số thứ tự lời gọi at(), giống nhau ở cả 2 ngôn ngữ → đổi ngôn ngữ giữ được vị trí. */
  class Recorder {
    constructor(limit = 6000, lang = 'pseudo', code = null) {
      this.steps = [];
      this.limit = limit;
      this.truncated = false;
      this.lang = lang;
      this.code = code;
      this.seq = 0;
      this.pend = null;
      this.extra = null;
    }
    at(cl, ps, color, ev) {
      ev.seq = this.seq++;
      const key = this.lang === 'cpp' ? cl : ps;
      if (key == null) {
        if (ev.out != null) this.pend = this.pend == null ? ev.out : this.pend + '\n' + ev.out;
        return;
      }
      ev.line = lineOf(this.code[this.lang], key);
      if (!ev.type) ev.type = 'line';
      if (this.pend != null) { ev.out = ev.out == null ? this.pend : this.pend + '\n' + ev.out; this.pend = null; }
      this.push(color, ev);
    }
    finish() {
      const last = this.steps[this.steps.length - 1];
      if (this.pend != null && last) last.out = last.out == null ? this.pend : last.out + '\n' + this.pend;
      this.pend = null;
    }
    push(color, ev) {
      if (this.steps.length >= this.limit) { this.truncated = true; throw TRUNC; }
      ev.colors = Int16Array.from(color);
      ev.used = usedCount(color);
      if (this.extra) this.extra(ev);
      this.steps.push(ev);
    }
  }

  /** Chỉ số dòng trong code: ưu tiên dòng trùng khớp nguyên văn, không có thì dòng chứa key. Phải khớp đúng 1 dòng. */
  const LINE_CACHE = new WeakMap();
  function lineOf(lines, key) {
    let m = LINE_CACHE.get(lines);
    if (!m) LINE_CACHE.set(lines, m = new Map());
    let j = m.get(key);
    if (j == null) {
      const exact = lines.includes(key), hits = [];
      lines.forEach((t, i) => { if (exact ? t === key : t.includes(key)) hits.push(i); });
      if (hits.length !== 1) throw new Error(`lineOf: "${key}" khớp ${hits.length} dòng`);
      m.set(key, j = hits[0]);
    }
    return j;
  }

  function adjMatrix(g) {
    const A = new Uint8Array(g.n * g.n);
    for (const [u, v] of g.edges) A[u * g.n + v] = A[v * g.n + u] = 1;
    return A;
  }

  /** trungMau(v, c) của C++, chạy từng dòng: duyệt mọi u, trả về đỉnh kề đầu tiên mang màu c (−1 nếu không có). */
  function trungMauLines(E, A, n, mau, v, c, base) {
    for (let u = 0; u < n; u++) {
      E('    for (int u = 0; u < n; u++)', null, { ...base, c, title: `trungMau(${v}, ${c})`, note: `Xét u = ${u}.` });
      const ke = A[v * n + u] === 1, hit = ke && mau[u] === c;
      E('if (a[v][u] == 1 && mau[u] == c) return true;', null, { ...base, c, cu: u, u: ke ? u : undefined, title: `trungMau(${v}, ${c})`,
        note: !ke ? `a[${v}][${u}] = 0: đỉnh ${u} không kề ${v}.`
          : hit ? `a[${v}][${u}] = 1 và mau[${u}] = ${c} → return true.`
          : `a[${v}][${u}] = 1 nhưng mau[${u}] = ${mau[u]}${mau[u] < 0 ? ' (chưa tô)' : ''} ≠ ${c}.` });
      if (hit) return u;
    }
    E('return false;', null, { ...base, c, title: `trungMau(${v}, ${c})`, note: `Không đỉnh kề nào của ${v} mang màu ${c} → return false.` });
    return -1;
  }

  /* ---------------- Graph helpers ---------------- */
  function makeGraph(n, edges, meta = {}) {
    const adj = Array.from({ length: n }, () => []);
    for (const [u, v] of edges) { adj[u].push(v); adj[v].push(u); }
    for (const a of adj) a.sort((x, y) => x - y);
    return Object.assign({ n, edges, adj }, meta);
  }

  function usedCount(color) {
    let m = -1;
    for (let i = 0; i < color.length; i++) if (color[i] > m) m = color[i];
    return m + 1;
  }

  function setStr(arr) {
    if (!arr || arr.length === 0) return '∅';
    return '{' + [...arr].sort((a, b) => a - b).join(', ') + '}';
  }

  function sortedArr(set) { return [...set].sort((a, b) => a - b); }

  function fmtOrder(order) {
    if (order.length <= 14) return order.join(' → ');
    return order.slice(0, 12).join(' → ') + ' → … (' + order.length + ' đỉnh)';
  }

  /** Phép tô màu có hợp lệ & đầy đủ không? */
  function isProper(g, colors) {
    for (let v = 0; v < g.n; v++) if (colors[v] < 0) return false;
    for (const [u, v] of g.edges) if (colors[u] === colors[v]) return false;
    return true;
  }

  /** Tô màu (có thể chưa đầy đủ) có vi phạm cạnh nào không? */
  function isPartialProper(g, colors) {
    for (const [u, v] of g.edges) if (colors[u] >= 0 && colors[u] === colors[v]) return false;
    return true;
  }

  /* =================================================================
   * 1) THAM LAM theo bài giảng Buổi 10 (Tô màu bản đồ, slide 18)
   *    Chọn đỉnh: bậc cao nhất trong BẢNG BẬC, hòa thì chỉ số nhỏ nhất.
   *    Chọn màu : thử lần lượt các màu đã dùng; hết màu cũ mới sinh màu mới.
   *    Cập nhật : đỉnh vừa tô gán bậc −1, mỗi đỉnh kề chưa tô giảm bậc 1
   *               → bậc trong bảng luôn = số đỉnh kề CHƯA tô.
   *    Mã giả theo mô hình GREEDY(P, n) của GV (slide 14): SELECT chọn đỉnh,
   *    P = P − {v} là gán bậc −1, mỗi vòng ghi nhận đúng 1 thành phần S_i.
   *    Độ phức tạp (ma trận kề, chỉ theo n): O(n³) — vòng i thử ≤ i − 1 màu,
   *    mỗi lần trungMau quét một hàng O(n); đồ thị đầy đủ K_n đạt cận này.
   * ================================================================= */
  const GREEDY_CODE = () => [
    '// a: ma trận kề, a[u][v] = 1 <=> u kề v',
    '// trungMau(v, c): có đỉnh kề v mang màu c?',
    '// S_i = đỉnh thứ i được chọn để tô',
    '// bac[v]: số đỉnh kề chưa tô; -1 = đã tô',
    '// mau[v]: màu của v; -1 = chưa tô',
    '// soMau: số màu đã dùng (màu 0..soMau-1)',
    '',
    'thamLam()',
    '{',
    '  bac[v] = số đỉnh kề của v, với mọi v',
    '  mau[v] = -1 với mọi v;  soMau = 0',
    '  for (i = 1 -> n)  // mỗi vòng tô đúng 1 đỉnh',
    '  {',
    '    v = đỉnh có bac lớn nhất  // SELECT',
    '    // (hòa bậc → lấy chỉ số nhỏ nhất)',
    '    for (c = 0 -> soMau - 1)  // thử lần lượt các màu đã dùng',
    '      if (not trungMau(v, c))  // màu c không trùng đỉnh kề',
    '        break  // → dùng màu c',
    '    if (c == soMau)  // for chạy hết: mọi màu cũ đều trùng',
    '      soMau = soMau + 1  // → sinh màu mới',
    '    mau[v] = c  // S_i = v, tô màu c',
    '    bac[v] = -1  // P = P − {v}: không chọn lại',
    '    for (u kề v)  // hạ bậc đỉnh kề chưa tô',
    '      if (bac[u] >= 0) bac[u] = bac[u] - 1',
    '  }',
    '}',
    '',
    'main()',
    '{',
    '  đọc G: n đỉnh, ma trận kề a',
    '  thamLam()',
    '  xuất soMau, mau',
    '}',
  ];

  /** Phần cuối stdout của cả 2 chương trình C++: số màu + màu từng đỉnh. */
  function outKetQua(k, colors) {
    return [`So mau: ${k}`, ...Array.from(colors, (c, v) => `Dinh ${v}: mau ${c}`)].join('\n');
  }

  /** Ghép các dòng out của trace thành đúng stdout của chương trình C++. */
  function stdoutOf(steps) {
    return steps.filter(st => st.out != null).map(st => st.out).join('\n') + '\n';
  }

  function fmtList(arr, max = 8) {
    return arr.length <= max ? arr.join(', ') : arr.slice(0, max).join(', ') + ` … (${arr.length} đỉnh)`;
  }

  function greedy(g, rec) {
    if (rec) return greedyLines(g, rec);
    const { n, adj } = g;
    const deg = Int16Array.from(adj, a => a.length);
    const color = new Int16Array(n).fill(-1);
    let used = 0;
    for (let step = 0; step < n; step++) {
      let v = -1;
      for (let x = 0; x < n; x++) if (deg[x] >= 0 && (v < 0 || deg[x] > deg[v])) v = x;
      let c = 0;
      while (c < used && adj[v].some(u => color[u] === c)) c++;
      if (c === used) used++;
      color[v] = c;
      deg[v] = -1;
      for (const u of adj[v]) if (deg[u] >= 0) deg[u]--;
    }
    return { colors: color, k: usedCount(color) };
  }

  /** Tham lam chạy đúng từng dòng của GREEDY_CPP (kèm dòng mã giả tương ứng) để ghi trace. */
  function greedyLines(g, rec) {
    const { n, adj } = g, A = adjMatrix(g);
    const bac = new Int16Array(n), mau = new Int16Array(n).fill(-1);
    let soMau = 0;
    // mỗi bước lưu kèm ảnh chụp bảng bậc để giao diện hiện giống bảng cô chạy tay
    rec.extra = ev => { ev.degs = Int16Array.from(bac); };
    const E = (cl, ps, ev) => rec.at(cl, ps, mau, ev);
    try {
      E('cin >> n;', null, { title: 'Đọc dữ liệu', note: `Đọc số đỉnh n = ${n}.` });
      E('cin >> x; a[u][v]', 'đọc G: n đỉnh', { title: 'Đọc dữ liệu',
        note: `Đọc ma trận kề ${n}×${n}: hàng u, cột v là a[u][v] (1 = u kề v, 0 = không) → đồ thị có ${g.edges.length} cạnh.` });
      E('thamLam();', '  thamLam()', { title: 'Gọi thamLam()', note: 'Gọi hàm tham lam.' });
      for (let v = 0; v < n; v++) {
        E('// bac[v] = số đỉnh kề của v', null, { v, title: 'Lập bảng bậc', note: `Xét đỉnh v = ${v}.` });
        E('bac[v] = 0;', null, { v, title: 'Lập bảng bậc', note: `bac[${v}] = 0.` });
        bac[v] = adj[v].length;
        E('bac[v] += a[v][u]', null, { v, title: 'Lập bảng bậc', note: `Cộng dòng ${v} của ma trận kề: bac[${v}] = ${bac[v]}.` });
        E('mau[v] = -1;', null, { v, title: 'Lập bảng bậc', note: `mau[${v}] = -1: đỉnh ${v} chưa tô.` });
      }
      E(null, 'bac[v] = số đỉnh kề của v', { type: 'init', title: 'Lập bảng bậc',
        note: 'Bảng bậc ban đầu = số đỉnh kề của mỗi đỉnh. Chưa tô đỉnh nào, chưa dùng màu nào.' });
      E('soMau = 0;', 'mau[v] = -1 với mọi v', { title: 'Khởi tạo', note: 'Mọi đỉnh chưa tô (mau = -1), chưa dùng màu nào: soMau = 0.' });
      for (let i = 1; i <= n; i++) {
        E('for (int i = 1; i <= n; i++)', 'for (i = 1 -> n)', { type: 'round', title: `Vòng ${i}`, note: `Vòng i = ${i}: tô thêm đúng 1 đỉnh.` });
        let v = 0;
        E('// SELECT', null, { v, deg: bac[v], title: 'Chọn đỉnh', note: `Tạm lấy v = 0 (bac[0] = ${bac[0]}), rồi so với các đỉnh sau.` });
        for (let x = 1; x < n; x++) {
          E('for (int x = 1; x < n; x++)', null, { v, deg: bac[v], title: 'Chọn đỉnh', note: `Xét x = ${x}.` });
          const win = bac[x] > bac[v], was = v;
          if (win) v = x;
          E('if (bac[x] > bac[v]) v = x;', null, { v, deg: bac[v], cu: x, title: 'Chọn đỉnh',
            note: `bac[${x}] = ${bac[x]} ${win ? '>' : '≤'} bac[${was}] = ${bac[was]} → ${win ? `v = ${x}` : `giữ v = ${was}`}.` });
        }
        const d = bac[v], ties = [];
        for (let x = 0; x < n; x++) if (bac[x] === d) ties.push(x);
        E('cout << "Lan "', 'v = đỉnh có bac lớn nhất', { type: 'select', out: `Lan ${i}: v=${v} bac=${d}`, v, deg: d, ties, title: 'Chọn đỉnh',
          note: ties.length > 1
            ? `Bậc cao nhất là ${d}, có ${ties.length} đỉnh cùng bậc: ${fmtList(ties)} → lấy chỉ số nhỏ nhất: đỉnh ${v}.`
            : `Đỉnh ${v} có bậc cao nhất trong bảng (${d}).` });
        const base = { v, deg: d };
        let c = 0;
        for (;; c++) {
          const more = c < soMau;
          E('for (c = 0; c < soMau; c++)', 'for (c = 0 -> soMau - 1)', { type: 'try', ...base, c: more ? c : null,
            title: more ? (c ? 'Thử màu kế tiếp' : 'Thử màu đã dùng') : soMau ? 'Hết màu cũ' : 'Chưa có màu',
            note: more ? `c = ${c} < soMau = ${soMau} → thử màu ${c}.`
              : soMau ? `c = ${c} = soMau → đã thử hết ${soMau} màu cũ, thoát for.` : 'soMau = 0: chưa dùng màu nào, for không chạy lần nào.' });
          if (!more) break;
          E('if (!trungMau(v, c)) {', null, { ...base, c, title: 'Gọi trungMau', note: `Gọi trungMau(${v}, ${c}): có đỉnh kề ${v} mang màu ${c} không?` });
          const u = trungMauLines(E, A, n, mau, v, c, base);
          if (u >= 0) {
            E('" trung', 'if (not trungMau(v, c))', { type: 'conflict', out: `  c=${c} trung`, ...base, u, c, title: 'Trùng màu',
              note: `Đỉnh kề ${u} đã tô màu ${c} → không dùng được màu ${c}, thử màu sau.` });
          } else {
            E('" khong trung', 'if (not trungMau(v, c))', { type: 'ok', out: `  c=${c} khong trung`, ...base, c, title: 'Dùng lại màu cũ',
              note: `Không đỉnh kề nào mang màu ${c} → dùng lại màu ${c}.` });
            E('break;', 'break  // → dùng màu c', { ...base, c, title: 'Dùng lại màu cũ', note: `Thoát for, giữ c = ${c}.` });
            break;
          }
        }
        const isNew = c === soMau;
        E('if (c == soMau) {', 'if (c == soMau)', { ...base, c, title: isNew ? 'Cần màu mới' : 'Dùng lại màu cũ',
          note: isNew ? `c = soMau = ${soMau}: không màu cũ nào dùng được → mở màu mới.` : `c = ${c} < soMau = ${soMau}: không cần màu mới.` });
        if (isNew) {
          soMau++;
          E('soMau++;', null, { ...base, c, title: 'Sinh màu mới', note: `soMau = ${soMau}.` });
          E('"  mau moi "', 'soMau = soMau + 1', { type: 'newcolor', out: `  mau moi ${c}`, ...base, c, title: 'Sinh màu mới',
            note: c === 0 ? 'Chưa có màu nào → sinh màu 0.' : `Cả ${c} màu cũ đều trùng với đỉnh kề → sinh màu mới ${c}.` });
        }
        mau[v] = c;
        E('mau[v] = c;', null, { ...base, c, title: 'Tô màu', note: `mau[${v}] = ${c}.` });
        E('cout << "  mau["', 'mau[v] = c', { type: 'assign', out: `  mau[${v}]=${c}`, ...base, c, title: 'Tô màu',
          note: `Tô đỉnh ${v} màu ${c} → xếp vào ngăn ${c + 1}.` });
        bac[v] = -1;
        E('bac[v] = -1;', null, { ...base, c, title: 'Đánh dấu đã tô', note: `bac[${v}] = -1.` });
        E('" da to: bac=-1', 'bac[v] = -1', { type: 'mark', out: `  dinh ${v} da to: bac=-1`, ...base, c, title: 'Đánh dấu đã tô',
          note: `Gán bậc của đỉnh ${v} = −1 để không bị chọn lại.` });
        for (let u = 0; u < n; u++) {
          E('// hạ bậc', null, { ...base, c, title: 'Hạ bậc đỉnh kề', note: `Xét u = ${u}.` });
          const ke = A[v * n + u] === 1, ok = ke && bac[u] >= 0;
          E('if (a[v][u] == 1 && bac[u] >= 0) {', ke ? 'for (u kề v)' : null, { ...base, c, cu: u, title: 'Hạ bậc đỉnh kề',
            note: !ke ? `a[${v}][${u}] = 0: đỉnh ${u} không kề ${v}.`
              : ok ? `Đỉnh ${u} kề ${v} và chưa tô (bac[${u}] = ${bac[u]}) → hạ bậc.` : `Đỉnh ${u} kề ${v} nhưng đã tô (bac[${u}] = −1) → bỏ qua.` });
          if (ok) {
            bac[u]--;
            E('bac[u]--;', null, { ...base, c, cu: u, title: 'Hạ bậc đỉnh kề', note: `bac[${u}]: ${bac[u] + 1} → ${bac[u]}.` });
            E('cout << "  bac["', 'if (bac[u] >= 0)', { type: 'dec', out: `  bac[${u}]: ${bac[u] + 1}->${bac[u]}`, ...base, c, us: [u], title: 'Hạ bậc đỉnh kề',
              note: `Đỉnh kề ${u} chưa tô → giảm bậc ${bac[u] + 1} → ${bac[u]}.` });
          } else if (ke) E(null, 'if (bac[u] >= 0)', { ...base, c, cu: u, title: 'Hạ bậc đỉnh kề', note: `Đỉnh kề ${u} đã tô (bac = −1) → bỏ qua.` });
        }
      }
      E('cout << "So mau', null, { out: `So mau: ${soMau}`, title: 'Xuất kết quả', note: `In số màu đã dùng: ${soMau}.` });
      for (let v = 0; v < n; v++) {
        E('    for (int v = 0; v < n; v++)', null, { v, title: 'Xuất kết quả', note: `Xét v = ${v}.` });
        E('cout << "Dinh "', null, { v, out: `Dinh ${v}: mau ${mau[v]}`, title: 'Xuất kết quả', note: `In màu của đỉnh ${v}: ${mau[v]} (ngăn ${mau[v] + 1}).` });
      }
      const fin = { type: 'done', title: 'Hoàn tất', note: `Đã tô ${n} đỉnh, dùng ${soMau} màu.` };
      E(null, 'xuất soMau, mau', { ...fin });
      E('return 0;', null, { ...fin });
      rec.finish();
    } catch (e) { if (e !== TRUNC) throw e; }
    return { colors: mau, k: usedCount(mau) };
  }

  /* =================================================================
   * 2) QUAY LUI tìm sắc số χ(G) — theo mô hình try(i) của GV (Buổi 6–7),
   *    kiểu bài tối ưu "cây khung tối tiểu": vét cạn, giữ LG tốt nhất
   *    hiện hành (soMauMin, Smin), gặp LG hoàn chỉnh thì cập nhật.
   *    Bước i tô đỉnh thuTu[i] (đỉnh xếp theo bậc giảm dần), for chạy tối đa
   *    n màu, loại bằng if:
   *      - c <= soMau              : không vượt số màu (màu mới chỉ thử 1 màu: màu soMau)
   *      - soMauMoi < soMauMin     : cắt tỉa, soMauMoi = max(soMau, c + 1)
   *      - not trungMau(v, c)      : ràng buộc của bài toán
   *    Hai điều kiện đầu đơn điệu theo c: sai ở c thì sai với mọi c lớn
   *    hơn, nên bản cài đặt dừng vòng for ngay (kết quả như for chạy hết).
   *    Không có cận dưới cho χ nên không thoát sớm được: phải vét hết
   *    cây mới khẳng định kmin là ít nhất.
   *    Độ phức tạp xấu nhất: bước i có ≤ i lựa chọn (c <= soMau) nên ≤ 2·(n−1)!
   *    lời gọi, mỗi lời gọi O(n²) → O(n·n!) — hàm mũ (NP-khó).
   * ================================================================= */
  const BT_CODE = () => [
    '// a: ma trận kề, a[u][v] = 1 <=> u kề v',
    '// trungMau(v, c): có đỉnh kề v mang màu c?',
    '// S_i = màu của đỉnh thuTu[i]',
    '// thuTu[1..n]: các đỉnh theo bậc giảm dần',
    '// mau[v]: màu của v; -1 = chưa tô',
    '// soMau: số màu đã dùng (màu 0..soMau-1)',
    '// soMauMin, Smin: LG tốt nhất hiện hành',
    '',
    'quayLui(i, soMau)  // bước i: màu S_i cho thuTu[i]',
    '{',
    '  v = thuTu[i]',
    '  for (c = 0 -> n-1)  // tối đa n lựa chọn',
    '  {',
    '    soMauMoi = max(soMau, c + 1)  // số màu nếu tô c',
    '    if (c <= soMau  // không vượt số màu',
    '        and soMauMoi < soMauMin  // cắt tỉa',
    '        and not trungMau(v, c))  // khác màu kề',
    '    {',
    '      mau[v] = c  // ghi nhận S_i = c',
    '      if (i == n)  // đủ n đỉnh: LG hoàn chỉnh',
    '      {',
    '        soMauMin = soMauMoi',
    '        Smin = mau  // lưu bản sao',
    '      }',
    '      else',
    '        quayLui(i + 1, soMauMoi)',
    '      mau[v] = -1  // trả lại trạng thái cũ',
    '    }',
    '  }',
    '}',
    '',
    'main()',
    '{',
    '  đọc G: n đỉnh, ma trận kề a',
    '  thuTu[1..n] = các đỉnh theo bậc giảm dần',
    '  mau[v] = -1 với mọi v;  soMauMin = n + 1',
    '  quayLui(1, 0)',
    '  xuất soMauMin, Smin',
    '}',
  ];

  function backtrack(g, rec, opts = {}) {
    if (rec) return backtrackLines(g, rec);
    const { n, adj } = g;
    const deg = adj.map(a => a.length);
    const order = [...Array(n).keys()].sort((a, b) => deg[b] - deg[a] || a - b);
    const color = new Int16Array(n).fill(-1), smin = new Int16Array(n).fill(-1);
    const budget = opts.budget ?? 5e6;
    let calls = 0, bts = 0, aborted = false, kmin = n + 1;

    // i: bước giải (0-based trong code, hiển thị i + 1 cho khớp mã giả)
    function quayLui(i, used) {
      if (++calls > budget) throw ABORT;
      const v = order[i];
      for (let c = 0; c < n; c++) {
        if (c > used) break;                              // c <= used sai → mọi c sau cũng sai
        if (Math.max(used, c + 1) >= kmin) break;         // cắt tỉa: tăng dần theo c
        if (adj[v].some(u => color[u] === c)) continue;
        color[v] = c;
        if (i === n - 1) {
          kmin = Math.max(used, c + 1);
          smin.set(color);
        } else {
          quayLui(i + 1, Math.max(used, c + 1));
        }
        color[v] = -1;
        bts++;
      }
    }

    try {
      quayLui(0, 0);
    } catch (e) {
      if (e === ABORT) aborted = true;
      else throw e;
    }
    return { colors: smin, k: aborted ? -1 : kmin, aborted, calls, backtracks: bts };
  }

  /** Quay lui chạy đúng từng dòng của BT_CPP (kèm dòng mã giả tương ứng) để ghi trace. */
  function backtrackLines(g, rec) {
    const { n, adj } = g, A = adjMatrix(g);
    const deg = adj.map(a => a.length);
    const mau = new Int16Array(n).fill(-1), smin = new Int16Array(n).fill(-1), thuTu = [];
    let calls = 0, bts = 0, kmin = n + 1;
    rec.extra = ev => { ev.kmin = kmin; ev.backtracks = bts; };
    const E = (cl, ps, ev, col = mau) => rec.at(cl, ps, col, ev);

    // i: bước giải (0-based trong code, hiển thị i + 1 cho khớp mã giả)
    function quayLui(i, used) {
      calls++;
      const v = thuTu[i], ind = '  '.repeat(i), base = { v, depth: i, deg: deg[v] };   // ind: thutLe(i) của C++
      const title = `Bước ${i + 1}`;
      E('int v = thuTu[i];', null, { ...base, title, note: `v = thuTu[${i + 1}] = ${v}.` });
      E('cout << "B"', 'quayLui(i, soMau)', { type: 'select', out: `${ind}B${i + 1}: v=${v} soMau=${used}`, ...base, title,
        note: `Tìm màu cho đỉnh thuTu[${i + 1}] = ${v} (bậc ${deg[v]}). Đã dùng ${used} màu, soMauMin = ${kmin}${kmin > n ? ' (chưa có lời giải)' : ''}.` });
      E(null, 'v = thuTu[i]', { ...base, title, note: `v = thuTu[${i + 1}] = ${v}.` });
      for (let c = 0; ; c++) {
        if (c >= n) {
          E('for (int c = 0; c < n; c++)', null, { ...base, title: 'Hết lựa chọn', note: `c = n = ${n}: đã thử đủ n màu, thoát for.` });
          break;
        }
        E('for (int c = 0; c < n; c++)', 'for (c = 0 -> n-1)', { type: 'try', ...base, c, title: 'Thử màu', note: `Thử màu c = ${c} cho đỉnh ${v}.` });
        const moi = Math.max(used, c + 1);
        E(null, 'soMauMoi = max(soMau, c + 1)', { ...base, c, title: 'Thử màu', note: `soMauMoi = max(${used}, ${c + 1}) = ${moi}: số màu nếu tô màu ${c}.` });
        if (c > used) {                                   // c <= used sai → mọi c sau cũng sai
          E('if (c > soMau) {', null, { ...base, c, title: 'Vượt số màu', note: `c = ${c} > soMau = ${used}.` });
          E('" vuot soMau', 'if (c <= soMau', { type: 'sym', out: `${ind}  c=${c} vuot soMau`, ...base, c, title: 'Vượt số màu',
            note: `Màu ${c} > soMau = ${used}: vượt số màu. Màu mới chỉ cần thử 1 màu (màu ${used}, đã thử); màu ${c} trở đi chỉ là đổi tên màu đó → bỏ màu ${c}..${n - 1}.` });
          E('// → dừng', null, { ...base, c, title: 'Vượt số màu', note: 'break: các màu sau cũng vượt số màu.' });
          break;
        }
        E('if (c > soMau) {', 'if (c <= soMau', { ...base, c, title: 'Thử màu', note: `c = ${c} ≤ soMau = ${used}: không vượt số màu.` });
        E('int soMauMoi', null, { ...base, c, title: 'Thử màu', note: `soMauMoi = ${moi}${c === used ? ' (c = soMau: mở màu mới)' : ''}.` });
        if (moi >= kmin) {                                // cắt tỉa: tăng dần theo c
          E('if (soMauMoi >= soMauMin) {', null, { ...base, c, title: 'Cắt tỉa', note: `soMauMoi = ${moi} ≥ soMauMin = ${kmin}.` });
          E('" cat tia', 'and soMauMoi < soMauMin', { type: 'prune', out: `${ind}  c=${c} cat tia`, ...base, c, title: 'Cắt tỉa',
            note: `Dùng màu ${c} thì đã cần ${moi} màu ≥ soMauMin = ${kmin} → không thể tốt hơn lời giải đang có, bỏ màu ${c}..${n - 1}.` });
          E('            break;', null, { ...base, c, title: 'Cắt tỉa', note: 'break: màu sau càng cần nhiều màu hơn.' });
          break;
        }
        E('if (soMauMoi >= soMauMin) {', 'and soMauMoi < soMauMin', { ...base, c, title: 'Thử màu', note: `soMauMoi = ${moi} < soMauMin = ${kmin}: còn có thể tốt hơn.` });
        E('if (trungMau(v, c)) {', null, { ...base, c, title: 'Gọi trungMau', note: `Gọi trungMau(${v}, ${c}): có đỉnh kề ${v} mang màu ${c} không?` });
        const u = trungMauLines(E, A, n, mau, v, c, base);
        if (u >= 0) {
          E('" trung', 'and not trungMau(v, c))', { type: 'conflict', out: `${ind}  c=${c} trung`, ...base, u, c, title: 'Trùng màu',
            note: `Đỉnh kề ${u} đang mang màu ${c} → loại màu ${c}.` });
          E('continue;', null, { ...base, c, title: 'Trùng màu', note: 'continue: thử màu kế tiếp.' });
          continue;
        }
        E(null, 'and not trungMau(v, c))', { ...base, c, title: 'Thử màu', note: `Không đỉnh kề nào mang màu ${c}.` });
        mau[v] = c;
        E('mau[v] = c;', null, { ...base, c, title: 'Ghi nhận', note: `mau[${v}] = ${c}.` });
        E('cout << "  mau["', 'mau[v] = c', { type: 'assign', out: `${ind}  mau[${v}]=${c}`, ...base, c, title: 'Ghi nhận',
          note: `Màu ${c} hợp lệ → S_${i + 1} = ${c}, tô đỉnh ${v}.` });
        if (i === n - 1) {
          E('if (i == n) {', 'if (i == n)', { ...base, c, title: 'Lời giải tốt hơn', note: `i = n = ${n}: đủ n đỉnh, có lời giải hoàn chỉnh.` });
          kmin = moi;
          E('soMauMin = soMauMoi;', 'soMauMin = soMauMoi', { ...base, c, title: 'Lời giải tốt hơn', note: `soMauMin = ${kmin}.` });
          smin.set(mau);
          E('Smin[x] = mau[x]', null, { ...base, c, title: 'Lời giải tốt hơn', note: 'Lưu bản sao mau vào Smin.' });
          E('"  LG moi', 'Smin = mau', { type: 'found', out: `${ind}  LG moi: soMauMin=${kmin}`, k: kmin, ...base, title: 'Lời giải tốt hơn',
            note: `Đủ ${n} đỉnh → lời giải hoàn chỉnh dùng ${kmin} màu, ít hơn lời giải cũ → cập nhật soMauMin = ${kmin}, lưu Smin.` });
        } else {
          E('if (i == n) {', 'if (i == n)', { ...base, c, title: 'Sang bước sau', note: `i = ${i + 1} < n = ${n}: chưa đủ đỉnh.` });
          E('quayLui(i + 1, soMauMoi);', 'quayLui(i + 1, soMauMoi)', { ...base, c, title: 'Sang bước sau', note: `Gọi quayLui(${i + 2}, ${moi}).` });
          quayLui(i + 1, moi);
        }
        mau[v] = -1;
        bts++;
        E('// trả lại trạng thái cũ', null, { ...base, c, title: 'Trả lại trạng thái cũ', note: `mau[${v}] = -1.` });
        E('"  go mau[', 'mau[v] = -1  // trả lại', { type: 'backtrack', out: `${ind}  go mau[${v}]`, ...base, c, title: 'Trả lại trạng thái cũ',
          note: `Gỡ màu ${c} của đỉnh ${v} (quay lui lần ${bts}) rồi thử màu kế tiếp.` });
      }
      E('// hết màu để thử', 'for (c = 0 -> n-1)', { type: 'fail', ...base, title: 'Hết lựa chọn',
        note: i ? `Đã xét hết màu cho đỉnh ${v} → quay về bước ${i}.` : `Đã xét hết màu cho đỉnh đầu tiên → vét xong cây tìm kiếm.` });
    }

    try {
      E('cin >> n;', null, { title: 'Đọc dữ liệu', note: `Đọc số đỉnh n = ${n}.` });
      E('cin >> x; a[u][v]', 'đọc G: n đỉnh', { title: 'Đọc dữ liệu',
        note: `Đọc ma trận kề ${n}×${n}: hàng u, cột v là a[u][v] (1 = u kề v, 0 = không) → đồ thị có ${g.edges.length} cạnh.` });
      const bac = new Int16Array(n);
      for (let v = 0; v < n; v++) {
        E('// bac[v] = số đỉnh kề của v', null, { v, title: 'Tính bậc', note: `Xét đỉnh v = ${v}.` });
        E('bac[v] = 0;', null, { v, title: 'Tính bậc', note: `bac[${v}] = 0.` });
        bac[v] = deg[v];
        E('bac[v] += a[v][u]', null, { v, title: 'Tính bậc', note: `Cộng dòng ${v} của ma trận kề: bac[${v}] = ${bac[v]}.` });
      }
      E('int k = 0;', null, { title: 'Xếp thứ tự', note: 'k = 0: thuTu đang rỗng.' });
      for (let d = n - 1; d >= 0; d--) {
        E('for (int d = n - 1', null, { title: 'Xếp thứ tự', note: `d = ${d}: tìm các đỉnh bậc ${d}.` });
        for (let v = 0; v < n; v++) {
          E('        for (int v = 0; v < n; v++)', null, { title: 'Xếp thứ tự', note: `Xét v = ${v}.` });
          const hit = bac[v] === d;
          if (hit) thuTu.push(v);
          E('if (bac[v] == d) thuTu[++k] = v;', null, { v, title: 'Xếp thứ tự',
            note: hit ? `bac[${v}] = ${d} → thuTu[${thuTu.length}] = ${v}.` : `bac[${v}] = ${bac[v]} ≠ ${d}.` });
        }
      }
      E('cout << "thuTu:"', 'thuTu[1..n] = ', { type: 'init', out: 'thuTu:' + thuTu.map(x => ' ' + x).join(''), order: thuTu, title: 'Khởi tạo',
        note: `Xếp đỉnh theo bậc giảm dần: ${fmtOrder(thuTu)}.` });
      E('cout << " " << thuTu[i]', null, { title: 'Khởi tạo', note: 'In thứ tự xét đỉnh.' });
      E('    cout << "\\n";', null, { title: 'Khởi tạo', note: 'Xuống dòng.' });
      E('for (int v = 0; v < n; v++) mau[v] = -1;', null, { title: 'Khởi tạo', note: 'Mọi đỉnh chưa tô: mau[v] = -1.' });
      E('soMauMin = n + 1;', 'soMauMin = n + 1', { title: 'Khởi tạo', note: `soMauMin = n + 1 = ${n + 1}: chưa có lời giải.` });
      E('quayLui(1, 0);', '  quayLui(1, 0)', { title: 'Gọi quayLui(1, 0)', note: 'Bắt đầu từ bước 1, chưa dùng màu nào.' });
      quayLui(0, 0);
      E('cout << "So mau', null, { out: `So mau: ${kmin}`, k: kmin, title: 'Xuất kết quả', note: `In sắc số χ(G) = soMauMin = ${kmin}.` }, smin);
      for (let v = 0; v < n; v++) {
        E('    for (int v = 0; v < n; v++)', null, { v, title: 'Xuất kết quả', note: `Xét v = ${v}.` }, smin);
        E('cout << "Dinh "', null, { v, out: `Dinh ${v}: mau ${smin[v]}`, title: 'Xuất kết quả', note: `In màu của đỉnh ${v} trong Smin: ${smin[v]}.` }, smin);
      }
      const fin = { type: 'done', k: kmin, title: 'Hoàn tất', note: `Vét hết cây tìm kiếm: sắc số χ(G) = soMauMin = ${kmin}. Tổng số lần quay lui: ${bts}.` };
      E(null, 'xuất soMauMin, Smin', { ...fin }, smin);
      E('return 0;', null, { ...fin }, smin);
      rec.finish();
    } catch (e) { if (e !== TRUNC) throw e; }
    return { colors: smin, k: kmin, aborted: false, calls, backtracks: bts };
  }

  /* =================================================================
   * 3) CODE C++ THẬT của 2 thuật toán — panel code bật công tắc "C++" thì hiện.
   *    Code có các dòng cout in log; mỗi bước trace mang chuỗi `out` = ĐÚNG
   *    dòng C++ in ra ở bước đó (bước không in gì thì không có out). Panel
   *    Log chỉ hiện các chuỗi này, nên log trên web = stdout của chương trình
   *    C++; test.js chạy g++ và so từng ký tự (stdoutOf).
   *    Chỉ dùng <iostream> + mảng tĩnh, ma trận kề như GV dạy. Cấu trúc bám
   *    sát mã giả để đọc song song. Input: dòng đầu n, sau đó ma trận kề n hàng × n số 0/1.
   *    test.js tự biên dịch bằng g++ (nếu có) và so kết quả với solver.
   *    Bộ ghi trace (greedyLines, backtrackLines) nhận diện dòng bằng chữ trong dòng
   *    (lineOf), nên sửa code ở đây thì sửa luôn chữ nhận diện ở đó.
   * ================================================================= */
  const GREEDY_CPP = () => [
    '#include <iostream>',
    'using namespace std;',
    '',
    'const int MAXN = 5005;      // n tối đa 5000 (giống demo)',
    'int n;               // số đỉnh',
    'bool a[MAXN][MAXN];  // ma trận kề: a[u][v] = 1 <=> u kề v',
    'int bac[MAXN];       // số đỉnh kề chưa tô; -1 = đã tô',
    'int mau[MAXN];       // màu của v; -1 = chưa tô',
    'int soMau;           // số màu đã dùng (màu 0..soMau-1)',
    '',
    '// có đỉnh kề v mang màu c?',
    'bool trungMau(int v, int c) {',
    '    for (int u = 0; u < n; u++)',
    '        if (a[v][u] == 1 && mau[u] == c) return true;',
    '    return false;',
    '}',
    '',
    'void thamLam() {',
    '    for (int v = 0; v < n; v++) {    // bac[v] = số đỉnh kề của v',
    '        bac[v] = 0;',
    '        for (int u = 0; u < n; u++) bac[v] += a[v][u];',
    '        mau[v] = -1;',
    '    }',
    '    soMau = 0;',
    '    for (int i = 1; i <= n; i++) {   // mỗi vòng tô đúng 1 đỉnh',
    '        int v = 0;                   // SELECT: bac lớn nhất,',
    '        for (int x = 1; x < n; x++)  // hòa → chỉ số nhỏ nhất',
    '            if (bac[x] > bac[v]) v = x;',
    '        cout << "Lan " << i << ": v=" << v << " bac=" << bac[v] << "\\n";',
    '        int c;                       // thử lần lượt các màu đã dùng',
    '        for (c = 0; c < soMau; c++) {',
    '            if (!trungMau(v, c)) {',
    '                cout << "  c=" << c << " khong trung\\n";',
    '                break;               // không trùng → dùng màu c',
    '            }',
    '            cout << "  c=" << c << " trung\\n";',
    '        }',
    '        if (c == soMau) {            // for chạy hết → màu mới',
    '            soMau++;',
    '            cout << "  mau moi " << c << "\\n";',
    '        }',
    '        mau[v] = c;                  // S_i = v, tô màu c',
    '        cout << "  mau[" << v << "]=" << c << "\\n";',
    '        bac[v] = -1;                 // P = P - {v}',
    '        cout << "  dinh " << v << " da to: bac=-1\\n";',
    '        for (int u = 0; u < n; u++)  // hạ bậc đỉnh kề chưa tô',
    '            if (a[v][u] == 1 && bac[u] >= 0) {',
    '                bac[u]--;',
    '                cout << "  bac[" << u << "]: " << bac[u] + 1 << "->" << bac[u] << "\\n";',
    '            }',
    '    }',
    '}',
    '',
    'int main() {',
    '    ios::sync_with_stdio(false);     // đọc nhanh: n = 5000 là 25 triệu số',
    '    cin >> n;                        // đọc G: n, ma trận kề a',
    '    char x;                          // mỗi phần tử là 1 ký tự 0/1',
    '    for (int u = 0; u < n; u++)      // n hàng, mỗi hàng n số',
    '        for (int v = 0; v < n; v++) { cin >> x; a[u][v] = (x == \'1\'); }',
    '    thamLam();',
    '    cout << "So mau: " << soMau << "\\n";',
    '    for (int v = 0; v < n; v++)',
    '        cout << "Dinh " << v << ": mau " << mau[v] << "\\n";',
    '    return 0;',
    '}',
  ];
  const BT_CPP = () => [
    '#include <iostream>',
    'using namespace std;',
    '',
    'const int MAXN = 5005;      // n tối đa 5000 (giống demo)',
    'int n;               // số đỉnh',
    'bool a[MAXN][MAXN];  // ma trận kề: a[u][v] = 1 <=> u kề v',
    'int bac[MAXN];       // số đỉnh kề của v (để sắp thuTu)',
    'int thuTu[MAXN];     // thuTu[1..n]: đỉnh theo bậc giảm dần',
    'int mau[MAXN];       // màu của v; -1 = chưa tô',
    'int soMauMin;        // số màu của LG tốt nhất',
    'int Smin[MAXN];      // LG tốt nhất (bản sao mau)',
    '',
    '// có đỉnh kề v mang màu c?',
    'bool trungMau(int v, int c) {',
    '    for (int u = 0; u < n; u++)',
    '        if (a[v][u] == 1 && mau[u] == c) return true;',
    '    return false;',
    '}',
    '',
    '// lùi đầu dòng log theo độ sâu đệ quy',
    'void thutLe(int i) {',
    '    for (int t = 1; t < i; t++) cout << "  ";',
    '}',
    '',
    'void quayLui(int i, int soMau) {  // bước i: màu S_i cho thuTu[i]',
    '    int v = thuTu[i];',
    '    thutLe(i); cout << "B" << i << ": v=" << v << " soMau=" << soMau << "\\n";',
    '    for (int c = 0; c < n; c++) {   // tối đa n lựa chọn',
    '        if (c > soMau) {             // vượt số màu: màu mới soMau đã thử rồi,',
    '            thutLe(i); cout << "  c=" << c << " vuot soMau\\n";  // màu mới khác chỉ là đổi tên',
    '            break;                   // → dừng (màu sau cũng vậy)',
    '        }',
    '        int soMauMoi = (c == soMau) ? soMau + 1 : soMau;  // c == soMau: mở màu mới',
    '        if (soMauMoi >= soMauMin) {  // cắt tỉa (màu sau cũng vậy)',
    '            thutLe(i); cout << "  c=" << c << " cat tia\\n";',
    '            break;',
    '        }',
    '        if (trungMau(v, c)) {        // trùng màu đỉnh kề → loại',
    '            thutLe(i); cout << "  c=" << c << " trung\\n";',
    '            continue;',
    '        }',
    '        mau[v] = c;                  // ghi nhận S_i = c',
    '        thutLe(i); cout << "  mau[" << v << "]=" << c << "\\n";',
    '        if (i == n) {                // đủ n đỉnh: LG hoàn chỉnh',
    '            soMauMin = soMauMoi;',
    '            for (int x = 0; x < n; x++) Smin[x] = mau[x];',
    '            thutLe(i); cout << "  LG moi: soMauMin=" << soMauMin << "\\n";',
    '        } else',
    '            quayLui(i + 1, soMauMoi);',
    '        mau[v] = -1;                 // trả lại trạng thái cũ',
    '        thutLe(i); cout << "  go mau[" << v << "]\\n";',
    '    }',
    '}                                    // hết màu để thử → về bước trước',
    '',
    'int main() {',
    '    ios::sync_with_stdio(false);     // đọc nhanh: n = 5000 là 25 triệu số',
    '    cin >> n;                        // đọc G: n, ma trận kề a',
    '    char x;                          // mỗi phần tử là 1 ký tự 0/1',
    '    for (int u = 0; u < n; u++)      // n hàng, mỗi hàng n số',
    '        for (int v = 0; v < n; v++) { cin >> x; a[u][v] = (x == \'1\'); }',
    '    for (int v = 0; v < n; v++) {    // bac[v] = số đỉnh kề của v',
    '        bac[v] = 0;',
    '        for (int u = 0; u < n; u++) bac[v] += a[v][u];',
    '    }',
    '    int k = 0;                       // thuTu: bậc giảm dần,',
    '    for (int d = n - 1; d >= 0; d--) // cùng bậc: chỉ số nhỏ trước',
    '        for (int v = 0; v < n; v++)',
    '            if (bac[v] == d) thuTu[++k] = v;',
    '    cout << "thuTu:";',
    '    for (int i = 1; i <= n; i++) cout << " " << thuTu[i];',
    '    cout << "\\n";',
    '    for (int v = 0; v < n; v++) mau[v] = -1;',
    '    soMauMin = n + 1;',
    '    quayLui(1, 0);',
    '    cout << "So mau: " << soMauMin << "\\n";',
    '    for (int v = 0; v < n; v++)',
    '        cout << "Dinh " << v << ": mau " << Smin[v] << "\\n";',
    '    return 0;',
    '}',
  ];
  const ALGOS = {
    greedy:   { name: 'Tham lam (bậc cao nhất trước)', short: 'Tham lam', run: (g, r) => greedy(g, r), code: () => GREEDY_CODE(),
                cpp: () => GREEDY_CPP(),
                desc: 'Theo bài giảng Buổi 10: đỉnh bậc cao nhất tô trước, thử lại màu đã dùng, đỉnh kề giảm bậc.',
                exact: false, cx: 'O(n³)' },
    backtrack:{ name: 'Quay lui (tìm χ chính xác)', short: 'Quay lui', run: (g, r, o) => backtrack(g, r, o),
                code: () => BT_CODE(), cpp: () => BT_CPP(), desc: 'Vét cạn theo mô hình try(i), giữ lời giải tốt nhất kmin, cắt nhánh không thể ít màu hơn.', exact: true, cx: 'O(n·n!) xấu nhất' },
  };

  /** Chạy thuật toán có ghi trace từng dòng của ngôn ngữ lang ('pseudo' | 'cpp'). */
  function trace(algoId, g, limit = 6000, lang = 'pseudo') {
    const A = ALGOS[algoId];
    A.lines = A.lines || { pseudo: A.code(), cpp: A.cpp() };   // giữ 1 bản để lineOf nhớ kết quả tra
    const rec = new Recorder(limit, lang, A.lines);
    const res = A.run(g, rec, { budget: 2e6 });
    return { steps: rec.steps, truncated: rec.truncated, result: res };
  }

  /* ---------------- Bộ đồ thị mẫu ---------------- */
  function cycleEdges(n, offset = 0) {
    const e = [];
    for (let i = 0; i < n; i++) e.push([offset + i, offset + ((i + 1) % n)]);
    return e;
  }

  function mycielski(g) {
    // V' = v_0..v_{n-1}, u_0..u_{n-1}, w
    const n = g.n, edges = [];
    for (const [a, b] of g.edges) {
      edges.push([a, b]);
      edges.push([n + a, b]);
      edges.push([n + b, a]);
    }
    for (let i = 0; i < n; i++) edges.push([n + i, 2 * n]);
    return makeGraph(2 * n + 1, edges);
  }

  /* Đề bài chính: khoang chứa mẫu vật chất của phi hành gia */
  const CARGO = {
    items: [
      ['³He', 'Heli-3', 'Mặt Trăng'], ['O₂', 'Oxy lỏng', 'Mặt Trăng'], ['H₂', 'Hydro lỏng', 'Sao Mộc'],
      ['H₂O', 'Băng sao chổi', 'Sao chổi 67P'], ['Na', 'Natri kim loại', 'Sao Thủy'], ['Fe', 'Bụi sắt', 'Thiên thạch'],
      ['CH₄', 'Metan lỏng', 'Titan'], ['ClO₄', 'Perclorat', 'Sao Hỏa'], ['Bio', 'Bào tử lạ', 'Europa'],
      ['S', 'Lưu huỳnh', 'Io'], ['CO₂', 'Băng khô', 'Sao Hỏa'], ['e⁺', 'Phản vật chất', 'Vành đai bức xạ'],
    ],
    edges: [
      [1, 2, 'hỗn hợp nổ'], [1, 6, 'cháy nổ'], [1, 5, 'bụi sắt bốc cháy'], [1, 4, 'natri bốc cháy'],
      [1, 9, 'lưu huỳnh bốc cháy'], [1, 8, 'oxy diệt bào tử kỵ khí'],
      [7, 2, 'oxy hóa mạnh'], [7, 6, 'oxy hóa mạnh'], [7, 5, 'hỗn hợp dễ nổ'], [7, 4, 'oxy hóa mạnh'],
      [7, 8, 'phá hủy chất hữu cơ'], [7, 9, 'hỗn hợp dễ nổ'], [7, 3, 'tạo nước muối ăn mòn'],
      [4, 3, 'sinh khí hydro, nổ'], [4, 8, 'phá hủy mẫu sinh học'], [4, 9, 'phản ứng mãnh liệt'],
      [4, 10, 'natri cháy trong CO₂'], [5, 9, 'tạo sắt sunfua, tỏa nhiệt'], [5, 3, 'gỉ sét làm hỏng mẫu'],
      ...Array.from({ length: 11 }, (_, i) => [11, i, 'hủy cặp vật chất – phản vật chất']),
    ],
  };

  /* Ví dụ tô màu bản đồ cô chạy tay ở Buổi 10 (slide 18), dựng lại từ ảnh bảng */
  const BUOI10_EDGES = [
    [0, 1], [0, 2], [0, 3], [1, 2], [1, 5], [1, 6], [2, 3], [2, 5], [3, 4],
    [3, 5], [4, 8], [5, 6], [5, 7], [6, 7], [6, 9], [7, 8], [8, 9],
  ];

  /* Bài gốc trong đề thi: Sở thú */
  const ZOO = {
    animals: [
      ['🦁', 'Sư tử'], ['🐯', 'Hổ'], ['🐑', 'Cừu'], ['🐐', 'Dê'], ['🦓', 'Ngựa vằn'],
      ['🐊', 'Cá sấu'], ['🦒', 'Hươu cao cổ'], ['🐒', 'Khỉ'], ['🐧', 'Chim cánh cụt'], ['🐘', 'Voi'],
    ],
    edges: [
      [0, 1, 'tranh lãnh thổ'], [0, 5, 'tranh lãnh thổ'], [1, 5, 'tranh lãnh thổ'],
      [0, 2, 'ăn thịt'], [0, 3, 'ăn thịt'], [0, 4, 'ăn thịt'], [0, 6, 'ăn thịt'],
      [1, 2, 'ăn thịt'], [1, 3, 'ăn thịt'], [1, 4, 'ăn thịt'], [1, 7, 'ăn thịt'],
      [5, 2, 'ăn thịt'], [5, 3, 'ăn thịt'], [5, 4, 'ăn thịt'], [5, 8, 'ăn thịt'],
      [7, 8, 'trêu chọc'], [8, 9, 'khác khí hậu'],
    ],
  };

  const PRESETS = [
    { id: 'cargo', name: 'Khoang chứa vật chất', chi: 4,
      desc: '12 mẫu, 30 cặp phản ứng. Phản vật chất phản ứng với mọi mẫu nên luôn cần một ngăn riêng.',
      build: () => makeGraph(12, CARGO.edges.map(e => [e[0], e[1]]), {
        labels: CARGO.items.map(a => ({ sym: a[0], name: a[1], from: a[2] })),
        reasons: CARGO.edges.map(e => e[2]) }) },
    { id: 'buoi10', name: 'Ví dụ Buổi 10 (slide 18)', chi: 3,
      desc: 'Đồ thị 10 đỉnh cô chạy tay trên lớp: tô 5 → 0 → 6 → …, bảng bậc khớp slide, cần 3 màu.',
      build: () => makeGraph(10, BUOI10_EDGES) },
    { id: 'zoo', name: 'Sở thú (bài gốc)', chi: 4,
      desc: 'Bài trong đề thi: 10 loài, 17 cặp xung khắc, số chuồng ít nhất là χ = 4.',
      build: () => makeGraph(10, ZOO.edges.map(e => [e[0], e[1]]), {
        labels: ZOO.animals.map(a => ({ sym: a[0], name: a[1], emoji: true })),
        reasons: ZOO.edges.map(e => e[2]) }) },
    { id: 'petersen', name: 'Petersen', chi: 3,
      desc: '10 đỉnh, 15 cạnh, mỗi đỉnh bậc 3, có chu trình lẻ → χ = 3.',
      build: () => {
        const e = cycleEdges(5);
        for (let i = 0; i < 5; i++) { e.push([i, i + 5]); e.push([5 + i, 5 + ((i + 2) % 5)]); }
        return makeGraph(10, e);
      } },
    { id: 'crown', name: 'Crown (bẫy tham lam)', chi: 2,
      desc: 'Lưỡng phân nên χ = 2, nhưng mọi đỉnh cùng bậc, tham lam chọn theo chỉ số và phải dùng tới 6 màu.',
      build: () => {
        const k = 6, e = [];
        for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (i !== j) e.push([2 * i, 2 * j + 1]);
        return makeGraph(2 * k, e);
      } },
    { id: 'grotzsch', name: 'Grötzsch (Mycielski)', chi: 4,
      desc: '11 đỉnh, không có tam giác nhưng vẫn cần 4 màu — quay lui phải làm việc vất vả.',
      build: () => mycielski(makeGraph(5, cycleEdges(5))) },
    { id: 'c7', name: 'Chu trình lẻ C₇', chi: 3,
      desc: 'Chu trình độ dài lẻ không tô được bằng 2 màu.',
      build: () => makeGraph(7, cycleEdges(7)) },
    { id: 'wheel', name: 'Bánh xe W₈', chi: 4,
      desc: 'Trục nối với chu trình lẻ C₇ → χ = 3 + 1 = 4.',
      build: () => {
        const e = cycleEdges(7, 1);
        for (let i = 1; i <= 7; i++) e.push([0, i]);
        return makeGraph(8, e);
      } },
  ];

  /* ---------------- Sinh ngẫu nhiên G(n, p) có seed ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomGraph(n, p, seed = 1) {
    const rnd = mulberry32(seed), e = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rnd() < p) e.push([i, j]);
    return makeGraph(n, e, { seed, p });
  }

  /* ---------------- Đọc input văn bản ----------------
   * Chỉ một định dạng — MA TRẬN KỀ như GV dạy (trùng input của code C++ và file testcase):
   *   dòng đầu "n" (1 ≤ n ≤ MAX_N), sau đó n hàng, hàng u gồm n số 0/1: số thứ v là a[u][v]
   *   (1 = mẫu u phản ứng với mẫu v). Ma trận phải đối xứng, đường chéo toàn 0.
   * Khoảng trắng / tab thừa, xuống dòng Windows và dòng trống được bỏ qua (cin của C++ cũng vậy);
   * chú thích "#", danh sách cạnh "u v", danh sách kề, DIMACS đều là lỗi.
   * opts.maxN: giới hạn n (mặc định MAX_N)
   */
  const MAX_N = 5000;          // = MAXN − 5 của code C++ (mảng tĩnh)

  /* Ngưỡng giao diện — main.js dùng để chạy, testcases/suite.js dùng để đo xem testcase có nạp nổi vào web không */
  const UI = {
    BT_MAX_N: 90,                // quay lui chỉ chạy khi n ≤ 90 (vét cạn hàm mũ)
    BT_LOAD_BUDGET: 4e5,         // loadGraph: tìm χ để tô màu lúc xem / tách ngăn
    BT_CMP_BUDGET: 1e6,          // bảng so sánh
    TABLE_MAX_N: 120,            // ma trận kề, bảng trạng thái: n² ô DOM (n ≤ 120: giữ nguyên như bản cũ)
    TEXT_MAX_N: 300,             // ô nhập: hiện ma trận kề của đồ thị đang chọn khi n ≤ 300 (≈ 180 KB chữ)
    STRESS_MAX_N: 120,           // bố cục stress O(n²) mỗi vòng; lớn hơn dùng xoắn ốc trên mặt cầu O(n + m)
    traceLimit: n => Math.max(1500, Math.min(30000, Math.floor(8e6 / Math.max(1, n)))),   // mỗi bước chép mảng màu n phần tử
  };

  const MAX_ERR = 50;          // quá số lỗi này thì dừng kiểm tra (ma trận n = 5000 sai đối xứng có thể ra hàng triệu lỗi)

  /** Hàng u của ma trận vào A; trả về chuỗi lỗi hoặc null. Hàng viết chuẩn "0 1 0 …" đi đường nhanh, không tách chuỗi. */
  function readRow(line, n, A, u) {
    const off = u * n;
    if (line.length === 2 * n - 1) {
      let ok = true;
      for (let v = 0, i = 0; v < n; v++, i += 2) {
        const ch = line.charCodeAt(i);
        if ((ch !== 48 && ch !== 49) || (v + 1 < n && line.charCodeAt(i + 1) !== 32)) { ok = false; break; }
        A[off + v] = ch - 48;
      }
      if (ok) return null;
    }
    const tok = line.split(/\s+/);
    if (tok.length !== n)
      return `có ${tok.length} số, cần đúng ${n} số` +
        (tok.length < n ? ' (mỗi hàng của ma trận kề có đủ n số 0/1, không nhập danh sách cạnh "u v" hay danh sách kề)' : '');
    for (let v = 0; v < n; v++) {
      if (tok[v] !== '0' && tok[v] !== '1') return `cột ${v} là "${tok[v]}" — ma trận kề chỉ gồm 0 và 1`;
      A[off + v] = tok[v] === '1' ? 1 : 0;
    }
    return null;
  }

  function parseInput(text, opts = {}) {
    const maxN = opts.maxN ?? MAX_N;
    const errors = [], warnings = [];
    const lines = text.split(/\r?\n/);
    let n = null, A = null, r = 0;               // r: số hàng ma trận đã đọc
    const rowLine = [];                          // hàng u nằm ở dòng nào (để báo lỗi đối xứng)
    for (let li = 0; li < lines.length && errors.length < MAX_ERR; li++) {
      const line = lines[li].trim(), ln = li + 1;
      if (!line) continue;
      if (n !== null && r >= n) { errors.push(`Dòng ${ln}: thừa hàng — ma trận kề ${n}×${n} chỉ có ${n} hàng.`); break; }
      if (line.includes('#')) {
        errors.push(`Dòng ${ln}: không dùng chú thích "#", mỗi dòng chỉ gồm các số.`);
        if (n === null) break;
        rowLine[r++] = ln;
        continue;
      }
      if (n === null) {
        if (!/^\d+$/.test(line)) { errors.push(`Dòng ${ln}: dòng đầu phải là số mẫu "n" (đúng một số nguyên).`); break; }
        n = +line;
        if (n < 1) { errors.push('Số đỉnh n phải ≥ 1.'); break; }
        if (n > maxN) { errors.push(`n = ${n} quá lớn (tối đa ${maxN}, giới hạn mảng MAXN của code C++).`); break; }
        A = new Uint8Array(n * n);
        continue;
      }
      const err = readRow(line, n, A, r);
      if (err) errors.push(`Dòng ${ln} (hàng ${r}): ${err}.`);
      rowLine[r++] = ln;
    }
    if (n === null && errors.length === 0) errors.push('Chưa có dữ liệu: dòng đầu là số đỉnh n.');
    if (A && r < n && errors.length < MAX_ERR) errors.push(`Thiếu hàng: ma trận kề ${n}×${n} cần ${n} hàng, mới có ${r} hàng.`);
    const edges = [];
    if (!errors.length) {                        // đủ n hàng đúng dạng → kiểm tra đường chéo và đối xứng
      for (let u = 0; u < n && errors.length < MAX_ERR; u++) {
        if (A[u * n + u]) errors.push(`Dòng ${rowLine[u]}: a[${u}][${u}] = 1 là khuyên — một mẫu không thể phản ứng với chính nó (đường chéo phải toàn 0).`);
        for (let v = u + 1; v < n && errors.length < MAX_ERR; v++) {
          const x = A[u * n + v], y = A[v * n + u];
          if (x !== y) errors.push(`Dòng ${rowLine[u]}: a[${u}][${v}] = ${x} nhưng a[${v}][${u}] = ${y} (dòng ${rowLine[v]}) — ma trận kề phải đối xứng.`);
          else if (x) edges.push([u, v]);
        }
      }
    }
    if (errors.length >= MAX_ERR) errors.push(`Quá ${MAX_ERR} lỗi, dừng kiểm tra.`);
    if (errors.length) return { errors, warnings, graph: null };
    if (n > 40) warnings.push('Đồ thị lớn: nhãn đỉnh sẽ ẩn bớt, chế độ từng bước có thể bị cắt ngắn.');
    if (n > UI.TABLE_MAX_N) warnings.push(`n > ${UI.TABLE_MAX_N}: không vẽ ma trận kề và bảng trạng thái; n > ${UI.BT_MAX_N}: không chạy quay lui.`);
    return { errors, warnings, graph: makeGraph(n, edges) };
  }

  /** Đồ thị → đúng định dạng input (ma trận kề), đọc lại được bằng parseInput và code C++. */
  function toMatrixText(g) {
    const n = g.n, A = adjMatrix(g), rows = [`${n}`];
    for (let u = 0; u < n; u++) rows.push(A.subarray(u * n, (u + 1) * n).join(' '));
    return rows.join('\n');
  }
  return {
    Recorder, makeGraph, usedCount, setStr, isProper, isPartialProper,
    greedy, backtrack, ALGOS, trace, stdoutOf,
    PRESETS, randomGraph, mycielski, cycleEdges, parseInput, toMatrixText, MAX_N, UI, mulberry32,
  };
})();

if (typeof window !== 'undefined') window.Solver = Solver;
if (typeof module !== 'undefined' && module.exports) module.exports = Solver;
