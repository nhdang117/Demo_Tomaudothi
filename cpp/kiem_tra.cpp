// Kiểm tra input ma trận kề — cùng luật, cùng thông báo lỗi với ô nhập trên web (parseInput trong solver.js).
// Viết tay (không sinh từ solver.js). Bộ testcase (testcases/run_tests.js) dùng chương trình này để chấm
// nhóm 06_khong_hop_le; test.js so từng thông báo lỗi với web.
// Input (stdin): dòng đầu n (1 ≤ n ≤ 5000), sau đó ma trận kề n hàng × n số 0/1, đối xứng, đường chéo 0.
// Output: hợp lệ     → "Hop le: n = <n>, m = <số cạnh>", mã thoát 0
//         không hợp lệ → mỗi lỗi một dòng (UTF-8), tối đa 50 lỗi, mã thoát 1
// Biên dịch: g++ -O2 -o kiem_tra kiem_tra.cpp

#include <iostream>
#include <string>
#include <vector>
using namespace std;

const int MAXN = 5005;
const int MAX_N = 5000;      // n tối đa (giống demo và tham_lam.cpp, quay_lui.cpp)
const int MAX_ERR = 50;      // quá số lỗi này thì dừng kiểm tra
bool a[MAXN][MAXN];          // ma trận kề đọc được
int dongCuaHang[MAXN];       // hàng u nằm ở dòng nào của file
vector<string> loi;

bool laKhoangTrang(char c) {
    return c == ' ' || c == '\t' || c == '\r' || c == '\v' || c == '\f';
}

string catKhoangTrang(const string& s) {          // bỏ khoảng trắng 2 đầu dòng
    size_t i = 0, j = s.size();
    while (i < j && laKhoangTrang(s[i])) i++;
    while (j > i && laKhoangTrang(s[j - 1])) j--;
    return s.substr(i, j - i);
}

vector<string> tachSo(const string& s) {          // tách theo khoảng trắng
    vector<string> t;
    size_t i = 0;
    while (i < s.size()) {
        while (i < s.size() && laKhoangTrang(s[i])) i++;
        size_t j = i;
        while (j < s.size() && !laKhoangTrang(s[j])) j++;
        if (j > i) t.push_back(s.substr(i, j - i));
        i = j;
    }
    return t;
}

bool laSoTuNhien(const string& s) {
    if (s.empty()) return false;
    for (char c : s)
        if (c < '0' || c > '9') return false;
    return true;
}

// Đọc hàng u vào a; trả về "" nếu đúng, ngược lại là nội dung lỗi.
string docHang(const string& line, int n, int u) {
    if ((int)line.size() == 2 * n - 1) {         // hàng viết chuẩn "0 1 0 …": đọc thẳng, khỏi tách chuỗi
        bool ok = true;
        for (int v = 0; v < n && ok; v++) {
            char c = line[2 * v];
            if ((c != '0' && c != '1') || (v + 1 < n && line[2 * v + 1] != ' ')) ok = false;
            else a[u][v] = (c == '1');
        }
        if (ok) return "";
    }
    vector<string> t = tachSo(line);
    if ((int)t.size() != n) {
        string e = "có " + to_string(t.size()) + " số, cần đúng " + to_string(n) + " số";
        if ((int)t.size() < n)
            e += " (mỗi hàng của ma trận kề có đủ n số 0/1, không nhập danh sách cạnh \"u v\" hay danh sách kề)";
        return e;
    }
    for (int v = 0; v < n; v++) {
        if (t[v] != "0" && t[v] != "1")
            return "cột " + to_string(v) + " là \"" + t[v] + "\" — ma trận kề chỉ gồm 0 và 1";
        a[u][v] = (t[v] == "1");
    }
    return "";
}

int main() {
    ios::sync_with_stdio(false);
    string line;
    int n = -1;                  // -1: chưa đọc dòng n
    int r = 0;                   // số hàng ma trận đã đọc
    int dong = 0;                // số thứ tự dòng trong file
    bool coMaTran = false;       // n hợp lệ → bắt đầu đọc ma trận
    while ((int)loi.size() < MAX_ERR && getline(cin, line)) {
        dong++;
        line = catKhoangTrang(line);
        if (line.empty()) continue;
        string D = "Dòng " + to_string(dong);
        if (n >= 0 && r >= n) {
            loi.push_back(D + ": thừa hàng — ma trận kề " + to_string(n) + "×" + to_string(n) + " chỉ có " + to_string(n) + " hàng.");
            break;
        }
        if (line.find('#') != string::npos) {
            loi.push_back(D + ": không dùng chú thích \"#\", mỗi dòng chỉ gồm các số.");
            if (n < 0) break;
            dongCuaHang[r++] = dong;
            continue;
        }
        if (n < 0) {                             // dòng đầu: n
            if (!laSoTuNhien(line)) {
                loi.push_back(D + ": dòng đầu phải là số mẫu \"n\" (đúng một số nguyên).");
                break;
            }
            size_t k = line.find_first_not_of('0');
            string so = (k == string::npos) ? "0" : line.substr(k);   // bỏ số 0 ở đầu
            n = (so.size() > 9) ? MAX_N + 1 : stoi(so);
            if (n < 1) { loi.push_back("Số đỉnh n phải ≥ 1."); break; }
            if (n > MAX_N) {
                loi.push_back("n = " + so + " quá lớn (tối đa " + to_string(MAX_N) + ", giới hạn mảng MAXN của code C++).");
                break;
            }
            coMaTran = true;
            continue;
        }
        string e = docHang(line, n, r);
        if (e != "") loi.push_back(D + " (hàng " + to_string(r) + "): " + e + ".");
        dongCuaHang[r++] = dong;
    }
    if (n < 0 && loi.empty()) loi.push_back("Chưa có dữ liệu: dòng đầu là số đỉnh n.");
    if (coMaTran && r < n && (int)loi.size() < MAX_ERR)
        loi.push_back("Thiếu hàng: ma trận kề " + to_string(n) + "×" + to_string(n) + " cần " + to_string(n) +
                      " hàng, mới có " + to_string(r) + " hàng.");
    long long m = 0;             // số cạnh
    if (loi.empty()) {           // đủ n hàng đúng dạng → kiểm tra đường chéo và đối xứng
        for (int u = 0; u < n && (int)loi.size() < MAX_ERR; u++) {
            string D = "Dòng " + to_string(dongCuaHang[u]);
            string au = "a[" + to_string(u) + "]";
            if (a[u][u])
                loi.push_back(D + ": " + au + "[" + to_string(u) + "] = 1 là khuyên — một mẫu không thể phản ứng với chính nó (đường chéo phải toàn 0).");
            for (int v = u + 1; v < n && (int)loi.size() < MAX_ERR; v++) {
                if (a[u][v] != a[v][u])
                    loi.push_back(D + ": " + au + "[" + to_string(v) + "] = " + to_string(a[u][v]) + " nhưng a[" + to_string(v) +
                                  "][" + to_string(u) + "] = " + to_string(a[v][u]) + " (dòng " + to_string(dongCuaHang[v]) +
                                  ") — ma trận kề phải đối xứng.");
                else if (a[u][v]) m++;
            }
        }
    }
    if ((int)loi.size() >= MAX_ERR) loi.push_back("Quá " + to_string(MAX_ERR) + " lỗi, dừng kiểm tra.");
    if (!loi.empty()) {
        for (const string& s : loi) cout << s << "\n";
        return 1;
    }
    cout << "Hop le: n = " << n << ", m = " << m << "\n";
    return 0;
}
