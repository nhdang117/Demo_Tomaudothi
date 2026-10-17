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

  /* ---------------- Trace recorder ---------------- */
  class Recorder {
    constructor(limit = 6000) {
      this.steps = [];
      this.limit = limit;
      this.truncated = false;
    }
    push(color, ev) {
      if (this.steps.length >= this.limit) { this.truncated = true; throw TRUNC; }
      ev.colors = Int16Array.from(color);
      ev.used = usedCount(color);
      this.steps.push(ev);
    }
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
   *    Độ phức tạp: O(n² + k·m), k = số màu dùng (≤ Δ + 1).
   * ================================================================= */
  const GREEDY_CODE = () => [
    '// S_i = đỉnh thứ i được chọn để tô',
    '// deg[v]: số đỉnh kề chưa tô; -1 = v đã tô',
    '// color[v]: màu của v; used: số màu đã dùng',
    '',
    'thamlam(G, n)',
    '{',
    '  deg[v] = số đỉnh kề của v, với mọi v',
    '  color[v] = -1 với mọi v;  used = 0',
    '  for (i = 1 -> n)  // mỗi vòng tô đúng 1 đỉnh',
    '  {',
    '    v = đỉnh có deg lớn nhất  // SELECT',
    '    // (hòa bậc → lấy chỉ số nhỏ nhất)',
    '    c = 0  // thử lần lượt các màu đã dùng',
    '    while (c < used',
    '           and có đỉnh kề v mang màu c)',
    '      c = c + 1  // trùng màu → thử màu sau',
    '    if (c == used)  // hết màu cũ',
    '      used = used + 1  // → sinh màu mới',
    '    color[v] = c  // S_i = v, tô màu c',
    '    deg[v] = -1  // P = P − {v}: không chọn lại',
    '    for (u kề v)  // hạ bậc đỉnh kề chưa tô',
    '      if (deg[u] >= 0) deg[u] = deg[u] - 1',
    '  }',
    '  return color, used',
    '}',
    '',
    'main()',
    '{',
    '  đọc G: n đỉnh, danh sách kề',
    '  color, used = thamlam(G, n)',
    '  xuất color, used',
    '}',
  ];

  function fmtList(arr, max = 8) {
    return arr.length <= max ? arr.join(', ') : arr.slice(0, max).join(', ') + ` … (${arr.length} đỉnh)`;
  }

  function greedy(g, rec) {
    const { n, adj } = g;
    const deg = Int16Array.from(adj, a => a.length);
    const color = new Int16Array(n).fill(-1);
    let used = 0;
    // mỗi bước lưu kèm ảnh chụp bảng bậc để giao diện hiện giống bảng cô chạy tay
    const R = rec ? ev => { ev.degs = Int16Array.from(deg); rec.push(color, ev); } : null;
    try {
      R && R({ line: 6, type: 'init', title: 'Lập bảng bậc',
        note: `Bảng bậc ban đầu = số đỉnh kề của mỗi đỉnh. Chưa tô đỉnh nào, chưa dùng màu nào.` });
      for (let step = 0; step < n; step++) {
        let v = -1;
        for (let x = 0; x < n; x++) if (deg[x] >= 0 && (v < 0 || deg[x] > deg[v])) v = x;
        const d = deg[v];
        if (R) {
          const ties = [];
          for (let x = 0; x < n; x++) if (deg[x] === d) ties.push(x);
          R({ line: 10, type: 'select', v, deg: d, ties, title: 'Chọn đỉnh',
            note: ties.length > 1
              ? `Bậc cao nhất là ${d}, có ${ties.length} đỉnh cùng bậc: ${fmtList(ties)} → lấy chỉ số nhỏ nhất: đỉnh ${v}.`
              : `Đỉnh ${v} có bậc cao nhất trong bảng (${d}).` });
        }
        let c = 0;
        R && R({ line: 12, type: 'try', v, c: used ? 0 : null, deg: d, title: used ? 'Thử màu đã dùng' : 'Chưa có màu',
          note: used ? `Đã dùng ${used} màu (0..${used - 1}). Thử lần lượt từ màu 0.` : 'Chưa dùng màu nào nên không có màu cũ để thử.' });
        while (c < used) {
          let clash = -1;
          for (const u of adj[v]) if (color[u] === c) { clash = u; break; }
          if (clash < 0) break;
          R && R({ line: 14, type: 'conflict', v, u: clash, c, deg: d, title: 'Trùng màu',
            note: `Đỉnh kề ${clash} đã tô màu ${c} → không dùng được màu ${c}.` });
          c++;
          if (c < used) R && R({ line: 15, type: 'try', v, c, deg: d, title: 'Thử màu kế tiếp', note: `Thử màu ${c}.` });
        }
        if (c < used) {
          R && R({ line: 14, type: 'ok', v, c, deg: d, title: 'Dùng lại màu cũ',
            note: `Không đỉnh kề nào mang màu ${c} → dùng lại màu ${c}.` });
        } else {
          used++;
          R && R({ line: 17, type: 'newcolor', v, c, deg: d, title: 'Sinh màu mới',
            note: c === 0 ? 'Chưa có màu nào → sinh màu 0.' : `Cả ${c} màu cũ đều trùng với đỉnh kề → sinh màu mới ${c}.` });
        }
        color[v] = c;
        R && R({ line: 18, type: 'assign', v, c, deg: d, title: 'Tô màu',
          note: `Tô đỉnh ${v} màu ${c} → xếp vào ngăn ${c + 1}.` });
        deg[v] = -1;
        R && R({ line: 19, type: 'mark', v, c, deg: d, title: 'Đánh dấu đã tô',
          note: `Gán bậc của đỉnh ${v} = −1 để không bị chọn lại.` });
        const dec = [];
        for (const u of adj[v]) if (deg[u] >= 0) { deg[u]--; dec.push(u); }
        R && R({ line: 20, type: 'dec', v, c, deg: d, us: dec, title: 'Hạ bậc đỉnh kề',
          note: dec.length
            ? `Giảm 1 bậc cho ${dec.length} đỉnh kề chưa tô: ${fmtList(dec.map(u => `${u} (${deg[u] + 1}→${deg[u]})`))}.`
            : `Mọi đỉnh kề của ${v} đều đã tô → bảng bậc không đổi.` });
      }
      R && R({ line: 30, type: 'done', title: 'Hoàn tất',
        note: `Đã tô ${n} đỉnh, dùng ${used} màu.` });
    } catch (e) { if (e !== TRUNC) throw e; }
    return { colors: color, k: usedCount(color) };
  }

  /* =================================================================
   * 2) QUAY LUI tìm sắc số χ(G) — theo mô hình try(i) của GV (Buổi 6–7),
   *    kiểu bài tối ưu "cây khung tối tiểu": vét cạn, giữ LG tốt nhất
   *    hiện hành (kmin, Smin), gặp LG hoàn chỉnh thì cập nhật.
   *    Bước i tô đỉnh v_i (đỉnh xếp theo bậc giảm dần), for chạy tối đa
   *    n màu, loại bằng if:
   *      - c <= used               : phá đối xứng (chỉ mở màu mới kế tiếp)
   *      - max(used, c + 1) < kmin : cắt tỉa (không thể ít màu hơn kmin)
   *      - không đỉnh kề v_i mang màu c : ràng buộc của bài toán
   *    Hai điều kiện đầu đơn điệu theo c: sai ở c thì sai với mọi c lớn
   *    hơn, nên bản cài đặt dừng vòng for ngay (kết quả như for chạy hết).
   *    Không có cận dưới cho χ nên không thoát sớm được: phải vét hết
   *    cây mới khẳng định kmin là ít nhất.
   *    Độ phức tạp xấu nhất: O(nⁿ) nút — hàm mũ (NP-khó).
   * ================================================================= */
  const BT_CODE = () => [
    '// S_i = màu của v_i, v_1..v_n: bậc giảm dần',
    '// color[v] = -1: đỉnh v chưa được tô',
    '// used: số màu đã dùng (các màu 0..used-1)',
    '// kmin, Smin: LG tốt nhất hiện hành',
    '',
    'tomau(i, used)  // bước i: màu S_i cho v_i',
    '{',
    '  for (c = 0 -> n-1)  // tối đa n lựa chọn',
    '    if (c <= used  // phá đối xứng',
    '        and max(used, c + 1) < kmin  // cắt tỉa',
    '        and không đỉnh kề v_i mang màu c)',
    '    {',
    '      color[v_i] = c  // ghi nhận S_i = c',
    '      if (i == n)  // đủ n đỉnh: LG hoàn chỉnh',
    '      {',
    '        kmin = max(used, c + 1)',
    '        Smin = color  // lưu bản sao',
    '      }',
    '      else',
    '        tomau(i + 1, max(used, c + 1))',
    '      color[v_i] = -1  // trả lại trạng thái cũ',
    '    }',
    '}',
    '',
    'main()',
    '{',
    '  đọc G: n đỉnh, danh sách kề',
    '  v_1..v_n = các đỉnh theo bậc giảm dần',
    '  color[v] = -1 với mọi v;  kmin = n + 1',
    '  tomau(1, 0)',
    '  xuất kmin, Smin',
    '}',
  ];

  function backtrack(g, rec, opts = {}) {
    const { n, adj } = g;
    const deg = adj.map(a => a.length);
    const order = [...Array(n).keys()].sort((a, b) => deg[b] - deg[a] || a - b);
    const color = new Int16Array(n).fill(-1), smin = new Int16Array(n).fill(-1);
    const budget = opts.budget ?? 5e6;
    let calls = 0, bts = 0, aborted = false, kmin = n + 1;
    const R = rec ? (ev, col = color) => { ev.kmin = kmin; ev.backtracks = bts; rec.push(col, ev); } : null;

    // i: bước giải (0-based trong code, hiển thị i + 1 cho khớp mã giả)
    function tomau(i, used) {
      if (++calls > budget) throw ABORT;
      const v = order[i];
      R && R({ line: 5, type: 'select', v, depth: i, deg: deg[v], title: `Bước ${i + 1}`,
        note: `Tìm màu cho đỉnh v_${i + 1} = ${v} (bậc ${deg[v]}). Đã dùng ${used} màu, kmin = ${kmin}${kmin > n ? ' (chưa có lời giải)' : ''}.` });
      for (let c = 0; c < n; c++) {
        if (c > used) {                                   // c <= used sai → mọi c sau cũng sai
          R && R({ line: 8, type: 'sym', v, c, depth: i, deg: deg[v], title: 'Phá đối xứng',
            note: `Màu ${c} > used = ${used}: mở màu mới thứ hai chỉ là đổi tên màu → bỏ màu ${c}..${n - 1}.` });
          break;
        }
        if (Math.max(used, c + 1) >= kmin) {              // cắt tỉa: tăng dần theo c
          R && R({ line: 9, type: 'prune', v, c, depth: i, deg: deg[v], title: 'Cắt tỉa',
            note: `Dùng màu ${c} thì đã cần ${Math.max(used, c + 1)} màu ≥ kmin = ${kmin} → không thể tốt hơn lời giải đang có, bỏ màu ${c}..${n - 1}.` });
          break;
        }
        let clash = -1;
        for (const u of adj[v]) if (color[u] === c) { clash = u; break; }
        if (clash >= 0) {
          R && R({ line: 10, type: 'conflict', v, u: clash, c, depth: i, deg: deg[v], title: 'Trùng màu',
            note: `Đỉnh kề ${clash} đang mang màu ${c} → loại màu ${c}.` });
          continue;
        }
        color[v] = c;
        R && R({ line: 12, type: 'assign', v, c, depth: i, deg: deg[v], title: 'Ghi nhận',
          note: `Màu ${c} hợp lệ → S_${i + 1} = ${c}, tô đỉnh ${v}.` });
        if (i === n - 1) {
          kmin = Math.max(used, c + 1);
          smin.set(color);
          R && R({ line: 15, type: 'found', k: kmin, v, depth: i, title: 'Lời giải tốt hơn',
            note: `Đủ ${n} đỉnh → lời giải hoàn chỉnh dùng ${kmin} màu, ít hơn lời giải cũ → cập nhật kmin = ${kmin}, lưu Smin.` });
        } else {
          tomau(i + 1, Math.max(used, c + 1));
        }
        color[v] = -1;
        bts++;
        R && R({ line: 20, type: 'backtrack', v, c, depth: i, deg: deg[v], title: 'Trả lại trạng thái cũ',
          note: `Gỡ màu ${c} của đỉnh ${v} (quay lui lần ${bts}) rồi thử màu kế tiếp.` });
      }
      R && R({ line: 7, type: 'fail', v, depth: i, deg: deg[v], title: 'Hết lựa chọn',
        note: i ? `Đã xét hết màu cho đỉnh ${v} → quay về bước ${i}.` : `Đã xét hết màu cho đỉnh đầu tiên → vét xong cây tìm kiếm.` });
    }

    try {
      R && R({ line: 27, type: 'init', order, title: 'Khởi tạo',
        note: `Xếp đỉnh theo bậc giảm dần: ${fmtOrder(order)}. Chưa tô đỉnh nào, kmin = n + 1 = ${n + 1} (chưa có lời giải).` });
      tomau(0, 0);
      R && R({ line: 30, type: 'done', k: kmin, title: 'Hoàn tất',
        note: `Vét hết cây tìm kiếm: sắc số χ(G) = kmin = ${kmin}. Tổng số lần quay lui: ${bts}.` }, smin);
    } catch (e) {
      if (e === ABORT) aborted = true;
      else if (e !== TRUNC) throw e;
    }
    return { colors: smin, k: aborted ? -1 : kmin, aborted, calls, backtracks: bts };
  }

  const ALGOS = {
    greedy:   { name: 'Tham lam (bậc cao nhất trước)', short: 'Tham lam', run: (g, r) => greedy(g, r), code: () => GREEDY_CODE(),
                desc: 'Theo bài giảng Buổi 10: đỉnh bậc cao nhất tô trước, thử lại màu đã dùng, đỉnh kề giảm bậc.',
                exact: false, cx: 'O(n² + k·m)' },
    backtrack:{ name: 'Quay lui (tìm χ chính xác)', short: 'Quay lui', run: (g, r, o) => backtrack(g, r, o),
                code: () => BT_CODE(), desc: 'Vét cạn theo mô hình try(i), giữ lời giải tốt nhất kmin, cắt nhánh không thể ít màu hơn.', exact: true, cx: 'O(nⁿ) xấu nhất' },
  };

  /** Chạy thuật toán có ghi trace. */
  function trace(algoId, g, limit = 6000) {
    const rec = new Recorder(limit);
    const res = ALGOS[algoId].run(g, rec, { budget: 2e6 });
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
   * Định dạng 1:  dòng đầu "n", mỗi dòng sau "u v" (đỉnh 0..n-1)
   * Định dạng 2:  DIMACS — "p edge n m", "e u v" (đỉnh 1..n), "c ..." chú thích
   */
  const MAX_N = 120;

  function parseInput(text) {
    const errors = [], warnings = [];
    const lines = text.split(/\r?\n/);
    let n = null, dimacs = false;
    const edges = [], seen = new Set();
    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      const line = raw.replace(/#.*$/, '').trim();
      const ln = li + 1;
      if (!line) continue;
      const tok = line.split(/\s+/);
      if (tok[0] === 'c') continue;
      if (tok[0] === 'p') {
        if (tok.length < 3 || !/^\d+$/.test(tok[2])) { errors.push(`Dòng ${ln}: dòng "p" phải có dạng "p edge n m".`); continue; }
        n = +tok[2]; dimacs = true; continue;
      }
      let a, b;
      if (tok[0] === 'e') {
        if (n === null) { errors.push(`Dòng ${ln}: cạnh xuất hiện trước dòng "p edge n m".`); continue; }
        if (tok.length !== 3 || !/^-?\d+$/.test(tok[1]) || !/^-?\d+$/.test(tok[2])) { errors.push(`Dòng ${ln}: "${raw.trim()}" phải có dạng "e u v".`); continue; }
        a = +tok[1] - 1; b = +tok[2] - 1;
      } else if (n === null) {
        if (tok.length > 2 || !tok.every(t => /^\d+$/.test(t))) { errors.push(`Dòng ${ln}: dòng đầu phải là số mẫu "n".`); break; }
        n = +tok[0];
        if (tok.length === 2) warnings.push(`Dòng ${ln}: không cần nhập số ngăn, chương trình tự xếp nên đã bỏ qua "${tok[1]}".`);
        continue;
      } else {
        if (tok.length !== 2 || !/^-?\d+$/.test(tok[0]) || !/^-?\d+$/.test(tok[1])) { errors.push(`Dòng ${ln}: "${raw.trim()}" phải gồm đúng 2 số nguyên "u v".`); continue; }
        a = +tok[0]; b = +tok[1];
      }
      const base = dimacs ? 1 : 0;
      if (a < 0 || b < 0 || a >= n || b >= n) {
        errors.push(`Dòng ${ln}: đỉnh ${(a < 0 || a >= n ? a : b) + base} nằm ngoài phạm vi ${base}..${n - 1 + base}.`); continue;
      }
      if (a === b) { errors.push(`Dòng ${ln}: khuyên ${a + base}–${a + base} không hợp lệ (một mẫu không thể phản ứng với chính nó).`); continue; }
      const key = a < b ? a * 100000 + b : b * 100000 + a;
      if (seen.has(key)) { warnings.push(`Dòng ${ln}: cạnh ${a + base}–${b + base} bị lặp, đã bỏ qua.`); continue; }
      seen.add(key);
      edges.push([a, b]);
    }
    if (n === null && errors.length === 0) errors.push('Chưa có dữ liệu: dòng đầu là số đỉnh n.');
    if (n !== null && n < 1) errors.push('Số đỉnh n phải ≥ 1.');
    if (n !== null && n > MAX_N) errors.push(`n = ${n} quá lớn cho demo 3D (tối đa ${MAX_N}).`);
    if (errors.length) return { errors, warnings, graph: null };
    if (n > 40) warnings.push('Đồ thị lớn: nhãn đỉnh sẽ ẩn bớt, chế độ từng bước có thể bị cắt ngắn.');
    return { errors, warnings, graph: makeGraph(n, edges) };
  }

  function toEdgeListText(g) {
    const L = g.labels;
    return [`${g.n}`.padEnd(6) + '# n', ...g.edges.map(([a, b]) =>
      L ? `${a} ${b}`.padEnd(6) + `# ${L[a].name} – ${L[b].name}` : `${a} ${b}`)].join('\n');
  }

  return {
    Recorder, makeGraph, usedCount, setStr, isProper, isPartialProper,
    greedy, backtrack, ALGOS, trace,
    PRESETS, randomGraph, mycielski, cycleEdges, parseInput, toEdgeListText, MAX_N, mulberry32,
  };
})();

if (typeof window !== 'undefined') window.Solver = Solver;
if (typeof module !== 'undefined' && module.exports) module.exports = Solver;
