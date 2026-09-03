with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\product_list_dump.html', 'r', encoding='utf-8') as f:
    html = f.read()

idx = html.find('function cart_add(')
if idx != -1:
    print(html[idx:idx+2500])

