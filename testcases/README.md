# Bộ testcase — Chromatic Cargo

105 testcase cho bài toán tô màu đồ thị (Khoang chứa vật chất), chia 6 nhóm. Kết quả chạy mới nhất: [results.md](results.md).

## Chạy

```bash
node gen_tests.js     # sinh lại toàn bộ file input + expected.csv (có seed, ra đúng từng byte)
node run_tests.js     # chạy cả bộ bằng bộ giải JS và code C++ → results.csv, results.md, results.json
                      #   --timeout=10 : giây tối đa cho mỗi lần chạy quay lui C++ (mặc định 10)
```

Bộ testcase chạy **trên máy** (khoảng 3 phút, phần lớn là các lần quay lui C++ chạy hết giờ). Trang demo (phần **Kiểm thử**, cuối trang) chỉ **hiển thị** `results.json`; testcase nào nạp nhẹ thì bấm vào là nạp đồ thị đó để xem từng bước.

## Hai bộ giải, cùng thuật toán

| | Bộ giải | Giới hạn | In ra |
|---|---|---|---|
| **JS** | `solver.js` — bộ giải của trang web | Như trang: quay lui chỉ khi n ≤ 90, ngân sách 1.000.000 lời gọi | — |
| **C++** | `cpp/tham_lam.cpp`, `cpp/quay_lui.cpp` — biên dịch `g++ -O2` | Quay lui chạy cho mọi n, dừng sau `--timeout` giây | **Chỉ kết quả cuối cùng, không in log từng bước** |

Bản C++ dùng cho testcase là bản *kết quả* của code trên panel (xem [cpp/README.md](../cpp/README.md)): cùng thuật toán, bỏ các lệnh in log để thời gian đo là thời gian giải chứ không phải thời gian in. Quay lui của nhóm dữ liệu lớn (n > 90) **chỉ chạy bằng C++**. Thời gian C++ đo từ ngoài tiến trình nên đã gồm khoảng 15 ms khởi động tiến trình và đọc input (`results.json` → `meta.cpp.startMs`).

Với mỗi testcase hợp lệ, JS và C++ phải ra **cùng số màu và cùng cách tô** (tham lam luôn so; quay lui so khi JS chạy xong).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `01_nho/` | 20 đồ thị G(n, p) nhỏ, n = 3…9 — đáp án bằng vét cạn |
| `02_thong_thuong/` | Khoang chứa, Sở thú, ví dụ slide 18 Buổi 10, xếp lịch thi, G(n, p) cỡ vừa (n ≤ 60) |
| `03_bien/` | n = 1, n = 2, n = 120, K₉₀ / K₉₁ (ngưỡng quay lui trên web), K₁₂₀, n = 5000 (tối đa = MAXN − 5) |
| `04_dac_biet/` | Crown (bẫy tham lam), Mycielski, Petersen, chu trình chẵn/lẻ, bánh xe, cây, không liên thông, Sudoku, queen (benchmark DIMACS) |
| `05_lon/` | n = 150…5000: thưa, dày, cài sẵn χ, Crown S₁₀₀, K₁₅₀, C₄₉₉₉, P₅₀₀₀ |
| `06_khong_hop_le/` | 18 input lỗi phải bị bắt + 8 input hợp lệ ở dạng thô (DIMACS, chú thích, cạnh lặp, CRLF…) |
| `expected.csv` | Đáp án mong đợi của từng testcase |
| `gen_tests.js` | Sinh bộ testcase |
| `run_tests.js` | Chạy cả bộ (JS + C++), ghi kết quả |
| `suite.js` | Luật chấm bộ giải JS + đo chi phí nạp vào trang + DSatur nhánh-cận kiểm chứng, Bron–Kerbosch tính ω(G) |
| `results.csv` / `.md` / `.json` | Kết quả lần chạy gần nhất |

**Định dạng file.** Nhóm 01–05 là input **chuẩn hoá để code C++ đọc được** bằng `cin`: dòng đầu `n`, mỗi dòng sau `u v` (0 ≤ u, v < n), xuống dòng LF, không chú thích, không dòng trống. Mô tả và χ mong đợi nằm trong `expected.csv`. Nhóm 06 kiểm tra **bộ đọc input của trang web** (chú thích `#`, DIMACS, CRLF, tab, input lỗi…) nên giữ dạng thô và chỉ chạy bằng bộ giải JS (code C++ không có bộ đọc này); riêng vài file nhóm 06 vô tình đúng dạng chuẩn (ví dụ cạnh lặp) thì vẫn chạy C++.

## `expected.csv`

| Cột | Ý nghĩa |
|---|---|
| `id`, `nhom`, `file` | Tên, nhóm, đường dẫn file input |
| `dinh_dang` | `edge` (danh sách cạnh) hoặc `dimacs` |
| `chuan_hoa` | `1` nếu file đúng dạng chuẩn hoá (code C++ đọc được) |
| `n`, `m` | Số đỉnh, số cạnh |
| `chi` | χ mong đợi; trống nếu chỉ biết cận |
| `nguon` | Nguồn đáp án: `ly_thuyet`, `de_bai`, `vet_can`, `kiem_chung` (DSatur nhánh-cận độc lập), `cai_san` (đồ thị k-phần + clique K_k), `can` (chỉ kiểm tra ω(G) ≤ số màu ≤ Δ + 1) |
| `loi`, `so_loi` | Cụm từ phải có trong thông báo lỗi và số lỗi (testcase không hợp lệ) |
| `canh_bao` | Cụm từ phải có trong cảnh báo |
| `mo_ta` | Mô tả |

Đáp án mong đợi **không** lấy từ bộ giải của demo. Đáp án lý thuyết và đề bài được đối chiếu lại bằng vét cạn hoặc DSatur ngay lúc sinh, lệch là `gen_tests.js` dừng báo lỗi.

## Luật chấm

- **Input lỗi:** phải báo lỗi chứa đúng cụm từ, đúng số lỗi.
- **Tham lam (JS và C++):** phép tô hợp lệ; χ (hoặc ω(G)) ≤ số màu ≤ Δ + 1; JS và C++ ra cùng cách tô.
- **Quay lui:** phép tô hợp lệ, số màu = χ, không tệ hơn tham lam; JS và C++ ra cùng cách tô. JS vượt ngân sách hoặc C++ quá giờ được ghi nhận, không tính là sai; C++ chạy lỗi (ví dụ tràn stack) thì tính là **không đạt**.
- **Trace** (cái người dùng xem trên trang): bước cuối trùng kết quả, không bước nào tô hai đỉnh kề cùng màu. Trace dài hơn 3·10⁷ / n bước thì chấm phần đầu.
- **Xem demo:** `suite.js` lặp lại phần tính toán của trang khi nạp đồ thị (quay lui khi n ≤ 90, trace, bảng so sánh); quá 300 ms thì testcase chỉ hiển thị kết quả, không nạp vào trang.
