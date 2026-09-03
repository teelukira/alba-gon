import sys
sys.stdout.reconfigure(encoding='utf-8')
import re

with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\saved_cart_20260902.html', 'r', encoding='utf-8') as f:
    html = f.read()

# cart_del 또는 cart_arrange 에서 파라미터 추출
# javascript:cart_del('8801043017022','1','123')
items = []
for m in re.finditer(r'javascript:cart_del\(["\']([^"\']+)["\'],["\']([^"\']+)["\'],["\']([^"\']+)["\']\)', html):
    pcode = m.group(1)
    ship_state = m.group(2)
    orderNum = m.group(3)
    items.append({'pcode': pcode, 'orderNum': orderNum})

print(f'Extracted {len(items)} items from saved_cart_20260902.html')

# 각 행에서 상품명과 수량도 매칭
rows = [r for r in re.findall(r'<tr[^>]*>[\s\S]*?</tr>', html) if 'cart_del' in r]
print(f'Total rows matched: {len(rows)}')
for idx, r in enumerate(rows[:5]):
    clean = re.sub(r'<[^>]+>', ' ', r).strip()
    clean = re.sub(r'\s+', ' ', clean)
    print(f'{idx+1}: {clean}')

