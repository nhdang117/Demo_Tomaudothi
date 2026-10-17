# Kết quả chạy bộ testcase

Chạy lúc 2026-10-17T15:47:19.035Z · Node v24.19.0 · AMD Ryzen 5 PRO 5650U with Radeon Graphics (12 luồng, 6.8 GB RAM) · Windows_NT 10.0.26200 x64

**100/100 testcase đạt** (20.4 s). Sinh lại: `node gen_tests.js` · chạy lại: `node run_tests.js`.

| Nhóm | Số test | Đạt | n | Tham lam đạt χ | Quay lui xong / vượt ngân sách |
|---|---:|---:|---|---:|---|
| Dữ liệu nhỏ | 20 | 20 | 3–9 | 19/20 | 20 / 0 |
| Thông thường | 15 | 15 | 10–60 | 9/15 | 15 / 0 |
| Biên | 11 | 11 | 1–120 | 11/11 | 5 / 0 |
| Đặc biệt | 17 | 17 | 7–81 | 11/17 | 16 / 1 |
| Dữ liệu lớn | 14 | 14 | 150–5000 | 4/7 | 0 / 0 |
| Không hợp lệ / cảnh báo | 23 | 23 | 3–5 | 5/5 | 5 / 0 |

## Dữ liệu nhỏ

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [nho_01](01_nho/nho_01.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 · 3 lời gọi | 14 µs / 17 µs | khớp | ✅ |
| [nho_02](01_nho/nho_02.txt) | 4 | 0 | 1 (vet_can) | 1 | 1 · 4 lời gọi | 5 µs / 6 µs | khớp | ✅ |
| [nho_03](01_nho/nho_03.txt) | 5 | 7 | 3 (vet_can) | 3 | 3 · 5 lời gọi | 3 µs / 7 µs | khớp | ✅ |
| [nho_04](01_nho/nho_04.txt) | 6 | 11 | 4 (vet_can) | 4 | 4 · 6 lời gọi | 9 µs / 5 µs | khớp | ✅ |
| [nho_05](01_nho/nho_05.txt) | 7 | 1 | 2 (vet_can) | 2 | 2 · 7 lời gọi | 7 µs / 3 µs | khớp | ✅ |
| [nho_06](01_nho/nho_06.txt) | 8 | 13 | 3 (vet_can) | **4** (+1) | 3 · 12 lời gọi | 7 µs / 6 µs | khớp | ✅ |
| [nho_07](01_nho/nho_07.txt) | 9 | 24 | 5 (vet_can) | 5 | 5 · 13 lời gọi | 9 µs / 9 µs | khớp | ✅ |
| [nho_08](01_nho/nho_08.txt) | 3 | 3 | 3 (vet_can) | 3 | 3 · 3 lời gọi | 2 µs / 3 µs | khớp | ✅ |
| [nho_09](01_nho/nho_09.txt) | 4 | 1 | 2 (vet_can) | 2 | 2 · 4 lời gọi | 4 µs / 6 µs | khớp | ✅ |
| [nho_10](01_nho/nho_10.txt) | 5 | 4 | 3 (vet_can) | 3 | 3 · 5 lời gọi | 3 µs / 7 µs | khớp | ✅ |
| [nho_11](01_nho/nho_11.txt) | 6 | 9 | 3 (vet_can) | 3 | 3 · 6 lời gọi | 3 µs / 31 µs | khớp | ✅ |
| [nho_12](01_nho/nho_12.txt) | 7 | 18 | 5 (vet_can) | 5 | 5 · 7 lời gọi | 3 µs / 5 µs | khớp | ✅ |
| [nho_13](01_nho/nho_13.txt) | 8 | 1 | 2 (vet_can) | 2 | 2 · 8 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [nho_14](01_nho/nho_14.txt) | 9 | 12 | 3 (vet_can) | 3 | 3 · 10 lời gọi | 4 µs / 5 µs | khớp | ✅ |
| [nho_15](01_nho/nho_15.txt) | 3 | 1 | 2 (vet_can) | 2 | 2 · 3 lời gọi | 1 µs / 1 µs | khớp | ✅ |
| [nho_16](01_nho/nho_16.txt) | 4 | 3 | 2 (vet_can) | 2 | 2 · 4 lời gọi | 1 µs / 2 µs | khớp | ✅ |
| [nho_17](01_nho/nho_17.txt) | 5 | 1 | 2 (vet_can) | 2 | 2 · 5 lời gọi | 2 µs / 2 µs | khớp | ✅ |
| [nho_18](01_nho/nho_18.txt) | 6 | 12 | 4 (vet_can) | 4 | 4 · 6 lời gọi | 3 µs / 2 µs | khớp | ✅ |
| [nho_19](01_nho/nho_19.txt) | 7 | 12 | 3 (vet_can) | 3 | 3 · 7 lời gọi | 2 µs / 2 µs | khớp | ✅ |
| [nho_20](01_nho/nho_20.txt) | 8 | 23 | 5 (vet_can) | 5 | 5 · 8 lời gọi | 2 µs / 3 µs | khớp | ✅ |

## Thông thường

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [khoang_chua](02_thong_thuong/khoang_chua.txt) | 12 | 30 | 4 (de_bai) | 4 | 4 · 13 lời gọi | 11 µs / 5 µs | khớp | ✅ |
| [buoi10_slide18](02_thong_thuong/buoi10_slide18.txt) | 10 | 17 | 3 (de_bai) | 3 | 3 · 10 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [so_thu](02_thong_thuong/so_thu.txt) | 10 | 17 | 4 (de_bai) | 4 | 4 · 10 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [lich_thi_20mon](02_thong_thuong/lich_thi_20mon.txt) | 20 | 93 | 6 (kiem_chung) | 6 | 6 · 29 lời gọi | 11 µs / 22 µs | khớp | ✅ |
| [lich_thi_30mon](02_thong_thuong/lich_thi_30mon.txt) | 30 | 148 | 6 (kiem_chung) | 6 | 6 · 591 lời gọi | 12 µs / 226 µs | khớp | ✅ |
| [lich_thi_40mon](02_thong_thuong/lich_thi_40mon.txt) | 40 | 233 | 6 (kiem_chung) | **7** (+1) | 6 · 33,364 lời gọi | 19 µs / 18.0 ms | cắt | ✅ |
| [gnp_12_5](02_thong_thuong/gnp_12_5.txt) | 12 | 31 | 4 (kiem_chung) | 4 | 4 · 12 lời gọi | 5 µs / 6 µs | khớp | ✅ |
| [gnp_16_4](02_thong_thuong/gnp_16_4.txt) | 16 | 60 | 5 (kiem_chung) | **6** (+1) | 5 · 61 lời gọi | 5 µs / 18 µs | khớp | ✅ |
| [gnp_20_3](02_thong_thuong/gnp_20_3.txt) | 20 | 66 | 4 (kiem_chung) | 4 | 4 · 22 lời gọi | 6 µs / 6 µs | khớp | ✅ |
| [gnp_25_25](02_thong_thuong/gnp_25_25.txt) | 25 | 67 | 4 (kiem_chung) | 4 | 4 · 240 lời gọi | 7 µs / 36 µs | khớp | ✅ |
| [gnp_30_2](02_thong_thuong/gnp_30_2.txt) | 30 | 81 | 4 (kiem_chung) | **5** (+1) | 4 · 284 lời gọi | 9 µs / 43 µs | khớp | ✅ |
| [gnp_30_5](02_thong_thuong/gnp_30_5.txt) | 30 | 209 | 7 (kiem_chung) | **8** (+1) | 7 · 181 lời gọi | 12 µs / 61 µs | khớp | ✅ |
| [gnp_40_15](02_thong_thuong/gnp_40_15.txt) | 40 | 115 | 4 (kiem_chung) | **5** (+1) | 4 · 1,471 lời gọi | 29 µs / 1.38 ms | khớp | ✅ |
| [gnp_50_1](02_thong_thuong/gnp_50_1.txt) | 50 | 117 | 4 (kiem_chung) | 4 | 4 · 36,761 lời gọi | 25 µs / 11.4 ms | cắt | ✅ |
| [gnp_60_08](02_thong_thuong/gnp_60_08.txt) | 60 | 129 | 3 (kiem_chung) | **4** (+1) | 3 · 22,084 lời gọi | 29 µs / 4.12 ms | cắt | ✅ |

## Biên

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [n1](03_bien/n1.txt) | 1 | 0 | 1 (ly_thuyet) | 1 | 1 · 1 lời gọi | 1 µs / 1 µs | khớp | ✅ |
| [n2_mot_canh](03_bien/n2_mot_canh.txt) | 2 | 1 | 2 (ly_thuyet) | 2 | 2 · 2 lời gọi | 1 µs / 2 µs | khớp | ✅ |
| [n2_khong_canh](03_bien/n2_khong_canh.txt) | 2 | 0 | 1 (ly_thuyet) | 1 | 1 · 2 lời gọi | 2 µs / 2 µs | khớp | ✅ |
| [canh_dinh_cuoi](03_bien/canh_dinh_cuoi.txt) | 5 | 2 | 2 (ly_thuyet) | 2 | 2 · 5 lời gọi | 2 µs / 2 µs | khớp | ✅ |
| [n120_khong_canh](03_bien/n120_khong_canh.txt) | 120 | 0 | 1 (ly_thuyet) | 1 | bỏ qua | 50 µs / — | khớp | ✅ |
| [n120_duong_di](03_bien/n120_duong_di.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | bỏ qua | 51 µs / — | khớp | ✅ |
| [n120_hinh_sao](03_bien/n120_hinh_sao.txt) | 120 | 119 | 2 (ly_thuyet) | 2 | bỏ qua | 87 µs / — | khớp | ✅ |
| [n119_chu_trinh_le](03_bien/n119_chu_trinh_le.txt) | 119 | 119 | 3 (ly_thuyet) | 3 | bỏ qua | 68 µs / — | khớp | ✅ |
| [k90](03_bien/k90.txt) | 90 | 4005 | 90 (ly_thuyet) | 90 | 90 · 90 lời gọi | 800 µs / 925 µs | khớp | ✅ |
| [k91](03_bien/k91.txt) | 91 | 4095 | 91 (ly_thuyet) | 91 | bỏ qua | 492 µs / — | khớp | ✅ |
| [k120](03_bien/k120.txt) | 120 | 7140 | 120 (ly_thuyet) | 120 | bỏ qua | 1.67 ms / — | khớp | ✅ |

## Đặc biệt

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [crown_6](04_dac_biet/crown_6.txt) | 12 | 30 | 2 (ly_thuyet) | **6** (+4) | 2 · 40 lời gọi | 8 µs / 78 µs | khớp | ✅ |
| [crown_10](04_dac_biet/crown_10.txt) | 20 | 90 | 2 (ly_thuyet) | **10** (+8) | 2 · 108 lời gọi | 14 µs / 38 µs | khớp | ✅ |
| [myciel3](04_dac_biet/myciel3.txt) | 11 | 20 | 4 (ly_thuyet) | 4 | 4 · 82 lời gọi | 6 µs / 18 µs | khớp | ✅ |
| [myciel4](04_dac_biet/myciel4.txt) | 23 | 71 | 5 (ly_thuyet) | 5 | 5 · 32,373 lời gọi | 12 µs / 10.1 ms | cắt | ✅ |
| [myciel5](04_dac_biet/myciel5.txt) | 47 | 236 | 6 (ly_thuyet) | 6 | vượt ngân sách | 22 µs / 233.9 ms | khớp | ✅ |
| [petersen](04_dac_biet/petersen.txt) | 10 | 15 | 3 (ly_thuyet) | 3 | 3 · 10 lời gọi | 3 µs / 8 µs | khớp | ✅ |
| [c7_le](04_dac_biet/c7_le.txt) | 7 | 7 | 3 (ly_thuyet) | 3 | 3 · 7 lời gọi | 4 µs / 2 µs | khớp | ✅ |
| [c8_chan](04_dac_biet/c8_chan.txt) | 8 | 8 | 2 (ly_thuyet) | 2 | 2 · 8 lời gọi | 2 µs / 5 µs | khớp | ✅ |
| [banh_xe_w8](04_dac_biet/banh_xe_w8.txt) | 8 | 14 | 4 (ly_thuyet) | 4 | 4 · 8 lời gọi | 3 µs / 4 µs | khớp | ✅ |
| [banh_xe_w9](04_dac_biet/banh_xe_w9.txt) | 9 | 16 | 3 (ly_thuyet) | 3 | 3 · 9 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [k_5_7](04_dac_biet/k_5_7.txt) | 12 | 35 | 2 (ly_thuyet) | 2 | 2 · 12 lời gọi | 8 µs / 7 µs | khớp | ✅ |
| [cay_40](04_dac_biet/cay_40.txt) | 40 | 39 | 2 (ly_thuyet) | **3** (+1) | 2 · 82 lời gọi | 36 µs / 28 µs | khớp | ✅ |
| [khong_lien_thong](04_dac_biet/khong_lien_thong.txt) | 12 | 11 | 4 (ly_thuyet) | 4 | 4 · 12 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [dinh_ke_tat_ca](04_dac_biet/dinh_ke_tat_ca.txt) | 9 | 24 | 3 (ly_thuyet) | 3 | 3 · 9 lời gọi | 3 µs / 3 µs | khớp | ✅ |
| [queen5_5](04_dac_biet/queen5_5.txt) | 25 | 160 | 5 (ly_thuyet) | **7** (+2) | 5 · 63 lời gọi | 9 µs / 17 µs | khớp | ✅ |
| [queen6_6](04_dac_biet/queen6_6.txt) | 36 | 290 | 7 (ly_thuyet) | **9** (+2) | 7 · 12,523 lời gọi | 17 µs / 5.12 ms | cắt | ✅ |
| [sudoku](04_dac_biet/sudoku.txt) | 81 | 810 | 9 (ly_thuyet) | **12** (+3) | 9 · 816 lời gọi | 95 µs / 1.27 ms | khớp | ✅ |

## Dữ liệu lớn

| Test | n | m | χ mong đợi (nguồn) | Tham lam | Quay lui | Thời gian tham lam / quay lui | Trace | Kết quả |
|---|---:|---:|---|---:|---|---|---|---|
| [thua_200](05_lon/thua_200.txt) | 200 | 957 | 3 ≤ χ ≤ 6 (cận) | 6 | bỏ qua | 166 µs / — | — | ✅ |
| [thua_500](05_lon/thua_500.txt) | 500 | 2528 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | 803 µs / — | — | ✅ |
| [thua_1000](05_lon/thua_1000.txt) | 1000 | 5027 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | 3.09 ms / — | — | ✅ |
| [thua_2000](05_lon/thua_2000.txt) | 2000 | 9945 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | 9.57 ms / — | — | ✅ |
| [thua_5000](05_lon/thua_5000.txt) | 5000 | 24910 | 3 ≤ χ ≤ 7 (cận) | 7 | bỏ qua | 116.4 ms / — | — | ✅ |
| [day_300](05_lon/day_300.txt) | 300 | 22636 | 12 ≤ χ ≤ 47 (cận) | 47 | bỏ qua | 1.66 ms / — | — | ✅ |
| [day_1000](05_lon/day_1000.txt) | 1000 | 50051 | 6 ≤ χ ≤ 28 (cận) | 28 | bỏ qua | 5.14 ms / — | — | ✅ |
| [cai_san_1000_k5](05_lon/cai_san_1000_k5.txt) | 1000 | 12117 | 5 (cai_san) | **11** (+6) | bỏ qua | 3.18 ms / — | — | ✅ |
| [cai_san_3000_k8](05_lon/cai_san_3000_k8.txt) | 3000 | 15904 | 8 (cai_san) | 8 | bỏ qua | 22.9 ms / — | — | ✅ |
| [luong_phan_2000](05_lon/luong_phan_2000.txt) | 2000 | 2980 | 2 (cai_san) | **4** (+2) | bỏ qua | 9.29 ms / — | — | ✅ |
| [crown_100](05_lon/crown_100.txt) | 200 | 9900 | 2 (ly_thuyet) | **100** (+98) | bỏ qua | 1.35 ms / — | — | ✅ |
| [k150](05_lon/k150.txt) | 150 | 11175 | 150 (ly_thuyet) | 150 | bỏ qua | 2.41 ms / — | — | ✅ |
| [chu_trinh_4999](05_lon/chu_trinh_4999.txt) | 4999 | 4999 | 3 (ly_thuyet) | 3 | bỏ qua | 46.3 ms / — | — | ✅ |
| [duong_di_5000](05_lon/duong_di_5000.txt) | 5000 | 4999 | 2 (ly_thuyet) | 2 | bỏ qua | 43.7 ms / — | — | ✅ |

## Không hợp lệ / cảnh báo

| Test | Mô tả | Mong đợi | Hệ thống báo | Kết quả |
|---|---|---|---|---|
| [rong](06_khong_hop_le/rong.txt) | File rỗng | lỗi "Chưa có dữ liệu" | 1 lỗi: Chưa có dữ liệu: dòng đầu là số đỉnh n. | ✅ |
| [chi_chu_thich](06_khong_hop_le/chi_chu_thich.txt) | Chỉ có chú thích, không có dữ liệu | lỗi "Chưa có dữ liệu" | 1 lỗi: Chưa có dữ liệu: dòng đầu là số đỉnh n. | ✅ |
| [dong_dau_chu](06_khong_hop_le/dong_dau_chu.txt) | Dòng đầu là chữ | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n". | ✅ |
| [n_am](06_khong_hop_le/n_am.txt) | n âm | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n". | ✅ |
| [n_bang_0](06_khong_hop_le/n_bang_0.txt) | n = 0 | lỗi "phải ≥ 1" | 1 lỗi: Số đỉnh n phải ≥ 1. | ✅ |
| [n_qua_lon](06_khong_hop_le/n_qua_lon.txt) | n = 121 vượt giới hạn giao diện | lỗi "quá lớn" | 1 lỗi: n = 121 quá lớn cho demo 3D (tối đa 120). | ✅ |
| [dong_dau_3_so](06_khong_hop_le/dong_dau_3_so.txt) | Dòng đầu có 3 số | lỗi "dòng đầu phải là số mẫu" | 1 lỗi: Dòng 1: dòng đầu phải là số mẫu "n". | ✅ |
| [khuyen](06_khong_hop_le/khuyen.txt) | Khuyên 2–2 | lỗi "khuyên" | 1 lỗi: Dòng 3: khuyên 2–2 không hợp lệ (một mẫu không thể phản ứng với chính nó). | ✅ |
| [dinh_ngoai_pham_vi](06_khong_hop_le/dinh_ngoai_pham_vi.txt) | Đỉnh 4 khi n = 4 (đỉnh đánh số 0..3) | lỗi "ngoài phạm vi" | 1 lỗi: Dòng 3: đỉnh 4 nằm ngoài phạm vi 0..3. | ✅ |
| [dinh_am](06_khong_hop_le/dinh_am.txt) | Đỉnh âm | lỗi "ngoài phạm vi" | 1 lỗi: Dòng 2: đỉnh -1 nằm ngoài phạm vi 0..3. | ✅ |
| [token_chu](06_khong_hop_le/token_chu.txt) | Cạnh có chữ | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 x" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [so_thuc](06_khong_hop_le/so_thuc.txt) | Cạnh có số thực | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 1.5" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [ba_so_tren_dong](06_khong_hop_le/ba_so_tren_dong.txt) | Dòng cạnh có 3 số | lỗi "phải gồm đúng 2 số nguyên" | 1 lỗi: Dòng 2: "0 1 2" phải gồm đúng 2 số nguyên "u v". | ✅ |
| [dimacs_e_truoc_p](06_khong_hop_le/dimacs_e_truoc_p.txt) | DIMACS: cạnh "e" đứng trước dòng "p" | lỗi "trước dòng" | 1 lỗi: Dòng 1: cạnh xuất hiện trước dòng "p edge n m". | ✅ |
| [dimacs_p_sai](06_khong_hop_le/dimacs_p_sai.txt) | DIMACS: dòng "p" thiếu số đỉnh | lỗi "p edge n m" | 1 lỗi: Dòng 1: dòng "p" phải có dạng "p edge n m". | ✅ |
| [dimacs_e_thieu](06_khong_hop_le/dimacs_e_thieu.txt) | DIMACS: dòng "e" thiếu đỉnh | lỗi "e u v" | 1 lỗi: Dòng 2: "e 1" phải có dạng "e u v". | ✅ |
| [dimacs_dinh_0](06_khong_hop_le/dimacs_dinh_0.txt) | DIMACS đánh số từ 1, đỉnh 0 không hợp lệ | lỗi "ngoài phạm vi" | 1 lỗi: Dòng 2: đỉnh 0 nằm ngoài phạm vi 1..3. | ✅ |
| [nhieu_loi](06_khong_hop_le/nhieu_loi.txt) | Nhiều lỗi cùng lúc: khuyên, ngoài phạm vi, chữ | lỗi "khuyên" | 3 lỗi: Dòng 3: khuyên 1–1 không hợp lệ (một mẫu không thể phản ứng với chính nó). | ✅ |
| [canh_lap](06_khong_hop_le/canh_lap.txt) | Cạnh lặp → bỏ qua, cảnh báo | cảnh báo "bị lặp", χ = 2 | 1 cảnh báo: Dòng 4: cạnh 0–1 bị lặp, đã bỏ qua. · quay lui 2 | ✅ |
| [canh_lap_dao](06_khong_hop_le/canh_lap_dao.txt) | Cạnh lặp đảo chiều (1 0 sau 0 1) | cảnh báo "bị lặp", χ = 3 | 1 cảnh báo: Dòng 3: cạnh 1–0 bị lặp, đã bỏ qua. · quay lui 3 | ✅ |
| [dong_dau_n_K](06_khong_hop_le/dong_dau_n_K.txt) | Dòng đầu kiểu cũ "n K" → bỏ qua K, cảnh báo | cảnh báo "không cần nhập số ngăn", χ = 2 | 1 cảnh báo: Dòng 1: không cần nhập số ngăn, chương trình tự xếp nên đã bỏ qua "2". · quay lui 2 | ✅ |
| [dimacs_m_sai](06_khong_hop_le/dimacs_m_sai.txt) | DIMACS khai m = 5 nhưng chỉ có 2 cạnh | cảnh báo "khai báo m = 5", χ = 2 | 1 cảnh báo: Dòng "p" khai báo m = 5 nhưng đọc được 2 cạnh khác nhau. · quay lui 2 | ✅ |
| [crlf_tab_chu_thich](06_khong_hop_le/crlf_tab_chu_thich.txt) | Xuống dòng Windows (CRLF), tab, dòng trống, chú thích cuối dòng — C₅ hợp lệ | hợp lệ, χ = 3 | 0 cảnh báo · quay lui 3 | ✅ |
