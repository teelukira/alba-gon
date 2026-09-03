import sys
sys.stdout.reconfigure(encoding='utf-8')
import urllib.request, urllib.parse, http.cookiejar, re

env = {}
with open(r'C:\Users\teelu\orca\projects\alba-gon\.env', 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip()

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.open('http://www.younme24.com/member/login.asp', urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr'))

# 포카칩 4개 단가 2346원 (합계: 9,384원) 으로 업데이트
order_date = '20260905'
pcode = '8801117760205'
pname = '오리온]포카칩오리지날137g(3400)'
qty = '4'
price = '2346'

add_url = f'http://www.younme24.com/app1/orderAdd.asp?order_dev=j&dev=&order_type=1&pcode={pcode}&quantity={qty}&unit=EA&price={price}&order_date={order_date}&product_name={urllib.parse.quote(pname.encode("euc-kr"))}&valid=y'
opener.open(add_url)

cart_url = f'http://www.younme24.com/app1/orderView.asp?order_date={order_date}&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

print('================ [유앤미24 실제 장바구니 포카칩 4개 금액 확인] ================')
rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', cart_html)
for r in rows:
    if '포카칩' in r or pcode in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        clean = re.sub(r'\s+', ' ', clean)
        print('  ▶ 최종 장바구니 상태:', clean)

