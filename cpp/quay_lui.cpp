// Quay lui: tìm số màu ít nhất χ(G) (mô hình try(i), giữ lời giải tốt nhất)
// Bản KẾT QUẢ: cùng thuật toán với bản _log.cpp, bỏ mọi lệnh in log, chỉ in kết quả cuối cùng.
// Sinh tự động từ solver.js bởi cpp/export_cpp.js — đừng sửa tay.
// Input (stdin): dòng đầu n (1 ≤ n ≤ 5000), sau đó ma trận kề n hàng × n số 0/1 (a[u][v] = 1 <=> u kề v).
// Biên dịch: g++ -O2 -o quay_lui quay_lui.cpp

#include <iostream>
using namespace std;

const int MAXN = 5005;      // n tối đa 5000 (giống demo)
int n;               // số đỉnh
bool a[MAXN][MAXN];  // ma trận kề: a[u][v] = 1 <=> u kề v
int bac[MAXN];       // số đỉnh kề của v (để sắp thuTu)
int thuTu[MAXN];     // thuTu[1..n]: đỉnh theo bậc giảm dần
int mau[MAXN];       // màu của v; -1 = chưa tô
int soMauMin;        // số màu của LG tốt nhất
int Smin[MAXN];      // LG tốt nhất (bản sao mau)

// có đỉnh kề v mang màu c?
bool trungMau(int v, int c) {
    for (int u = 0; u < n; u++)
        if (a[v][u] == 1 && mau[u] == c) return true;
    return false;
}

void quayLui(int i, int soMau) {  // bước i: màu S_i cho thuTu[i]
    int v = thuTu[i];
    for (int c = 0; c < n; c++) {   // tối đa n lựa chọn
        if (c > soMau) {             // vượt số màu: màu mới soMau đã thử rồi,
            // màu mới khác chỉ là đổi tên
            break;                   // → dừng (màu sau cũng vậy)
        }
        int soMauMoi = (c == soMau) ? soMau + 1 : soMau;  // c == soMau: mở màu mới
        if (soMauMoi >= soMauMin) {  // cắt tỉa (màu sau cũng vậy)
            break;
        }
        if (trungMau(v, c)) {        // trùng màu đỉnh kề → loại
            continue;
        }
        mau[v] = c;                  // ghi nhận S_i = c
        if (i == n) {                // đủ n đỉnh: LG hoàn chỉnh
            soMauMin = soMauMoi;
            for (int x = 0; x < n; x++) Smin[x] = mau[x];
        } else
            quayLui(i + 1, soMauMoi);
        mau[v] = -1;                 // trả lại trạng thái cũ
    }
}                                    // hết màu để thử → về bước trước

int main() {
    ios::sync_with_stdio(false);     // đọc nhanh: n = 5000 là 25 triệu số
    cin >> n;                        // đọc G: n, ma trận kề a
    char x;                          // mỗi phần tử là 1 ký tự 0/1
    for (int u = 0; u < n; u++)      // n hàng, mỗi hàng n số
        for (int v = 0; v < n; v++) { cin >> x; a[u][v] = (x == '1'); }
    for (int v = 0; v < n; v++) {    // bac[v] = số đỉnh kề của v
        bac[v] = 0;
        for (int u = 0; u < n; u++) bac[v] += a[v][u];
    }
    int k = 0;                       // thuTu: bậc giảm dần,
    for (int d = n - 1; d >= 0; d--) // cùng bậc: chỉ số nhỏ trước
        for (int v = 0; v < n; v++)
            if (bac[v] == d) thuTu[++k] = v;
    for (int v = 0; v < n; v++) mau[v] = -1;
    soMauMin = n + 1;
    quayLui(1, 0);
    cout << "So mau: " << soMauMin << "\n";
    for (int v = 0; v < n; v++)
        cout << "Dinh " << v << ": mau " << Smin[v] << "\n";
    return 0;
}
