"""Ghép solver.js + testcases (suite.js, results.json) + main.js + frost.css + lumen.css vào page.html.

Tạo index.html — bản Lumen (nền trắng gradient, cải biên từ Frost): thêm frost.css + lumen.css
và cờ window.LOOK = 'lumen'. Kết quả bộ testcase lấy từ testcases/results.json
(chạy `node testcases/run_tests.js` trước nếu vừa sửa bộ giải hoặc testcase).
"""
import json
import os

page = open('page.html', encoding='utf-8').read()
solver = open('solver.js', encoding='utf-8').read()
main = open('main.js', encoding='utf-8').read()
suite = open('testcases/suite.js', encoding='utf-8').read()
frost_css = open('frost.css', encoding='utf-8').read()
lumen_css = open('lumen.css', encoding='utf-8').read()
assert '</script' not in solver.lower() and '</script' not in main.lower() and '</script' not in suite.lower()

if os.path.exists('testcases/results.json'):
    data = json.load(open('testcases/results.json', encoding='utf-8'))
    tests = 'window.TESTSUITE_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';\n' + suite
else:
    print('(chưa có testcases/results.json — phần Kiểm thử sẽ trống)')
    tests = suite

base = page.replace('/*__SOLVER__*/', solver).replace('/*__TESTS__*/', tests).replace('/*__MAIN__*/', main)

FONT_DARK = 'family=Be+Vietnam+Pro:wght@300;400;500;600&family=Chakra+Petch:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700'
FONT_FROST = 'family=Be+Vietnam+Pro:wght@300;400;500;600;700&family=Unbounded:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600;700'
LENIS = '<script src="https://cdn.jsdelivr.net/npm/lenis'
assert FONT_DARK in base and LENIS in base and base.count('</style>') == 1
lumen = (base.replace('<title>Chromatic Cargo</title>', '<title>Chromatic Cargo Lumen</title>', 1)
             .replace(FONT_DARK, FONT_FROST, 1)
             .replace('</style>', frost_css + lumen_css + '</style>', 1)
             .replace(LENIS, '<script>window.LOOK = "lumen";</script>\n' + LENIS, 1))
open('index.html', 'w', encoding='utf-8').write(lumen)
print('index.html', len(lumen), 'bytes')
