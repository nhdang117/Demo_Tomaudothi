# Kết quả chạy bộ testcase

Chạy lúc 2026-10-18T02:32:33.970Z · g++ (MinGW-W64 x86_64-ucrt-posix-seh, built by Brecht Sanders, r4) 16.1.0, `-O2 -std=c++17` · Node v24.19.0 (chỉ để gọi chương trình) · AMD Ryzen 5 PRO 5650U with Radeon Graphics (12 luồng, 6.8 GB RAM) · Windows_NT 10.0.26200 x64

**104/104 testcase đạt** (129.1 s). Sinh lại: `node gen_tests.js` · chạy lại: `node run_tests.js`.

Mọi testcase chạy bằng **code C++**: `cpp/kiem_tra.cpp` kiểm tra input ma trận kề (cùng thông báo lỗi với web), rồi `cpp/tham_lam.cpp` và `cpp/quay_lui.cpp` — bản chỉ in kết quả cuối, **không in log từng bước**. Quay lui chạy cho mọi n, dừng sau 10 s. Thời gian đo từ ngoài tiến trình, đã gồm ≈ 19.5 ms khởi động tiến trình và đọc input.

Cột **Demo**: testcase hợp lệ có n ≤ 300 thì phần Kiểm thử trên trang cho nạp đồ thị để xem từng bước.

| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui xong / quá giờ | Xem demo |
|---|---:|---:|---|---:|---|---:|
| Dữ liệu nhỏ | 20 | 20 | 3–9 | 19/20 | 20 / 0 | 20/20 |
| Thông thường | 15 | 15 | 10–60 | 9/15 | 15 / 0 | 15/15 |
| Biên | 12 | 12 | 1–5000 | 12/12 | 12 / 0 | 11/12 |
| Đặc biệt | 17 | 17 | 7–81 | 11/17 | 16 / 1 | 17/17 |
| Dữ liệu lớn | 14 | 14 | 150–5000 | 4/7 | 4 / 10 | 4/14 |
| Không hợp lệ | 26 | 26 | 5–10 | 2/2 | 2 / 0 | 2/26 |

