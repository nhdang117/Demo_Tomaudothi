# Chromatic Cargo — prototype

Demo trực quan hóa bài toán Khoang chứa vật chất (tô màu đồ thị, biến thể của bài Sở thú) cho bài tập lớn.

## Cấu trúc

| File | Vai trò |
|---|---|
| `solver.js` | Bộ giải + sinh trace từng bước cho 2 thuật toán: Tham lam theo bài giảng Buổi 10 (tô đỉnh bậc cao nhất trước, thử lại các màu đã dùng, đỉnh kề giảm bậc) và Quay lui tìm χ theo mô hình `try(i)` của GV (giữ lời giải tốt nhất `kmin`, phá đối xứng, cắt tỉa). Đọc input (dòng đầu "n", danh sách cạnh hoặc DIMACS; số ngăn do chương trình tự tính), đồ thị mẫu, sinh ngẫu nhiên G(n, p). Chạy được cả trong trình duyệt và Node. |
| `main.js` | Lớp hiển thị: cảnh 3D (Three.js), panel code (tiêu đề là ô sổ xuống chọn Tham lam / Quay lui, đổi là tính lại trace; công tắc **Mã giả ⇄ C++** trên header đổi nội dung panel, trace vẫn tô sáng đúng dòng nhờ bảng `cppLine` trong `solver.js`, lựa chọn được nhớ trong localStorage), log trace, player, panel tuỳ chọn, các section cuộn, bảng so sánh. Phần Demo có thêm **Ma trận kề** (dòng đỉnh đang xét, ô hạ bậc / trùng màu, cột Σ = bậc) và **Bảng tính tay** (tham lam: mỗi dòng là bảng bậc lúc chọn đỉnh như bảng cô chạy tay; quay lui: **cây quay lui** SVG dựng từ trace theo kiểu file Tuần 6 `sinh_hoanvi_neon_responsive.html` — nút sáng/xanh chọn/đỏ loại/vàng lời giải/mờ đã quay lui, kéo để di chuyển, lăn chuột để phóng to, "Vừa khung", tự bám nút đang xét). Màn đủ rộng thì 2 bảng mở thành cột cạnh đồ thị; thiếu chỗ thì thu thành 2 nút ở góc đồ thị, bấm để mở đè lên (Esc đóng). **Log trace** nằm ở cột phải dưới HUD: mỗi bước một dòng ghi biến nào đổi (`v = 11 · deg[v] = 11`, `color[11] = 0`, `deg[4] 7→6`…), dòng bước hiện tại sáng, bấm dòng để về bước đó, chỉ giữ 300 dòng gần nhất; màn hẹp (≤ 820px) thì log về dưới khung code. Các nút công cụ (Tuỳ chọn, Làm phẳng 2D, Tách ngăn, Bám theo đỉnh, −, +, Góc nhìn) là một hàng ngang ở đáy vùng đồ thị. |
| `page.html` | Khung HTML + CSS gốc, có 2 chỗ giữ chỗ `/*__SOLVER__*/` và `/*__MAIN__*/`. |
| `frost.css` | Lớp nền sáng (sương băng) mà Lumen kế thừa. |
| `lumen.css` | Cải biên Frost: nền trắng gradient hiện đại (mesh pastel chàm–tím–hồng), tấm kính bo tròn, nút gradient. Nạp sau `frost.css`; khi có `window.LOOK = 'lumen'`, `main.js` giữ toàn bộ hành vi Frost nhưng canvas 3D trong suốt, cạnh màu chàm, bụi nền pastel. |
| `build.py` | Ghép các file trên thành trang độc lập `index.html` (bản Lumen). |
| `index.html` | Trang đã build, là trang GitHub Pages phục vụ. |
| `test.js` | Kiểm thử tự động bộ giải (167 kiểm tra, gồm đối chiếu trace với bảng bậc cô chạy tay ở slide 18; nếu máy có `g++` thì biên dịch code C++ trên panel với `-Wall -Wextra`, chạy trên 48 đồ thị và so số màu + cách tô với solver). |

## Chạy

```bash
node test.js          # kiểm thử bộ giải
python3 build.py      # tạo index.html
```

Mở `index.html` qua một web server tĩnh (ví dụ `npx serve .`), vì trang tải Three.js và Lenis từ CDN jsDelivr.

## Định dạng trace

Mỗi bước là một object: `line` (dòng code đang chạy), `type` (tham lam: `select`, `try`, `conflict`, `ok`, `newcolor`, `assign`, `mark`, `dec`; quay lui: `select`, `conflict`, `sym` (phá đối xứng), `prune` (cắt tỉa theo kmin), `assign`, `found` (lời giải tốt hơn, cập nhật kmin), `backtrack`, `fail`; chung: `init`, `done`), `v`, `u`, `c`, `deg`, `ties` (các đỉnh hòa bậc), `us` (các đỉnh vừa hạ bậc), `degs` (ảnh chụp bảng bậc, chỉ tham lam), `order` (thứ tự xét đỉnh, chỉ ở bước `init` của quay lui), `k`, `kmin` (lời giải tốt nhất hiện hành, chỉ quay lui), `depth`, `backtracks`, `note` (ghi chú tiếng Việt), `colors` (trạng thái màu sau bước đó), `used` (số màu đã dùng).
