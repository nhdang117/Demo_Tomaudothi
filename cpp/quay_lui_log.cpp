// Quay lui: tìm số màu ít nhất χ(G) (mô hình try(i), giữ lời giải tốt nhất)
// Bản IN LOG: giống hệt code trên panel của demo, in từng bước (cout) như khung "Output C++".
// Sinh tự động từ solver.js bởi cpp/export_cpp.js — đừng sửa tay.
// Input (stdin): dòng đầu n (1 ≤ n ≤ 5000), mỗi dòng sau "u v" là một cạnh, đỉnh 0..n−1.
// Biên dịch: g++ -O2 -o quay_lui_log quay_lui_log.cpp

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

// lùi đầu dòng log theo độ sâu đệ quy
void thutLe(int i) {
    for (int t = 1; t < i; t++) cout << "  ";
}

void quayLui(int i, int soMau) {  // bước i: màu S_i cho thuTu[i]
    int v = thuTu[i];
    thutLe(i); cout << "B" << i << ": v=" << v << " soMau=" << soMau << "\n";
    for (int c = 0; c < n; c++) {   // tối đa n lựa chọn
        if (c > soMau) {             // vượt số màu: màu mới soMau đã thử rồi,
            thutLe(i); cout << "  c=" << c << " vuot soMau\n";  // màu mới khác chỉ là đổi tên
            break;                   // → dừng (màu sau cũng vậy)
        }
        int soMauMoi = (c == soMau) ? soMau + 1 : soMau;  // c == soMau: mở màu mới
        if (soMauMoi >= soMauMin) {  // cắt tỉa (màu sau cũng vậy)
            thutLe(i); cout << "  c=" << c << " cat tia\n";
            break;
        }
        if (trungMau(v, c)) {        // trùng màu đỉnh kề → loại
            thutLe(i); cout << "  c=" << c << " trung\n";
            continue;
        }
        mau[v] = c;                  // ghi nhận S_i = c
        thutLe(i); cout << "  mau[" << v << "]=" << c << "\n";
        if (i == n) {                // đủ n đỉnh: LG hoàn chỉnh
            soMauMin = soMauMoi;
            for (int x = 0; x < n; x++) Smin[x] = mau[x];
            thutLe(i); cout << "  LG moi: soMauMin=" << soMauMin << "\n";
        } else
            quayLui(i + 1, soMauMoi);
        mau[v] = -1;                 // trả lại trạng thái cũ
        thutLe(i); cout << "  go mau[" << v << "]\n";
    }
}                                    // hết màu để thử → về bước trước

int main() {
    cin >> n;                        // đọc G: n, ma trận kề a
    int x, y;
    while (cin >> x >> y) a[x][y] = a[y][x] = 1;
    for (int v = 0; v < n; v++) {    // bac[v] = số đỉnh kề của v
        bac[v] = 0;
        for (int u = 0; u < n; u++) bac[v] += a[v][u];
    }
    int k = 0;                       // thuTu: bậc giảm dần,
    for (int d = n - 1; d >= 0; d--) // cùng bậc: chỉ số nhỏ trước
        for (int v = 0; v < n; v++)
            if (bac[v] == d) thuTu[++k] = v;
    cout << "thuTu:";
    for (int i = 1; i <= n; i++) cout << " " << thuTu[i];
    cout << "\n";
    for (int v = 0; v < n; v++) mau[v] = -1;
    soMauMin = n + 1;
    quayLui(1, 0);
    cout << "So mau: " << soMauMin << "\n";
    for (int v = 0; v < n; v++)
        cout << "Dinh " << v << ": mau " << Smin[v] << "\n";
    return 0;
}
