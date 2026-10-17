# Code C++

Hai thuật toán của demo viết bằng C++, mỗi thuật toán 2 bản:

| File | Nội dung | Dùng ở đâu |
|---|---|---|
| `tham_lam_log.cpp` | Tham lam theo bài giảng Buổi 10, **in log từng bước** | Y hệt code trên panel của demo (công tắc Mã giả ⇄ C++); khung *Output C++* là đúng những gì chương trình này in ra |
| `quay_lui_log.cpp` | Quay lui tìm χ(G), **in log từng bước** | Như trên |
| `tham_lam.cpp` | Cùng thuật toán, **chỉ in kết quả cuối cùng** | Chạy bộ testcase (`testcases/run_tests.js`) |
| `quay_lui.cpp` | Cùng thuật toán, **chỉ in kết quả cuối cùng** | Chạy bộ testcase, kể cả nhóm dữ liệu lớn (n tới 5000) |
| `export_cpp.js` | Xuất 4 file trên từ `solver.js` | `node cpp/export_cpp.js` |

Cả 4 file được **sinh tự động** từ code C++ trong `solver.js`, không sửa tay. Bản kết quả = bản log bỏ các lệnh `cout` in log (và hàm `thutLe` thụt lề log), nên luôn cùng thuật toán. `test.js` kiểm tra: 4 file khớp `solver.js`, biên dịch không cảnh báo với `-Wall -Wextra`, bản log in từng ký tự giống khung Output C++ trên web, bản kết quả in đúng phần kết quả cuối của bản log.

## Biên dịch và chạy

```bash
g++ -O2 -o quay_lui quay_lui.cpp
quay_lui < ../testcases/04_dac_biet/petersen.txt
```

Input (stdin): dòng đầu `n` (1 ≤ n ≤ 5000), mỗi dòng sau `u v` là một cạnh, đỉnh đánh số 0..n−1 — đúng dạng các file chuẩn hoá trong `testcases/01_*`…`05_*`.

Output:

```
So mau: 3
Dinh 0: mau 0
Dinh 1: mau 1
...
```

`MAXN = 5005`: mảng tĩnh, ma trận kề `bool a[MAXN][MAXN]` chiếm ≈ 25 MB. Demo web cũng giới hạn n ≤ 5000 cho khớp.

`build/` là chỗ `run_tests.js` để file thực thi, không commit.
