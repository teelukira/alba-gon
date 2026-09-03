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

cart_url = 'http://www.younme24.com/app1/orderView.asp?order_date=20260905&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

for m in re.finditer(r'<a[^>]*href=["\']?([^"\'>\s]+)[^>]*>(.*?)</a>', cart_html, re.DOTALL):
    href = m.group(1)
    text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if 'del' in href.lower() or 'cancel' in href.lower() or '삭제' in text:
        print(f'Action: {text} --> {href}')

for line in cart_html.split('\n'):
    if 'function ' in line:
        print('JS function in cart:', line.strip())

