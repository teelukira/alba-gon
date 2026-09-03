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

# 1. 로그인
opener.open('http://www.younme24.com/member/login.asp', urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr'))

# 2. 바코드로 검색 (상온 엑셀에 있던 바코드: 8801043014830 농심 신라면사발 또는 8801123724680)
test_barcode = '8801043014830'
search_data = {
    'order_date': '20260905',
    'order_dev': 'j',
    'order_type': '1',
    'search_dev': 'product_name',
    'search_word': '',
    'search_word2': test_barcode,
}

req = urllib.request.Request(
    'http://www.younme24.com/app1/product_list.asp',
    data=urllib.parse.urlencode(search_data).encode('euc-kr'),
    headers={'User-Agent': 'Mozilla/5.0'}
)

resp = opener.open(req)
html = resp.read().decode('euc-kr', errors='replace')

print('--- Search Result for Barcode:', test_barcode, '---')
# 테이블 결과 파싱
rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', html)
print(f'Total rows in table: {len(rows)}')
found = False
for r in rows:
    if test_barcode in r or '신라면' in r or '농심' in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        print('Found row:', clean)
        found = True

if not found:
    print('No direct row with test barcode, showing sample rows:')
    for r in rows[10:15]:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        if clean:
            print('Row:', clean[:100])

