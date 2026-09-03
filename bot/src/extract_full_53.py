import sys
sys.stdout.reconfigure(encoding='utf-8')
import re, json

with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\saved_cart_20260902.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 행별 파싱
rows = [r for r in re.findall(r'<tr[^>]*>[\s\S]*?</tr>', html) if 'cart_del' in r]
products = []

for r in rows:
    # barcode
    m_pcode = re.search(r'cart_del\(["\'](\d+)["\']', r)
    if not m_pcode:
        continue
    pcode = m_pcode.group(1)

    # name
    m_name = re.search(r'data_view\(["\']\d+["\']\)>([^<]+)</a>', r)
    pname = m_name.group(1).strip() if m_name else '알수없음'

    # quantity
    m_qty = re.search(r'name=["\']quantity["\'][^>]*value=["\'](\d+)["\']', r)
    if not m_qty:
        # try selected option
        m_qty = re.search(r'<option[^>]*value=["\'](\d+)["\'][^>]*selected', r)
    qty = m_qty.group(1) if m_qty else '1'

    # price
    m_price = re.search(r'(\d[\d,]+)원', r)
    price_str = m_price.group(1).replace(',', '') if m_price else '0'

    products.append({
        'pcode': pcode,
        'name': pname,
        'qty': qty,
        'price': price_str
    })

print(f'총 {len(products)}개 품목 추출 완료!')
with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\restored_products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False, indent=2)

for p in products[:10]:
    print(f"  {p['pcode']} | {p['name']} | {p['qty']}개 | {p['price']}원")

