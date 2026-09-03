import json, math

with open(r'C:\Users\teelu\orca\projects\alba-gon\client\src\data\seedProducts.json', 'r', encoding='utf-8') as f:
    products = {p['barcode']: p for p in json.load(f)}

with open(r'C:\Users\teelu\orca\projects\alba-gon\client\src\data\seedAudits.json', 'r', encoding='utf-8') as f:
    audits = json.load(f)

print(f"Total audits: {len(audits)}")
mismatch = 0
for a in audits:
    bc = a['barcode']
    p = products.get(bc)
    
    targetStock = a['targetStock'] if 'targetStock' in a else (p['targetStock'] if p else 10)
    minOrderQty = max(1, a['minOrderQty']) if 'minOrderQty' in a else (max(1, p['minOrderQty']) if p else 1)
    
    shortage = max(0, targetStock - a.get('stockCount', 0))
    rec = shortage if (shortage % minOrderQty == 0) else math.ceil(shortage / minOrderQty) * minOrderQty
    
    expected = a['targetStock']
    if rec != expected:
        mismatch += 1
        print(f"MISMATCH: {a['productName']} | Expected {expected} != Got {rec}")

print(f"Total Mismatches: {mismatch} / {len(audits)}")