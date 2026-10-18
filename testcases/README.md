# Bộ testcase — Chromatic Cargo

104 testcase cho bài toán tô màu đồ thị (Khoang chứa vật chất), chia 6 nhóm. Kết quả chạy mới nhất: [results.md](results.md).

## Chạy

```bash
node gen_tests.js     # sinh lại toàn bộ file input + expected.csv (có seed, ra đúng từng byte)
node run_tests.js     # chạy cả bộ bằng code C++ → results.csv, results.md, results.json
                      #   --timeout=10 : giây tối đa cho mỗi lần chạy một chương trình C++ (mặc định 10)
```

Bộ testcase chạy **trên máy, bằng code C++** (cần `g++`; khoảng 3 phút, phần lớn là các lần quay lui chạy hết giờ). Trang demo (phần **Kiểm thử**, cuối trang) chỉ **hiển thị** `results.json`; testcase hợp lệ có n ≤ 300 thì bấm vào là nạp đồ thị đó để xem từng bước.

## Chỉ chạy bằng C++

Mỗi testcase đi qua 3 chương trình, biên dịch `g++ -O2` vào `cpp/build/`:

| Bước | Chương trình | Việc | In ra |
|---|---|---|---|
| 1 | `cpp/kiem_tra.cpp` | Kiểm tra input ma trận kề — cùng luật, **cùng thông báo lỗi** với ô nhập trên web (`test.js` so từng ký tự) | `Hop le: n = …, m = …` hoặc mỗi lỗi một dòng |
| 2 | `cpp/tham_lam.cpp` | Tham lam theo bài giảng Buổi 10 | **Chỉ kết quả cuối cùng, không in log từng bước** |
| 3 | `cpp/quay_lui.cpp` | Quay lui tìm χ, chạy cho mọi n, dừng sau `--timeout` giây | Như trên |

Bước 2–3 chỉ chạy khi bước 1 nhận input. Bản C++ dùng cho testcase là bản *kết quả* của code trên panel (xem [cpp/README.md](../cpp/README.md)): cùng thuật toán, bỏ các lệnh in log để thời gian đo là thời gian giải chứ không phải thời gian in. Thời gian đo từ ngoài tiến trình nên đã gồm khoảng 15 ms khởi động tiến trình và thời gian đọc input (`results.json` → `meta.cpp.startMs`).

`run_tests.js` chỉ gọi các chương trình C++ rồi chấm output; **không chạy bộ giải JS của trang** (`solver.js` chỉ cho biết ngưỡng hiển thị của web). Cận dưới ω(G) và DSatur kiểm chứng nằm trong `suite.js`, viết độc lập.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `01_nho/` | 20 đồ thị G(n, p) nhỏ, n = 3…9 — đáp án bằng vét cạn |
| `02_thong_thuong/` | Khoang chứa, Sở thú, ví dụ slide 18 Buổi 10, xếp lịch thi, G(n, p) cỡ vừa (n ≤ 60) |
| `03_bien/` | n = 1, n = 2, n = 120, K₉₀ / K₉₁ (ngưỡng quay lui trên web), K₁₂₀, n = 5000 (tối đa = MAXN − 5, một cạnh ở 2 đỉnh cuối) |
| `04_dac_biet/` | Crown (bẫy tham lam), Mycielski, Petersen, chu trình chẵn/lẻ, bánh xe, cây, không liên thông, Sudoku, queen (benchmark DIMACS) |
| `05_lon/` | n = 150…5000: thưa (tới n = 5000), dày, cài sẵn χ, Crown S₁₀₀, K₁₅₀, C₁₉₉₉, P₂₀₀₀ |
| `06_khong_hop_le/` | 24 input sai định dạng phải bị báo lỗi (danh sách cạnh, danh sách kề, DIMACS, chú thích `#`, quên dòng n, phần tử khác 0/1, hàng thiếu/thừa số, thiếu/thừa hàng, khuyên, không đối xứng…) + 2 input hợp lệ có khoảng trắng / tab / CRLF / dòng trống thừa |
| `expected.csv` | Đáp án mong đợi của từng testcase |
| `gen_tests.js` | Sinh bộ testcase |
| `run_tests.js` | Chạy cả bộ bằng 3 chương trình C++, chấm và ghi kết quả |
| `suite.js` | Bộ kiểm chứng độc lập: DSatur nhánh-cận (đáp án `kiem_chung`), Bron–Kerbosch tính ω(G), Δ(G) |
| `results.csv` / `.md` / `.json` | Kết quả lần chạy gần nhất |

