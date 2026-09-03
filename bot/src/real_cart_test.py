import sys
sys.stdout.reconfigure(encoding='utf-8')
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
login_data = urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr')
opener.open('http://www.younme24.com/member/login.asp', login_data)

# 2. 발주일자 추출
app_html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')
m_date = re.search(r'name=["\']order_date["\']\s+value=["\'](\d+)["\']', app_html)
order_date = m_date.group(1) if m_date else '20260905'
print(f'현재 유앤미 적용 발주일자: {order_date}')

# 3. 신라면 큰사발(8801043017022, 16개 박스단위) 장바구니 담기(orderAdd.asp)
pcode = '8801043017022'
pname = '농]신라면큰사발113g'
qty = '16'
price = '1463'
add_url = f'http://www.younme24.com/app1/orderAdd.asp?order_dev=j&dev=&order_type=1&pcode={pcode}&quantity={qty}&unit=EA&price={price}&order_date={order_date}&product_name={urllib.parse.quote(pname.encode("euc-kr"))}&valid=y'

opener.open(add_url)

# 4. 장바구니 뷰(orderView.asp) 조회하여 진짜 담겼는지 확인
cart_url = f'http://www.younme24.com/app1/orderView.asp?order_date={order_date}&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', cart_html)
found = False
for r in rows:
    if '신라면' in r or pcode in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        clean = re.sub(r'\s+', ' ', clean)
        print('장바구니 담김 확인:', clean)
        found = True

if not found:
    print('장바구니 전체 행:')
    for r in rows:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        if clean and len(clean) > 3:
            print('  ->', clean[:100])

