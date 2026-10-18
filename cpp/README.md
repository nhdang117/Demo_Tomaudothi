# Code C++

Hai thuật toán của demo viết bằng C++, mỗi thuật toán 2 bản, cộng chương trình kiểm tra input:

| File | Nội dung | Dùng ở đâu |
|---|---|---|
| `tham_lam_log.cpp` | Tham lam theo bài giảng Buổi 10, **in log từng bước** | Y hệt code trên panel của demo (công tắc Mã giả ⇄ C++); khung *Output C++* là đúng những gì chương trình này in ra |
| `quay_lui_log.cpp` | Quay lui tìm χ(G), **in log từng bước** | Như trên |
| `tham_lam.cpp` | Cùng thuật toán, **chỉ in kết quả cuối cùng** | Chạy bộ testcase (`testcases/run_tests.js`) |
| `quay_lui.cpp` | Cùng thuật toán, **chỉ in kết quả cuối cùng** | Chạy bộ testcase, kể cả nhóm dữ liệu lớn (n tới 5000) |
| `kiem_tra.cpp` | Kiểm tra input ma trận kề, **viết tay**: cùng luật, cùng thông báo lỗi với ô nhập trên web | Bước đầu của mỗi testcase; chấm nhóm `06_khong_hop_le` |
| `export_cpp.js` | Xuất 4 file thuật toán ở trên từ `solver.js` | `node cpp/export_cpp.js` |

4 file thuật toán được **sinh tự động** từ code C++ trong `solver.js`, không sửa tay (`kiem_tra.cpp` thì sửa tay, `test.js` so thông báo lỗi của nó với web trên vài trăm input). Bản kết quả = bản log bỏ các lệnh `cout` in log (và hàm `thutLe` thụt lề log), nên luôn cùng thuật toán. `test.js` kiểm tra: 4 file khớp `solver.js`, biên dịch không cảnh báo với `-Wall -Wextra`, bản log in từng ký tự giống khung Output C++ trên web, bản kết quả in đúng phần kết quả cuối của bản log.

## Biên dịch và chạy

```bash
g++ -O2 -o quay_lui quay_lui.cpp
quay_lui < ../testcases/04_dac_biet/petersen.txt
```

Input (stdin): dòng đầu `n` (1 ≤ n ≤ 5000), sau đó **ma trận kề** `n` hàng × `n` số 0/1 cách nhau dấu cách — số thứ `v` của hàng `u` là `a[u][v]` (1 = u kề v), đỉnh đánh số 0..n−1. Đây là cách nhập duy nhất, đúng dạng các file chuẩn hoá trong `testcases/01_*`…`05_*` và ô nhập trên web. Ví dụ C₄:

```
4
0 1 0 1
1 0 1 0
0 1 0 1
1 0 1 0
```

`main` đọc từng phần tử bằng `char` (`cin >> x; a[u][v] = (x == '1');`) sau `ios::sync_with_stdio(false)`: với n = 5000 (25 triệu số) đọc mất ≈ 0,6 s, còn `cin >>` thẳng vào số/`bool` trên MinGW mất ≈ 4,5 s. Code C++ không kiểm tra input; ma trận sai (không đối xứng, khác 0/1…) do trang web báo lỗi.

Output:

```
So mau: 3
Dinh 0: mau 0
Dinh 1: mau 1
...
```

`MAXN = 5005`: mảng tĩnh, ma trận kề `bool a[MAXN][MAXN]` chiếm ≈ 25 MB. Demo web cũng giới hạn n ≤ 5000 cho khớp.

`build/` là chỗ `run_tests.js` để file thực thi, không commit.
