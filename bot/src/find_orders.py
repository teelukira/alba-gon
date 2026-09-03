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

main_html = opener.open('http://www.younme24.com/main.asp').read().decode('euc-kr', errors='replace')
for m in re.finditer(r'<a[^>]*href=["\']?([^"\'>\s]+)[^>]*>(.*?)</a>', main_html, re.DOTALL):
    href = m.group(1)
    text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if any(k in href for k in ['order', 'history', 'app', 'mypage', 'cart']):
        print(f'{text} --> {href}')

# 상단 메뉴
app1_html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')
for m in re.finditer(r'<a[^>]*href=["\']?([^"\'>\s]+)[^>]*>(.*?)</a>', app1_html, re.DOTALL):
    href = m.group(1)
    text = re.sub(r'<[^>]+>', '', m.group(2)).strip()
    if 'topMen' in m.group(0) or any(k in href for k in ['order', 'list', 'history']):
        print(f'TopMen: {text} --> {href}')

