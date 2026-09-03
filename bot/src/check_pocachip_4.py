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

cart_url = 'http://www.younme24.com/app1/orderView.asp?order_date=20260905&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

print('================ [유앤미24 실제 장바구니 포카칩 4개 확인] ================')
rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', cart_html)
for r in rows:
    if '포카칩' in r or '8801117760205' in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        clean = re.sub(r'\s+', ' ', clean)
        print('  ▶ 실시간 확인 결과:', clean)

