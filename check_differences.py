import json, math

with open(r'C:\Users\teelu\orca\projects\alba-gon\client\src\data\seedProducts.json', 'r', encoding='utf-8') as f:
    products = {p['barcode']: p for p in json.load(f)}

with open(r'C:\Users\teelu\orca\projects\alba-gon\client\src\data\seedAudits.json', 'r', encoding='utf-8') as f:
    audits = json.load(f)

print(f"Total audits: {len(audits)}")
diff_count = 0
for a in audits:
    bc = a['barcode']
    p = products.get(bc)
    
    targetStock = a.get('targetStock', p.get('targetStock', 10) if p else 10)
    # product가 있으면 product.minOrderQty를 쓰는지
    p_min = p.get('minOrderQty', 1) if p else 1
    stockCount = a.get('stockCount', 0)
    
    shortage = max(0, targetStock - stockCount)
    rec_with_p_min = math.ceil(shortage / p_min) * p_min if shortage > 0 else 0
    rec_with_1 = shortage
    
    expected = a['targetStock'] # 우리가 넣으려 했던 수량
    
    if rec_with_p_min != expected:
        diff_count += 1
        print(f"DIFFERENCE: {a['productName']} | Expected: {expected} | But Got: {rec_with_p_min} (p_min={p_min}, target={targetStock}, stock={stockCount})")

print(f"Total differences: {diff_count} / {len(audits)}")