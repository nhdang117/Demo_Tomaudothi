# Kết quả chạy bộ testcase

Chạy lúc 2026-10-18T01:37:23.138Z · Node v24.19.0 · g++ (MinGW-W64 x86_64-ucrt-posix-seh, built by Brecht Sanders, r4) 16.1.0, `-O2 -std=c++17` · AMD Ryzen 5 PRO 5650U with Radeon Graphics (12 luồng, 6.8 GB RAM) · Windows_NT 10.0.26200 x64

**102/102 testcase đạt** (197 s). Sinh lại: `node gen_tests.js` · chạy lại: `node run_tests.js`.

- **JS**: bộ giải của trang web (`solver.js`), cùng giới hạn như trang: quay lui chỉ khi n ≤ 90.
- **C++**: `cpp/tham_lam.cpp`, `cpp/quay_lui.cpp` — bản chỉ in kết quả cuối, **không in log từng bước**. Quay lui chạy cho mọi n, dừng sau 10 s. Thời gian đo từ ngoài tiến trình, đã gồm ≈ 16 ms khởi động tiến trình và đọc input.
- **Demo**: testcase được nạp vào trang nếu phần tính toán lúc nạp ≤ 300 ms (đo bằng Node).

| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui JS xong / vượt ngân sách / bỏ qua | Quay lui C++ xong / quá giờ | Xem demo |
|---|---:|---:|---|---:|---|---|---:|
| Dữ liệu nhỏ | 20 | 20 | 3–9 | 19/20 | 20 / 0 / 0 | 20 / 0 | 20/20 |
| Thông thường | 15 | 15 | 10–60 | 9/15 | 15 / 0 / 0 | 15 / 0 | 15/15 |
| Biên | 13 | 13 | 1–5000 | 13/13 | 5 / 0 / 8 | 13 / 0 | 11/13 |
| Đặc biệt | 17 | 17 | 7–81 | 11/17 | 16 / 1 / 0 | 16 / 1 | 16/17 |
| Dữ liệu lớn | 14 | 14 | 150–5000 | 4/7 | 0 / 0 / 14 | 4 / 10 | 6/14 |
| Không hợp lệ | 23 | 23 | 5–10 | 2/2 | 2 / 0 / 0 | 0 / 0 | 2/23 |

## Dữ liệu nhỏ

| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|---|
| [nho_01](01_nho/nho_01.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 | 2 | 17.6 ms / 82.4 ms | ✓ | ✅ |
| [nho_02](01_nho/nho_02.txt) | 4 | 0 | 1 (vet_can) | 1 | 1 | 1 | 16.4 ms / 15.8 ms | ✓ | ✅ |
| [nho_03](01_nho/nho_03.txt) | 5 | 7 | 3 (vet_can) | 3 | 3 | 3 | 16.1 ms / 15.9 ms | ✓ | ✅ |
| [nho_04](01_nho/nho_04.txt) | 6 | 11 | 4 (vet_can) | 4 | 4 | 4 | 17.6 ms / 16.0 ms | ✓ | ✅ |
| [nho_05](01_nho/nho_05.txt) | 7 | 1 | 2 (vet_can) | 2 | 2 | 2 | 15.8 ms / 16.3 ms | ✓ | ✅ |
| [nho_06](01_nho/nho_06.txt) | 8 | 13 | 3 (vet_can) | **4** (+1) | 3 | 3 | 17.4 ms / 16.8 ms | ✓ | ✅ |
| [nho_07](01_nho/nho_07.txt) | 9 | 24 | 5 (vet_can) | 5 | 5 | 5 | 18.0 ms / 17.7 ms | ✓ | ✅ |
| [nho_08](01_nho/nho_08.txt) | 3 | 3 | 3 (vet_can) | 3 | 3 | 3 | 16.9 ms / 21.8 ms | ✓ | ✅ |
| [nho_09](01_nho/nho_09.txt) | 4 | 1 | 2 (vet_can) | 2 | 2 | 2 | 17.7 ms / 16.4 ms | ✓ | ✅ |
| [nho_10](01_nho/nho_10.txt) | 5 | 4 | 3 (vet_can) | 3 | 3 | 3 | 18.1 ms / 16.3 ms | ✓ | ✅ |
| [nho_11](01_nho/nho_11.txt) | 6 | 9 | 3 (vet_can) | 3 | 3 | 3 | 17.0 ms / 16.4 ms | ✓ | ✅ |
| [nho_12](01_nho/nho_12.txt) | 7 | 18 | 5 (vet_can) | 5 | 5 | 5 | 16.6 ms / 15.9 ms | ✓ | ✅ |
| [nho_13](01_nho/nho_13.txt) | 8 | 1 | 2 (vet_can) | 2 | 2 | 2 | 16.4 ms / 15.9 ms | ✓ | ✅ |
| [nho_14](01_nho/nho_14.txt) | 9 | 12 | 3 (vet_can) | 3 | 3 | 3 | 17.6 ms / 16.5 ms | ✓ | ✅ |
| [nho_15](01_nho/nho_15.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 | 2 | 15.8 ms / 15.9 ms | ✓ | ✅ |
| [nho_16](01_nho/nho_16.txt) | 4 | 3 | 2 (vet_can) | 2 | 2 | 2 | 15.5 ms / 16.0 ms | ✓ | ✅ |
| [nho_17](01_nho/nho_17.txt) | 5 | 1 | 2 (vet_can) | 2 | 2 | 2 | 16.3 ms / 15.8 ms | ✓ | ✅ |
| [nho_18](01_nho/nho_18.txt) | 6 | 12 | 4 (vet_can) | 4 | 4 | 4 | 15.7 ms / 16.3 ms | ✓ | ✅ |
| [nho_19](01_nho/nho_19.txt) | 7 | 12 | 3 (vet_can) | 3 | 3 | 3 | 15.9 ms / 15.4 ms | ✓ | ✅ |
| [nho_20](01_nho/nho_20.txt) | 8 | 23 | 5 (vet_can) | 5 | 5 | 5 | 16.3 ms / 16.3 ms | ✓ | ✅ |

## Thông thường

| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|---|
| [khoang_chua](02_thong_thuong/khoang_chua.txt) | 12 | 30 | 4 (de_bai) | 4 | 4 | 4 | 16.8 ms / 15.5 ms | ✓ | ✅ |
| [buoi10_slide18](02_thong_thuong/buoi10_slide18.txt) | 10 | 17 | 3 (de_bai) | 3 | 3 | 3 | 16.6 ms / 15.8 ms | ✓ | ✅ |
| [so_thu](02_thong_thuong/so_thu.txt) | 10 | 17 | 4 (de_bai) | 4 | 4 | 4 | 17.0 ms / 16.5 ms | ✓ | ✅ |
| [lich_thi_20mon](02_thong_thuong/lich_thi_20mon.txt) | 20 | 93 | 6 (kiem_chung) | 6 | 6 | 6 | 16.5 ms / 16.1 ms | ✓ | ✅ |
| [lich_thi_30mon](02_thong_thuong/lich_thi_30mon.txt) | 30 | 148 | 6 (kiem_chung) | 6 | 6 | 6 | 17.4 ms / 17.0 ms | ✓ | ✅ |
| [lich_thi_40mon](02_thong_thuong/lich_thi_40mon.txt) | 40 | 233 | 6 (kiem_chung) | **7** (+1) | 6 | 6 | 66.9 ms / 31.3 ms | ✓ | ✅ |
| [gnp_12_5](02_thong_thuong/gnp_12_5.txt) | 12 | 31 | 4 (kiem_chung) | 4 | 4 | 4 | 16.5 ms / 15.5 ms | ✓ | ✅ |
| [gnp_16_4](02_thong_thuong/gnp_16_4.txt) | 16 | 60 | 5 (kiem_chung) | **6** (+1) | 5 | 5 | 16.5 ms / 15.6 ms | ✓ | ✅ |
| [gnp_20_3](02_thong_thuong/gnp_20_3.txt) | 20 | 66 | 4 (kiem_chung) | 4 | 4 | 4 | 16.3 ms / 15.6 ms | ✓ | ✅ |
| [gnp_25_25](02_thong_thuong/gnp_25_25.txt) | 25 | 67 | 4 (kiem_chung) | 4 | 4 | 4 | 17.3 ms / 16.4 ms | ✓ | ✅ |
| [gnp_30_2](02_thong_thuong/gnp_30_2.txt) | 30 | 81 | 4 (kiem_chung) | **5** (+1) | 4 | 4 | 17.2 ms / 15.6 ms | ✓ | ✅ |
| [gnp_30_5](02_thong_thuong/gnp_30_5.txt) | 30 | 209 | 7 (kiem_chung) | **8** (+1) | 7 | 7 | 17.7 ms / 15.8 ms | ✓ | ✅ |
| [gnp_40_15](02_thong_thuong/gnp_40_15.txt) | 40 | 115 | 4 (kiem_chung) | **5** (+1) | 4 | 4 | 17.3 ms / 16.0 ms | ✓ | ✅ |
| [gnp_50_1](02_thong_thuong/gnp_50_1.txt) | 50 | 117 | 4 (kiem_chung) | 4 | 4 | 4 | 25.8 ms / 25.7 ms | ✓ | ✅ |
| [gnp_60_08](02_thong_thuong/gnp_60_08.txt) | 60 | 129 | 3 (kiem_chung) | **4** (+1) | 3 | 3 | 20.9 ms / 23.3 ms | ✓ | ✅ |

## Biên

| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|---|
| [n1](03_bien/n1.txt) | 1 | 0 | 1 (ly_thuyet) | 1 | 1 | 1 | 18.0 ms / 17.9 ms | ✓ | ✅ |
| [n2_mot_canh](03_bien/n2_mot_canh.txt) | 2 | 1 | 2 (ly_thuyet) | 2 | 2 | 2 | 17.4 ms / 16.7 ms | ✓ | ✅ |
| [n2_khong_canh](03_bien/n2_khong_canh.txt) | 2 | 0 | 1 (ly_thuyet) | 1 | 1 | 1 | 20.1 ms / 15.9 ms | ✓ | ✅ |
| [canh_dinh_cuoi](03_bien/canh_dinh_cuoi.txt) | 5 | 2 | 2 (ly_thuyet) | 2 | 2 | 2 | 15.6 ms / 15.9 ms | ✓ | ✅ |
| [n120_khong_canh](03_bien/n120_khong_canh.txt) | 120 | 0 | 1 (ly_thuyet) | 1 | bỏ qua | 1 | 17.5 ms / 15.8 ms | ✓ | ✅ |
| [n120_duong_di](03_bien/n120_duong_di.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | bỏ qua | 2 | 17.6 ms / 16.7 ms | ✓ | ✅ |
| [n120_hinh_sao](03_bien/n120_hinh_sao.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | bỏ qua | 2 | 17.3 ms / 15.9 ms | ✓ | ✅ |
| [n119_chu_trinh_le](03_bien/n119_chu_trinh_le.txt) | 119 | 119 | 3 (ly_thuyet) | 3 | bỏ qua | 3 | 17.8 ms / 16.0 ms | ✓ | ✅ |
| [k90](03_bien/k90.txt) | 90 | 4005 | 90 (ly_thuyet) | 90 | 90 | 90 | 23.7 ms / 27.0 ms | ✓ | ✅ |
| [k91](03_bien/k91.txt) | 91 | 4095 | 91 (ly_thuyet) | 91 | bỏ qua | 91 | 24.4 ms / 23.1 ms | ✓ | ✅ |
| [k120](03_bien/k120.txt) | 120 | 7140 | 120 (ly_thuyet) | 120 | bỏ qua | 120 | 31.3 ms / 29.7 ms | ✓ | ✅ |
| [n5000_khong_canh](03_bien/n5000_khong_canh.txt) | 5000 | 0 | 1 (ly_thuyet) | 1 | bỏ qua | 1 | 188.8 ms / 97.5 ms | — | ✅ |
| [n5000_canh_cuoi](03_bien/n5000_canh_cuoi.txt) | 5000 | 1 | 2 (ly_thuyet) | 2 | bỏ qua | 2 | 187.1 ms / 94.0 ms | — | ✅ |

## Đặc biệt

| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|---|
| [crown_6](04_dac_biet/crown_6.txt) | 12 | 30 | 2 (ly_thuyet) | **6** (+4) | 2 | 2 | 18.6 ms / 17.7 ms | ✓ | ✅ |
| [crown_10](04_dac_biet/crown_10.txt) | 20 | 90 | 2 (ly_thuyet) | **10** (+8) | 2 | 2 | 17.1 ms / 16.7 ms | ✓ | ✅ |
| [myciel3](04_dac_biet/myciel3.txt) | 11 | 20 | 4 (ly_thuyet) | 4 | 4 | 4 | 17.0 ms / 16.5 ms | ✓ | ✅ |
| [myciel4](04_dac_biet/myciel4.txt) | 23 | 71 | 5 (ly_thuyet) | 5 | 5 | 5 | 18.1 ms / 19.8 ms | ✓ | ✅ |
| [myciel5](04_dac_biet/myciel5.txt) | 47 | 236 | 6 (ly_thuyet) | 6 | vượt ngân sách | quá thời gian | 18.2 ms / 10.0 s | — | ✅ |
| [petersen](04_dac_biet/petersen.txt) | 10 | 15 | 3 (ly_thuyet) | 3 | 3 | 3 | 17.9 ms / 16.0 ms | ✓ | ✅ |
| [c7_le](04_dac_biet/c7_le.txt) | 7 | 7 | 3 (ly_thuyet) | 3 | 3 | 3 | 16.3 ms / 16.0 ms | ✓ | ✅ |
| [c8_chan](04_dac_biet/c8_chan.txt) | 8 | 8 | 2 (ly_thuyet) | 2 | 2 | 2 | 16.8 ms / 15.9 ms | ✓ | ✅ |
| [banh_xe_w8](04_dac_biet/banh_xe_w8.txt) | 8 | 14 | 4 (ly_thuyet) | 4 | 4 | 4 | 17.3 ms / 16.8 ms | ✓ | ✅ |
| [banh_xe_w9](04_dac_biet/banh_xe_w9.txt) | 9 | 16 | 3 (ly_thuyet) | 3 | 3 | 3 | 16.1 ms / 16.0 ms | ✓ | ✅ |
| [k_5_7](04_dac_biet/k_5_7.txt) | 12 | 35 | 2 (ly_thuyet) | 2 | 2 | 2 | 16.5 ms / 16.3 ms | ✓ | ✅ |
| [cay_40](04_dac_biet/cay_40.txt) | 40 | 39 | 2 (ly_thuyet) | **3** (+1) | 2 | 2 | 17.6 ms / 16.3 ms | ✓ | ✅ |
| [khong_lien_thong](04_dac_biet/khong_lien_thong.txt) | 12 | 11 | 4 (ly_thuyet) | 4 | 4 | 4 | 16.2 ms / 15.8 ms | ✓ | ✅ |
| [dinh_ke_tat_ca](04_dac_biet/dinh_ke_tat_ca.txt) | 9 | 24 | 3 (ly_thuyet) | 3 | 3 | 3 | 16.4 ms / 15.5 ms | ✓ | ✅ |
| [queen5_5](04_dac_biet/queen5_5.txt) | 25 | 160 | 5 (ly_thuyet) | **7** (+2) | 5 | 5 | 18.0 ms / 16.4 ms | ✓ | ✅ |
| [queen6_6](04_dac_biet/queen6_6.txt) | 36 | 290 | 7 (ly_thuyet) | **9** (+2) | 7 | 7 | 22.2 ms / 22.4 ms | ✓ | ✅ |
| [sudoku](04_dac_biet/sudoku.txt) | 81 | 810 | 9 (ly_thuyet) | **12** (+3) | 9 | 9 | 34.4 ms / 20.9 ms | ✓ | ✅ |

## Dữ liệu lớn

| Test | n | m | χ mong đợi (nguồn) | Tham lam (JS = C++) | Quay lui JS | Quay lui C++ | C++ tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|---|
| [thua_200](05_lon/thua_200.txt) | 200 | 957 | 3 ≤ χ ≤ 6 (cận) | 6 | bỏ qua | quá thời gian | 22.3 ms / 10.0 s | ✓ | ✅ |
| [thua_500](05_lon/thua_500.txt) | 500 | 2528 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | quá thời gian | 27.7 ms / 10.0 s | — | ✅ |
| [thua_1000](05_lon/thua_1000.txt) | 1000 | 5027 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | quá thời gian | 40.0 ms / 10.0 s | — | ✅ |
| [thua_2000](05_lon/thua_2000.txt) | 2000 | 9945 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | quá thời gian | 77.2 ms / 10.0 s | — | ✅ |
| [thua_5000](05_lon/thua_5000.txt) | 5000 | 24910 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | quá thời gian | 262.2 ms / 10.0 s | — | ✅ |
| [day_300](05_lon/day_300.txt) | 300 | 22636 | 12 ≤ χ ≤ 47 (cận) | 47 | bỏ qua | quá thời gian | 62.0 ms / 10.0 s | ✓ | ✅ |
| [day_1000](05_lon/day_1000.txt) | 1000 | 50051 | 6 ≤ χ ≤ 28 (cận) | 28 | bỏ qua | quá thời gian | 130.8 ms / 10.0 s | ✓ | ✅ |
| [cai_san_1000_k5](05_lon/cai_san_1000_k5.txt) | 1000 | 12117 | 5 (cai_san) | **11** (+6) | bỏ qua | quá thời gian | 55.0 ms / 10.0 s | ✓ | ✅ |
| [cai_san_3000_k8](05_lon/cai_san_3000_k8.txt) | 3000 | 15904 | 8 (cai_san) | 8 | bỏ qua | quá thời gian | 130.0 ms / 10.0 s | — | ✅ |
| [luong_phan_2000](05_lon/luong_phan_2000.txt) | 2000 | 2980 | 2 (cai_san) | **4** (+2) | bỏ qua | quá thời gian | 65.3 ms / 10.0 s | — | ✅ |
| [crown_100](05_lon/crown_100.txt) | 200 | 9900 | 2 (ly_thuyet) | **100** (+98) | bỏ qua | 2 | 41.3 ms / 60.1 ms | ✓ | ✅ |
| [k150](05_lon/k150.txt) | 150 | 11175 | 150 (ly_thuyet) | 150 | bỏ qua | 150 | 37.5 ms / 36.9 ms | ✓ | ✅ |
| [chu_trinh_4999](05_lon/chu_trinh_4999.txt) | 4999 | 4999 | 3 (ly_thuyet) | 3 | bỏ qua | 3 | 210.6 ms / 122.7 ms | — | ✅ |
| [duong_di_5000](05_lon/duong_di_5000.txt) | 5000 | 4999 | 2 (ly_thuyet) | 2 | bỏ qua | 2 | 211.8 ms / 118.6 ms | — | ✅ |

## Không hợp lệ

| Test | Mô tả | Mong đợi | Hệ thống báo | Kết quả |
|---|---|---|---|---|
| [rong](06_khong_hop_le/rong.txt) | File rỗng | lỗi "Chưa có dữ liệu" | 1 lỗi: Chưa có dữ liệu: dòng đầu là số đỉnh n. | ✅ |
| [chi_chu_thich](06_khong_hop_le/chi_chu_thich.txt) | Chỉ có chú thích "#", không có dữ liệu | lỗi "chú thích" | 1 lỗi: Dòng 1: không dùng chú thích "#", mỗi dòng chỉ gồm các số nguyên. | ✅ |
| [dong_dau_chu](06_khong_hop_le/dong_dau_chu.txt) | Dòng đầu là chữ | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_am](06_khong_hop_le/n_am.txt) | n âm | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_bang_0](06_khong_hop_le/n_bang_0.txt) | n = 0 | lỗi "phải ≥ 1" | 1 lỗi: Số đỉnh n phải ≥ 1. | ✅ |
| [n_so_thuc](06_khong_hop_le/n_so_thuc.txt) | n là số thực | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_qua_lon](06_khong_hop_le/n_qua_lon.txt) | n = 5001 vượt giới hạn MAX_N = 5000 | lỗi "quá lớn" | 1 lỗi: n = 5001 quá lớn (tối đa 5000, giới hạn mảng MAXN của code C++). | ✅ |
| [dong_dau_3_so](06_khong_hop_le/dong_dau_3_so.txt) | Dòng đầu có 3 số | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [dong_dau_n_K](06_khong_hop_le/dong_dau_n_K.txt) | Dòng đầu kiểu cũ "n K" (có số ngăn) → lỗi, chương trình tự tính số ngăn | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [dimacs](06_khong_hop_le/dimacs.txt) | Định dạng DIMACS (p edge / e u v) không được nhận | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [chu_thich_cuoi_dong](06_khong_hop_le/chu_thich_cuoi_dong.txt) | Chú thích "#" cuối dòng cạnh | lỗi "chú thích" | 1 lỗi: Dòng 2: không dùng chú thích "#", mỗi dòng chỉ gồm các số nguyên. | ✅ |
| [khuyen](06_khong_hop_le/khuyen.txt) | Khuyên 2–2 | lỗi "khuyên" | 1 lỗi: Dòng 3: khuyên 2–2 không hợp lệ (một mẫu không thể phản ứng với chính nó). | ✅ |
| [dinh_ngoai_pham_vi](06_khong_hop_le/dinh_ngoai_pham_vi.txt) | Đỉnh 4 khi n = 4 (đỉnh đánh số 0..3) | lỗi "ngoài phạm vi" | 1 lỗi: Dòng 3: đỉnh 4 nằm ngoài phạm vi 0..3. | ✅ |
| [dinh_am](06_khong_hop_le/dinh_am.txt) | Đỉnh âm | lỗi "ngoài phạm vi" | 1 lỗi: Dòng 2: đỉnh -1 nằm ngoài phạm vi 0..3. | ✅ |
| [token_chu](06_khong_hop_le/token_chu.txt) | Cạnh có chữ | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 x" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [so_thuc](06_khong_hop_le/so_thuc.txt) | Cạnh có số thực | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 1.5" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [canh_thieu_dinh](06_khong_hop_le/canh_thieu_dinh.txt) | Dòng cạnh chỉ có 1 số | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [ba_so_tren_dong](06_khong_hop_le/ba_so_tren_dong.txt) | Dòng cạnh có 3 số | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 1 2" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [canh_lap](06_khong_hop_le/canh_lap.txt) | Cặp lặp lại (0 1 hai lần) | lỗi "bị lặp" | 1 lỗi: Dòng 4: cặp 0–1 bị lặp (đã có ở dòng 2). | ✅ |
| [canh_lap_dao](06_khong_hop_le/canh_lap_dao.txt) | Cặp lặp đảo chiều (1 0 sau 0 1) | lỗi "bị lặp" | 1 lỗi: Dòng 3: cặp 1–0 bị lặp (đã có ở dòng 2). | ✅ |
| [nhieu_loi](06_khong_hop_le/nhieu_loi.txt) | Nhiều lỗi cùng lúc: khuyên, ngoài phạm vi, chữ | lỗi "khuyên" | 3 lỗi: Dòng 3: khuyên 1–1 không hợp lệ (một mẫu không thể phản ứng với chính nó). | ✅ |
| [crlf_tab_dong_trong](06_khong_hop_le/crlf_tab_dong_trong.txt) | Hợp lệ: xuống dòng Windows (CRLF), tab, dòng trống — C₅ (giống cin của C++, vẫn nhận) | hợp lệ, χ = 3 | 0 cảnh báo · tham lam 3, quay lui 3 | ✅ |
| [khoang_trang_thua](06_khong_hop_le/khoang_trang_thua.txt) | Hợp lệ: khoảng trắng đầu dòng và dòng trống cuối file — Petersen | hợp lệ, χ = 3 | 0 cảnh báo · tham lam 3, quay lui 3 | ✅ |
