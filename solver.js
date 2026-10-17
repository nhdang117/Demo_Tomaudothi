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
    const { n, adj } = g;
    const deg = Int16Array.from(adj, a => a.length);
    const color = new Int16Array(n).fill(-1);
    let used = 0;
    // mỗi bước lưu kèm ảnh chụp bảng bậc để giao diện hiện giống bảng cô chạy tay
    const R = rec ? ev => { ev.degs = Int16Array.from(deg); rec.push(color, ev); } : null;
    try {
      R && R({ line: 9, type: 'init', title: 'Lập bảng bậc',
        note: `Bảng bậc ban đầu = số đỉnh kề của mỗi đỉnh. Chưa tô đỉnh nào, chưa dùng màu nào.` });
      for (let step = 0; step < n; step++) {
        let v = -1;
        for (let x = 0; x < n; x++) if (deg[x] >= 0 && (v < 0 || deg[x] > deg[v])) v = x;
        const d = deg[v];
        if (R) {
          const ties = [];
          for (let x = 0; x < n; x++) if (deg[x] === d) ties.push(x);
          R({ line: 13, type: 'select', out: `Lan ${step + 1}: v=${v} bac=${d}`, v, deg: d, ties, title: 'Chọn đỉnh',
            note: ties.length > 1
              ? `Bậc cao nhất là ${d}, có ${ties.length} đỉnh cùng bậc: ${fmtList(ties)} → lấy chỉ số nhỏ nhất: đỉnh ${v}.`
              : `Đỉnh ${v} có bậc cao nhất trong bảng (${d}).` });
        }
        let c = 0;
        R && R({ line: 15, type: 'try', v, c: used ? 0 : null, deg: d, title: used ? 'Thử màu đã dùng' : 'Chưa có màu',
          note: used ? `Đã dùng ${used} màu (0..${used - 1}). Thử lần lượt từ màu 0.` : 'Chưa dùng màu nào nên không có màu cũ để thử.' });
        while (c < used) {
          let clash = -1;
          for (const u of adj[v]) if (color[u] === c) { clash = u; break; }
          if (clash < 0) break;
          R && R({ line: 16, type: 'conflict', out: `  c=${c} trung`, v, u: clash, c, deg: d, title: 'Trùng màu',
            note: `Đỉnh kề ${clash} đã tô màu ${c} → không dùng được màu ${c}.` });
          c++;
          if (c < used) R && R({ line: 15, type: 'try', v, c, deg: d, title: 'Thử màu kế tiếp', note: `Thử màu ${c}.` });
        }
        if (c < used) {
          R && R({ line: 17, type: 'ok', v, c, deg: d, title: 'Dùng lại màu cũ',
            note: `Không đỉnh kề nào mang màu ${c} → dùng lại màu ${c}.` });
        } else {
          used++;
          R && R({ line: 19, type: 'newcolor', out: `  mau moi ${c}`, v, c, deg: d, title: 'Sinh màu mới',
            note: c === 0 ? 'Chưa có màu nào → sinh màu 0.' : `Cả ${c} màu cũ đều trùng với đỉnh kề → sinh màu mới ${c}.` });
        }
        color[v] = c;
        R && R({ line: 20, type: 'assign', out: `  mau[${v}]=${c}`, v, c, deg: d, title: 'Tô màu',
          note: `Tô đỉnh ${v} màu ${c} → xếp vào ngăn ${c + 1}.` });
        deg[v] = -1;
        R && R({ line: 21, type: 'mark', v, c, deg: d, title: 'Đánh dấu đã tô',
          note: `Gán bậc của đỉnh ${v} = −1 để không bị chọn lại.` });
        const dec = [];
        for (const u of adj[v]) if (deg[u] >= 0) { deg[u]--; dec.push(u); }
        R && R({ line: 22, type: 'dec', out: dec.length ? dec.map(u => `  bac[${u}]: ${deg[u] + 1}->${deg[u]}`).join('\n') : undefined, v, c, deg: d, us: dec, title: 'Hạ bậc đỉnh kề',
          note: dec.length
            ? `Giảm 1 bậc cho ${dec.length} đỉnh kề chưa tô: ${fmtList(dec.map(u => `${u} (${deg[u] + 1}→${deg[u]})`))}.`
            : `Mọi đỉnh kề của ${v} đều đã tô → bảng bậc không đổi.` });
      }
      R && R({ line: 31, type: 'done', out: outKetQua(used, color), title: 'Hoàn tất',
        note: `Đã tô ${n} đỉnh, dùng ${used} màu.` });
    } catch (e) { if (e !== TRUNC) throw e; }
    return { colors: color, k: usedCount(color) };
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
   *    Độ phức tạp xấu nhất: O(nⁿ) nút — hàm mũ (NP-khó).
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
    const { n, adj } = g;
    const deg = adj.map(a => a.length);
    const order = [...Array(n).keys()].sort((a, b) => deg[b] - deg[a] || a - b);
    const color = new Int16Array(n).fill(-1), smin = new Int16Array(n).fill(-1);
    const budget = opts.budget ?? 5e6;
    let calls = 0, bts = 0, aborted = false, kmin = n + 1;
    const R = rec ? (ev, col = color) => { ev.kmin = kmin; ev.backtracks = bts; rec.push(col, ev); } : null;

    // i: bước giải (0-based trong code, hiển thị i + 1 cho khớp mã giả)
    function quayLui(i, used) {
      if (++calls > budget) throw ABORT;
      const v = order[i], ind = '  '.repeat(i);          // ind: thutLe(i) của C++
      R && R({ line: 8, type: 'select', out: `${ind}B${i + 1}: v=${v} soMau=${used}`, v, depth: i, deg: deg[v], title: `Bước ${i + 1}`,
        note: `Tìm màu cho đỉnh thuTu[${i + 1}] = ${v} (bậc ${deg[v]}). Đã dùng ${used} màu, soMauMin = ${kmin}${kmin > n ? ' (chưa có lời giải)' : ''}.` });
      for (let c = 0; c < n; c++) {
        if (c > used) {                                   // c <= used sai → mọi c sau cũng sai
          R && R({ line: 14, type: 'sym', out: `${ind}  c=${c} vuot soMau`, v, c, depth: i, deg: deg[v], title: 'Vượt số màu',
            note: `Màu ${c} > soMau = ${used}: vượt số màu. Màu mới chỉ cần thử 1 màu (màu ${used}, đã thử); màu ${c} trở đi chỉ là đổi tên màu đó → bỏ màu ${c}..${n - 1}.` });
          break;
        }
        if (Math.max(used, c + 1) >= kmin) {              // cắt tỉa: tăng dần theo c
          R && R({ line: 15, type: 'prune', out: `${ind}  c=${c} cat tia`, v, c, depth: i, deg: deg[v], title: 'Cắt tỉa',
            note: `Dùng màu ${c} thì đã cần ${Math.max(used, c + 1)} màu ≥ soMauMin = ${kmin} → không thể tốt hơn lời giải đang có, bỏ màu ${c}..${n - 1}.` });
          break;
        }
        let clash = -1;
        for (const u of adj[v]) if (color[u] === c) { clash = u; break; }
        if (clash >= 0) {
          R && R({ line: 16, type: 'conflict', out: `${ind}  c=${c} trung`, v, u: clash, c, depth: i, deg: deg[v], title: 'Trùng màu',
            note: `Đỉnh kề ${clash} đang mang màu ${c} → loại màu ${c}.` });
          continue;
        }
        color[v] = c;
        R && R({ line: 18, type: 'assign', out: `${ind}  mau[${v}]=${c}`, v, c, depth: i, deg: deg[v], title: 'Ghi nhận',
          note: `Màu ${c} hợp lệ → S_${i + 1} = ${c}, tô đỉnh ${v}.` });
        if (i === n - 1) {
          kmin = Math.max(used, c + 1);
          smin.set(color);
          R && R({ line: 21, type: 'found', out: `${ind}  LG moi: soMauMin=${kmin}`, k: kmin, v, depth: i, title: 'Lời giải tốt hơn',
            note: `Đủ ${n} đỉnh → lời giải hoàn chỉnh dùng ${kmin} màu, ít hơn lời giải cũ → cập nhật soMauMin = ${kmin}, lưu Smin.` });
        } else {
          quayLui(i + 1, Math.max(used, c + 1));
        }
        color[v] = -1;
        bts++;
        R && R({ line: 26, type: 'backtrack', out: `${ind}  go mau[${v}]`, v, c, depth: i, deg: deg[v], title: 'Trả lại trạng thái cũ',
          note: `Gỡ màu ${c} của đỉnh ${v} (quay lui lần ${bts}) rồi thử màu kế tiếp.` });
      }
      R && R({ line: 11, type: 'fail', v, depth: i, deg: deg[v], title: 'Hết lựa chọn',
        note: i ? `Đã xét hết màu cho đỉnh ${v} → quay về bước ${i}.` : `Đã xét hết màu cho đỉnh đầu tiên → vét xong cây tìm kiếm.` });
    }

    try {
      R && R({ line: 34, type: 'init', out: 'thuTu:' + order.map(x => ' ' + x).join(''), order, title: 'Khởi tạo',
        note: `Xếp đỉnh theo bậc giảm dần: ${fmtOrder(order)}. Chưa tô đỉnh nào, soMauMin = n + 1 = ${n + 1} (chưa có lời giải).` });
      quayLui(0, 0);
      R && R({ line: 37, type: 'done', out: outKetQua(kmin, smin), k: kmin, title: 'Hoàn tất',
        note: `Vét hết cây tìm kiếm: sắc số χ(G) = soMauMin = ${kmin}. Tổng số lần quay lui: ${bts}.` }, smin);
    } catch (e) {
      if (e === ABORT) aborted = true;
      else if (e !== TRUNC) throw e;
    }
    return { colors: smin, k: aborted ? -1 : kmin, aborted, calls, backtracks: bts };
  }

  /* =================================================================
   * 3) CODE C++ THẬT của 2 thuật toán — panel code bật công tắc "C++" thì hiện.
   *    Code có các dòng cout in log; mỗi bước trace mang chuỗi `out` = ĐÚNG
   *    dòng C++ in ra ở bước đó (bước không in gì thì không có out). Panel
   *    Log chỉ hiện các chuỗi này, nên log trên web = stdout của chương trình
   *    C++; test.js chạy g++ và so từng ký tự (stdoutOf).
   *    Chỉ dùng <iostream> + mảng tĩnh, ma trận kề như GV dạy. Cấu trúc bám
   *    sát mã giả để đọc song song. Input: dòng đầu n, sau đó mỗi dòng "u v".
   *    test.js tự biên dịch bằng g++ (nếu có) và so kết quả với solver.
   *    *_CPP_AT: dòng mã giả (0-based) → đoạn chữ nhận diện dòng C++ tương ứng,
   *    để trace tô sáng đúng dòng khi đang xem C++.
   * ================================================================= */
  const GREEDY_CPP = () => [
    '#include <iostream>',
    'using namespace std;',
    '',
    'const int MAXN = 125;',
    'int n;               // số đỉnh',
    'int a[MAXN][MAXN];   // ma trận kề: a[u][v] = 1 <=> u kề v',
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
    '            if (!trungMau(v, c)) break;  // không trùng → dùng màu c',
    '            cout << "  c=" << c << " trung\\n";',
    '        }',
    '        if (c == soMau) {            // for chạy hết → màu mới',
    '            soMau++;',
    '            cout << "  mau moi " << c << "\\n";',
    '        }',
    '        mau[v] = c;                  // S_i = v, tô màu c',
    '        cout << "  mau[" << v << "]=" << c << "\\n";',
    '        bac[v] = -1;                 // P = P - {v}',
    '        for (int u = 0; u < n; u++)  // hạ bậc đỉnh kề chưa tô',
    '            if (a[v][u] == 1 && bac[u] >= 0) {',
    '                bac[u]--;',
    '                cout << "  bac[" << u << "]: " << bac[u] + 1 << "->" << bac[u] << "\\n";',
    '            }',
    '    }',
    '}',
    '',
    'int main() {',
    '    cin >> n;                        // đọc G: n, ma trận kề a',
    '    int x, y;',
    '    while (cin >> x >> y) a[x][y] = a[y][x] = 1;',
    '    thamLam();',
    '    cout << "So mau: " << soMau << "\\n";',
    '    for (int v = 0; v < n; v++)',
    '        cout << "Dinh " << v << ": mau " << mau[v] << "\\n";',
    '    return 0;',
    '}',
  ];
  const GREEDY_CPP_AT = {
    9: 'bac[v] += a[v][u]', 13: '// SELECT', 15: 'for (c = 0; c < soMau', 16: 'if (!trungMau(v, c))',
    17: 'break;', 19: 'soMau++;', 20: 'mau[v] = c;', 21: 'bac[v] = -1;',
    22: '// hạ bậc', 31: 'cout << "So mau',
  };
  const GREEDY_CPP_OUT = {
    select: 'cout << "Lan "', conflict: '" trung', newcolor: '"  mau moi "', assign: 'cout << "  mau["',
    dec: 'cout << "  bac["', done: 'cout << "So mau',
  };

  const BT_CPP = () => [
    '#include <iostream>',
    'using namespace std;',
    '',
    'const int MAXN = 125;',
    'int n;               // số đỉnh',
    'int a[MAXN][MAXN];   // ma trận kề: a[u][v] = 1 <=> u kề v',
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
    '}',
    '',
    'int main() {',
    '    cin >> n;                        // đọc G: n, ma trận kề a',
    '    int x, y;',
    '    while (cin >> x >> y) a[x][y] = a[y][x] = 1;',
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
  const BT_CPP_AT = {
    8: 'void quayLui', 11: 'for (int c = 0; c < n; c++)', 13: 'int soMauMoi', 14: 'if (c > soMau) {',
    15: 'if (soMauMoi >= soMauMin)', 16: 'if (trungMau(v, c))', 18: 'mau[v] = c;', 21: 'soMauMin = soMauMoi;',
    26: '// trả lại trạng thái cũ', 34: 'cout << "thuTu:"', 37: 'cout << "So mau',
  };
  const BT_CPP_OUT = {
    select: 'cout << "B"', sym: '" vuot soMau', prune: '" cat tia', conflict: '" trung', assign: 'cout << "  mau["',
    found: '"  LG moi', backtrack: '"  go mau["', init: 'cout << "thuTu:"', done: 'cout << "So mau',
  };

  /** Loại bước → dòng C++ chứa lệnh cout in ra `out` của bước đó, dựng từ bảng *_CPP_OUT. */
  function cppOutMap(cpp, at) {
    const map = {};
    for (const k in at) {
      const j = cpp.findIndex(t => t.includes(at[k]));
      if (j < 0) throw new Error('cppOutMap: không thấy "' + at[k] + '"');
      map[k] = j;
    }
    return map;
  }
  /** Dòng C++ tô sáng của một bước: bước có in → đúng dòng cout sinh ra dòng log đó (để panel code và
      Output C++ khớp nhau); bước không in → dòng C++ tương ứng với dòng mã giả. */
  function cppLineOf(lineMap, outMap) {
    return s => (s.out != null && outMap[s.type] != null ? outMap[s.type] : lineMap[s.line]) ?? -1;
  }

  /** Dòng mã giả → dòng C++ (mảng chỉ số), dựng từ bảng *_CPP_AT. */
  function cppLineMap(cpp, at) {
    const map = [];
    for (const k in at) {
      const j = cpp.findIndex(t => t.includes(at[k]));
      if (j < 0) throw new Error('cppLineMap: không thấy "' + at[k] + '"');
      map[+k] = j;
    }
    return map;
  }

  const ALGOS = {
    greedy:   { name: 'Tham lam (bậc cao nhất trước)', short: 'Tham lam', run: (g, r) => greedy(g, r), code: () => GREEDY_CODE(),
                cpp: () => GREEDY_CPP(), cppLine: cppLineOf(cppLineMap(GREEDY_CPP(), GREEDY_CPP_AT), cppOutMap(GREEDY_CPP(), GREEDY_CPP_OUT)),
                desc: 'Theo bài giảng Buổi 10: đỉnh bậc cao nhất tô trước, thử lại màu đã dùng, đỉnh kề giảm bậc.',
                exact: false, cx: 'O(n² + k·m)' },
    backtrack:{ name: 'Quay lui (tìm χ chính xác)', short: 'Quay lui', run: (g, r, o) => backtrack(g, r, o),
                code: () => BT_CODE(), cpp: () => BT_CPP(), cppLine: cppLineOf(cppLineMap(BT_CPP(), BT_CPP_AT), cppOutMap(BT_CPP(), BT_CPP_OUT)), desc: 'Vét cạn theo mô hình try(i), giữ lời giải tốt nhất kmin, cắt nhánh không thể ít màu hơn.', exact: true, cx: 'O(nⁿ) xấu nhất' },
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
    greedy, backtrack, ALGOS, trace, stdoutOf,
    PRESETS, randomGraph, mycielski, cycleEdges, parseInput, toEdgeListText, MAX_N, mulberry32,
  };
})();

if (typeof window !== 'undefined') window.Solver = Solver;
if (typeof module !== 'undefined' && module.exports) module.exports = Solver;
