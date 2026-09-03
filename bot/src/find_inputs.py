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

# 로그인
opener.open('http://www.younme24.com/member/login.asp', urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr'))

# app1/app.asp
html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')

with open(r'C:\Users\teelu\orca\projects\alba-gon\bot\src\app1_dump.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('app1_dump.html saved! Length:', len(html))

# find all inputs
for inp in re.findall(r'<input[^>]*>', html):
    if 'hidden' not in inp.lower():
        print('Visible input:', inp)

for btn in re.findall(r'<button[^>]*>[\s\S]*?</button>', html):
    print('Button:', btn)

for img in re.findall(r'<img[^>]*>', html):
    if any(k in img for k in ['search', '검색', 'order', '담기', '주문']):
        print('Action img:', img)

