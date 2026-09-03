import re

with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\product_list_dump.html', 'r', encoding='utf-8') as f:
    html = f.read()

for m in re.finditer(r'<form name=["\']search["\'][\s\S]*?</form>', html):
    print(m.group(0))

print('--- checkSearch function snippet ---')
for s in re.finditer(r'function checkSearch[\s\S]*?\}', html):
    print(s.group(0))

for s in re.finditer(r'function set_quantity[\s\S]*?\}', html):
    print(s.group(0))

