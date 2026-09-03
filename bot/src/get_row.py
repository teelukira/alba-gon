import urllib.request, urllib.parse, http.cookiejar, re

env_path = r'C:\Users\teelu\orca\projects\alba-gon\.env'
env = {}
with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k.strip()] = v.strip()

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.open('http://www.younme24.com/member/login.asp', urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr'))

search_data = {'order_date': '20260905', 'order_dev': 'j', 'order_type': '1', 'search_dev': 'product_name', 'search_word': '신라면', 'search_word2': ''}
resp = opener.open(urllib.request.Request('http://www.younme24.com/app1/product_list.asp', data=urllib.parse.urlencode(search_data, encoding='euc-kr').encode('euc-kr')))
html = resp.read().decode('euc-kr', errors='replace')

for line in html.split('\n'):
    if '신라면' in line or 'div_quantity' in line or 'set_quantity' in line:
        print(line.strip())

