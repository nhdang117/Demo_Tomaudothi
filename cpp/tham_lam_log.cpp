// Tham lam: đỉnh bậc cao nhất tô trước (bài giảng Buổi 10)
// Bản IN LOG: giống hệt code trên panel của demo, in từng bước (cout) như khung "Output C++".
// Sinh tự động từ solver.js bởi cpp/export_cpp.js — đừng sửa tay.
// Input (stdin): dòng đầu n (1 ≤ n ≤ 5000), mỗi dòng sau "u v" là một cạnh, đỉnh 0..n−1.
// Biên dịch: g++ -O2 -o tham_lam_log tham_lam_log.cpp

#include <iostream>
using namespace std;

const int MAXN = 5005;      // n tối đa 5000 (giống demo)
int n;               // số đỉnh
bool a[MAXN][MAXN];  // ma trận kề: a[u][v] = 1 <=> u kề v
int bac[MAXN];       // số đỉnh kề chưa tô; -1 = đã tô
int mau[MAXN];       // màu của v; -1 = chưa tô
int soMau;           // số màu đã dùng (màu 0..soMau-1)

// có đỉnh kề v mang màu c?
bool trungMau(int v, int c) {
    for (int u = 0; u < n; u++)
        if (a[v][u] == 1 && mau[u] == c) return true;
    return false;
}

void thamLam() {
    for (int v = 0; v < n; v++) {    // bac[v] = số đỉnh kề của v
        bac[v] = 0;
        for (int u = 0; u < n; u++) bac[v] += a[v][u];
        mau[v] = -1;
    }
    soMau = 0;
    for (int i = 1; i <= n; i++) {   // mỗi vòng tô đúng 1 đỉnh
        int v = 0;                   // SELECT: bac lớn nhất,
        for (int x = 1; x < n; x++)  // hòa → chỉ số nhỏ nhất
            if (bac[x] > bac[v]) v = x;
        cout << "Lan " << i << ": v=" << v << " bac=" << bac[v] << "\n";
        int c;                       // thử lần lượt các màu đã dùng
        for (c = 0; c < soMau; c++) {
            if (!trungMau(v, c)) {
                cout << "  c=" << c << " khong trung\n";
                break;               // không trùng → dùng màu c
            }
            cout << "  c=" << c << " trung\n";
        }
        if (c == soMau) {            // for chạy hết → màu mới
            soMau++;
            cout << "  mau moi " << c << "\n";
        }
        mau[v] = c;                  // S_i = v, tô màu c
        cout << "  mau[" << v << "]=" << c << "\n";
        bac[v] = -1;                 // P = P - {v}
        cout << "  dinh " << v << " da to: bac=-1\n";
        for (int u = 0; u < n; u++)  // hạ bậc đỉnh kề chưa tô
            if (a[v][u] == 1 && bac[u] >= 0) {
                bac[u]--;
                cout << "  bac[" << u << "]: " << bac[u] + 1 << "->" << bac[u] << "\n";
            }
    }
}

int main() {
    cin >> n;                        // đọc G: n, ma trận kề a
    int x, y;
    while (cin >> x >> y) a[x][y] = a[y][x] = 1;
    thamLam();
    cout << "So mau: " << soMau << "\n";
    for (int v = 0; v < n; v++)
        cout << "Dinh " << v << ": mau " << mau[v] << "\n";
    return 0;
}