## Dữ liệu nhỏ

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [nho_01](01_nho/nho_01.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 | 19.1 ms / 89.2 ms | ✓ | ✅ |
| [nho_02](01_nho/nho_02.txt) | 4 | 0 | 1 (vet_can) | 1 | 1 | 19.8 ms / 20.0 ms | ✓ | ✅ |
| [nho_03](01_nho/nho_03.txt) | 5 | 7 | 3 (vet_can) | 3 | 3 | 18.9 ms / 19.4 ms | ✓ | ✅ |
| [nho_04](01_nho/nho_04.txt) | 6 | 11 | 4 (vet_can) | 4 | 4 | 18.5 ms / 19.4 ms | ✓ | ✅ |
| [nho_05](01_nho/nho_05.txt) | 7 | 1 | 2 (vet_can) | 2 | 2 | 19.6 ms / 19.8 ms | ✓ | ✅ |
| [nho_06](01_nho/nho_06.txt) | 8 | 13 | 3 (vet_can) | **4** (+1) | 3 | 19.7 ms / 18.5 ms | ✓ | ✅ |
| [nho_07](01_nho/nho_07.txt) | 9 | 24 | 5 (vet_can) | 5 | 5 | 18.3 ms / 19.1 ms | ✓ | ✅ |
| [nho_08](01_nho/nho_08.txt) | 3 | 3 | 3 (vet_can) | 3 | 3 | 19.9 ms / 20.6 ms | ✓ | ✅ |
| [nho_09](01_nho/nho_09.txt) | 4 | 1 | 2 (vet_can) | 2 | 2 | 21.0 ms / 19.2 ms | ✓ | ✅ |
| [nho_10](01_nho/nho_10.txt) | 5 | 4 | 3 (vet_can) | 3 | 3 | 19.2 ms / 21.4 ms | ✓ | ✅ |
| [nho_11](01_nho/nho_11.txt) | 6 | 9 | 3 (vet_can) | 3 | 3 | 18.7 ms / 19.9 ms | ✓ | ✅ |
| [nho_12](01_nho/nho_12.txt) | 7 | 18 | 5 (vet_can) | 5 | 5 | 18.2 ms / 18.8 ms | ✓ | ✅ |
| [nho_13](01_nho/nho_13.txt) | 8 | 1 | 2 (vet_can) | 2 | 2 | 18.6 ms / 18.7 ms | ✓ | ✅ |
| [nho_14](01_nho/nho_14.txt) | 9 | 12 | 3 (vet_can) | 3 | 3 | 18.3 ms / 20.8 ms | ✓ | ✅ |
| [nho_15](01_nho/nho_15.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 | 24.6 ms / 28.4 ms | ✓ | ✅ |
| [nho_16](01_nho/nho_16.txt) | 4 | 3 | 2 (vet_can) | 2 | 2 | 20.6 ms / 19.3 ms | ✓ | ✅ |
| [nho_17](01_nho/nho_17.txt) | 5 | 1 | 2 (vet_can) | 2 | 2 | 19.7 ms / 19.0 ms | ✓ | ✅ |
| [nho_18](01_nho/nho_18.txt) | 6 | 12 | 4 (vet_can) | 4 | 4 | 19.4 ms / 20.4 ms | ✓ | ✅ |
| [nho_19](01_nho/nho_19.txt) | 7 | 12 | 3 (vet_can) | 3 | 3 | 18.5 ms / 18.0 ms | ✓ | ✅ |
| [nho_20](01_nho/nho_20.txt) | 8 | 23 | 5 (vet_can) | 5 | 5 | 20.2 ms / 18.2 ms | ✓ | ✅ |

## Thông thường

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [khoang_chua](02_thong_thuong/khoang_chua.txt) | 12 | 30 | 4 (de_bai) | 4 | 4 | 18.5 ms / 19.0 ms | ✓ | ✅ |
| [buoi10_slide18](02_thong_thuong/buoi10_slide18.txt) | 10 | 17 | 3 (de_bai) | 3 | 3 | 18.1 ms / 19.7 ms | ✓ | ✅ |
| [so_thu](02_thong_thuong/so_thu.txt) | 10 | 17 | 4 (de_bai) | 4 | 4 | 21.1 ms / 20.9 ms | ✓ | ✅ |
| [lich_thi_20mon](02_thong_thuong/lich_thi_20mon.txt) | 20 | 93 | 6 (kiem_chung) | 6 | 6 | 19.1 ms / 19.3 ms | ✓ | ✅ |
| [lich_thi_30mon](02_thong_thuong/lich_thi_30mon.txt) | 30 | 148 | 6 (kiem_chung) | 6 | 6 | 19.6 ms / 19.4 ms | ✓ | ✅ |
| [lich_thi_40mon](02_thong_thuong/lich_thi_40mon.txt) | 40 | 233 | 6 (kiem_chung) | **7** (+1) | 6 | 19.0 ms / 28.0 ms | ✓ | ✅ |
| [gnp_12_5](02_thong_thuong/gnp_12_5.txt) | 12 | 31 | 4 (kiem_chung) | 4 | 4 | 19.6 ms / 20.8 ms | ✓ | ✅ |
| [gnp_16_4](02_thong_thuong/gnp_16_4.txt) | 16 | 60 | 5 (kiem_chung) | **6** (+1) | 5 | 18.2 ms / 18.4 ms | ✓ | ✅ |
| [gnp_20_3](02_thong_thuong/gnp_20_3.txt) | 20 | 66 | 4 (kiem_chung) | 4 | 4 | 23.4 ms / 24.0 ms | ✓ | ✅ |
| [gnp_25_25](02_thong_thuong/gnp_25_25.txt) | 25 | 67 | 4 (kiem_chung) | 4 | 4 | 21.2 ms / 20.4 ms | ✓ | ✅ |
| [gnp_30_2](02_thong_thuong/gnp_30_2.txt) | 30 | 81 | 4 (kiem_chung) | **5** (+1) | 4 | 23.0 ms / 21.9 ms | ✓ | ✅ |
| [gnp_30_5](02_thong_thuong/gnp_30_5.txt) | 30 | 209 | 7 (kiem_chung) | **8** (+1) | 7 | 20.1 ms / 19.0 ms | ✓ | ✅ |
| [gnp_40_15](02_thong_thuong/gnp_40_15.txt) | 40 | 115 | 4 (kiem_chung) | **5** (+1) | 4 | 19.7 ms / 22.6 ms | ✓ | ✅ |
| [gnp_50_1](02_thong_thuong/gnp_50_1.txt) | 50 | 117 | 4 (kiem_chung) | 4 | 4 | 23.9 ms / 31.2 ms | ✓ | ✅ |
| [gnp_60_08](02_thong_thuong/gnp_60_08.txt) | 60 | 129 | 3 (kiem_chung) | **4** (+1) | 3 | 22.0 ms / 30.0 ms | ✓ | ✅ |

## Biên

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [n1](03_bien/n1.txt) | 1 | 0 | 1 (ly_thuyet) | 1 | 1 | 25.0 ms / 27.3 ms | ✓ | ✅ |
| [n2_mot_canh](03_bien/n2_mot_canh.txt) | 2 | 1 | 2 (ly_thuyet) | 2 | 2 | 28.4 ms / 27.2 ms | ✓ | ✅ |
| [n2_khong_canh](03_bien/n2_khong_canh.txt) | 2 | 0 | 1 (ly_thuyet) | 1 | 1 | 23.3 ms / 20.7 ms | ✓ | ✅ |
| [canh_dinh_cuoi](03_bien/canh_dinh_cuoi.txt) | 5 | 2 | 2 (ly_thuyet) | 2 | 2 | 20.1 ms / 21.8 ms | ✓ | ✅ |
| [n120_khong_canh](03_bien/n120_khong_canh.txt) | 120 | 0 | 1 (ly_thuyet) | 1 | 1 | 23.3 ms / 22.2 ms | ✓ | ✅ |
| [n120_duong_di](03_bien/n120_duong_di.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | 2 | 21.2 ms / 21.4 ms | ✓ | ✅ |
| [n120_hinh_sao](03_bien/n120_hinh_sao.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | 2 | 21.2 ms / 21.6 ms | ✓ | ✅ |
| [n119_chu_trinh_le](03_bien/n119_chu_trinh_le.txt) | 119 | 119 | 3 (ly_thuyet) | 3 | 3 | 21.9 ms / 23.4 ms | ✓ | ✅ |
| [k90](03_bien/k90.txt) | 90 | 4005 | 90 (ly_thuyet) | 90 | 90 | 21.2 ms / 22.0 ms | ✓ | ✅ |
| [k91](03_bien/k91.txt) | 91 | 4095 | 91 (ly_thuyet) | 91 | 91 | 23.6 ms / 23.1 ms | ✓ | ✅ |
| [k120](03_bien/k120.txt) | 120 | 7140 | 120 (ly_thuyet) | 120 | 120 | 26.3 ms / 24.6 ms | ✓ | ✅ |
| [n5000_canh_cuoi](03_bien/n5000_canh_cuoi.txt) | 5000 | 1 | 2 (ly_thuyet) | 2 | 2 | 1.2 s / 1.1 s | — | ✅ |

## Đặc biệt

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [crown_6](04_dac_biet/crown_6.txt) | 12 | 30 | 2 (ly_thuyet) | **6** (+4) | 2 | 23.9 ms / 33.2 ms | ✓ | ✅ |
| [crown_10](04_dac_biet/crown_10.txt) | 20 | 90 | 2 (ly_thuyet) | **10** (+8) | 2 | 24.3 ms / 25.7 ms | ✓ | ✅ |
| [myciel3](04_dac_biet/myciel3.txt) | 11 | 20 | 4 (ly_thuyet) | 4 | 4 | 19.4 ms / 19.6 ms | ✓ | ✅ |
| [myciel4](04_dac_biet/myciel4.txt) | 23 | 71 | 5 (ly_thuyet) | 5 | 5 | 19.0 ms / 21.7 ms | ✓ | ✅ |
| [myciel5](04_dac_biet/myciel5.txt) | 47 | 236 | 6 (ly_thuyet) | 6 | quá thời gian | 20.2 ms / 10.0 s | ✓ | ✅ |
| [petersen](04_dac_biet/petersen.txt) | 10 | 15 | 3 (ly_thuyet) | 3 | 3 | 23.4 ms / 23.6 ms | ✓ | ✅ |
| [c7_le](04_dac_biet/c7_le.txt) | 7 | 7 | 3 (ly_thuyet) | 3 | 3 | 18.4 ms / 19.6 ms | ✓ | ✅ |
| [c8_chan](04_dac_biet/c8_chan.txt) | 8 | 8 | 2 (ly_thuyet) | 2 | 2 | 18.7 ms / 19.8 ms | ✓ | ✅ |
| [banh_xe_w8](04_dac_biet/banh_xe_w8.txt) | 8 | 14 | 4 (ly_thuyet) | 4 | 4 | 21.5 ms / 19.9 ms | ✓ | ✅ |
| [banh_xe_w9](04_dac_biet/banh_xe_w9.txt) | 9 | 16 | 3 (ly_thuyet) | 3 | 3 | 20.3 ms / 20.8 ms | ✓ | ✅ |
| [k_5_7](04_dac_biet/k_5_7.txt) | 12 | 35 | 2 (ly_thuyet) | 2 | 2 | 20.4 ms / 19.6 ms | ✓ | ✅ |
| [cay_40](04_dac_biet/cay_40.txt) | 40 | 39 | 2 (ly_thuyet) | **3** (+1) | 2 | 19.4 ms / 18.8 ms | ✓ | ✅ |
| [khong_lien_thong](04_dac_biet/khong_lien_thong.txt) | 12 | 11 | 4 (ly_thuyet) | 4 | 4 | 21.0 ms / 20.6 ms | ✓ | ✅ |
| [dinh_ke_tat_ca](04_dac_biet/dinh_ke_tat_ca.txt) | 9 | 24 | 3 (ly_thuyet) | 3 | 3 | 20.5 ms / 20.9 ms | ✓ | ✅ |
| [queen5_5](04_dac_biet/queen5_5.txt) | 25 | 160 | 5 (ly_thuyet) | **7** (+2) | 5 | 22.0 ms / 24.0 ms | ✓ | ✅ |
| [queen6_6](04_dac_biet/queen6_6.txt) | 36 | 290 | 7 (ly_thuyet) | **9** (+2) | 7 | 21.5 ms / 23.1 ms | ✓ | ✅ |
| [sudoku](04_dac_biet/sudoku.txt) | 81 | 810 | 9 (ly_thuyet) | **12** (+3) | 9 | 20.7 ms / 20.8 ms | ✓ | ✅ |

## Dữ liệu lớn

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Demo | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [thua_200](05_lon/thua_200.txt) | 200 | 957 | 3 ≤ χ ≤ 6 (cận) | 6 | quá thời gian | 23.6 ms / 10.0 s | ✓ | ✅ |
| [thua_500](05_lon/thua_500.txt) | 500 | 2528 | 3 ≤ χ ≤ 7 (cận) | 7 | quá thời gian | 35.5 ms / 10.0 s | — | ✅ |
| [thua_1000](05_lon/thua_1000.txt) | 1000 | 5027 | 3 ≤ χ ≤ 7 (cận) | 7 | quá thời gian | 77.6 ms / 10.0 s | — | ✅ |
| [thua_2000](05_lon/thua_2000.txt) | 2000 | 9945 | 3 ≤ χ ≤ 7 (cận) | 7 | quá thời gian | 195.3 ms / 10.0 s | — | ✅ |
| [thua_5000](05_lon/thua_5000.txt) | 5000 | 24910 | 3 ≤ χ ≤ 7 (cận) | 7 | quá thời gian | 1.0 s / 10.1 s | — | ✅ |
| [day_300](05_lon/day_300.txt) | 300 | 22636 | 12 ≤ χ ≤ 47 (cận) | 47 | quá thời gian | 27.5 ms / 10.0 s | ✓ | ✅ |
| [day_1000](05_lon/day_1000.txt) | 1000 | 50051 | 6 ≤ χ ≤ 28 (cận) | 28 | quá thời gian | 69.6 ms / 10.0 s | — | ✅ |
| [cai_san_1000_k5](05_lon/cai_san_1000_k5.txt) | 1000 | 12117 | 5 (cai_san) | **11** (+6) | quá thời gian | 64.7 ms / 10.0 s | — | ✅ |
| [cai_san_2000_k8](05_lon/cai_san_2000_k8.txt) | 2000 | 10614 | 8 (cai_san) | 8 | quá thời gian | 193.0 ms / 10.0 s | — | ✅ |
| [luong_phan_2000](05_lon/luong_phan_2000.txt) | 2000 | 2980 | 2 (cai_san) | **4** (+2) | quá thời gian | 186.7 ms / 10.0 s | — | ✅ |
| [crown_100](05_lon/crown_100.txt) | 200 | 9900 | 2 (ly_thuyet) | **100** (+98) | 2 | 20.8 ms / 45.4 ms | ✓ | ✅ |
| [k150](05_lon/k150.txt) | 150 | 11175 | 150 (ly_thuyet) | 150 | 150 | 20.0 ms / 19.5 ms | ✓ | ✅ |
| [chu_trinh_1999](05_lon/chu_trinh_1999.txt) | 1999 | 1999 | 3 (ly_thuyet) | 3 | 3 | 183.9 ms / 172.8 ms | — | ✅ |
| [duong_di_2000](05_lon/duong_di_2000.txt) | 2000 | 1999 | 2 (ly_thuyet) | 2 | 2 | 199.7 ms / 174.9 ms | — | ✅ |

## Không hợp lệ

| Test | Mô tả | Mong đợi | kiem_tra.cpp báo | Kết quả |
|---|---|---|---|---|
| [rong](06_khong_hop_le/rong.txt) | File rỗng | lỗi "Chưa có dữ liệu" | 1 lỗi: Chưa có dữ liệu: dòng đầu là số đỉnh n. | ✅ |
| [chi_chu_thich](06_khong_hop_le/chi_chu_thich.txt) | Chỉ có chú thích "#", không có dữ liệu | lỗi "chú thích" | 1 lỗi: Dòng 1: không dùng chú thích "#", mỗi dòng chỉ gồm các số. | ✅ |
| [dong_dau_chu](06_khong_hop_le/dong_dau_chu.txt) | Dòng đầu là chữ | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_am](06_khong_hop_le/n_am.txt) | n âm | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_bang_0](06_khong_hop_le/n_bang_0.txt) | n = 0 | lỗi "phải ≥ 1" | 1 lỗi: Số đỉnh n phải ≥ 1. | ✅ |
| [n_so_thuc](06_khong_hop_le/n_so_thuc.txt) | n là số thực | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [n_qua_lon](06_khong_hop_le/n_qua_lon.txt) | n = 5001 vượt giới hạn MAX_N = 5000 | lỗi "quá lớn" | 1 lỗi: n = 5001 quá lớn (tối đa 5000, giới hạn mảng MAXN của code C++). | ✅ |
| [thieu_dong_n](06_khong_hop_le/thieu_dong_n.txt) | Quên dòng n, nhập thẳng ma trận | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [dong_dau_n_K](06_khong_hop_le/dong_dau_n_K.txt) | Dòng đầu kiểu cũ "n K" (có số ngăn) → lỗi, chương trình tự tính số ngăn | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [danh_sach_canh](06_khong_hop_le/danh_sach_canh.txt) | Nhập danh sách cạnh "u v" thay cho ma trận kề (C₄) | lỗi "không nhập danh sách cạnh" | 4 lỗi: Dòng 2 (hàng 0): có 2 số, cần đúng 4 số (mỗi hàng của ma trận kề có đủ n số 0/1, không nhập danh sách cạnh "u v" hay danh sách kề). | ✅ |
| [danh_sach_ke](06_khong_hop_le/danh_sach_ke.txt) | Nhập danh sách kề (mỗi hàng là các đỉnh kề) thay cho ma trận kề | lỗi "cần đúng 3 số" | 3 lỗi: Dòng 2 (hàng 0): có 2 số, cần đúng 3 số (mỗi hàng của ma trận kề có đủ n số 0/1, không nhập danh sách cạnh "u v" hay danh sách kề). | ✅ |
| [dimacs](06_khong_hop_le/dimacs.txt) | Định dạng DIMACS (p edge / e u v) không được nhận | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n" (đúng một số nguyên). | ✅ |
| [chu_thich_cuoi_dong](06_khong_hop_le/chu_thich_cuoi_dong.txt) | Chú thích "#" cuối một hàng | lỗi "chú thích" | 1 lỗi: Dòng 2: không dùng chú thích "#", mỗi dòng chỉ gồm các số. | ✅ |
| [gia_tri_2](06_khong_hop_le/gia_tri_2.txt) | Phần tử 2 (ma trận kề chỉ gồm 0 và 1) | lỗi "chỉ gồm 0 và 1" | 2 lỗi: Dòng 2 (hàng 0): cột 1 là "2" — ma trận kề chỉ gồm 0 và 1. | ✅ |
| [token_chu](06_khong_hop_le/token_chu.txt) | Phần tử là chữ | lỗi "chỉ gồm 0 và 1" | 1 lỗi: Dòng 2 (hàng 0): cột 1 là "x" — ma trận kề chỉ gồm 0 và 1. | ✅ |
| [so_thuc](06_khong_hop_le/so_thuc.txt) | Phần tử là số thực | lỗi "chỉ gồm 0 và 1" | 1 lỗi: Dòng 2 (hàng 0): cột 1 là "0.5" — ma trận kề chỉ gồm 0 và 1. | ✅ |
| [so_am](06_khong_hop_le/so_am.txt) | Phần tử âm | lỗi "chỉ gồm 0 và 1" | 1 lỗi: Dòng 2 (hàng 0): cột 1 là "-1" — ma trận kề chỉ gồm 0 và 1. | ✅ |
| [hang_thieu_so](06_khong_hop_le/hang_thieu_so.txt) | Một hàng thiếu số (2 số khi n = 3) | lỗi "cần đúng 3 số" | 1 lỗi: Dòng 3 (hàng 1): có 2 số, cần đúng 3 số (mỗi hàng của ma trận kề có đủ n số 0/1, không nhập danh sách cạnh "u v" hay danh sách kề). | ✅ |
| [hang_thua_so](06_khong_hop_le/hang_thua_so.txt) | Một hàng thừa số (4 số khi n = 3) | lỗi "cần đúng 3 số" | 1 lỗi: Dòng 2 (hàng 0): có 4 số, cần đúng 3 số. | ✅ |
| [thieu_hang](06_khong_hop_le/thieu_hang.txt) | Thiếu hàng (2 hàng khi n = 3) | lỗi "Thiếu hàng" | 1 lỗi: Thiếu hàng: ma trận kề 3×3 cần 3 hàng, mới có 2 hàng. | ✅ |
| [thua_hang](06_khong_hop_le/thua_hang.txt) | Thừa hàng (3 hàng khi n = 2) | lỗi "thừa hàng" | 1 lỗi: Dòng 4: thừa hàng — ma trận kề 2×2 chỉ có 2 hàng. | ✅ |
| [khuyen](06_khong_hop_le/khuyen.txt) | Khuyên: a[1][1] = 1 (đường chéo phải toàn 0) | lỗi "khuyên" | 1 lỗi: Dòng 3: a[1][1] = 1 là khuyên — một mẫu không thể phản ứng với chính nó (đường chéo phải toàn 0). | ✅ |
| [khong_doi_xung](06_khong_hop_le/khong_doi_xung.txt) | Không đối xứng: a[0][2] = 1 nhưng a[2][0] = 0 | lỗi "đối xứng" | 1 lỗi: Dòng 2: a[0][2] = 1 nhưng a[2][0] = 0 (dòng 4) — ma trận kề phải đối xứng. | ✅ |
| [nhieu_loi](06_khong_hop_le/nhieu_loi.txt) | Nhiều lỗi cùng lúc: chữ, hàng thiếu số, hàng thừa số | lỗi "chỉ gồm 0 và 1" | 3 lỗi: Dòng 3 (hàng 1): cột 2 là "x" — ma trận kề chỉ gồm 0 và 1. | ✅ |
| [crlf_tab_dong_trong](06_khong_hop_le/crlf_tab_dong_trong.txt) | Hợp lệ: xuống dòng Windows (CRLF), tab, dòng trống — C₅ (giống cin của C++, vẫn nhận) | hợp lệ, χ = 3 | hợp lệ · tham lam 3, quay lui 3 | ✅ |
| [khoang_trang_thua](06_khong_hop_le/khoang_trang_thua.txt) | Hợp lệ: khoảng trắng đầu dòng, nhiều dấu cách giữa các số, dòng trống cuối file — Petersen | hợp lệ, χ = 3 | hợp lệ · tham lam 3, quay lui 3 | ✅ |
