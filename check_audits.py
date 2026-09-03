import json
with open(r'C:\Users\teelu\orca\projects\alba-gon\client\src\data\seedAudits.json', 'r', encoding='utf-8') as f:
    audits = json.load(f)

for idx, a in enumerate(audits):
    print(f"{idx}: {a['productName']} | targetStock: {a['targetStock']} | minOrderQty: {a['minOrderQty']} | stockCount: {a['stockCount']}")