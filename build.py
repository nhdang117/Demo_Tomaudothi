"""Ghép solver.js + main.js + frost.css + lumen.css vào page.html.

Tạo index.html — bản Lumen (nền trắng gradient, cải biên từ Frost): thêm frost.css + lumen.css
và cờ window.LOOK = 'lumen'.
"""
page = open('page.html', encoding='utf-8').read()
solver = open('solver.js', encoding='utf-8').read()
main = open('main.js', encoding='utf-8').read()
frost_css = open('frost.css', encoding='utf-8').read()
lumen_css = open('lumen.css', encoding='utf-8').read()
assert '</script' not in solver.lower() and '</script' not in main.lower()

base = page.replace('/*__SOLVER__*/', solver).replace('/*__MAIN__*/', main)

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
