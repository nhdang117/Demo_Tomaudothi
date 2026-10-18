/* =====================================================================
 * export_cpp.js — xuất code C++ trên panel của demo (solver.js) ra file .cpp.
 * Chạy: node cpp/export_cpp.js
 *
 *   tham_lam_log.cpp, quay_lui_log.cpp   y hệt code trên panel: in log từng bước (cout) như cột Output C++
 *   tham_lam.cpp,     quay_lui.cpp       cùng thuật toán, bỏ mọi lệnh in log, chỉ in kết quả cuối cùng —
 *                                        dùng để chạy bộ testcase (testcases/run_tests.js)
 *
 * Bản "kết quả" được sinh bằng cách xóa lệnh cout trong các hàm thuật toán chứ không viết tay,
 * nên luôn cùng thuật toán với bản trên panel. test.js kiểm tra 4 file này khớp solver.js.
 * ===================================================================== */
const fs = require('fs'), path = require('path');

const FILES = {
  greedy: { log: 'tham_lam_log.cpp', res: 'tham_lam.cpp', name: 'Tham lam: đỉnh bậc cao nhất tô trước (bài giảng Buổi 10)' },
  backtrack: { log: 'quay_lui_log.cpp', res: 'quay_lui.cpp', name: 'Quay lui: tìm số màu ít nhất χ(G) (mô hình try(i), giữ lời giải tốt nhất)' },
};

/** Bỏ log: xóa hàm thutLe, lệnh `thutLe(i);` và `cout << … ;` trong các hàm thuật toán, khối in thuTu trong main. */
function stripLog(lines) {
  const out = [];
  let inMain = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('// lùi đầu dòng log')) {                    // hàm thutLe + dòng trống sau nó
      while (lines[i] !== '}') i++;
      if (lines[i + 1] === '') i++;
      continue;
    }
    if (line.startsWith('int main()')) inMain = true;
    if (inMain) {
      if (line.includes('cout << "thuTu:"')) { i += 2; continue; }  // 3 dòng in thứ tự xét đỉnh
      out.push(line);
      continue;
    }
    if (!line.includes('cout <<')) { out.push(line); continue; }
    const ci = line.indexOf('//', line.lastIndexOf('";'));             // chú thích sau chuỗi in (nếu có)
    const comment = ci >= 0 ? line.slice(ci) : '';
    const code = (ci >= 0 ? line.slice(0, ci) : line).replace(/thutLe\(i\);\s*/, '').replace(/cout <<.*?;\s*$/, '');
    if (code.trim()) throw new Error(`dòng còn code sau khi bỏ cout: ${line}`);
    if (comment) out.push(line.match(/^\s*/)[0] + comment);
  }
  return out;
}

function header(kind, name, log) {
  return [
    `// ${name}`,
    log ? '// Bản IN LOG: giống hệt code trên panel của demo, in từng bước (cout) như khung "Output C++".'
        : '// Bản KẾT QUẢ: cùng thuật toán với bản _log.cpp, bỏ mọi lệnh in log, chỉ in kết quả cuối cùng.',
    '// Sinh tự động từ solver.js bởi cpp/export_cpp.js — đừng sửa tay.',
    '// Input (stdin): dòng đầu n (1 ≤ n ≤ 5000), sau đó ma trận kề n hàng × n số 0/1 (a[u][v] = 1 <=> u kề v).',
    '// Biên dịch: g++ -O2 -o ' + kind + ' ' + kind + '.cpp',
    '',
  ];
}

function exportCpp(S) {
  const files = {};
  for (const [id, f] of Object.entries(FILES)) {
    const code = S.ALGOS[id].cpp();
    files[f.log] = header(f.log.replace('.cpp', ''), f.name, true).concat(code).join('\n') + '\n';
    files[f.res] = header(f.res.replace('.cpp', ''), f.name, false).concat(stripLog(code)).join('\n') + '\n';
  }
  return files;
}

module.exports = { exportCpp, stripLog, FILES };

if (require.main === module) {
  const S = require('../solver.js');
  for (const [name, text] of Object.entries(exportCpp(S))) {
    fs.writeFileSync(path.join(__dirname, name), text);
    console.log(name, text.split('\n').length - 1, 'dòng');
  }
}
