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
opener.open('http://www.younme24.com/member/login.asp', urllib.parse.urlencode({'home': 'y', 'userid': env['YOUNME_USER_ID'], 'passwd': env['YOUNME_PASSWORD']}).encode('euc-kr'))

# 2. 발주일자 추출
app_html = opener.open('http://www.younme24.com/app1/app.asp').read().decode('euc-kr', errors='replace')
m_date = re.search(r'name=["\']order_date["\']\s+value=["\'](\d+)["\']', app_html)
order_date = m_date.group(1) if m_date else '20260905'

# 3. 기존 신라면 등 테스트 상품 전체 삭제
del_url = f'http://www.younme24.com/app1/orderAdd.asp?order_dev=j&order_date={order_date}&order_type=1&mode=d&mode2=all'
opener.open(del_url)
print('🧹 [1단계] 기존에 테스트로 들어갔던 신라면 등 장바구니를 깨끗이 비웠습니다!')

# 4. 사장님이 누르신 오리온]포카칩오리지날137g(3400) (8801117760205) 담기!
pcode = '8801117760205'
pname = '오리온]포카칩오리지날137g(3400)'
qty = '12' # 1박스 12개 단위
price = '2346'

add_url = f'http://www.younme24.com/app1/orderAdd.asp?order_dev=j&dev=&order_type=1&pcode={pcode}&quantity={qty}&unit=EA&price={price}&order_date={order_date}&product_name={urllib.parse.quote(pname.encode("euc-kr"))}&valid=y'
opener.open(add_url)
print('🛒 [2단계] 사장님이 누르신 [오리온]포카칩오리지날137g(3400) 12개를 실제 장바구니에 담았습니다!')

# 5. 장바구니 실시간 조회
cart_url = f'http://www.younme24.com/app1/orderView.asp?order_date={order_date}&order_dev=j&order_type=1'
cart_html = opener.open(cart_url).read().decode('euc-kr', errors='replace')

print('\n================ [현재 유앤미24 실제 장바구니 실시간 현황] ================')
rows = re.findall(r'<tr[^>]*>[\s\S]*?</tr>', cart_html)
found = False
for r in rows:
    if '포카칩' in r or pcode in r:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        clean = re.sub(r'\s+', ' ', clean)
        print('  ▶', clean)
        found = True

if not found:
    for r in rows[5:15]:
        clean = re.sub(r'<[^>]+>', ' ', r).strip()
        if clean:
            print('  ->', clean[:80])

