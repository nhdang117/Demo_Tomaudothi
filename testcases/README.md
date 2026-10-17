# Bộ testcase — Chromatic Cargo

100 testcase cho bài toán tô màu đồ thị (Khoang chứa vật chất), chia 6 nhóm. Kết quả chạy mới nhất: [results.md](results.md).

## Chạy

```bash
node gen_tests.js     # sinh lại toàn bộ file input + expected.csv (có seed, ra đúng từng byte)
node run_tests.js     # chạy cả bộ qua bộ giải của demo → results.csv, results.md, results.json
```

Trang demo (phần **Kiểm thử**, cuối trang) hiển thị `results.json` và có nút **Chạy lại trên trình duyệt** để chấm lại các testcase n ≤ 120 bằng chính bộ giải trên trang.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `01_nho/` | 20 đồ thị G(n, p) nhỏ, n = 3…9 — đáp án bằng vét cạn |
| `02_thong_thuong/` | Khoang chứa, Sở thú, ví dụ slide 18 Buổi 10, xếp lịch thi, G(n, p) cỡ vừa (n ≤ 60) |
| `03_bien/` | n = 1, n = 2, n = 120 (tối đa giao diện), K₉₀ / K₉₁ (ngưỡng quay lui), K₁₂₀ |
| `04_dac_biet/` | Crown (bẫy tham lam), Mycielski, Petersen, chu trình chẵn/lẻ, bánh xe, cây, không liên thông, Sudoku, queen (DIMACS) |
| `05_lon/` | n = 150…5000 (vượt giới hạn giao diện, chỉ chạy bằng Node): thưa, dày, cài sẵn χ, C₄₉₉₉, P₅₀₀₀ |
| `06_khong_hop_le/` | 18 input lỗi phải bị bắt + 5 input lệch chuẩn nhưng hợp lệ (cạnh lặp, CRLF, DIMACS khai sai m…) |
| `expected.csv` | Đáp án mong đợi của từng testcase |
| `gen_tests.js` | Sinh bộ testcase |
| `run_tests.js` | Chạy cả bộ, ghi kết quả |
| `suite.js` | Luật chấm một testcase (dùng chung cho Node và trang web) + DSatur nhánh-cận kiểm chứng, Bron–Kerbosch tính ω(G) |
| `results.csv` / `.md` / `.json` | Kết quả lần chạy gần nhất |

Mỗi file input đúng định dạng ô nhập của demo: danh sách cạnh (dòng đầu `n`, mỗi dòng sau `u v`, đỉnh 0..n−1) hoặc DIMACS (`p edge n m`, `e u v`, đỉnh 1..n). Dòng chú thích đầu file (`#` hoặc `c`) ghi tên testcase và χ mong đợi.

## `expected.csv`

| Cột | Ý nghĩa |
|---|---|
| `id`, `nhom`, `file` | Tên, nhóm, đường dẫn file input |
| `dinh_dang` | `edge` (danh sách cạnh) hoặc `dimacs` |
| `gioi_han` | `web` (n ≤ 120, nạp được vào demo) hoặc `node` (chỉ chạy bằng Node) |
| `n`, `m` | Số đỉnh, số cạnh |
| `chi` | χ mong đợi; trống nếu chỉ biết cận |
| `nguon` | Nguồn đáp án: `ly_thuyet`, `de_bai`, `vet_can`, `kiem_chung` (DSatur nhánh-cận độc lập), `cai_san` (đồ thị k-phần + clique K_k), `can` (chỉ kiểm tra ω(G) ≤ số màu ≤ Δ + 1) |
| `loi`, `so_loi` | Cụm từ phải có trong thông báo lỗi và số lỗi (testcase không hợp lệ) |
| `canh_bao` | Cụm từ phải có trong cảnh báo |
| `mo_ta` | Mô tả |

Đáp án mong đợi **không** lấy từ bộ giải của demo. Đáp án lý thuyết và đề bài được đối chiếu lại bằng vét cạn hoặc DSatur ngay lúc sinh, lệch là `gen_tests.js` dừng báo lỗi.

## Luật chấm (`suite.js`)

- **Input lỗi:** phải báo lỗi chứa đúng cụm từ, đúng số lỗi.
- **Tham lam:** phép tô hợp lệ; χ (hoặc ω(G)) ≤ số màu ≤ Δ + 1.
- **Quay lui** (n ≤ 90, ngân sách 1.000.000 lời gọi — như giao diện): phép tô hợp lệ, số màu = χ, không tệ hơn tham lam. Vượt ngân sách được ghi nhận, không tính là sai.
- **Trace** (n ≤ 120): bước cuối trùng kết quả, không bước trung gian nào tô hai đỉnh kề cùng màu (chấm tới 300.000 bước).
