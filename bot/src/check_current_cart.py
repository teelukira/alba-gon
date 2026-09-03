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

app_html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')
m_date = re.search(r'name=["\']order_date["\']\s+value=["\'](\d+)["\']', app_html)
cur_date = m_date.group(1) if m_date else 'unknown'
print(f'Current order_date in app.asp is: {cur_date}')

for d in ['20260902', '20260903', '20260904', '20260905']:
    url = f'http://www.younme24.com/app1/orderView.asp?order_date={d}&order_dev=j&order_type=1'
    try:
        h = opener.open(url).read().decode('euc-kr', errors='replace')
        rows = [r for r in re.findall(r'<tr[^>]*>[\s\S]*?</tr>', h) if 'cart_del' in r]
        print(f'Date {d}: {len(rows)} items')
    except Exception as e:
        print(f'Date {d} error: {e}')