**Định dạng file — chỉ một cách nhập: ma trận kề.** Nhóm 01–05 là input **chuẩn hoá để code C++ đọc được** bằng `cin`: dòng đầu `n`, sau đó `n` hàng, mỗi hàng `n` số 0/1 cách nhau đúng 1 dấu cách (`a[u][v] = 1` ⟺ u kề v; đối xứng, đường chéo 0), xuống dòng LF, không chú thích, không dòng trống. File nặng ≈ 2n² byte: n = 2000 là 8 MB, n = 5000 là 50 MB, nên chỉ giữ 2 file n = 5000 (`03_bien/n5000_canh_cuoi`, `05_lon/thua_5000`), các đồ thị lớn khác ở n ≤ 2000; cả bộ ≈ 140 MB. Mô tả và χ mong đợi nằm trong `expected.csv`. Demo chỉ nhận **đúng một định dạng** input này (khoảng trắng, tab, CRLF, dòng trống thừa được bỏ qua như `cin`). Nhóm 06 kiểm tra **bộ kiểm tra input** (`cpp/kiem_tra.cpp`, cùng luật với ô nhập trên web): input sai định dạng phải bị báo lỗi đúng dòng, đúng số lỗi; 2 file hợp lệ có khoảng trắng / CRLF thừa thì chạy tiếp tham lam và quay lui như các nhóm khác.

## `expected.csv`

| Cột | Ý nghĩa |
|---|---|
| `id`, `nhom`, `file` | Tên, nhóm, đường dẫn file input |
| `dinh_dang` | `matrix` (ma trận kề) — định dạng duy nhất |
| `chuan_hoa` | `1` nếu file đúng dạng chuẩn hoá (code C++ đọc được) |
| `n`, `m` | Số đỉnh, số cạnh |
| `chi` | χ mong đợi; trống nếu chỉ biết cận |
| `nguon` | Nguồn đáp án: `ly_thuyet`, `de_bai`, `vet_can`, `kiem_chung` (DSatur nhánh-cận độc lập), `cai_san` (đồ thị k-phần + clique K_k), `can` (chỉ kiểm tra ω(G) ≤ số màu ≤ Δ + 1) |
| `loi`, `so_loi` | Cụm từ phải có trong thông báo lỗi và số lỗi (testcase không hợp lệ) |
| `canh_bao` | Cụm từ phải có trong cảnh báo |
| `mo_ta` | Mô tả |

Đáp án mong đợi **không** lấy từ bộ giải của demo. Đáp án lý thuyết và đề bài được đối chiếu lại bằng vét cạn hoặc DSatur ngay lúc sinh, lệch là `gen_tests.js` dừng báo lỗi.

## Luật chấm

- **Input lỗi:** `kiem_tra.cpp` phải báo lỗi chứa đúng cụm từ, đúng số lỗi; input hợp lệ phải in đúng `Hop le: n = …, m = …`.
- **Tham lam:** phép tô hợp lệ trên ma trận kề; χ (hoặc ω(G)) ≤ số màu ≤ Δ + 1.
- **Quay lui:** phép tô hợp lệ, số màu = χ, không tệ hơn tham lam. Quá giờ được ghi nhận, không tính là sai; chạy lỗi (ví dụ tràn stack) thì tính là **không đạt**.
- **Xem demo:** testcase hợp lệ có n ≤ 300 (ngưỡng ô nhập ma trận của trang) thì cho nạp vào trang; lớn hơn chỉ hiển thị kết quả C++.
